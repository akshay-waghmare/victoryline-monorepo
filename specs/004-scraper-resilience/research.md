# Research: Scraper Resilience Patterns

**Feature**: 004-scraper-resilience  
**Created**: 2025-11-12

## Problem Statement

The current cricket match scraper experiences frequent failures and data staleness issues, requiring manual intervention 2-3 times per day. Key problems identified:

1. **Memory Leaks**: Browser processes accumulate, reaching 3-5GB after 12 hours
2. **No Automatic Recovery**: Manual restarts required after failures
3. **Resource Exhaustion**: Poor cleanup of browser instances and database connections
4. **Limited Observability**: No real-time health monitoring or metrics
5. **Poor Error Handling**: Network/parsing failures crash scrapers

This research explores patterns and technologies to build resilient, self-healing scrapers.

## Research Areas

### 1. Circuit Breaker Pattern

**Concept**: Prevent cascading failures by temporarily blocking operations after repeated failures.

**States**:
- **CLOSED**: Normal operation, requests flow through
- **OPEN**: Blocking requests after threshold failures exceeded
- **HALF_OPEN**: Testing recovery after timeout period

**Implementation Options**:

#### Option A: Custom Python Implementation
```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.state = "CLOSED"
        self.failure_count = 0
        self.last_failure_time = None
        
    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise CircuitBreakerOpen("Circuit breaker is open")
        
        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            raise e
```

**Pros**: Full control, no dependencies, customizable
**Cons**: Need to implement and test state machine

#### Option B: pybreaker Library
```python
from pybreaker import CircuitBreaker

breaker = CircuitBreaker(fail_max=5, timeout_duration=60)

@breaker
def scrape_data(url):
    # Protected operation
    pass
```

**Pros**: Battle-tested, decorator pattern, simple
**Cons**: Additional dependency, less flexibility

**Recommendation**: Option A (custom implementation) for full control and learning

**References**:
- [Martin Fowler - Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Release It! by Michael Nygard](https://www.oreilly.com/library/view/release-it-2nd/9781680504552/)
- [pybreaker library](https://github.com/danielfm/pybreaker)

---

### 2. Retry Logic with Exponential Backoff

**Concept**: Automatically retry failed operations with increasing delays to handle transient failures.

**Exponential Backoff Formula**: `delay = base_delay * (2 ^ attempt) + random_jitter`

**Implementation Patterns**:

#### Pattern 1: Decorator-Based
```python
def retry_with_backoff(max_retries=5, base_delay=1, max_delay=16):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    jitter = random.uniform(0, delay * 0.1)
                    time.sleep(delay + jitter)
                    logging.warning(f"Retry {attempt + 1}/{max_retries}: {e}")
        return wrapper
    return decorator

@retry_with_backoff(max_retries=5, base_delay=1)
def fetch_data(url):
    # Network operation
    pass
```

**Pattern 2: Context Manager**
```python
class RetryContext:
    def __init__(self, max_retries=5):
        self.max_retries = max_retries
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Handle retry logic
            pass
        return False
```

**Pattern 3: Tenacity Library**
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(5), 
       wait=wait_exponential(multiplier=1, min=1, max=16))
def fetch_data(url):
    # Network operation
    pass
```

**Comparison**:

| Pattern | Pros | Cons | Best For |
|---------|------|------|----------|
| Decorator | Clean, reusable | Less dynamic control | Most use cases |
| Context Manager | Flexible | Verbose | Complex retry logic |
| Tenacity Library | Feature-rich, tested | Dependency | Advanced scenarios |

**Recommendation**: Decorator pattern for simplicity and reusability

**References**:
- [AWS Architecture Blog - Exponential Backoff](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Google Cloud - Retry Strategies](https://cloud.google.com/architecture/scalable-and-resilient-apps#retry_logic)
- [Tenacity Documentation](https://tenacity.readthedocs.io/)

---

### 3. Resource Management and Cleanup

**Problem**: Browser instances and database connections not properly cleaned up

**Pattern: Context Managers**

```python
from contextlib import contextmanager

@contextmanager
def browser_context(playwright):
    browser = None
    context = None
    page = None
    try:
        browser = playwright.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        yield page
    finally:
        # Guaranteed cleanup
        if page:
            page.close()
        if context:
            context.close()
        if browser:
            browser.close()

# Usage
with sync_playwright() as p:
    with browser_context(p) as page:
        page.goto("https://example.com")
        # Automatic cleanup on exit
```

**Pattern: Resource Pooling**

```python
class BrowserPool:
    def __init__(self, size=5):
        self.size = size
        self.available = []
        self.in_use = set()
        
    def acquire(self):
        if self.available:
            browser = self.available.pop()
        elif len(self.in_use) < self.size:
            browser = self._create_browser()
        else:
            # Wait for available browser
            browser = self._wait_for_available()
        self.in_use.add(browser)
        return browser
        
    def release(self, browser):
        self.in_use.remove(browser)
        if self._is_healthy(browser):
            self.available.append(browser)
        else:
            browser.close()
```

**Connection Pooling Options**:

1. **SQLite**: Custom connection pool (no built-in pooling)
2. **PostgreSQL/MySQL**: Use SQLAlchemy or psycopg2 pooling
3. **Redis**: redis-py has built-in connection pooling

**Recommendation**: 
- Use context managers for browser resources
- Implement custom connection pool for SQLite
- Consider migrating to PostgreSQL for better pooling support

**References**:
- [Python Context Managers](https://docs.python.org/3/library/contextlib.html)
- [SQLAlchemy Connection Pooling](https://docs.sqlalchemy.org/en/14/core/pooling.html)
- [HikariCP - Java Connection Pool](https://github.com/brettwooldridge/HikariCP)

---

### 4. Health Monitoring and Observability

**Requirements**:
- Real-time health status
- Performance metrics
- Error tracking
- Resource usage monitoring

**Option A: Prometheus + Grafana**

**Architecture**:
```
Scraper (Python) 
  → prometheus_client library 
  → Expose /metrics endpoint
  → Prometheus scrapes metrics
  → Grafana visualizes data
```

**Implementation**:
```python
from prometheus_client import Counter, Gauge, Histogram, start_http_server

# Define metrics
scraper_errors = Counter('scraper_errors_total', 'Total errors', ['match_id', 'error_type'])
scraper_updates = Counter('scraper_updates_total', 'Total updates', ['match_id'])
scraper_latency = Histogram('scraper_latency_seconds', 'Update latency', ['match_id'])
active_scrapers = Gauge('active_scrapers', 'Number of active scrapers')
scraper_memory = Gauge('scraper_memory_bytes', 'Memory usage', ['match_id'])

# Start metrics server
start_http_server(9090)

# Use metrics
scraper_errors.labels(match_id='match123', error_type='network').inc()
scraper_updates.labels(match_id='match123').inc()
with scraper_latency.labels(match_id='match123').time():
    # Timed operation
    scrape_data()
```

**Pros**:
- Industry standard
- Rich visualization in Grafana
- Powerful query language (PromQL)
- Alerting built-in

**Cons**:
- Additional infrastructure (Prometheus + Grafana containers)
- Learning curve for PromQL
- Storage requirements

**Option B: Custom Health Endpoint**

```python
@app.route('/health', methods=['GET'])
def health_check():
    health_data = {
        'status': 'healthy' if all_scrapers_ok() else 'degraded',
        'active_scrapers': len(active_scrapers),
        'scrapers': [
            {
                'match_id': scraper.match_id,
                'last_update': scraper.last_update.isoformat(),
                'error_count': scraper.error_count,
                'memory_mb': scraper.memory_usage / 1024 / 1024,
                'uptime_seconds': scraper.uptime()
            }
            for scraper in active_scrapers
        ],
        'timestamp': time.time()
    }
    return jsonify(health_data), 200
```

**Pros**:
- Simple, no additional infrastructure
- Fast to implement
- Lightweight

**Cons**:
- No historical data
- Limited visualization
- Manual alerting implementation

**Option C: ELK Stack (Elasticsearch, Logstash, Kibana)**

**Pros**: Powerful log aggregation and search
**Cons**: Heavy infrastructure, expensive, overkill for current scale

**Recommendation**: 
- **Phase 1**: Custom health endpoint (quick wins)
- **Phase 2**: Add Prometheus + Grafana (comprehensive monitoring)
- **Future**: Consider ELK if log volume grows significantly

**References**:
- [Prometheus Python Client](https://github.com/prometheus/client_python)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)

---

### 5. Adaptive Behavior and Self-Tuning

**Concept**: System dynamically adjusts behavior based on observed conditions

**Adaptive Polling Intervals**:

```python
class AdaptivePoller:
    def __init__(self, baseline=2.5):
        self.baseline = baseline
        self.current_interval = baseline
        self.consecutive_errors = 0
        self.consecutive_no_changes = 0
        
    def calculate_interval(self, had_error, had_changes):
        if had_error:
            self.consecutive_errors += 1
            self.consecutive_no_changes = 0
            # Exponential backoff on errors
            self.current_interval = min(
                self.baseline * (2 ** min(self.consecutive_errors, 4)),
                30  # Max 30 seconds
            )
        elif not had_changes:
            self.consecutive_no_changes += 1
            self.consecutive_errors = 0
            # Reduce polling during inactivity
            if self.consecutive_no_changes > 10:
                self.current_interval = 30  # Match in break
        else:
            # Active match with changes
            self.consecutive_errors = 0
            self.consecutive_no_changes = 0
            self.current_interval = max(self.baseline, 2.0)
            
        return self.current_interval
```

**Adaptive Timeouts**:

```python
class AdaptiveTimeout:
    def __init__(self, baseline=30):
        self.baseline = baseline
        self.latency_samples = deque(maxlen=10)
        
    def record_latency(self, latency):
        self.latency_samples.append(latency)
        
    def get_timeout(self):
        if not self.latency_samples:
            return self.baseline
            
        avg_latency = statistics.mean(self.latency_samples)
        
        # Increase timeout if high latency
        if avg_latency > 2.0:
            return self.baseline * 1.5  # 50% increase
        # Decrease if consistently fast
        elif avg_latency < 0.5:
            return max(self.baseline * 0.8, 15)  # Min 15s
        else:
            return self.baseline
```

**Match State Detection**:

```python
class MatchStateDetector:
    ACTIVE = "active"
    BREAK = "break"
    INNINGS_CHANGE = "innings_change"
    ENDED = "ended"
    
    def __init__(self):
        self.last_score = None
        self.no_change_count = 0
        
    def detect_state(self, current_data):
        if not self.last_score:
            self.last_score = current_data
            return self.ACTIVE
            
        if current_data['status'] == 'completed':
            return self.ENDED
            
        if current_data['score'] != self.last_score['score']:
            self.no_change_count = 0
            return self.ACTIVE
        else:
            self.no_change_count += 1
            
        if self.no_change_count > 10:  # 25+ seconds no change
            if current_data['innings'] != self.last_score['innings']:
                return self.INNINGS_CHANGE
            return self.BREAK
            
        return self.ACTIVE
```

**Benefits**:
- Reduces resource usage during low activity
- Improves responsiveness during high activity
- Adapts to network conditions automatically
- No manual tuning required

**Challenges**:
- Complex logic with potential edge cases
- Need extensive testing with various scenarios
- Risk of oscillation if thresholds not tuned properly

**Recommendation**: Implement incrementally, starting with adaptive polling, then timeouts, then state detection

**References**:
- [Google SRE Book - Adaptive Throttling](https://sre.google/sre-book/handling-overload/)
- [Netflix - Adaptive Concurrency Limits](https://netflixtechblog.com/performance-under-load-3e6fa9a60581)

---

### 6. Graceful Shutdown and Signal Handling

**Problem**: Scrapers killed abruptly lose in-flight data and don't clean up resources

**Pattern: Signal Handling**

```python
import signal
import sys

class GracefulShutdown:
    def __init__(self):
        self.shutdown_requested = False
        signal.signal(signal.SIGTERM, self.handle_signal)
        signal.signal(signal.SIGINT, self.handle_signal)
        
    def handle_signal(self, signum, frame):
        logging.info(f"Received signal {signum}, initiating graceful shutdown")
        self.shutdown_requested = True
        
    def should_continue(self):
        return not self.shutdown_requested

shutdown_handler = GracefulShutdown()

def scraper_loop(url):
    while shutdown_handler.should_continue():
        try:
            scrape_data(url)
            time.sleep(polling_interval)
        except Exception as e:
            logging.error(f"Error: {e}")
            
    # Graceful cleanup
    cleanup_resources()
    flush_queues()
    save_state()
    logging.info("Graceful shutdown complete")
```

**Kubernetes Best Practices**:
- Handle SIGTERM for graceful shutdown
- Maximum termination grace period: 30 seconds
- Use preStop hook for additional cleanup time

**References**:
- [Python Signal Handling](https://docs.python.org/3/library/signal.html)
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

---

## Technology Stack Evaluation

### Database Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **H2 (Current)** | Embedded, zero config | Not production-grade, no pooling | Keep for dev only |
| **PostgreSQL** | Robust, excellent pooling, JSON support | Separate service, more complex | **Recommended for prod** |
| **MySQL** | Widely used, good performance | Less advanced JSON support | Alternative to PostgreSQL |
| **Redis** | Fast, great for caching | Not persistent primary DB | Use as cache layer |

**Recommendation**: Migrate to PostgreSQL for production, use Redis for caching

### Monitoring Stack

| Component | Purpose | Pros | Cons |
|-----------|---------|------|------|
| **Prometheus** | Metrics storage | Standard, powerful | Storage overhead |
| **Grafana** | Visualization | Beautiful dashboards | Learning curve |
| **Alertmanager** | Alerting | Flexible routing | Complex configuration |

**Recommendation**: Start with Prometheus + Grafana, add Alertmanager in Phase 6

### Browser Automation

| Option | Pros | Cons | Current |
|--------|------|------|---------|
| **Playwright** | Modern, fast, multi-browser | Newer, less examples | ✓ Using |
| **Selenium** | Mature, lots of examples | Slower, older API | - |
| **Puppeteer** | Fast, Chrome-specific | Node.js only | - |

**Recommendation**: Continue with Playwright (already in use, modern, well-maintained)

---

## Implementation Recommendations

### Phase 1 Priorities (Foundation)
1. ScraperContext for lifecycle management
2. Browser resource cleanup with context managers
3. Health check endpoint
4. Structured logging

### Phase 2 Priorities (Resilience)
1. Circuit breaker implementation
2. Retry logic with exponential backoff
3. Database connection pooling
4. Graceful shutdown handling

### Phase 3 Priorities (Observability)
1. Prometheus metrics integration
2. Grafana dashboards
3. Staleness detection
4. Data freshness headers

### Critical Success Factors
- Comprehensive testing at each phase
- Gradual rollout to production
- Clear rollback plans
- Excellent documentation
- Team training

---

## Open Questions

1. **Database Migration Timeline**: When to migrate from H2 to PostgreSQL?
   - **Answer**: Separate effort, not in scope for resilience feature

2. **Redis Integration**: Required or optional?
   - **Answer**: Optional for Phase 6 optimization

3. **Multi-Region Scraping**: Support needed?
   - **Answer**: Out of scope, single region only

4. **Historical Data Backfill**: Scrape past matches?
   - **Answer**: Out of scope, live data only

---

## References and Resources

### Books
- "Release It!" by Michael Nygard - Stability patterns
- "Site Reliability Engineering" by Google - SRE practices
- "The DevOps Handbook" - Operational excellence

### Articles
- [Martin Fowler - Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [AWS - Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Google SRE - Handling Overload](https://sre.google/sre-book/handling-overload/)

### Tools and Libraries
- [Playwright](https://playwright.dev/python/) - Browser automation
- [Prometheus](https://prometheus.io/) - Monitoring
- [Grafana](https://grafana.com/) - Visualization
- [psutil](https://github.com/giampaolo/psutil) - Process monitoring
- [structlog](https://www.structlog.org/) - Structured logging

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-12  
**Researcher**: Scraper Resilience Team
