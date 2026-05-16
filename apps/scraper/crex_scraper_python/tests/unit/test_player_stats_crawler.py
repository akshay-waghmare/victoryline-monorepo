import asyncio

from src.config import reload_settings
from src.player_stats_crawler import PlayerStatsCandidate, PlayerStatsCrawlerService, PlayerStatsTask


class _DummyCache:
    pass


class _DummyRegistry:
    pass


def test_build_ingestion_request_groups_players_and_live_stats():
    reload_settings({})
    service = PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )
    task = PlayerStatsTask(
        priority=1,
        match_id="crex:match-1",
        match_url="https://crex.com/scoreboard/series/example/fixture/match-1/live",
        task_type="LIVE",
        metadata={
            "seriesName": "Champions Trophy",
            "team1Name": "India",
            "team2Name": "Australia",
        },
    )
    seed_payload = {
        "match_name": "India vs Australia",
        "match_date": "1 Jan 2026",
        "start_date": "2026-01-01T09:00:00Z",
        "venue": "Dubai",
        "toss_info": "India won the toss",
        "players": [
            {
                "team_name": "India",
                "player_name": "Virat Kohli",
                "player_role": "BATTER",
                "player_url": "https://crex.com/player/virat-kohli",
                "lineup_order": 3,
                "is_captain": False,
                "is_wicket_keeper": False,
                "source": "playing_xi",
            },
            {
                "team_name": "Australia",
                "player_name": "Pat Cummins",
                "player_role": "BOWLER",
                "player_url": "https://crex.com/player/pat-cummins",
                "lineup_order": 1,
                "is_captain": True,
                "is_wicket_keeper": False,
                "source": "playing_xi",
            },
        ],
    }
    live_payload = {
        "batsman_data": [
            {
                "name": "Virat Kohli",
                "score": "45",
                "ballsFaced": "33",
                "fours": "4",
                "sixes": "1",
                "strikeRate": "136.36",
                "onStrike": True,
            }
        ],
        "bowler_data": [
            {
                "name": "Pat Cummins",
                "score": "1/24",
                "ballsBowled": "18",
                "economyRate": "8.00",
                "wicketsTaken": "1",
                "dotBalls": "7",
            }
        ],
    }

    payload = service._build_ingestion_request(task, seed_payload, live_payload)

    assert payload["matchExternalKey"] == "match-1"
    assert payload["series"]["name"] == "Champions Trophy"
    assert [team["name"] for team in payload["teams"]] == ["India", "Australia"]

    india_player = payload["teams"][0]["squad"][0]
    assert india_player["externalId"] == "player:virat-kohli"
    assert any(stat["category"] == "seed_context" for stat in india_player["stats"])
    assert any(stat["category"] == "live_batting" for stat in india_player["stats"])

    australia_player = payload["teams"][1]["squad"][0]
    assert australia_player["captain"] is True
    assert any(stat["category"] == "live_bowling" for stat in australia_player["stats"])


def test_payload_signature_ignores_captured_at_changes():
    payload_a = {
        "teams": [
            {
                "name": "India",
                "squad": [
                    {
                        "name": "Virat Kohli",
                        "stats": [{"category": "seed_context", "capturedAt": 1000, "payload": {"runs": 10}}],
                    }
                ],
            }
        ]
    }
    payload_b = {
        "teams": [
            {
                "name": "India",
                "squad": [
                    {
                        "name": "Virat Kohli",
                        "stats": [{"category": "seed_context", "capturedAt": 2000, "payload": {"runs": 10}}],
                    }
                ],
            }
        ]
    }

    assert PlayerStatsCrawlerService._payload_signature(payload_a) == PlayerStatsCrawlerService._payload_signature(payload_b)


def test_build_player_reference_request_from_player_page_analysis():
    reload_settings({})
    service = PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )
    task = PlayerStatsTask(
        priority=3,
        match_id="reference:player:virat-kohli",
        match_url="https://crex.com/player/virat-kohli",
        task_type="PLAYER_REFERENCE",
        metadata={
            "sourceMatchUrl": "https://crex.com/scoreboard/series/example/fixture/match-1/live",
            "player": {
                "externalId": "player:virat-kohli",
                "name": "Virat Kohli",
                "role": "BATTER",
                "lineupOrder": 3,
            },
        },
    )

    request = service._build_player_reference_request(
        task,
        {
            "url": "https://crex.com/player/virat-kohli",
            "page_title": "Virat Kohli | CREX",
            "player_name": "Virat Kohli",
            "profile": {
                "name": "Virat Kohli",
                "nationality": "India",
                "role": "BATTER",
                "bats": "Right hand bat",
                "bowls": "Right arm medium",
            },
            "recent_form": {
                "batting": [{"match": "IND vs AUS", "performance": "76"}],
                "bowling": [],
            },
            "career_stats": {
                "batting": {
                    "headers": ["Format", "Mat", "R"],
                    "rows": [{"Format": "ODI", "Mat": "302", "R": "14181"}],
                }
            },
            "teams_played_for": ["India", "Royal Challengers Bengaluru"],
        },
    )

    assert request["player"]["externalId"] == "player:virat-kohli"
    assert request["player"]["battingStyle"] == "Right hand bat"
    assert request["player"]["country"] == "India"
    assert [snapshot["category"] for snapshot in request["snapshots"]] == [
        "player_profile",
        "recent_form",
        "career_batting",
        "teams_played_for",
    ]


def test_build_series_reference_requests_fan_out_series_and_team_payloads():
    reload_settings({})
    service = PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )
    task = PlayerStatsTask(
        priority=4,
        match_id="reference:series:champions-trophy:standings",
        match_url="https://crex.com/series/champions-trophy/points-table",
        task_type="SERIES_STANDINGS",
        metadata={
            "seriesName": "Champions Trophy",
            "team1Name": "India",
            "team2Name": "Australia",
        },
    )

    series_request, team_requests = service._build_series_reference_requests(
        task,
        {
            "url": "https://crex.com/series/champions-trophy/points-table",
            "page_title": "Champions Trophy Points Table",
            "page_heading": "Champions Trophy Points Table",
            "section_count": 1,
            "sections": [
                {
                    "label": "Group A",
                    "headers": ["Rank", "Team", "Pts"],
                    "rows": [
                        {"Rank": "1", "Team": "India", "Pts": "6"},
                        {"Rank": "2", "Team": "Australia", "Pts": "4"},
                    ],
                }
            ],
        },
    )

    assert series_request["series"]["externalId"] == "series:champions-trophy"
    assert any(snapshot["category"] == "points_table_group_a" for snapshot in series_request["snapshots"])
    assert any(snapshot["category"] == "series_summary" for snapshot in series_request["snapshots"])
    assert len(team_requests) == 2
    assert {request["team"]["externalId"] for request in team_requests} == {"team:india", "team:australia"}
    assert all(request["snapshots"][0]["category"] == "series_standings_group_a" for request in team_requests)


def test_build_team_rankings_reference_requests_reuses_observed_team_aliases():
    reload_settings({})
    service = PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )
    service._remember_team_aliases("India", "Australia")
    task = PlayerStatsTask(
        priority=5,
        match_id="reference:team-rankings:men",
        match_url="https://crex.com/rankings/men/teams",
        task_type="TEAM_RANKINGS",
        metadata={
            "teams": [
                {"externalId": "team:india", "name": "India", "teamCode": "IND"},
                {"externalId": "team:australia", "name": "Australia", "teamCode": "AUS"},
            ]
        },
    )

    requests = service._build_team_rankings_reference_requests(
        task,
        {
            "url": "https://crex.com/rankings/men/teams",
            "page_title": "Men's Teams Ranking",
            "page_heading": "Men's Teams Ranking",
            "sections": [
                {
                    "label": "ODI",
                    "headers": ["Rank", "Team", "Rating"],
                    "rows": [
                        {"Rank": "1", "Team": "IND", "Rating": "119"},
                        {"Rank": "2", "Team": "AUS", "Rating": "109"},
                        {"Rank": "3", "Team": "NZ", "Rating": "104"},
                    ],
                }
            ],
        },
    )

    assert len(requests) == 2
    assert {request["team"]["externalId"] for request in requests} == {"team:india", "team:australia"}
    assert requests[0]["snapshots"][0]["category"] == "team_ranking_odi"


# ---------------------------------------------------------------------------
# Priority & cooldown tests
# ---------------------------------------------------------------------------

from src.player_stats_crawler import PlayerStatsCandidate
import time


def _make_service():
    reload_settings({
        "PLAYER_STATS_LIVE_COOLDOWN_SECONDS": "30",
        "PLAYER_STATS_UPCOMING_COOLDOWN_SECONDS": "120",
        "PLAYER_STATS_CACHE_TTL_SECONDS": "1800",
    })
    return PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )


def _candidate(task_type, *, source_match=None, last_success=False, scheduled_start_time=None):
    metadata = {}
    if source_match:
        metadata["sourceMatchTaskType"] = source_match
    return PlayerStatsCandidate(
        match_id=f"test:{task_type}",
        match_url="https://crex.com/test",
        task_type=task_type,
        scheduled_start_time=scheduled_start_time,
        metadata=metadata,
        last_success_at=time.time() if last_success else 0.0,
    )


class TestPriorityForCandidate:
    """Verify live-context tasks get highest priority."""

    def test_live_match_is_priority_1(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("LIVE")) == 1

    def test_player_reference_from_live_is_priority_1(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("PLAYER_REFERENCE", source_match="LIVE")) == 1

    def test_series_standings_from_live_is_priority_1(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("SERIES_STANDINGS", source_match="LIVE")) == 1

    def test_series_standings_from_upcoming_is_priority_2(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("SERIES_STANDINGS", source_match="UPCOMING")) == 2

    def test_team_rankings_from_live_is_priority_2(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("TEAM_RANKINGS", source_match="LIVE")) == 2

    def test_team_rankings_from_upcoming_is_priority_3(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("TEAM_RANKINGS", source_match="UPCOMING")) == 3

    def test_team_rankings_default_is_priority_5(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("TEAM_RANKINGS")) == 5

    def test_completed_never_scraped_is_priority_3(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("COMPLETED", last_success=False)) == 3

    def test_completed_already_scraped_is_priority_5(self):
        svc = _make_service()
        assert svc._priority_for_candidate(_candidate("COMPLETED", last_success=True)) == 5

    def test_upcoming_today_is_priority_2(self):
        svc = _make_service()
        soon = int((time.time() + 3600) * 1000)  # 1 hour from now
        assert svc._priority_for_candidate(_candidate("UPCOMING", scheduled_start_time=soon)) == 2


class TestCooldownForCandidate:
    """Verify live-context tasks get shorter cooldowns."""

    def test_live_match_uses_live_cooldown(self):
        svc = _make_service()
        cd = svc._cooldown_for_candidate(_candidate("LIVE"))
        assert cd == 30.0

    def test_series_standings_live_after_success_uses_live_cooldown(self):
        svc = _make_service()
        cd = svc._cooldown_for_candidate(_candidate("SERIES_STANDINGS", source_match="LIVE", last_success=True))
        assert cd == 30.0  # live cooldown, not 1800s

    def test_series_standings_non_live_after_success_uses_long_cooldown(self):
        svc = _make_service()
        cd = svc._cooldown_for_candidate(_candidate("SERIES_STANDINGS", last_success=True))
        assert cd >= 1800.0

    def test_team_rankings_live_after_success_uses_short_cooldown(self):
        svc = _make_service()
        cd = svc._cooldown_for_candidate(_candidate("TEAM_RANKINGS", source_match="LIVE", last_success=True))
        assert cd == 60.0  # live_cooldown * 2

    def test_team_rankings_non_live_after_success_uses_long_cooldown(self):
        svc = _make_service()
        cd = svc._cooldown_for_candidate(_candidate("TEAM_RANKINGS", last_success=True))
        assert cd >= 6 * 3600.0

    def test_player_reference_live_after_success_uses_moderate_cooldown(self):
        svc = _make_service()
        cd = svc._cooldown_for_candidate(_candidate("PLAYER_REFERENCE", source_match="LIVE", last_success=True))
        assert cd == 120.0  # live_cooldown * 4

    def test_player_reference_non_live_after_success_uses_long_cooldown(self):
        svc = _make_service()
        cd = svc._cooldown_for_candidate(_candidate("PLAYER_REFERENCE", last_success=True))
        assert cd >= 6 * 3600.0


def test_discover_reference_candidates_enqueues_player_series_and_rankings_resources():
    reload_settings({})
    service = PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )
    task = PlayerStatsTask(
        priority=1,
        match_id="crex:match-1",
        match_url="https://crex.com/scoreboard/series/example/fixture/match-1/live",
        task_type="LIVE",
        metadata={
            "seriesName": "Champions Trophy",
            "team1Name": "India",
            "team2Name": "Australia",
        },
    )
    seed_payload = {
        "series_url": "https://crex.com/series/champions-trophy",
        "players": [
            {
                "team_name": "India",
                "player_name": "Virat Kohli",
                "player_role": "BATTER",
                "player_url": "https://crex.com/player/virat-kohli",
                "lineup_order": 3,
                "is_captain": False,
                "is_wicket_keeper": False,
            }
        ],
    }

    async def _run() -> None:
        service._candidate_lock = asyncio.Lock()
        await service.scheduler.setup()
        await service._discover_reference_candidates(task, seed_payload)

    asyncio.run(_run())

    assert "reference:player:virat-kohli" in service._candidates
    assert "reference:series:champions-trophy:profile" in service._candidates
    assert "reference:series:champions-trophy:standings" in service._candidates
    assert "reference:team-rankings:men" in service._candidates
    assert service.scheduler.qsize == 2


def test_discover_reference_candidates_does_not_immediately_queue_upcoming_player_refs():
    reload_settings({})
    service = PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )
    task = PlayerStatsTask(
        priority=2,
        match_id="crex:match-1",
        match_url="https://crex.com/scoreboard/series/example/fixture/match-1/live",
        task_type="UPCOMING",
        metadata={
            "seriesName": "Champions Trophy",
            "team1Name": "India",
            "team2Name": "Australia",
        },
    )
    seed_payload = {
        "players": [
            {
                "team_name": "India",
                "player_name": "Virat Kohli",
                "player_role": "BATTER",
                "player_url": "https://crex.com/player/virat-kohli",
            }
        ],
    }

    async def _run() -> None:
        service._candidate_lock = asyncio.Lock()
        await service.scheduler.setup()
        await service._discover_reference_candidates(task, seed_payload)

    asyncio.run(_run())

    assert "reference:player:virat-kohli" in service._candidates
    assert service.scheduler.qsize == 0


def test_discover_reference_candidates_respects_existing_live_player_ref_cooldown():
    reload_settings({})
    service = PlayerStatsCrawlerService(
        pool=None,
        cache=_DummyCache(),
        registry=_DummyRegistry(),
        auth_token_provider=lambda: None,
    )
    service._candidates["reference:player:virat-kohli"] = PlayerStatsCandidate(
        match_id="reference:player:virat-kohli",
        match_url="https://crex.com/player/virat-kohli",
        task_type="PLAYER_REFERENCE",
        metadata={
            "_candidate_scope": "reference",
            "sourceMatchTaskType": "LIVE",
        },
        next_due_at=9999999999.0,
        last_success_at=1.0,
    )
    task = PlayerStatsTask(
        priority=1,
        match_id="crex:match-1",
        match_url="https://crex.com/scoreboard/series/example/fixture/match-1/live",
        task_type="LIVE",
        metadata={
            "seriesName": "Champions Trophy",
            "team1Name": "India",
            "team2Name": "Australia",
        },
    )
    seed_payload = {
        "players": [
            {
                "team_name": "India",
                "player_name": "Virat Kohli",
                "player_role": "BATTER",
                "player_url": "https://crex.com/player/virat-kohli",
            }
        ],
    }

    async def _run() -> None:
        service._candidate_lock = asyncio.Lock()
        await service.scheduler.setup()
        await service._discover_reference_candidates(task, seed_payload)

    asyncio.run(_run())

    assert service.scheduler.qsize == 0


# ---------------------------------------------------------------------------
# iV4 fast-path tests
# ---------------------------------------------------------------------------

class TestExtractApiKey:
    """Verify _extract_api_key parses the match API key from scoreboard URLs."""

    def test_full_scoreboard_url(self):
        url = "https://crex.com/scoreboard/113X/2F5/2nd-Semi-Final/1ER/1EU/gw-vs-ss-2nd-semi-final-2026/live"
        assert PlayerStatsCrawlerService._extract_api_key(url) == "113X"

    def test_short_scoreboard_url(self):
        url = "https://crex.com/scoreboard/ABCD/series/match-type/t1/t2/slug/live"
        assert PlayerStatsCrawlerService._extract_api_key(url) == "ABCD"

    def test_new_cricket_live_score_url(self):
        url = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"
        assert PlayerStatsCrawlerService._extract_api_key(url) == "11CC"

    def test_no_scoreboard_returns_none(self):
        url = "https://crex.com/player/virat-kohli-ABC"
        assert PlayerStatsCrawlerService._extract_api_key(url) is None

    def test_empty_string_returns_none(self):
        assert PlayerStatsCrawlerService._extract_api_key("") is None

    def test_none_returns_none(self):
        assert PlayerStatsCrawlerService._extract_api_key(None) is None

    def test_scoreboard_with_trailing_slash(self):
        url = "https://crex.com/scoreboard/XYZ/"
        assert PlayerStatsCrawlerService._extract_api_key(url) == "XYZ"


class TestExtractMatchId:
    def test_new_cricket_live_score_url_uses_stable_match_key(self):
        url = "https://crex.com/cricket-live-score/abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"
        assert PlayerStatsCrawlerService._extract_match_id(url) == "crex:abd-vs-fuj-4th-match-emirates-d50-tournament-2026-match-updates-11CC"


class TestDecodeIv4ToSeed:
    """Verify _decode_iv4_to_seed builds a valid seed payload from iV4 response."""

    def _make_service(self):
        reload_settings({})
        return PlayerStatsCrawlerService(
            pool=None,
            cache=_DummyCache(),
            registry=_DummyRegistry(),
            auth_token_provider=lambda: None,
        )

    def test_basic_decode(self):
        svc = self._make_service()
        iv4 = {
            "t": "1EU-1ER",
            "tp": "IFW..2.1.0.0.1.4.4.0-IJK..1.0.0.0.0.2.0.0/NJH..3.2.0.0.0.5.6.0",
            "tb": "/NJH..4.1.2.0.1.15.0.0-NKM..3.0.1.0.0.12.0.0",
            "s": "2F5",
            "v": "V99",
            "dt": "2026-05-20",
        }
        local_storage = {
            "t_1EU_name": "Gandiv Warriors",
            "t_1ER_name": "Saryu Superheroes",
            "p_IFW_name": "Divya Prakash Singh",
            "p_IJK_name": "Ajay Kumar",
            "p_NJH_name": "Rahul Sharma",
            "p_NKM_name": "Mohit Verma",
            "s_2F5_name": "Ayodhya Premier League 2026",
            "v_V99_name": "Ayodhya Stadium",
        }

        result = svc._decode_iv4_to_seed(iv4, local_storage, "https://crex.com/scoreboard/113X/2F5/final/1EU/1ER/slug/live")

        assert result is not None
        assert result["series_name"] == "Ayodhya Premier League 2026"
        assert result["venue"] == "Ayodhya Stadium"
        assert result["match_date"] == "2026-05-20"
        assert len(result["players"]) == 4
        assert len(result["team_links"]) == 2
        assert result["team_links"][0]["name"] == "Gandiv Warriors"
        assert result["team_links"][0]["url"] == "https://crex.live/team/gandiv-warriors-1EU"
        assert result["team_links"][1]["name"] == "Saryu Superheroes"
        assert result["team_links"][1]["url"] == "https://crex.live/team/saryu-superheroes-1ER"
        assert result["series_url"] == "https://crex.live/series/ayodhya-premier-league-2026-2F5"

        # Check player URL construction
        dp_player = next(p for p in result["players"] if p["player_name"] == "Divya Prakash Singh")
        assert dp_player["player_url"] == "https://crex.live/player/divya-prakash-singh-IFW"
        assert dp_player["source"] == "iv4_api"
        assert dp_player["team_name"] == "Gandiv Warriors"

    def test_missing_player_name_skips_player(self):
        svc = self._make_service()
        iv4 = {
            "t": "1EU",
            "tp": "IFW..1.0.0.0.0.0.0.0-UNKNOWN..1.0.0.0.0.0.0.0",
            "tb": "",
            "s": "2F5",
            "v": "V99",
            "dt": "2026-05-20",
        }
        local_storage = {
            "t_1EU_name": "Warriors",
            "p_IFW_name": "Known Player",
            # UNKNOWN not in localStorage
        }
        result = svc._decode_iv4_to_seed(iv4, local_storage, "url")
        assert result is not None
        assert len(result["players"]) == 1
        assert result["players"][0]["player_name"] == "Known Player"

    def test_empty_teams_returns_none(self):
        svc = self._make_service()
        iv4 = {"t": "", "tp": "", "tb": "", "s": "", "v": "", "dt": ""}
        result = svc._decode_iv4_to_seed(iv4, {}, "url")
        assert result is None

    def test_bowling_only_player_included(self):
        """Players only in tb (bowling) but not in tp should still appear."""
        svc = self._make_service()
        iv4 = {
            "t": "A",
            "tp": "P1..1.0.0.0.0.0.0.0",  # P1 bats
            "tb": "P1..1.0.0.0.0.0.0.0-P2..2.0.0.0.0.0.0.0",  # P2 bowls only
            "s": "",
            "v": "",
            "dt": "",
        }
        local_storage = {
            "t_A_name": "Team A",
            "p_P1_name": "Player One",
            "p_P2_name": "Player Two",
        }
        result = svc._decode_iv4_to_seed(iv4, local_storage, "url")
        assert result is not None
        names = {p["player_name"] for p in result["players"]}
        assert names == {"Player One", "Player Two"}
