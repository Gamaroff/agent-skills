# Technical Architecture Document

## Document Information

**Project**: Goji Mobile Wallet  
**Purpose**: Detail technical architecture, technology stack, infrastructure decisions, and system design patterns for the Goji platform
**Priority**: Critical
**Version**: 1.0  
**Date**: July 2025  
**Owner**: Lorien Gamaroff

## Related Documentation

-   **Product Requirements**: See [Product Requirements](../product/product-requirements.md) for feature specifications and user stories
-   **Product Vision**: See [Product Vision](../product/product-vision.md) for strategic vision and market positioning
-   **System Admin Portal**: See [System Admin Portal Requirements](../product/system-admin-portal-requirements.md) for administrative platform specifications
-   **Database Design**: See [Database Schema](database-schema.md) for data architecture and relationships
-   **Development Setup**: See [Development Workflow](../development/development-workflow.md) for IDE setup and development processes
-   **Deployment Procedures**: See [Deployment Guide](../development/deployment-guide.md) for step-by-step deployment instructions
-   **Git Workflow**: See [Git Strategy](../development/git-strategy.md) for branching and commit conventions
-   **Technology Stack**: See [Technology Stack](tech-stack.md) for complete technology inventory
-   **Coding Standards**: See [Coding Standards](coding-standards.md) for development conventions
-   **Source Tree**: See [Source Tree](source-tree.md) for project structure organization

## Architecture Overview

### System Context

Goji is positioned to disrupt the traditional mobile money operator ecosystem across Africa and emerging economies, targeting the 250M+ smartphone users currently underserved by legacy USSD-based systems. The platform competes directly with incumbent operators like M-Pesa (30M+ users), MTN Money (40M+ users), Airtel Money (25M+ users), and Orange Money (20M+ users) by offering superior cost structure, modern user experience, and cross-border capabilities.

### Architecture Principles

#### Competitive Positioning Against Mobile Money Operators

-   **Chat-First Integration**: Revolutionary departure from legacy USSD interfaces used by 60% of mobile money transactions, targeting smartphone users underserved by incumbent operators
-   **Cost Leadership**: Blockchain-powered under 1% fees vs mobile money operators charging 2-12% (M-Pesa: 1-3%, MTN Money: 1.5-4%, Airtel Money: 1-3.5%)
-   **Cross-Border Capability**: True peer-to-peer international transfers vs limited operator interoperability requiring multiple partnerships
-   **Modern UX**: Smartphone-native design for digital natives vs feature phone-optimized USSD menus
-   **Carrier Independence**: Blockchain infrastructure eliminates telecom carrier dependencies that constrain traditional operators
-   **Comprehensive Digital Commerce**: Extensive catalog of digital gift cards, gaming vouchers, and products from global brands and retailers accessible directly through the wallet, creating a complete digital marketplace ecosystem that traditional mobile money operators cannot match

#### Technical Architecture Advantages

-   **Global Accessibility**: Multi-language support (100+ languages), cultural adaptations, and blockchain transaction capabilities for worldwide reach
-   **Regulatory Compliance**: Built-in compliance framework (compliance-lib) with KYC/AML systems, multi-tier verification, real-time sanctions screening, and comprehensive audit capabilities
-   **Security by Design**: Multi-layer security with biometric authentication, AES-256 encryption, mobile-based key management with 12-word mnemonic phrases, and real-time fraud detection
-   **Scalability**: Blockchain-based architecture scales globally without operator partnership requirements
-   **Innovation Speed**: Modern tech stack enables rapid feature deployment vs legacy operator systems

## Table of Contents

-   [Document Information](#document-information)
-   [Architecture Overview](#architecture-overview)
    -   [System Context](#system-context)
    -   [Architecture Principles](#architecture-principles)
        -   [Competitive Positioning Against Mobile Money Operators](#competitive-positioning-against-mobile-money-operators)
        -   [Technical Architecture Advantages](#technical-architecture-advantages)
-   [System Architecture](#system-architecture)
    -   [High-Level Architecture Diagram](#high-level-architecture-diagram)
    -   [Component Overview](#component-overview)
-   [Application Architecture](#application-architecture)
    -   [Mobile Application (React Native)](#mobile-application-react-native)
    -   [Backend Services (NestJS)](#backend-services-nestjs)
        -   [Service Architecture Decision](#service-architecture-decision)
        -   [Architectural Recommendation for NX Project](#architectural-recommendation-for-nx-project)
        -   [Modular Monolith Structure](#modular-monolith-structure)
-   [Chat System Architecture](#chat-system-architecture)
    -   [Chat-First Financial Platform Design](#chat-first-financial-platform-design)
    -   [Chat Module Structure](#chat-module-structure)
    -   [Chat-Integrated Send Money Feature](#chat-integrated-send-money-feature)
    -   [Real-Time Communication Architecture](#real-time-communication-architecture)
    -   [Chat Database Design](#chat-database-design)
    -   [Chat Security & Privacy](#chat-security--privacy)
    -   [Chat Performance Optimization](#chat-performance-optimization)
    -   [Integration with Core Modules](#integration-with-core-modules)
    -   [Mobile Chat UI Architecture](#mobile-chat-ui-architecture)
    -   [Chat Analytics & Monitoring](#chat-analytics--monitoring)
    -   [Competitive Advantages Through Chat](#competitive-advantages-through-chat)
-   [Fiat Onramp System Architecture](#money-load-system-architecture)
    -   [Fiat Onramp Module Overview](#money-load-module-overview)
    -   [Fiat Onramp Module Structure](#money-load-module-structure)
    -   [Fiat Onramp Flow Architecture](#money-load-flow-architecture)
    -   [Fiat Onramp Security Architecture](#money-load-security-architecture)
    -   [Fiat Onramp Database Design](#money-load-database-design)
    -   [Fiat Onramp Performance Optimization](#money-load-performance-optimization)
    -   [Integration with Core Modules](#integration-with-core-modules-1)
    -   [Fiat Onramp Analytics & Monitoring](#money-load-analytics--monitoring)
    -   [Competitive Advantages Through Fiat Onramp](#competitive-advantages-through-money-load)
-   [Agent Network System Architecture](#agent-network-system-architecture)
    -   [Agent Network Module Overview](#agent-network-module-overview)
    -   [Agent Network Competitive Advantage](#agent-network-competitive-advantage)
    -   [Agent Network Module Structure](#agent-network-module-structure)
    -   [Agent Network Flow Architecture](#agent-network-flow-architecture)
    -   [Agent Network Security Architecture](#agent-network-security-architecture)
    -   [Agent Network Database Design](#agent-network-database-design)
    -   [Agent Network Performance Optimization](#agent-network-performance-optimization)
    -   [Integration with Core Modules](#integration-with-core-modules-2)
    -   [Agent Network Analytics & Monitoring](#agent-network-analytics--monitoring)
    -   [Competitive Advantages Through Agent Network](#competitive-advantages-through-agent-network)
-   [Data Architecture](#data-architecture)
    -   [Database Design](#database-design)
    -   [Data Flow](#data-flow)
-   [Security Architecture](#security-architecture)
    -   [Authentication & Authorization](#authentication--authorization)
    -   [Data Protection](#data-protection)
-   [Integration Architecture](#integration-architecture)
    -   [Internal Communication](#internal-communication)
    -   [External Integrations](#external-integrations)
-   [Infrastructure Architecture](#infrastructure-architecture)
    -   [Development Environment](#development-environment)
    -   [Production Environment](#production-environment)
-   [Scalability Considerations](#scalability-considerations)
    -   [Horizontal Scaling](#horizontal-scaling)
    -   [Performance Optimization](#performance-optimization)
-   [Technology Stack Summary](#technology-stack-summary)
-   [Architecture Decision Records (ADRs)](#architecture-decision-records-adrs)
    -   [ADR-001: Simplified Infrastructure Stack](#adr-001-simplified-infrastructure-stack)
    -   [ADR-002: Dedicated API Gateway (Kong/NGINX vs NestJS)](#adr-002-dedicated-api-gateway-kongnginx-vs-nestjs)
-   [Migration and Deployment Strategy](#migration-and-deployment-strategy)
    -   [Deployment Pipeline](#deployment-pipeline)
    -   [Rollback Strategy](#rollback-strategy)
-   [Monitoring and Observability](#monitoring-and-observability)
    -   [Logging](#logging)
    -   [Metrics](#metrics)
    -   [Alerting](#alerting)
-   [Performance Requirements](#performance-requirements)
    -   [Response Time Targets](#response-time-targets)
    -   [Scalability Targets](#scalability-targets)
    -   [Availability Requirements](#availability-requirements)

## System Architecture

### High-Level Architecture Diagram

```
[ASCII diagram or reference to external diagram]
```

### Component Overview

#### Core Applications

-   **Mobile Application**: React Native client with multi-type contact system, chat-integrated payments, and financial services
-   **System Admin Portal**: Web-based administrative platform for comprehensive ecosystem management
-   **Backend Services**: NestJS modular monolith serving both applications with microservices capability

#### Shared Infrastructure

-   **Database Layer**: PostgreSQL with Redis caching for both mobile and admin applications
-   **Blockchain Layer**: Bitcoin SV + MNEE USD integration
-   **External Integrations**: KYC providers, blockchain networks, digital product aggregators, payment processors, banking partners, mobile money operators, agent network services

#### Core Business Modules

-   **Contact System**: Multi-type contact architecture supporting Goji, bank, and mobile money recipients
-   **Compliance Module**: Unified regulatory compliance framework (compliance-lib) with KYC/AML/monitoring/reporting and admin oversight
-   **Chat Module**: Real-time messaging with integrated payments and fund requests (Goji contacts)
-   **Send Money Module**: Direct transfer interfaces for bank and mobile money contacts with currency conversion
-   **Shopping Module**: Digital products and services platform (including gaming vouchers)
-   **Request Module**: Fund request system between users (payment requests)
-   **Transactions Module**: Blockchain transaction processing and management with admin monitoring
-   **Fiat Onramp Module**: Fiat-to-crypto funding via payment partners (cards, bank transfers, digital wallets)
-   **Notifications Module**: Push notifications, alerts, and user messaging system
-   **User Management Module**: Comprehensive user lifecycle management accessible from both mobile and admin interfaces

## Application Architecture

### Mobile Application (React Native)

-   **Framework**: React Native + TypeScript
-   **State Management**: Zustand + React Query for server state
-   **Navigation**: Expo Router with drawer navigation architecture
-   **UI Library**: React Native Elements + custom components
-   **Build Tools**: Metro bundler + EAS Build (Expo Application Services)

#### Directory Structure

The mobile application follows Expo Router's file-based routing with a drawer navigation architecture:

```
apps/goji-wallet/
├── app/                       # Expo Router app directory
│   ├── _layout.tsx            # Root layout with navigation providers
│   ├── (drawer)/              # Drawer navigation group
│   │   ├── _layout.tsx        # Drawer layout with custom content
│   │   ├── index.tsx          # Drawer root/redirect screen
│   │   ├── home/              # Home module
│   │   │   ├── index.tsx      # Main dashboard
│   │   │   └── home-header.tsx
│   │   ├── contacts/          # Multi-type contact system
│   │   │   ├── index.tsx      # Contacts list screen
│   │   │   ├── contact-chat.tsx # Goji contact chat interface
│   │   │   ├── bank-contact.tsx # Bank contact send money interface
│   │   │   ├── mobile-money-contact.tsx # Mobile money send interface
│   │   │   ├── contact/       # Individual contact screens
│   │   │   │   └── contact-chat.tsx # Dynamic contact chat
│   │   │   └── _components/   # Contact-related components
│   │   ├── request/           # Payment requests
│   │   │   ├── index.tsx      # Requests list
│   │   │   └── [id].tsx       # Individual request details
│   │   ├── topup/             # Add money functionality
│   │   │   ├── index.tsx      # Add money options
│   │   │   └── payment-methods.tsx
│   │   ├── shopping/          # Digital products
│   │   │   ├── index.tsx      # Shopping main screen
│   │   │   ├── product/       # Product details
│   │   │   │   └── [id].tsx   # Dynamic product screen
│   │   │   └── order/         # Order management
│   │   │       └── [id].tsx   # Order details
│   │   ├── transactions/      # Transaction history
│   │   │   ├── index.tsx      # Transactions list
│   │   │   └── [id].tsx       # Transaction details
│   │   ├── notifications/     # Notifications center
│   │   │   ├── index.tsx      # Notifications list
│   │   │   └── [id].tsx       # Notification details
│   │   ├── settings/          # User settings
│   │   │   ├── index.tsx      # Main settings
│   │   │   └── notifications.tsx # Notification preferences
│   │   ├── help/              # Help & support
│   │   │   └── index.tsx      # Help center
│   │   ├── profile/           # User profile
│   │   │   └── index.tsx      # Profile management
│   │   └── onboarding/        # User onboarding (hidden from drawer)
│   │       ├── _layout.tsx    # Onboarding layout
│   │       ├── index.tsx      # Onboarding entry
│   │       ├── welcome.tsx    # Welcome screen
│   │       ├── create-wallet.tsx
│   │       ├── phone-verification.tsx
│   │       └── wallet-ready.tsx
│   ├── index.tsx              # App entry point
│   └── not-found/             # 404 error handling
│       └── not-found.tsx
├── components/                # Shared components
│   ├── custom-drawer-content.tsx # Custom drawer navigation
│   ├── ui/                    # Base UI components
│   ├── currency/              # Currency-related components
│   └── themed/                # Theme-aware components
├── contexts/                  # React contexts
│   ├── theme-provider.tsx     # Theme management
│   └── profile-context.tsx    # User profile state
├── services/                  # API and external services
├── styles/                    # Styling system
│   └── layouts/               # Layout-specific styles
├── assets/                    # Images and resources
└── types/                     # TypeScript definitions
```

### Backend Services (NestJS)

#### Service Architecture Decision

-   [x] **Modular Monolith**: Single NestJS app with microservices capability
-   [ ] **Microservices**: Multiple specialized services (future consideration)

#### Architectural Recommendation for NX Project

**Modular Monolith is the recommended approach for this NX workspace.** Based on comprehensive analysis of architecture patterns in 2025, the modular monolith provides the optimal balance of simplicity, maintainability, and scalability for the Goji platform.

**Key Benefits for This Project:**

-   **Early Stage Advantage**: Rapid development and iteration during initial phases
-   **NX Perfect Fit**: NX excels at managing modular monoliths with library system and dependency management
-   **NestJS Integration**: Natural support for modular architecture with clear bounded contexts
-   **Evolution Path**: Can extract modules into microservices when complexity justifies it
-   **Team Efficiency**: More efficient for current team size vs microservices overhead
-   **Cost Effectiveness**: Lower operational complexity and infrastructure costs
-   **Simplified Communication**: Internal module communication vs network latency
-   **Easier Debugging**: Centralized logging and tracing capabilities

**NX-Specific Implementation Strategy:**

-   **Library Boundaries**: Enforce module boundaries through NX libraries
-   **Dependency Graph**: Visual representation of module relationships
-   **Code Generation**: Consistent module structure via NX generators
-   **Affected Commands**: Run tests/builds only on changed modules
-   **Workspace Analytics**: Monitor and optimize module coupling

**Migration Strategy**: Follow "monolith first" approach - establish clear module boundaries that facilitate future microservices extraction if scale demands it. Current market trends in 2025 favor well-structured modular monoliths over premature microservices adoption.

#### Modular Monolith Structure

```
apps/goji-api/
├── src/
│   ├── modules/
│   │   ├── auth/                    # Authentication & authorization
│   │   ├── users/                   # User management
│   │   ├── wallets/                 # Multi-wallet operations (BSV, USD Stable coin)
│   │   ├── contacts/                # Multi-type contact system management
│   │   ├── chat/                    # Real-time messaging & chat-integrated payments (Goji contacts)
│   │   ├── send-money/              # Direct transfer processing for bank & mobile money contacts
│   │   ├── transactions/            # Blockchain transaction processing
│   │   ├── money-load/              # Fiat-to-crypto funding via payment partners
│   │   ├── agents/                  # Agent network management and cash-in/cash-out services
│   │   │   ├── onboarding/          # Agent registration and KYC
│   │   │   ├── transactions/        # Agent transaction processing
│   │   │   ├── settlements/         # Commission calculations and payments
│   │   │   ├── compliance/          # Agent compliance monitoring
│   │   │   ├── mapping/             # Geographic agent mapping
│   │   │   └── training/            # Agent education and certification
│   │   ├── compliance/              # All regulatory compliance (compliance-lib integration)
│   │   │   ├── assessment/          # Risk assessment and decision engine
│   │   │   ├── kyc/                 # Identity verification and KYC tiers
│   │   │   ├── aml/                 # Anti-money laundering and sanctions screening
│   │   │   ├── monitoring/          # Transaction monitoring and audit trails
│   │   │   └── reporting/           # Regulatory reporting and SAR generation
│   │   ├── shopping/                # Digital products & services (including gaming)
│   │   ├── requests/                # Fund requests between users
│   │   ├── notifications/           # Push notifications, alerts, and messaging
│   │   ├── rewards/                 # Loyalty and rewards system
│   │   ├── localization/            # Multi-language support
│   │   └── monitoring/              # System monitoring (health, performance, metrics)
│   ├── common/
│   ├── config/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
└── test/
```

## Mobile App to Admin Portal Integration Architecture

### Shared Backend Services

The mobile application and system admin portal share a unified backend infrastructure, enabling real-time synchronization and comprehensive management capabilities.

#### API Architecture

```typescript
// Unified API structure serving both applications
@Controller('api/v1')
export class UnifiedApiController {
  // Mobile endpoints
  @Get('mobile/users/:id')
  @UseGuards(MobileAuthGuard)
  async getMobileUserProfile() { ... }

  // Admin endpoints
  @Get('admin/users/:id')
  @UseGuards(AdminAuthGuard, RoleGuard('admin'))
  async getAdminUserProfile() { ... }

  // Shared endpoints (different auth/permissions)
  @Get('transactions/:id')
  @UseGuards(AuthGuard, TransactionAccessGuard)
  async getTransaction() { ... }
}
```

#### Data Synchronization

-   **Real-Time Events**: WebSocket connections for live updates between mobile actions and admin monitoring
-   **Shared Database**: Single source of truth with different access patterns for mobile vs admin use cases
-   **Event Sourcing**: Critical actions logged for both mobile user experience and admin audit trails

#### Permission Architecture

```typescript
// Role-based access control serving both applications
enum UserRole {
    MOBILE_USER = 'mobile_user',
    ADMIN_SUPER = 'admin_super',
    ADMIN_REGIONAL = 'admin_regional',
    ADMIN_COMPLIANCE = 'admin_compliance',
    ADMIN_SUPPORT = 'admin_support'
}

// Different data views based on access level
const getUserData = (userId: string, requesterRole: UserRole) => {
    switch (requesterRole) {
        case UserRole.MOBILE_USER:
            return getUserPublicProfile(userId)
        case UserRole.ADMIN_SUPER:
            return getUserFullAdminProfile(userId)
        case UserRole.ADMIN_COMPLIANCE:
            return getUserComplianceProfile(userId)
        // ... other admin roles
    }
}
```

### Integration Patterns

#### 1. User Management Integration

-   **Mobile**: User registration, profile updates, KYC document submission
-   **Admin Portal**: User verification, status management, compliance monitoring
-   **Integration**: Real-time sync of user status changes, KYC updates, and account modifications

#### 2. Transaction Monitoring Integration

-   **Mobile**: Transaction initiation, confirmation, history viewing
-   **Admin Portal**: Real-time transaction monitoring, fraud detection, investigation tools
-   **Integration**: Live transaction feeds, alert generation, manual intervention capabilities

#### 3. Compliance Integration

-   **Mobile**: Automatic compliance checks, document submission, verification status
-   **Admin Portal**: Compliance case management, investigation tools, regulatory reporting
-   **Integration**: Unified compliance engine serving both interfaces with appropriate data filtering

#### 4. Communication Integration

-   **Mobile**: Chat messaging, payment requests, notifications
-   **Admin Portal**: User communication management, broadcast messaging, support ticket integration
-   **Integration**: Shared messaging infrastructure with admin oversight and intervention capabilities

### Technical Implementation

#### Authentication Strategy

```typescript
// JWT tokens with different scopes for mobile vs admin
interface MobileJWT {
    userId: string
    role: 'mobile_user'
    permissions: ['user_profile', 'transactions', 'chat']
}

interface AdminJWT {
    adminId: string
    role: AdminRole
    permissions: string[]
    territoryCodes?: string[] // For regional admins
}
```

#### API Gateway Configuration

```yaml
# Kong configuration for unified routing
- name: mobile-api
  url: http://nestjs-backend:3000
  paths: ['/api/v1/goji-wallet']
  plugins:
      - name: mobile-auth
      - name: rate-limiting

- name: admin-api
  url: http://nestjs-backend:3000
  paths: ['/api/v1/admin']
  plugins:
      - name: admin-auth
      - name: ip-restriction
```

#### Database Access Patterns

-   **Mobile Queries**: Optimized for individual user data, real-time responsiveness
-   **Admin Queries**: Optimized for bulk operations, analytics, and reporting
-   **Shared Queries**: Transaction processing, compliance checks, user authentication

### Security Considerations

-   **Network Separation**: Admin portal requires VPN/IP whitelisting for enhanced security
-   **Data Filtering**: Automatic PII filtering based on admin role and jurisdiction
-   **Audit Logging**: All admin actions logged with full audit trail
-   **Session Management**: Separate session handling for mobile vs admin with different timeout policies

## Contact System Architecture

### Multi-Type Contact System Overview

The Contact System is a **foundational architectural component** that enables Goji to serve as a universal financial platform supporting four distinct interaction patterns:

1. **Goji Contacts**: Blockchain-native users within Goji ecosystem for chat-first peer-to-peer interactions
2. **Paymail Contacts**: External paymail-compatible wallet users for BSV-only blockchain transactions
3. **Bank Contacts**: Traditional banking recipients for direct bank transfers
4. **Mobile Money Contacts**: Mobile money users for integration with existing operators

This multi-modal approach positions Goji uniquely against competitors by supporting user preferences and regional financial infrastructure variations.

### Contact System Module Structure

```
apps/goji-api/src/modules/contacts/
├── contacts.module.ts              # Main contact system module
├── controllers/
│   ├── contacts.controller.ts      # Contact CRUD operations
│   ├── contact-types.controller.ts # Contact type management
│   └── contact-sync.controller.ts  # Contact synchronization
├── services/
│   ├── contacts.service.ts         # Core contact business logic
│   ├── goji-contacts.service.ts # Goji-specific contact operations
│   ├── paymail-contacts.service.ts # Paymail contact validation and BSV transactions
│   ├── bank-contacts.service.ts    # Bank contact validation and management
│   ├── mobile-money-contacts.service.ts # Mobile money contact operations
│   ├── contact-validation.service.ts # Contact data validation
│   └── contact-routing.service.ts   # Route contacts to appropriate handlers
├── entities/
│   ├── contact.entity.ts           # Base contact database model
│   ├── goji-contact.entity.ts   # Goji contact extensions
│   ├── paymail-contact.entity.ts   # Paymail contact details
│   ├── bank-contact.entity.ts      # Bank contact details
│   └── mobile-money-contact.entity.ts # Mobile money contact details
├── dto/
│   ├── create-contact.dto.ts       # Contact creation validation
│   ├── goji-contact.dto.ts      # Goji contact validation
│   ├── paymail-contact.dto.ts      # Paymail contact validation
│   ├── bank-contact.dto.ts         # Bank contact validation
│   └── mobile-money-contact.dto.ts # Mobile money contact validation
└── guards/
    ├── contact-ownership.guard.ts  # Contact ownership verification
    └── contact-type.guard.ts       # Contact type validation
```

### Contact Routing Architecture

#### Navigation Decision Logic

```typescript
// Contact selection routing based on contact type
const handleContactInteraction = (contact: Contact) => {
    switch (contact.type) {
        case 'goji':
            // Route to chat interface for social interactions
            return router.push(`/contacts/chat/${contact.id}`)

        case 'paymail':
        case 'mnee-usd':
        case 'bank':
        case 'mobile-money':
            // Route to send money interface for financial transactions
            return router.push(`/contacts/send-money/${contact.id}`)

        default:
            throw new UnknownContactTypeError(contact.type)
    }
}
```

#### Backend Service Routing

```typescript
// API service routing for contact operations
@Controller('contacts')
export class ContactsController {
    @Post(':contactId/interact')
    async interactWithContact(
        @Param('contactId') contactId: string,
        @Body() interactionDto: ContactInteractionDto
    ) {
        const contact = await this.contactsService.findById(contactId)

        switch (contact.type) {
            case 'goji':
                return this.chatService.initiateChat(contact, interactionDto)

            case 'paymail':
                return this.paymailService.initiatePaymailTransfer(
                    contact,
                    interactionDto
                )

            case 'mnee-usd':
                return this.mneeUsdService.initiateMneeUsdTransfer(
                    contact,
                    interactionDto
                )

            case 'bank':
                return this.bankTransferService.initiateBankTransfer(
                    contact,
                    interactionDto
                )

            case 'mobile-money':
                return this.mobileMoneyService.initiateMobileMoneyTransfer(
                    contact,
                    interactionDto
                )
        }
    }
}
```

### Contact Database Architecture

#### Unified Contact Schema

```sql
-- Base Contacts Table
CREATE TABLE contacts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type contact_type NOT NULL, -- ENUM: 'goji', 'paymail', 'mnee-usd', 'bank', 'mobile-money'
    country VARCHAR(3) NOT NULL, -- ISO country code
    avatar_url VARCHAR(500),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    last_interaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact Type Enum
CREATE TYPE contact_type AS ENUM ('goji', 'paymail', 'mnee-usd', 'bank', 'mobile-money');

-- Goji Contact Details
CREATE TABLE goji_contact_details (
    contact_id UUID PRIMARY KEY REFERENCES contacts(id),
    handle VARCHAR(50) NOT NULL, -- @handle format for Goji users
    public_key VARCHAR(500), -- For blockchain transactions
    last_seen_at TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    has_unread_messages BOOLEAN DEFAULT FALSE
);

-- Paymail Contact Details
CREATE TABLE paymail_contact_details (
    contact_id UUID PRIMARY KEY REFERENCES contacts(id),
    paymail VARCHAR(255) NOT NULL, -- email@domain.bsv format for external paymail-compatible wallets
    external_wallet VARCHAR(100), -- Name of external wallet (HandCash, Money Button, etc.)
    bsv_only BOOLEAN DEFAULT TRUE, -- Only BSV transactions supported
    last_transaction_at TIMESTAMP
);

-- Bank Contact Details
CREATE TABLE bank_contact_details (
    contact_id UUID PRIMARY KEY REFERENCES contacts(id),
    account_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20),
    branch_code VARCHAR(20),
    account_type VARCHAR(50), -- Savings, Current, etc.
    routing_number VARCHAR(20), -- For US banks
    iban VARCHAR(50), -- For European banks
    swift_code VARCHAR(11), -- For international transfers
    currency VARCHAR(3) NOT NULL -- Account currency
);

-- Mobile Money Contact Details
CREATE TABLE mobile_money_contact_details (
    contact_id UUID PRIMARY KEY REFERENCES contacts(id),
    phone_number VARCHAR(20) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    operator VARCHAR(50) NOT NULL, -- M-Pesa, MTN Money, etc.
    operator_code VARCHAR(10), -- Operator-specific code
    currency VARCHAR(3) NOT NULL, -- Local currency
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP
);

-- Contact Interaction History
CREATE TABLE contact_interactions (
    id UUID PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id),
    interaction_type VARCHAR(50) NOT NULL, -- 'chat_message', 'money_transfer', 'contact_added'
    metadata JSONB, -- Interaction-specific data
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Contact Validation & Verification Services

#### Multi-Type Validation Pipeline

```typescript
// Contact validation service with type-specific validation
@Injectable()
export class ContactValidationService {
    async validateContact(
        contactDto: CreateContactDto
    ): Promise<ValidationResult> {
        // Base validation for all contact types
        const baseValidation = await this.validateBaseContactData(contactDto)
        if (!baseValidation.isValid) return baseValidation

        // Type-specific validation
        switch (contactDto.type) {
            case 'goji':
                return this.validateGojiContact(
                    contactDto as GojiContactDto
                )

            case 'paymail':
                return this.validatePaymailContact(
                    contactDto as PaymailContactDto
                )

            case 'mnee-usd':
                return this.validateMNEEUSDContact(
                    contactDto as MNEEUSDContactDto
                )

            case 'bank':
                return this.validateBankContact(contactDto as BankContactDto)

            case 'mobile-money':
                return this.validateMobileMoneyContact(
                    contactDto as MobileMoneyContactDto
                )
        }
    }

    private async validateGojiContact(
        dto: GojiContactDto
    ): Promise<ValidationResult> {
        // Validate handle format (@handle) for Goji users
        // Check handle availability in Goji network
        // Validate public key format if provided
    }

    private async validatePaymailContact(
        dto: PaymailContactDto
    ): Promise<ValidationResult> {
        // Verify paymail format (email@domain.bsv) for external paymail-compatible wallets
        // Check paymail existence in external paymail systems
        // Validate BSV-only transaction capability
        // Verify external wallet compatibility
    }

    private async validateBankContact(
        dto: BankContactDto
    ): Promise<ValidationResult> {
        // Validate account number format by country
        // Verify bank code/SWIFT code exists
        // Check routing number format (US) or IBAN (EU)
        // Validate account type against bank's offerings
    }

    private async validateMobileMoneyContact(
        dto: MobileMoneyContactDto
    ): Promise<ValidationResult> {
        // Validate phone number format by country
        // Verify mobile operator exists in country
        // Check operator code format
        // Validate currency matches country's mobile money currency
    }
}
```

### Contact Service Integration Architecture

#### Integration with Core Services

```typescript
// Contact system integration with other modules
@Injectable()
export class ContactIntegrationService {
    // Integration with Chat Service (Goji contacts)
    async initiateGojiContact(contact: GojiContact, message?: string) {
        // Create chat room if doesn't exist
        // Send initial message if provided
        // Update contact's last interaction
        return this.chatService.createOrGetRoom(contact.id, message)
    }

    // Integration with Send Money Service (Bank/Mobile Money contacts)
    async initiateBankTransfer(
        contact: BankContact,
        amount: number,
        currency: string
    ) {
        // Validate transfer amount and currency
        // Calculate exchange rates and fees
        // Create transfer request
        // Update contact's last interaction
        return this.sendMoneyService.initiateBankTransfer(
            contact,
            amount,
            currency
        )
    }

    async initiateMobileMoneyTransfer(
        contact: MobileMoneyContact,
        amount: number,
        currency: string
    ) {
        // Validate transfer amount and operator limits
        // Calculate conversion rates and fees
        // Create mobile money transfer request
        // Update contact's last interaction
        return this.sendMoneyService.initiateMobileMoneyTransfer(
            contact,
            amount,
            currency
        )
    }
}
```

### Contact Performance & Optimization

#### Caching Strategy for Contact Operations

```typescript
// Redis-based contact caching
const CONTACT_CACHE_CONFIG = {
    // Frequently accessed contact lists
    userContactList: '5m', // 5 minute TTL

    // Contact details for active interactions
    contactDetails: '30m', // 30 minute TTL

    // Contact validation results
    validationResults: '1h', // 1 hour TTL

    // Contact search results
    searchResults: '10m', // 10 minute TTL

    // Real-time status (Goji contacts only)
    onlineStatus: '30s' // 30 second TTL
}
```

#### Database Query Optimization

```sql
-- Optimized indexes for contact operations
CREATE INDEX idx_contacts_user_type ON contacts(user_id, type);
CREATE INDEX idx_contacts_last_interaction ON contacts(user_id, last_interaction_at DESC);
CREATE INDEX idx_contacts_favorites ON contacts(user_id, is_favorite) WHERE is_favorite = true;

-- Full-text search for contact names
CREATE INDEX idx_contacts_name_search ON contacts USING gin(to_tsvector('english', name));

-- Type-specific indexes
CREATE INDEX idx_goji_handle ON goji_contact_details(handle);
CREATE INDEX idx_goji_paymail ON goji_contact_details(paymail);
CREATE INDEX idx_bank_account ON bank_contact_details(account_number, bank_code);
CREATE INDEX idx_mobile_money_phone ON mobile_money_contact_details(phone_number, country_code);
```

### Contact System Analytics & Metrics

#### Business Intelligence Metrics

```typescript
// Contact system analytics for business insights
const CONTACT_ANALYTICS = {
    // Contact type distribution
    contactTypeDistribution: {
        gojiPercentage: 'percentage of Goji contacts',
        bankPercentage: 'percentage of bank contacts',
        mobileMoneyPercentage: 'percentage of mobile money contacts'
    },

    // Interaction patterns
    interactionFrequency: {
        chatMessagesPerContact: 'average messages per Goji contact',
        transfersPerBankContact: 'average transfers per bank contact',
        transfersPerMobileMoneyContact:
            'average transfers per mobile money contact'
    },

    // Geographic distribution
    geographicDistribution: {
        contactsByCountry: 'contact distribution by country',
        crossBorderContactPairs: 'international contact relationships'
    },

    // Contact lifecycle
    contactLifecycle: {
        averageContactLifespan: 'time from creation to last interaction',
        dormantContactPercentage:
            'percentage of contacts with no recent activity',
        reactivationRate: 'rate of dormant contacts becoming active again'
    }
}
```

### Competitive Advantages Through Multi-Type Contact System

#### vs. Traditional Mobile Money Operators

-   **Universal Contact Support**: Handle Goji, bank, and mobile money recipients in one platform vs single-network limitations
-   **Cross-Border Flexibility**: Send to any contact type internationally vs regional operator restrictions
-   **Unified User Experience**: Single interface for all financial interactions vs separate apps/USSD codes
-   **Cost Optimization**: Route transfers through most cost-effective method based on recipient type

#### vs. Banking Apps

-   **Multi-Modal Support**: Support non-bank recipients (mobile money, crypto) vs bank-to-bank only
-   **Social Integration**: Chat-first interactions for Goji contacts vs transaction-only interfaces
-   **Real-Time Rates**: Live exchange rates and fee transparency vs hidden banking fees
-   **Modern UX**: Smartphone-native design vs legacy banking interfaces

#### vs. Crypto Wallets

-   **Fiat Integration**: Direct bank and mobile money support vs crypto-only limitations
-   **Mainstream Adoption**: Support traditional financial rails vs blockchain-native only
-   **Regional Relevance**: Mobile money integration for emerging markets vs global-only focus
-   **Progressive Onboarding**: Users can start with familiar payment methods and gradually adopt crypto

## Chat System Architecture

### Chat-First Financial Platform Design

The chat system is the **core differentiator** of Goji, representing a departure from traditional USSD-based mobile money interfaces. Unlike incumbent operators (M-Pesa, MTN Money, Airtel Money) that rely on menu-driven USSD codes, Goji provides a WhatsApp-like chat experience focused on contacts and groups with integrated money transfer capabilities.

### Chat Module Structure

```
apps/goji-api/src/modules/chat/
├── chat.module.ts              # Main chat module
├── controllers/
│   ├── chat.controller.ts      # Chat API endpoints
│   ├── messages.controller.ts  # Message management
│   └── rooms.controller.ts     # Chat room management
├── services/
│   ├── chat.service.ts         # Core chat business logic
│   ├── message.service.ts      # Message processing and storage
│   ├── room.service.ts         # Chat room management
│   ├── contacts.service.ts     # Contact and group management
│   └── money-transfer.service.ts # Chat-integrated money transfers
├── gateways/
│   └── chat.gateway.ts         # WebSocket gateway for real-time messaging
├── entities/
│   ├── chat-room.entity.ts     # Chat room database model
│   ├── message.entity.ts       # Message database model
│   └── participant.entity.ts   # Room participant model
├── dto/
│   ├── send-message.dto.ts     # Message creation validation
│   ├── create-room.dto.ts      # Room creation validation
│   └── money-transfer.dto.ts   # Money transfer validation
└── guards/
    └── chat-room.guard.ts      # Authorization for chat rooms
```

### Chat-Integrated Send Money Feature

The chat system provides a simple and intuitive way to send money to contacts and groups, similar to sending any other type of message or media. Users can send money with the same ease as sending a text message, photo, or emoji.

#### Send Money Integration

-   **Contact Chat**: Send money directly to individual contacts through the chat interface
-   **Group Chat**: Send money to group members or split expenses within group conversations
-   **Media-Like Experience**: Sending money feels as natural as sending a photo or message
-   **Transaction Receipts**: Simple receipts and status updates shared within the chat
-   **Payment History**: Transaction history integrated seamlessly into chat conversation flow

### Real-Time Communication Architecture

#### WebSocket Infrastructure

```typescript
// Chat Gateway Implementation
@WebSocketGateway({
    namespace: 'chat',
    cors: { origin: '*' }
})
export class ChatGateway {
    // Real-time message delivery
    // Payment status notifications
    // Shopping receipts
    // System alerts
}
```

#### Message Flow

1. **Client sends message** → WebSocket Gateway
2. **Message validation** → DTO validation + sanitization
3. **Money transfer processing** → Send money action detection and processing
4. **Message storage** → PostgreSQL + Redis caching
5. **Real-time delivery** → WebSocket broadcast to participants
6. **Push notifications** → Offline participant notifications

### Chat Database Design

#### Core Tables

```sql
-- Chat Rooms
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'direct', 'group', 'support'
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id),
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'money_transfer', 'receipt', 'system'
    metadata JSONB, -- Money transfer details, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Room Participants
CREATE TABLE room_participants (
    room_id UUID REFERENCES chat_rooms(id),
    user_id UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    PRIMARY KEY (room_id, user_id)
);
```

### Chat Security & Privacy

#### Message Encryption

-   **End-to-end encryption** for sensitive financial conversations
-   **AES-256 encryption** for message storage
-   **Key rotation** for long-term security
-   **Forward secrecy** for message history protection

#### Authorization Controls

-   **Room-based permissions** (admin, member, read-only)
-   **Money transfer authorization** (PIN, biometric, 2FA)
-   **PCI DSS compliance** for money transfer messages
-   **GDPR compliance** for message data handling

### Chat Performance Optimization

#### Caching Strategy

```typescript
// Redis-based message caching
- Recent messages (last 100 per room): 5 minute TTL
- Active room participants: 30 minute TTL
- User typing indicators: 10 second TTL
- Money transfer sessions: 5 minute TTL
```

#### Database Optimization

-   **Message partitioning** by date for performance
-   **Indexes** on room_id, sender_id, created_at
-   **Read replicas** for message history queries
-   **Connection pooling** for concurrent users

### Integration with Core Modules

#### Chat ↔ Money Transfer Integration

```typescript
// Send money action triggers transaction module
@ChatAction('send_money')
async handleSendMoneyAction(
  @ChatUser() sender: User,
  @ChatRecipient() recipient: User,
  @TransferAmount() amount: number
) {
  // Validate recipient and amount
  // Trigger transaction service
  // Send confirmation back to chat
  // Update chat with transfer message
}
```

#### Chat ↔ Compliance Integration

-   **AML monitoring** of money transfers
-   **Transaction pattern analysis** from chat behavior
-   **Suspicious activity reporting** based on chat patterns
-   **KYC verification** for money transfer limits

### Mobile Navigation Architecture

#### Drawer Navigation Structure

The app uses Expo Router's file-based routing with a drawer navigation pattern:

```typescript
// Root Layout (_layout.tsx)
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ProfileProvider>
          <CurrencyProvider>
            <Stack>
              <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            </Stack>
          </CurrencyProvider>
        </ProfileProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Drawer Layout ((drawer)/_layout.tsx)
export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: 'slide'
      }}
      drawerContent={props => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="home/index" options={{ title: 'Home' }} />
      <Drawer.Screen name="contacts" options={{ title: 'Contacts' }} />
      <Drawer.Screen name="request" options={{ title: 'Request' }} />
      <Drawer.Screen name="topup/index" options={{ title: 'Add Money' }} />
      <Drawer.Screen name="shopping/index" options={{ title: 'Shopping' }} />
      <Drawer.Screen name="transactions/index" options={{ title: 'Transactions' }} />
      <Drawer.Screen name="notifications/index" options={{ title: 'Notifications' }} />
      <Drawer.Screen name="settings/index" options={{ title: 'Settings' }} />
      <Drawer.Screen name="help/index" options={{ title: 'Help' }} />
      <Drawer.Screen name="profile/index" options={{ title: 'Profile' }} />
    </Drawer>
  );
}

// Custom Drawer Content
export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <View>
      {/* User Profile Section */}
      <TouchableOpacity onPress={() => router.push('/profile')}>
        <Image source={profile?.avatar || DefaultAvatar} />
        <Text>{profile?.fullName}</Text>
        <Text>@{profile?.handle}</Text>
      </TouchableOpacity>
      
      {/* Navigation Links */}
      <TouchableOpacity onPress={() => router.push('/home')}>
        <Ionicons name="home" />
        <Text>Home</Text>
      </TouchableOpacity>
      {/* Additional navigation items... */}
    </View>
  );
}
```

#### Mobile Chat UI Architecture

```typescript
// Core chat components (within contacts module)
- ContactChat: Main chat interface for Goji contacts
- MessageBubble: Individual message display
- MoneyTransferBubble: Special styling for money transfer messages
- SendMoneyButton: Send money action button
- ContactsList: Contact and group selection
- ParticipantList: Group chat member management
```

#### Navigation State Management

```typescript
// Navigation and app state management
interface AppStore {
    // Navigation state
    currentRoute: string
    drawerOpen: boolean
    
    // Chat state (within contacts module)
    activeRooms: ChatRoom[]
    messages: Record<string, Message[]>
    unreadCounts: Record<string, number>
    typingIndicators: Record<string, string[]>
    contacts: Contact[]
    groups: Group[]

    // Actions
    navigateTo: (route: string) => void
    toggleDrawer: () => void
    sendMessage: (roomId: string, content: string) => void
    sendMoney: (recipientId: string, amount: number) => void
    loadChatHistory: (roomId: string) => void
    loadContacts: () => void
}

// Theme and profile contexts
// ThemeProvider: Global theme management
// ProfileProvider: User profile and authentication state
// CurrencyProvider: Currency preferences and formatting
```

### Chat Analytics & Monitoring

#### Business Metrics

-   **Chat engagement rates** (messages per user per day)
-   **Money transfer usage** (transfers initiated through chat)
-   **Contact interaction rates** (frequency of contact messaging)
-   **Group chat activity** (messages and transfers in group chats)

#### Technical Metrics

-   **API response times** (<200ms target)
-   **Payment processing times** (<30 seconds target)
-   **Websocket connection stability** (>99.5% uptime)
-   **Message throughput** (10,000+ messages/second)

### Competitive Advantages Through Chat

#### vs. Traditional Mobile Money (M-Pesa, MTN Money)

-   **WhatsApp-like interface** vs USSD menu navigation
-   **Contextual conversations** vs isolated transactions
-   **Social payment experience** vs individual-only transactions
-   **Integrated money transfers** vs separate transaction apps
-   **Rich media support** (images, emojis, GIFs) vs text-only

#### Chat-First Innovation Features

-   **Media-like money transfers** (send money as easily as sending a photo)
-   **Group money transfers** within group conversations
-   **Contact-based payments** (no need to remember phone numbers)
-   **Conversation context** for payment history and references
-   **Emoji and GIF reactions** to money transfers

## Fiat Onramp System Architecture

### Fiat Onramp Module Overview

The Fiat Onramp system is a **critical infrastructure component** that enables users to deposit fiat currency and receive BSV or MNEE USD in their wallets. This module bridges traditional payment systems with blockchain technology, providing seamless fiat-to-crypto conversions through multiple payment partners.

### Fiat Onramp Module Structure

```
apps/goji-api/src/modules/money-load/
├── money-load.module.ts         # Main money load module
├── controllers/
│   ├── deposit.controller.ts    # Deposit initiation and status endpoints
│   ├── webhooks.controller.ts   # Payment partner webhook handlers
│   └── methods.controller.ts    # Available funding methods API
├── services/
│   ├── money-load.service.ts    # Core money load business logic
│   ├── payment-router.service.ts # Route payments to appropriate partners
│   ├── conversion.service.ts    # Fiat-to-crypto conversion logic
│   ├── limits.service.ts        # KYC-based deposit limits
│   └── reconciliation.service.ts # Payment reconciliation and audit
├── integrations/
│   ├── fiat-onramp/
│   │   ├── provider-adapter.service.ts # Optional fiat on-ramp provider adapter (cards/wallets/bank)
│   │   └── onramp-webhook.handler.ts   # Generic on-ramp webhook handler (if used)
│   └── banking/
│       ├── bank-transfer.service.ts # Bank EFT integration
│       └── wire-transfer.service.ts # Wire transfer processing
├── entities/
│   ├── deposit-request.entity.ts    # Deposit request database model
│   ├── payment-method.entity.ts     # Available payment methods
│   ├── conversion-rate.entity.ts    # Historical exchange rates
│   └── deposit-transaction.entity.ts # Completed deposit records
├── dto/
│   ├── create-deposit.dto.ts    # Deposit creation validation
│   ├── payment-method.dto.ts    # Payment method selection
│   └── webhook-payload.dto.ts   # Payment partner webhook validation
└── guards/
    ├── kyc-tier.guard.ts        # KYC tier verification for deposits
    └── deposit-limits.guard.ts  # Deposit amount limit validation
```

### Fiat Onramp Flow Architecture

#### 1. Deposit Initiation Flow

```typescript
// User initiates deposit request
POST /api/money-load/deposits
{
  "amount": 100.00,
  "currency": "USD",
  "targetAsset": "BSV", // or "MNEE_USD"
  "paymentMethod": "credit_card",
  "provider": "onramp_tbd" // optional fiat on-ramp provider adapter
}
```

#### 2. Payment Processing Flow

1. **KYC Verification**: Validate user's KYC tier against deposit amount
2. **Rate Calculation**: Calculate real-time fiat-to-crypto conversion rate
3. **Fiat On-Ramp Routing (optional)**: If a fiat on-ramp is enabled, route via the configured provider adapter. Core settlement remains Goji-native payments.
4. **Payment Processing**: Handle payment authorization and capture
5. **Webhook Processing**: Receive payment confirmation from partner
6. **Asset Conversion**: Convert fiat to BSV or MNEE USD
7. **Wallet Credit**: Credit user's wallet with purchased cryptocurrency
8. **Notification**: Notify user of successful deposit

#### 3. Funding Methods (Optional Fiat On-Ramp)

-   Cards via generic provider adapter (TBD)
-   Digital wallets via provider adapter (TBD)
-   3D Secure/authentication support (if required by provider)
-   Fraud detection and prevention (provider-dependent)

Note: Core payments are processed natively in Goji (BSV/MNEE USD).

**Bank Transfers:**

-   ACH transfers via regional banking partners for US users
-   SEPA transfers via European banking partners for European users
-   Wire transfers via partner network for high-value deposits
-   Banking partner integration for regulatory compliance

**Mobile Money (Regional):**

-   M-Pesa integration via regional partners for Kenya/Tanzania
-   MTN Money integration via regional partners for multiple African markets
-   Airtel Money integration via regional partners for African markets
-   Orange Money integration via regional partners for Francophone Africa

### Fiat Onramp Security Architecture

#### Payment Security

-   **PCI DSS Compliance**: All card processing through certified partners
-   **Tokenization**: No storage of sensitive payment data
-   **3D Secure**: Strong customer authentication for card payments
-   **Fraud Detection**: Real-time fraud scoring and risk assessment

#### Conversion Security

-   **Rate Protection**: Locked-in conversion rates during payment process
-   **Slippage Protection**: Maximum acceptable rate deviation limits
-   **Audit Trail**: Complete transaction logging for compliance
-   **Reconciliation**: Automated reconciliation of fiat and crypto amounts

### Fiat Onramp Database Design

#### Core Tables

```sql
-- Deposit Requests
CREATE TABLE deposit_requests (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    amount DECIMAL(18,8) NOT NULL,
    currency VARCHAR(3) NOT NULL, -- USD, EUR, GBP, etc.
    target_asset VARCHAR(10) NOT NULL, -- BSV, MNEE_USD
    payment_method VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    conversion_rate DECIMAL(18,8),
    expected_crypto_amount DECIMAL(18,8),
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    method_type VARCHAR(50) NOT NULL, -- 'credit_card', 'bank_account', 'apple_pay'
    provider VARCHAR(50) NOT NULL,
    provider_method_id VARCHAR(255), -- On-ramp provider method ID (if applicable)
    is_default BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- Deposit Transactions
CREATE TABLE deposit_transactions (
    id UUID PRIMARY KEY,
    deposit_request_id UUID REFERENCES deposit_requests(id),
    provider_transaction_id VARCHAR(255),
    fiat_amount DECIMAL(18,8) NOT NULL,
    fiat_currency VARCHAR(3) NOT NULL,
    crypto_amount DECIMAL(18,8) NOT NULL,
    crypto_asset VARCHAR(10) NOT NULL,
    conversion_rate DECIMAL(18,8) NOT NULL,
    fees JSONB, -- Provider fees, conversion fees, etc.
    wallet_credited_at TIMESTAMP,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- Conversion Rates (for audit and analytics)
CREATE TABLE conversion_rates (
    id UUID PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_asset VARCHAR(10) NOT NULL,
    rate DECIMAL(18,8) NOT NULL,
    provider VARCHAR(50),
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP
);
```

### Fiat Onramp Performance Optimization

#### Caching Strategy

```typescript
// Redis-based rate caching
- Conversion rates: 30 second TTL
- Payment method data: 5 minute TTL
- KYC tier limits: 60 minute TTL
- Provider status: 10 second TTL
```

#### Database Optimization

-   **Indexed queries** on user_id, status, created_at
-   **Partitioning** of deposit_transactions by month
-   **Read replicas** for reporting and analytics
-   **Connection pooling** for high-volume processing

### Integration with Core Modules

#### Fiat Onramp ↔ Compliance Integration

```typescript
// KYC tier validation before deposit
@UseGuards(KycTierGuard)
async createDeposit(
  @User() user: User,
  @Body() depositDto: CreateDepositDto
) {
  // Validate deposit amount against KYC tier limits
  // Monitor for suspicious deposit patterns
  // Generate AML alerts if necessary
}
```

#### Fiat Onramp ↔ Wallets Integration

```typescript
// Credit wallet after successful payment
async processSuccessfulDeposit(
  depositTransaction: DepositTransaction
) {
  // Credit user's BSV or MNEE USD wallet
  // Update wallet balance
  // Create blockchain transaction record
  // Send confirmation notification
}
```

#### Fiat Onramp ↔ Notifications Integration

-   **Deposit receipts** sent via push notifications
-   **Payment failures** with retry instructions
-   **Rate expiration** warnings
-   **Deposit limit** notifications

### Fiat Onramp Analytics & Monitoring

#### Business Metrics

-   **Deposit volume** (daily, weekly, monthly)
-   **Conversion rates** by payment method and region
-   **Payment success rates** by provider
-   **Average deposit amounts** by user segment
-   **Popular funding methods** by geography

#### Technical Metrics

-   **API response times** (<200ms target)
-   **Payment processing times** (<30 seconds target)
-   **Webhook delivery reliability** (>99.5% success rate)
-   **Rate calculation accuracy** (under 1% deviation)

### Competitive Advantages Through Fiat Onramp

#### vs. Traditional Crypto Exchanges

-   **No account minimums** vs high minimum deposits
-   **Instant availability** vs delayed clearing times
-   **Integrated experience** vs separate exchange accounts
-   **Lower fees** through efficient payment routing

#### vs. Mobile Money Operators

-   **Global payment methods** vs local-only options
-   **Competitive conversion rates** vs poor exchange rates
-   **Modern digital experience** vs USSD interfaces
-   **Cross-border capability** vs regional limitations

## Agent Network System Architecture

### Agent Network Module Overview

The Agent Network system is a **critical infrastructure component** that enables Goji to compete effectively with established mobile money operators by providing essential cash-in/cash-out services. This module manages the complete lifecycle of agent partnerships, from recruitment and onboarding to transaction processing and compliance monitoring.

### Agent Network Competitive Advantage

#### vs. Traditional Mobile Money Operators (M-Pesa, MTN Money, Airtel Money)

-   **Real-time Blockchain Settlement**: Instant agent commission settlement vs delayed batch processing
-   **Modern Agent Portal**: Smartphone app with analytics vs basic USSD interfaces
-   **Competitive Commission Structure**: Enhanced earning potential vs traditional fixed rates
-   **Cross-Border Agent Network**: International interoperability vs regional limitations
-   **Automated Compliance**: AI-powered monitoring vs manual reporting requirements
-   **Digital Training Platform**: Interactive learning vs paper-based training

### Agent Network Module Structure

```
apps/goji-api/src/modules/agents/
├── agents.module.ts                    # Main agent network module
├── controllers/
│   ├── agent-onboarding.controller.ts  # Agent registration and KYC
│   ├── agent-transactions.controller.ts # Cash-in/cash-out processing
│   ├── agent-management.controller.ts  # Agent administration
│   ├── agent-settlements.controller.ts # Commission processing
│   ├── agent-compliance.controller.ts  # Regulatory monitoring
│   └── agent-mapping.controller.ts     # Geographic services
├── services/
│   ├── agent-onboarding.service.ts     # Agent recruitment and verification
│   ├── agent-transaction.service.ts    # Transaction processing logic
│   ├── agent-settlement.service.ts     # Commission calculations
│   ├── agent-compliance.service.ts     # Compliance monitoring
│   ├── agent-mapping.service.ts        # Geographic and location services
│   ├── agent-training.service.ts       # Education and certification
│   └── agent-analytics.service.ts      # Performance analytics
├── gateways/
│   └── agent-websocket.gateway.ts      # Real-time agent notifications
├── entities/
│   ├── agent.entity.ts                 # Agent profile database model
│   ├── agent-transaction.entity.ts     # Agent transaction records
│   ├── agent-settlement.entity.ts      # Commission and settlement records
│   ├── agent-location.entity.ts        # Geographic location data
│   ├── agent-training.entity.ts        # Training and certification records
│   └── agent-compliance.entity.ts      # Compliance monitoring records
├── dto/
│   ├── agent-registration.dto.ts       # Agent registration validation
│   ├── cash-transaction.dto.ts         # Cash-in/cash-out validation
│   ├── settlement-request.dto.ts       # Commission settlement validation
│   └── compliance-report.dto.ts        # Compliance reporting validation
└── guards/
    ├── agent-verification.guard.ts     # Agent verification status
    └── transaction-limits.guard.ts     # Transaction amount limits
```

### Agent Network Flow Architecture

#### 1. Agent Onboarding Flow

```typescript
// Agent registration and KYC process
POST /api/agents/register
{
  "businessName": "John's Mobile Services",
  "ownerName": "John Doe",
  "businessType": "retail_shop",
  "location": {
    "latitude": -1.286389,
    "longitude": 36.817223,
    "address": "Main Street, Nairobi"
  },
  "documents": {
    "businessLicense": "base64_encoded_document",
    "ownerID": "base64_encoded_id",
    "bankStatement": "base64_encoded_statement"
  },
  "contactInfo": {
    "phone": "+254700000000",
    "email": "john@mobileshop.co.ke"
  }
}
```

#### 2. Cash-In/Cash-Out Transaction Flow

```typescript
// User deposits cash with agent
POST /api/agents/transactions/cash-in
{
  "userHandle": "@mary_nairobi",
  "amount": 5000.00,
  "currency": "KES",
  "targetAsset": "BSV", // or "MNEE_USD"
  "agentId": "agent_uuid",
  "userVerification": "PIN_verification",
  "agentVerification": "biometric_confirmation"
}
```

#### 3. Agent Transaction Processing Flow

1. **User Identification**: Verify user identity through handle or phone number
2. **Amount Validation**: Check transaction limits based on user KYC tier and agent capacity
3. **Rate Calculation**: Calculate real-time fiat-to-crypto conversion rate
4. **Transaction Authorization**: Multi-factor verification (PIN, biometric, SMS)
5. **Blockchain Processing**: Execute blockchain transaction for user wallet credit
6. **Agent Settlement**: Calculate and credit agent commission instantly
7. **Compliance Monitoring**: Real-time AML monitoring and reporting
8. **Notification**: Send receipts to both user and agent

### Agent Network Security Architecture

#### Agent Verification Security

-   **Multi-tier KYC**: Enhanced due diligence for agent onboarding
-   **Biometric Authentication**: Fingerprint and facial recognition for transactions
-   **Location Verification**: GPS validation for agent location accuracy
-   **Document Verification**: AI-powered document authenticity checks

#### Transaction Security

-   **Two-Factor Authentication**: Agent PIN + biometric confirmation
-   **Transaction Limits**: Dynamic limits based on agent tier and liquidity
-   **Real-time Fraud Detection**: ML-based suspicious activity monitoring
-   **Blockchain Settlement**: Immutable transaction records and instant settlement

### Agent Network Database Design

#### Core Tables

```sql
-- Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, terminated
    tier VARCHAR(20) DEFAULT 'basic', -- basic, premium, super_agent
    commission_rate DECIMAL(5,4) DEFAULT 0.0050, -- 0.5% default
    kyc_status VARCHAR(20) DEFAULT 'pending',
    verification_documents JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Locations
CREATE TABLE agent_locations (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    country VARCHAR(3), -- ISO country code
    postal_code VARCHAR(20),
    operating_hours JSONB, -- Business hours
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Transactions
CREATE TABLE agent_transactions (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    user_id UUID REFERENCES users(id),
    transaction_type VARCHAR(20) NOT NULL, -- cash_in, cash_out
    fiat_amount DECIMAL(18,8) NOT NULL,
    fiat_currency VARCHAR(3) NOT NULL,
    crypto_amount DECIMAL(18,8) NOT NULL,
    crypto_asset VARCHAR(10) NOT NULL,
    conversion_rate DECIMAL(18,8) NOT NULL,
    agent_commission DECIMAL(18,8) NOT NULL,
    blockchain_tx_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Settlements
CREATE TABLE agent_settlements (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    settlement_period_start TIMESTAMP NOT NULL,
    settlement_period_end TIMESTAMP NOT NULL,
    total_transactions INTEGER NOT NULL,
    total_volume DECIMAL(18,8) NOT NULL,
    total_commission DECIMAL(18,8) NOT NULL,
    settlement_amount DECIMAL(18,8) NOT NULL,
    settlement_currency VARCHAR(10) NOT NULL, -- BSV, MNEE_USD
    blockchain_tx_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Training Records
CREATE TABLE agent_training (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    training_module VARCHAR(100) NOT NULL,
    completion_status VARCHAR(20) DEFAULT 'in_progress',
    score INTEGER, -- Training assessment score
    completed_at TIMESTAMP,
    expires_at TIMESTAMP, -- Certification expiry
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Compliance Monitoring
CREATE TABLE agent_compliance (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    monitoring_type VARCHAR(50) NOT NULL,
    risk_score INTEGER, -- 1-100 risk assessment
    alert_level VARCHAR(20), -- low, medium, high, critical
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Agent Network Performance Optimization

#### Caching Strategy

```typescript
// Redis-based agent caching
- Agent locations (by geography): 15 minute TTL
- Agent availability status: 30 second TTL
- Agent commission rates: 60 minute TTL
- Agent transaction limits: 5 minute TTL
- Real-time liquidity status: 10 second TTL
```

#### Database Optimization

-   **Geospatial indexing** for agent location queries
-   **Partitioning** of agent_transactions by date
-   **Composite indexes** on agent_id, status, created_at
-   **Read replicas** for agent analytics and reporting

### Integration with Core Modules

#### Agent Network ↔ Compliance Integration

```typescript
// Real-time AML monitoring for agent transactions
@AgentTransactionMonitor()
async processAgentTransaction(
  @Agent() agent: Agent,
  @User() user: User,
  @TransactionData() transactionDto: CashTransactionDto
) {
  // Monitor for suspicious patterns
  // Check sanctions lists for both agent and user
  // Generate compliance alerts if necessary
  // Update risk scores for both parties
}
```

#### Agent Network ↔ Wallets Integration

```typescript
// Credit user wallet after cash-in transaction
async processCashInTransaction(
  agentTransaction: AgentTransaction
) {
  // Credit user's BSV or MNEE USD wallet
  // Update user wallet balance
  // Create blockchain transaction record
  // Credit agent commission
  // Send receipts to both parties
}
```

#### Agent Network ↔ Notifications Integration

-   **Transaction receipts** for both user and agent
-   **Settlement notifications** for commission payments
-   **Compliance alerts** for suspicious activities
-   **Training reminders** and certification updates
-   **Liquidity alerts** when agent cash runs low

### Agent Network Analytics & Monitoring

#### Business Metrics

-   **Agent network growth** (new agents per month)
-   **Agent transaction volume** by region and agent type
-   **Agent retention rates** and churn analysis
-   **Average agent earnings** and commission analysis
-   **Cash-in vs cash-out ratios** by location
-   **Agent performance ratings** and user satisfaction

#### Technical Metrics

-   **Transaction processing times** (<30 seconds target)
-   **Agent app performance** (loading times, crash rates)
-   **Settlement processing speed** (<60 seconds target)
-   **Compliance monitoring accuracy** (false positive rates)

### Competitive Advantages Through Agent Network

#### vs. M-Pesa Agent Network

-   **Real-time settlement** vs next-day settlement for agents
-   **Modern mobile app** vs basic SMS/USSD interfaces
-   **Enhanced analytics** vs limited reporting capabilities
-   **Cross-border interoperability** vs Kenya-focused operations
-   **Blockchain transparency** vs opaque settlement processes

#### vs. MTN Money Agent Network

-   **Unified cross-country operations** vs fragmented country systems
-   **Competitive commission rates** vs fixed telecom operator rates
-   **Independent operation** vs carrier-dependent infrastructure
-   **Global liquidity access** vs local currency limitations

#### vs. Traditional Banking Agents

-   **24/7 availability** vs banking hours restrictions
-   **Lower barriers to entry** vs high capital requirements
-   **Instant settlements** vs delayed batch processing
-   **Digital-first approach** vs paper-based processes

#### Microservices Structure (if chosen)

```
apps/
├── auth-service/
├── user-service/
├── data-service/
└── gateway-service/
```

## Data Architecture

### Database Design

-   **Primary Database**: PostgreSQL 15+ (ACID compliance, JSON support, mature ecosystem)
-   **Caching Layer**: Redis 7+ (high-performance caching and session storage)
-   **File Storage**: MinIO (S3-compatible, self-hosted object storage)
-   **Database Connection**: Prisma ORM (type-safe database access)

### Data Flow

1. Mobile app → API Gateway/Backend
2. Backend → Database Layer
3. Backend → External Services (if applicable)
4. Response flow back to mobile app

## Security Architecture

### Authentication & Authorization

-   **Authentication Method**: JWT + Passport.js with NestJS guards
-   **Social Authentication**: Google OAuth 2.0, Facebook Login, Apple Sign-In integration
-   **Session Management**: Redis-based session storage
-   **Role-Based Access Control**: Custom NestJS decorators and guards
-   **Multi-Factor Auth**: TOTP + SMS + Biometric integration

### Data Protection

-   **Encryption at Rest**: AES-256 encryption for sensitive data
-   **Encryption in Transit**: TLS 1.3 for all communications
-   **API Security**: Rate limiting, input validation, OAuth 2.0
-   **Mobile Security**: Certificate pinning, secure storage, biometric auth
-   **Gaming Compliance**: Enhanced data protection for gaming transaction data
-   **AML/CTF Data Security**: Encrypted storage of compliance monitoring data

## Integration Architecture

### Internal Communication

-   **API Protocol**: REST with NestJS built-in validation and serialization
-   **Real-time Communication**: WebSocket + Socket.io for chat and notifications
-   **Message Format**: JSON with TypeScript interfaces
-   **Error Handling**: NestJS exception filters with standardized error responses
-   **Rate Limiting**: NestJS throttler guards
-   **API Gateway**: Kong or NGINX for traffic routing, SSL termination, rate limiting, and authentication
-   **Service Discovery**: Docker Swarm built-in service discovery

### External Integrations

-   **KYC/AML Providers**: Jumio, Onfido, Veriff for identity verification (integrated via compliance-lib)
-   **Blockchain Processing**: Bitcoin SV nodes, MNEE USD network integration
-   **Fiat On-Ramp**: Generic provider adapters for cards, digital wallets, and bank transfers (no third-party processors in core flows)
-   **Banking Partners**: ACH, SEPA, wire transfer providers for bank-to-crypto funding
-   **Mobile Money**: M-Pesa, MTN Money, Airtel Money for regional fiat on-ramps
-   **Agent Network Services**:
    -   Geographic Information Systems (GIS) for agent mapping and location services
    -   SMS providers for agent notifications and two-factor authentication
    -   Biometric verification systems for agent transaction authentication
    -   Document verification services for agent KYC and business license validation
    -   Training platform providers for agent education and certification programs
    -   Local business registration databases for agent verification
-   **Digital Product Aggregators**: Gift card and digital service providers (including gaming platforms)
-   **Compliance Services**: OFAC, UN, EU sanctions screening APIs
-   **Blockchain Networks**: Bitcoin SV nodes, MNEE USD API integration
-   **Analytics**: Real-time transaction monitoring, digital purchase behavior analytics
-   **Push Notifications**: Firebase Cloud Messaging with purchase alerts
-   **Regulatory Reporting**: Automated AML/CTF reporting to financial intelligence units
-   **Message Queuing**: Redis Pub/Sub for real-time events + BullMQ for background jobs
-   **Event Streaming**: Redis Streams for audit logs and transaction history

## Infrastructure Architecture

### Development Environment

-   **Local Development**: NX workspace with hot reload
-   **Database**: Docker Compose with PostgreSQL + Redis
-   **External Services**: Mock services using MSW (Mock Service Worker)
-   **Container Platform**: Docker with multi-stage builds

### Production Environment

-   **Cloud Provider**: Multi-cloud capable (AWS/GCP/Azure/DigitalOcean)
-   **Container Orchestration**: Kubernetes (industry-standard, production-ready scaling)
-   **API Gateway & Load Balancer**: Kong
-   **CDN**: CloudFlare or self-hosted CDN with MinIO
-   **Monitoring**: Sentry (error tracking) + Grafana (metrics)
-   **Secrets Management**: HashiCorp Vault

#### Cloud-Agnostic Architecture with Kubernetes

The Goji platform is designed with a **cloud-agnostic architecture** using Kubernetes as the primary orchestration platform to ensure vendor independence, portability, and operational flexibility. Kubernetes provides consistent deployment and management capabilities across all major cloud providers.

**Kubernetes Advantages:**

-   **Portability**: Deploy consistently across AWS, GCP, Azure, and on-premise environments
-   **Scalability**: Industry-standard auto-scaling and resource management
-   **Ecosystem**: Rich ecosystem of tools, operators, and integrations
-   **Operational Maturity**: Proven at scale with extensive community support

**Implementation Strategy:**

-   Use Kubernetes native resources and standard APIs for maximum portability
-   Leverage Infrastructure as Code (IaC) with Terraform for cloud-agnostic infrastructure provisioning
-   Implement Kubernetes operators for complex application lifecycle management
-   Use cloud-agnostic storage and networking solutions where possible
-   Regular evaluation of managed Kubernetes services (EKS, GKE, AKS) vs self-managed clusters

## Scalability Considerations

### Horizontal Scaling

-   **API Gateway & Load Balancing**: Kong with Kubernetes ingress and load balancing
-   **Database Scaling**: PostgreSQL read replicas + connection pooling (PgBouncer)
-   **Caching Strategy**: Redis Cluster for distributed caching
-   **Message Queue Scaling**: Redis Pub/Sub with multiple worker instances

### Performance Optimization

-   **Frontend**: Bundle splitting, lazy loading
-   **Backend**: Database indexing, query optimization
-   **Infrastructure**: Auto-scaling, CDN usage

## Technology Stack Summary

| Layer                   | Technology                                 | Rationale                                                  |
| ----------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| Mobile Frontend         | React Native + TypeScript                  | Cross-platform development with type safety                |
| UI Framework            | Custom Components + React Native Elements  | Chat-first design optimized for young users                |
| State Management        | Zustand + React Query                      | Simple state with efficient server state caching           |
| Real-time Communication | WebSocket + Socket.io                      | Low-latency chat and transaction notifications             |
| Backend API             | NestJS + TypeScript + Passport.js          | Scalable architecture with built-in auth and validation    |
| Database                | PostgreSQL 15+                             | ACID compliance, JSON support, mature ecosystem            |
| Caching                 | Redis 7+                                   | High-performance caching and session storage               |
| ORM                     | Prisma                                     | Type-safe database access with excellent tooling           |
| Message Queue           | Redis Pub/Sub + BullMQ                     | Simple queuing leveraging existing Redis infrastructure    |
| Blockchain              | Bitcoin SV + MNEE USD                      | Low-fee blockchain with stable coin integration            |
| Authentication          | JWT + Passport + Social Login + Biometrics | NestJS-native auth with social providers and modern UX     |
| File Storage            | MinIO (S3-compatible)                      | Self-hosted, cloud-agnostic object storage                 |
| Container Platform      | Docker + Kubernetes                        | Industry-standard orchestration, cloud-agnostic deployment |
| API Gateway             | Kong                                       | High-performance traffic management and routing            |
| CI/CD                   | GitHub Actions                             | Automated testing and deployment pipeline                  |
| Monitoring              | Sentry + Grafana + Prometheus              | Error tracking and metrics visualization                   |
| Logging                 | Grafana Loki + Winston                     | Lightweight log aggregation                                |
| Infrastructure          | Multi-Cloud (Kubernetes)                   | Cloud-agnostic with disaster recovery                      |
| Secrets Management      | HashiCorp Vault                            | Secure secrets storage and rotation                        |
| Transaction Processing  | Bitcoin SV + MNEE USD APIs                 | Blockchain transaction capabilities                        |
| KYC/AML                 | Jumio + Onfido + Veriff                    | Multi-provider identity verification                       |
| Localization            | i18next + Professional Translation         | 100+ language support with cultural adaptation             |

## Architecture Decision Records (ADRs)

### ADR-001: Kubernetes Infrastructure Stack

-   **Status**: Accepted
-   **Date**: July 2025
-   **Context**: Need cloud-agnostic, scalable infrastructure for global mobile wallet platform handling financial transactions across multiple regions with high availability requirements
-   **Decision**: Kubernetes over Docker Swarm, Redis-based messaging over Kafka
-   **Rationale**:
    -   **Industry Standard**: Kubernetes is the de facto container orchestration platform with extensive community support and enterprise adoption
    -   **Cloud Agnostic**: Native support across all major cloud providers (AWS EKS, Google GKE, Azure AKS, DigitalOcean DOKS) enabling multi-cloud strategy
    -   **Scalability**: Horizontal Pod Autoscaler (HPA) and Vertical Pod Autoscaler (VPA) for dynamic scaling based on demand
    -   **Service Discovery**: Built-in service discovery and load balancing essential for microservices communication
    -   **Configuration Management**: ConfigMaps and Secrets for secure configuration management without code changes
    -   **Rolling Updates**: Zero-downtime deployments critical for financial services with 99.9% uptime requirements
    -   **Ecosystem**: Rich ecosystem of operators (PostgreSQL, Redis, monitoring) reducing operational complexity
    -   **Compliance**: Extensive security features and audit capabilities required for financial services compliance
-   **Alternatives Considered**:
    -   **Docker Swarm**: Rejected due to limited cloud provider support, smaller ecosystem, and weaker scaling capabilities
    -   **Cloud-Specific Orchestration**: Rejected to avoid vendor lock-in and enable multi-region deployment across providers
-   **Consequences**:
    -   **Positive**: Industry-standard orchestration, better scalability, extensive ecosystem, cloud-agnostic deployment, strong security model
    -   **Negative**: Higher operational complexity initially, requires Kubernetes expertise, more resource overhead than simpler solutions

### ADR-002: Kong API Gateway

-   **Status**: Accepted
-   **Date**: July 2025
-   **Context**: Need high-performance, specialized traffic management for global mobile wallet platform handling thousands of concurrent users and financial transactions with strict security, compliance, and performance requirements
-   **Decision**: Use Kong API Gateway instead of NestJS-based gateway or NGINX
-   **Rationale**:
    -   **Performance**: Kong written in C/Lua optimized for tens of thousands of concurrent connections with minimal latency (<5ms overhead)
    -   **Kubernetes Integration**: Native Kubernetes Ingress Controller with CRDs (Custom Resource Definitions) for GitOps-friendly configuration management
    -   **Separation of Concerns**: Clean separation between infrastructure (gateway) and application (NestJS business logic)
        -   Gateway handles: SSL termination, rate limiting, authentication validation, routing, security policies, request/response transformation
        -   NestJS handles: Business logic, database operations, blockchain integration after requests are validated and routed
    -   **Plugin Ecosystem**: 200+ plugins for security, traffic control, analytics, transformations, and monitoring
        -   Essential plugins: JWT authentication, rate limiting, CORS, request/response transformers, monitoring
        -   Financial services specific: IP restrictions, geographic blocking, transaction logging, fraud detection integration
    -   **Security Features**: Built-in security policies, WAF capabilities, certificate management, and compliance logging
    -   **Multi-Environment**: Consistent gateway behavior across development, staging, and production environments
    -   **Observability**: Native integration with Prometheus, Grafana, and distributed tracing systems
    -   **Cloud-Native**: Designed for containerized, microservices architectures with horizontal scaling capabilities
-   **Alternatives Considered**:
    -   **NestJS-based Gateway**: Rejected due to mixing infrastructure concerns with business logic, limited performance at scale
    -   **NGINX**: Rejected due to limited plugin ecosystem, complex configuration management, and lack of native Kubernetes integration
    -   **Cloud Provider Gateways**: Rejected to maintain cloud-agnostic architecture and avoid vendor lock-in
    -   **Envoy Proxy**: Rejected due to complexity of configuration and limited out-of-the-box functionality for financial services
-   **Consequences**:
    -   **Positive**: Superior performance at scale, cleaner architecture, excellent Kubernetes integration, extensive plugin capabilities, strong security model, compliance-ready logging
    -   **Negative**: Additional infrastructure component to manage, requires Kong-specific knowledge, licensing considerations for enterprise features

## Migration and Deployment Strategy

### Deployment Pipeline

1. **Development**: Local NX workspace with Docker Compose and local Kubernetes (kind/minikube)
2. **Testing**: GitHub Actions CI/CD with automated testing and Kubernetes manifests validation
3. **Staging**: Kubernetes staging cluster with Helm deployments
4. **Production**: Multi-region Kubernetes deployment with blue-green strategy using Argo CD

### Rollback Strategy

-   **Database Migrations**: Reversible migrations with Prisma
-   **Application Rollback**: Kubernetes rolling updates with health checks and readiness probes
-   **Feature Toggles**: NestJS configuration service with Kubernetes ConfigMaps and environment variables

## Monitoring and Observability

### Logging

-   **Log Aggregation**: Grafana Loki (lightweight alternative to ELK)
-   **Log Levels**: Error, Warn, Info, Debug
-   **Structured Logging**: JSON format with Winston
-   **Error Tracking**: Sentry for real-time error monitoring

### Metrics

-   **Application Metrics**: Prometheus with NestJS metrics middleware
-   **Infrastructure Metrics**: Node Exporter + Docker metrics
-   **Business Metrics**: Custom metrics for transactions, user activity
-   **Visualization**: Grafana dashboards

### Alerting

-   **Error Rates**: >1% error rate triggers alerts
-   **Performance**: >500ms API response time alerts
-   **Infrastructure**: >80% CPU/Memory usage alerts
-   **Transaction Alerts**: Failed blockchain transaction monitoring
-   **Notification System**: Sentry + Grafana alerting + PagerDuty integration

## Performance Requirements

### Response Time Targets

-   **API Responses**: <200ms for 95th percentile
-   **Transaction Processing**: <60 seconds end-to-end
-   **Chat Messages**: <100ms delivery time
-   **App Launch**: <3 seconds cold start
-   **Screen Transitions**: <300ms navigation

### Scalability Targets

-   **Concurrent Users**: 10,000+ simultaneous active users
-   **Transaction Throughput**: 1,000+ transactions per second
-   **User Growth**: Support 100,000+ users within first year
-   **Geographic Distribution**: Multi-region deployment

### Availability Requirements

-   **Uptime**: 99.9% (8.76 hours downtime per year)
-   **RTO**: 4 hours (Recovery Time Objective)
-   **RPO**: 1 hour (Recovery Point Objective)
-   **Maintenance Windows**: Monthly 2-hour scheduled maintenance

---

## See Also

### Related Technical Documentation

-   **[Backend Architecture](backend-architecture.md)** - Detailed NestJS backend implementation and module design
-   **[Frontend Architecture](frontend-architecture.md)** - React Native mobile app architecture and component structure
-   **[API Design](api-design.md)** - Complete API specifications and endpoint documentation
-   **[Database Schema](database-schema.md)** - Comprehensive data model and relationship definitions
-   **[Deployment Guide](deployment-guide.md)** - Step-by-step deployment procedures and infrastructure setup
-   **[Testing Strategy](testing-strategy.md)** - Testing methodologies and quality assurance approaches

### Product & Business Context

-   **[Product Requirements](../product/product-requirements.md)** - Feature specifications driving technical decisions
-   **[Product Vision](../product/product-vision.md)** - Strategic context and market positioning
-   **[BMAD PRDs](../bmad/prds/README.md)** - Detailed feature requirements with technical implications
-   **[Competitive Analysis](../market/competitive-analysis.md)** - Technical advantages over mobile money operators

### Development Process

-   **[Development Workflow](development-workflow.md)** - Team processes and development environment setup
-   **[Git Strategy](git-strategy.md)** - Version control and collaboration guidelines
-   **[BMAD Integration Guide](bmad-integration-guide.md)** - AI-driven development methodology integration

### Security & Compliance

-   **[Security Documentation](../security/README.md)** - Security architecture and compliance requirements
-   **[Compliance Documentation](../compliance/README.md)** - Regulatory compliance framework

### Operations & Infrastructure

-   **[Operations Strategy](../operations/remote-operational-strategy.md)** - Operational procedures and team management
-   **[N8N Integration Architecture](n8n-integration-architecture.md)** - Workflow automation and integration patterns

---

**Document Status**: Living document updated with architectural evolution  
**Last Updated**: August 2025  
**Next Review**: November 2025  
**Owner**: Technical Team  
**Reviewers**: Architecture Committee
