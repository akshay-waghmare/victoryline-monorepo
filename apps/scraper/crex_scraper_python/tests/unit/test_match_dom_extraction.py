import pytest

from crex_scraper_python.src.dom_match_extract import (
    REQUIRED_SELECTORS,
    get_missing_selectors,
    extract_match_dom_fields,
)


@pytest.fixture
def sample_html() -> str:
    # Minimal synthetic HTML containing all required selectors
    return """
    <html><body>
      <div class='odds-view-btn'><div class='view'></div><div class='view'>toggle</div></div>
      <div class='result-box'><span>Team A won</span><span>by 5 runs</span></div>
      <div class='team-run-rate'><span class='data'>CRR 8.2</span></div>
      <div class='final-result m-none'>Final: Team A def Team B</div>
      <div class='team-content'>
        <div class='team-name'>Team A</div>
        <div class='runs'><span>150/6</span><span>(20)</span></div>
      </div>
      <div class='team-content'>
        <div class='team-name'>Team B</div>
        <div class='runs'><span>145/9</span><span>(20)</span></div>
      </div>
      <div id='slideOver'>
        <div class='overs-slide'>
          <span>19</span>
          <div class='over-ball'>1</div>
          <div class='over-ball'>4</div>
          <div class='total'>6</div>
        </div>
      </div>
      <div class='fav-odd'>
        <div class='d-flex'>
          <div class='team-name'><span>Team A</span></div>
          <div class='odd'><div class='dark-odds'>1.45</div><div class='dark-odds'>1.60</div></div>
        </div>
      </div>
      <span class='ds-text-title-xs ds-font-bold ds-capitalize'>Team A</span>
      <div class='ds-w-full ds-bg-fill-content-prime ds-overflow-hidden ds-rounded-xl ds-border ds-border-line ds-mb-4'></div>
      <a href='https://example.com/cricket-grounds/stadium'>Stadium Name</a>
      <div class='ds-px-4 ds-pb-3'><p>Over details text</p><span>Forecast 1</span><span>Forecast 2</span></div>
      <div class='ds-text-tight-s ds-font-bold ds-ml-1'>WinProb A 75%</div>
    </body></html>
    """


def test_all_required_selectors_present(sample_html):
    missing = get_missing_selectors(sample_html)
    assert missing == [], f"Missing selectors: {missing}"


def test_extraction_structure(sample_html):
    data = extract_match_dom_fields(sample_html)
    assert data["result"], "Result should be extracted"
    assert data["run_rate"].startswith("CRR"), "Run rate missing"
    assert len(data["teams"]) == 2, "Two teams expected"
    for t in data["teams"]:
        assert t["name"], "Team name missing"
        assert t["runs"], "Team runs missing"
        assert t["overs"], "Team overs missing"
    assert data["overs_data"], "Overs detail missing"
    assert data["odds"], "Odds block missing"
    assert data["venue"] == "Stadium Name"


def test_team_name_ignores_pp_icon():
    """Powerplay badge (.pp-icon > 'PP') must not be appended to the team name."""
    html = """
    <html><body>
      <div class='team-content'>
        <div class='team-name team-1'> PBKS
          <span class='inning-f'> </span>
          <div class='pp-icon'><span class='btn-text'>PP</span></div>
        </div>
        <div class='runs'><span>0-0</span><span>0.0</span></div>
      </div>
    </body></html>
    """
    data = extract_match_dom_fields(html)
    assert data["teams"][0]["name"] == "PBKS", (
        f"Expected 'PBKS', got '{data['teams'][0]['name']}' — pp-icon leaking into team name"
    )


def test_final_result_text_has_spaces():
    """Words split across child spans in .final-result must be separated by spaces."""
    html = """
    <html><body>
      <div class='final-result m-none'>PBKS need<span>197</span> runs<span>in</span><span>120</span> balls</div>
      <div class='team-content'>
        <div class='team-name'>X</div>
        <div class='runs'><span>0</span><span>0</span></div>
      </div>
    </body></html>
    """
    data = extract_match_dom_fields(html)
    result_text = data["result"]
    assert " " in result_text, f"final_result_text has no spaces: '{result_text}'"
    assert "197" in result_text and "120" in result_text


def test_missing_selector_detection(sample_html):
    # Remove one selector deliberately (.team-run-rate .data)
    html_without_run_rate = sample_html.replace("<div class='team-run-rate'><span class='data'>CRR 8.2</span></div>", "")
    missing = get_missing_selectors(html_without_run_rate)
    assert ".team-run-rate .data" in missing, "Run rate selector should be reported missing"
