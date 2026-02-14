---
name: websocket-real-time-validator
description: Validate Socket.IO patterns for chat, notifications, live updates. Use when implementing real-time features, reviewing Socket.IO code, implementing event handlers, validating connection management, ensuring proper room/namespace patterns, or enforcing Socket.IO event naming conventions.
---

# Socket.IO Real-Time Validator

## Overview

This skill validates Socket.IO implementations against Goji real-time communication patterns. **CRITICAL**: Goji uses Socket.IO 4.8+ for all real-time communication, NOT native WebSocket. This skill ensures proper Socket.IO connection management, event naming conventions, namespace/room patterns, state synchronization, error recovery, offline queuing, and rate limiting.

## When to Use This Skill

Use this skill when:

- Implementing Socket.IO connections for chat, notifications, or live updates
- Creating Socket.IO event handlers on server or client
- Reviewing Socket.IO connection management code
- Implementing room/namespace subscription patterns
- Validating Socket.IO event naming conventions
- Setting up Socket.IO configuration (reconnection is automatic)
- Implementing offline message queuing
- Adding rate limiting or throttling to Socket.IO events
- Debugging Socket.IO connection issues
- Ensuring state synchronization between client and server

## Socket.IO Protocol Standard

**CRITICAL**: Goji uses Socket.IO 4.8+ for all real-time communication.

**DO NOT USE**: Native WebSocket API (`new WebSocket()`)
**USE**: `socket.io-client` library (client-side) and `@nestjs/platform-socket.io` (server-side)

## Connection Management Standards

### Client Connection Pattern (Socket.IO)

Proper Socket.IO connection lifecycle management:

```typescript
import io, { Socket } from 'socket.io-client';
import { logger } from '@goji-system/logging-lib/client';

class SocketIOService {
  private socket: Socket | null = null;
  private isConnected = false;

  async connect(userId: string): Promise<void> {
    if (this.socket?.connected) {
      logger.info('[SocketIO] Already connected');
      return;
    }

    try {
      const token = await getAuthToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      // Socket.IO handles reconnection automatically
      this.socket = io(apiUrl, {
        auth: { token },
        query: { userId },
        transports: ['websocket', 'polling'], // WebSocket first, fallback to polling
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 10000
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        logger.info('[SocketIO] Connected to server');
        this.isConnected = true;
        // Subscribe to user-specific events
        this.socket?.emit('subscribe:notifications', { userId });
      });

      this.socket.on('disconnect', reason => {
        logger.info('[SocketIO] Disconnected', { reason });
        this.isConnected = false;
        // Socket.IO will auto-reconnect if reason !== 'io client disconnect'
      });

      this.socket.on('connect_error', error => {
        logger.error('[SocketIO] Connection error', { error: error.message });
      });

      this.socket.on('error', error => {
        logger.error('[SocketIO] Socket error', { error });
      });
    } catch (error) {
      logger.error('[SocketIO] Failed to connect', { error });
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      logger.info('[SocketIO] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}
```

### Server Connection Pattern (NestJS Gateway)

Socket.IO gateway with proper lifecycle:

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  },
  namespace: '/notifications'
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionManager: ChatSessionManager,
    private readonly presenceManager: PresenceManager
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Add to session manager
    this.sessionManager.addSession({
      socketId: client.id,
      userId,
      chatId: 'global',
      connectedAt: new Date(),
      lastActivity: new Date(),
      isTyping: false
    });

    // Update presence
    this.presenceManager.setUserOnline(userId);

    logger.info(`Client connected: ${client.id}, user: ${userId}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const session = this.sessionManager.getSession(client.id);

    if (session) {
      // Set offline with delay (user might reconnect)
      this.presenceManager.setUserOffline(session.userId, 30000);

      // Remove session
      this.sessionManager.removeSession(client.id);

      logger.info(`Client disconnected: ${client.id}, user: ${session.userId}`);
    }
  }
}
```

## Event Naming Conventions

### Standard Pattern: module:action:target

Event naming structure:

```typescript
// ✅ CORRECT - kebab-case, descriptive
export const WebSocketEvents = {
  CHAT: {
    MESSAGE_SENT: 'chat:sent:message',
    MESSAGE_RECEIVED: 'chat:received:message',
    MESSAGE_DELIVERED: 'chat:delivered:message',
    MESSAGE_FAILED: 'chat:failed:message',

    USER_JOINED: 'chat:join:group',
    USER_LEFT: 'chat:leave:group',

    TYPING_START: 'chat:start:typing',
    TYPING_STOP: 'chat:stop:typing'
  },

  NOTIFICATION: {
    RECEIVED: 'notification:received:message',
    READ: 'notification:read:message',
    DELETED: 'notification:deleted:message',
    COUNT_UPDATED: 'notification:updated:count'
  },

  TRANSACTION: {
    PAYMENT_SENT: 'transaction:sent:payment',
    PAYMENT_RECEIVED: 'transaction:received:payment',
    PAYMENT_COMPLETED: 'transaction:completed:payment',
    PAYMENT_FAILED: 'transaction:failed:payment'
  },

  USER: {
    STATUS_UPDATED: 'user:updated:status',
    PRESENCE_CHANGED: 'user:updated:presence',
    CONNECTED: 'user:connect:connection',
    DISCONNECTED: 'user:disconnect:connection'
  }
};

// ❌ WRONG - Inconsistent naming
const BAD_EVENTS = {
  'newMessage',           // camelCase, not descriptive
  'MESSAGE_RECEIVED',     // Missing module prefix
  'user-typing',          // Incomplete pattern
  'payment_completed'     // Underscore instead of colon
};
```

### Server Event Handlers (Past Tense)

Use past tense for server-emitted events:

```typescript
// ✅ CORRECT - Past tense for events that already happened
socket.emit('notification:received:message', notification);
socket.emit('chat:delivered:message', message);
socket.emit('transaction:completed:payment', payment);
socket.emit('user:updated:status', status);

// ❌ WRONG - Present/future tense
socket.emit('notification:receive:message', notification);
socket.emit('chat:deliver:message', message);
```

### Client Event Handlers (Action Verbs)

Use action verbs for client requests:

```typescript
// ✅ CORRECT - Action verbs for client requests
@SubscribeMessage('chat:send:message')
async handleSendMessage(
  @MessageBody() data: SendMessageDto,
  @ConnectedSocket() client: Socket
): Promise<void> {
  // Process and emit result
}

@SubscribeMessage('notification:mark:read')
async handleMarkAsRead(
  @MessageBody() data: { notificationId: string },
  @ConnectedSocket() client: Socket
): Promise<void> {
  // Mark as read and emit confirmation
}
```

## Room and Channel Patterns

### Joining Rooms

Server-side room management:

```typescript
@SubscribeMessage('chat:join:room')
async handleJoinRoom(
  @MessageBody() data: { chatId: string; userId: string },
  @ConnectedSocket() client: Socket
): Promise<void> {
  const { chatId, userId } = data;

  // Validate access
  const hasAccess = await this.chatService.userHasAccess(userId, chatId);
  if (!hasAccess) {
    client.emit('error', { message: 'Access denied to chat room' });
    return;
  }

  // Join Socket.IO room
  await client.join(`chat:${chatId}`);

  // Update session
  this.sessionManager.addSession({
    socketId: client.id,
    userId,
    chatId,
    connectedAt: new Date(),
    lastActivity: new Date(),
    isTyping: false
  });

  // Notify room
  client.to(`chat:${chatId}`).emit('chat:join:user', {
    userId,
    timestamp: new Date().toISOString()
  });

  logger.info(`User ${userId} joined chat ${chatId}`);
}

@SubscribeMessage('chat:leave:room')
async handleLeaveRoom(
  @MessageBody() data: { chatId: string; userId: string },
  @ConnectedSocket() client: Socket
): Promise<void> {
  const { chatId, userId } = data;

  // Leave Socket.IO room
  await client.leave(`chat:${chatId}`);

  // Update session
  this.sessionManager.removeUserFromChat(client.id, chatId);

  // Notify room
  client.to(`chat:${chatId}`).emit('chat:leave:user', {
    userId,
    timestamp: new Date().toISOString()
  });

  logger.info(`User ${userId} left chat ${chatId}`);
}
```

### Broadcasting to Rooms

Efficient room broadcasting:

```typescript
class ChatNotificationService {
  constructor(private server: Server) {}

  // Broadcast to entire room
  broadcastToRoom(chatId: string, event: string, data: any): void {
    this.server.to(`chat:${chatId}`).emit(event, data);
  }

  // Broadcast to room excluding sender
  broadcastToRoomExcept(
    chatId: string,
    event: string,
    data: any,
    excludeSocketId: string
  ): void {
    this.server.to(`chat:${chatId}`).except(excludeSocketId).emit(event, data);
  }

  // Broadcast to specific user (all their sockets)
  async broadcastToUser(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    const sessions = this.sessionManager.getUserSessions(userId);

    sessions.forEach(session => {
      this.server.to(session.socketId).emit(event, data);
    });
  }

  // Broadcast to multiple rooms
  broadcastToMultipleRooms(chatIds: string[], event: string, data: any): void {
    chatIds.forEach(chatId => {
      this.server.to(`chat:${chatId}`).emit(event, data);
    });
  }
}
```

## State Synchronization

### Client State Sync

Optimistic updates with rollback:

```typescript
class NotificationService {
  private notifications: UICompatibleNotification[] = [];
  private unreadCount = 0;

  async markAsRead(notificationId: string): Promise<void> {
    // Find notification
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Store previous state
    const previousIsRead = notification.isRead;

    // Optimistic update
    notification.isRead = true;
    if (!previousIsRead) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }

    try {
      // Sync to server via WebSocket
      this.ws.emit('notification:mark:read', { notificationId });

      // Wait for confirmation
      await this.waitForConfirmation(notificationId, 5000);
    } catch (error) {
      // Rollback on failure
      notification.isRead = previousIsRead;
      if (!previousIsRead) {
        this.unreadCount += 1;
      }

      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  private waitForConfirmation(
    notificationId: string,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ws.off('notification:confirmed:read', handler);
        reject(new Error('Confirmation timeout'));
      }, timeout);

      const handler = (data: { notificationId: string }) => {
        if (data.notificationId === notificationId) {
          clearTimeout(timer);
          this.ws.off('notification:confirmed:read', handler);
          resolve();
        }
      };

      this.ws.on('notification:confirmed:read', handler);
    });
  }
}
```

## Error Recovery and Reconnection

### Exponential Backoff Reconnection

Robust reconnection logic:

```typescript
class WebSocketService {
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.notifyStatusHandlers('DISCONNECTED');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    this.notifyStatusHandlers('RECONNECTING');

    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectInterval;
    const exponentialDelay =
      baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const maxDelay = 30000; // Max 30 seconds
    const jitter = Math.random() * 1000; // Add 0-1s jitter

    const delay = Math.min(exponentialDelay, maxDelay) + jitter;

    logger.info(
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} ` +
        `in ${Math.round(delay)}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  private handleClose(event: CloseEvent): void {
    logger.info('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Only reconnect if not a clean disconnect (code 1000)
    if (event.code !== 1000 && this.userId) {
      this.scheduleReconnect();
    } else {
      this.notifyStatusHandlers('DISCONNECTED');
    }
  }
}
```

### Heartbeat/Ping-Pong

Keep connection alive:

```typescript
// Client-side heartbeat
private startHeartbeat(): void {
  if (this.heartbeatTimer) {
    clearInterval(this.heartbeatTimer);
  }

  this.heartbeatTimer = setInterval(() => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'ping' });
    }
  }, this.config.heartbeatInterval);
}

// Server-side response
@SubscribeMessage('ping')
handlePing(@ConnectedSocket() client: Socket): void {
  client.emit('pong', { timestamp: Date.now() });

  // Update last activity
  this.sessionManager.updateActivity(client.id);
}
```

## Offline Message Queuing

### Queue and Sync Pattern

Store messages when offline, sync when reconnected:

```typescript
class OfflineMessageQueue {
  private queue: QueuedMessage[] = [];
  private isOnline = false;

  constructor(private ws: WebSocketService) {
    this.ws.onConnectionStatus(status => {
      this.isOnline = status === 'CONNECTED';
      if (this.isOnline) {
        this.syncQueue();
      }
    });
  }

  async sendMessage(message: SendMessageDto): Promise<void> {
    if (this.isOnline) {
      // Send immediately if online
      this.ws.emit('chat:send:message', message);
    } else {
      // Queue if offline
      this.queue.push({
        id: uuidv4(),
        type: 'chat:send:message',
        data: message,
        timestamp: new Date(),
        retryCount: 0
      });

      await this.persistQueue(); // Save to AsyncStorage
    }
  }

  private async syncQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    logger.info(`Syncing ${this.queue.length} queued messages`);

    // Sort by timestamp (oldest first)
    const sortedQueue = [...this.queue].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (const item of sortedQueue) {
      try {
        this.ws.emit(item.type, item.data);

        // Wait for confirmation
        await this.waitForConfirmation(item.id, 5000);

        // Remove from queue on success
        this.queue = this.queue.filter(q => q.id !== item.id);
      } catch (error) {
        logger.error(`Failed to sync queued message ${item.id}:`, error);

        item.retryCount++;

        // Remove if max retries exceeded
        if (item.retryCount >= 3) {
          this.queue = this.queue.filter(q => q.id !== item.id);
          logger.error(`Dropped message ${item.id} after max retries`);
        }
      }
    }

    await this.persistQueue();
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'offline_message_queue',
        JSON.stringify(this.queue)
      );
    } catch (error) {
      logger.error('Failed to persist message queue:', error);
    }
  }
}
```

## Rate Limiting and Throttling

### Client-Side Throttling

Prevent flooding server with events:

```typescript
import { throttle } from 'lodash';

class ChatService {
  private ws: WebSocketService;

  // Throttle typing indicators to max once per second
  private emitTypingStart = throttle(
    () => {
      this.ws.emit('chat:start:typing', {
        chatId: this.currentChatId,
        userId: this.userId
      });
    },
    1000,
    { leading: true, trailing: false }
  );

  handleUserTyping(): void {
    this.emitTypingStart();
  }

  // Debounce typing stop to avoid rapid on/off
  private emitTypingStop = debounce(() => {
    this.ws.emit('chat:stop:typing', {
      chatId: this.currentChatId,
      userId: this.userId
    });
  }, 2000);

  handleUserStoppedTyping(): void {
    this.emitTypingStop();
  }
}
```

### Server-Side Rate Limiting

Prevent abuse with rate limiting:

```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

export class RateLimitGuard implements CanActivate {
  private rateLimiter = new RateLimiterMemory({
    points: 10, // Number of requests
    duration: 1, // Per second
  });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const userId = client.handshake.query.userId as string;

    try {
      await this.rateLimiter.consume(userId);
      return true;
    } catch (error) {
      client.emit('error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down.'
      });
      return false;
    }
  }
}

@UseGuards(RateLimitGuard)
@SubscribeMessage('chat:send:message')
async handleSendMessage(
  @MessageBody() data: SendMessageDto,
  @ConnectedSocket() client: Socket
): Promise<void> {
  // Handle message
}
```

## Validation Checklist

**Connection Management:**

- [ ] Connection established with proper authentication
- [ ] Clean disconnection with resource cleanup
- [ ] All timers cleared on disconnect
- [ ] WebSocket event handlers removed on cleanup
- [ ] Connection state tracked accurately
- [ ] Reconnection logic uses exponential backoff with jitter
- [ ] Maximum reconnection attempts enforced
- [ ] Heartbeat/ping-pong implemented to keep connection alive

**Event Naming:**

- [ ] Events follow module:action:target pattern
- [ ] Event names use kebab-case
- [ ] Server events use past tense (received, completed, failed)
- [ ] Client requests use action verbs (send, mark, update)
- [ ] Event names are descriptive and consistent
- [ ] Constants defined for all event names
- [ ] No hardcoded event strings in code

**Room/Channel Patterns:**

- [ ] Users join rooms with proper authorization
- [ ] Room names follow consistent pattern (chat:${chatId})
- [ ] Users leave rooms on disconnect
- [ ] Broadcasts target correct rooms
- [ ] Broadcasts exclude sender when appropriate
- [ ] Session manager tracks room membership

**State Synchronization:**

- [ ] Optimistic updates implemented for UI responsiveness
- [ ] Rollback logic handles sync failures
- [ ] Server confirmations awaited with timeout
- [ ] State conflicts resolved consistently
- [ ] UI reflects latest server state after sync

**Error Recovery:**

- [ ] Reconnection attempts on unexpected disconnect
- [ ] Exponential backoff prevents server overload
- [ ] Jitter added to prevent thundering herd
- [ ] Max attempts limit prevents infinite loops
- [ ] Connection status communicated to UI
- [ ] Clean disconnect (code 1000) does not reconnect

**Offline Queuing:**

- [ ] Messages queued when offline
- [ ] Queue persisted to local storage
- [ ] Queue synced on reconnection
- [ ] Queue items have retry limits
- [ ] Failed items eventually dropped
- [ ] Queue synced in chronological order

**Rate Limiting:**

- [ ] Client-side throttling for high-frequency events
- [ ] Server-side rate limiting prevents abuse
- [ ] Rate limit errors communicated to client
- [ ] Different limits for different event types
- [ ] User-specific rate limits enforced

## Anti-Patterns to Avoid

**NEVER:**

- ❌ Use hardcoded event names without constants
- ❌ Mix naming conventions (camelCase, snake_case, kebab-case)
- ❌ Forget to clean up timers and event handlers on disconnect
- ❌ Implement reconnection without exponential backoff
- ❌ Allow unlimited reconnection attempts
- ❌ Send high-frequency events without throttling (typing indicators)
- ❌ Skip server-side rate limiting
- ❌ Ignore WebSocket close codes (1000 = clean disconnect)
- ❌ Broadcast to all clients when room broadcasting is more efficient
- ❌ Synchronously update UI before server confirmation
- ❌ Skip offline message queuing for critical events
- ❌ Use present tense for server-emitted events (use past tense)

**ALWAYS:**

- ✅ Use module:action:target event naming pattern
- ✅ Clean up all resources on disconnect
- ✅ Implement exponential backoff with jitter for reconnection
- ✅ Set maximum reconnection attempts
- ✅ Use heartbeat/ping-pong to detect dead connections
- ✅ Throttle high-frequency client events
- ✅ Implement server-side rate limiting
- ✅ Use rooms for efficient broadcasting
- ✅ Validate user access before joining rooms
- ✅ Handle offline scenarios with message queuing
- ✅ Implement optimistic updates with rollback
- ✅ Communicate connection status to UI

## Resources

### references/

**websocket-patterns.md** - WebSocket architecture patterns, connection management, and real-time communication best practices for the Goji system

**socket-io-guide.md** - Socket.IO specific patterns, room management, and event handling for NestJS gateways

**offline-sync-strategy.md** - Offline message queuing, sync strategies, and conflict resolution patterns

## Success Criteria

WebSocket implementation is well-designed when:

1. Connection management handles all lifecycle events properly
2. Event naming follows consistent module:action:target pattern
3. Reconnection logic uses exponential backoff with jitter
4. Room/channel patterns enable efficient broadcasting
5. State synchronization uses optimistic updates with rollback
6. Offline message queuing ensures no data loss
7. Rate limiting prevents client and server abuse
8. All resources cleaned up on disconnect
9. Heartbeat mechanism detects dead connections
10. Connection status communicated to user interface

Refer to references for detailed patterns and examples.
