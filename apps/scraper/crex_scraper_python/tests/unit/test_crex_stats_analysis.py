from src.crex_stats_analysis import (
    analyze_crawler_payload,
    analyze_player_page_html,
    analyze_standings_html,
)


def test_analyze_player_page_extracts_profile_recent_form_and_career_tables():
    html = """
    <html>
      <head><title>Example Player | CREX</title></head>
      <body>
        <h2>About Example Player</h2>
        <div>Name</div><div>Example Player</div>
        <div>Nationality</div><div>Indian</div>
        <div>Role</div><div>All Rounder</div>
        <p>Impact player in franchise cricket.</p>

        <h2>Example Player Recent Form</h2>
        <h3>Batting</h3>
        <div><span>IND vs AUS</span><a href="/scoreboard/abc">45 (33)</a></div>
        <div><span>IND vs ENG</span><a href="/scoreboard/def">12 (10)</a></div>
        <h3>Bowling</h3>
        <div><span>IND vs AUS</span><a href="/scoreboard/ghi">2-25</a></div>

        <h2>Example Player Career Stats</h2>
        <h3>Batting</h3>
        <table>
          <tr><th>Format</th><th>Mat</th><th>Inn</th><th>R</th></tr>
          <tr><td>ODI</td><td>10</td><td>9</td><td>320</td></tr>
        </table>
        <h3>Bowling</h3>
        <table>
          <tr><th>Format</th><th>Mat</th><th>Inn</th><th>W</th></tr>
          <tr><td>ODI</td><td>10</td><td>10</td><td>14</td></tr>
        </table>

        <h2>Teams played for</h2>
        <ul>
          <li><a href="/team/ind">India</a></li>
          <li><a href="/team/mi">Mumbai Indians</a></li>
        </ul>
      </body>
    </html>
    """

    result = analyze_player_page_html(html, source_url="https://crex.com/player/example-player-1")

    assert result["kind"] == "player_page"
    assert result["player_name"] == "Example Player"
    assert result["profile"]["name"] == "Example Player"
    assert result["profile"]["nationality"] == "Indian"
    assert result["profile"]["bio"] == "Impact player in franchise cricket."
    assert result["recent_form"]["batting"][0]["match"] == "IND vs AUS"
    assert result["recent_form"]["batting"][0]["scorecard_url"] == "https://crex.com/scoreboard/abc"
    assert result["recent_form"]["bowling"][0]["performance"] == "2-25"
    assert result["career_stats"]["batting"]["rows"][0]["Format"] == "ODI"
    assert result["career_stats"]["bowling"]["rows"][0]["W"] == "14"
    assert result["teams_played_for"] == ["India", "Mumbai Indians"]


def test_analyze_standings_page_extracts_labeled_tables():
    html = """
    <html>
      <head><title>Points Table | CREX</title></head>
      <body>
        <h2>Champions Trophy Points Table</h2>
        <h3>Group A</h3>
        <table>
          <tr><th>Rank</th><th>Team</th><th>P</th><th>W</th><th>Pts</th></tr>
          <tr><td>1</td><td>India</td><td>3</td><td>3</td><td>6</td></tr>
          <tr><td>2</td><td>Pakistan</td><td>3</td><td>2</td><td>4</td></tr>
        </table>
        <h3>Group B</h3>
        <table>
          <tr><th>Rank</th><th>Team</th><th>P</th><th>W</th><th>Pts</th></tr>
          <tr><td>1</td><td>Australia</td><td>3</td><td>3</td><td>6</td></tr>
        </table>
      </body>
    </html>
    """

    result = analyze_standings_html(html)

    assert result["kind"] == "standings_page"
    assert result["section_count"] == 2
    assert result["sections"][0]["label"] == "Group A"
    assert result["sections"][0]["rows"][0]["Team"] == "India"
    assert result["sections"][1]["rows"][0]["Pts"] == "6"


def test_analyze_standings_page_falls_back_to_rankings_tokens_when_tables_are_missing():
    html = """
    <html>
      <head><title>Rankings | CREX</title></head>
      <body>
        <h2>Men's Teams Ranking</h2>
        <h3>ODI</h3>
        <div>IND</div>
        <div>IND</div>
        <div>RATING</div>
        <div>119</div>
        <div>Rank</div>
        <div>Team</div>
        <div>Rating</div>
        <div>2</div>
        <div>AUS</div>
        <div>114</div>
        <div>3</div>
        <div>NZ</div>
        <div>109</div>
      </body>
    </html>
    """

    result = analyze_standings_html(html)

    assert result["section_count"] == 1
    assert result["sections"][0]["label"] == "ODI"
    assert result["sections"][0]["leader"]["team"] == "IND"
    assert result["sections"][0]["rows"][1]["Team"] == "NZ"


def test_analyze_crawler_payload_handles_debug_and_normalized_shapes():
    debug_payload = {
        "captured_at": "2026-03-09T09:41:57.759532",
        "captures": [
            {
                "type": "sV3",
                "B_raw": "1",
                "A_raw": "1.0.4.0",
                "top_level_keys": ["A", "B", "rb"],
            },
            {
                "type": "getBallFeed",
            },
        ],
    }
    normalized_payload = {
        "matchExternalKey": "match-1",
        "series": {"name": "Champions Trophy"},
        "teams": [
            {
                "name": "India",
                "squad": [
                    {
                        "name": "Virat Kohli",
                        "captain": False,
                        "wicketKeeper": False,
                        "stats": [
                            {"category": "seed_context"},
                            {"category": "live_batting"},
                        ],
                    }
                ],
            }
        ],
    }

    debug_result = analyze_crawler_payload(debug_payload)
    normalized_result = analyze_crawler_payload(normalized_payload)

    assert debug_result["kind"] == "crex_debug_capture"
    assert debug_result["capture_types"]["sV3"] == 1
    assert debug_result["unique_ball_values"] == ["1"]
    assert normalized_result["kind"] == "normalized_player_stats_payload"
    assert normalized_result["team_count"] == 1
    assert normalized_result["teams"][0]["stat_categories"]["live_batting"] == 1
