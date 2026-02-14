---
skill: docker
description: Comprehensive Docker administration and troubleshooting for the Goji system. Manages development, test, and production environments with PostgreSQL, Redis, and monitoring stack.
type: project
---

# Docker Administration Skill

Expert Docker administration for the Goji system's multi-environment infrastructure (development, test, production).

## Quick Reference

### Most Common Operations

```bash
# Development Environment (first time)
npm run docker:setup

# Development Environment (daily use)
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d
docker compose -f docker/docker-compose.dev.yml -p goji-system logs -f

# Testing (automated)
npm run test:local                    # All tests with isolated database
npm run test:local:coverage           # With coverage reports

# Troubleshooting
docker logs goji-postgres          # Check database logs
docker logs goji-api               # Check API logs
docker stats                          # Resource usage
docker compose -f docker/docker-compose.dev.yml -p goji-system down -v  # Clean slate
```

**CRITICAL**: Always use `-p goji-system` with docker-compose commands for consistent naming.

## Architecture Overview

### Service Stack

**Development** (ports 3000, 5432, 6379, 5050, 8082):
- goji-api (Node.js 24, hot-reload)
- goji-postgres (PostgreSQL 16)
- goji-redis (Redis 8)
- goji-pgadmin (database UI)
- goji-redis-commander (Redis UI)

**Test** (ports 5433, 6380 - non-conflicting):
- goji-postgres-test (isolated test database)
- goji-redis-test (isolated test cache)

**Production** (with monitoring):
- goji-api (3 replicas, load balanced)
- goji-postgres (production-tuned)
- goji-redis (with auth)
- goji-nginx (reverse proxy, SSL)
- goji-prometheus (metrics)
- goji-grafana (dashboards)
- ELK stack (logging)
- backup service (automated daily backups)

## Environment Management

### Development Environment

#### First-Time Setup
```bash
# Automated setup (recommended)
npm run docker:setup

# What it does:
# 1. Validates Docker installation
# 2. Generates secure secrets (JWT, encryption keys)
# 3. Detects local IP for mobile development
# 4. Starts all containers
# 5. Runs health checks
# 6. Executes Prisma migrations
# 7. Displays service info
```

#### Manual Start
```bash
# Start all services
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d

# View logs (all services)
docker compose -f docker/docker-compose.dev.yml -p goji-system logs -f

# View specific service logs
docker compose -f docker/docker-compose.dev.yml -p goji-system logs -f goji-api
docker compose -f docker/docker-compose.dev.yml -p goji-system logs -f goji-postgres

# Stop services (preserve data)
docker compose -f docker/docker-compose.dev.yml -p goji-system down

# Stop and remove volumes (clean slate)
docker compose -f docker/docker-compose.dev.yml -p goji-system down -v
```

#### Service Access
```
API:              http://localhost:3000
PostgreSQL:       localhost:5432 (goji/goji/goji)
Redis:            localhost:6379
PgAdmin:          http://localhost:5050 (admin@goji.dev/admin)
Redis Commander:  http://localhost:8082
```

### Test Environment

#### Automated Testing
```bash
# Run all tests with isolated database
npm run test:local

# With E2E tests
npm run test:local:e2e

# With coverage reports
npm run test:local:coverage

# What it does:
# 1. Starts isolated test containers (ports 5433/6380)
# 2. Waits for health checks
# 3. Resets database schema
# 4. Runs all tests in parallel
# 5. Generates coverage reports (optional)
# 6. Cleans up automatically
```

#### Manual Test Environment
```bash
# Start test services
docker compose -f docker/docker-compose.test.yml up -d

# Check test database
docker exec goji-postgres-test pg_isready -U testuser -d goji_test

# Stop test services and cleanup
docker compose -f docker/docker-compose.test.yml down -v
```

#### Test Service Ports
```
PostgreSQL Test:  localhost:5433 (testuser/testpass/goji_test)
Redis Test:       localhost:6380
```

**Key Feature**: Test environment runs on different ports and can run concurrently with development.

### Production Environment

#### Deployment
```bash
# Build and start production stack
docker compose -f docker/docker-compose.prod.yml up -d

# Check service status
docker compose -f docker/docker-compose.prod.yml ps

# View logs
docker compose -f docker/docker-compose.prod.yml logs -f

# Stop production stack
docker compose -f docker/docker-compose.prod.yml down
```

#### Monitoring Access
```
API (behind Nginx): https://your-domain.com
Prometheus:         http://localhost:9090
Grafana:            http://localhost:3001
Kibana:             http://localhost:5601
```

## Service Administration

### Container Lifecycle

#### Health Checks
```bash
# Check all containers
docker compose -f docker/docker-compose.dev.yml -p goji-system ps

# PostgreSQL ready check
docker exec goji-postgres pg_isready -U goji -d goji

# Redis ping check
docker exec goji-redis redis-cli ping

# API health endpoint
curl http://localhost:3000/health

# View container health status with details
docker inspect goji-postgres | grep -A 10 Health
```

#### Resource Monitoring
```bash
# Real-time resource usage
docker stats

# Specific container stats
docker stats goji-api goji-postgres goji-redis

# System resource usage
docker system df

# Detailed disk usage
docker system df -v
```

#### Container Inspection
```bash
# View container configuration
docker inspect goji-postgres

# View container logs
docker logs goji-postgres
docker logs --tail 100 goji-api
docker logs --since 30m goji-redis

# Follow logs in real-time
docker logs -f goji-api
```

### Rebuilding Containers

#### When Code Changes (Development)
```bash
# No action needed - hot-reload via volume mounts
# Changes to TypeScript files are automatically detected
```

#### When Dependencies Change
```bash
# Rebuild and restart
docker compose -f docker/docker-compose.dev.yml -p goji-system down
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d --build

# Force rebuild without cache
docker compose -f docker/docker-compose.dev.yml -p goji-system build --no-cache
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d
```

#### Production Builds
```bash
# Build production image
docker build -f apps/goji-api/Dockerfile -t goji-api:latest .

# Push to registry
docker tag goji-api:latest your-registry/goji-api:v1.0.0
docker push your-registry/goji-api:v1.0.0
```

## Database Operations

### PostgreSQL Management

#### Direct Database Access
```bash
# Access PostgreSQL CLI (development)
docker exec -it goji-postgres psql -U goji -d goji

# Common psql commands
\dt              # List tables
\d table_name    # Describe table
\l               # List databases
\q               # Quit

# Execute SQL from command line
docker exec goji-postgres psql -U goji -d goji -c "SELECT * FROM users LIMIT 10;"
```

#### Prisma Migrations
```bash
# Generate Prisma client
cd apps/goji-api
npx prisma generate

# Push schema changes (development)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: destroys data)
npx prisma migrate reset
```

#### Database Backups
```bash
# Create backup with timestamp
docker exec goji-postgres pg_dump -U goji goji > \
  "backup_$(date +%Y%m%d_%H%M%S).sql"

# Compressed backup
docker exec goji-postgres pg_dump -U goji goji | \
  gzip > "backup_$(date +%Y%m%d_%H%M%S).sql.gz"

# Backup specific tables
docker exec goji-postgres pg_dump -U goji -t users -t wallets goji > \
  "partial_backup_$(date +%Y%m%d_%H%M%S).sql"

# Restore from backup
docker exec -i goji-postgres psql -U goji goji < backup.sql

# Restore from compressed
gunzip -c backup.sql.gz | \
  docker exec -i goji-postgres psql -U goji goji
```

#### Production Automated Backups
Production environment includes automated daily backups at 2 AM:
- Backup schedule: `0 2 * * *` (cron format)
- Stored in backup volumes
- Can be configured to upload to S3/cloud storage

### Redis Management

#### Direct Redis Access
```bash
# Access Redis CLI (development)
docker exec -it goji-redis redis-cli

# Common Redis commands
PING                    # Test connection
KEYS *                  # List all keys (dev only, slow on production)
GET key_name            # Get value
SET key_name value      # Set value
DEL key_name            # Delete key
FLUSHDB                 # Clear current database (WARNING)
INFO                    # Server information

# Execute command from shell
docker exec goji-redis redis-cli PING
docker exec goji-redis redis-cli INFO memory
```

#### Redis Monitoring
```bash
# Monitor commands in real-time
docker exec goji-redis redis-cli MONITOR

# Check memory usage
docker exec goji-redis redis-cli INFO memory

# View connected clients
docker exec goji-redis redis-cli CLIENT LIST

# Check keyspace statistics
docker exec goji-redis redis-cli INFO keyspace
```

#### Redis Backups
```bash
# Trigger manual save
docker exec goji-redis redis-cli BGSAVE

# Check last save time
docker exec goji-redis redis-cli LASTSAVE

# Copy RDB file
docker cp goji-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb

# Restore RDB file
docker cp ./redis_backup.rdb goji-redis:/data/dump.rdb
docker restart goji-redis
```

## Troubleshooting Guide

### Issue 1: Docker Services Not Starting

**Symptoms**:
- Containers fail to start
- "Error starting userland proxy" messages
- Containers exit immediately

**Diagnosis**:
```bash
# Check container status
docker compose -f docker/docker-compose.dev.yml -p goji-system ps

# View container logs
docker logs goji-postgres
docker logs goji-redis

# Check Docker daemon status
docker info
```

**Solutions**:
```bash
# Solution 1: Clean restart
docker compose -f docker/docker-compose.dev.yml -p goji-system down
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d

# Solution 2: Remove volumes (if data corruption suspected)
docker compose -f docker/docker-compose.dev.yml -p goji-system down -v
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d

# Solution 3: Restart Docker Desktop
# Quit and restart Docker Desktop application
# Then retry startup

# Solution 4: Clean Docker state
docker system prune -f
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d
```

### Issue 2: Port Conflicts

**Symptoms**:
- "Bind for 0.0.0.0:5432 failed: port is already allocated"
- Cannot start containers due to port conflicts

**Diagnosis**:
```bash
# Check what's using the ports
lsof -i :3000  # API port
lsof -i :5432  # PostgreSQL port
lsof -i :6379  # Redis port
lsof -i :5050  # PgAdmin port

# For test environment
lsof -i :5433  # Test PostgreSQL
lsof -i :6380  # Test Redis
```

**Solutions**:
```bash
# Solution 1: Kill conflicting process
# Find PID from lsof output, then:
kill -9 <PID>

# Solution 2: Use test environment (different ports)
docker compose -f docker/docker-compose.test.yml up -d

# Solution 3: Change ports in docker-compose.yml
# Edit docker/docker-compose.dev.yml and change port mappings
# Example: "5433:5432" instead of "5432:5432"
```

### Issue 3: Database Connection Failures

**Symptoms**:
- "Connection refused" errors
- API cannot connect to database
- Prisma errors

**Diagnosis**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs goji-postgres

# Test connection
docker exec goji-postgres pg_isready -U goji -d goji

# Verify DATABASE_URL
cat .env | grep DATABASE_URL
```

**Solutions**:
```bash
# Solution 1: Verify DATABASE_URL format
# Development: postgresql://goji:goji@localhost:5432/goji?schema=public
# Test: postgresql://testuser:testpass@localhost:5433/goji_test

# Solution 2: Wait for container to be ready
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d
sleep 10  # Wait for PostgreSQL to initialize
docker exec goji-postgres pg_isready -U goji -d goji

# Solution 3: Recreate container
docker compose -f docker/docker-compose.dev.yml -p goji-system down
docker volume rm goji-system_postgres_data  # WARNING: destroys data
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d

# Solution 4: Check network connectivity
docker exec goji-api ping goji-postgres
```

### Issue 4: Image Caching Issues

**Symptoms**:
- Code changes not reflected in container
- Old dependencies still present
- Build errors after package updates

**Diagnosis**:
```bash
# Check if using bind mounts (development)
docker inspect goji-api | grep -A 20 Mounts

# Check image build date
docker images | grep goji-api
```

**Solutions**:
```bash
# For code changes (development mode)
# No action needed - hot-reload via volume mounts
# TypeScript changes are automatically detected

# For dependency changes (package.json modified)
docker compose -f docker/docker-compose.dev.yml -p goji-system down
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d --build

# For persistent caching issues
docker compose -f docker/docker-compose.dev.yml -p goji-system build --no-cache
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d

# Nuclear option (complete rebuild)
docker compose -f docker/docker-compose.dev.yml -p goji-system down -v
docker system prune -a -f
docker compose -f docker/docker-compose.dev.yml -p goji-system up -d --build
```

### Issue 5: Out of Disk Space

**Symptoms**:
- "No space left on device" errors
- Docker refuses to start containers
- Build failures

**Diagnosis**:
```bash
# Check Docker disk usage
docker system df

# Detailed breakdown
docker system df -v

# Check system disk space
df -h
```

**Solutions**:
```bash
# Solution 1: Clean unused resources
docker system prune -f

# Solution 2: Remove unused volumes
docker volume prune -f

# Solution 3: Remove unused images
docker image prune -a -f

# Solution 4: Complete cleanup (WARNING)
docker system prune -a --volumes -f

# Solution 5: Increase Docker disk limit
# Docker Desktop → Settings → Resources → Disk image size
# Increase from default 60GB to higher value

# Solution 6: Remove specific large volumes
docker volume ls
docker volume rm <volume_name>
```

### Issue 6: Test Environment Not Cleaning Up

**Symptoms**:
- Test containers still running after script exits
- Port conflicts when running tests again
- Stale test data

**Diagnosis**:
```bash
# Check for running test containers
docker ps | grep test

# Check for test volumes
docker volume ls | grep test
```

**Solutions**:
```bash
# Solution 1: Manual cleanup
docker compose -f docker/docker-compose.test.yml down -v

# Solution 2: Remove all test volumes
docker volume ls | grep test | awk '{print $2}' | xargs docker volume rm

# Solution 3: Clean all stopped containers and volumes
docker container prune -f
docker volume prune -f

# Solution 4: Verify cleanup in test script
# Check scripts/test-local.sh has proper trap handlers
# Should include: trap cleanup EXIT INT TERM
```

### Issue 7: Slow Container Performance

**Symptoms**:
- Containers running slowly
- High CPU/memory usage
- Slow database queries

**Diagnosis**:
```bash
# Check resource usage
docker stats

# Check container logs for errors
docker logs goji-api | grep -i error
docker logs goji-postgres | grep -i error

# Check database performance
docker exec goji-postgres psql -U goji -d goji -c "
  SELECT pid, state, query_start, query
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY query_start;"
```

**Solutions**:
```bash
# Solution 1: Increase Docker resources
# Docker Desktop → Settings → Resources
# Increase CPUs (recommend 4+) and Memory (recommend 8GB+)

# Solution 2: Optimize PostgreSQL
docker exec goji-postgres psql -U goji -d goji -c "VACUUM ANALYZE;"

# Solution 3: Clear Redis cache
docker exec goji-redis redis-cli FLUSHDB

# Solution 4: Restart containers
docker compose -f docker/docker-compose.dev.yml -p goji-system restart

# Solution 5: Check for resource limits in compose file
# Review docker/docker-compose.dev.yml for resource constraints
```

## Security Operations

### Secret Management

#### Development Secrets
```bash
# Generate secure secrets (automated)
node scripts/generate-secrets.js

# What gets generated:
# - JWT_SECRET (64 chars, high entropy)
# - JWT_REFRESH_SECRET (64 chars, high entropy)
# - CHAT_ENCRYPTION_SECRET (64 chars, high entropy)
# - ENCRYPTION_KEY (64 chars, high entropy)

# Verify secrets in .env
cat .env | grep -E "JWT_SECRET|ENCRYPTION"
```

#### Production Secrets
```bash
# Use external secret management (recommended)
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault

# Example with Docker secrets
docker secret create jwt_secret jwt_secret.txt
docker secret create db_password db_password.txt

# Reference in docker-compose.prod.yml
services:
  api:
    secrets:
      - jwt_secret
      - db_password
```

### Container Security

#### Non-Root User Enforcement
```dockerfile
# All containers run as non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs
```

#### Security Scanning
```bash
# Scan images for vulnerabilities
docker scan goji-api:latest

# Check for outdated base images
docker images | grep node

# Update base images
docker pull node:24-alpine
docker compose -f docker/docker-compose.dev.yml build
```

### Network Security

#### Internal Network Isolation
```yaml
# Production: Services communicate on private network
# Only nginx exposed externally on 80/443
networks:
  goji-network:
    driver: bridge
    internal: false  # Only nginx connects externally
```

#### Database Access Control
```bash
# PostgreSQL: Password authentication required
# Redis: Password protection in production

# Verify PostgreSQL auth
docker exec goji-postgres cat /var/lib/postgresql/data/pg_hba.conf
```

## Best Practices

### DO
- ✅ Always use `-p goji-system` with docker-compose commands
- ✅ Run `npm run docker:setup` for first-time setup (handles secrets, migrations)
- ✅ Use automated scripts (`npm run test:local`) instead of manual Docker commands
- ✅ Let scripts handle cleanup (test-local.sh has trap handlers)
- ✅ Check container logs when debugging: `docker logs <container-name>`
- ✅ Run `npm run test:local` before committing to verify database integration
- ✅ Use test environment (ports 5433/6380) for isolated testing
- ✅ Create backups before major migrations or schema changes
- ✅ Monitor resource usage with `docker stats`
- ✅ Use `docker compose ps` to verify health checks

### DON'T
- ❌ Don't manually stop containers during test execution
- ❌ Don't modify test database manually (let Prisma migrations handle schema)
- ❌ Don't run tests against dev database (use isolated test environment)
- ❌ Don't commit .env files with real secrets
- ❌ Don't install packages in apps/goji-api or apps/goji-wallet (NX monorepo - install at root)
- ❌ Don't use `docker-compose` (deprecated) - use `docker compose` (v2)
- ❌ Don't run production containers without resource limits
- ❌ Don't expose PostgreSQL/Redis ports externally in production
- ❌ Don't skip health checks when deploying

## Additional Resources

### Documentation
- **Primary**: `/docker/DOCKER-INFRASTRUCTURE.md` - Complete 2,887-line guide
- **Development**: `/docs/development/environment-guide.md` - Setup walkthrough
- **Testing**: `/docs/development/testing-local-guide.md` - Test environment details
- **Deployment**: `/docs/development/deployment-guide.md` - Production deployment
- **Troubleshooting**: `/docs/development/troubleshooting.md` - Common issues
- **Main Guide**: `/CLAUDE.md` - Development workflow integration

### Helper Scripts
- `scripts/setup-docker-environment.sh` - Automated development setup
- `scripts/test-local.sh` - Test orchestration with cleanup
- `scripts/generate-secrets.js` - Secure secret generation

### Port Reference
```
Development:
3000  - API
5432  - PostgreSQL
6379  - Redis
5050  - PgAdmin
8082  - Redis Commander

Test (non-conflicting):
5433  - PostgreSQL Test
6380  - Redis Test

Production:
80    - Nginx HTTP
443   - Nginx HTTPS
3000  - API (internal)
5432  - PostgreSQL (internal)
6379  - Redis (internal)
9090  - Prometheus
3001  - Grafana
9200  - Elasticsearch
5601  - Kibana
```

## When to Use This Skill

Invoke this skill for:
- Docker environment setup and configuration
- Service administration (start, stop, restart, health checks)
- Database operations (backups, restores, migrations)
- Troubleshooting connection issues, port conflicts, performance problems
- Security operations (secret management, container security)
- Monitoring and resource management
- Production deployment guidance

**Quick Start**: Ask "How do I set up the Docker development environment?" or "My PostgreSQL container won't start" or "How do I backup the database?"
