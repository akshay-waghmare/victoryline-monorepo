import pytest
import asyncio
import time
from unittest.mock import AsyncMock
from crex_scraper_python.src.crex_scraper import CrexScraperService
from crex_scraper_python.src.health import HealthState

@pytest.mark.asyncio
async def test_forced_recycle_flow():
    service = CrexScraperService()
    
    # Mock heavy components
    service.pool.recycle = AsyncMock()
    service.pool.setup = AsyncMock()
    service.pool.shutdown = AsyncMock()
    service.cache.connect = AsyncMock()
    service.cache.close = AsyncMock()
    service.scheduler.shutdown = AsyncMock()
    
    # Override settings for fast test
    object.__setattr__(service.health.settings, 'staleness_threshold_seconds', 0.1)
    object.__setattr__(service.health.settings, 'pause_cooldown', 1.0)
    
    await service.start()

    try:
        # Force stall condition
        service.health._last_successful_scrape = time.time() - 10.0

        # 1. Check stall
        is_stalled = service.health.check_stall()
        assert is_stalled is True
        assert service.health.state == HealthState.FAILING

        # 2. Check recovery trigger
        should_recover = service.health.should_trigger_recovery()
        assert should_recover is True

        # 3. Simulate monitor action
        service.health.record_recovery_attempt()
        await service.pool.recycle()

        # Verify
        assert service.pool.recycle.called
        assert service.health.state == HealthState.RECOVERING

    finally:
        await service.stop()
