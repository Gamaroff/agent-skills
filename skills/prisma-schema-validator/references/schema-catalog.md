# Schema Catalog

This document provides a complete catalog of all database models in the Goji platform, including field descriptions, constraints, relationships, and business logic.

## Overview

The Goji database schema consists of **31 models** organized across **9 core domains**:

- **User Management** (4 models): User identity, KYC compliance, KYC limits, suspension tracking
- **Financial Operations** (3 models): Multi-currency wallets, transactions, payment requests  
- **Contact Management** (1 model): Payment identity routing
- **Communication** (3 models): Unified groups, members, messages with special capabilities
- **Chat Enhancement** (6 models): Media attachments, betting pools, outcomes, bets, content access, goals
- **Shopping System** (8 models): Products, providers, purchases, recommendations, sharing, reviews, inventory, categories
- **Notification System** (4 models): Notifications, delivery tracking, preferences, templates
- **Document Processing** (1 model): Identity document verification
- **Rewards & Loyalty** (1 model): Points and tier management

## User Management Domain

### User Model
**Table**: `users`  
**Purpose**: Comprehensive user profiles with authentication, security, compliance, and social features

#### Core Identity Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique user identifier |
| `email` | String | Unique, Required | User email address for authentication |
| `handle` | String | Unique, Required | @username for payments and social features |
| `firstName` | String | Optional | User's first name |
| `lastName` | String | Optional | User's last name |
| `displayName` | String | Optional | Custom display name for UI |
| `bio` | String | Optional | 280-character profile biography |
| `status` | String | Optional | Short status message (max 50 characters) |
| `dateOfBirth` | DateTime | Optional | User's birth date for compliance |
| `profileImageUrl` | String | Optional | Avatar image URL |

#### Location & Localization Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `country` | String | Optional | ISO country code (US, CA, GB, etc.) |
| `region` | String | Optional | State/province/region |
| `timezone` | String | Optional | IANA timezone identifier |

#### Authentication & Security Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `passwordHash` | String | Required | Bcrypt hashed password (never plaintext) |
| `isEmailVerified` | Boolean | Default: false | Email verification status |
| `isPhoneVerified` | Boolean | Default: false | Phone verification status |
| `phoneNumber` | String | Unique, Optional | International format phone number |
| `lastLoginAt` | DateTime | Optional | Last authentication timestamp |
| `twoFactorEnabled` | Boolean | Default: false | 2FA activation status |
| `twoFactorSecret` | String | Optional | TOTP secret for 2FA |
| `biometricEnabled` | Boolean | Default: false | Biometric authentication enabled |
| `faceIdEnabled` | Boolean | Default: false | Face ID specific setting |
| `fingerprintEnabled` | Boolean | Default: false | Fingerprint specific setting |
| `securityQuestions` | Json | Optional | Security Q&A pairs for recovery |

#### Financial Profile & Compliance Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `kycTier` | String | Default: "TIER_0" | KYC compliance level (TIER_0 to TIER_3) |
| `kycStatus` | String | Default: "PENDING" | PENDING, VERIFIED, REJECTED, EXPIRED |
| `kycDocumentStatus` | Json | Optional | Document verification status by type |
| `creditScore` | Decimal | Optional | Credit score for lending features |
| `riskScore` | Decimal | Optional | Risk assessment score (0.0 - 1.0) |
| `amlFlags` | String[] | Default: [] | Anti-money laundering alerts |
| `sanctionsScreened` | Boolean | Default: false | OFAC sanctions screening status |

#### Social Features Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `profileVisibility` | String | Default: "PUBLIC" | PUBLIC, FRIENDS_ONLY, PRIVATE |
| `onlineStatus` | String | Default: "OFFLINE" | ONLINE, OFFLINE, AWAY, BUSY |
| `lastSeenAt` | DateTime | Optional | Last activity timestamp |
| `allowContactRequests` | Boolean | Default: true | Accept new contact requests |
| `chatPreferences` | Json | Optional | Chat settings and preferences |

#### App Preferences Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `language` | String | Default: "en" | Preferred app language (ISO code) |
| `currency` | String | Default: "USD" | Default display currency |
| `theme` | String | Default: "light" | UI theme: light, dark, auto |

#### Compliance & Data Protection Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `dataConsentVersion` | String | Optional | Version of data consent accepted |
| `gdprConsent` | Boolean | Default: false | GDPR compliance consent |

#### Account Management Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `accountStatus` | String | Default: "ACTIVE" | ACTIVE, SUSPENDED, BANNED, PENDING |

#### Timestamp Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `createdAt` | DateTime | Auto-generated | Account creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `wallets` | One-to-Many | Wallet | User's cryptocurrency wallets |
| `transactions` | One-to-Many | Transaction | All user transactions |
| `sentTransactions` | One-to-Many | Transaction | Transactions sent by user |
| `receivedTransactions` | One-to-Many | Transaction | Transactions received by user |
| `chatParticipants` | One-to-Many | ChatParticipant | Chat group memberships |
| `rewards` | One-to-Many | Reward | Loyalty points and rewards |
| `notifications` | One-to-Many | Notification | User notifications |
| `notificationPreferences` | One-to-Many | NotificationPreference | Notification settings |
| `kycVerification` | One-to-One | KycVerification | KYC compliance record |
| `sentRequests` | One-to-Many | PaymentRequest | Payment requests created |
| `receivedRequests` | One-to-Many | PaymentRequest | Payment requests received |
| `suspensions` | One-to-Many | UserSuspension | Account suspension history |

#### Business Rules
- **Handle Format**: Must start with @ and contain only alphanumeric, dots, underscores, hyphens
- **Password Security**: Minimum 8 characters, hashed with bcrypt
- **KYC Tier Progression**: Can only upgrade tiers, not downgrade
- **Unique Constraints**: Email, handle, and phone must be globally unique
- **Profile Visibility**: Controls discoverability by other users
- **Transaction Limits**: Determined by kycTier via KycLimits table
- **Security Questions**: Encrypted JSON storage for account recovery
- **Risk Assessment**: AML flags and risk scores for compliance monitoring
- **Account Status**: Supersedes individual suspension fields
- **Data Consent**: Tracks compliance with data protection regulations

---

### KycVerification Model
**Table**: `kyc_verifications`  
**Purpose**: KYC/AML compliance verification records

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique verification record ID |
| `userId` | String | FK, Unique, Required | Reference to User |
| `status` | String | Required | PENDING, APPROVED, REJECTED |
| `level` | String | Required | KYC Tier: TIER_0, TIER_1, TIER_2, TIER_3 |
| `documentType` | String | Optional | Type of identification document |
| `documentNumber` | String | Optional | Document number (encrypted) |
| `expiryDate` | DateTime | Optional | Document expiration date |
| `createdAt` | DateTime | Auto-generated | Verification request timestamp |
| `updatedAt` | DateTime | Auto-updated | Last status change timestamp |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Owner of verification record |

#### Business Rules
- **KYC Tier Progression**: Higher tiers unlock higher transaction limits
- **Document Requirements**: Each tier has specific documentation requirements
- **Status Transitions**: PENDING → APPROVED/REJECTED (terminal states)
- **One Per User**: Each user can only have one active KYC record

---

### KycLimits Model
**Table**: `kyc_limits`  
**Purpose**: Transaction limits matrix by country, KYC tier, and currency

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique limit record ID |
| `country` | String | Required | ISO country code (US, CA, GB, etc.) |
| `kycTier` | String | Required | KYC Tier: TIER_0, TIER_1, TIER_2, TIER_3 |
| `currency` | String | Required | BSV, USD, EUR, GBP, etc. |
| `dailyLimit` | Decimal | Required | Maximum daily transaction amount |
| `monthlyLimit` | Decimal | Required | Maximum monthly transaction amount |
| `singleTransactionLimit` | Decimal | Required | Maximum per-transaction amount |
| `createdAt` | DateTime | Auto-generated | Record creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

#### Unique Constraints
- **Country-Tier-Currency Combination**: Ensures one limit record per combination

#### Business Rules
- **Regulatory Compliance**: Limits set according to local financial regulations
- **Tier Progression**: Higher KYC tiers allow higher transaction limits
- **Currency-Specific**: Each currency has its own limit structure
- **Admin Management**: Limits can only be modified by authorized administrators

---

### UserSuspension Model
**Table**: `user_suspensions`  
**Purpose**: Account suspension audit trail with complete history

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique suspension record ID |
| `userId` | String | FK, Required | Reference to suspended user |
| `reason` | String | Required | Detailed suspension reason |
| `suspensionType` | String | Required | TEMPORARY, PERMANENT, SECURITY_REVIEW |
| `suspendedAt` | DateTime | Required | Suspension start timestamp |
| `expiresAt` | DateTime | Optional | Automatic unsuspension time (for temporary) |
| `unsuspendedAt` | DateTime | Optional | Manual unsuspension timestamp |
| `suspendedBy` | String | FK, Optional | Admin who applied suspension |
| `unsuspendedBy` | String | FK, Optional | Admin who lifted suspension |
| `isActive` | Boolean | Default: true | Current suspension status |
| `metadata` | Json | Optional | Additional suspension context |
| `createdAt` | DateTime | Auto-generated | Record creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Suspended user (cascade delete) |

#### Business Rules
- **Audit Trail**: Complete history of all suspension/unsuspension events
- **Multiple Suspensions**: Users can have multiple suspension records over time
- **Active Status**: Only one active suspension per user at a time
- **Automatic Expiration**: Temporary suspensions auto-expire based on expiresAt
- **Admin Tracking**: Records which administrator performed the action
- **Reason Documentation**: All suspensions must have detailed reasoning

---

## Financial Operations Domain

### Wallet Model  
**Table**: `wallets`  
**Purpose**: Multi-currency wallet management (BSV, MNEE USD)

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique wallet identifier |
| `userId` | String | FK, Required | Wallet owner reference |
| `type` | String | Required | BSV, MNEE_USD |
| `changePublicKey` | String | Required | Encrypted public key for change addresses |
| `receivePublicKey` | String | Required | Encrypted public key for receive addresses |
| `balance` | Decimal | Default: 0 | Current wallet balance |
| `status` | String | Default: "ACTIVE" | ACTIVE, INACTIVE, FROZEN |
| `lastSyncAt` | DateTime | Optional | Last blockchain sync timestamp |
| `createdAt` | DateTime | Auto-generated | Wallet creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last balance update timestamp |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Wallet owner (cascade delete) |
| `transactions` | One-to-Many | Transaction | All wallet transactions |

#### Business Rules
- **Single Currency**: Each wallet holds exactly one currency type
- **Key Management**: Both change and receive public keys are encrypted for security
- **Balance Precision**: Uses Decimal type for exact monetary calculations
- **Multi-Wallet Support**: Users can have multiple wallets of different types

---

### Transaction Model
**Table**: `transactions`  
**Purpose**: Comprehensive transaction tracking with blockchain integration

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique transaction identifier |
| `userId` | String | FK, Required | Transaction owner reference |
| `walletId` | String | FK, Optional | Associated wallet reference |
| `type` | String | Required | Transaction type (see types below) |
| `status` | String | Required | PENDING, CONFIRMED, FAILED, CANCELLED, EXPIRED |
| `amount` | Decimal | Required | Transaction amount (positive for credits, negative for debits) |
| `fee` | Decimal | Default: 0 | Transaction processing fee |
| `currency` | String | Required | BSV, MNEE_USD |

**Blockchain Fields:**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `transactionId` | String | Optional | Blockchain transaction ID |
| `blockHeight` | Int | Optional | Block number for confirmation |
| `networkFee` | Decimal | Optional | Blockchain network fees |

**Address & Handle Fields:**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `fromAddress` | String | Optional | Sender blockchain address |
| `toAddress` | String | Optional | Recipient blockchain address |
| `fromHandle` | String | Optional | Sender @handle |
| `toHandle` | String | Optional | Recipient @handle |
| `fromUserId` | String | FK, Optional | Sender user reference |
| `toUserId` | String | FK, Optional | Recipient user reference |

**Integration Fields:**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `orderId` | String | Optional | Link to shopping orders |
| `requestId` | String | Optional | Link to payment requests |
| `chatId` | String | Optional | Associated chat conversation |

**Metadata Fields:**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `description` | String | Optional | Transaction description |
| `memo` | String | Optional | Additional memo field |

**Timestamp Fields:**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `createdAt` | DateTime | Auto-generated | Transaction initiation |
| `updatedAt` | DateTime | Auto-updated | Last status change |
| `confirmedAt` | DateTime | Optional | Blockchain confirmation time |
| `broadcastAt` | DateTime | Optional | Network broadcast time |

#### Transaction Types
- **SEND**: User-initiated outbound payment
- **RECEIVE**: Inbound payment from another user
- **DEPOSIT**: Fiat onramp deposit
- **BANK_TRANSFER**: Bank account transfer
- **MOBILE_MONEY_TRANSFER**: Mobile money transfer
- **FEE**: Platform or network fees
- **PAYMENT**: General payment transaction
- **REFUND**: Payment reversal
- **TOPUP**: Wallet funding
- **REWARD**: Loyalty reward distribution
- **SHOPPING**: E-commerce purchase
- **REQUEST_FULFILLMENT**: Payment request fulfillment

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Transaction owner (cascade delete) |
| `wallet` | Many-to-One | Wallet | Associated wallet |
| `fromUser` | Many-to-One | User | Sender for P2P transactions |
| `toUser` | Many-to-One | User | Recipient for P2P transactions |

#### Business Rules
- **Immutable Records**: Financial records are append-only
- **Status Progression**: Follows defined state machine
- **Amount Precision**: Uses Decimal type for exact calculations
- **Audit Trail**: Complete transaction lifecycle tracking

---

### PaymentRequest Model
**Table**: `payment_requests`  
**Purpose**: P2P payment request management

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique request identifier |
| `requesterId` | String | FK, Required | User creating the request |
| `recipientId` | String | FK, Required | User receiving the request |
| `amount` | Decimal | Required | Requested payment amount |
| `currency` | String | Required | BSV, MNEE_USD |
| `message` | String | Optional | Request message/description |
| `note` | String | Optional | Additional notes |
| `status` | String | Required | PENDING, ACCEPTED, REJECTED, EXPIRED |
| `dueDate` | DateTime | Optional | Expected payment date |
| `expiresAt` | DateTime | Optional | Request expiration |
| `expiresInHours` | Int | Optional | Expiration in hours |
| `metadata` | String | Optional | Additional request metadata |
| `transactionId` | String | Optional | Fulfillment transaction reference |
| `rejectionReason` | String | Optional | Reason for rejection |
| `createdAt` | DateTime | Auto-generated | Request creation |
| `updatedAt` | DateTime | Auto-updated | Last status change |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `requester` | Many-to-One | User | User who created the request |
| `recipient` | Many-to-One | User | User who should fulfill the request |

#### Business Rules
- **Expiration Handling**: Automatic expiration based on timestamps
- **Status Transitions**: PENDING → ACCEPTED/REJECTED/EXPIRED
- **Amount Validation**: Must be positive and within limits
- **Self-Request Prevention**: Cannot request payment from yourself

---

## Contact Domain (Payment Identities)

### Contact Model
**Table**: `contacts`  
**Purpose**: Pure payment identity management for routing payments to different methods

#### Core Payment Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique contact identifier |
| `userId` | String | FK, Required | Contact owner reference |
| `name` | String | Required | Contact display name |
| `type` | String | Required | goji, bank, mobile_money, paymail, mnee_usd |
| `paymentDetails` | Json | Required | Type-specific payment routing information |
| `isFavorite` | Boolean | Default: false | Favorite contact flag |
| `trustLevel` | String | Default: "new" | new, verified, trusted |
| `lastInteractionAt` | DateTime | Optional | Last payment interaction |
| `interactionCount` | Int | Default: 0 | Total payment interactions |
| `totalPaymentVolume` | Decimal | Default: 0 | Total payment volume |
| `isActive` | Boolean | Default: true | Contact active status |
| `createdAt` | DateTime | Auto-generated | Contact creation |
| `updatedAt` | DateTime | Auto-updated | Last update |

#### Payment Details Examples

**Goji Contact**: `{ "handle": "@alice", "publicKey": "pub123", "supportedCurrencies": ["BSV", "USD"] }`
**Bank Contact**: `{ "accountNumber": "123456", "routingNumber": "021000021", "bankName": "Chase", "country": "US" }`
**Mobile Money**: `{ "phoneNumber": "+254700123456", "operator": "Safaricom", "countryCode": "KE" }`
**Paymail**: `{ "paymail": "alice@handcash.io", "capabilities": ["payment", "identity"] }`
**MNEE USD**: `{ "walletAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "provider": "MNEE" }`

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Contact owner (cascade delete) |
| `groupMemberships` | One-to-Many | GroupMember | Groups this contact participates in |

#### Business Rules
- **Payment Focus**: No chat/messaging fields - pure payment routing
- **Trust Progression**: Higher trust levels unlock larger transaction limits  
- **Type Validation**: Payment details validated based on contact type
- **Group Participation**: Contacts can join groups for messaging while maintaining payment identity
- **External Integration**: Enables payment routing from group conversations

---

## Communication Domain (Unified Groups)

### Group Model
**Table**: `groups`  
**Purpose**: Unified conversation spaces for private chats (2-person) and multi-person groups with special capabilities

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique group identifier |
| `name` | String | Required | Group display name |
| `description` | String | Optional | Group description |
| `avatarUrl` | String | Optional | Group avatar URL |
| `type` | String | Required | private (2 people), group (3+) |
| `visibility` | String | Default: "private" | private, public |
| `joinMode` | String | Default: "invite_only" | open, request, invite_only |
| `capabilities` | String[] | Default: ["chat"] | Enabled group capabilities |
| `savingsEnabled` | Boolean | Default: false | Savings capability enabled |
| `savingsGoal` | Decimal | Optional | Group savings goal amount |
| `savingsDeadline` | DateTime | Optional | Savings goal deadline |
| `savingsRules` | Json | Optional | Savings rules and policies |
| `bettingEnabled` | Boolean | Default: false | Betting capability enabled |
| `bettingRules` | Json | Optional | Betting rules and settlement |
| `bettingDeadline` | DateTime | Optional | Betting deadline |
| `monetizationEnabled` | Boolean | Default: false | Content monetization enabled |
| `defaultContentPrice` | Decimal | Optional | Default price for monetized content |
| `monetizationRules` | Json | Optional | Monetization and revenue sharing rules |
| `isReadOnly` | Boolean | Default: false | Read-only mode |
| `autoArchiveAfter` | Int | Optional | Auto-archive after N days |
| `memberLimit` | Int | Default: 1000 | Maximum members (private chat groups: 2) |
| `memberCount` | Int | Default: 0 | Current member count |
| `messageCount` | Int | Default: 0 | Total messages |
| `lastActivityAt` | DateTime | Default: now() | Last activity timestamp |
| `createdAt` | DateTime | Auto-generated | Group creation |
| `updatedAt` | DateTime | Auto-updated | Last update |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `members` | One-to-Many | GroupMember | Group participants (users and contacts) |
| `messages` | One-to-Many | GroupMessage | Group messages with capability features |

#### Group Capabilities
- **chat**: Basic messaging functionality
- **payments**: Payment integration within group
- **savings**: Group savings pools with goals and contribution tracking
- **betting**: Group betting and predictions with automated settlement
- **bill_splitting**: Shared expense management and automatic distribution
- **content_monetization**: Pay-to-view content with revenue sharing
- **polls**: Group voting and decision making
- **events**: Event planning and coordination
- **marketplace**: Group commerce and trading

#### Business Rules
- **Type Constraints**: Private chat groups limited to 2 members, group chats 3+
- **Capability Dependencies**: Some capabilities require others (betting requires payments)
- **Permission Inheritance**: Group capabilities determine available member permissions
- **Activity Tracking**: Last activity updates on message send, member join, capability use
- **Special Function Rules**: Each capability has specific validation and business logic

---

### GroupMember Model
**Table**: `group_members`  
**Purpose**: Enhanced group membership supporting both users and contacts with capability-specific permissions

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique membership identifier |
| `groupId` | String | FK, Required | Target group reference |
| `userId` | String | FK, Optional | Goji user reference |
| `contactId` | String | FK, Optional | External contact reference |
| `role` | String | Required | OWNER, ADMIN, MODERATOR, MEMBER |
| `permissions` | String[] | Default: ["chat"] | Capability-specific permissions |
| `status` | String | Default: "active" | active, muted, banned, left |
| `joinedAt` | DateTime | Auto-generated | Group join timestamp |
| `lastReadAt` | DateTime | Optional | Last message read |
| `lastActiveAt` | DateTime | Default: now() | Last activity in group |
| `invitedBy` | String | FK, Optional | User who invited this member |
| `approvedAt` | DateTime | Optional | Membership approval timestamp |
| `approvedBy` | String | FK, Optional | Admin who approved membership |
| `savingsContribution` | Decimal | Default: 0 | Total savings contributed |
| `bettingBalance` | Decimal | Default: 0 | Current betting balance |
| `createdAt` | DateTime | Auto-generated | Membership creation |
| `updatedAt` | DateTime | Auto-updated | Last membership update |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `group` | Many-to-One | Group | Target group (cascade delete) |
| `user` | Many-to-One | User | Goji user member (cascade delete) |
| `contact` | Many-to-One | Contact | External contact member (cascade delete) |

#### Unique Constraints
- **Group-User Combination**: One membership per user per group
- **Group-Contact Combination**: One membership per contact per group

#### Business Rules
- **Role Hierarchy**: OWNER > ADMIN > MODERATOR > MEMBER
- **Dual Membership**: Members can be either users or contacts, not both
- **Permission Validation**: Permissions must be subset of group capabilities
- **Capability Tracking**: Financial data tracked per capability (savings, betting)
- **Invitation Workflow**: Join requests and approvals for restricted groups

---

### GroupMessage Model  
**Table**: `group_messages`  
**Purpose**: Enhanced unified messages for private chats and group chats with comprehensive media, payment, and interactive capabilities

#### Core Message Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique message identifier |
| `groupId` | String | FK, Required | Target group reference |
| `senderId` | String | Required | Message sender user ID |
| `senderMemberId` | String | FK, Required | GroupMember ID for permission context |
| `content` | String | Required | Message content/text |
| `text` | String | Optional | Alternative text representation |
| `contentType` | String | Default: "text" | Message type (see types below) |

#### Media Support Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `mediaAttachments` | Relation | MediaAttachment[] | Associated media files |
| `mediaDuration` | Int | Optional | Duration in seconds for audio/video |
| `mediaSize` | BigInt | Optional | File size in bytes |
| `thumbnailUrl` | String | Optional | Thumbnail for media previews |

#### Payment Integration Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `isPayment` | Boolean | Default: false | Payment message flag |
| `paymentAmount` | Decimal | Optional | Payment amount |
| `paymentCurrency` | String | Optional | Payment currency |
| `paymentRecipients` | String[] | Default: [] | Target member IDs for group payments |
| `paymentStatus` | String | Optional | PENDING, PROCESSING, COMPLETED, FAILED |
| `transactionId` | String | Optional | Link to Transaction model |

#### Content Monetization Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `isMonetized` | Boolean | Default: false | Monetized content flag |
| `accessPrice` | Decimal | Optional | Content access price |
| `accessCurrency` | String | Optional | Access price currency |
| `accessCount` | Int | Default: 0 | Number of users who accessed content |
| `monetizationGoal` | Json | Optional | Goal-based unlocking configuration |
| `unlockDeadline` | DateTime | Optional | Deadline for goal-based content |

#### Interactive Features Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `savingsData` | Json | Optional | Savings contribution, goal updates |
| `bettingPoolId` | String | FK, Optional | Reference to betting pool |
| `billSplitData` | Json | Optional | Bill splitting information |
| `productShareData` | Json | Optional | Shared product information |
| `giftCodeData` | Json | Optional | Encrypted gift code data |

#### Message Interactions Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `reactions` | Json | Optional | User reactions (emoji counts) |
| `mentions` | String[] | Default: [] | Mentioned user IDs |
| `linkPreviews` | Json | Optional | Link preview metadata |
| `replyToMessageId` | String | FK, Optional | Message being replied to |
| `threadMessageIds` | String[] | Default: [] | Thread replies |

#### Message State Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `editedAt` | DateTime | Optional | Message edit timestamp |
| `deletedAt` | DateTime | Optional | Message deletion timestamp |
| `pinnedAt` | DateTime | Optional | Message pin timestamp |
| `pinnedBy` | String | FK, Optional | User who pinned message |
| `isEdited` | Boolean | Default: false | Edit flag |
| `isDeleted` | Boolean | Default: false | Deletion flag |

#### Delivery Tracking Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `deliveredTo` | String[] | Default: [] | User IDs who received message |
| `readBy` | String[] | Default: [] | User IDs who read message |
| `status` | String | Default: "sent" | sending, sent, delivered, read, failed |

#### Timestamp Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `createdAt` | DateTime | Auto-generated | Message timestamp |
| `updatedAt` | DateTime | Auto-updated | Last edit timestamp |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `group` | Many-to-One | Group | Target group (cascade delete) |
| `member` | Many-to-One | GroupMember | Sender membership context |
| `mediaAttachments` | One-to-Many | MediaAttachment | Associated media files |
| `bettingPool` | Many-to-One | BettingPool | Associated betting pool |
| `replyTo` | Many-to-One | GroupMessage | Parent message for replies |
| `replies` | One-to-Many | GroupMessage | Thread replies |
| `contentAccess` | One-to-Many | ContentAccess | Content access tracking |

#### Enhanced Message Types
- **text**: Standard text messages with mentions and links
- **image, video, audio, file**: Rich media with metadata
- **payment**: P2P and group payments with transaction links
- **payment_request**: Payment requests within conversations
- **group_payment**: Multi-party payment splitting
- **monetized_content**: Premium content with access controls
- **product_share**: E-commerce product sharing
- **gift_code_share**: Digital gift code distribution
- **betting_pool**: Group betting and predictions
- **savings_update**: Savings pool updates and notifications
- **system**: Automated system messages

#### Business Rules
- **Rich Media Support**: Comprehensive media handling with processing pipeline
- **Payment Integration**: Direct transaction creation from messages
- **Content Monetization**: Goal-based and fixed-price content unlocking
- **Thread Management**: Reply chains and conversation threading
- **Delivery Tracking**: Real-time message status across all recipients
- **Interactive Features**: Reactions, mentions, link previews

---

## Chat Enhancement Domain

### MediaAttachment Model
**Table**: `media_attachments`  
**Purpose**: Rich media support for chat messages with processing pipeline

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique attachment identifier |
| `messageId` | String | FK, Required | Associated message reference |
| `fileName` | String | Required | File name for storage |
| `originalFileName` | String | Required | Original user-provided filename |
| `fileSize` | BigInt | Required | File size in bytes |
| `mimeType` | String | Required | MIME type (image/jpeg, video/mp4, etc.) |
| `mediaType` | String | Required | image, video, audio, document |
| `url` | String | Required | CDN URL for accessing the media |
| `thumbnailUrl` | String | Optional | Thumbnail image URL |
| `previewUrl` | String | Optional | Low-res preview for faster loading |

#### Media Metadata Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `dimensions` | Json | Optional | { width: number, height: number } for images/videos |
| `duration` | Int | Optional | Duration in seconds for audio/video |
| `bitrate` | Int | Optional | Bitrate for audio/video files |
| `resolution` | String | Optional | Resolution string (e.g., "1920x1080") |

#### Processing Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `processingStatus` | String | Default: "pending" | pending, processing, ready, failed |
| `processedAt` | DateTime | Optional | Processing completion timestamp |

#### Security Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `isEncrypted` | Boolean | Default: false | Encryption status |
| `encryptionKey` | String | Optional | Encryption key for secure media |
| `accessLevel` | String | Default: "group" | group, premium, private |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `message` | Many-to-One | GroupMessage | Parent message (cascade delete) |

#### Business Rules
- **File Size Limits**: Maximum 100MB per attachment
- **Processing Pipeline**: Automated thumbnail and preview generation
- **Security Options**: Optional encryption for sensitive media
- **Access Control**: Three-tier access level system

---

### BettingPool Model
**Table**: `betting_pools`  
**Purpose**: Group entertainment and prediction markets with automated settlement

#### Core Pool Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique pool identifier |
| `groupId` | String | FK, Required | Host group reference |
| `creatorId` | String | Required | Pool creator user ID |
| `title` | String | Required | Pool title/question |
| `description` | String | Required | Detailed pool description |
| `category` | String | Required | sports, markets, politics, entertainment, local |

#### Betting Configuration Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `minBet` | Decimal | Required | Minimum bet amount |
| `maxBet` | Decimal | Required | Maximum bet amount |
| `maxPoolSize` | Int | Optional | Maximum number of participants |
| `currency` | String | Required | USD, BSV |
| `entryDeadline` | DateTime | Required | Deadline for placing bets |
| `resultDeadline` | DateTime | Required | Deadline for resolving pool |

#### Pool Status Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `status` | String | Default: "open" | open, closed, resolved, disputed, cancelled |
| `totalPool` | Decimal | Default: 0 | Total amount in the pool |
| `participantCount` | Int | Default: 0 | Number of participants |

#### Resolution Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `winningOutcome` | String | Optional | ID of winning outcome |
| `evidenceLinks` | String[] | Default: [] | Supporting evidence URLs |
| `moderatorId` | String | Optional | Moderator who resolved pool |
| `resolvedAt` | DateTime | Optional | Resolution timestamp |
| `payoutCompleted` | Boolean | Default: false | Payout completion status |

#### Compliance Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `requiresModeration` | Boolean | Default: true | Moderation requirement flag |
| `ageRestricted` | Boolean | Default: false | Age restriction flag |
| `regionRestricted` | String[] | Default: [] | Restricted country codes |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `group` | Many-to-One | Group | Host group (cascade delete) |
| `outcomes` | One-to-Many | BettingOutcome | Available betting options |
| `bets` | One-to-Many | BettingPoolBet | Individual bets placed |
| `messages` | One-to-Many | GroupMessage | Related messages |

#### Business Rules
- **Regulatory Compliance**: Region-specific restrictions and moderation
- **Automated Settlement**: Payouts calculated and processed automatically
- **Evidence Requirements**: Resolution requires supporting evidence
- **Fair Play**: Transparent odds and settlement processes

---

### BettingOutcome Model
**Table**: `betting_outcomes`  
**Purpose**: Available options for betting pools

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique outcome identifier |
| `poolId` | String | FK, Required | Parent betting pool |
| `label` | String | Required | Outcome description |
| `description` | String | Optional | Detailed outcome explanation |
| `odds` | Decimal | Optional | Fixed odds (if applicable) |
| `isWinner` | Boolean | Default: false | Winning outcome flag |
| `createdAt` | DateTime | Auto-generated | Creation timestamp |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `pool` | Many-to-One | BettingPool | Parent pool (cascade delete) |
| `bets` | One-to-Many | BettingPoolBet | Bets placed on this outcome |

---

### BettingPoolBet Model
**Table**: `betting_pool_bets`  
**Purpose**: Individual bets placed by users

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique bet identifier |
| `poolId` | String | FK, Required | Target betting pool |
| `outcomeId` | String | FK, Required | Chosen outcome |
| `userId` | String | Required | Betting user |
| `amount` | Decimal | Required | Bet amount |
| `currency` | String | Required | Bet currency |
| `transactionId` | String | Optional | Payment transaction link |
| `status` | String | Default: "placed" | placed, won, lost, refunded |
| `payout` | Decimal | Optional | Winning payout amount |
| `payoutTransactionId` | String | Optional | Payout transaction link |
| `createdAt` | DateTime | Auto-generated | Bet placement timestamp |

#### Unique Constraints
- **Pool-Outcome-User**: One bet per user per outcome per pool

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `pool` | Many-to-One | BettingPool | Target pool (cascade delete) |
| `outcome` | Many-to-One | BettingOutcome | Chosen outcome (cascade delete) |

---

### ContentAccess Model
**Table**: `content_access`  
**Purpose**: Track access to monetized content with payment processing

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique access record |
| `messageId` | String | FK, Required | Content message reference |
| `userId` | String | Required | Accessing user ID |
| `accessType` | String | Required | unlock, goal_contribution, preview |
| `paymentAmount` | Decimal | Optional | Amount paid for access |
| `paymentCurrency` | String | Optional | Payment currency |
| `transactionId` | String | Optional | Payment transaction link |
| `goalContribution` | Boolean | Default: false | Goal contribution flag |
| `goalId` | String | FK, Optional | Associated content goal |
| `accessGrantedAt` | DateTime | Default: now() | Access grant timestamp |
| `accessExpiresAt` | DateTime | Optional | Access expiration |
| `createdAt` | DateTime | Auto-generated | Record creation |

#### Unique Constraints
- **Message-User-AccessType**: Prevent duplicate access records

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `message` | Many-to-One | GroupMessage | Content message (cascade delete) |
| `goal` | Many-to-One | ContentGoal | Associated goal (set null) |
| `refunds` | One-to-Many | ContentRefund | Related refunds |

---

### ContentGoal Model
**Table**: `content_goals`  
**Purpose**: Crowdfunded content unlocking with goal tracking

#### Goal Configuration Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique goal identifier |
| `messageId` | String | FK, Unique, Required | Content message reference |
| `targetAmount` | Decimal | Optional | Target funding amount |
| `targetBackers` | Int | Optional | Target number of backers |
| `deadline` | DateTime | Required | Goal deadline |
| `description` | String | Optional | Goal description |

#### Progress Tracking Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `totalRaised` | Decimal | Default: 0 | Current funding amount |
| `backersCount` | Int | Default: 0 | Current number of backers |

#### Goal Policies Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `status` | String | Default: "active" | active, reached, expired, cancelled |
| `fallbackPolicy` | String | Default: "refund_all" | refund_all, rollover, partial_access |
| `gracePeriodHours` | Int | Default: 72 | Grace period after deadline |
| `minRevealThreshold` | Decimal | Optional | Minimum for partial access |

#### Resolution Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `goalReachedAt` | DateTime | Optional | Goal completion timestamp |
| `goalExpiredAt` | DateTime | Optional | Goal expiration timestamp |
| `refundsProcessed` | Boolean | Default: false | Refund processing status |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `message` | One-to-One | GroupMessage | Content message (cascade delete) |
| `contributions` | One-to-Many | ContentAccess | User contributions |
| `refunds` | One-to-Many | ContentRefund | Failed goal refunds |

#### Business Rules
- **Dual Targets**: Can have amount target, backer target, or both
- **Automatic Processing**: Goals automatically resolved on deadline
- **Flexible Policies**: Multiple fallback strategies for failed goals
- **Refund Protection**: Automatic refunds for failed funding goals

---

### ContentRefund Model
**Table**: `content_refunds`  
**Purpose**: Process refunds for failed content goals

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique refund identifier |
| `contentAccessId` | String | FK, Required | Original access record |
| `goalId` | String | FK, Optional | Associated goal |
| `userId` | String | Required | Refund recipient |
| `refundAmount` | Decimal | Required | Refund amount |
| `refundCurrency` | String | Required | Refund currency |
| `refundReason` | String | Required | goal_expired, user_optout, partial_pro_rate |
| `processed` | Boolean | Default: false | Processing status |
| `processedAt` | DateTime | Optional | Processing completion |
| `transactionId` | String | Optional | Refund transaction link |
| `createdAt` | DateTime | Auto-generated | Refund creation |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `contentAccess` | Many-to-One | ContentAccess | Original access (cascade delete) |
| `goal` | Many-to-One | ContentGoal | Associated goal (set null) |

#### Business Rules
- **Automatic Processing**: Refunds processed automatically on goal failure
- **Full Audit Trail**: Complete refund tracking for compliance
- **Multiple Policies**: Support for different refund strategies

---

## Shopping System Domain

### ShoppingProvider Model
**Table**: `shopping_providers`  
**Purpose**: 3rd party aggregators and direct integrations for digital product sourcing

#### Core Provider Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique provider identifier |
| `name` | String | Required | Provider name (Blackhawk Network, InComm, Ding) |
| `type` | String | Required | GIFT_CARDS, MOBILE_TOPUP, GAMING, STREAMING |
| `apiEndpoint` | String | Optional | Provider API base URL |
| `commissionRate` | Decimal | Default: 0.05 | Commission percentage (0-1) |
| `supportedCountries` | String[] | Default: [] | ISO country codes |
| `status` | String | Default: "ACTIVE" | ACTIVE, INACTIVE, MAINTENANCE |

#### Integration Configuration Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `authMethod` | String | Optional | API_KEY, OAUTH, BASIC_AUTH |
| `apiKeyEncrypted` | String | Optional | Encrypted API credentials |
| `webhookUrl` | String | Optional | Status update webhook endpoint |

#### Business Metrics Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `averageDeliveryTime` | Int | Default: 300 | Average delivery time in seconds |
| `successRate` | Decimal | Default: 0.95 | Success rate percentage |
| `dailyTransactionLimit` | Decimal | Optional | Maximum daily volume |
| `minimumOrderValue` | Decimal | Default: 1 | Minimum order amount |
| `maximumOrderValue` | Decimal | Optional | Maximum transaction amount |

#### Health Monitoring Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `lastSyncAt` | DateTime | Optional | Last catalog sync timestamp |
| `nextSyncAt` | DateTime | Optional | Next scheduled sync |
| `isHealthy` | Boolean | Default: true | Provider health status |
| `lastHealthCheck` | DateTime | Optional | Last health check timestamp |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `products` | One-to-Many | ShoppingProduct | Provider's product catalog |
| `purchases` | One-to-Many | ShoppingPurchase | Purchases processed by provider |
| `syncEvents` | One-to-Many | ProviderSyncEvent | Sync operation history |

---

### ShoppingProduct Model
**Table**: `shopping_products`  
**Purpose**: Unified digital product catalog aggregated from multiple providers

#### Core Product Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique product identifier |
| `sku` | String | Unique, Required | Provider-specific SKU |
| `name` | String | Required | Product name |
| `description` | String | Required | Detailed product description |
| `shortDescription` | String | Optional | Brief product summary |

#### Categorization Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `category` | String | Required | GIFT_CARD, MOBILE_TOPUP, STREAMING, GAMING |
| `subcategory` | String | Optional | More specific categorization |
| `brand` | String | Required | Product brand (Amazon, Netflix, Steam) |
| `merchant` | String | Required | Merchant name (usually same as brand) |

#### Pricing and Availability Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `faceValue` | Decimal | Required | Product face value |
| `costPrice` | Decimal | Optional | Provider cost for margin calculation |
| `currency` | String | Required | Product currency (USD, EUR, BSV) |
| `countries` | String[] | Default: [] | Available countries (ISO codes) |
| `regions` | String[] | Default: [] | Available regions/states |

#### Delivery Configuration Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `deliveryType` | String | Required | INSTANT_CODE, EMAIL, QR_CODE, DEEP_LINK |
| `deliveryInstructions` | String | Optional | Redemption instructions |
| `redemptionUrl` | String | Optional | Code redemption URL |
| `termsAndConditions` | String | Optional | Product-specific T&Cs |
| `expiryDuration` | Int | Optional | Days until code expires |

#### Inventory Management Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `status` | String | Default: "ACTIVE" | ACTIVE, INACTIVE, OUT_OF_STOCK |
| `availableQuantity` | Int | Default: 0 | Available inventory count |
| `reservedQuantity` | Int | Default: 0 | Reserved for pending orders |
| `lowStockThreshold` | Int | Default: 10 | Low stock alert threshold |
| `isLowStock` | Boolean | Default: false | Low stock status flag |

#### Marketing Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `imageUrl` | String | Optional | Primary product image |
| `thumbnailUrl` | String | Optional | Thumbnail image |
| `tags` | String[] | Default: [] | Searchable tags |
| `isFeatured` | Boolean | Default: false | Featured product flag |
| `isTrending` | Boolean | Default: false | Trending product flag |
| `popularity` | Int | Default: 0 | Purchase count/ranking |
| `rating` | Decimal | Optional | User rating 1-5 |
| `reviewCount` | Int | Default: 0 | Number of user reviews |

#### Compliance Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `ageRestricted` | Boolean | Default: false | Age restriction flag |
| `minimumAge` | Int | Default: 18 | Minimum purchase age |
| `kycRequired` | String | Default: "TIER_0" | Required KYC tier |
| `complianceFlags` | String[] | Default: [] | GAMBLING, HIGH_VALUE, RESTRICTED |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `provider` | Many-to-One | ShoppingProvider | Product source provider |
| `purchases` | One-to-Many | ShoppingPurchase | Purchase history |
| `recommendations` | One-to-Many | ShoppingRecommendation | AI recommendations |
| `shares` | One-to-Many | ProductShare | Product sharing activity |
| `reviews` | One-to-Many | ProductReview | User reviews and ratings |
| `inventoryEvents` | One-to-Many | ProductInventoryEvent | Inventory change history |

---

### ShoppingPurchase Model
**Table**: `shopping_purchases`  
**Purpose**: Complete digital product purchase transaction records

#### Core Purchase Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique purchase identifier |
| `userId` | String | FK, Required | Purchasing user |
| `productId` | String | FK, Required | Purchased product |
| `walletId` | String | FK, Optional | Payment wallet |
| `quantity` | Int | Default: 1 | Purchase quantity |
| `unitPrice` | Decimal | Required | Price per unit at purchase |
| `totalAmount` | Decimal | Required | Total purchase amount |
| `currency` | String | Required | Purchase currency |
| `exchangeRate` | Decimal | Optional | Currency conversion rate |

#### Provider Tracking Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `providerId` | String | FK, Required | Processing provider |
| `providerOrderId` | String | Optional | Provider's order ID |
| `providerStatus` | String | Optional | Status from provider |
| `providerResponse` | Json | Optional | Raw provider response |

#### Processing Status Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `status` | String | Default: "PENDING" | PENDING, PROCESSING, COMPLETED, FAILED |
| `paymentStatus` | String | Default: "PENDING" | Payment processing status |
| `deliveryStatus` | String | Default: "PENDING" | Delivery status |

#### Digital Delivery Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `deliveryMethod` | String | Required | INSTANT_CODE, EMAIL, QR_CODE |
| `redemptionCodes` | Json | Optional | Array of codes with instructions |
| `deliveryAttempts` | Int | Default: 0 | Delivery retry count |
| `deliveredAt` | DateTime | Optional | Successful delivery timestamp |

#### Gift Features Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `isGift` | Boolean | Default: false | Gift purchase flag |
| `recipientEmail` | String | Optional | Gift recipient email |
| `recipientUserId` | String | FK, Optional | Gift recipient user ID |
| `giftMessage` | String | Optional | Custom gift message |
| `giftDeliveredAt` | DateTime | Optional | Gift delivery timestamp |

#### Social Sharing Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `sharedWithContacts` | String[] | Default: [] | Shared with user IDs |
| `shareType` | String | Optional | PURCHASE_GIFT, CODE_SHARE |
| `shareMessageId` | String | Optional | Chat message link |

#### Transaction Integration Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `transactionId` | String | Optional | Main transaction record |
| `refundTransactionId` | String | Optional | Refund transaction |

#### Security and Compliance Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `userAgent` | String | Optional | Client information |
| `ipAddress` | String | Optional | Purchase IP address |
| `deviceFingerprint` | String | Optional | Device identification |
| `geoLocation` | Json | Optional | Purchase location data |
| `complianceFlags` | String[] | Default: [] | Compliance alerts |
| `fraudScore` | Decimal | Optional | Fraud risk score 0-1 |
| `riskFactors` | String[] | Default: [] | Risk factors identified |

#### Lifecycle Timestamps

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `processedAt` | DateTime | Optional | Processing start time |
| `completedAt` | DateTime | Optional | Purchase completion |
| `failedAt` | DateTime | Optional | Failure timestamp |
| `cancelledAt` | DateTime | Optional | Cancellation timestamp |
| `refundedAt` | DateTime | Optional | Refund timestamp |
| `createdAt` | DateTime | Auto-generated | Purchase initiation |
| `updatedAt` | DateTime | Auto-updated | Last status update |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Purchasing user (cascade delete) |
| `product` | Many-to-One | ShoppingProduct | Purchased product |
| `provider` | Many-to-One | ShoppingProvider | Processing provider |
| `wallet` | Many-to-One | Wallet | Payment wallet |
| `purchaseEvents` | One-to-Many | PurchaseStatusEvent | Status change audit trail |

---

### ShoppingUserProfile Model
**Table**: `shopping_user_profiles`  
**Purpose**: AI-powered user personalization and shopping behavior analytics

#### Core Profile Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique profile identifier |
| `userId` | String | FK, Unique, Required | Associated user |
| `purchaseCategories` | Json | Default: "{}" | Category preferences with weights |
| `spendingPatterns` | Json | Default: "{}" | Timing, frequency, amounts |
| `priceSensitivity` | Decimal | Default: 0.5 | Price sensitivity 0-1 scale |

#### Analytics Data Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `totalLifetimeSpent` | Decimal | Default: 0 | Total shopping spend |
| `totalPurchases` | Int | Default: 0 | Total purchase count |
| `averageOrderValue` | Decimal | Default: 0 | Average purchase amount |
| `favoriteCategory` | String | Optional | Most purchased category |
| `favoriteMerchant` | String | Optional | Most purchased merchant |

#### Behavioral Insights Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `purchaseFrequency` | Decimal | Optional | Purchases per month |
| `seasonalPatterns` | Json | Optional | Seasonal buying patterns |
| `dayOfWeekPatterns` | Json | Optional | Preferred purchase days |
| `timeOfDayPatterns` | Json | Optional | Preferred purchase hours |

#### Social Shopping Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `shareFrequency` | Int | Default: 0 | Product sharing frequency |
| `giftPurchaseRatio` | Decimal | Default: 0 | Percentage of gift purchases |
| `socialInfluenceScore` | Decimal | Default: 0 | Influence on others' purchases |

#### AI/ML Model Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `lastAnalysisUpdate` | DateTime | Default: now() | Last profile analysis |
| `modelVersion` | String | Optional | ML model version used |
| `confidenceScore` | Decimal | Optional | Profile accuracy confidence |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | One-to-One | User | Profile owner (cascade delete) |
| `recommendations` | One-to-Many | ShoppingRecommendation | Generated recommendations |

---

### ShoppingRecommendation Model
**Table**: `shopping_recommendations`  
**Purpose**: AI-generated product recommendations with performance tracking

#### Core Recommendation Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique recommendation identifier |
| `userId` | String | FK, Required | Target user |
| `productId` | String | FK, Required | Recommended product |
| `userProfileId` | String | FK, Optional | Associated user profile |
| `recommendationType` | String | Required | Algorithm type used |
| `confidenceScore` | Decimal | Required | Confidence level 0-1 |
| `personalizedPrice` | Decimal | Optional | User-specific pricing |

#### Recommendation Types
- **PURCHASE_HISTORY**: Based on user's past purchases
- **COLLABORATIVE**: Based on similar users' purchases
- **TRENDING**: Currently popular products
- **SEASONAL**: Seasonal and event-based recommendations
- **SOCIAL**: Based on friends' and contacts' activity

#### Promotional Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `hasPromotion` | Boolean | Default: false | Promotion availability |
| `discountPercentage` | Decimal | Optional | Discount percentage |
| `promotionValidUntil` | DateTime | Optional | Promotion expiry |
| `promotionDescription` | String | Optional | Promotion details |

#### Context and Performance Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `reason` | String | Optional | Human-readable recommendation reason |
| `contextData` | Json | Optional | Additional context data |
| `shownToUser` | Boolean | Default: false | Display tracking |
| `shownAt` | DateTime | Optional | Display timestamp |
| `userInteraction` | String | Optional | VIEWED, CLICKED, PURCHASED, IGNORED |
| `interactedAt` | DateTime | Optional | Interaction timestamp |
| `conversionScore` | Decimal | Optional | Conversion likelihood |
| `clickThroughRate` | Decimal | Optional | CTR for this type |

#### Lifecycle Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `isActive` | Boolean | Default: true | Recommendation active status |
| `expiresAt` | DateTime | Optional | Recommendation expiration |
| `createdAt` | DateTime | Auto-generated | Recommendation creation |
| `updatedAt` | DateTime | Auto-updated | Last update |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Target user (cascade delete) |
| `product` | Many-to-One | ShoppingProduct | Recommended product |
| `userProfile` | Many-to-One | ShoppingUserProfile | Associated profile |

---

### ProductShare Model
**Table**: `product_shares`  
**Purpose**: Social product sharing and viral tracking within chat system

#### Core Sharing Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique share identifier |
| `userId` | String | FK, Required | User who shared product |
| `productId` | String | FK, Required | Shared product |
| `sharedWithContactId` | String | FK, Optional | Individual recipient |
| `sharedInGroupId` | String | FK, Optional | Group recipient |
| `shareType` | String | Required | PRODUCT_BROWSE, PURCHASE_GIFT, CODE_SHARE |
| `shareMethod` | String | Required | CHAT_MESSAGE, DIRECT_LINK, QR_CODE |
| `messageContext` | String | Optional | Additional message text |

#### Engagement Tracking Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `viewedByRecipient` | Boolean | Default: false | Recipient viewed flag |
| `viewedAt` | DateTime | Optional | View timestamp |
| `clickedByRecipient` | Boolean | Default: false | Recipient clicked flag |
| `clickedAt` | DateTime | Optional | Click timestamp |
| `resultedInPurchase` | Boolean | Default: false | Conversion flag |
| `purchaseId` | String | Optional | Related purchase ID |

#### Performance Metrics Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `shareImpression` | Int | Default: 0 | Share view count |
| `shareReach` | Int | Default: 0 | Unique users reached |
| `conversionRate` | Decimal | Optional | Share conversion rate |
| `viralCoefficient` | Decimal | Optional | Viral influence score |
| `secondaryShares` | Int | Default: 0 | Shares generated from this share |

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Sharing user (cascade delete) |
| `product` | Many-to-One | ShoppingProduct | Shared product |
| `group` | Many-to-One | Group | Group context (set null) |

---

### Additional Shopping Models

#### ProductReview Model
**Purpose**: User product ratings and feedback system

#### ProductInventoryEvent Model  
**Purpose**: Track all inventory changes with audit trail

#### ProviderSyncEvent Model
**Purpose**: Monitor catalog synchronization with providers

#### ShoppingCategory Model
**Purpose**: Hierarchical product category management

> **For complete shopping system documentation**: See [Shopping System Schema](./shopping-system-schema.md) for detailed field descriptions, business rules, and integration patterns.

---

## Notification System Domain

### Notification Model
**Table**: `notifications`  
**Purpose**: System notifications and user communications

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique notification identifier |
| `userId` | String | FK, Required | Target user reference |
| `title` | String | Required | Notification title |
| `message` | String | Required | Notification content |
| `type` | NotificationTypeEnum | Required | Notification category |
| `priority` | NotificationPriorityEnum | Default: medium | Delivery priority |
| `channels` | NotificationChannelEnum[] | Required | Delivery channels array |
| `status` | NotificationStatusEnum | Default: pending | Delivery status |
| `metadata` | Json | Optional | Additional notification data |
| `templateId` | String | FK, Optional | Template reference |
| `scheduledAt` | DateTime | Optional | Scheduled delivery time |
| `expiresAt` | DateTime | Optional | Notification expiration |
| `readAt` | DateTime | Optional | User read timestamp |
| `createdAt` | DateTime | Auto-generated | Creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last update timestamp |

#### Notification Types (Enum)
- **transaction**: Financial transaction notifications
- **security**: Security and KYC notifications  
- **payment_request**: Payment request notifications
- **shopping**: E-commerce notifications
- **system**: System maintenance and updates
- **promotion**: Rewards and promotional messages

#### Priority Levels (Enum)
- **low**: Non-urgent notifications
- **medium**: Standard priority (default)
- **high**: Important notifications  
- **critical**: Security and financial alerts
- **emergency**: Immediate attention required

#### Delivery Channels (Enum)
- **push**: Mobile push notifications
- **sms**: SMS text messages
- **email**: Email notifications
- **in_app**: In-app notifications
- **websocket**: Real-time websocket messages

#### Status Values (Enum)
- **pending**: Not yet processed
- **queued**: Queued for delivery
- **sent**: Delivered to channel
- **delivered**: Confirmed delivery
- **read**: User has read notification
- **failed**: Delivery failed
- **expired**: Past expiration time

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Target user (cascade delete) |
| `deliveries` | One-to-Many | NotificationDelivery | Delivery attempts |
| `template` | Many-to-One | NotificationTemplate | Template reference |

#### Database Indexes
- `[userId, createdAt]`: User notification history
- `[userId, status]`: User unread notifications  
- `[type, priority]`: Priority processing
- `[status, scheduledAt]`: Scheduled delivery

---

### NotificationDelivery Model
**Table**: `notification_deliveries`  
**Purpose**: Delivery tracking per channel

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique delivery record |
| `notificationId` | String | FK, Required | Parent notification |
| `channel` | NotificationChannelEnum | Required | Delivery channel |
| `provider` | String | Optional | Service provider (FCM, Twilio, etc.) |
| `externalId` | String | Optional | Provider transaction ID |
| `status` | DeliveryStatusEnum | Default: pending | Delivery status |
| `deliveredAt` | DateTime | Optional | Successful delivery time |
| `openedAt` | DateTime | Optional | User opened notification |
| `clickedAt` | DateTime | Optional | User clicked notification |
| `failedAt` | DateTime | Optional | Delivery failure time |
| `failureReason` | String | Optional | Failure error message |
| `metadata` | Json | Optional | Provider-specific data |
| `createdAt` | DateTime | Auto-generated | Delivery attempt time |

#### Delivery Status Values (Enum)
- **pending**: Not yet attempted
- **sent**: Sent to provider
- **delivered**: Provider confirmed delivery
- **opened**: User opened notification
- **clicked**: User clicked notification
- **failed**: Delivery failed

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `notification` | Many-to-One | Notification | Parent notification (cascade delete) |

#### Database Indexes
- `[notificationId, channel]`: Delivery lookup
- `[status, createdAt]`: Status tracking
- `[channel, status]`: Channel performance

---

### NotificationPreference Model
**Table**: `notification_preferences`  
**Purpose**: User notification preferences

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique preference record |
| `userId` | String | FK, Required | User reference |
| `type` | NotificationTypeEnum | Required | Notification type |
| `channels` | NotificationChannelEnum[] | Required | Enabled channels |
| `enabled` | Boolean | Default: true | Preference enabled flag |
| `quietHours` | Json | Optional | Do not disturb settings |
| `frequencyLimit` | Int | Optional | Max notifications per hour |
| `createdAt` | DateTime | Auto-generated | Preference creation |
| `updatedAt` | DateTime | Auto-updated | Last preference change |

#### Quiet Hours Format
```json
{
  "start": "22:00",
  "end": "08:00", 
  "timezone": "UTC"
}
```

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Preference owner (cascade delete) |

#### Unique Constraints
- **User-Type Combination**: One preference per user per notification type

#### Database Indexes
- `[userId, enabled]`: Active user preferences

---

### NotificationTemplate Model
**Table**: `notification_templates`  
**Purpose**: Notification message templates

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique template identifier |
| `name` | String | Required | Template name/identifier |
| `type` | NotificationTypeEnum | Required | Template category |
| `language` | String | Default: "en" | Template language |
| `channel` | NotificationChannelEnum | Required | Target channel |
| `titleTemplate` | String | Required | Title template with placeholders |
| `messageTemplate` | String | Required | Message template with placeholders |
| `metadataSchema` | Json | Optional | Required template variables |
| `isActive` | Boolean | Default: true | Template active status |
| `version` | Int | Default: 1 | Template version number |
| `createdAt` | DateTime | Auto-generated | Template creation |
| `updatedAt` | DateTime | Auto-updated | Last template change |

#### Template Variables
Templates support variable substitution:
- `{{userName}}` - User's display name
- `{{amount}}` - Transaction amount
- `{{currency}}` - Currency code
- `{{handle}}` - User handle
- Custom variables via metadata

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `notifications` | One-to-Many | Notification | Generated notifications |

#### Unique Constraints
- **Name-Version Combination**: Unique template versions

#### Database Indexes
- `[type, channel, language]`: Template lookup
- `[isActive, type]`: Active template filtering

---

## Rewards & Loyalty Domain

### Reward Model
**Table**: `rewards`  
**Purpose**: User loyalty points and tier management

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, UUID, Required | Unique reward record |
| `userId` | String | FK, Required | Reward recipient |
| `points` | Int | Default: 0 | Loyalty points balance |
| `tier` | String | Default: "BRONZE" | User loyalty tier |
| `createdAt` | DateTime | Auto-generated | Reward creation |
| `updatedAt` | DateTime | Auto-updated | Last points change |

#### Loyalty Tiers
- **BRONZE**: 0-999 points
- **SILVER**: 1,000-4,999 points  
- **GOLD**: 5,000+ points

#### Relationships

| Relationship | Type | Target | Description |
|--------------|------|--------|-------------|
| `user` | Many-to-One | User | Reward owner (cascade delete) |

#### Business Rules
- **Points Accumulation**: Points earned through transactions and activities
- **Tier Benefits**: Higher tiers unlock better rewards and limits
- **Points Expiration**: Points may expire after inactivity period

---

## Schema Evolution and Migration History

### Current Version: 2.0
**Last Migration**: `20250901_align_transaction_schema`

#### Recent Changes
- Added `displayName` field to User model
- Enhanced Transaction model with blockchain fields
- Comprehensive notification system implementation
- Added payment request functionality

### Migration Best Practices
- **Backward Compatibility**: Always consider existing data
- **Index Strategy**: Add indexes for new query patterns
- **Data Migration**: Handle existing records appropriately
- **Performance Impact**: Monitor query performance after changes

## Cross-References

- **API Integration**: See [API Reference](../api-reference/README.md) for DTO-to-model mappings
- **Entity Relationships**: See [Relationship Mapping](./relationship-mapping.md) for detailed ERDs
- **Query Patterns**: See [Data Patterns](./data-patterns.md) for common operations
- **Performance Optimization**: See [Index & Performance Guide](./index-performance-guide.md)
- **Type Integration**: See [Type Quick Reference](../api-reference/type-quick-reference.md) for TypeScript mapping