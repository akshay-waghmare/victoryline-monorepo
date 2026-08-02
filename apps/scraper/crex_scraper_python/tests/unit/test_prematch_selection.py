from crex_scraper_python.src.prematch_selection import select_prematch_candidates


NOW = 1_700_000_000


def _match(url: str, hours: float, *, status: str = "UPCOMING", match_format: str = "T20"):
    return {
        "url": url,
        "status": status,
        "matchFormat": match_format,
        "scheduledStartTime": int((NOW + hours * 60 * 60) * 1000),
    }


def test_selects_exact_urls_only_inside_the_opening_window():
    selected = select_prematch_candidates([
        _match("https://crex.com/cricket-live-score/too-early", 11.99),
        _match("https://crex.com/cricket-live-score/opening-first", 12),
        _match("https://crex.com/cricket-live-score/opening-last", 48),
        _match("https://crex.com/cricket-live-score/too-late", 48.01),
    ], now=NOW)

    assert [match["url"] for match in selected] == [
        "https://crex.com/cricket-live-score/opening-first",
        "https://crex.com/cricket-live-score/opening-last",
    ]


def test_rejects_unsupported_or_non_upcoming_records_without_mutating_input():
    records = [
        _match("https://crex.com/cricket-live-score/t10", 24, match_format="T10"),
        _match("https://crex.com/cricket-live-score/hundred", 24, match_format="The Hundred"),
        _match("https://crex.com/cricket-live-score/live", 24, status="LIVE"),
        _match("https://crex.com/cricket-live-score/valid", 24, match_format="T20I"),
    ]
    original = [dict(record) for record in records]

    selected = select_prematch_candidates(records, now=NOW)

    assert [match["url"] for match in selected] == ["https://crex.com/cricket-live-score/valid"]
    assert records == original


def test_recovers_only_explicit_t20_marker_from_source_series_descriptor():
    records = [
        {
            "url": "https://crex.com/cricket-live-score/arg-w-vs-can-w",
            "status": "UPCOMING",
            "scheduledStartTime": int((NOW + 24 * 60 * 60) * 1000),
            "seriesName": "Argentina Women 6:30 PM 4thT20, Canada Women Tour",
        },
        {
            "url": "https://crex.com/cricket-live-score/unknown-format",
            "status": "UPCOMING",
            "scheduledStartTime": int((NOW + 24 * 60 * 60) * 1000),
            "seriesName": "Argentina Women vs Canada Women",
        },
    ]

    selected = select_prematch_candidates(records, now=NOW)

    assert selected == [{
        "url": "https://crex.com/cricket-live-score/arg-w-vs-can-w",
        "status": "UPCOMING",
        "scheduledStartTime": int((NOW + 24 * 60 * 60) * 1000),
        "seriesName": "Argentina Women 6:30 PM 4thT20, Canada Women Tour",
        "matchFormat": "T20",
    }]
    assert "matchFormat" not in records[0]


def test_replaces_blank_upstream_format_with_explicit_source_marker():
    selected = select_prematch_candidates([{
        "url": "https://crex.com/cricket-live-score/arg-w-vs-can-w",
        "status": "UPCOMING",
        "matchFormat": None,
        "scheduledStartTime": int((NOW + 24 * 60 * 60) * 1000),
        "seriesName": "Argentina Women 6:30 PM 4thT20, Canada Women Tour",
    }], now=NOW)

    assert selected[0]["matchFormat"] == "T20"


def test_recovers_t20_only_from_an_explicit_canonical_url_marker():
    selected = select_prematch_candidates([{
        "url": "https://crex.com/cricket-live-score/arg-w-vs-can-w-5th-t20-tour-2026",
        "status": "UPCOMING",
        "scheduledStartTime": int((NOW + 24 * 60 * 60) * 1000),
    }], now=NOW)

    assert selected[0]["matchFormat"] == "T20"


def test_rejects_retained_nested_url_fragment_without_a_left_hand_team_slug():
    selected = select_prematch_candidates([{
        "url": "https://crex.com/cricket-live-score/vs-bt-7th-match-asian-legends-league-t20-2026",
        "status": "UPCOMING",
        "matchFormat": "T20",
        "scheduledStartTime": int((NOW + 24 * 60 * 60) * 1000),
    }], now=NOW)

    assert selected == []


def test_bounds_and_sorts_the_separate_prematch_slate():
    selected = select_prematch_candidates([
        _match("https://crex.com/cricket-live-score/c", 30),
        _match("https://crex.com/cricket-live-score/a", 20),
        _match("https://crex.com/cricket-live-score/b", 25),
        _match("https://crex.com/cricket-live-score/d", 26),
    ], now=NOW)

    assert [match["url"] for match in selected] == [
        "https://crex.com/cricket-live-score/a",
        "https://crex.com/cricket-live-score/b",
        "https://crex.com/cricket-live-score/d",
    ]
