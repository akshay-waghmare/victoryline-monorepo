# Feature Specification: Scraper Resilience and Data Freshness

**Feature Branch**: `004-scraper-resilience`  
**Created**: 2025-11-12  
**Status**: Draft  
**Input**: Improve scraper resilience and reliability to ensure fresh, live cricket match data with automatic recovery, resource management, and high availability for API consumers

## Clarifications

### Session 2025-11-12

- Q: What constitutes "stale" data? → A: Data that hasn't been updated in >5 minutes during an active live match.
- Q: Maximum acceptable recovery time after failure? → A: 60 seconds for automatic recovery; 5 minutes with circuit breaker.
- Q: Memory limits per scraper instance? → A: Soft limit 1.5GB (trigger restart), hard limit 2GB (force kill).
- Q: Maximum scraper lifetime before mandatory restart? → A: 6 hours to prevent resource leaks.
- Q: Concurrent match capacity target? → A: Support 10+ concurrent live matches with <10GB total memory.
- Q: Database technology for production? → A: Currently H2 embedded; recommend migration to PostgreSQL/MySQL for API scaling.
- Q: Monitoring/alerting preferences? → A: Prometheus metrics exposed on port 9090; health endpoint on /health.
- Q: Acceptable data loss during failures? → A: Zero data loss for match-critical events (wickets, runs, boundaries); best-effort for minor updates.
- Q: Alert delivery mechanism for monitoring alerts? → A: Prometheus Alertmanager with email/Slack notifications.
- Q: API authentication for external API consumers? → A: JWT-based authentication with API keys.
- Q: Acceptance test automation approach? → A: Pytest with Playwright integration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Continuous Live Data Availability (Priority: P1)

API consumers and end users need uninterrupted access to live cricket match data that updates in near real-time, even when network issues or source website changes occur.

**Why this priority**: Core business value - users expect live scores to always be available and current. Data staleness directly impacts user trust and API reliability for paying customers.

**Independent Test**: Monitor a live match for 2 hours and verify data updates occur every 2-5 seconds with no gaps longer than 30 seconds, even if temporary network failures are simulated (disconnect network for 10 seconds every 15 minutes).

**Acceptance Scenarios**:

1. **Given** a live cricket match is in progress, **When** the scraper encounters a temporary network error, **Then** it automatically retries with exponential backoff (1s, 2s, 4s, 8s, 16s max) and resumes data collection within 30 seconds without data loss
2. **Given** multiple matches are being scraped simultaneously, **When** one scraper crashes due to browser error, **Then** other scrapers continue operating without disruption and the crashed scraper automatically restarts within 60 seconds
3. **Given** a scraper has been running for 6 hours, **When** the maximum lifetime threshold is reached, **Then** the scraper performs graceful shutdown, saves state, restarts with fresh resources, and resumes data collection within 30 seconds
4. **Given** the source website returns malformed HTML or JSON, **When** the scraper attempts to parse the data, **Then** it logs detailed error with page snapshot, attempts fallback parsing strategies, and continues operating without crashing

---

### User Story 2 - Automatic Failure Recovery (Priority: P1)

Operations team needs scrapers that automatically detect and recover from failures without manual intervention, reducing maintenance burden and ensuring 24/7 availability.

**Why this priority**: Reduces operational costs and ensures 24/7 availability without constant monitoring. Critical for scaling to multiple matches and maintaining API SLA commitments.

**Independent Test**: Simulate various failure scenarios (memory leak via browser accumulation, process kill, timeout, authentication failure) and verify system recovers automatically within defined time limits without human intervention.

**Acceptance Scenarios**:

1. **Given** a scraper is consuming excessive memory (approaching 1.5GB), **When** the resource monitor detects the soft limit breach, **Then** the scraper logs warning, completes current update cycle, gracefully shuts down all browser instances, and restarts within 60 seconds
2. **Given** a scraper has failed 5 consecutive times within 10 minutes, **When** the circuit breaker threshold is exceeded, **Then** scraping for that match pauses for 5 minutes, logs detailed failure context, then attempts recovery with fresh initialization and configuration reload
3. **Given** authentication tokens expire during active scraping (JWT expiration), **When** API calls receive 401/403 errors, **Then** the scraper automatically requests fresh tokens from /token/generate-token endpoint, updates internal state, and retries the failed requests without dropping data
4. **Given** browser instances accumulate over time due to incomplete cleanup, **When** the cleanup monitor runs every 30 minutes, **Then** all orphaned Chromium/Playwright processes not associated with active scrapers are identified and terminated, reclaiming memory and CPU resources

---

### User Story 3 - Health Monitoring and Observability (Priority: P2)

DevOps team and API consumers need real-time visibility into scraper health, data freshness, and performance metrics to proactively address issues before they impact users.

**Why this priority**: Enables proactive problem detection and provides transparency to API consumers about data quality and service health.

**Independent Test**: Access monitoring dashboard showing all active scrapers with real-time metrics. Trigger degraded state by introducing delays, then verify alerts fire and recovery actions execute automatically.

**Acceptance Scenarios**:

1. **Given** multiple scrapers are running, **When** the /health endpoint is queried, **Then** it returns JSON within 100ms containing: overall status (healthy/degraded/down), active scraper count, per-match last update timestamp, memory usage per scraper, error count per scraper, and uptime
2. **Given** a scraper hasn't updated data in 5 minutes during an active match, **When** the staleness detector runs, **Then** health status changes to "degraded", detailed warning is logged with match URL and last successful update time, and automatic restart sequence is initiated
3. **Given** API consumers query match data via /cricket-data/match-info, **When** they receive the response, **Then** response headers include X-Data-Freshness timestamp (ISO 8601 format) and X-Data-Age-Seconds indicating staleness, allowing clients to make informed decisions
4. **Given** scraper error rate exceeds 10 errors per minute for any match, **When** the error threshold is breached, **Then** monitoring system logs ERROR level message with error types distribution, triggers alert webhook if configured, and increments Prometheus counter scraper_errors_total with labels {match_id, error_type}

---

### User Story 4 - Resource Management and Efficiency (Priority: P2)

System administrators need scrapers that efficiently manage memory, CPU, network, and database resources to maximize concurrent match capacity while minimizing infrastructure costs.

**Why this priority**: Enables cost-effective scaling to handle multiple simultaneous matches (10+ concurrent) and reduces cloud infrastructure expenses by 40-60%.

**Independent Test**: Run 10 concurrent match scrapers continuously for 12 hours. Measure memory, CPU, database connections, and browser processes every 15 minutes. Verify no resource leaks, stable performance, and all matches maintain data freshness <10 seconds.

**Acceptance Scenarios**:

1. **Given** 10 matches are being scraped concurrently, **When** system resources are measured after 6 hours of operation, **Then** average memory per scraper remains under 1GB, total memory usage under 10GB, CPU usage per scraper under 20%, and no continuous growth trend is observed
2. **Given** a single scraper has been running continuously for 12 hours (due to very long test match), **When** memory usage is sampled every hour, **Then** memory remains stable within ±10% variance with no monotonic growth pattern indicating memory leaks
3. **Given** browser instances are created for DOM scraping tasks, **When** scraping task completes successfully or encounters fatal error, **Then** all associated browser contexts, pages, and Chromium processes are properly closed and cleaned up within 10 seconds, verified by process count monitoring
4. **Given** multiple scrapers need database connections to store match data, **When** concurrent update requests occur, **Then** HikariCP connection pool efficiently reuses connections with configured max pool size of 20, average wait time under 100ms, and no connection leaks logged

---

### User Story 5 - Adaptive Performance Under Load (Priority: P3)

System needs to dynamically adapt its behavior based on current load, error patterns, network conditions, and match state to optimize reliability and resource usage without manual configuration.

**Why this priority**: Improves system resilience during peak load periods (major tournaments) and variable network conditions without requiring manual tuning or intervention.

**Independent Test**: Gradually increase network latency from 100ms to 3000ms and error rate from 0% to 20% over 30 minutes. Verify system automatically adjusts polling intervals, timeouts, and retry strategies to maintain stability and prevent cascading failures.

**Acceptance Scenarios**:

1. **Given** a scraper is experiencing elevated error rates (>5 errors per minute), **When** errors are detected and classified, **Then** polling interval progressively increases from baseline 2.5s to 5s (after 5 errors), then 10s (after 10 errors), then 20s (after 20 errors) until error rate drops below threshold for 5 minutes
2. **Given** network latency to source website exceeds 2 seconds average over 10 requests, **When** timeout thresholds are re-evaluated, **Then** page timeouts automatically increase by 50% (from 30s to 45s), navigation timeouts increase to 45s, and selector wait times increase to 10s to prevent false timeout failures
3. **Given** a match enters non-active state (drinks break, rain delay, innings break), **When** no data changes are detected for 10 consecutive polling cycles (25 seconds), **Then** scraper automatically reduces polling frequency to once per 30 seconds to conserve resources while maintaining monitoring
4. **Given** rapid ball-by-ball action is detected (wicket, boundary, or score changes in >50% of polling cycles), **When** high-frequency change pattern is identified, **Then** polling interval optimizes to 2 seconds to ensure all critical updates are captured with minimal latency

---

### Edge Cases

- **What happens when source website completely changes its DOM structure or URL patterns?**
  - Scraper detects consecutive parsing failures (>10), captures full page HTML snapshot and saves to storage/error_pages/{timestamp}_{match_id}.html, logs CRITICAL error with detailed selector information, triggers immediate alert via webhook, switches to circuit breaker OPEN state, and continues attempting every 5 minutes until fix is deployed

- **What happens when database becomes unavailable or unresponsive (connection refused/timeout)?**
  - Scrapers queue data updates in memory using bounded queue (max 1000 items or 10MB, whichever comes first), continue scraping without data loss, log WARNING every minute about queue size, and replay queued updates when database recovers using batch insert operations. If queue reaches capacity, oldest non-critical updates (commentary text, minor stat corrections) are dropped with detailed logging, while critical updates (scores, wickets, overs) are always retained

- **What happens when a match suddenly ends or URL becomes invalid (404/410 returned)?**
  - Scraper detects "match not found", "match completed", or 404 status, performs final comprehensive data sync to capture match result, verifies all critical data (final score, result, player stats) is persisted, updates match status to "completed" in database, gracefully terminates scraper thread, removes from active scraper registry, triggers cleanup of browser resources, and archives detailed scraping logs to storage/match_logs/{match_id}/

- **What happens during scraper deployment updates (new Docker image, code changes)?**
  - New scraper containers start in parallel with existing ones, perform health checks and verify connectivity to backend and source websites, run in "shadow mode" for 2 minutes scraping but not persisting data to validate accuracy, once validated, new scrapers register as active, old scrapers receive graceful shutdown signal, old scrapers complete current update cycle (max 30 seconds), perform cleanup, then terminate - ensuring zero data gaps or downtime

- **What happens when authentication service (backend /token/generate-token) is temporarily unavailable?**
  - Scrapers detect token generation failure, implement exponential backoff retry logic (1s, 2s, 4s, 8s, 16s, 32s max), continue using any cached valid tokens if expiration time allows (check JWT exp claim), queue non-authenticated data updates to in-memory buffer, attempt to use public endpoints that don't require authentication for basic match data, and log detailed authentication failures for monitoring. If token unavailable for >5 minutes, switch to degraded mode with reduced functionality

- **What happens when memory constraints prevent new scraper from starting (OOM condition)?**
  - System detects insufficient memory (<500MB available) before attempting scraper start, refuses new scraper request with HTTP 503 Service Unavailable and clear error message "Insufficient memory resources", triggers immediate memory cleanup routine that terminates idle scrapers (no match activity for >30 minutes), forces garbage collection, checks for orphaned processes, logs detailed memory usage breakdown by scraper, and queues the start request to retry automatically after 60 seconds once resources are available

- **What happens with extremely long matches (multi-day test matches, >48 hours)?**
  - Scraper implements mandatory restart schedule every 6 hours regardless of match state, performs restart during low-activity periods (detected by analyzing update frequency), saves complete state snapshot before restart including last processed ball, current score, active players, persists snapshot to Redis or SQLite, gracefully shuts down browser, starts fresh scraper instance, loads state snapshot, verifies data consistency by comparing with backend, and resumes scraping from correct position - ensuring no data duplication or gaps

## Requirements *(mandatory)*

### Functional Requirements

#### Core Resilience

- **FR-001**: System MUST detect when scraped data for an active match hasn't been updated for more than 5 minutes and automatically trigger restart sequence for the affected scraper with detailed logging
- **FR-002**: System MUST implement exponential backoff retry logic for all network requests (API calls, web scraping) with minimum delay 1 second, maximum delay 16 seconds, and maximum 5 retry attempts before declaring failure
- **FR-003**: System MUST implement circuit breaker pattern with configurable thresholds: opens after 5 consecutive failures, timeout period 60 seconds, transitions to half-open state after timeout, closes after 5 successful requests in half-open state
- **FR-004**: System MUST gracefully handle browser crashes by detecting hung browser processes (no response for 30 seconds), forcefully terminating all associated processes (browser, renderer, GPU), cleaning up temporary files, and restarting scraper with fresh browser instance
- **FR-005**: System MUST implement graceful shutdown procedure that completes current scraping cycle, closes all browser instances, flushes in-memory queues to database, saves scraper state, and terminates within maximum 30 seconds

#### Resource Management

- **FR-006**: System MUST enforce per-scraper memory limits: soft limit 1.5GB (trigger graceful restart), hard limit 2GB (force kill and restart), measured using RSS (Resident Set Size) including browser process memory
- **FR-007**: System MUST close and cleanup all browser resources (contexts, pages, processes, temporary files) within 10 seconds of scraper termination, whether graceful or forced, with verification through process monitoring
- **FR-008**: System MUST implement database connection pooling using HikariCP (Java backend) with configurable parameters: minimum idle connections 5, maximum pool size 20, connection timeout 30 seconds, idle timeout 10 minutes, max lifetime 30 minutes
- **FR-009**: System MUST detect and terminate orphaned browser processes every 30 minutes by comparing active process IDs against registered scrapers, logging each terminated process with PID and memory usage, and reclaiming resources
- **FR-010**: System MUST implement maximum scraper lifetime of 6 hours, after which scrapers automatically perform graceful shutdown and restart to prevent memory leaks, resource accumulation, and performance degradation
- **FR-011**: System MUST implement bounded in-memory queues for data buffering with limits: maximum 1000 items OR 10MB total size, whichever is reached first, with overflow handling that drops oldest non-critical items while preserving critical updates

#### Health Monitoring

- **FR-012**: System MUST expose health check endpoint at GET /health returning JSON within 100ms containing: overall status (healthy/degraded/down), active_scraper_count, per_match_status array with {match_id, url, last_update_iso8601, error_count, memory_mb}, total_memory_mb, uptime_seconds
- **FR-013**: System MUST include data freshness metadata with every API response: X-Data-Freshness header (ISO 8601 timestamp of last scraper update), X-Data-Age-Seconds header (seconds since last update), allowing clients to assess data recency
- **FR-014**: System MUST log all errors with structured logging format including: timestamp, severity level (DEBUG/INFO/WARN/ERROR/CRITICAL), match_id, scraper_id, error_type, error_message, stack_trace (for ERROR/CRITICAL), context (URL, selector, request details)
- **FR-015**: System MUST track and expose Prometheus metrics on port 9090 including: scraper_errors_total{match_id, error_type}, scraper_updates_total{match_id}, scraper_update_latency_seconds{match_id}, scraper_memory_bytes{match_id}, active_scrapers_count, data_staleness_seconds{match_id}
- **FR-016**: System MUST detect data staleness and trigger alerts when: no updates for 5 minutes during active match, error rate exceeds 10 per minute for any scraper, memory usage exceeds 80% of soft limit, circuit breaker opens for any scraper

#### Error Recovery and Retry Logic

- **FR-017**: System MUST implement retry logic with exponential backoff for network failures (connection timeout, DNS failure, HTTP 5xx errors) with retry delays: 1s, 2s, 4s, 8s, 16s, maximum 5 attempts
- **FR-018**: System MUST handle authentication failures (401/403 HTTP status) by: detecting token expiration, requesting fresh token from backend /token/generate-token endpoint, updating internal auth state, retrying original failed request once, logging authentication flow
- **FR-019**: System MUST handle DOM parsing failures by: logging detailed error with page URL and failed selector, attempting fallback selectors (configurable array of alternative XPath/CSS selectors), capturing page screenshot to storage/errors/, continuing scraper operation without crash
- **FR-020**: System MUST handle database write failures by: queuing failed write to in-memory buffer, implementing exponential backoff for database retry (1s, 2s, 4s, 8s), checking database connectivity with simple health query, logging detailed database error with SQL statement if applicable
- **FR-021**: System MUST detect and recover from browser timeout failures (page load timeout, navigation timeout, selector timeout) by: logging timeout with full context, closing hung page/context, creating fresh browser instance, retrying scraping operation once with increased timeout (+50%)

#### Adaptive Behavior

- **FR-022**: System MUST implement adaptive polling intervals based on match activity: baseline 2.5 seconds during active play, increased to 5s/10s/20s when consecutive errors detected, reduced to 30 seconds during detected breaks (no changes for 10 cycles), optimized to 2 seconds during high-frequency updates
- **FR-023**: System MUST implement adaptive timeout configuration based on observed network latency: measure average response time over last 10 requests, increase page timeout by 50% if average latency >2 seconds, decrease timeout by 20% if average latency <500ms (minimum 15 seconds)
- **FR-024**: System MUST detect match state transitions (active play, break, innings change, match end) by analyzing update patterns and adjust behavior: reduce polling during breaks, increase during active play, perform comprehensive sync during innings changes
- **FR-025**: System MUST implement adaptive resource allocation: prioritize high-priority matches (finals, popular teams) with more frequent polling and stricter freshness requirements, de-prioritize low-activity matches with extended polling intervals

#### API Security

- **FR-026**: External API endpoints MUST require JWT-based authentication with API keys for all match data requests, validating token signature, expiration (24 hour TTL), and API key permissions before returning data
- **FR-027**: System MUST implement rate limiting per API consumer: 100 requests per minute for standard tier, 1000 requests per minute for premium tier, returning HTTP 429 with Retry-After header when exceeded
- **FR-028**: System MUST log all API access attempts including: consumer ID, endpoint accessed, timestamp, response status, data freshness at time of request for audit and analytics purposes

### Non-Functional Requirements

#### Performance

- **NFR-001**: System MUST support minimum 10 concurrent live match scrapers without performance degradation, measured by maintaining <10 second data freshness for all matches
- **NFR-002**: System MUST maintain average memory usage per scraper under 1GB during steady-state operation (after 2+ hours runtime)
- **NFR-003**: System MUST maintain total system memory usage under 10GB when running 10 concurrent scrapers
- **NFR-004**: System MUST process and store scraped data updates with average latency <500ms from data extraction to database persistence
- **NFR-005**: System MUST handle scraper restart/recovery within 60 seconds from failure detection to resumed data collection
- **NFR-006**: Health check endpoint MUST respond within 100ms at p95 latency even under load

#### Reliability

- **NFR-007**: System MUST achieve 99.5% uptime for scraping services (allowing 3.6 hours downtime per month) measured per scraper instance
- **NFR-008**: System MUST achieve 99.9% data accuracy (scraped data matches source website) verified through automated validation checks
- **NFR-009**: System MUST ensure zero data loss for critical match events (runs, wickets, boundaries, overs) during failures, recoveries, or restarts
- **NFR-010**: System MUST recover automatically from 95% of failure scenarios without manual intervention within 5 minutes
- **NFR-011**: System MUST maintain data freshness <10 seconds for 99% of measurements during active match play

#### Scalability

- **NFR-012**: System MUST scale horizontally to support 50+ concurrent scrapers by deploying multiple scraper container instances with shared database backend
- **NFR-013**: Database connection pool MUST support 100+ concurrent connections without performance degradation when scaling to multiple scraper instances
- **NFR-014**: System architecture MUST support adding new scraper instances without downtime or impact to existing scrapers
- **NFR-015**: In-memory queues and caches MUST be bounded to prevent unbounded growth that could lead to OOM errors during high-scale operation

#### Observability

- **NFR-016**: System MUST provide real-time visibility into scraper health with <5 second staleness for monitoring metrics
- **NFR-017**: System MUST log all ERROR and CRITICAL level events to persistent storage with minimum 30 days retention
- **NFR-018**: System MUST expose metrics in Prometheus format for integration with existing monitoring infrastructure
- **NFR-019**: System MUST provide structured JSON logging that can be parsed and indexed by log aggregation tools (ELK, Splunk, CloudWatch)
- **NFR-020**: System MUST include detailed request/response tracing for debugging with configurable verbosity levels

#### Maintainability

- **NFR-021**: Circuit breaker thresholds, timeouts, memory limits, and polling intervals MUST be configurable via environment variables without code changes
- **NFR-022**: System MUST provide clear error messages and remediation guidance in logs for common failure scenarios
- **NFR-023**: System MUST include comprehensive health check endpoint that DevOps can use for automated monitoring and alerting
- **NFR-024**: Code MUST include inline documentation explaining resilience patterns (circuit breaker, retry logic, resource cleanup) for future maintainers
- **NFR-025**: System MUST support graceful deployment updates with zero data loss using rolling restart strategy

## Technical Approach

### Architecture Changes

#### 1. Scraper Context and Lifecycle Management

```python
# New component: apps/scraper/crex_scraper_python/scraper_context.py
class ScraperContext:
    """Manages lifecycle and health of individual scraper instance"""
    - Tracks scraper start time, last update time, error count, memory usage
    - Implements should_restart() logic based on age, staleness, errors
    - Provides health status (healthy/degraded/failing)
    - Manages graceful shutdown with resource cleanup
```

#### 2. Circuit Breaker Pattern

```python
# New component: apps/scraper/crex_scraper_python/circuit_breaker.py
class CircuitBreaker:
    """Prevents cascading failures through failure threshold tracking"""
    - States: CLOSED (normal), OPEN (blocking), HALF_OPEN (testing recovery)
    - Configurable failure threshold (default 5) and timeout (default 60s)
    - Tracks failure count, transitions between states
    - Provides call() wrapper for protected operations
```

#### 3. Retry Logic with Exponential Backoff

```python
# New utility: apps/scraper/crex_scraper_python/retry_utils.py
def retry_with_backoff(func, max_retries=5, base_delay=1, max_delay=16):
    """Implements exponential backoff for transient failures"""
    - Retries with delays: 1s, 2s, 4s, 8s, 16s
    - Logs each retry attempt with context
    - Raises final exception if all retries exhausted
```

#### 4. Resource Management and Cleanup

```python
# Enhanced: apps/scraper/crex_scraper.py - fetchData() function
def fetchData(url):
    """Enhanced with comprehensive resource management"""
    - Wrap browser lifecycle in try/finally for guaranteed cleanup
    - Implement context managers for page/browser resources
    - Track browser process PIDs for orphan detection
    - Set shorter timeouts (30s page, 30s navigation)
    - Implement periodic resource checks and cleanup
```

#### 5. Database Connection Pooling

```python
# New component: apps/scraper/crex_scraper_python/db_pool.py
class ConnectionPool:
    """SQLite connection pooling for concurrent access"""
    - Maintains pool of reusable connections (size 5-10)
    - Thread-safe connection acquisition/release
    - Automatic connection health checks
    - Prevents connection leaks
```

#### 6. Health Monitoring Endpoints

```python
# Enhanced: apps/scraper/crex_main_url.py
@app.route('/health', methods=['GET'])
def health_check():
    """Comprehensive health status endpoint"""
    - Returns overall status, active scraper count
    - Per-match metrics: last update time, error count, memory
    - Response time <100ms
    - Used for Docker healthcheck and monitoring
```

#### 7. Prometheus Metrics Integration

```python
# New component: apps/scraper/crex_scraper_python/monitoring.py
- Expose Prometheus metrics on port 9090
- Track: errors, updates, latency, memory, active scrapers
- Label metrics by match_id and error_type
- Integration with Grafana for dashboards
```

### Backend Enhancements

#### 1. HikariCP Connection Pool Configuration

```properties
# Enhanced: apps/backend/spring-security-jwt/src/main/resources/application.properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.leak-detection-threshold=60000
```

#### 2. Asynchronous Data Processing

```java
// Enhanced: CricketDataController.java
@PostMapping
public ResponseEntity<String> receiveCricketData(@RequestBody CricketDataDTO data) {
    // Accept request immediately, process asynchronously
    CompletableFuture.runAsync(() -> processAndStoreCricketData(data), taskExecutor);
    return ResponseEntity.ok("Data accepted");
}
```

#### 3. Response Headers for Data Freshness

```java
// Enhanced: Match data endpoints
@GetMapping("/match-info/{id}")
public ResponseEntity<MatchInfo> getMatchInfo(@PathVariable Long id) {
    MatchInfo match = service.getMatchInfo(id);
    return ResponseEntity.ok()
        .header("X-Data-Freshness", match.getLastUpdated().toString())
        .header("X-Data-Age-Seconds", calculateAgeSec(match.getLastUpdated()))
        .body(match);
}
```

#### 4. API Authentication and Rate Limiting

```java
// New: API Security Configuration
@Configuration
@EnableWebSecurity
public class ApiSecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .authorizeRequests()
                .antMatchers("/health", "/metrics").permitAll()
                .antMatchers("/api/**").authenticated()
            .and()
            .oauth2ResourceServer()
                .jwt()
                .jwtAuthenticationConverter(jwtAuthenticationConverter());
    }
}

// New: Rate Limiting Filter
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) {
        String apiKey = extractApiKey(request);
        String tier = apiKeyService.getTier(apiKey); // "standard" or "premium"
        int limit = tier.equals("premium") ? 1000 : 100;
        
        if (!rateLimiter.allowRequest(apiKey, limit)) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
```

### Infrastructure Changes

#### 1. Docker Resource Limits

```yaml
# Enhanced: docker-compose.prod.yml
services:
  scraper:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    restart: on-failure:3
    environment:
      SCRAPER_MAX_LIFETIME_HOURS: "6"
      MEMORY_SOFT_LIMIT_MB: "1536"
      MEMORY_HARD_LIMIT_MB: "2048"
```

#### 2. Redis Caching Layer (Optional)

```yaml
# New service: docker-compose.prod.yml
redis:
  image: redis:7-alpine
  container_name: victoryline-redis
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

#### 3. Monitoring Stack

```yaml
# New: docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9091:9090"
      
  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    ports:
      - "9093:9093"
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      
  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Configuration Management

All resilience parameters MUST be configurable via environment variables:

```bash
# Scraper Configuration
SCRAPER_MAX_LIFETIME_HOURS=6              # Maximum scraper runtime before restart
MEMORY_SOFT_LIMIT_MB=1536                 # Trigger graceful restart
MEMORY_HARD_LIMIT_MB=2048                 # Force kill limit
POLLING_INTERVAL_SECONDS=2.5              # Baseline polling frequency
STALENESS_THRESHOLD_SECONDS=300           # Trigger alert/restart
MAX_QUEUE_SIZE=1000                       # In-memory queue limit
MAX_QUEUE_SIZE_MB=10                      # Alternative queue limit

# Circuit Breaker Configuration
CIRCUIT_BREAKER_THRESHOLD=5               # Failures before opening
CIRCUIT_BREAKER_TIMEOUT_SECONDS=60        # Reset attempt delay
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=5       # Successes to close

# Retry Configuration
RETRY_MAX_ATTEMPTS=5                      # Maximum retry attempts
RETRY_BASE_DELAY_SECONDS=1                # Initial retry delay
RETRY_MAX_DELAY_SECONDS=16                # Maximum retry delay

# Monitoring Configuration
ENABLE_PROMETHEUS_METRICS=true            # Expose Prometheus metrics
PROMETHEUS_PORT=9090                      # Metrics endpoint port
HEALTH_CHECK_ENABLED=true                 # Enable /health endpoint
LOG_LEVEL=INFO                            # DEBUG/INFO/WARN/ERROR/CRITICAL
```

## Out of Scope

- **Real-time WebSocket streaming** to end users - remains traditional REST API polling
- **Machine learning-based anomaly detection** - uses rule-based thresholds only
- **Multi-region distributed scraping** - single region deployment only
- **Advanced load balancing algorithms** - uses simple round-robin if multiple instances
- **Automated source website change detection** - requires manual code updates for major DOM changes
- **Historical data backfill** - focuses on live data only, no retroactive scraping
- **Custom alerting UI/dashboard** - relies on existing tools (Prometheus/Grafana)
- **Database migration from H2** - remains H2 for this feature, migration is separate effort
- **CDN integration for API responses** - direct API responses only
- **Rate limiting for scrapers** - assumes respectful scraping without explicit limits
- **Multi-tenant scraping** - single tenant deployment model

## Success Metrics

### Before Implementation (Current State)

- Data staleness incidents: ~5-8 per day requiring manual restart
- Average scraper uptime: ~85% (6-8 hours before failure)
- Recovery time: 15-30 minutes (manual intervention required)
- Memory leaks: Browser processes accumulate, reaching 3-5GB after 12 hours
- Concurrent match capacity: 3-4 matches before performance degradation
- API response time: 150-300ms (no caching)
- Manual interventions: 2-3 per day on average

### After Implementation (Target State)

- Data staleness incidents: <1 per week (99% reduction)
- Average scraper uptime: 99.5% per instance
- Auto-recovery time: <60 seconds (96% improvement)
- Memory usage: Stable at <1GB per scraper, no leaks
- Concurrent match capacity: 10+ matches without degradation
- API response time: <100ms with caching (60% improvement)
- Manual interventions: <1 per week (85% reduction)

### Key Performance Indicators (KPIs)

1. **Data Freshness**: 99% of measurements <10 seconds during active play
2. **System Uptime**: 99.5% availability (3.6 hours downtime/month allowed)
3. **Auto-Recovery Rate**: 95% of failures recover without human intervention
4. **Resource Efficiency**: <1GB memory per scraper, <20% CPU usage
5. **Scalability**: Support 10+ concurrent matches in single deployment
6. **API Performance**: p95 response time <150ms, p99 <300ms

## Dependencies

### Internal Dependencies

- **Backend API** (apps/backend/spring-security-jwt): Token generation, data persistence endpoints
- **Database Schema**: Requires columns for last_updated timestamps on all match data tables
- **Docker Infrastructure**: Requires Docker Compose v3.8+, Docker Engine 20.10+

### External Dependencies

- **Playwright**: Python library for browser automation (already in use)
- **Flask**: Python web framework for scraper API (already in use)
- **Prometheus Client**: Python library for metrics exposition (NEW - pip install prometheus-client)
- **psutil**: Python library for process and memory monitoring (NEW - pip install psutil)
- **pytest**: Python testing framework for unit and acceptance tests (NEW - pip install pytest pytest-playwright)
- **HikariCP**: Java connection pooling (already included in Spring Boot)
- **Redis**: Optional caching layer (OPTIONAL - for future enhancement)

### Infrastructure Dependencies

- **Docker**: Container orchestration platform (version 20.10+)
- **Docker Compose**: Multi-container management (version 3.8+)
- **Linux/Unix OS**: For process management and resource monitoring
- **Monitoring Tools**: Prometheus and Grafana (optional but recommended)

## Testing Strategy

### Unit Tests

- Circuit breaker state transitions and failure counting
- Retry logic with exponential backoff timing
- Connection pool acquisition and release
- Memory usage calculation and threshold detection
- Health check endpoint response format
- Adaptive polling interval calculations

### Integration Tests

- Scraper lifecycle: start → run → graceful shutdown → cleanup verification
- Browser resource cleanup after crashes and normal termination
- Database connection pool under concurrent load
- Circuit breaker integration with actual scraping operations
- Authentication token refresh flow end-to-end
- Health check endpoint during various system states

### Load Tests

- 10 concurrent scrapers running for 12 hours
- Memory stability testing: measure RSS every 15 minutes for 24 hours
- Database connection pool saturation: 50+ concurrent requests
- API response time under load: 100 requests/second for 10 minutes
- Recovery time testing: induce 20 failures over 2 hours, measure recovery

### Chaos Engineering Tests

- Network failure simulation: disconnect for 10-30 second intervals
- Process kill simulation: randomly kill scraper processes
- Memory pressure: limit available memory to trigger soft/hard limits
- Database unavailability: stop database for 2-5 minute intervals
- Browser crash simulation: force Chromium process termination
- Authentication failure: revoke tokens during active scraping

### Acceptance Tests

Automated using **pytest with Playwright integration** for end-to-end validation:

```python
# Example: tests/acceptance/test_scraper_resilience.py
import pytest
from playwright.sync_api import sync_playwright

@pytest.mark.acceptance
def test_automatic_recovery_from_network_failure(scraper_service):
    """User Story 1, Scenario 1: Network failure recovery"""
    # Start scraper
    scraper = scraper_service.start("https://example.com/match123")
    
    # Verify initial data collection
    assert scraper.is_collecting_data()
    
    # Simulate network failure (10 seconds)
    with network_failure_simulation(duration=10):
        time.sleep(10)
    
    # Verify automatic recovery within 30 seconds
    assert scraper.recovered_within(seconds=30)
    assert scraper.data_loss() == 0
    
@pytest.mark.acceptance
def test_memory_limit_triggers_restart(scraper_service, memory_monitor):
    """User Story 2, Scenario 1: Soft memory limit restart"""
    scraper = scraper_service.start("https://example.com/match123")
    
    # Simulate memory growth to 1.5GB
    memory_monitor.simulate_growth(target_mb=1536)
    
    # Verify graceful restart triggered
    assert scraper.restart_triggered_within(seconds=60)
    assert scraper.restart_type == "graceful"
    assert scraper.data_continuity_maintained()
```

**Test Coverage Requirements**:
- All 5 user stories with all acceptance scenarios (20+ tests)
- All 28 functional requirements validated
- Performance benchmarks (NFR-001 to NFR-006)
- Reliability metrics (NFR-007 to NFR-011)
- All 7 edge cases with automated simulation

**CI/CD Integration**:
- Run on every commit to feature branch
- Staging environment deployment triggers full acceptance suite
- Production deployment requires 100% acceptance test pass rate
- Automated nightly regression tests on production-like environment

## Rollout Plan

### Phase 1: Foundation (Week 1-2)

1. Implement ScraperContext and lifecycle management
2. Add browser resource cleanup with guaranteed finalization
3. Implement health check endpoint
4. Add structured logging with severity levels
5. Deploy to staging environment
6. **Success Criteria**: No memory leaks over 24 hours, clean resource cleanup

### Phase 2: Resilience Patterns (Week 3-4)

1. Implement circuit breaker pattern
2. Add retry logic with exponential backoff
3. Implement database connection pooling
4. Add graceful shutdown handling
5. **Success Criteria**: Auto-recovery from induced failures within 60 seconds

### Phase 3: Monitoring and Observability (Week 5)

1. Integrate Prometheus metrics
2. Add data freshness headers to API responses
3. Implement staleness detection and alerts
4. Create Grafana dashboards
5. **Success Criteria**: Real-time visibility into all scraper health metrics

### Phase 4: Adaptive Behavior (Week 6)

1. Implement adaptive polling intervals
2. Add adaptive timeout configuration
3. Implement match state detection
4. Optimize resource allocation by priority
5. **Success Criteria**: System adapts to load and conditions automatically

### Phase 5: Production Deployment (Week 7)

1. Deploy to production with gradual rollout (1 scraper, then 3, then all)
2. Monitor metrics and error rates closely
3. Fine-tune configuration based on real-world behavior
4. Document operational procedures
5. **Success Criteria**: 99.5% uptime, <10s data freshness for all matches

### Phase 6: Optimization (Week 8+)

1. Analyze performance metrics and bottlenecks
2. Implement Redis caching layer if needed
3. Optimize database queries and indexes
4. Scale to 20+ concurrent matches
5. **Success Criteria**: Support 20+ matches with same reliability metrics

## Monitoring and Alerting

### Critical Alerts (Immediate Response Required)

- **Data Stale**: No updates for 5+ minutes during active match → Auto-restart triggered
- **Scraper Down**: Health check fails 3 consecutive times → Manual investigation needed
- **Memory Critical**: Memory usage exceeds hard limit 2GB → Force restart triggered
- **Circuit Breaker Open**: Circuit breaker in OPEN state for >5 minutes → Check source website

**Alert Delivery**: All alerts delivered via Prometheus Alertmanager configured to send notifications to:
- Email: ops-team@victoryline.com
- Slack: #scraper-alerts channel
- Routing rules: CRITICAL severity → immediate notification, WARNING severity → batched every 5 minutes

### Warning Alerts (Investigation Within 1 Hour)

- **High Error Rate**: >10 errors/minute for any scraper
- **Elevated Memory**: Memory usage exceeds soft limit 1.5GB
- **Slow Recovery**: Auto-recovery taking >2 minutes
- **Database Slow**: Connection pool wait time >500ms

### Dashboards

1. **Scraper Health Overview**: Active count, status per match, error rates
2. **Resource Usage**: Memory/CPU per scraper, total system resources
3. **Data Freshness**: Last update time per match, staleness distribution
4. **Performance Metrics**: Update latency, API response times, throughput
5. **Reliability Metrics**: Uptime %, auto-recovery success rate, manual interventions

## Risk Assessment

### High Risk

- **Browser driver compatibility**: Playwright updates may break existing scraping logic
  - **Mitigation**: Pin Playwright version, test updates in staging, maintain version matrix
  
- **Source website anti-scraping measures**: CricInfo may implement bot detection
  - **Mitigation**: Respectful scraping rates, user agent rotation, monitor for blocks

### Medium Risk

- **Database migration complexity**: Moving from H2 to PostgreSQL in future
  - **Mitigation**: Design connection pooling to be database-agnostic, use JPA abstractions

- **Monitoring overhead**: Metrics collection impacts performance
  - **Mitigation**: Async metrics collection, sampling for high-frequency metrics, configurable

### Low Risk

- **Configuration complexity**: Many environment variables to manage
  - **Mitigation**: Sensible defaults, comprehensive documentation, validation at startup

- **Docker resource limits**: May be too restrictive or too loose
  - **Mitigation**: Start conservative, monitor real usage, adjust based on data

## Appendix

### Glossary

- **Circuit Breaker**: Design pattern that prevents cascading failures by temporarily blocking operations after repeated failures
- **Exponential Backoff**: Retry strategy with progressively increasing delays (1s, 2s, 4s, 8s...)
- **Graceful Shutdown**: Orderly termination that completes current work and cleans up resources
- **Hard Limit**: Absolute maximum threshold that triggers immediate force termination
- **Soft Limit**: Warning threshold that triggers graceful corrective action
- **Staleness**: Time elapsed since last data update; indicates data freshness
- **RSS (Resident Set Size)**: Actual physical memory used by a process
- **Connection Pool**: Reusable set of database connections to avoid connection overhead
- **Orphaned Process**: Process that continues running after parent terminates

### References

- [Playwright Python Documentation](https://playwright.dev/python/)
- [Circuit Breaker Pattern - Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Prometheus Python Client](https://github.com/prometheus/client_python)
- [HikariCP Configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby)
- [Docker Resource Constraints](https://docs.docker.com/config/containers/resource_constraints/)
- [Spring Boot Async Processing](https://spring.io/guides/gs/async-method/)

### Related Specifications

- **003-seo-optimization**: May need fresh data guarantees for live match rich snippets
- **002-match-details-ux**: Benefits from reliable, fresh data for enhanced match detail pages
- **001-modern-ui-redesign**: Real-time UI updates depend on reliable scraper data flow

### Incident Reports & Checklist

- **Scraper Thread/PID Leak Incident**: `./incidents/SCRAPER_THREAD_LEAK_INCIDENT.md`
- **Fix Checklist**: `./incidents/SCRAPER_FIX_CHECKLIST.md`

---

**Next Steps**: Review this specification with stakeholders, prioritize requirements, and create detailed implementation tasks in [tasks.md](./tasks.md).
