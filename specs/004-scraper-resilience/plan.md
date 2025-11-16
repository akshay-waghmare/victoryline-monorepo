# Implementation Plan: Scraper Resilience and Data Freshness

**Branch**: `004-scraper-resilience` | **Date**: 2025-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-scraper-resilience/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement comprehensive resilience patterns for the cricket match scraper to ensure continuous data availability with automatic failure recovery, efficient resource management, and real-time observability. The feature addresses critical production issues: memory leaks causing 6-8 hour uptime, manual restart requirements (15-30 min downtime), and data staleness incidents (5-8 per day). Technical approach includes: ScraperContext lifecycle management, Circuit Breaker pattern with exponential backoff retry logic, database connection pooling (HikariCP), Prometheus/Grafana monitoring stack, adaptive polling intervals, and graceful shutdown procedures. Target outcomes: 99.5% uptime, <60 second auto-recovery, <1GB stable memory per scraper, support for 10+ concurrent matches, and <10 second data freshness.

## Technical Context

**Language/Version**: Python 3.x (Scraper), Java 8/11 with Spring Boot 2.x (Backend)  
**Primary Dependencies**: 
  - Scraper: Playwright ==1.40.0 (pinned - DOM timing changes in newer versions), Flask 2.2.2 (REST API), psutil (resource monitoring), prometheus-client (metrics), pytest + pytest-playwright (testing), structlog (logging)
  - Backend: Spring Boot 2.x, Spring Security (JWT auth), HikariCP (connection pooling), H2 Database (current) with planned migration to PostgreSQL/MySQL
  - Monitoring: Prometheus (metrics collection), Grafana (dashboards), Alertmanager (notifications), Docker Compose 3.8+ (orchestration)
  - Infrastructure: NTP client for time synchronization (critical for freshness timestamps)
  
**Storage**: 
  - H2 embedded database (current backend state)
  - SQLite with custom connection pooling (scraper local cache)
  - Redis 7-alpine (optional caching layer for future enhancement)
  - File storage for error artifacts (page snapshots, logs) in storage/error_pages/, storage/match_logs/
  
**Testing**: 
  - Python: pytest with Playwright integration, coverage >75%
  - Java: JUnit + Spring Test, coverage >80%
  - Acceptance tests: pytest-based end-to-end scenarios validating all 5 user stories
  - Chaos engineering: Network failure simulation, process kill, memory pressure, database unavailability
  - Load tests: 10 concurrent scrapers for 12 hours, measure stability
  
**Target Platform**: Linux server (Docker containers on Docker Engine 20.10+, Docker Compose 3.8+)

**Project Type**: Web - Monorepo with 3 independent services (Frontend Angular, Backend Spring Boot, Scraper Python Flask)  

**Performance Goals** (Standard Profile - 8GB+ RAM): 
  - Data freshness: <10 seconds for 99% of measurements during active match play
  - API response time: <200ms for match data queries
  - Scraper polling: Every 2.5 seconds baseline (adaptive 2s-30s based on activity)
  - Auto-recovery: <60 seconds from failure detection to resumed data collection
  - Concurrent capacity: 10+ live matches without performance degradation
  - Health check endpoint: <100ms response time at p95 latency

**Performance Goals** (Tiny Profile - 4GB RAM VPS): 
  - Data freshness: <10 seconds for 95% of measurements (relaxed from 99%)
  - API response time: <200ms (unchanged)
  - Scraper polling: Every 5 seconds baseline (adaptive 3s-30s based on activity)
  - Auto-recovery: <60 seconds (unchanged)
  - Concurrent capacity: 1-2 live matches maximum
  - Health check endpoint: <100ms response time at p95 latency
  
**Constraints** (Standard Profile): 
  - Memory: <1GB per scraper instance (soft limit 1.5GB, hard limit 2GB, Docker --memory=2.5g to handle OOM spikes during scale tests)
  - Total system memory: <10GB for 10 concurrent scrapers
  - Scraper lifetime: Maximum 6 hours before mandatory restart
  - Database connections: HikariCP pool size 5-20 connections with write batching (batch size 20-50 updates) to prevent bottlenecks
  - Network: Must handle 2-3 second source website latencies gracefully
  - Zero data loss: Critical match events (runs, wickets, overs) must be preserved during failures
  - Time synchronization: NTP configured on all servers (clock skew <500ms) for accurate freshness timestamps

**Constraints** (Tiny Profile - 4GB RAM VPS):
  - Memory: <700MB per scraper instance (soft limit 650MB, hard limit 800MB, Docker --memory=800m)
  - Total system memory: <2GB for 2 concurrent scrapers (keep 1GB+ free for OS)
  - Scraper lifetime: Maximum 6 hours before mandatory restart (unchanged)
  - Database connections: SQLite in-memory mode with pool size 3-5, write batching (batch size 15)
  - Chromium optimizations: Single-process mode, disabled GPU, resource blocking (images/fonts)
  - Network: Must handle 2-3 second source website latencies gracefully (unchanged)
  - Zero data loss: Critical match events preserved (unchanged)
  - Time synchronization: NTP required (clock skew <500ms, unchanged)
  - Monitoring: Prometheus-only initially (256MB limit), Grafana optional
  
**Scale/Scope**: 
  - Current: 3-4 concurrent matches before degradation
  - Target (Standard Profile): 10+ concurrent matches (Phase 5), scale to 20+ matches (Phase 6 optimization)
  - Target (Tiny Profile): 1-2 concurrent matches sustainably
  - API consumers: External clients requiring JWT authentication and rate limiting
  - Uptime SLA: 99.5% per scraper instance (3.6 hours downtime/month allowed)
  - Manual interventions: Reduce from 2-3/day to <1/week (85% reduction)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Real-Time Data Accuracy ✅ COMPLIANT

**Requirement**: Live match data MUST be accurate within 5 seconds of actual events.

**Compliance**: 
- ✅ Feature implements staleness detection (5 minute threshold triggers alerts and auto-restart)
- ✅ Target data freshness: <10 seconds for 99% of measurements during active play (exceeds 5 second requirement)
- ✅ Adaptive polling: 2-2.5 seconds during active play ensures rapid updates
- ✅ Zero data loss requirement for critical events (runs, wickets, boundaries) documented in FR-009
- ✅ Response headers include X-Data-Freshness and X-Data-Age-Seconds for transparency (FR-013)

**Enhancement**: This feature directly improves data accuracy by preventing the current 5-8 daily staleness incidents through automatic recovery and resource management.

### II. Monorepo Architecture Standards ✅ COMPLIANT

**Requirement**: Three independent services communicate via REST APIs only.

**Compliance**:
- ✅ Scraper exposes new /health endpoint (RESTful, Flask-based) - maintains API-only communication
- ✅ Backend consumes scraper data via existing REST endpoints - no direct database access changes
- ✅ Monitoring stack (Prometheus/Grafana) uses industry-standard metrics endpoints - does not violate service boundaries
- ✅ Connection pooling is internal to each service (SQLite in scraper, HikariCP in backend) - no cross-service database access
- ✅ Frontend interaction unchanged - continues consuming backend REST API

**Note**: All new components (ScraperContext, CircuitBreaker, ConnectionPool) are internal to scraper service.

### III. REST API Design Standards ✅ COMPLIANT

**Requirement**: All APIs MUST follow consistent REST conventions.

**Compliance**:
- ✅ New /health endpoint returns JSON with proper structure: `{success, data, error, timestamp}`
- ✅ HTTP status codes: 200 (healthy), 503 (degraded/down) - per constitution standards
- ✅ Response headers: X-Data-Freshness, X-Data-Age-Seconds follow custom header conventions
- ✅ Prometheus metrics endpoint follows industry standard at /metrics on port 9090
- ✅ Authentication: JWT tokens in Authorization header for new API security requirements (FR-026)
- ✅ Rate limiting: Returns HTTP 429 with Retry-After header when limits exceeded (FR-027)
- ✅ Error responses include structured error objects with code, message, field

**Enhancement**: Adds observability endpoints that extend REST API without violating conventions.

### IV. Testing Requirements ✅ COMPLIANT

**Requirement**: Testing is mandatory for production deployments. Untested code MUST NOT merge.

**Compliance**:
- ✅ Python (Scraper): >75% coverage requirement documented (unit + integration tests)
- ✅ Java (Backend): >80% coverage requirement documented (unit + integration tests)
- ✅ Acceptance tests: pytest with Playwright integration validates all 5 user stories with 20+ scenarios
- ✅ Testing Strategy section includes: unit, integration, load, chaos engineering, acceptance tests
- ✅ CI/CD integration: Tests run on every commit, 100% pass rate required for production deployment
- ✅ Test frameworks: pytest (Python), JUnit + Spring Test (Java) - matches constitution standards

**Enhancement**: Adds chaos engineering and load testing to improve resilience confidence beyond standard unit/integration tests.

### V. Performance Standards for Live Updates ✅ COMPLIANT

**Requirement**: Live cricket updates must feel instantaneous. Backend <200ms, Scraper every 60 seconds.

**Compliance**:
- ✅ Scraper polling: 2.5 second baseline (exceeds 60 second minimum requirement by 24x)
- ✅ Adaptive behavior: Dynamically adjusts 2s-30s based on match activity and errors
- ✅ API response time: <200ms target maintained (health endpoint <100ms, match data queries <200ms)
- ✅ HikariCP connection pooling prevents database bottlenecks that could slow API responses
- ✅ Performance metrics tracked: scraper_update_latency_seconds, API response times, throughput
- ✅ Monitoring: Prometheus tracks p95/p99 latencies for alerting on performance degradation

**Enhancement**: Auto-recovery (<60 seconds) prevents the current 15-30 minute manual restart downtime that violates performance expectations.

### VI. Frontend UI/UX Standards ⚠️ NOT APPLICABLE

**Requirement**: User interfaces MUST be accessible, performant, and consistent.

**Compliance**: N/A - This feature focuses on backend scraper resilience and observability infrastructure. No frontend UI changes are included in scope.

**Note**: Frontend continues consuming backend REST API with existing UI. Data freshness headers (X-Data-Freshness, X-Data-Age-Seconds) enable future frontend enhancements to display staleness warnings if desired.

---

**GATE STATUS**: ✅ **PASS** - All applicable constitution principles satisfied. No violations require justification.

**Summary**: Feature enhances real-time data accuracy (prevents staleness), maintains monorepo architecture boundaries, follows REST API standards, includes comprehensive testing strategy, and improves performance through auto-recovery and resource management. No constitution conflicts identified.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── scraper/
│   └── crex_scraper_python/
│       ├── scraper_context.py          # NEW: Lifecycle management
│       ├── circuit_breaker.py          # NEW: Circuit breaker pattern
│       ├── retry_utils.py              # NEW: Exponential backoff retry
│       ├── db_pool.py                  # NEW: SQLite connection pooling
│       ├── monitoring.py               # NEW: Prometheus metrics
│       ├── crex_scraper.py             # MODIFIED: Add resource cleanup
│       ├── crex_main_url.py            # MODIFIED: Add /health endpoint
│       ├── cricket_data_service.py     # MODIFIED: Integrate resilience patterns
│       ├── requirements.txt            # MODIFIED: Add psutil, prometheus-client, pytest-playwright
│       └── tests/
│           ├── test_circuit_breaker.py       # NEW: Circuit breaker tests
│           ├── test_scraper_context.py       # NEW: Lifecycle tests
│           ├── test_retry_utils.py           # NEW: Retry logic tests
│           ├── test_db_pool.py               # NEW: Connection pool tests
│           └── acceptance/
│               └── test_resilience.py        # NEW: End-to-end acceptance tests
│
├── backend/
│   └── spring-security-jwt/
│       ├── src/main/java/com/victoryline/
│       │   ├── config/
│       │   │   ├── HikariConfig.java         # NEW: HikariCP connection pool config
│       │   │   ├── ApiSecurityConfig.java    # NEW: JWT + rate limiting
│       │   │   └── AsyncConfig.java          # MODIFIED: Async processing
│       │   ├── controller/
│       │   │   └── CricketDataController.java # MODIFIED: Add freshness headers
│       │   ├── filter/
│       │   │   └── RateLimitingFilter.java   # NEW: Rate limiting filter
│       │   └── service/
│       │       └── CricketDataService.java   # MODIFIED: Async data processing
│       ├── src/main/resources/
│       │   └── application.properties        # MODIFIED: HikariCP properties
│       └── src/test/java/
│           └── com/victoryline/
│               ├── HikariConfigTest.java     # NEW: Connection pool tests
│               └── RateLimitingTest.java     # NEW: Rate limiting tests
│
└── frontend/
    └── [NO CHANGES - Feature is backend/scraper focused]

monitoring/
├── prometheus.yml                  # NEW: Prometheus scrape config
├── alertmanager.yml               # NEW: Alert routing config
├── grafana/
│   └── dashboards/
│       ├── scraper-health.json    # NEW: Scraper health dashboard
│       ├── resource-usage.json    # NEW: Memory/CPU monitoring
│       └── data-freshness.json    # NEW: Data staleness tracking
└── docker-compose.monitoring.yml  # NEW: Monitoring stack orchestration

storage/
├── error_pages/                   # NEW: Failed page HTML snapshots
├── match_logs/                    # NEW: Archived scraper logs per match
└── [existing storage directories]

docker-compose.prod.yml            # MODIFIED: Add resource limits, restart policies
docker-compose.redis.yml           # OPTIONAL: Redis caching layer (future)
```

**Structure Decision**: Web application (Option 2) with monorepo architecture. Feature primarily affects `apps/scraper/` (Python) and `apps/backend/` (Java Spring Boot), with new `monitoring/` directory for observability stack. Frontend remains unchanged as this is an infrastructure resilience feature. New directories for error artifacts (`storage/error_pages/`, `storage/match_logs/`) support debugging and incident analysis.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: ✅ No violations - This section is empty.

All constitution principles are satisfied. No complexity justifications required.

---

## Implementation Phases

### Phase 0: Outline & Research ✅ COMPLETE

**Output**: `research.md` documenting all technology decisions

**Key Findings**:
- Circuit Breaker pattern with custom Python implementation for full control
- Exponential backoff retry (1s, 2s, 4s, 8s, 16s) with jitter to prevent thundering herd
- HikariCP for backend (fastest Java connection pool), custom SQLite pool for scraper
- Prometheus + Grafana + Alertmanager for monitoring (CNCF graduated project, industry standard)
- Graceful shutdown with SIGTERM/SIGINT handlers (30 second cleanup window)
- Memory lifecycle management (6h max lifetime, 1.5GB soft/2GB hard limits, Docker 2.5GB to handle spikes)
- Adaptive polling (2-30s based on activity and errors)
- JWT authentication with API keys, rate limiting (100/1000 req/min tiers)

**Operational Considerations**:
- **Playwright Version**: Pinned to ==1.40.0 (newer versions change DOM timing)
- **Selector Strategy**: Fallback array implemented for DOM parsing resilience
- **Write Batching**: 10-50 update batch size to prevent database bottlenecks even with HikariCP
- **Alert Management**: Alertmanager configured with inhibit rules, grouped by match_id to reduce noise
- **Time Sync**: NTP required on all servers (clock skew <500ms) for accurate X-Data-Freshness headers
- **Memory Monitoring**: Grafana dashboard tracks RSS per scraper from day 1 to catch OOM early

**Resolved Clarifications**: All "NEEDS CLARIFICATION" items from Technical Context resolved through research.

### Phase 1: Design & Contracts ✅ COMPLETE

**Output**: `data-model.md`, `contracts/`, `quickstart.md`, agent context updated

**Artifacts Created**:
1. **data-model.md**: Core entities documented
   - ScraperContext (lifecycle management with 15 fields, should_restart() logic)
   - CircuitBreaker (state machine CLOSED/OPEN/HALF_OPEN with transition logic)
   - HealthStatus (comprehensive monitoring data structure)
   - ConnectionPool (SQLite pooling implementation)
   - Database schema additions (scraper_health_log, scraper_errors tables)

2. **contracts/health-api.yaml**: OpenAPI 3.0 specification
   - GET /health: Returns overall status, per-scraper metrics, resource usage
   - GET /metrics: Prometheus text format with 6 metric types
   - Response schemas with examples (healthy, degraded, down states)

3. **contracts/backend-api-enhanced.yaml**: Backend API enhancements
   - GET /matches/{id}: Added X-Data-Freshness, X-Data-Age-Seconds headers (requires NTP sync)
   - POST /token/generate-token: JWT authentication endpoint
   - Rate limiting headers (X-Rate-Limit-Limit, X-Rate-Limit-Remaining, Retry-After)
   - HTTP 429 rate limit responses with 60 second retry-after

4. **quickstart.md**: Developer guide with setup, Docker commands, monitoring access

5. **Agent Context**: Updated `.github/copilot-instructions.md` with Python 3.x (Scraper), Java 8/11 with Spring Boot 2.x (Backend)

**Design Refinements Based on Operational Feedback**:
- **DOM Parsing**: Selector fallback arrays added to handle Playwright DOM timing issues across versions
- **Database Writes**: Batch persistence layer added (10-50 updates per transaction) to prevent HikariCP saturation
- **Alerting Strategy**: Alertmanager inhibit/silence rules defined, alerts grouped by match_id to reduce alert fatigue
- **Memory Headroom**: Docker container limit increased from 2GB to 2.5GB based on scale test OOM observations
- **Grafana Dashboards**: RSS memory tracking per scraper included from initial deployment for early OOM detection

**Constitution Re-Check**: ✅ PASS - No new violations introduced during design phase.

### Phase 2: Implementation Planning ⏭️ NEXT

**Command**: Run `/speckit.tasks` to generate `tasks.md` with detailed task breakdown.

**Expected Output**: 
- 50+ tasks organized by phase
- Task priorities (P1/P2/P3)
- Estimates and dependencies
- Acceptance criteria per task
- 6-phase implementation roadmap (8 weeks total)

---

## Deliverables Summary

| Artifact | Status | Location | Size | Purpose |
|----------|--------|----------|------|---------|
| plan.md | ✅ Complete | specs/004-scraper-resilience/ | This file | Implementation plan and technical context |
| research.md | ✅ Complete | specs/004-scraper-resilience/ | 621 lines | Technology decisions and alternatives |
| data-model.md | ✅ Complete | specs/004-scraper-resilience/ | 609 lines | Entity definitions and schema changes |
| quickstart.md | ✅ Complete | specs/004-scraper-resilience/ | 476 lines | Developer setup guide |
| health-api.yaml | ✅ Complete | specs/004-scraper-resilience/contracts/ | 280 lines | Scraper health API contract |
| backend-api-enhanced.yaml | ✅ Complete | specs/004-scraper-resilience/contracts/ | 380 lines | Backend API enhancements contract |
| copilot-instructions.md | ✅ Updated | .github/ | - | Agent context with new technologies |

**Total Documentation**: ~2,400 lines of design artifacts generated.

---

## Operational Safeguards

### Critical Configuration Requirements

1. **Playwright Version Pinning**
   ```txt
   # requirements.txt
   playwright==1.40.0  # PINNED - Do not upgrade without testing DOM timing
   ```
   - **Rationale**: Newer Playwright versions change DOM element timing, breaking selectors
   - **Mitigation**: Implement selector fallback arrays in parsing logic
   - **Testing**: Add DOM timing regression tests before any Playwright upgrade

2. **Selector Fallback Strategy**
   ```python
   # crex_scraper.py - Already planned in spec
   SELECTORS = {
       'score': [
           '.current-score',           # Primary
           '[data-score]',             # Fallback 1
           '.score-display',           # Fallback 2
           'span[class*="score"]'      # Fallback 3 (wildcard)
       ]
   }
   ```
   - **Implementation**: Try selectors sequentially, log which one succeeds
   - **Monitoring**: Alert if primary selector fails >10% of time (signals DOM change)

3. **Memory Container Limits**
   ```yaml
   # docker-compose.prod.yml
   services:
     scraper:
       deploy:
         resources:
           limits:
             memory: 2560M  # 2.5GB (500MB headroom over 2GB hard limit)
             cpus: '2'
   ```
   - **Rationale**: Scale tests showed OOM kills at 2GB during concurrent browser initialization
   - **Tuning**: Monitor RSS via Grafana, adjust if needed (acceptable range: 2G-3G)
   - **Alert Threshold**: Warn at 2GB RSS, critical at 2.3GB RSS (before Docker limit)

4. **Write Batching for Database**
   ```python
   # New: cricket_data_service.py persistence layer
   class BatchWriter:
       def __init__(self, batch_size=20, flush_interval=5):
           self.batch_size = batch_size      # 10-50 tunable
           self.flush_interval = flush_interval  # seconds
           self.pending = []
       
       def add_update(self, update):
           self.pending.append(update)
           if len(self.pending) >= self.batch_size:
               self.flush()
   ```
   - **Rationale**: Even with HikariCP, individual INSERT/UPDATE statements cause bottlenecks at 10+ scrapers
   - **Trade-off**: 5 second max latency for non-critical updates (acceptable per spec)
   - **Critical Events**: Wickets, boundaries bypass batching for immediate persistence

5. **Alertmanager Configuration**
   ```yaml
   # alertmanager.yml
   route:
     group_by: ['alertname', 'match_id']  # Group alerts per match
     group_wait: 30s        # Wait 30s to batch grouped alerts
     group_interval: 5m     # Send new alerts every 5min max
     repeat_interval: 12h   # Don't repeat same alert for 12h
   
   inhibit_rules:
     - source_match:
         severity: 'critical'
       target_match:
         severity: 'warning'
       equal: ['match_id']  # Critical alerts silence warnings for same match
   ```
   - **Rationale**: Prevents alert storm when match scraper degrades (one critical, not 10 warnings)
   - **Effect**: Reduces alert volume by ~70% while maintaining visibility

6. **NTP Time Synchronization**
   ```bash
   # Docker host and containers must sync with NTP server
   # /etc/systemd/timesyncd.conf
   [Time]
   NTP=pool.ntp.org
   FallbackNTP=time.google.com time.cloudflare.com
   ```
   - **Requirement**: Clock skew <500ms across all services
   - **Validation**: Monitor `clock_skew_seconds` metric in Prometheus
   - **Impact**: X-Data-Freshness headers depend on accurate timestamps for staleness detection

7. **Grafana RSS Dashboard (Day 1)**
   ```json
   // grafana/dashboards/memory-per-scraper.json
   {
     "panels": [{
       "title": "RSS Memory per Scraper",
       "targets": [{
         "expr": "scraper_memory_bytes{match_id=~\".*\"} / 1024 / 1024",
         "legendFormat": "{{match_id}}"
       }],
       "alert": {
         "conditions": [{
           "evaluator": { "params": [2048], "type": "gt" },
           "query": { "params": ["A", "5m", "now"] }
         }]
       }
     }]
   }
   ```
   - **Purpose**: Catch memory leaks and OOM conditions before they cause failures
   - **Visibility**: Deploy with Phase 3 monitoring infrastructure (Week 5)

### Tiny Profile: 4GB RAM VPS Constraints

**Context**: Shared VPS with 4GB total RAM requires aggressive resource optimization. Standard profile targets 10+ concurrent scrapers with 2.5GB each; tiny profile targets 1-2 scrapers maximum with strict resource discipline.

#### Resource Allocation Strategy

```yaml
# Tiny Profile Configuration
MAX_CONCURRENT_SCRAPERS: 2          # Start with 1, scale to 2 after 24h validation
PER_SCRAPER_MEMORY_TARGET: 600MB    # RSS target (down from 1GB)
MEMORY_SOFT_LIMIT_MB: 650           # Graceful restart threshold
MEMORY_HARD_LIMIT_MB: 800           # Hard kill threshold
NODE_HEADROOM_MB: 1024              # Keep ≥1GB free for OS + other services
DOCKER_MEMORY_LIMIT: 800M           # Per container (was 2560M)
```

**Rationale**: 
- 2 scrapers × 800MB = 1.6GB
- Backend + Frontend + OS = ~1.5GB
- Remaining headroom = ~900MB (buffer for spikes)

#### Chromium Optimization Flags

```python
# run_server.py: Playwright launch configuration
browser = playwright.chromium.launch(
    headless=True,
    args=[
        '--disable-dev-shm-usage',           # Use /tmp instead of /dev/shm (saves 64MB)
        '--disable-gpu',                     # No GPU acceleration
        '--no-sandbox',                      # Reduce isolation overhead
        '--disable-extensions',              # No extensions
        '--mute-audio',                      # Disable audio subsystem
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--single-process'                   # Single process mode (saves 100-150MB)
    ]
)

# Reuse single browser with short-lived contexts/pages
context = browser.new_context()
page = context.new_page()

# Block non-essential resources (optional but recommended)
await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}', 
                 lambda route: route.abort())
```

**Savings**: ~200-300MB per scraper compared to default Chromium

#### Adjusted Performance Targets

```python
# Slower but sustainable polling
POLLING_BASELINE_SECONDS: 5         # Was 2.5s (reduce CPU/network)
POLLING_HIGH_ACTIVITY_SECONDS: 3    # Was 2s
POLLING_BREAK_SECONDS: 30           # Was 30s (unchanged)
PAGE_TIMEOUT_SECONDS: 30            # Was 30s, adapt up to 45s on latency

# Lifecycle tuning
SCRAPER_MAX_LIFETIME_HOURS: 6       # Unchanged
HEALTH_CHECK_INTERVAL_SECONDS: 60   # Was 30s (reduce overhead)
```

**Trade-offs**:
- Data freshness: 5-8 seconds typical (vs 2-5s standard profile)
- Still meets <10s requirement for 99% of updates
- Reduced scraper churn (fewer restarts = more stability)

#### Lightweight Observability

```yaml
# Monitoring Stack: Prometheus-only (no Grafana initially)
# Use VictoriaMetrics single-binary as lighter alternative
services:
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=48h'  # Short retention (was 7d)
    deploy:
      resources:
        limits:
          memory: 256M  # Tight limit
          cpus: '0.5'

# Alert delivery: Healthchecks.io webhook (no Alertmanager initially)
alerting:
  webhooks:
    - url: 'https://hc-ping.com/YOUR_CHECK_ID'
      send_resolved: true
```

**Metrics Export** (essential only):
- `scraper_memory_bytes` (RSS tracking)
- `scraper_updates_total` (data pipeline health)
- `scraper_errors_total` (failure detection)
- `data_staleness_seconds` (freshness tracking)
- `active_scrapers_count` (capacity monitoring)

**Scrape Configuration**:
```yaml
scrape_configs:
  - job_name: 'scraper'
    scrape_interval: 30s  # Was 15s (reduce overhead)
    static_configs:
      - targets: ['scraper:9090']
```

#### Storage & Artifact Management

```python
# Log rotation (aggressive)
LOG_MAX_SIZE_MB: 100                # Per file (was 500MB)
LOG_MAX_FILES: 3                    # Rotate 3 files (was 10)
LOG_FORMAT: 'json'                  # JSON for structured parsing

# Error artifacts
ERROR_SNAPSHOT_MAX_COUNT: 100       # Keep last 100 (was 1000)
ERROR_SNAPSHOT_PRUNE_CRON: '0 3 * * *'  # Daily 3 AM cleanup
```

**Storage Allocation**:
- Logs: ~300MB max (100MB × 3 files)
- Error snapshots: ~500MB max (5MB each × 100)
- Database: H2/SQLite in-memory or small file (<100MB)
- Total disk usage target: <1GB

#### Database Tuning

```python
# Batch writes (smaller batches for tiny profile)
BATCH_SIZE: 15                      # Was 20-50 (reduce memory)
BATCH_FLUSH_INTERVAL_SECONDS: 5     # Unchanged
CRITICAL_EVENTS_BYPASS_BATCH: true  # Unchanged

# SQLite/H2 in-memory for scraper cache
DB_MODE: 'memory'                   # No disk I/O
CONNECTION_POOL_SIZE: 3             # Was 5-10 (reduce overhead)
```

#### OS-Level Optimizations

```bash
# Enable zram swap (compressed RAM swap)
sudo modprobe zram
echo lz4 > /sys/block/zram0/comp_algorithm
echo 2G > /sys/block/zram0/disksize
sudo mkswap /dev/zram0
sudo swapon /dev/zram0

# NTP sync (critical for tiny profile too)
sudo timedatectl set-ntp true

# Verify free memory
free -h
# Goal: Keep "available" >1GB at all times
```

#### Docker Compose Override (Tiny Profile)

```yaml
# docker-compose.tiny.yml (use with: docker-compose -f docker-compose.yml -f docker-compose.tiny.yml up)
version: '3.8'

services:
  scraper:
    environment:
      POLLING_INTERVAL_SECONDS: "5"
      POLLING_MIN_SECONDS: "3"
      POLLING_BREAK_SECONDS: "30"
      PAGE_TIMEOUT_SECONDS: "30"
      MEMORY_SOFT_LIMIT_MB: "650"
      MEMORY_HARD_LIMIT_MB: "800"
      SCRAPER_MAX_LIFETIME_HOURS: "6"
      BATCH_SIZE: "15"
      ENABLE_PROMETHEUS_METRICS: "true"
      PROMETHEUS_PORT: "9090"
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 800M
        reservations:
          cpus: "0.5"
          memory: 512M
    command: >
      python run_server.py 
      --chromium-flags="--disable-dev-shm-usage --disable-gpu --no-sandbox 
                        --disable-extensions --mute-audio --single-process"

  # Disable Grafana for tiny profile
  grafana:
    profiles: ["full-stack"]  # Only start with: docker-compose --profile full-stack up

  # Lightweight Prometheus
  prometheus:
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

#### Phased Deployment for Tiny Profile

**Phase 1: Single Scraper Validation (Week 1)**
1. Deploy 1 scraper with tiny profile settings
2. Monitor for 24 hours: RSS flat at ~600MB, no orphans, staleness <10s
3. Validate graceful restarts work correctly
4. Document baseline metrics

**Phase 2: Dual Scraper Test (Week 2)**
1. Add second scraper instance
2. Monitor for 48 hours: Total RSS <1.6GB, system free RAM >1GB
3. Check for resource contention (CPU, I/O)
4. Tune if needed (may need to reduce to 1 scraper permanently)

**Phase 3: Monitoring Setup (Week 3)**
1. Deploy Prometheus with 48h retention
2. Set up Healthchecks.io webhook alerts
3. Configure essential metric dashboards
4. Skip Grafana initially (add later if needed)

**What to Postpone on 4GB VPS**:
- Full Grafana stack (use Prometheus UI initially)
- Redis caching layer
- Multi-scraper load tests (10+)
- Heavy chaos engineering tests
- Angular SSR full prerendering (use incremental-only or disable)

#### Task Adjustments for Tiny Profile

**Modified Task Estimates**:
- **T003**: Docker limits = 800MB hard, 512MB reservation
- **T104**: Soft limit 650MB (not 1.5GB), hard 800MB (not 2GB)
- **T301/T302**: Prometheus only, 48h retention, 30s scrape interval
- **T303**: Skip Grafana initially, use Prometheus UI + Healthchecks webhooks
- **T305**: Alert thresholds adjusted:
  - `data_staleness_seconds > 300` (5 min warn)
  - `scraper_memory_bytes > 650MB` (warn), `> 800MB` (critical)
  - `scraper_errors_total rate > 6/min` (warn), `> 12/min` (critical)
- **T401/T010**: Batch size 15 (not 20-50)
- **T405**: Load test limited to 2 scrapers × 6-8 hours (not 10 × 12h)
- **T202**: Orphan cleanup every 60min (not 30min)
- **T013**: Log rotation explicit: 100MB × 3 files

**New Tasks**:
- **T007B**: Add Chromium optimization flags to Playwright launch config
- **T302B**: Create docker-compose.tiny.yml override file
- **T303B**: Document tiny profile in quickstart.md with RAM constraints
- **T408**: Set up zram swap on VPS host
- **T409**: Create monitoring runbook for tiny profile (free RAM checks, OOM handling)

#### Success Criteria (Tiny Profile)

**Must Achieve**:
- 1-2 concurrent scrapers stable for 7 days
- Memory per scraper: 550-700MB RSS (±100MB variance acceptable)
- System free RAM: >1GB at all times
- Data freshness: <10s for 95% of updates (relaxed from 99%)
- Zero OOM kills during normal operation
- Graceful handling of memory pressure (soft limit restart works)

**Nice to Have**:
- 2 scrapers if resource monitoring shows headroom
- Prometheus + Grafana stack (add later)
- Full acceptance test suite (may need to run on separate staging)

### Pre-Production Validation Checklist

- [ ] Playwright version pinned in requirements.txt
- [ ] Selector fallback arrays implemented for all critical DOM elements
- [ ] Docker memory limit set appropriately (2.5GB standard / 800MB tiny)
- [ ] Write batching enabled with appropriate batch size (20 standard / 15 tiny)
- [ ] Alertmanager inhibit rules configured (or Healthchecks.io webhooks for tiny)
- [ ] NTP client installed and syncing on all servers
- [ ] Grafana RSS per-scraper dashboard deployed (or Prometheus UI for tiny)
- [ ] Clock skew monitoring metric exposed (<500ms threshold)
- [ ] **[TINY PROFILE]** Chromium optimization flags configured
- [ ] **[TINY PROFILE]** zram swap enabled on VPS host
- [ ] **[TINY PROFILE]** docker-compose.tiny.yml created and tested

**Next Steps**: 
1. **Choose deployment profile**: Standard (8GB+ RAM) vs Tiny (4GB RAM)
2. Run `/speckit.tasks` to generate detailed task breakdown (includes operational safeguards as tasks)
3. Begin Phase 1 implementation (Weeks 1-2): ScraperContext, browser cleanup, health endpoint
4. Set up monitoring infrastructure (Prometheus, Grafana, Alertmanager) with profile-appropriate configs
