import json
from unittest.mock import MagicMock, patch

import pytest

from crex_scraper_python.src.app import app
from crex_scraper_python.src.health import HealthState, HealthSummary


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint_reports_restart_recommendation_without_scheduling(client):
    with patch("crex_scraper_python.src.app.scraper_service") as mock_service:
        mock_service.health = MagicMock()
        mock_service._container_restart_scheduled = False
        mock_service.get_fast_update_status.return_value = {}
        mock_service.get_restart_condition.return_value = {
            "reason": "stale_live_data",
            "metadata": {
                "active_matches": 3,
                "seconds_since_last_scrape": 181,
                "staleness_threshold_seconds": 180,
            },
        }
        mock_service.health.get_summary.return_value = HealthSummary(
            state=HealthState.DEGRADED,
            score=70,
            uptime_seconds=120,
            pids_count=120,
            memory_usage_mb=512.0,
            last_scrape_timestamp=1000.0,
            active_matches=3,
            details={"reason": "Freshness lag"},
        )

        response = client.get("/health")
        data = json.loads(response.data)

        assert response.status_code == 503
        assert data["data"]["restart_recommended"] is True
        assert data["data"]["restart_scheduled"] is False
        assert data["data"]["restart_reason"] == "stale_live_data"
        assert data["data"]["restart_metadata"]["active_matches"] == 3
        mock_service.schedule_container_restart.assert_not_called()
