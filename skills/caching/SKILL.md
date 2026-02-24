---
name: caching
description: Caching implementation guide using @goji-system/cache-lib. Covers cache strategy selection, TTL configuration, invalidation patterns, and monitoring for production-ready caching.
---

# Caching Implementation Skill

**Version**: 2.0
**Last Updated**: 2025-10-31
**Skill Type**: Implementation Guide

## Description

This skill guides developers through implementing production-ready caching functionality using `@goji-system/cache-lib`. It covers cache strategy selection, TTL configuration, cache key naming conventions, invalidation patterns, cache warming, and monitoring.

## When to Use This Skill

Activate this skill when you need to:

- ✅ Add caching to new or existing API endpoints
- ✅ Implement offline-first functionality in React Native
- ✅ Optimize data access patterns and reduce database load
- ✅ Pre-warm critical data for better performance
- ✅ Set up cache monitoring and health checks
- ✅ Implement cache invalidation strategies
- ✅ Choose appropriate cache strategies for different data types

**Keywords**: `cache`, `caching`, `redis`, `watermelondb`, `cache strategy`, `ttl`, `cache invalidation`

---

## Cache-Database Architecture

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     REQUEST FLOW                             │
└─────────────────────────────────────────────────────────────┘

  API Request / UI Action
          │
          ▼
  ┌───────────────┐
  │ CacheManager  │ ← Strategy: CACHE_FIRST, NETWORK_FIRST, etc.
  └───────┬───────┘
          │
          ▼
  ┌─────────────────────────────────────────────────────┐
  │         CACHE LAYERS (Check in Order)               │
  ├─────────────────────────────────────────────────────┤
  │  CLIENT (React Native):                             │
  │    L1: Memory Cache (Map)         ← Fastest         │
  │        └─ Hit? Return immediately                   │
  │    L2: WatermelonDB               ← SQLite persist  │
  │        └─ Hit? Promote to L1, return                │
  │                                                      │
  │  SERVER (NestJS):                                   │
  │    L1: Memory Cache (Map)         ← Fastest         │
  │        └─ Hit? Return immediately                   │
  │    L2: Redis                      ← Distributed     │
  │        └─ Hit? Promote to L1, return                │
  └──────────────────┬──────────────────────────────────┘
                     │
                 Cache Miss?
                     │
                     ▼
          ┌──────────────────┐
          │  fetchFn Called  │ ← Developer-provided function
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │   PostgreSQL     │ ← Source of truth (via Prisma)
          │   (via Prisma)   │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  Populate Cache  │ ← Store in L1, L2
          └────────┬─────────┘
                   │
                   ▼
              Return Data


┌─────────────────────────────────────────────────────────────┐
│                  WRITE/UPDATE FLOW                           │
└─────────────────────────────────────────────────────────────┘

  Create/Update/Delete Request
          │
          ▼
  ┌──────────────────┐
  │   PostgreSQL     │ ← Write to source of truth
  │   (via Prisma)   │
  └────────┬─────────┘
          │
          ▼
  ┌──────────────────┐
  │ Cache Invalidate │ ← Invalidate affected keys/patterns
  └──────────────────┘
```

### Key Principles

1. **PostgreSQL = Source of Truth**: All writes go to PostgreSQL (via Prisma ORM)
2. **Cache = Fast Layer**: Cache sits in front of PostgreSQL to reduce database load
3. **Cache Miss → Database Query**: The `fetchFn` queries PostgreSQL when cache misses
4. **Write → Invalidate**: After database writes, invalidate related cache entries

### Architecture Simplification

**What Changed**: The cache architecture has been simplified to eliminate redundant storage.

**Previous Architecture** (Deprecated):
- Client: L1 (Memory) → L3 (WatermelonDB) → L2 (AsyncStorage) [3 tiers, redundant]
- All cache writes went to 3 tiers simultaneously

**Current Architecture** (Simplified):
- Client: L1 (Memory) → L2 (WatermelonDB) [2 tiers, clean]
- Server: L1 (Memory) → L2 (Redis) [2 tiers, clean]

**What Was Removed**:
- ❌ AsyncStorage as L2 tier in cache-lib (redundant with WatermelonDB)
- ❌ Confusing L2/L3 numbering

**What Stays**:
- ✅ WatermelonDB for client persistence (renumbered L3 → L2)
- ✅ Redis for server distributed caching (stays L2)
- ✅ Memory cache as L1 on both platforms (unchanged)

**Important Note**: AsyncStorage is still used in the React Native app for **user preferences and settings** (theme, language, onboarding state), but it's **outside cache-lib** and serves a different purpose.

**Benefits**:
1. **Simpler Code**: Fewer tiers to manage, clearer mental model
2. **Faster Writes**: No redundant writes to AsyncStorage tier
3. **Better Performance**: Eliminated unnecessary tier checks
4. **Clearer Architecture**: L1 (fast) → L2 (persistent) → Database (source of truth)
5. **Separation of Concerns**: Cache-lib for API data, AsyncStorage for app settings

---

## Cache Strategy Decision Tree

### Strategy Selection Guide

```
┌─────────────────────────────────────────────────────────────┐
│ What type of data are you caching?                          │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┬─────────────────┐
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
   LIVE DATA        FREQUENT DATA    INTERMITTENT DATA   STATIC DATA
 (Chat, Notifs)   (Balance, Recent)  (Contacts, Txns)  (Profile, Config)
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
 NETWORK_FIRST   STALE_WHILE_REVALIDATE  CACHE_FIRST    CACHE_FIRST
 TTL: 30-60s        TTL: 60-300s      TTL: 900-1800s   TTL: 3600-86400s
 Refresh: 30s       Refresh: 30-60s    Refresh: 300s    Refresh: 1800s


┌─────────────────────────────────────────────────────────────┐
│ Special Cases                                                │
└─────────────────────────────────────────────────────────────┘

  Offline Only?  →  CACHE_ONLY  (return cached data only)
  Never Cache?   →  NETWORK_ONLY (always fetch from network)
```

### Strategy Descriptions

| Strategy | When to Use | Behavior |
|----------|-------------|----------|
| **CACHE_FIRST** | Static/intermittent data (profiles, contacts) | Return cached if available, fetch on miss |
| **NETWORK_FIRST** | Real-time data (chat messages, notifications) | Try network first, fall back to cache |
| **STALE_WHILE_REVALIDATE** | Frequent data (wallet balances) | Return stale cache immediately, refresh in background |
| **CACHE_ONLY** | Offline-only access | Only return cached data, never fetch |
| **NETWORK_ONLY** | Never cache (admin operations) | Always fetch from network, skip cache |

### DataPriority Enum

```typescript
enum DataPriority {
  LIVE = 'live',              // Real-time: chat, notifications, live feeds
  FREQUENT = 'frequent',       // Frequently changing: balances, recent transactions
  INTERMITTENT = 'intermittent', // Occasionally changing: contacts, transaction history
  STATIC = 'static'           // Rarely changing: user profile, system config
}
```

---

## Implementation Templates

### Client-Side (React Native)

**Import Pattern**:
```typescript
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/client';
```

#### Pattern 1: CACHE_FIRST for Static Data

**Use Case**: User profiles, settings, configuration data

```typescript
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/client';

// User profile (changes infrequently)
export async function getCachedUserProfile(userId: string) {
  return await CacheManager.get({
    key: `user:${userId}:profile`,
    strategy: CacheStrategy.CACHE_FIRST,
    priority: DataPriority.STATIC,
    ttl: 3600000, // 1 hour
    refreshInterval: 1800000, // 30 minutes background refresh
    fetchFn: async () => {
      const response = await fetch(`${API_URL}/users/${userId}/profile`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return await response.json();
    },
    onError: (error) => {
      console.error('Profile cache error:', error);
      // Fallback to network fetch
    }
  });
}
```

#### Pattern 2: STALE_WHILE_REVALIDATE for Frequent Data

**Use Case**: Wallet balances, recent transactions, activity feeds

```typescript
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/client';

// Wallet balance (changes frequently)
export async function getCachedWalletBalance(walletId: string) {
  return await CacheManager.get({
    key: `wallet:${walletId}:balance`,
    strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
    priority: DataPriority.FREQUENT,
    ttl: 60000, // 1 minute
    refreshInterval: 30000, // 30 seconds
    fetchFn: async () => {
      const response = await fetch(`${API_URL}/wallets/${walletId}/balance`);
      if (!response.ok) throw new Error('Failed to fetch balance');
      return await response.json();
    }
  });
}
```

#### Pattern 3: NETWORK_FIRST for Real-Time Data

**Use Case**: Chat messages, notifications, live updates

```typescript
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/client';

// Chat messages (real-time)
export async function getCachedChatMessages(chatId: string, limit: number = 100) {
  return await CacheManager.get({
    key: `chat:${chatId}:messages:recent:${limit}:0`,
    strategy: CacheStrategy.NETWORK_FIRST,
    priority: DataPriority.LIVE,
    ttl: 60000, // 1 minute
    refreshInterval: 30000, // 30 seconds
    fetchFn: async () => {
      const response = await fetch(`${API_URL}/chats/${chatId}/messages?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json();
    }
  });
}
```

#### Pattern 4: CACHE_ONLY for Offline Access

**Use Case**: Offline mode, cached transaction history, downloaded data

```typescript
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/client';

// Offline transaction history
export async function getOfflineTransactions(userId: string) {
  return await CacheManager.get({
    key: `user:${userId}:transactions:cached`,
    strategy: CacheStrategy.CACHE_ONLY,
    priority: DataPriority.INTERMITTENT,
    fetchFn: async () => {
      // This will never be called with CACHE_ONLY
      return [];
    }
  });
}
```

#### Pattern 5: Simplified Cache Lookup (Cache-Only)

**Use Case**: Quick cache-only checks without strategy configuration

```typescript
import { CacheManager } from '@goji-system/cache-lib/client';

// Simple cache-only lookup
const cachedData = await CacheManager.get<MyType>('simple:key');
if (cachedData) {
  // Use cached data
}
```

#### Pattern 6: Cache Pre-warming

**Use Case**: Pre-populate cache with data to avoid initial fetch

```typescript
import { CacheManager } from '@goji-system/cache-lib/client';

// Pre-warm user profile on login
export async function prewarmUserData(userId: string, userData: any) {
  await CacheManager.prewarm(`user:${userId}:profile`, userData, 3600000); // 1 hour
  await CacheManager.prewarm(`user:${userId}:settings`, userData.settings, 3600000);
}
```

---

### Server-Side (NestJS)

**Import Pattern**:
```typescript
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/server';
```

#### Pattern 1: CACHE_FIRST with Prisma Query

**Use Case**: Contact lists, transaction history, static reference data

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/server';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async getContactList(userId: string) {
    return await CacheManager.get({
      key: `user:${userId}:contacts`,
      strategy: CacheStrategy.CACHE_FIRST,
      priority: DataPriority.INTERMITTENT,
      ttl: 900000, // 15 minutes
      refreshInterval: 300000, // 5 minutes
      fetchFn: async () => {
        // Cache miss → Query PostgreSQL via Prisma
        return await this.prisma.contact.findMany({
          where: { userId },
          include: {
            contactUser: {
              select: { id: true, handle: true, firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    });
  }
}
```

#### Pattern 2: STALE_WHILE_REVALIDATE with Database Query

**Use Case**: Recent transactions, wallet balances

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManager, CacheStrategy, DataPriority } from '@goji-system/cache-lib/server';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentTransactions(userId: string, limit: number = 50) {
    return await CacheManager.get({
      key: `user:${userId}:transactions:recent:${limit}`,
      strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      priority: DataPriority.FREQUENT,
      ttl: 300000, // 5 minutes
      refreshInterval: 60000, // 1 minute background refresh
      fetchFn: async () => {
        return await this.prisma.transaction.findMany({
          where: { userId },
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { wallet: true }
        });
      }
    });
  }
}
```

#### Pattern 3: ApiCachingService for Multi-Level Caching

**Use Case**: High-traffic endpoints, CDN-cacheable data

```typescript
import { Injectable } from '@nestjs/common';
import { ApiCachingService } from '../common/services/api-caching.service';

@Injectable()
export class ProductService {
  constructor(private readonly caching: ApiCachingService) {}

  async getProductDetails(productId: string) {
    const cacheKey = `product:${productId}`;

    // Try cache first (Memory → Redis → CDN)
    const cached = await this.caching.get(cacheKey);
    if (cached) return cached;

    // Cache miss → Query database
    const product = await this.fetchProductFromDatabase(productId);

    // Store in cache with compression and encryption
    await this.caching.set(cacheKey, product, {
      ttl: 86400, // 24 hours
      level: 'REDIS',
      compression: true,
      encryption: false // Product data is not sensitive
    });

    return product;
  }
}
```

#### Pattern 4: Cache Invalidation After Database Writes

**Use Case**: After create/update/delete operations

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManager } from '@goji-system/cache-lib/server';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async updateUserProfile(userId: string, updates: any) {
    // 1. Update database (source of truth)
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updates
    });

    // 2. Invalidate related caches
    await CacheManager.invalidate([
      `user:${userId}:profile`,
      `user:${userId}:settings`
    ]);

    // 3. Optionally pre-warm with new data
    await CacheManager.prewarm(`user:${userId}:profile`, updatedUser, 3600000);

    return updatedUser;
  }

  async deleteUser(userId: string) {
    // 1. Delete from database
    await this.prisma.user.delete({ where: { id: userId } });

    // 2. Invalidate all user-related caches using RegExp
    await CacheManager.invalidate(new RegExp(`^user:${userId}:`));
  }
}
```

---

## Cache Key Naming Conventions

### Standard Format

```
{entity}:{id}:{type}:{sub-type}:{parameters}
```

### Examples by Entity

#### User Keys
```typescript
`user:${userId}:profile`                     // User profile data
`user:${userId}:wallets`                     // User's wallets list
`user:${userId}:transactions`                // User's transactions
`user:${userId}:transactions:recent:50`      // Recent 50 transactions
`user:${userId}:contacts`                    // User's contact list
`user:${userId}:conversations:active`        // Active conversations
`user:${userId}:settings`                    // User preferences
```

#### Chat Keys
```typescript
`chat:${chatId}:messages:recent:${limit}:${offset}`  // Paginated messages
`chat:${chatId}:messages:all`                        // All messages
`chat:${chatId}:message:${messageId}`                // Single message
`chat:${chatId}:queue`                               // Message queue
`chat:${chatId}:search:${query}:${limit}`            // Search results
```

#### Wallet Keys
```typescript
`wallet:${walletId}:balance`                 // Wallet balance
`wallet:${walletId}:transactions`            // Wallet transactions
`wallet:${walletId}:transactions:pending`    // Pending transactions
```

#### Product Keys (Shopping)
```typescript
`product:${productId}`                       // Product details
`product:${productId}:pricing`               // Pricing information
`product:${productId}:inventory`             // Inventory status
`products:category:${categoryId}`            // Products by category
`products:popular:${limit}`                  // Popular products
```

#### Guest Mode Keys
```typescript
`contacts:guest`                             // Guest mode contacts
`wallets:guest`                              // Guest mode wallets
`transactions:guest`                         // Guest mode transactions
```

### Naming Rules

1. ✅ **Use colons (`:`)** as separators
2. ✅ **Start with entity type** (user, chat, wallet, product)
3. ✅ **Include entity ID** (userId, chatId, walletId)
4. ✅ **Add type/sub-type** (profile, messages, balance)
5. ✅ **Include parameters** for pagination (limit, offset)
6. ✅ **Use descriptive names** (recent, pending, active, popular)
7. ❌ **Avoid special characters** except colons and hyphens
8. ❌ **Don't use spaces** in keys

---

## TTL Configuration Guide

### TTL Recommendations by DataPriority

| Priority | TTL Range | Refresh Interval | Use Cases | Examples |
|----------|-----------|------------------|-----------|----------|
| **LIVE** | 30-60s | 30s | Real-time data | Chat messages, notifications, live feeds |
| **FREQUENT** | 60-300s | 30-60s | Frequently changing | Wallet balances, recent transactions, activity |
| **INTERMITTENT** | 900-1800s | 300s | Occasionally changing | Contact lists, transaction history |
| **STATIC** | 3600-86400s | 1800s | Rarely changing | User profiles, system config, settings |

### TTL Examples by Feature

```typescript
// Chat Messages (LIVE)
{
  strategy: CacheStrategy.NETWORK_FIRST,
  priority: DataPriority.LIVE,
  ttl: 60000,        // 1 minute
  refreshInterval: 30000  // 30 seconds
}

// Wallet Balance (FREQUENT)
{
  strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
  priority: DataPriority.FREQUENT,
  ttl: 300000,       // 5 minutes
  refreshInterval: 60000  // 1 minute
}

// Contact List (INTERMITTENT)
{
  strategy: CacheStrategy.CACHE_FIRST,
  priority: DataPriority.INTERMITTENT,
  ttl: 900000,       // 15 minutes
  refreshInterval: 300000  // 5 minutes
}

// User Profile (STATIC)
{
  strategy: CacheStrategy.CACHE_FIRST,
  priority: DataPriority.STATIC,
  ttl: 3600000,      // 1 hour
  refreshInterval: 1800000  // 30 minutes
}
```

### Financial Data Considerations

**⚠️ CRITICAL**: Financial data requires careful TTL configuration to balance accuracy with performance.

```typescript
// Wallet Balance (show recent but not stale)
{
  ttl: 60000,        // 1 minute max staleness
  refreshInterval: 30000  // Refresh every 30 seconds
}

// Transaction History (can be slightly stale)
{
  ttl: 300000,       // 5 minutes acceptable
  refreshInterval: 60000  // Refresh every minute
}

// Pending Transactions (must be fresh)
{
  ttl: 30000,        // 30 seconds max
  refreshInterval: 15000  // Refresh every 15 seconds
}
```

---

## Cache Invalidation Patterns

### Invalidation Methods

#### Method 1: String Key Invalidation

```typescript
import { CacheManager } from '@goji-system/cache-lib/server';

// Invalidate single key
await CacheManager.invalidate('user:123:profile');
```

#### Method 2: Array-Based Batch Invalidation

```typescript
import { CacheManager } from '@goji-system/cache-lib/server';

// Invalidate multiple related keys
await CacheManager.invalidate([
  'user:123:profile',
  'user:123:wallets',
  'user:123:settings'
]);
```

#### Method 3: RegExp Pattern-Based Invalidation

```typescript
import { CacheManager } from '@goji-system/cache-lib/server';

// Invalidate all user-related caches
await CacheManager.invalidate(new RegExp(`^user:${userId}:`));

// Invalidate all chat messages for a chat
await CacheManager.invalidate(new RegExp(`^chat:${chatId}:`));

// Invalidate all wallet caches
await CacheManager.invalidate(/^wallet:/);
```

### Common Invalidation Scenarios

#### Scenario 1: User Profile Update

```typescript
async updateUserProfile(userId: string, updates: any) {
  // Update database
  const user = await this.prisma.user.update({
    where: { id: userId },
    data: updates
  });

  // Invalidate affected caches
  await CacheManager.invalidate([
    `user:${userId}:profile`,
    `user:${userId}:settings`
  ]);

  return user;
}
```

#### Scenario 2: New Transaction Created

```typescript
async createTransaction(transactionData: any) {
  // Create transaction in database
  const transaction = await this.prisma.transaction.create({
    data: transactionData
  });

  // Invalidate affected caches
  await CacheManager.invalidate([
    `user:${transactionData.userId}:transactions`,
    `user:${transactionData.userId}:transactions:recent:50`,
    `wallet:${transactionData.walletId}:balance`,
    `wallet:${transactionData.walletId}:transactions`
  ]);

  return transaction;
}
```

#### Scenario 3: Contact Added/Removed

```typescript
async addContact(userId: string, contactData: any) {
  // Add contact to database
  const contact = await this.prisma.contact.create({
    data: { userId, ...contactData }
  });

  // Invalidate contact list cache
  await CacheManager.invalidate(`user:${userId}:contacts`);

  return contact;
}
```

#### Scenario 4: Chat Message Sent

```typescript
async sendMessage(chatId: string, messageData: any) {
  // Save message to database
  const message = await this.prisma.message.create({
    data: { chatId, ...messageData }
  });

  // Invalidate chat message caches (all paginations)
  await CacheManager.invalidate(new RegExp(`^chat:${chatId}:messages:`));

  return message;
}
```

#### Scenario 5: Bulk User Deletion (Admin)

```typescript
async deleteUser(userId: string) {
  // Delete user from database
  await this.prisma.user.delete({ where: { id: userId } });

  // Invalidate ALL user-related caches using pattern
  await CacheManager.invalidate(new RegExp(`^user:${userId}:`));
}
```

### Cascading Invalidation Strategy

When a write affects multiple entities, invalidate all related caches:

```typescript
async transferFunds(fromWalletId: string, toWalletId: string, amount: number) {
  // 1. Execute database transaction
  const result = await this.prisma.$transaction([
    this.prisma.wallet.update({
      where: { id: fromWalletId },
      data: { balance: { decrement: amount } }
    }),
    this.prisma.wallet.update({
      where: { id: toWalletId },
      data: { balance: { increment: amount } }
    }),
    this.prisma.transaction.create({
      data: { fromWalletId, toWalletId, amount, status: 'COMPLETED' }
    })
  ]);

  // 2. Invalidate ALL affected caches
  const fromUserId = result[0].userId;
  const toUserId = result[1].userId;

  await CacheManager.invalidate([
    // From user caches
    `wallet:${fromWalletId}:balance`,
    `wallet:${fromWalletId}:transactions`,
    `user:${fromUserId}:transactions`,
    `user:${fromUserId}:wallets`,

    // To user caches
    `wallet:${toWalletId}:balance`,
    `wallet:${toWalletId}:transactions`,
    `user:${toUserId}:transactions`,
    `user:${toUserId}:wallets`
  ]);

  return result;
}
```

---

## Cache Warming Strategies

### Strategy 1: Startup Cache Warming

**Use Case**: Pre-populate frequently accessed data when application starts

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CacheManager } from '@goji-system/cache-lib/server';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Warm system configuration
    await this.warmSystemConfig();

    // Warm popular products
    await this.warmPopularProducts();
  }

  private async warmSystemConfig() {
    const config = await this.prisma.systemConfig.findFirst();
    await CacheManager.prewarm('system:config', config, 86400000); // 24 hours
  }

  private async warmPopularProducts() {
    const products = await this.prisma.product.findMany({
      where: { isPopular: true },
      take: 100
    });

    for (const product of products) {
      await CacheManager.prewarm(
        `product:${product.id}`,
        product,
        86400000 // 24 hours
      );
    }
  }
}
```

### Strategy 2: Scheduled Cache Warming (Cron)

**Use Case**: Refresh cache during off-peak hours

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheManager } from '@goji-system/cache-lib/server';
import { cacheWarmer } from '@goji-system/cache-lib/server';

@Injectable()
export class ScheduledCacheService {

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async warmDailyCache() {
    console.log('Starting daily cache warming...');

    // Warm popular products
    const products = await this.fetchPopularProducts();
    await cacheWarmer.warmPopularProducts(products, 86400000); // 24 hours

    // Warm pricing data
    const pricingData = await this.fetchPricingData();
    await cacheWarmer.warmPricingCache(
      products.map(p => p.id),
      pricingData
    );

    console.log('Cache warming complete');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshFrequentCache() {
    // Refresh frequently accessed data
    await this.warmSystemMetrics();
  }

  private async fetchPopularProducts() {
    // Fetch from database
    return await this.prisma.product.findMany({
      where: { viewCount: { gte: 1000 } },
      orderBy: { viewCount: 'desc' },
      take: 100
    });
  }
}
```

### Strategy 3: Batch Cache Warming

**Use Case**: Warm large datasets efficiently

```typescript
import { Injectable } from '@nestjs/common';
import { CacheManager } from '@goji-system/cache-lib/server';

@Injectable()
export class BatchCacheService {

  async warmUserDataBatch(userIds: string[]) {
    const batchSize = 10;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (userId) => {
          const userData = await this.fetchUserData(userId);
          await CacheManager.prewarm(
            `user:${userId}:profile`,
            userData,
            3600000 // 1 hour
          );
        })
      );

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async fetchUserData(userId: string) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, settings: true }
    });
  }
}
```

### Strategy 4: On-Demand Cache Warming

**Use Case**: Warm cache after user login or specific actions

```typescript
import { Injectable } from '@nestjs/common';
import { CacheManager } from '@goji-system/cache-lib/server';

@Injectable()
export class AuthService {

  async login(userId: string) {
    // Authenticate user
    const user = await this.authenticateUser(userId);

    // Pre-warm user data immediately after login
    await this.warmUserCache(userId);

    return user;
  }

  private async warmUserCache(userId: string) {
    // Fetch and cache user data in parallel
    const [profile, wallets, contacts] = await Promise.all([
      this.fetchUserProfile(userId),
      this.fetchUserWallets(userId),
      this.fetchUserContacts(userId)
    ]);

    // Warm all caches
    await Promise.all([
      CacheManager.prewarm(`user:${userId}:profile`, profile, 3600000),
      CacheManager.prewarm(`user:${userId}:wallets`, wallets, 3600000),
      CacheManager.prewarm(`user:${userId}:contacts`, contacts, 900000)
    ]);
  }
}
```

---

## Monitoring & Health Checks

### CacheMonitor Integration

```typescript
import { Injectable } from '@nestjs/common';
import { CacheMonitor } from '@goji-system/cache-lib/server';

@Injectable()
export class CacheHealthService {
  private monitor = CacheMonitor.getInstance();

  // Get overall cache metrics
  async getCacheMetrics() {
    return this.monitor.getMetrics();
  }

  // Get cache health status
  async getCacheHealth() {
    const health = this.monitor.getHealth();

    // Alert if hit rate is too low
    if (health.hitRate < 0.7) {
      console.warn('Cache hit rate below 70%:', health.hitRate);
    }

    // Alert if error rate is too high
    if (health.errorRate > 0.05) {
      console.error('Cache error rate above 5%:', health.errorRate);
    }

    return health;
  }

  // Get stats for specific key pattern
  async getKeyStats(keyPattern: string) {
    return this.monitor.getKeyStats(keyPattern);
  }

  // Health check endpoint
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: any;
  }> {
    const metrics = this.monitor.getMetrics();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.hitRate < 0.5 || metrics.errorRate > 0.1) {
      status = 'unhealthy';
    } else if (metrics.hitRate < 0.7 || metrics.errorRate > 0.05) {
      status = 'degraded';
    }

    return { status, metrics };
  }
}
```

### Metrics Structure

```typescript
interface CacheMetrics {
  hitRate: number;           // Percentage of cache hits (0-1)
  missRate: number;          // Percentage of cache misses (0-1)
  totalSize: number;         // Total cache size in bytes
  evictionCount: number;     // Number of items evicted
  avgAccessTime: number;     // Average access time in ms
  errorRate: number;         // Error rate (0-1)
  totalAccesses: number;     // Total cache access count
  tierMetrics?: {
    l1?: { hitRate: number; avgAccessTime: number };  // Memory cache
    l2?: { hitRate: number; avgAccessTime: number };  // WatermelonDB or Redis
  };
}
```

### Monitoring Best Practices

1. **Track hit rates per feature** to identify cache effectiveness
2. **Alert on low hit rates** (< 70%) or high error rates (> 5%)
3. **Monitor cache size** to prevent memory issues
4. **Log slow cache operations** (> 100ms) for investigation
5. **Use tier metrics** to optimize cache layer distribution

---

## Testing Patterns

### Unit Testing Cached Operations

```typescript
import { CacheManager } from '@goji-system/cache-lib/server';

describe('ContactService', () => {
  let service: ContactService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Clear cache before each test
    await CacheManager.invalidate(/^user:/);

    const module = await Test.createTestingModule({
      providers: [ContactService, PrismaService]
    }).compile();

    service = module.get<ContactService>(ContactService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up cache after each test
    await CacheManager.invalidate(/^user:/);
  });

  it('should fetch contacts from cache on second call', async () => {
    const userId = 'user-123';
    const mockContacts = [{ id: '1', name: 'John' }];

    // Mock Prisma query
    jest.spyOn(prisma.contact, 'findMany').mockResolvedValue(mockContacts);

    // First call - cache miss, should hit database
    const result1 = await service.getContactList(userId);
    expect(prisma.contact.findMany).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(mockContacts);

    // Second call - cache hit, should NOT hit database
    const result2 = await service.getContactList(userId);
    expect(prisma.contact.findMany).toHaveBeenCalledTimes(1); // Still 1
    expect(result2).toEqual(mockContacts);
  });

  it('should invalidate cache after contact update', async () => {
    const userId = 'user-123';

    // Add contact and check cache invalidation
    await service.addContact(userId, { name: 'Jane' });

    // Cache should be invalidated, next call should hit database
    const contacts = await service.getContactList(userId);
    expect(prisma.contact.findMany).toHaveBeenCalled();
  });
});
```

### Integration Testing Cache Flows

```typescript
describe('Cache Integration Tests', () => {
  it('should handle cache miss → database → cache populate flow', async () => {
    const userId = 'user-123';

    // Ensure cache is empty
    await CacheManager.invalidate(`user:${userId}:profile`);

    // First request - should hit database
    const profile1 = await service.getUserProfile(userId);
    expect(profile1).toBeDefined();

    // Verify cache was populated
    const cached = await CacheManager.get(`user:${userId}:profile`);
    expect(cached).toEqual(profile1);

    // Second request - should hit cache
    const profile2 = await service.getUserProfile(userId);
    expect(profile2).toEqual(profile1);
  });

  it('should handle cache invalidation after database write', async () => {
    const userId = 'user-123';

    // Populate cache
    await service.getUserProfile(userId);

    // Update user (should invalidate cache)
    await service.updateUserProfile(userId, { firstName: 'John' });

    // Verify cache was invalidated
    const cached = await CacheManager.get(`user:${userId}:profile`);
    expect(cached).toBeNull();
  });
});
```

### Mock Cache Setup for Testing

```typescript
// Mock CacheManager for unit tests
jest.mock('@goji-system/cache-lib/server', () => ({
  CacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
    prewarm: jest.fn()
  }
}));

// Test with mocked cache
it('should use cache when available', async () => {
  const mockData = { id: '1', name: 'Test' };

  // Mock cache hit
  (CacheManager.get as jest.Mock).mockResolvedValue(mockData);

  const result = await service.getData('1');
  expect(result).toEqual(mockData);
  expect(CacheManager.get).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'data:1' })
  );
});
```

### Coverage Requirements

- **Financial Operations**: 95%+ coverage (balances, transactions, transfers)
- **Cache Integration**: 80%+ coverage (cache hits, misses, invalidation)
- **Standard Features**: 80%+ coverage (general caching operations)

---

## AsyncStorage vs cache-lib

### Two Different Storage Concerns

The Goji system uses **two separate storage mechanisms** for different purposes:

#### **cache-lib** (L1 + L2): API Response Caching

**Purpose**: Cache API responses and reduce database load

**Technologies**:
- Client: Memory + WatermelonDB
- Server: Memory + Redis

**Use For**:
- Cached API responses (contacts, transactions, chat messages)
- Offline-first data with complex queries
- Data fetched from PostgreSQL
- Anything requiring TTL, invalidation, or cache strategies

**Access Pattern**: Through CacheManager with strategies

```typescript
import { CacheManager } from '@goji-system/cache-lib/client';

const profile = await CacheManager.get({
  key: 'user:123:profile',
  strategy: CacheStrategy.CACHE_FIRST,
  ttl: 3600000,
  fetchFn: async () => await fetchFromAPI()
});
```

#### **AsyncStorage** (Separate): App Settings & Preferences

**Purpose**: Store user preferences and app configuration

**Technology**: React Native AsyncStorage (simple key-value)

**Use For**:
- Theme preference (light/dark)
- Language setting (en, es, fr)
- Currency preference (USD, EUR)
- Onboarding state (completed, skipped)
- Feature toggles (experimental features)
- Animation preferences
- Action bar customization

**Access Pattern**: Direct AsyncStorage API

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store theme preference
await AsyncStorage.setItem('theme', 'dark');

// Retrieve theme preference
const theme = await AsyncStorage.getItem('theme');
```

### When to Use Each

| Data Type | Storage | Reason |
|-----------|---------|--------|
| User profile (from API) | cache-lib | Fetched from API, needs caching strategy |
| Chat messages | cache-lib (WatermelonDB) | Needs queries, relationships, offline access |
| Wallet balance (from API) | cache-lib | Needs TTL, refresh, invalidation |
| Transaction history (from API) | cache-lib | Needs caching, TTL management |
| Theme preference | AsyncStorage | App setting, not API data |
| Language setting | AsyncStorage | App setting, must load before cache-lib |
| Onboarding state | AsyncStorage | App state, not fetched from API |
| Currency preference | AsyncStorage | User preference, not cached API data |

### Key Differences

| Aspect | cache-lib | AsyncStorage |
|--------|-----------|--------------|
| **Purpose** | Cache API responses | Store app settings |
| **Data Source** | PostgreSQL via API | User input/preferences |
| **TTL** | Yes, configurable | No (persists indefinitely) |
| **Invalidation** | Yes, pattern-based | Manual deletion only |
| **Strategies** | 5 strategies available | N/A |
| **Queries** | Complex (WatermelonDB) | Simple key-value |
| **Initialization** | After app startup | Before app renders |

### Example: Settings Storage (Outside cache-lib)

```typescript
// Create a settings utility (NOT using cache-lib)
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SettingsStorage = {
  // Theme preference
  async getTheme(): Promise<'light' | 'dark'> {
    const theme = await AsyncStorage.getItem('theme');
    return theme === 'dark' ? 'dark' : 'light';
  },

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    await AsyncStorage.setItem('theme', theme);
  },

  // Language preference
  async getLanguage(): Promise<string> {
    return (await AsyncStorage.getItem('language')) ?? 'en';
  },

  async setLanguage(language: string): Promise<void> {
    await AsyncStorage.setItem('language', language);
  },

  // Onboarding state
  async isOnboardingComplete(): Promise<boolean> {
    const complete = await AsyncStorage.getItem('onboarding_complete');
    return complete === 'true';
  },

  async setOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem('onboarding_complete', 'true');
  }
};
```

### React Hook Pattern for Settings

```typescript
// hooks/useTheme.ts
import { useState, useEffect } from 'react';
import { SettingsStorage } from '../utils/settings-storage';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    SettingsStorage.getTheme().then(setThemeState);
  }, []);

  const setTheme = async (newTheme: 'light' | 'dark') => {
    await SettingsStorage.setTheme(newTheme);
    setThemeState(newTheme);
  };

  return { theme, setTheme };
}
```

### Common Mistake: Using cache-lib for Settings

```typescript
// ❌ BAD: Don't use cache-lib for app settings
import { CacheManager } from '@goji-system/cache-lib/client';

// This is wrong - settings are not cached API responses!
await CacheManager.set('user:123:theme', 'dark');

// ✅ GOOD: Use AsyncStorage directly for settings
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('theme', 'dark');
```

---

## Common Pitfalls & Best Practices

### ❌ Anti-Patterns to Avoid

#### 1. Never Skip Cache Invalidation

```typescript
// ❌ BAD: Update database without invalidating cache
async updateUser(userId: string, updates: any) {
  await this.prisma.user.update({ where: { id: userId }, data: updates });
  // Missing invalidation!
}

// ✅ GOOD: Always invalidate after writes
async updateUser(userId: string, updates: any) {
  await this.prisma.user.update({ where: { id: userId }, data: updates });
  await CacheManager.invalidate(`user:${userId}:profile`);
}
```

#### 2. Don't Use Inconsistent Cache Keys

```typescript
// ❌ BAD: Inconsistent naming
await CacheManager.set('userProfile123', data); // Wrong format
await CacheManager.set('user-profile-123', data); // Wrong separator

// ✅ GOOD: Follow naming convention
await CacheManager.set('user:123:profile', data);
```

#### 3. Don't Cache Sensitive Data Without Encryption

```typescript
// ❌ BAD: Cache sensitive data in plain text
await CacheManager.set('user:123:password', password); // NEVER!

// ✅ GOOD: Use ApiCachingService with encryption for sensitive data
await this.caching.set('user:123:profile', profile, {
  encryption: true,
  ttl: 3600
});
```

#### 4. Don't Use TTL Without Context

```typescript
// ❌ BAD: Random TTL values
await CacheManager.set('data:key', data, 12345); // Why 12345ms?

// ✅ GOOD: Use meaningful TTL based on DataPriority
await CacheManager.set('user:123:profile', data, 3600000); // 1 hour (STATIC)
```

#### 5. Don't Ignore Cache Errors

```typescript
// ❌ BAD: No error handling
const data = await CacheManager.get('user:123:profile');

// ✅ GOOD: Handle cache errors gracefully
try {
  const data = await CacheManager.get({
    key: 'user:123:profile',
    fetchFn: async () => await fetchFromDatabase(),
    onError: (error) => {
      console.error('Cache error:', error);
      // Fallback to database
    }
  });
} catch (error) {
  // Handle error
}
```

### ✅ Best Practices

#### 1. Always Use Explicit TTL

```typescript
// ✅ GOOD: Explicit TTL based on data volatility
await CacheManager.get({
  key: 'wallet:123:balance',
  ttl: 60000, // 1 minute for frequently changing data
  fetchFn: async () => await fetchBalance()
});
```

#### 2. Use Pattern-Based Invalidation for Related Data

```typescript
// ✅ GOOD: Invalidate all related caches together
async deleteChat(chatId: string) {
  await this.prisma.chat.delete({ where: { id: chatId } });

  // Invalidate all chat-related caches
  await CacheManager.invalidate(new RegExp(`^chat:${chatId}:`));
}
```

#### 3. Pre-warm Critical Data

```typescript
// ✅ GOOD: Pre-warm frequently accessed data
async onUserLogin(userId: string) {
  const userData = await this.fetchUserData(userId);
  await CacheManager.prewarm(`user:${userId}:profile`, userData, 3600000);
}
```

#### 4. Monitor Cache Performance

```typescript
// ✅ GOOD: Track cache metrics
const metrics = CacheMonitor.getInstance().getMetrics();
if (metrics.hitRate < 0.7) {
  console.warn('Low cache hit rate:', metrics.hitRate);
}
```

#### 5. Use Appropriate Strategy for Data Type

```typescript
// ✅ GOOD: Match strategy to data characteristics
const balance = await CacheManager.get({
  key: 'wallet:123:balance',
  strategy: CacheStrategy.STALE_WHILE_REVALIDATE, // Return fast, refresh in background
  priority: DataPriority.FREQUENT,
  ttl: 60000
});
```

#### 6. Batch Operations When Possible

```typescript
// ✅ GOOD: Batch invalidation
await CacheManager.invalidate([
  'user:123:profile',
  'user:123:wallets',
  'user:123:settings'
]);

// Instead of:
await CacheManager.invalidate('user:123:profile');
await CacheManager.invalidate('user:123:wallets');
await CacheManager.invalidate('user:123:settings');
```

#### 7. Use Client/Server Separation Correctly

```typescript
// ✅ GOOD: Client-side (React Native)
import { CacheManager } from '@goji-system/cache-lib/client';

// ✅ GOOD: Server-side (NestJS)
import { CacheManager } from '@goji-system/cache-lib/server';

// ❌ BAD: Wrong import on client
import { CacheManager } from '@goji-system/cache-lib'; // Includes server deps!
```

---

## Platform Separation Rules

### Client-Side (React Native)

**Import**: `@goji-system/cache-lib/client`

**Cache Technologies** (L1 + L2):
- L1: Memory Cache (Map) - Fastest tier
- L2: WatermelonDB (local SQLite) - Persistent tier
- NetInfo (network monitoring)

**What You CAN Do**:
- Cache API responses and UI data
- Implement offline-first functionality
- Use all CacheStrategy options
- Access CacheMonitor, RefreshManager, CacheWarmer
- Query cached data with complex filters (WatermelonDB)

**What You CANNOT Do**:
- Use Redis (server-only)
- Access Node.js-specific features
- Use server-side crypto operations

**Note**: AsyncStorage is used separately for app settings (theme, language, preferences) but is **NOT part of cache-lib**.

### Server-Side (NestJS)

**Import**: `@goji-system/cache-lib/server` or `@goji-system/cache-lib`

**Cache Technologies** (L1 + L2):
- L1: Memory Cache (Map) - Fastest tier
- L2: Redis (distributed caching) - Persistent tier
- ApiCachingService (multi-level caching)

**What You CAN Do**:
- Cache database query results
- Use Redis for distributed caching
- Implement multi-level caching (Memory → Redis → CDN)
- Encrypt sensitive cached data
- Use all monitoring and warming features

**What You CANNOT Do**:
- Use WatermelonDB (client-only)
- Use AsyncStorage (app-level settings, not in cache-lib)

---

## Quick Reference

### Cache Tiers

**Client (React Native)**:
- L1: Memory Cache (Map) - Fastest
- L2: WatermelonDB (SQLite) - Persistent

**Server (NestJS)**:
- L1: Memory Cache (Map) - Fastest
- L2: Redis - Distributed

**App Settings** (Separate from cache-lib):
- AsyncStorage: Theme, language, preferences

### Import Cheat Sheet

```typescript
// Client (React Native) - cache-lib
import {
  CacheManager,
  CacheStrategy,
  DataPriority
} from '@goji-system/cache-lib/client';

// Server (NestJS) - cache-lib
import {
  CacheManager,
  CacheStrategy,
  DataPriority
} from '@goji-system/cache-lib/server';

// App settings (NOT cache-lib)
import AsyncStorage from '@react-native-async-storage/async-storage';
```

### Strategy Cheat Sheet

| Data Type | Strategy | TTL | Refresh |
|-----------|----------|-----|---------|
| Chat messages | NETWORK_FIRST | 60s | 30s |
| Wallet balance | STALE_WHILE_REVALIDATE | 60s | 30s |
| Contact list | CACHE_FIRST | 900s | 300s |
| User profile | CACHE_FIRST | 3600s | 1800s |
| Offline data | CACHE_ONLY | - | - |

### Cache Key Templates

```typescript
`user:${userId}:profile`
`user:${userId}:transactions:recent:${limit}`
`chat:${chatId}:messages:recent:${limit}:${offset}`
`wallet:${walletId}:balance`
`product:${productId}`
```

### Invalidation Patterns

```typescript
// Single key
await CacheManager.invalidate('user:123:profile');

// Multiple keys
await CacheManager.invalidate(['key1', 'key2', 'key3']);

// Pattern (all user caches)
await CacheManager.invalidate(new RegExp(`^user:${userId}:`));
```

---

## Additional Resources

- **Cache-lib Source**: `/libs/cache-lib/`
- **API Caching Service**: `/apps/goji-api/src/common/services/api-caching.service.ts`
- **Redis Service**: `/apps/goji-api/src/common/redis/redis.service.ts`
- **PRD Reference**: Epic 8 - Cache-Based Data Architecture
- **Integration Tests**: `/apps/goji-api/test/integration/groups/` (example patterns)

---

**Last Updated**: 2025-10-31
**Version**: 2.0
**Maintainer**: Goji Development Team

**Change Log**:
- v2.0: Simplified architecture - Removed AsyncStorage from cache-lib, renumbered WatermelonDB L3→L2
- v1.0: Initial version with 3-tier client cache
