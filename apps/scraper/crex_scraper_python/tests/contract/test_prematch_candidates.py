from unittest.mock import patch

import pytest

from crex_scraper_python.src.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_prematch_endpoint_exposes_a_bounded_non_live_contract(client):
    now_ms = 2_000_000_000_000
    records = [
        {
            "url": "https://crex.com/cricket-live-score/valid-t20",
            "status": "UPCOMING",
            "matchFormat": "T20",
            "scheduledStartTime": now_ms + 24 * 60 * 60 * 1000,
            "team1Name": "Alpha",
            "team2Name": "Bravo",
        },
        {
            "url": "https://crex.com/cricket-live-score/not-live-slate",
            "status": "LIVE",
            "matchFormat": "T20",
            "scheduledStartTime": now_ms + 24 * 60 * 60 * 1000,
        },
    ]
    with patch("crex_scraper_python.src.app.time.time", return_value=now_ms / 1000), patch(
        "crex_scraper_python.src.app.CricketDataService.get_upcoming_matches", return_value=records
    ):
        response = client.get("/prematch-candidates")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["count"] == 1
    assert payload["matches"] == [{
        "url": "https://crex.com/cricket-live-score/valid-t20",
        "is_live": False,
        "source": "backend:upcoming",
        "scheduled_start_time": now_ms + 24 * 60 * 60 * 1000,
        "match_format": "T20",
        "label": "Alpha vs Bravo",
    }]
