# Quickstart Guide: Scraper Optimization Development

**Feature**: 006-scraper-optimization  
**Date**: 2025-11-22  
**Audience**: Developers setting up local environment

## Prerequisites

- **Python**: 3.9+ (current scraper codebase compatibility)
- **Docker**: 20.10+ & Docker Compose 2.0+
- **Node.js**: 16+ (for Playwright browser binaries)
- **Redis**: 6.2+ (via Docker or local install)
- **Git**: Latest stable

## Initial Setup

### 1. Clone & Navigate
```powershell
cd c:\Users\ADMINS\Documents\projects\victoryline-monorepo
git checkout 006-scraper-optimization
git pull origin 006-scraper-optimization
cd apps\scraper
```

### 2. Python Environment
```powershell
# Create virtual environment
python -m venv .venv

# Activate (PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate (bash/Linux)
source .venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # pytest, black, flake8, etc.
```

### 3. Playwright Setup
```powershell
# Install browser binaries (Chromium)
playwright install chromium

# Verify installation
playwright --version
```

### 4. Environment Configuration

The scraper uses environment variables for configuration. Create a `.env` file in `apps/scraper/crex_scraper_python/` based on `.env.example`.

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379/0` | Connection string for Redis cache |
| `CONCURRENCY_CAP` | `10` | Max concurrent browser contexts |
| `CACHE_LIVE_TTL` | `15` | TTL for live match snapshots (seconds) |
| `PAUSE_COOLDOWN` | `300` | Cooldown before resuming paused matches (seconds) |
| `AUDIT_MAX_ENTRIES` | `1000` | Max entries in health audit ring buffer |

## Running Locally

### Development Mode (Flask Debug Server)

```powershell
# From apps/scraper/ directory
cd crex_scraper_python

# Set Flask app
$env:FLASK_APP = "src.app:create_app()"

# Run development server
flask run --host=0.0.0.0 --port=5000
```

**Endpoints**:
- http://localhost:5000/health
- http://localhost:5000/status
- http://localhost:5000/metrics
- http://localhost:5000/matches

### Docker Compose (Production-Like)

```powershell
# From repository root
docker-compose -f docker-compose.yml up scraper redis

# Or build fresh image
docker-compose build scraper
docker-compose up scraper redis

# View logs
docker-compose logs -f scraper
```

**docker-compose.yml updates**:
```yaml
services:
  scraper:
    build: ./apps/scraper
    ports:
      - "5000:5000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    pids_limit: 512  # NEW: Prevent PID exhaustion
    restart: unless-stopped
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

---

## Testing

### Unit Tests
```powershell
# Run all unit tests
pytest tests/unit/ -v

# Run specific test
pytest tests/unit/test_browser_pool.py -v

# With coverage
pytest tests/unit/ --cov=crex_scraper_python.src --cov-report=html

# View coverage report
Start-Process htmlcov/index.html  # Windows
```

### Integration Tests
```powershell
# Ensure Redis running
docker ps | Select-String "redis"

# Run integration tests (require Redis + Playwright)
pytest tests/integration/ -v

# Resource leak test (200 cycles, ~5 minutes)
pytest tests/integration/test_resource_leak.py -v -s

# Freshness SLA test (simulated load)
pytest tests/integration/test_freshness_sla.py -v
```

### Contract Tests
```powershell
# Validate /metrics Prometheus format
pytest tests/contract/test_metrics_format.py -v

# Validate /status JSON schema
pytest tests/contract/test_status_schema.py -v
```

### Full Test Suite
```powershell
# Run everything
pytest -v

# With markers (skip slow tests)
pytest -v -m "not slow"
```

---

## Development Workflow

### 1. Make Changes
```powershell
# Example: Add new metric
code crex_scraper_python/src/metrics.py
```

### 2. Format Code
```powershell
# Black (auto-format)
black crex_scraper_python/src/

# isort (sort imports)
isort crex_scraper_python/src/

# Verify formatting
black --check crex_scraper_python/src/
```

### 3. Lint
```powershell
# flake8
flake8 crex_scraper_python/src/

# Type checking (if using mypy)
mypy crex_scraper_python/src/
```

### 4. Run Tests
```powershell
pytest tests/unit/ -v
```

### 5. Manual Testing
```powershell
# Start dev server
flask run

# In separate terminal, test endpoints
curl http://localhost:5000/health
curl http://localhost:5000/status
curl http://localhost:5000/metrics

# Or use PowerShell
Invoke-RestMethod -Uri http://localhost:5000/status | ConvertTo-Json -Depth 5
```

### 6. Commit
```powershell
git add .
git commit -m "feat(scraper): add browser pooling module"
git push origin 006-scraper-optimization
```

---

## Debugging

### Playwright Debugging (Headed Mode)
```powershell
# Set environment variable
$env:PLAYWRIGHT_HEADLESS = "0"

# Run scraper (browser window will be visible)
flask run
```

### Redis Inspection
```powershell
# Connect to Redis CLI
docker exec -it victoryline-redis redis-cli

# View all keys
KEYS *

# Get match snapshot
GET match_latest:crex_12345

# View freshness index (sorted set)
ZRANGE freshness_index 0 -1 WITHSCORES

# View paused matches
SMEMBERS paused_matches

# Monitor real-time commands
MONITOR
```

### Logs
```powershell
# View scraper logs (Docker)
docker logs -f victoryline-scraper

# View last 100 lines
docker logs --tail 100 victoryline-scraper

# Filter for errors
docker logs victoryline-scraper 2>&1 | Select-String "ERROR"
```

### Process Monitoring
```powershell
# View PIDs (Docker)
docker stats victoryline-scraper --no-stream

# View PIDs inside container
docker exec victoryline-scraper ps aux | Select-String "chrome"

# Count Chromium processes
docker exec victoryline-scraper ps aux | Select-String "chrome" | Measure-Object -Line
```

---

## Common Issues

### Issue: Playwright Installation Fails
**Symptoms**: `playwright: command not found` or browser download errors

**Solution**:
```powershell
# Reinstall Playwright
pip uninstall playwright
pip install playwright==1.40.0
playwright install chromium

# If behind proxy
$env:HTTPS_PROXY = "http://proxy:port"
playwright install chromium
```

### Issue: Redis Connection Refused
**Symptoms**: `ConnectionError: Error 10061 connecting to localhost:6379`

**Solution**:
```powershell
# Check Redis running
docker ps | Select-String "redis"

# Restart Redis
docker restart victoryline-redis

# Check firewall (Windows)
Test-NetConnection -ComputerName localhost -Port 6379
```

### Issue: PIDs Still Growing
**Symptoms**: Docker stats shows PIDs increasing beyond 200

**Solution**:
```powershell
# Verify pids_limit set
docker inspect victoryline-scraper | Select-String "PidsLimit"

# Should show: "PidsLimit": 512

# If not set, update docker-compose.yml and recreate
docker-compose down
docker-compose up -d scraper
```

### Issue: Tests Fail with "Event Loop Closed"
**Symptoms**: `RuntimeError: Event loop is closed` in async tests

**Solution**:
```powershell
# Install pytest-asyncio
pip install pytest-asyncio

# Add to pytest.ini or pyproject.toml
# [tool.pytest.ini_options]
# asyncio_mode = "auto"

# Or mark tests explicitly
# @pytest.mark.asyncio
# async def test_browser_pool():
#     ...
```

### Issue: Black and isort Conflict
**Symptoms**: Black reformats imports differently than isort

**Solution**:
```powershell
# Configure isort to be Black-compatible (pyproject.toml)
# [tool.isort]
# profile = "black"

# Run in order
isort .
black .
```

---

## Performance Profiling

### CPU Profiling
```powershell
# Install cProfile
pip install snakeviz

# Profile scrape function
python -m cProfile -o profile.stats crex_scraper_python/src/app.py

# Visualize
snakeviz profile.stats
```

### Memory Profiling
```powershell
# Install memory_profiler
pip install memory_profiler

# Add @profile decorator to function
# Run
python -m memory_profiler crex_scraper_python/src/browser_pool.py

# View memory usage over time
mprof run crex_scraper_python/src/app.py
mprof plot
```

### Async Profiling
```python
import asyncio
import time

async def profile_scrape():
    start = time.perf_counter()
    result = await scrape_match("crex_12345")
    duration = time.perf_counter() - start
    print(f"Scrape took {duration:.3f}s")
```

---

## Monitoring Setup (Local Prometheus + Grafana)

### 1. Start Monitoring Stack
```powershell
# From repository root
docker-compose -f apps/scraper/monitoring/docker-compose.monitoring.yml up -d

# Services:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3000 (admin/admin)
```

### 2. Configure Prometheus Target
Edit `apps/scraper/monitoring/prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'scraper'
    static_configs:
      - targets: ['scraper:5000']  # Docker internal
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 3. Import Grafana Dashboard
1. Open http://localhost:3000
2. Login (admin/admin)
3. Import dashboard from `apps/scraper/monitoring/dashboards/scraper-health.json`
4. View real-time metrics

---

## IDE Setup (VS Code)

### Recommended Extensions
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- Black Formatter (ms-python.black-formatter)
- isort (ms-python.isort)
- Docker (ms-azuretools.vscode-docker)
- YAML (redhat.vscode-yaml)

### Launch Configuration (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flask: Scraper",
      "type": "python",
      "request": "launch",
      "module": "flask",
      "env": {
        "FLASK_APP": "crex_scraper_python.src.app:create_app()",
        "FLASK_ENV": "development",
        "FLASK_DEBUG": "1"
      },
      "args": [
        "run",
        "--host=0.0.0.0",
        "--port=5000"
      ],
      "jinja": true,
      "justMyCode": false
    },
    {
      "name": "Pytest: Current File",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": ["${file}", "-v"],
      "console": "integratedTerminal",
      "justMyCode": false
    }
  ]
}
```

### Settings (.vscode/settings.json)
```json
{
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "editor.formatOnSave": true,
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  }
}
```

---

## Next Steps

1. **Read Architecture Docs**: `apps/scraper/ARCHITECTURE.md`, `specs/006-scraper-optimization/research.md`
2. **Review Data Model**: `specs/006-scraper-optimization/data-model.md`
3. **Explore Contracts**: `specs/006-scraper-optimization/contracts/*.yaml`
4. **Run PoC**: Follow research.md "Proof of Concept" section (2-3 days)
5. **Implement Phase 2**: Generate tasks with `/speckit.tasks`

---

## Resources

- **Playwright Docs**: https://playwright.dev/python/docs/intro
- **Async Python**: https://docs.python.org/3/library/asyncio.html
- **Redis Commands**: https://redis.io/commands
- **Prometheus Metrics**: https://prometheus.io/docs/concepts/metric_types/
- **VictoryLine Constitution**: `/.specify/memory/constitution.md`

---

*End Quickstart Guide*
