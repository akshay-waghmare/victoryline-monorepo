# Data Model: Scraper Resilience

**Feature**: 004-scraper-resilience  
**Created**: 2025-11-12

## Overview

This document describes the data structures, database schema changes, and data flow for the scraper resilience feature.

## Core Data Structures

### 1. ScraperContext

Manages lifecycle and health of individual scraper instances.

```python
@dataclass
class ScraperContext:
    """Tracks state and health of a single scraper instance"""
    
    # Identity
    scraper_id: str                    # Unique identifier (UUID)
    match_id: str                      # Match identifier
    url: str                           # Source URL being scraped
    
    # Lifecycle
    start_time: datetime               # When scraper started
    last_update_time: datetime         # Last successful data update
    max_lifetime_seconds: int = 21600  # 6 hours default
    
    # Health tracking
    error_count: int = 0               # Consecutive errors
    total_errors: int = 0              # Lifetime errors
    total_updates: int = 0             # Successful updates
    health_status: str = "healthy"     # healthy/degraded/failing
    
    # Resource usage
    memory_bytes: int = 0              # Current memory usage (RSS)
    cpu_percent: float = 0.0           # CPU usage percentage
    browser_pid: Optional[int] = None  # Browser process ID
    
    # Configuration
    polling_interval: float = 2.5      # Current polling interval
    soft_memory_limit: int = 1610612736  # 1.5GB in bytes
    hard_memory_limit: int = 2147483648  # 2GB in bytes
    
    def should_restart(self) -> bool:
        """Determine if scraper should restart"""
        age = (datetime.now() - self.start_time).total_seconds()
        staleness = (datetime.now() - self.last_update_time).total_seconds()
        
        if age > self.max_lifetime_seconds:
            return True
        if staleness > 300:  # 5 minutes
            return True
        if self.error_count > 10:
            return True
        if self.memory_bytes > self.soft_memory_limit:
            return True
        return False
        
    def get_health_status(self) -> str:
        """Calculate current health status"""
        staleness = (datetime.now() - self.last_update_time).total_seconds()
        
        if self.error_count > 5 or staleness > 300:
            return "failing"
        elif self.error_count > 2 or staleness > 120:
            return "degraded"
        else:
            return "healthy"
            
    def to_dict(self) -> dict:
        """Serialize to dictionary for API responses"""
        return {
            "scraper_id": self.scraper_id,
            "match_id": self.match_id,
            "url": self.url,
            "start_time": self.start_time.isoformat(),
            "last_update": self.last_update_time.isoformat(),
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
            "error_count": self.error_count,
            "total_errors": self.total_errors,
            "total_updates": self.total_updates,
            "health_status": self.health_status,
            "memory_mb": self.memory_bytes / 1024 / 1024,
            "cpu_percent": self.cpu_percent,
            "polling_interval": self.polling_interval
        }
```

### 2. CircuitBreaker

Implements circuit breaker pattern for failure isolation.

```python
@dataclass
class CircuitBreaker:
    """Circuit breaker for preventing cascading failures"""
    
    # Configuration
    name: str                          # Identifier for this breaker
    failure_threshold: int = 5         # Failures before opening
    timeout_seconds: int = 60          # Time before retry
    success_threshold: int = 5         # Successes to close
    
    # State
    state: str = "CLOSED"              # CLOSED/OPEN/HALF_OPEN
    failure_count: int = 0             # Current failure count
    success_count: int = 0             # Success count in HALF_OPEN
    last_failure_time: Optional[datetime] = None
    last_state_change: datetime = field(default_factory=datetime.now)
    
    # Statistics
    total_calls: int = 0
    total_successes: int = 0
    total_failures: int = 0
    total_rejections: int = 0          # Calls rejected when OPEN
    
    def can_attempt(self) -> bool:
        """Check if request can proceed"""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            # Check if timeout expired
            if (datetime.now() - self.last_failure_time).total_seconds() > self.timeout_seconds:
                self.transition_to_half_open()
                return True
            return False
        else:  # HALF_OPEN
            return True
            
    def record_success(self):
        """Record successful call"""
        self.total_calls += 1
        self.total_successes += 1
        
        if self.state == "HALF_OPEN":
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.transition_to_closed()
        elif self.state == "CLOSED":
            self.failure_count = 0
            
    def record_failure(self):
        """Record failed call"""
        self.total_calls += 1
        self.total_failures += 1
        self.last_failure_time = datetime.now()
        
        if self.state == "HALF_OPEN":
            self.transition_to_open()
        elif self.state == "CLOSED":
            self.failure_count += 1
            if self.failure_count >= self.failure_threshold:
                self.transition_to_open()
                
    def transition_to_open(self):
        """Transition to OPEN state"""
        self.state = "OPEN"
        self.last_state_change = datetime.now()
        self.success_count = 0
        logging.error(f"Circuit breaker '{self.name}' opened after {self.failure_count} failures")
        
    def transition_to_half_open(self):
        """Transition to HALF_OPEN state"""
        self.state = "HALF_OPEN"
        self.last_state_change = datetime.now()
        self.failure_count = 0
        self.success_count = 0
        logging.info(f"Circuit breaker '{self.name}' attempting recovery (HALF_OPEN)")
        
    def transition_to_closed(self):
        """Transition to CLOSED state"""
        self.state = "CLOSED"
        self.last_state_change = datetime.now()
        self.failure_count = 0
        self.success_count = 0
        logging.info(f"Circuit breaker '{self.name}' closed after successful recovery")
        
    def to_dict(self) -> dict:
        """Serialize to dictionary"""
        return {
            "name": self.name,
            "state": self.state,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "total_calls": self.total_calls,
            "total_successes": self.total_successes,
            "total_failures": self.total_failures,
            "total_rejections": self.total_rejections,
            "last_state_change": self.last_state_change.isoformat() if self.last_state_change else None
        }
```

### 3. HealthStatus

Comprehensive health information for monitoring.

```python
@dataclass
class HealthStatus:
    """Overall system health status"""
    
    # Overall status
    status: str                        # healthy/degraded/down
    timestamp: datetime = field(default_factory=datetime.now)
    
    # Scraper metrics
    active_scraper_count: int
    total_matches_scraping: int
    scrapers: List[Dict]               # ScraperContext.to_dict() for each
    
    # Resource metrics
    total_memory_mb: float
    average_memory_mb: float
    peak_memory_mb: float
    total_cpu_percent: float
    
    # Error metrics
    total_errors_last_minute: int
    total_errors_last_hour: int
    circuit_breakers: List[Dict]        # CircuitBreaker.to_dict() for each
    
    # Performance metrics
    average_update_latency_ms: float
    p95_update_latency_ms: float
    updates_per_minute: int
    
    def to_dict(self) -> dict:
        """Serialize for API response"""
        return {
            "status": self.status,
            "timestamp": self.timestamp.isoformat(),
            "active_scraper_count": self.active_scraper_count,
            "total_matches_scraping": self.total_matches_scraping,
            "scrapers": self.scrapers,
            "resources": {
                "total_memory_mb": self.total_memory_mb,
                "average_memory_mb": self.average_memory_mb,
                "peak_memory_mb": self.peak_memory_mb,
                "total_cpu_percent": self.total_cpu_percent
            },
            "errors": {
                "last_minute": self.total_errors_last_minute,
                "last_hour": self.total_errors_last_hour,
                "circuit_breakers": self.circuit_breakers
            },
            "performance": {
                "average_latency_ms": self.average_update_latency_ms,
                "p95_latency_ms": self.p95_update_latency_ms,
                "updates_per_minute": self.updates_per_minute
            }
        }
```

## Database Schema Changes

### New Table: scraper_health_log

Track scraper health metrics over time.

```sql
CREATE TABLE scraper_health_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scraper_id VARCHAR(36) NOT NULL,
    match_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Health metrics
    health_status VARCHAR(20) NOT NULL,  -- healthy/degraded/failing
    error_count INT NOT NULL DEFAULT 0,
    memory_mb DECIMAL(10,2),
    cpu_percent DECIMAL(5,2),
    
    -- Performance metrics
    update_latency_ms INT,
    polling_interval_seconds DECIMAL(5,2),
    
    -- State
    uptime_seconds INT,
    last_update_age_seconds INT,
    
    INDEX idx_scraper_timestamp (scraper_id, timestamp),
    INDEX idx_match_timestamp (match_id, timestamp),
    INDEX idx_health_status (health_status, timestamp)
);
```

### New Table: scraper_errors

Log detailed error information for analysis.

```sql
CREATE TABLE scraper_errors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scraper_id VARCHAR(36) NOT NULL,
    match_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Error details
    error_type VARCHAR(50) NOT NULL,    -- network/parsing/browser/database/auth
    error_message TEXT,
    stack_trace TEXT,
    
    -- Context
    url VARCHAR(500),
    operation VARCHAR(100),             -- What was being attempted
    retry_attempt INT DEFAULT 0,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolution_time TIMESTAMP NULL,
    resolution_method VARCHAR(50),      -- auto_retry/circuit_breaker/manual/restart
    
    INDEX idx_scraper_timestamp (scraper_id, timestamp),
    INDEX idx_error_type (error_type, timestamp),
    INDEX idx_unresolved (resolved, timestamp)
);
```

### Modified Table: matches

Add data freshness tracking columns.

```sql
ALTER TABLE matches
ADD COLUMN last_scraper_update TIMESTAMP NULL,
ADD COLUMN data_freshness_seconds INT DEFAULT 0,
ADD COLUMN scraper_status VARCHAR(20) DEFAULT 'unknown',  -- active/stale/stopped/error
ADD INDEX idx_freshness (data_freshness_seconds),
ADD INDEX idx_scraper_status (scraper_status);
```

### Modified Table: live_match_data

Add scraper metadata.

```sql
ALTER TABLE live_match_data
ADD COLUMN scraper_id VARCHAR(36),
ADD COLUMN update_latency_ms INT,
ADD COLUMN data_source VARCHAR(50) DEFAULT 'scraper',  -- scraper/cache/manual
ADD INDEX idx_scraper (scraper_id);
```

## Configuration Schema

### Environment Variables

```bash
# Core Configuration
SCRAPER_MAX_LIFETIME_HOURS=6              # int: Maximum runtime before restart
MEMORY_SOFT_LIMIT_MB=1536                 # int: Trigger graceful restart
MEMORY_HARD_LIMIT_MB=2048                 # int: Force kill limit
POLLING_INTERVAL_SECONDS=2.5              # float: Baseline polling frequency
STALENESS_THRESHOLD_SECONDS=300           # int: Alert/restart threshold
MAX_QUEUE_SIZE=1000                       # int: In-memory queue items
MAX_QUEUE_SIZE_MB=10                      # int: Alternative queue limit

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5               # int: Failures before opening
CIRCUIT_BREAKER_TIMEOUT_SECONDS=60        # int: Reset attempt delay
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=5       # int: Successes to close

# Retry Configuration
RETRY_MAX_ATTEMPTS=5                      # int: Maximum retry attempts
RETRY_BASE_DELAY_SECONDS=1                # int: Initial retry delay
RETRY_MAX_DELAY_SECONDS=16                # int: Maximum retry delay

# Browser Configuration
PAGE_TIMEOUT_SECONDS=30                   # int: Page load timeout
NAVIGATION_TIMEOUT_SECONDS=30             # int: Navigation timeout
SELECTOR_TIMEOUT_SECONDS=5                # int: Element wait timeout
BROWSER_HEADLESS=true                     # bool: Headless mode

# Database Configuration
DB_CONNECTION_POOL_SIZE=10                # int: Connection pool size
DB_CONNECTION_TIMEOUT_SECONDS=30          # int: Connection acquisition timeout

# Monitoring Configuration
ENABLE_PROMETHEUS_METRICS=true            # bool: Expose Prometheus metrics
PROMETHEUS_PORT=9090                      # int: Metrics endpoint port
HEALTH_CHECK_ENABLED=true                 # bool: Enable /health endpoint
LOG_LEVEL=INFO                            # str: DEBUG/INFO/WARN/ERROR/CRITICAL

# Adaptive Behavior
ENABLE_ADAPTIVE_POLLING=true              # bool: Dynamic polling intervals
ENABLE_ADAPTIVE_TIMEOUTS=true             # bool: Dynamic timeout adjustment
ENABLE_MATCH_STATE_DETECTION=true         # bool: Detect match state changes
```

### Config File Format (Optional)

```yaml
# config.yaml
scraper:
  lifecycle:
    max_lifetime_hours: 6
    polling_interval: 2.5
    staleness_threshold: 300
    
  resources:
    memory:
      soft_limit_mb: 1536
      hard_limit_mb: 2048
    queue:
      max_size: 1000
      max_size_mb: 10
      
  resilience:
    circuit_breaker:
      threshold: 5
      timeout: 60
      success_threshold: 5
    retry:
      max_attempts: 5
      base_delay: 1
      max_delay: 16
      
  browser:
    timeouts:
      page: 30
      navigation: 30
      selector: 5
    headless: true
    
  monitoring:
    prometheus:
      enabled: true
      port: 9090
    health_check:
      enabled: true
    logging:
      level: INFO
      structured: true
```

## Data Flow

### 1. Scraper Lifecycle Data Flow

```
Start Scraper Request
  ↓
Create ScraperContext
  ↓
Initialize Browser (tracked by PID)
  ↓
Main Scraping Loop
  ├─ Check should_restart() → Restart if needed
  ├─ Scrape Data (with circuit breaker protection)
  ├─ Update ScraperContext metrics
  ├─ Store data to database
  ├─ Update Prometheus metrics
  └─ Log to scraper_health_log (periodic)
  ↓
Shutdown Signal Received
  ↓
Graceful Cleanup
  ├─ Complete current cycle
  ├─ Close browser resources
  ├─ Flush queues
  ├─ Save final state
  └─ Log termination
```

### 2. Error Handling Data Flow

```
Operation Attempt
  ↓
Exception Occurs
  ↓
Log to scraper_errors table
  ↓
Check Circuit Breaker
  ├─ OPEN → Reject immediately
  ├─ HALF_OPEN → Allow attempt
  └─ CLOSED → Allow attempt
  ↓
Retry with Exponential Backoff
  ├─ Attempt 1 (delay 1s)
  ├─ Attempt 2 (delay 2s)
  ├─ Attempt 3 (delay 4s)
  ├─ Attempt 4 (delay 8s)
  └─ Attempt 5 (delay 16s)
  ↓
Success or Final Failure
  ├─ Success → Reset error count, update metrics
  └─ Failure → Increment circuit breaker, trigger restart
```

### 3. Health Monitoring Data Flow

```
Health Check Request (/health)
  ↓
Collect Metrics from Active Scrapers
  ├─ ScraperContext for each scraper
  ├─ Memory/CPU from psutil
  ├─ Error counts from circuit breakers
  └─ Performance from Prometheus
  ↓
Calculate Overall Health Status
  ├─ healthy: All scrapers OK, <5 errors/min
  ├─ degraded: Some scrapers stale, 5-10 errors/min
  └─ down: No active scrapers, >10 errors/min
  ↓
Return JSON Response (<100ms)

# Parallel: Prometheus Metrics
Scraper Operations
  ↓
Update Metrics
  ├─ Counters: errors_total, updates_total
  ├─ Gauges: active_scrapers, memory_bytes
  └─ Histograms: update_latency
  ↓
Prometheus Scrapes /metrics (every 15s)
  ↓
Store in Prometheus TSDB
  ↓
Grafana Queries and Visualizes
```

## API Response Formats

### GET /health

```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:30:00Z",
  "active_scraper_count": 5,
  "total_matches_scraping": 5,
  "scrapers": [
    {
      "scraper_id": "uuid-123",
      "match_id": "match456",
      "url": "https://...",
      "start_time": "2025-11-12T08:00:00Z",
      "last_update": "2025-11-12T10:29:55Z",
      "uptime_seconds": 9000,
      "error_count": 0,
      "total_errors": 2,
      "total_updates": 1200,
      "health_status": "healthy",
      "memory_mb": 850.5,
      "cpu_percent": 15.2,
      "polling_interval": 2.5
    }
  ],
  "resources": {
    "total_memory_mb": 4252.5,
    "average_memory_mb": 850.5,
    "peak_memory_mb": 1024.8,
    "total_cpu_percent": 76.0
  },
  "errors": {
    "last_minute": 0,
    "last_hour": 5,
    "circuit_breakers": [
      {
        "name": "match456_scraper",
        "state": "CLOSED",
        "failure_count": 0,
        "total_calls": 1200,
        "total_successes": 1198,
        "total_failures": 2
      }
    ]
  },
  "performance": {
    "average_latency_ms": 450,
    "p95_latency_ms": 850,
    "updates_per_minute": 24
  }
}
```

### GET /cricket-data/match-info/{id} (Enhanced)

```http
HTTP/1.1 200 OK
X-Data-Freshness: 2025-11-12T10:30:45Z
X-Data-Age-Seconds: 3
Content-Type: application/json

{
  "matchId": 123,
  "teams": [...],
  "score": {...},
  "status": "live",
  "_metadata": {
    "scraped_at": "2025-11-12T10:30:45Z",
    "data_age_seconds": 3,
    "scraper_id": "uuid-123",
    "source": "scraper"
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-12  
**Owner**: Scraper Resilience Team
