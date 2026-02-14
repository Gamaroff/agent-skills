# Blockchain Implementation Guide (BSV)

A living document outlining how Goji will integrate with the Bitcoin SV (BSV) blockchain. This guide defines standards, configuration, and operational procedures for BSV integration. It is a high-level skeleton with placeholders to be completed as designs and decisions are finalized.

- Back to Architecture Overview: [Backend Architecture](./backend-architecture.md)

---

## 1. Purpose & Scope
- Goal: Define the end-to-end approach for integrating BSV into the Goji backend.
- In-scope: Address/key management, transaction flow, fee/UTXO handling, status monitoring, security, testing, deployment.
- Out-of-scope (for now): Non-BSV chains, L2 solutions, custodial third-party wallets.

## 2. Status
- Current status: Draft skeleton
- Decision log summary: TODO
- Owners: TODO

## 3. Prerequisites
- NestJS backend and module boundaries established
- Database available (PostgreSQL + Prisma)
- Environment/config management in place
- Access to selected BSV providers (TBD)

## 4. High-Level Architecture
- Overview diagram: TODO (add sequence/flow diagram)
- Components: `WalletsService`, provider adapters, transaction queue/worker, persistence, monitoring.
- Data flow summary: TODO

## 5. BSV Integration Options (SDKs/Providers)
- Evaluation criteria: reliability, features, cost, SLA, maintenance
- Candidates to assess: TODO
  - Example placeholders: "BSV JavaScript libraries", "Hosted API providers", "Self-hosted indexers"
- Selected provider(s): TODO
- Rationale and trade-offs: TODO

## 6. Keys, Addresses, and Wallets
- Key management strategy: TODO (custodial vs non-custodial, HSM/KMS, derivation paths)
- Address types and formats: TODO
- HD wallet considerations (BIP32/BIP44): TODO
- Backup/rotation policy: TODO

## 7. Transaction Lifecycle
- Create/build transaction: TODO
- Fee estimation: TODO
- UTXO management: TODO
- Broadcast and retry: TODO
- Confirmations and reorg handling: TODO
- Idempotency and deduplication: TODO

## 8. Fees & UTXO Strategy
- Fee rate source: TODO
- Dust limits and outputs policy: TODO
- Consolidation strategy: TODO

## 9. Events, Notifications, and Webhooks
- Incoming transaction detection: TODO
- Confirmations update flow: TODO
- Outbound transaction status updates: TODO

## 10. Security Considerations
- Secrets and key storage: TODO
- Signing boundaries and least privilege: TODO
- Input validation and anti-abuse controls: TODO
- Rate limits for sensitive endpoints: TODO

## 11. Testing Strategy
- Unit tests (mocks/fakes): TODO
- Integration tests (testnet/regtest): TODO
- E2E tests and simulators: TODO
- Test data and fixtures: TODO

## 12. Configuration & Environments
- Environment variables: TODO (e.g., provider endpoints, fee policies)
- Network selection: TODO (mainnet/testnet/regtest)
- Feature flags: TODO

## 13. Deployment & Infrastructure
- Runtime dependencies: TODO (indexers, nodes, external APIs)
- Scaling considerations: TODO (throughput, queueing, retries)
- Disaster recovery: TODO

## 14. Monitoring & Observability
- Metrics: TODO (tx success rate, confirmation latency, UTXO growth)
- Logs and tracing: TODO
- Alerts: TODO

## 15. Data Model Implications
- Prisma models impacted: TODO (wallets, transactions, addresses, UTXOs)
- Migration plan: TODO

## 16. Compliance & Risk
- KYC/AML touchpoints: TODO
- Sanctions screening: TODO
- Custody/compliance considerations: TODO

## 17. Open Questions
- Provider selection finalization: TODO
- Signing boundary ownership: TODO
- Fee policy in production: TODO

## 18. Glossary
- UTXO: TODO
- Fee rate: TODO
- Confirmation: TODO

## 19. References & See Also
- Backend Architecture: [backend-architecture.md](./backend-architecture.md)
- Core Framework Guide: [core-framework-guide.md](./core-framework-guide.md)
- Database Guide: [database-guide.md](./database-guide.md)
- Infrastructure Guide: [infrastructure-guide.md](./infrastructure-guide.md)

---

## 20. Group System Smart Contract Integration

### Overview

Goji's Group System (Betting Pools and Savings Groups) leverages BSV blockchain smart contracts for automated escrow, transparent execution, and cryptographic proof of fairness while maintaining full regulatory compliance.

**See**: [Group System Smart Contract Integration Guide](../prd/core-platform/group-system/smart-contract-integration.md)

### Escrow Patterns

**Betting Pools (Epic 5):**
- Automated bet collection and escrow on-chain
- Smart contract-managed pool balance
- Automated payout distribution upon outcome resolution
- Multi-signature freeze/seize for regulatory compliance

**Savings Groups (Epic 6):**
- Automated contribution collection on recurring schedule
- Smart contract-powered rotating distributions (lottery/round-robin)
- On-chain democratic governance voting
- Emergency fund management with member approval

### Multi-Signature Schemes

**Key Types:**
- **Platform Key**: Operational control (normal operations)
- **Regulatory Key**: Compliance authority (freeze/seize only)
- **User Keys**: Participant signatures (bets, contributions, votes)

**Threshold Requirements:**
- Normal operations: Platform key (1-of-1)
- Governance changes: Member quorum (configurable, default 60%)
- Regulatory freeze: Platform + Regulatory keys (2-of-3)
- Fund seizure: Regulatory key + Legal documentation

### Transaction Lifecycle for Group-Based Smart Contracts

**Deployment:**
1. Platform deploys contract to BSV blockchain
2. Contract address stored in database (betting_pools or groups table)
3. Multi-sig keys configured
4. Initial parameters set (pool rules, contribution schedule, etc.)

**Active Operation:**
1. User transactions (bets, contributions, votes) signed with user keys
2. Platform submits signed transactions to smart contract
3. Contract validates and executes (escrow funds, record votes, etc.)
4. Blockchain confirmation monitored
5. Platform database synchronized with on-chain state

**Resolution/Distribution:**
1. Trigger event (pool outcome, contribution round complete, vote deadline)
2. Platform or smart contract initiates resolution
3. Automated execution (payouts, distributions, proposal execution)
4. On-chain confirmations validated
5. Users notified, database updated

**Compliance Actions (If Needed):**
1. Platform detects suspicious activity or receives legal order
2. Multi-sig freeze transaction prepared (platform + regulatory keys)
3. Smart contract freezes pool/group (no new transactions allowed)
4. Investigation proceeds off-chain
5. Resolution: Unfreeze or seize funds based on outcome

### Integration with Existing Architecture

**Shared Components:**
- Leverage existing BSV blockchain infrastructure
- Use existing wallet and transaction systems for user key management
- Integrate with compliance and KYC/AML systems
- Utilize existing monitoring and logging infrastructure

**New Components:**
- SmartContractService: Shared service for contract deployment and interaction
- BettingPoolSmartContractService: Betting pool-specific blockchain operations
- SavingsGroupSmartContractService: Savings group-specific blockchain operations
- Multi-signature coordination service
- Contract event monitoring and synchronization

### Security Considerations

**Smart Contract Security:**
- Third-party security audits mandatory (before mainnet deployment)
- Formal verification of critical functions
- Extensive testnet testing (3+ months for long-running contracts)
- Upgrade mechanisms for bug fixes
- Insurance coverage for smart contract failures

**Key Management:**
- Platform keys in Hardware Security Module (HSM)
- Multi-person approval for platform key usage
- Regulatory keys managed by separate compliance authority
- User keys never accessed by platform (signature verification only)
- Regular key rotation schedule

**Compliance & Non-DeFi Positioning:**
- Platform retains full regulatory compliance capabilities
- Multi-signature controls enable freeze/seize operations
- All participants must complete KYC/AML before smart contract access
- Geographic restrictions enforced at platform level
- Platform can override smart contract for member protection (emergency)

### Data Model Implications

**Smart Contract Integration Tables:**

```sql
-- Betting Pools
ALTER TABLE betting_pools ADD COLUMN smart_contract_address VARCHAR(255) NULL;
ALTER TABLE betting_pools ADD COLUMN smart_contract_config JSONB NULL;

CREATE TABLE betting_pool_blockchain_transactions (
    id UUID PRIMARY KEY,
    pool_id UUID REFERENCES betting_pools(id),
    transaction_type VARCHAR(30) NOT NULL,
    blockchain_tx_hash VARCHAR(255) NOT NULL,
    blockchain_network VARCHAR(20) DEFAULT 'BSV',
    transaction_status VARCHAR(20) DEFAULT 'pending',
    amount DECIMAL(15,2) NOT NULL,
    gas_fee DECIMAL(15,8) DEFAULT 0,
    confirmation_count INTEGER DEFAULT 0,
    block_height INTEGER NULL,
    user_id UUID REFERENCES users(id) NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP NULL
);

-- Savings Groups
ALTER TABLE groups ADD COLUMN savings_smart_contract_address VARCHAR(255) NULL;
ALTER TABLE groups ADD COLUMN savings_smart_contract_config JSONB NULL;

CREATE TABLE savings_blockchain_transactions (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES groups(id),
    transaction_type VARCHAR(30) NOT NULL,
    blockchain_tx_hash VARCHAR(255) NOT NULL,
    blockchain_network VARCHAR(20) DEFAULT 'BSV',
    transaction_status VARCHAR(20) DEFAULT 'pending',
    amount DECIMAL(15,2) NULL,
    gas_fee DECIMAL(15,8) DEFAULT 0,
    confirmation_count INTEGER DEFAULT 0,
    block_height INTEGER NULL,
    member_id UUID REFERENCES users(id) NULL,
    round_number INTEGER NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP NULL
);

-- Compliance Actions (Shared)
CREATE TABLE smart_contract_compliance_actions (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL, -- betting_pool, savings_group
    entity_id UUID NOT NULL,
    action_type VARCHAR(30) NOT NULL, -- freeze, unfreeze, seize
    initiated_by UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    blockchain_tx_hash VARCHAR(255) NULL,
    approval_required BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES users(id) NULL,
    approved_at TIMESTAMP NULL,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Testing Strategy

**Smart Contract Testing:**
- Unit tests for all contract functions (95%+ coverage)
- Integration tests on BSV testnet (4-8 weeks)
- Long-cycle testing for savings groups (3+ month simulations)
- Security audits by third-party firms
- Penetration testing and vulnerability assessments

**Platform Integration Testing:**
- End-to-end workflow testing (bet placement, contribution collection, etc.)
- Multi-sig coordination testing
- Compliance action testing (freeze/seize workflows)
- Database synchronization testing
- Error handling and retry mechanism testing

### Monitoring & Observability

**Key Metrics:**
- Smart contract execution reliability (target: >99.9%)
- Blockchain transaction success rate (target: >99.5%)
- Gas fee efficiency (target: <0.2% of transaction value)
- Average confirmation time (target: <15 minutes)
- Contract balance accuracy (target: 100% match with database)

**Alerting:**
- Failed transactions (immediate alert)
- Unusual gas fee spikes (within 1 hour)
- Large unexpected balance changes (immediate alert)
- Multi-sig key usage (all usage logged and alerted)
- Contract freeze/seize actions (immediate executive notification)

### Related Documentation

- [Group System Smart Contract Integration Guide](../prd/core-platform/group-system/smart-contract-integration.md)
- [Epic 5: Betting Pools & Prediction Markets](../prd/core-platform/group-system/epics/epic.5.betting-pools-prediction-markets.md)
- [Epic 6: Savings Groups & ROSCA Digitization](../prd/core-platform/group-system/epics/epic.6.savings-groups-rosca-digitization.md)

---

## 21. TODO Checklist (to complete this guide)
- [ ] Select and document BSV provider(s)
- [ ] Define key management and signing architecture
- [ ] Specify transaction building/broadcasting flow
- [ ] Establish fee estimation and UTXO policies
- [ ] Implement monitoring, logging, and alerting
- [ ] Finalize data models and migrations
- [ ] Define testing approach (testnet/regtest)
- [ ] Complete security review and threat model
- [ ] Write operational runbooks
- [ ] **Complete smart contract deployment procedures for group system**
- [ ] **Establish multi-signature key management processes**
- [ ] **Define smart contract upgrade and migration procedures**
