from src.live_match_selection import select_live_matches


def _match(slug, series_name=None):
    match = {"url": f"https://crex.com/cricket-live-score/{slug}-match-updates-X1"}
    if series_name:
        match["seriesName"] = series_name
    return match


def test_international_matches_are_selected_before_domestic_matches():
    matches = [
        _match("a-vs-b-1st-match-england-domestic-one-day-cup-2026"),
        _match("nam-vs-nep-116th-match-mens-cwc-league-2-2023-27"),
        _match("nam-w-vs-tan-w-2nd-match-womens-t20i-quadrangular-series-in-namibia-2026"),
    ]

    selected = select_live_matches(matches, max_matches=2)

    assert [match["url"] for match in selected] == [matches[1]["url"], matches[2]["url"]]


def test_no_more_than_three_matches_are_selected_from_one_series():
    matches = [
        _match(f"a-vs-b-{ordinal}-match-england-domestic-one-day-cup-2026")
        for ordinal in ("1st", "2nd", "3rd", "4th", "5th")
    ]

    selected = select_live_matches(matches, max_matches=5)

    assert len(selected) == 3


def test_explicit_series_name_is_used_when_available():
    matches = [_match(f"a-vs-b-{ordinal}-match-series", "Series A") for ordinal in ("1st", "2nd", "3rd", "4th")]

    assert len(select_live_matches(matches, max_matches=5)) == 3


def test_terminal_catalogue_rows_are_not_reselected_as_live():
    completed = _match("a-vs-b-1st-match-series")
    completed.update({
        "status": "LIVE",
        "lastKnownState": "A 83/68.2 A Won 1stT20 B 172/620.0",
        "resultSummary": "A Won by 4 wickets",
    })
    live = _match("c-vs-d-2nd-match-series")
    live.update({"status": "INNINGS_BREAK", "lastKnownState": "Stumps", "resultSummary": "D trail by 220 runs"})

    selected = select_live_matches([completed, live], max_matches=3)

    assert [match["url"] for match in selected] == [live["url"]]


def test_terminal_status_is_rejected_but_multiday_stumps_is_eligible():
    completed = _match("a-vs-b-1st-match-series")
    completed["status"] = "COMPLETED"
    stumps = _match("c-vs-d-2nd-match-series")
    stumps.update({"status": "INNINGS_BREAK", "lastKnownState": "Stumps"})

    assert select_live_matches([completed, stumps], max_matches=3) == [stumps]


def test_terminal_current_ball_snapshot_is_not_reselected_as_live():
    completed = _match("a-vs-b-1st-match-series")
    completed.update({
        "status": "LIVE",
        "current_ball": "A won by 4 wickets",
    })
    live = _match("c-vs-d-2nd-match-series")
    live.update({"status": "INNINGS_BREAK", "current_ball": "Stumps"})

    assert select_live_matches([completed, live], max_matches=3) == [live]
