# API Design Document

## Document Information

**Project**: Goji Mobile Wallet  
**Purpose**: Define comprehensive API standards, endpoints, and data models for the Goji mobile wallet backend services
**Priority**: High
**Version**: 1.0  
**Date**: July 2025  
**Owner**: Lorien Gamaroff

## Related Documentation

-   **Technical Architecture**: See [Technical Architecture](technical-architecture.md) for system design and infrastructure decisions
-   **Database Schema**: See [Database Schema](database-schema.md) for data models supporting these APIs
-   **Product Requirements**: See [Product Requirements](../product/product-requirements.md) for feature specifications driving API design
-   **Development Workflow**: See [Development Workflow](development-workflow.md) for implementation procedures

## API Overview

### Purpose

The Goji API serves as the unified backend for both the mobile wallet application and the system admin portal, providing secure, scalable endpoints for financial transactions, user management, compliance operations, and real-time communications.

**Key Capabilities:**

-   Bitcoin SV and MNEE USD wallet operations
-   Chat-integrated payments and fund requests
-   Fiat onramping (fiat-to-crypto conversion)
-   Digital shopping and gift card purchases
-   Multi-tier KYC/AML compliance
-   Real-time transaction monitoring
-   Administrative oversight and management

### Base URL Structure

-   **Development**: `http://localhost:3000/api/v1`
-   **Staging**: `https://staging-api.goji.app/api/v1`
-   **Production**: `https://api.goji.app/api/v1`

### API Architecture

-   **Primary**: REST API with standard HTTP methods
-   **Real-time**: WebSocket connections for chat and live updates
-   **Authentication**: JWT-based authentication with role-based access control
-   **API Gateway**: Kong for routing, rate limiting, and security

## Authentication & Authorization

### Authentication Strategy

**Mobile Users:**

```typescript
interface MobileJWT {
    sub: string // User ID
    role: 'mobile_user'
    permissions: string[]
    kycLevel: 'tier1' | 'tier2' | 'tier3'
    handle: string // handle without @ prefix (e.g., 'john_nairobi')
    iat: number
    exp: number // 24 hours for access tokens
}
```

**Admin Users:**

```typescript
interface AdminJWT {
    sub: string // Admin ID
    role:
        | 'admin_super'
        | 'admin_regional'
        | 'admin_compliance'
        | 'admin_support'
    permissions: string[]
    territoryAccess?: string[]
    iat: number
    exp: number // 8 hours for admin tokens
}
```

### Authorization Levels

-   **Guest**: Public endpoints (registration, password reset)
-   **Mobile User**: Authenticated mobile app users with KYC-based limits
-   **Admin**: Administrative users with role-based permissions
-   **System**: Internal service-to-service communication

### Required Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Device-ID: <device_fingerprint>     // Mobile only
X-App-Version: <version>              // Mobile only
X-Admin-Session: <session_id>         // Admin only
```

## API Standards

### HTTP Methods

-   `GET`: Retrieve data
-   `POST`: Create new resources
-   `PUT`: Update entire resources
-   `PATCH`: Partial updates
-   `DELETE`: Remove resources

### Success Response Format

```json
{
    "success": true,
    "data": {},
    "message": "Operation completed successfully",
    "meta": {
        "timestamp": "2025-07-31T10:30:00Z",
        "version": "v1",
        "requestId": "req_123456789",
        "pagination": {
            // For paginated responses
            "page": 1,
            "limit": 20,
            "total": 150,
            "totalPages": 8,
            "hasNext": true,
            "hasPrev": false
        }
    }
}
```

### Error Response Format

```json
{
    "success": false,
    "error": {
        "code": "INSUFFICIENT_BALANCE",
        "message": "Insufficient wallet balance for this transaction",
        "details": {
            "required": "100.50",
            "available": "75.25",
            "currency": "MNEE_USD"
        },
        "field": "amount"
    },
    "meta": {
        "timestamp": "2025-07-31T10:30:00Z",
        "version": "v1",
        "requestId": "req_123456789"
    }
}
```

### Common Error Codes

```typescript
// Authentication & Authorization
AUTH_001: 'INVALID_TOKEN'
AUTH_002: 'TOKEN_EXPIRED'
AUTH_003: 'INSUFFICIENT_PERMISSIONS'
AUTH_004: 'ACCOUNT_SUSPENDED'

// Validation
VAL_001: 'INVALID_REQUEST_FORMAT'
VAL_002: 'MISSING_REQUIRED_FIELD'
VAL_003: 'INVALID_FIELD_VALUE'
VAL_004: 'FIELD_LENGTH_EXCEEDED'

// Business Logic
BIZ_001: 'INSUFFICIENT_BALANCE'
BIZ_002: 'KYC_VERIFICATION_REQUIRED'
BIZ_003: 'TRANSACTION_LIMIT_EXCEEDED'
BIZ_004: 'RECIPIENT_NOT_FOUND'
BIZ_005: 'DUPLICATE_HANDLE'

// System
SYS_001: 'INTERNAL_SERVER_ERROR'
SYS_002: 'SERVICE_UNAVAILABLE'
SYS_003: 'RATE_LIMIT_EXCEEDED'
SYS_004: 'MAINTENANCE_MODE'
```

### Status Codes

-   `200`: Success
-   `201`: Created
-   `400`: Bad Request
-   `401`: Unauthorized
-   `403`: Forbidden
-   `404`: Not Found
-   `422`: Validation Error
-   `500`: Internal Server Error

## Mobile API Endpoints

### Authentication & User Management

#### POST /mobile/auth/register

**Description**: Register new mobile user with handle-based identity

**Request Body**:

```json
{
    "email": "user@example.com",
    "phone": "+1234567890",
    "password": "SecurePass123!",
    "handle": "john_nairobi",
    "referrerHandle": "mary_kampala",
    "deviceInfo": {
        "deviceId": "device_uuid",
        "platform": "ios",
        "version": "1.0.0"
    }
}
```

**Note**: Handles are stored and transmitted WITHOUT the "@" prefix. The UI layer adds "@" for display purposes only.

**Response**:

```json
{
    "success": true,
    "data": {
        "user": {
            "id": "user_uuid",
            "email": "user@example.com",
            "handle": "john_nairobi",
            "kycLevel": "tier1",
            "isVerified": false
        },
        "tokens": {
            "accessToken": "jwt_access_token",
            "refreshToken": "jwt_refresh_token",
            "expiresIn": 86400
        },
        "wallets": [
            {
                "id": "wallet_uuid",
                "type": "BITCOIN_SV",
                "balance": "0.00000000",
                "address": "1ABC..."
            }
        ]
    }
}
```

#### POST /mobile/auth/login

**Description**: Authenticate mobile user (email, phone, or handle)

**Request Body**:

```json
{
    "identifier": "john_nairobi",
    "password": "SecurePass123!",
    "deviceInfo": {
        "deviceId": "device_uuid",
        "platform": "ios"
    }
}
```

**Note**: Can authenticate using email, phone, or handle (handle without "@" prefix).

#### POST /mobile/auth/social

**Description**: Social authentication (Google, Facebook, Apple)

**Request Body**:

```json
{
    "provider": "google",
    "token": "social_auth_token",
    "handle": "john_nairobi",
    "deviceInfo": {
        "deviceId": "device_uuid",
        "platform": "ios"
    }
}
```

**Note**: Handle is required for new users and should be provided WITHOUT the "@" prefix.

### Wallet Operations

#### GET /mobile/wallets

**Description**: Get user's wallet information
**Authorization**: Mobile User Required

**Response**:

```json
{
    "success": true,
    "data": {
        "wallets": [
            {
                "id": "wallet_bsv_uuid",
                "type": "BITCOIN_SV",
                "balance": "0.12345678",
                "address": "1ABC...",
                "isActive": true
            },
            {
                "id": "wallet_usd_uuid",
                "type": "MNEE_USD",
                "balance": "150.50",
                "address": "0x123...",
                "isActive": true
            }
        ],
        "totalValueUSD": "245.75"
    }
}
```

#### GET /mobile/wallets/:walletId/transactions

**Description**: Get wallet transaction history with pagination

**Query Parameters**:

-   `page`: Page number (default: 1)
-   `limit`: Items per page (default: 20)
-   `type`: Filter by transaction type
-   `status`: Filter by status

**Response**:

```json
{
    "success": true,
    "data": {
        "transactions": [
            {
                "id": "tx_uuid",
                "type": "SEND",
                "amount": "25.00",
                "currency": "MNEE_USD",
                "status": "CONFIRMED",
                "toAddress": "0x456...",
                "toHandle": "mary_kampala",
                "blockHeight": 12345,
                "networkFee": "0.01",
                "createdAt": "2025-07-31T10:30:00Z",
                "completedAt": "2025-07-31T10:31:30Z"
            }
        ]
    },
    "meta": {
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 50,
            "totalPages": 3
        }
    }
}
```

### Money Transfer Operations

#### POST /mobile/transactions/send

**Description**: Send money to another user by handle or address

**Request Body**:

```json
{
    "recipientHandle": "mary_kampala",
    "amount": "25.00",
    "currency": "MNEE_USD",
    "message": "Coffee money 😄",
    "walletId": "wallet_usd_uuid"
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "transactionId": "tx_uuid",
        "status": "PENDING",
        "estimatedConfirmation": "2025-07-31T10:35:00Z",
        "networkFee": "0.01",
        "recipient": {
            "handle": "mary_kampala",
            "displayName": "Mary K."
        }
    }
}
```

#### POST /mobile/transactions/request

**Description**: Request money from another user

**Request Body**:

```json
{
    "recipientHandle": "mary_kampala",
    "amount": "25.00",
    "currency": "MNEE_USD",
    "message": "Lunch split",
    "dueDate": "2025-08-07T23:59:59Z"
}
```

### User Management Endpoints

#### GET /users/profile

**Description**: Get current user profile
**Authorization**: Required

#### PUT /users/profile

**Description**: Update user profile
**Authorization**: Required

#### GET /users/:id

**Description**: Get user by ID
**Authorization**: Admin only

#### GET /users

**Description**: List users with pagination
**Authorization**: Admin only

**Query Parameters**:

-   `page`: Page number (default: 1)
-   `limit`: Items per page (default: 10, max: 100)
-   `search`: Search term
-   `sort`: Sort field
-   `order`: Sort order (asc/desc)

### [Feature Module] Endpoints

#### GET /[resource]

**Description**: [Description]
**Authorization**: [Required/Optional]

**Query Parameters**:

-   `param1`: [Description]
-   `param2`: [Description]

**Response**:

```json
{
    "success": true,
    "data": [],
    "meta": {
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 100,
            "pages": 10
        }
    }
}
```

#### GET /[resource]/:id

**Description**: [Description]

#### POST /[resource]

**Description**: [Description]

#### PUT /[resource]/:id

**Description**: [Description]

#### DELETE /[resource]/:id

**Description**: [Description]

## Data Models

### User Model

```json
{
    "id": "uuid",
    "email": "string",
    "name": "string",
    "avatar": "string|null",
    "role": "user|admin",
    "isActive": "boolean",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
}
```

### [Resource] Model

```json
{
    "id": "uuid",
    "field1": "string",
    "field2": "number",
    "field3": "boolean",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
}
```

## Validation Rules

### User Registration

-   `email`: Required, valid email format, unique
-   `password`: Required, minimum 8 characters, must contain uppercase, lowercase, number
-   `name`: Required, 2-50 characters

### [Resource] Creation

-   `field1`: Required, [validation rules]
-   `field2`: Optional, [validation rules]

## Pagination

### Request Parameters

-   `page`: Page number (default: 1)
-   `limit`: Items per page (default: 10, max: 100)

### Response Format

```json
{
    "data": [],
    "meta": {
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 100,
            "pages": 10,
            "hasNext": true,
            "hasPrev": false
        }
    }
}
```

## Filtering and Sorting

### Query Parameters

-   `filter[field]`: Filter by field value
-   `search`: Full-text search
-   `sort`: Sort field
-   `order`: Sort order (asc/desc)

### Example

```
GET /users?filter[role]=admin&search=john&sort=createdAt&order=desc
```

## Rate Limiting

### Limits

-   **Authenticated Users**: 1000 requests per hour
-   **Guest Users**: 100 requests per hour
-   **Admin Users**: 5000 requests per hour

### Headers

-   `X-RateLimit-Limit`: Request limit
-   `X-RateLimit-Remaining`: Remaining requests
-   `X-RateLimit-Reset`: Reset timestamp

## File Upload

### Endpoint: POST /upload

**Description**: Upload files
**Content-Type**: `multipart/form-data`
**Max File Size**: 10MB

**Response**:

```json
{
    "success": true,
    "data": {
        "url": "https://cdn.example.com/file.jpg",
        "filename": "file.jpg",
        "size": 1024,
        "mimeType": "image/jpeg"
    }
}
```

## WebSocket Events (if applicable)

### Connection

-   **URL**: `ws://localhost:3000/ws`
-   **Authentication**: Query parameter `?token=jwt_token`

### Events

-   `connect`: Client connected
-   `disconnect`: Client disconnected
-   `message`: Real-time message
-   `notification`: Push notification

## API Versioning

### Strategy

-   URL versioning: `/api/v1/`, `/api/v2/`
-   Backward compatibility for 2 major versions
-   Deprecation notices 6 months before removal

## Testing

### Test Categories

-   **Unit Tests**: Individual endpoint logic
-   **Integration Tests**: End-to-end API flows
-   **Load Tests**: Performance under load
-   **Security Tests**: Authentication and authorization

### Test Data

-   Use factories for consistent test data
-   Mock external services
-   Isolated test database

## Documentation

### Interactive Documentation

-   **Swagger/OpenAPI**: Available at `/api/docs`
-   **Postman Collection**: [Link to collection]

### Code Examples

-   cURL examples for each endpoint
-   SDK examples (if applicable)
-   Mobile app integration examples

---

_This document will be updated as the API evolves and new endpoints are added._
