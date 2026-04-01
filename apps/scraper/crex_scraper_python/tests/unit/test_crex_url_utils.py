from src.crex_url_utils import (
    detect_crex_url_format,
    ensure_crex_variant,
    extract_crex_api_key,
    extract_crex_match_key,
    extract_crex_slug,
    get_crex_details_url,
    get_crex_live_url,
    get_crex_scorecard_url,
    normalize_crex_url,
)


def test_old_scoreboard_urls_keep_existing_behavior():
    url = "https://crex.com/scoreboard/113X/2F5/final/1EU/1ER/gw-vs-ss-final-2026/live"

    assert detect_crex_url_format(url) == "scoreboard"
    assert extract_crex_api_key(url) == "113X"
    assert extract_crex_match_key(url) == "gw-vs-ss-final-2026"
    assert extract_crex_slug(url) == "gw-vs-ss-final-2026"
    assert get_crex_details_url(url) == "https://crex.com/scoreboard/113X/2F5/final/1EU/1ER/gw-vs-ss-final-2026/info"
    assert get_crex_scorecard_url(url) == "https://crex.com/scoreboard/113X/2F5/final/1EU/1ER/gw-vs-ss-final-2026/scorecard"


def test_new_cricket_live_score_urls_map_variants_and_match_key():
    url = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"

    assert detect_crex_url_format(url) == "cricket-live-score"
    assert extract_crex_api_key(url) == "11CC"
    assert extract_crex_slug(url) == "abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"
    assert extract_crex_match_key(url) == "abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"
    assert get_crex_live_url(url) == url
    assert get_crex_details_url(url) == f"{url}/match-details"
    assert get_crex_scorecard_url(url) == f"{url}/match-scorecard"


def test_normalize_relative_crex_live_score_urls():
    relative = "/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/match-scorecard"
    assert normalize_crex_url(relative) == "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC/match-scorecard"


def test_ensure_crex_variant_handles_new_format_variants():
    base_url = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"
    assert ensure_crex_variant(base_url, "details") == f"{base_url}/match-details"
    assert ensure_crex_variant(f"{base_url}/match-scorecard", "live") == base_url
