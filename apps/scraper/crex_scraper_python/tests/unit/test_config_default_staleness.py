from crex_scraper_python.src.config import ScraperSettings


def test_from_env_uses_180_second_staleness_default():
    settings = ScraperSettings.from_env({})

    assert settings.staleness_threshold_seconds == 180
