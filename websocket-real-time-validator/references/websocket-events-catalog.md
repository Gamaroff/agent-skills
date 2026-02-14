# WebSocket Event Synchronization Catalog

**Document Type**: API Specification - Real-Time Events
**Last Updated**: 2025-10-11
**Status**: ✅ Ready for Implementation
**Purpose**: Define all WebSocket events for group system real-time synchronization
**Priority**: 🔥 **HIGH** - Required for Epic 1 Story 1.2

---

## Overview

### Purpose of Real-Time Events

The Group System uses WebSocket events to provide real-time synchronization of group changes across all connected clients. This ensures that when one user performs an action (creates group, adds member, sends message), all other users see the update immediately without polling.

### Event Architecture

**Connection Model**: Persistent WebSocket connection per client

- **Protocol**: Socket.IO 4.8
- **Transport**: WebSocket with HTTP long-polling fallback
- **Authentication**: JWT token in connection handshake
- **Namespace**: `/groups` (dedicated namespace for group events)

**Event Flow**:

```
Client A performs action
    ↓
Backend validates and updates database
    ↓
Backend emits WebSocket event
    ↓
All connected clients receive event
    ↓
Clients update local state
```

### Client Connection Requirements

**Connection Setup**:

```typescript
import io from 'socket.io-client';

// Connect to groups namespace
const socket = io('ws://api.goji.com/groups', {
  auth: {
    token: userJwtToken // JWT token for authentication
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to groups namespace');
});

socket.on('disconnect', () => {
  console.log('Disconnected from groups namespace');
});

socket.on('error', error => {
  console.error('WebSocket error:', error);
});
```

---

## Event Categories

The Group System emits 15 core event types organized into 5 categories:

1. **Group Lifecycle Events** (3 events) - Creation, updates, deletion
2. **Membership Events** (4 events) - Adding, removing, role changes
3. **Capability Events** (3 events) - Capability additions, removals, config changes
4. **Message Events** (3 events) - New messages, edits, deletions
5. **Presence Events** (2 events) - Typing indicators, online status

---

## Category 1: Group Lifecycle Events

### Event: `group:created`

**Trigger**: New group created by any user

**Emitted To**: All initial group members (userId or contactId)

**Payload**:

```typescript
interface GroupCreatedEvent {
  eventType: 'group:created';
  timestamp: string; // ISO 8601 format
  groupId: string;
  group: {
    id: string;
    type: 'private_chat' | 'savings' | 'betting' | 'public' | 'poker'; // One of 5 valid types
    name?: string; // Optional for private groups
    description?: string;
    avatarUrl?: string;
    visibility: 'private' | 'public'; // Discoverability setting
    capabilities: string[]; // ['chat', 'payments', 'savings', etc.]
    memberCount: number;
    createdAt: string;
    // Type-specific configs (if applicable)
    savingsCircleConfig?: GroupSavingsCircleConfig;
    bettingPoolConfig?: GroupBettingPoolConfig;
    creatorCommunityConfig?: GroupCreatorCommunityConfig;
    pokerPlaceConfig?: GroupPokerPlaceConfig;
  };
  createdBy: string; // userId of creator
  members: GroupMember[]; // Initial member list
}

interface GroupMember {
  id: string;
  groupId: string;
  userId?: string; // User member
  contactId?: string; // Contact member (payment routing)
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  permissions: string[]; // ['chat', 'send_payment', 'add_member', etc.]
  joinedAt: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:created",
  "timestamp": "2025-10-11T10:30:00.000Z",
  "groupId": "grp_abc123",
  "group": {
    "id": "grp_abc123",
    "type": "private",
    "visibility": "private",
    "capabilities": ["chat", "payments"],
    "memberCount": 2,
    "createdAt": "2025-10-11T10:30:00.000Z"
  },
  "createdBy": "user_xyz789",
  "members": [
    {
      "id": "mem_001",
      "groupId": "grp_abc123",
      "userId": "user_xyz789",
      "role": "OWNER",
      "permissions": ["chat", "add_member", "send_payment"],
      "joinedAt": "2025-10-11T10:30:00.000Z"
    },
    {
      "id": "mem_002",
      "groupId": "grp_abc123",
      "userId": "user_def456",
      "role": "MEMBER",
      "permissions": ["chat", "send_payment"],
      "joinedAt": "2025-10-11T10:30:00.000Z"
    }
  ]
}
```

**Client Handling**:

```typescript
socket.on('group:created', (event: GroupCreatedEvent) => {
  // Add group to local state
  const newGroup = event.group;
  dispatch(addGroupToList(newGroup));

  // Show notification based on group type
  if (event.group.type === 'public') {
    showNotification(`You've been added to ${event.group.name}`);
  } else if (event.group.type === 'savings') {
    showNotification(`New savings circle: ${event.group.name}`);
  } else {
    // Private Chat - show new conversation notification
    const otherMember = event.members.find(m => m.userId !== currentUserId);
    showNotification(`New conversation with ${otherMember?.name}`);
  }

  // Navigate to group if user initiated creation
  if (event.createdBy === currentUserId) {
    navigation.navigate('Chat', { groupId: event.groupId });
  }
});
```

---

### Event: `group:updated`

**Trigger**: Group settings changed (name, description, avatar, visibility)

**Emitted To**: All group members

**Payload**:

```typescript
interface GroupUpdatedEvent {
  eventType: 'group:updated';
  timestamp: string;
  groupId: string;
  updatedBy: string; // userId who made the change
  changes: {
    field: string; // Field that changed
    oldValue: any; // Previous value
    newValue: any; // New value
  }[];
  group: Group; // Updated group object
}
```

**Example Payload**:

```json
{
  "eventType": "group:updated",
  "timestamp": "2025-10-11T10:35:00.000Z",
  "groupId": "grp_abc123",
  "updatedBy": "user_xyz789",
  "changes": [
    {
      "field": "name",
      "oldValue": null,
      "newValue": "Family Chat"
    },
    {
      "field": "avatarUrl",
      "oldValue": null,
      "newValue": "https://cdn.goji.com/avatars/abc123.jpg"
    }
  ],
  "group": {
    "id": "grp_abc123",
    "type": "private",
    "name": "Family Chat",
    "avatarUrl": "https://cdn.goji.com/avatars/abc123.jpg",
    "visibility": "private",
    "capabilities": ["chat", "payments"],
    "memberCount": 2
  }
}
```

**Client Handling**:

```typescript
socket.on('group:updated', (event: GroupUpdatedEvent) => {
  // Update group in local state
  dispatch(updateGroup(event.groupId, event.group));

  // Show notification for significant changes
  const significantFields = ['name', 'type', 'visibility'];
  const hasSignificantChange = event.changes.some(c =>
    significantFields.includes(c.field)
  );

  if (hasSignificantChange && event.updatedBy !== currentUserId) {
    const updaterName = getMemberName(event.updatedBy);
    showNotification(`${updaterName} updated ${event.group.name}`);
  }

  // Refresh group detail screen if currently viewing this group
  if (currentRoute.params.groupId === event.groupId) {
    refreshGroupDetails();
  }
});
```

---

### Event: `group:deleted`

**Trigger**: Group archived or deleted

**Emitted To**: All group members

**Payload**:

```typescript
interface GroupDeletedEvent {
  eventType: 'group:deleted';
  timestamp: string;
  groupId: string;
  deletedBy: string; // userId who deleted the group
  reason?: string; // Optional deletion reason
  groupName: string; // Group name for notification
}
```

**Example Payload**:

```json
{
  "eventType": "group:deleted",
  "timestamp": "2025-10-11T10:40:00.000Z",
  "groupId": "grp_abc123",
  "deletedBy": "user_xyz789",
  "reason": "Group no longer needed",
  "groupName": "Family Chat"
}
```

**Client Handling**:

```typescript
socket.on('group:deleted', (event: GroupDeletedEvent) => {
  // Remove group from local state
  dispatch(removeGroupFromList(event.groupId));

  // Show notification
  if (event.deletedBy !== currentUserId) {
    showNotification(`${event.groupName} has been deleted`);
  }

  // Navigate away if currently viewing this group
  if (currentRoute.params.groupId === event.groupId) {
    navigation.navigate('Home');
  }

  // Clear any cached messages for this group
  clearGroupMessagesCache(event.groupId);
});
```

---

## Category 2: Membership Events

### Event: `group:member:added`

**Trigger**: New member added to group

**Emitted To**: All existing members + new member

**Payload**:

```typescript
interface MemberAddedEvent {
  eventType: 'group:member:added';
  timestamp: string;
  groupId: string;
  member: GroupMember; // New member details
  addedBy: string; // userId who added the member
  groupName: string; // For notification
}
```

**Example Payload**:

```json
{
  "eventType": "group:member:added",
  "timestamp": "2025-10-11T10:45:00.000Z",
  "groupId": "grp_abc123",
  "member": {
    "id": "mem_003",
    "groupId": "grp_abc123",
    "userId": "user_ghi789",
    "role": "MEMBER",
    "permissions": ["chat", "send_payment"],
    "joinedAt": "2025-10-11T10:45:00.000Z"
  },
  "addedBy": "user_xyz789",
  "groupName": "Family Chat"
}
```

**Client Handling**:

```typescript
socket.on('group:member:added', (event: MemberAddedEvent) => {
  // Update group member count
  dispatch(incrementGroupMemberCount(event.groupId));

  // Add member to group members list
  dispatch(addGroupMember(event.groupId, event.member));

  // Show notification based on recipient
  if (event.member.userId === currentUserId) {
    // Current user was added to group
    showNotification(`You've been added to ${event.groupName}`);

    // Add group to user's group list
    dispatch(fetchGroupDetails(event.groupId));
  } else {
    // Someone else was added
    const memberName = getMemberName(event.member.userId);
    const adderName = getMemberName(event.addedBy);
    showNotification(`${adderName} added ${memberName} to ${event.groupName}`);
  }

  // Refresh member list if viewing group
  if (
    currentRoute.name === 'GroupMembers' &&
    currentRoute.params.groupId === event.groupId
  ) {
    refreshMemberList();
  }
});
```

---

### Event: `group:member:removed`

**Trigger**: Member removed from group (kicked or left)

**Emitted To**: All remaining members + removed member

**Payload**:

```typescript
interface MemberRemovedEvent {
  eventType: 'group:member:removed';
  timestamp: string;
  groupId: string;
  memberId: string; // GroupMember.id
  userId?: string; // User who was removed
  removedBy: string; // userId who removed the member
  reason: 'kicked' | 'left' | 'banned';
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:member:removed",
  "timestamp": "2025-10-11T10:50:00.000Z",
  "groupId": "grp_abc123",
  "memberId": "mem_003",
  "userId": "user_ghi789",
  "removedBy": "user_xyz789",
  "reason": "kicked",
  "groupName": "Family Chat"
}
```

**Client Handling**:

```typescript
socket.on('group:member:removed', (event: MemberRemovedEvent) => {
  if (event.userId === currentUserId) {
    // Current user was removed
    dispatch(removeGroupFromList(event.groupId));

    // Show notification
    if (event.reason === 'kicked') {
      showNotification(`You've been removed from ${event.groupName}`);
    } else if (event.reason === 'banned') {
      showNotification(`You've been banned from ${event.groupName}`);
    }

    // Navigate away if currently viewing this group
    if (currentRoute.params.groupId === event.groupId) {
      navigation.navigate('Home');
    }
  } else {
    // Someone else was removed
    dispatch(decrementGroupMemberCount(event.groupId));
    dispatch(removeGroupMember(event.groupId, event.memberId));

    // Show notification
    const memberName = getMemberName(event.userId);
    if (event.reason === 'left') {
      showNotification(`${memberName} left ${event.groupName}`);
    } else {
      showNotification(`${memberName} was removed from ${event.groupName}`);
    }

    // Refresh member list if viewing
    if (
      currentRoute.name === 'GroupMembers' &&
      currentRoute.params.groupId === event.groupId
    ) {
      refreshMemberList();
    }
  }
});
```

---

### Event: `group:member:role_updated`

**Trigger**: Member role or permissions changed

**Emitted To**: All group members

**Payload**:

```typescript
interface MemberRoleUpdatedEvent {
  eventType: 'group:member:role_updated';
  timestamp: string;
  groupId: string;
  memberId: string;
  userId: string;
  updatedBy: string;
  changes: {
    oldRole: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
    newRole: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
    oldPermissions: string[];
    newPermissions: string[];
  };
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:member:role_updated",
  "timestamp": "2025-10-11T10:55:00.000Z",
  "groupId": "grp_abc123",
  "memberId": "mem_002",
  "userId": "user_def456",
  "updatedBy": "user_xyz789",
  "changes": {
    "oldRole": "MEMBER",
    "newRole": "ADMIN",
    "oldPermissions": ["chat", "send_payment"],
    "newPermissions": ["chat", "send_payment", "add_member", "remove_member"]
  },
  "groupName": "Family Chat"
}
```

**Client Handling**:

```typescript
socket.on('group:member:role_updated', (event: MemberRoleUpdatedEvent) => {
  // Update member role in local state
  dispatch(
    updateMemberRole(event.groupId, event.memberId, {
      role: event.changes.newRole,
      permissions: event.changes.newPermissions
    })
  );

  // Show notification
  if (event.userId === currentUserId) {
    // Current user's role changed
    const roleNames = {
      OWNER: 'Owner',
      ADMIN: 'Admin',
      MODERATOR: 'Moderator',
      MEMBER: 'Member'
    };
    showNotification(
      `You're now ${roleNames[event.changes.newRole]} of ${event.groupName}`
    );

    // Refresh permissions if viewing group
    refreshUserPermissions(event.groupId);
  } else {
    // Someone else's role changed
    const memberName = getMemberName(event.userId);
    showNotification(
      `${memberName} is now ${event.changes.newRole} in ${event.groupName}`
    );
  }

  // Refresh member list if viewing
  if (
    currentRoute.name === 'GroupMembers' &&
    currentRoute.params.groupId === event.groupId
  ) {
    refreshMemberList();
  }
});
```

---

### Event: `group:member:joined`

**Trigger**: Member accepts invitation and joins group (for public groups)

**Emitted To**: All group members

**Payload**:

```typescript
interface MemberJoinedEvent {
  eventType: 'group:member:joined';
  timestamp: string;
  groupId: string;
  member: GroupMember;
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:member:joined",
  "timestamp": "2025-10-11T11:00:00.000Z",
  "groupId": "grp_public123",
  "member": {
    "id": "mem_004",
    "groupId": "grp_public123",
    "userId": "user_jkl012",
    "role": "MEMBER",
    "permissions": ["chat"],
    "joinedAt": "2025-10-11T11:00:00.000Z"
  },
  "groupName": "Crypto Enthusiasts"
}
```

**Client Handling**:

```typescript
socket.on('group:member:joined', (event: MemberJoinedEvent) => {
  // Update group member count
  dispatch(incrementGroupMemberCount(event.groupId));

  // Add member to group members list
  dispatch(addGroupMember(event.groupId, event.member));

  // Show notification
  const memberName = getMemberName(event.member.userId);
  showNotification(`${memberName} joined ${event.groupName}`);

  // Refresh member list if viewing
  if (
    currentRoute.name === 'GroupMembers' &&
    currentRoute.params.groupId === event.groupId
  ) {
    refreshMemberList();
  }
});
```

---

## Category 3: Capability Events

### Event: `group:capability:added`

**Trigger**: New capability enabled for group (e.g., adding savings to existing chat)

**Emitted To**: All group members

**Payload**:

```typescript
interface CapabilityAddedEvent {
  eventType: 'group:capability:added';
  timestamp: string;
  groupId: string;
  capability: string; // Capability name (e.g., 'savings', 'betting')
  addedBy: string;
  config?: any; // Capability-specific configuration
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:capability:added",
  "timestamp": "2025-10-11T11:05:00.000Z",
  "groupId": "grp_abc123",
  "capability": "savings",
  "addedBy": "user_xyz789",
  "config": {
    "goal": 5000,
    "contributionAmount": 100,
    "frequency": "weekly",
    "startDate": "2025-10-15"
  },
  "groupName": "Family Chat"
}
```

**Client Handling**:

```typescript
socket.on('group:capability:added', (event: CapabilityAddedEvent) => {
  // Update group capabilities in local state
  dispatch(addGroupCapability(event.groupId, event.capability, event.config));

  // Show notification
  const capabilityNames = {
    savings: 'Savings Circle',
    betting: 'Betting Pool',
    monetization: 'Monetized Content',
    commerce: 'Shopping Together'
  };

  showNotification(
    `${capabilityNames[event.capability]} enabled in ${event.groupName}`
  );

  // Show capability-specific setup screen if current user enabled it
  if (event.addedBy === currentUserId) {
    if (event.capability === 'savings') {
      navigation.navigate('SavingsSetup', { groupId: event.groupId });
    } else if (event.capability === 'betting') {
      navigation.navigate('BettingSetup', { groupId: event.groupId });
    }
  }

  // Refresh group detail screen if viewing
  if (currentRoute.params.groupId === event.groupId) {
    refreshGroupDetails();
  }
});
```

---

### Event: `group:capability:removed`

**Trigger**: Capability disabled for group

**Emitted To**: All group members

**Payload**:

```typescript
interface CapabilityRemovedEvent {
  eventType: 'group:capability:removed';
  timestamp: string;
  groupId: string;
  capability: string;
  removedBy: string;
  reason?: string;
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:capability:removed",
  "timestamp": "2025-10-11T11:10:00.000Z",
  "groupId": "grp_abc123",
  "capability": "betting",
  "removedBy": "user_xyz789",
  "reason": "Betting pool closed",
  "groupName": "Family Chat"
}
```

**Client Handling**:

```typescript
socket.on('group:capability:removed', (event: CapabilityRemovedEvent) => {
  // Remove capability from local state
  dispatch(removeGroupCapability(event.groupId, event.capability));

  // Show notification
  const capabilityNames = {
    savings: 'Savings Circle',
    betting: 'Betting Pool',
    monetization: 'Monetized Content'
  };

  showNotification(
    `${capabilityNames[event.capability]} disabled in ${event.groupName}`
  );

  // Navigate away if currently viewing capability-specific screen
  if (
    currentRoute.name.includes(
      event.capability.charAt(0).toUpperCase() + event.capability.slice(1)
    ) &&
    currentRoute.params.groupId === event.groupId
  ) {
    navigation.navigate('Chat', { groupId: event.groupId });
  }

  // Refresh group detail screen if viewing
  if (currentRoute.params.groupId === event.groupId) {
    refreshGroupDetails();
  }
});
```

---

### Event: `group:settings:updated`

**Trigger**: Capability-specific settings changed (savings config, betting rules, etc.)

**Emitted To**: All group members

**Payload**:

```typescript
interface SettingsUpdatedEvent {
  eventType: 'group:settings:updated';
  timestamp: string;
  groupId: string;
  capability: string; // Which capability's settings changed
  updatedBy: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  config: any; // Complete updated config
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:settings:updated",
  "timestamp": "2025-10-11T11:15:00.000Z",
  "groupId": "grp_abc123",
  "capability": "savings",
  "updatedBy": "user_xyz789",
  "changes": [
    {
      "field": "goal",
      "oldValue": 5000,
      "newValue": 7500
    }
  ],
  "config": {
    "goal": 7500,
    "contributionAmount": 100,
    "frequency": "weekly",
    "startDate": "2025-10-15"
  },
  "groupName": "Family Chat"
}
```

**Client Handling**:

```typescript
socket.on('group:settings:updated', (event: SettingsUpdatedEvent) => {
  // Update capability config in local state
  dispatch(
    updateCapabilityConfig(event.groupId, event.capability, event.config)
  );

  // Show notification for significant changes
  const significantFields = ['goal', 'contributionAmount', 'bettingDeadline'];
  const hasSignificantChange = event.changes.some(c =>
    significantFields.includes(c.field)
  );

  if (hasSignificantChange) {
    const updaterName = getMemberName(event.updatedBy);
    showNotification(
      `${updaterName} updated ${event.capability} settings in ${event.groupName}`
    );
  }

  // Refresh capability screen if viewing
  if (
    currentRoute.name === `${event.capability}Details` &&
    currentRoute.params.groupId === event.groupId
  ) {
    refreshCapabilitySettings();
  }
});
```

---

## Category 4: Message Events

### Event: `group:message:new`

**Trigger**: New message sent to group

**Emitted To**: All group members (except sender)

**Payload**:

```typescript
interface MessageNewEvent {
  eventType: 'group:message:new';
  timestamp: string;
  groupId: string;
  message: {
    id: string;
    groupId: string;
    senderId: string;
    senderName: string;
    content: string;
    contentType:
      | 'text'
      | 'image'
      | 'video'
      | 'audio'
      | 'file'
      | 'payment'
      | 'location';
    metadata?: any; // Content-type-specific metadata
    createdAt: string;

    // Payment-specific fields (if contentType === 'payment')
    paymentId?: string;
    paymentAmount?: number;
    paymentCurrency?: string;

    // Capability-specific fields
    savingsContribution?: number;
    bettingPrediction?: any;
  };
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:message:new",
  "timestamp": "2025-10-11T11:20:00.000Z",
  "groupId": "grp_abc123",
  "message": {
    "id": "msg_xyz789",
    "groupId": "grp_abc123",
    "senderId": "user_def456",
    "senderName": "Alice Smith",
    "content": "Hey everyone! Just sent this week's contribution.",
    "contentType": "text",
    "createdAt": "2025-10-11T11:20:00.000Z",
    "savingsContribution": 100
  },
  "groupName": "Family Vacation Fund"
}
```

**Client Handling**:

```typescript
socket.on('group:message:new', (event: MessageNewEvent) => {
  // Add message to local state
  dispatch(addMessage(event.groupId, event.message));

  // Update group's last message and timestamp
  dispatch(
    updateGroupLastMessage(event.groupId, {
      lastMessage: event.message.content,
      lastMessageAt: event.message.createdAt
    })
  );

  // Show notification if not currently viewing this group
  if (
    currentRoute.name !== 'Chat' ||
    currentRoute.params.groupId !== event.groupId
  ) {
    // Increment unread count
    dispatch(incrementUnreadCount(event.groupId));

    // Show push notification
    showNotification(
      `${event.message.senderName} in ${event.groupName}`,
      event.message.content
    );
  } else {
    // Currently viewing the group - mark as read immediately
    markMessageAsRead(event.message.id);
  }

  // Play notification sound
  playMessageSound();

  // Scroll to bottom if at bottom of chat
  if (isAtBottomOfChat()) {
    scrollToBottom();
  }
});
```

---

### Event: `group:message:updated`

**Trigger**: Message edited by sender

**Emitted To**: All group members

**Payload**:

```typescript
interface MessageUpdatedEvent {
  eventType: 'group:message:updated';
  timestamp: string;
  groupId: string;
  messageId: string;
  updatedBy: string;
  changes: {
    oldContent: string;
    newContent: string;
  };
  message: GroupMessage; // Complete updated message
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:message:updated",
  "timestamp": "2025-10-11T11:25:00.000Z",
  "groupId": "grp_abc123",
  "messageId": "msg_xyz789",
  "updatedBy": "user_def456",
  "changes": {
    "oldContent": "Hey everyone! Just sent this week's contribution.",
    "newContent": "Hey everyone! Just sent this month's contribution."
  },
  "message": {
    "id": "msg_xyz789",
    "groupId": "grp_abc123",
    "senderId": "user_def456",
    "content": "Hey everyone! Just sent this month's contribution.",
    "contentType": "text",
    "createdAt": "2025-10-11T11:20:00.000Z",
    "updatedAt": "2025-10-11T11:25:00.000Z",
    "edited": true
  },
  "groupName": "Family Vacation Fund"
}
```

**Client Handling**:

```typescript
socket.on('group:message:updated', (event: MessageUpdatedEvent) => {
  // Update message in local state
  dispatch(updateMessage(event.groupId, event.messageId, event.message));

  // Update UI if currently viewing this chat
  if (
    currentRoute.name === 'Chat' &&
    currentRoute.params.groupId === event.groupId
  ) {
    refreshMessage(event.messageId);
  }

  // Show notification if current user didn't make the edit
  if (event.updatedBy !== currentUserId) {
    const senderName = getMemberName(event.updatedBy);
    showNotification(`${senderName} edited a message in ${event.groupName}`);
  }
});
```

---

### Event: `group:message:deleted`

**Trigger**: Message deleted by sender or admin

**Emitted To**: All group members

**Payload**:

```typescript
interface MessageDeletedEvent {
  eventType: 'group:message:deleted';
  timestamp: string;
  groupId: string;
  messageId: string;
  deletedBy: string;
  reason?: 'sender_deleted' | 'admin_deleted' | 'moderation';
  groupName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:message:deleted",
  "timestamp": "2025-10-11T11:30:00.000Z",
  "groupId": "grp_abc123",
  "messageId": "msg_xyz789",
  "deletedBy": "user_def456",
  "reason": "sender_deleted",
  "groupName": "Family Vacation Fund"
}
```

**Client Handling**:

```typescript
socket.on('group:message:deleted', (event: MessageDeletedEvent) => {
  // Remove message from local state
  dispatch(removeMessage(event.groupId, event.messageId));

  // Update UI if currently viewing this chat
  if (
    currentRoute.name === 'Chat' &&
    currentRoute.params.groupId === event.groupId
  ) {
    removeMessageFromUI(event.messageId);
  }

  // Show notification if message was deleted by moderator
  if (event.reason === 'admin_deleted' || event.reason === 'moderation') {
    showNotification(`A message was removed from ${event.groupName}`);
  }
});
```

---

## Category 5: Presence Events

### Event: `group:typing:start`

**Trigger**: User starts typing in group chat

**Emitted To**: All other group members in the same chat

**Payload**:

```typescript
interface TypingStartEvent {
  eventType: 'group:typing:start';
  timestamp: string;
  groupId: string;
  userId: string;
  userName: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:typing:start",
  "timestamp": "2025-10-11T11:35:00.000Z",
  "groupId": "grp_abc123",
  "userId": "user_def456",
  "userName": "Alice Smith"
}
```

**Client Handling**:

```typescript
socket.on('group:typing:start', (event: TypingStartEvent) => {
  // Only show if currently viewing this chat
  if (
    currentRoute.name === 'Chat' &&
    currentRoute.params.groupId === event.groupId
  ) {
    // Add user to typing indicator list
    dispatch(addTypingUser(event.groupId, event.userId, event.userName));

    // Show typing indicator
    showTypingIndicator(event.userName);

    // Set timeout to remove typing indicator (5 seconds)
    setTimeout(() => {
      dispatch(removeTypingUser(event.groupId, event.userId));
      hideTypingIndicator(event.userName);
    }, 5000);
  }
});
```

---

### Event: `group:typing:stop`

**Trigger**: User stops typing (sent message or stopped typing)

**Emitted To**: All other group members in the same chat

**Payload**:

```typescript
interface TypingStopEvent {
  eventType: 'group:typing:stop';
  timestamp: string;
  groupId: string;
  userId: string;
}
```

**Example Payload**:

```json
{
  "eventType": "group:typing:stop",
  "timestamp": "2025-10-11T11:35:05.000Z",
  "groupId": "grp_abc123",
  "userId": "user_def456"
}
```

**Client Handling**:

```typescript
socket.on('group:typing:stop', (event: TypingStopEvent) => {
  // Only process if currently viewing this chat
  if (
    currentRoute.name === 'Chat' &&
    currentRoute.params.groupId === event.groupId
  ) {
    // Remove user from typing indicator list
    dispatch(removeTypingUser(event.groupId, event.userId));

    // Update typing indicator UI
    const remainingTypingUsers = getTypingUsers(event.groupId);
    if (remainingTypingUsers.length === 0) {
      hideTypingIndicator();
    }
  }
});
```

---

## Event Delivery Guarantees

### Reliability

**At-Least-Once Delivery**:

- Events may be delivered multiple times due to retries
- Clients should handle duplicate events gracefully using message IDs
- Use idempotent operations (e.g., `updateMessage(id, data)` not `appendMessage(data)`)

**Event Ordering**:

- Events for the same group are guaranteed to arrive in order
- Events across different groups may arrive out of order
- Use `timestamp` field to resolve ordering conflicts

**Retry Strategy**:

```typescript
// Server-side retry configuration
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2
};

// Client should acknowledge receipt
socket.on('group:created', event => {
  // Process event
  handleGroupCreated(event);

  // Acknowledge receipt (optional, for at-most-once semantics)
  socket.emit('event:ack', { eventId: event.id });
});
```

### Error Handling

**Connection Loss Recovery**:

```typescript
socket.on('disconnect', () => {
  console.log('Connection lost, attempting reconnect...');

  // Store last received event timestamp
  localStorage.setItem('lastEventTimestamp', lastEventTimestamp);
});

socket.on('connect', () => {
  console.log('Reconnected, fetching missed events...');

  // Request missed events since last timestamp
  const lastTimestamp = localStorage.getItem('lastEventTimestamp');
  socket.emit('events:sync', { since: lastTimestamp });
});

socket.on('events:sync:response', (missedEvents: Event[]) => {
  // Process all missed events
  missedEvents.forEach(event => processEvent(event));
});
```

**Missed Event Handling**:

```typescript
// Client-side event queue for offline handling
class EventQueue {
  private queue: Event[] = [];

  addEvent(event: Event) {
    this.queue.push(event);
    this.processQueue();
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const event = this.queue[0];
      try {
        await handleEvent(event);
        this.queue.shift(); // Remove processed event
      } catch (error) {
        console.error('Failed to process event:', error);
        break; // Stop processing on error
      }
    }
  }
}
```

**Event Replay Mechanism**:

```typescript
// Request historical events for a group
socket.emit('group:events:replay', {
  groupId: 'grp_abc123',
  since: '2025-10-11T10:00:00.000Z', // Optional timestamp
  eventTypes: ['group:message:new', 'group:member:added'] // Optional filter
});

socket.on('group:events:replay:response', (events: Event[]) => {
  console.log(`Replaying ${events.length} events`);
  events.forEach(event => processEvent(event));
});
```

---

## Client Implementation Guide

### Connection Setup

**Complete Connection Example**:

```typescript
import io, { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

class GroupWebSocketClient extends EventEmitter {
  private socket: Socket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(apiUrl: string, jwtToken: string) {
    super();

    this.socket = io(`${apiUrl}/groups`, {
      auth: {
        token: jwtToken
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to groups namespace');
      this.reconnectAttempts = 0;
      this.emit('CONNECTED');
    });

    this.socket.on('disconnect', reason => {
      console.log('❌ Disconnected:', reason);
      this.emit('DISCONNECTED', reason);
    });

    this.socket.on('error', error => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    this.socket.on('reconnect_attempt', attempt => {
      this.reconnectAttempts = attempt;
      console.log(
        `Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`
      );
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after max attempts');
      this.emit('reconnect_failed');
    });

    // Group lifecycle events
    this.socket.on('group:created', event => this.handleGroupCreated(event));
    this.socket.on('group:updated', event => this.handleGroupUpdated(event));
    this.socket.on('group:deleted', event => this.handleGroupDeleted(event));

    // Membership events
    this.socket.on('group:member:added', event =>
      this.handleMemberAdded(event)
    );
    this.socket.on('group:member:removed', event =>
      this.handleMemberRemoved(event)
    );
    this.socket.on('group:member:role_updated', event =>
      this.handleRoleUpdated(event)
    );

    // Capability events
    this.socket.on('group:capability:added', event =>
      this.handleCapabilityAdded(event)
    );
    this.socket.on('group:capability:removed', event =>
      this.handleCapabilityRemoved(event)
    );
    this.socket.on('group:settings:updated', event =>
      this.handleSettingsUpdated(event)
    );

    // Message events
    this.socket.on('group:message:new', event => this.handleMessageNew(event));
    this.socket.on('group:message:updated', event =>
      this.handleMessageUpdated(event)
    );
    this.socket.on('group:message:deleted', event =>
      this.handleMessageDeleted(event)
    );

    // Presence events
    this.socket.on('group:typing:start', event =>
      this.handleTypingStart(event)
    );
    this.socket.on('group:typing:stop', event => this.handleTypingStop(event));
  }

  // Event handlers delegate to application-specific logic
  private handleGroupCreated(event: GroupCreatedEvent) {
    this.emit('group:created', event);
  }

  // ... implement other handlers

  // Client methods for emitting events
  public startTyping(groupId: string) {
    this.socket.emit('typing:start', { groupId });
  }

  public stopTyping(groupId: string) {
    this.socket.emit('typing:stop', { groupId });
  }

  public disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const wsClient = new GroupWebSocketClient(
  process.env.EXPO_PUBLIC_WS_URL,
  userJwtToken
);

wsClient.on('group:created', event => {
  dispatch(addGroupToList(event.group));
});
```

---

### Event Subscription Patterns

**Pattern 1: Direct Subscription**:

```typescript
// Subscribe to specific events
socket.on('group:message:new', (event: MessageNewEvent) => {
  handleNewMessage(event);
});
```

**Pattern 2: Event Router**:

```typescript
// Central event router
const eventRouter = {
  'group:created': handleGroupCreated,
  'group:updated': handleGroupUpdated,
  'group:message:new': handleMessageNew
  // ... other handlers
};

// Subscribe all events
Object.entries(eventRouter).forEach(([eventType, handler]) => {
  socket.on(eventType, handler);
});
```

**Pattern 3: Redux Integration**:

```typescript
// Middleware for Redux
const websocketMiddleware = (socket: Socket) => {
  return (store: Store) => (next: Dispatch) => (action: Action) => {
    // Subscribe to events and dispatch Redux actions
    socket.on('group:created', event => {
      store.dispatch({ type: 'GROUP_CREATED', payload: event });
    });

    return next(action);
  };
};
```

---

### State Synchronization Best Practices

**1. Optimistic Updates**:

```typescript
// User creates group - update UI immediately
async function createGroup(groupData) {
  // Generate temporary ID
  const tempId = `temp_${Date.now()}`;

  // Optimistically add to state
  dispatch(
    addGroupToList({
      ...groupData,
      id: tempId,
      status: 'creating'
    })
  );

  try {
    // Make API call
    const group = await api.createGroup(groupData);

    // Replace temp with real group when created
    dispatch(replaceGroup(tempId, group));
  } catch (error) {
    // Rollback on error
    dispatch(removeGroup(tempId));
    showError('Failed to create group');
  }
}

// WebSocket event confirms creation
socket.on('group:created', event => {
  // Update with server data if exists
  if (hasGroup(event.groupId)) {
    dispatch(updateGroup(event.groupId, event.group));
  } else {
    dispatch(addGroupToList(event.group));
  }
});
```

**2. Conflict Resolution**:

```typescript
// Handle concurrent updates using timestamps
function handleGroupUpdated(event: GroupUpdatedEvent) {
  const existingGroup = getGroup(event.groupId);

  if (!existingGroup) {
    // Group doesn't exist locally - add it
    dispatch(addGroupToList(event.group));
    return;
  }

  // Compare timestamps - keep most recent
  const existingTimestamp = new Date(existingGroup.updatedAt).getTime();
  const eventTimestamp = new Date(event.timestamp).getTime();

  if (eventTimestamp > existingTimestamp) {
    // Event is newer - update local state
    dispatch(updateGroup(event.groupId, event.group));
  } else {
    // Local state is newer - ignore event (or merge carefully)
    console.log('Ignoring older update event');
  }
}
```

**3. Offline Queue**:

```typescript
// Queue events received while offline
class OfflineEventQueue {
  private queue: Event[] = [];
  private isOnline = true;

  constructor() {
    window.addEventListener('online', () => this.processQueue());
    window.addEventListener('offline', () => (this.isOnline = false));
  }

  addEvent(event: Event) {
    if (this.isOnline) {
      this.processEvent(event);
    } else {
      this.queue.push(event);
    }
  }

  async processQueue() {
    this.isOnline = true;

    // Process queued events in order
    for (const event of this.queue) {
      await this.processEvent(event);
    }

    this.queue = [];
  }

  private async processEvent(event: Event) {
    // Handle event based on type
    const handler = eventHandlers[event.eventType];
    if (handler) {
      await handler(event);
    }
  }
}
```

---

## Testing WebSocket Events

### Unit Testing Event Handlers

```typescript
import { GroupWebSocketClient } from './GroupWebSocketClient';

describe('WebSocket Event Handlers', () => {
  let wsClient: GroupWebSocketClient;
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    wsClient = new GroupWebSocketClient('ws://localhost:3001', 'test-token');
  });

  afterEach(() => {
    wsClient.disconnect();
  });

  test('should handle group:created event', () => {
    const event: GroupCreatedEvent = {
      eventType: 'group:created',
      timestamp: '2025-10-11T10:00:00Z',
      groupId: 'grp_123',
      group: {
        id: 'grp_123',
        type: 'private_chat',
        visibility: 'private',
        capabilities: ['chat'],
        memberCount: 2,
        createdAt: '2025-10-11T10:00:00Z'
      },
      createdBy: 'user_456',
      members: []
    };

    // Simulate event
    wsClient.emit('group:created', event);

    // Verify handler was called
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'GROUP_CREATED',
      payload: event
    });
  });

  test('should handle group:message:new event', () => {
    const event: MessageNewEvent = {
      eventType: 'group:message:new',
      timestamp: '2025-10-11T10:05:00Z',
      groupId: 'grp_123',
      message: {
        id: 'msg_789',
        groupId: 'grp_123',
        senderId: 'user_456',
        senderName: 'Alice',
        content: 'Hello!',
        contentType: 'text',
        createdAt: '2025-10-11T10:05:00Z'
      },
      groupName: 'Test Group'
    };

    wsClient.emit('group:message:new', event);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'MESSAGE_RECEIVED',
      payload: event
    });
  });
});
```

---

### Integration Testing

```typescript
import io from 'socket.io-client';

describe('WebSocket Integration Tests', () => {
  let clientSocket: Socket;

  beforeAll(done => {
    // Connect to test server
    clientSocket = io('ws://localhost:3001/groups', {
      auth: { token: 'test-jwt-token' }
    });

    clientSocket.on('connect', done);
  });

  afterAll(() => {
    clientSocket.disconnect();
  });

  test('should receive group:created event after creating group', done => {
    // Listen for event
    clientSocket.once('group:created', (event: GroupCreatedEvent) => {
      expect(event.eventType).toBe('group:created');
      expect(event.group.type).toBe('private');
      done();
    });

    // Trigger group creation via API
    fetch('http://localhost:3000/groups', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-jwt-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'private_chat',
        memberUserIds: ['user_123'],
        capabilities: ['chat']
      })
    });
  });

  test('should receive typing events', done => {
    clientSocket.once('group:typing:start', event => {
      expect(event.eventType).toBe('group:typing:start');
      expect(event.userId).toBe('user_456');
      done();
    });

    // Emit typing start
    clientSocket.emit('typing:start', { groupId: 'grp_123' });
  });
});
```

---

### Manual Testing Checklist

**Connection Testing**:

- [ ] Client connects successfully to WebSocket server
- [ ] JWT authentication works correctly
- [ ] Reconnection works after network interruption
- [ ] Fallback to HTTP polling when WebSocket unavailable

**Event Reception**:

- [ ] `group:created` received when group created
- [ ] `group:updated` received when group settings changed
- [ ] `group:message:new` received when message sent
- [ ] `group:member:added` received when member added
- [ ] `group:typing:start` received when user types

**Multi-Client Synchronization**:

- [ ] Create group on Client A, verify Client B receives event
- [ ] Send message on Client A, verify Client B receives it
- [ ] Add member on Client A, all clients notified
- [ ] Update group on Client A, all clients see changes

**Error Scenarios**:

- [ ] Handle malformed event payloads gracefully
- [ ] Handle connection loss and reconnection
- [ ] Handle duplicate events (idempotency)
- [ ] Handle events for non-existent groups

---

## Performance Considerations

### Event Rate Limiting

**Typing Indicators**:

```typescript
// Throttle typing events to max 1 per second
let lastTypingEmit = 0;
const TYPING_THROTTLE = 1000; // 1 second

function emitTypingStart(groupId: string) {
  const now = Date.now();
  if (now - lastTypingEmit > TYPING_THROTTLE) {
    socket.emit('typing:start', { groupId });
    lastTypingEmit = now;
  }
}
```

**Message Events**:

- Server batches message events for high-traffic groups
- Max 10 messages per event batch
- Batch interval: 100ms

**Presence Events**:

- Typing indicators expire after 5 seconds
- Online status updates max every 30 seconds

### Connection Management

**Connection Pooling**:

- Reuse single WebSocket connection for all group events
- Namespace: `/groups` (dedicated namespace)
- Max connections per user: 5 (mobile + web + multiple tabs)

**Bandwidth Optimization**:

- Events compressed with gzip
- Average event size: 500 bytes
- Large payloads (images, files) sent via separate HTTP endpoints

---

## Security Considerations

### Authentication

**JWT Token Validation**:

```typescript
// Server-side authentication middleware
io.of('/groups').use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

### Authorization

**Event Filtering**:

```typescript
// Server only emits events to authorized users
async function emitGroupEvent(groupId: string, event: Event) {
  // Get group members
  const members = await getGroupMembers(groupId);

  // Emit only to group members
  members.forEach(member => {
    if (member.userId) {
      io.to(member.userId).emit(event.eventType, event);
    }
  });
}
```

### Data Validation

**Event Schema Validation**:

```typescript
// Validate all incoming events
const eventSchemas = {
  'typing:start': yup.object({
    groupId: yup.string().required()
  })
  // ... other schemas
};

socket.on('typing:start', async data => {
  try {
    await eventSchemas['typing:start'].validate(data);
    handleTypingStart(socket, data);
  } catch (err) {
    socket.emit('error', { message: 'Invalid event data' });
  }
});
```

---

## Troubleshooting

### Common Issues

**Issue 1: Events not received**

- **Check**: Is WebSocket connected? (`socket.connected`)
- **Check**: Is user a member of the group?
- **Check**: Are event listeners registered correctly?
- **Solution**: Add connection logging, verify membership

**Issue 2: Duplicate events**

- **Check**: Multiple socket connections established?
- **Check**: Event handler registered multiple times?
- **Solution**: Implement idempotency, use event IDs

**Issue 3: Events arrive out of order**

- **Check**: Events from different groups?
- **Check**: Network latency causing delays?
- **Solution**: Use timestamps, implement sequence numbers

**Issue 4: Connection keeps dropping**

- **Check**: Network stability
- **Check**: Server timeout settings
- **Solution**: Increase timeout, implement exponential backoff

### Debug Tools

**Enable Debug Logging**:

```typescript
localStorage.setItem('debug', 'socket.io-client:*');

// Or in code
import io from 'socket.io-client';
const socket = io('ws://api.goji.com/groups', {
  auth: { token: userToken }
});

socket.onAny((eventName, ...args) => {
  console.log(`[WebSocket] ${eventName}:`, args);
});
```

**Monitor Connection State**:

```typescript
setInterval(() => {
  console.log('Socket connected:', socket.connected);
  console.log('Socket ID:', socket.id);
  console.log('Transport:', socket.io.engine.transport.name);
}, 5000);
```

---

## Reference Links

### Related Documentation

- [Epic 1: Core Group Communication Infrastructure](../epics/epic.1.core-group-messaging-infrastructure.md) - WebSocket integration context
- [Story 1.2: Group Creation Integration](../stories/story.1.2.group-creation-integration.md) - Implementation story
- [GROUP-TYPES.md](../GROUP-TYPES.md) - Group type architecture
- [Migration Plan](../migrations/chat-to-groups-migration-plan.md) - Database migration for groups

### Technical References

- [Socket.IO Documentation](https://socket.io/docs/v4/) - Official Socket.IO docs
- [ChatService](../../../../../apps/goji-api/src/chat/chat.service.ts) - Existing WebSocket implementation
- [GroupsService](../../../../../apps/goji-api/src/groups/groups.service.ts) - Group business logic

### Code Examples

- Example WebSocket client: `apps/goji-wallet/services/websocket-client.ts` (to be created)
- Example event handlers: `apps/goji-wallet/hooks/useGroupEvents.ts` (to be created)

---

## Appendix: Complete Event Type Reference

| Event Type                  | Category   | Emitted To              | Payload Size | Frequency |
| --------------------------- | ---------- | ----------------------- | ------------ | --------- |
| `group:created`             | Lifecycle  | Members                 | ~800 bytes   | Low       |
| `group:updated`             | Lifecycle  | Members                 | ~600 bytes   | Low       |
| `group:deleted`             | Lifecycle  | Members                 | ~300 bytes   | Very Low  |
| `group:member:added`        | Membership | Members + New           | ~400 bytes   | Medium    |
| `group:member:removed`      | Membership | Members                 | ~300 bytes   | Low       |
| `group:member:role_updated` | Membership | Members                 | ~500 bytes   | Low       |
| `group:member:joined`       | Membership | Members                 | ~400 bytes   | Medium    |
| `group:capability:added`    | Capability | Members                 | ~600 bytes   | Low       |
| `group:capability:removed`  | Capability | Members                 | ~300 bytes   | Low       |
| `group:settings:updated`    | Capability | Members                 | ~700 bytes   | Low       |
| `group:message:new`         | Message    | Members (except sender) | ~500 bytes   | **High**  |
| `group:message:updated`     | Message    | Members                 | ~600 bytes   | Low       |
| `group:message:deleted`     | Message    | Members                 | ~200 bytes   | Low       |
| `group:typing:start`        | Presence   | Members (except sender) | ~150 bytes   | High      |
| `group:typing:stop`         | Presence   | Members (except sender) | ~150 bytes   | High      |

**Total Event Types**: 15
**Average Payload Size**: ~440 bytes
**Total Payload Size (all events)**: ~6.6 KB

---

**Document Status**: ✅ Ready for Implementation
**Last Updated**: 2025-10-11
**Version**: 1.0
**Owner**: Backend Team + Frontend Team
**Next Review**: After Epic 1 Story 1.2 implementation

**Questions?** Contact Backend Lead or post in #group-system Slack channel
