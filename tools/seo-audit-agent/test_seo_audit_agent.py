import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("seo_audit_agent.py")
SPEC = importlib.util.spec_from_file_location("seo_audit_agent", MODULE_PATH)
agent = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(agent)


class FakeResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text


def valid_target():
    return agent.make_target(
        "https://www.crickzen.com/cric-live/aa-vs-bb-match-updates-123",
        "canonical-match",
        "test",
        "live",
    )


def valid_json_ld(url):
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": "AA vs BB",
        "url": url,
        "startDate": "2026-07-27T10:00:00Z",
        "homeTeam": {"name": "AA"},
        "awayTeam": {"name": "BB"},
    })


class SeoAuditAgentTest(unittest.TestCase):
    def test_canonical_url_prefers_external_match_key(self):
        self.assertEqual(
            agent.canonical_url({"externalMatchKey": "aa-vs-bb-match-updates-123"}, "https://example.com"),
            "https://example.com/cric-live/aa-vs-bb-match-updates-123",
        )

    @patch.object(agent.requests, "get")
    def test_parse_page_keeps_healthy_canonical_match_clean(self, get):
        target = valid_target()
        url = target["url"]
        get.return_value = FakeResponse(200, f'''<title>AA vs BB Live | Crickzen</title>
          <link rel="canonical" href="{url}"><meta name="robots" content="index,follow">
          <script type="application/ld+json">{valid_json_ld(url)}</script><h1>AA vs BB</h1>''')

        page = agent.parse_page(target)

        self.assertEqual(page["flags"], [])
        self.assertEqual(page["schema"]["sportsEvent"]["homeTeam"], "AA")

    @patch.object(agent.requests, "get")
    def test_parse_page_flags_generic_match_title(self, get):
        target = valid_target()
        url = target["url"]
        get.return_value = FakeResponse(200, f'''<title>Cricket match not available</title>
          <link rel="canonical" href="{url}"><meta name="robots" content="index,follow">
          <script type="application/ld+json">{valid_json_ld(url)}</script><h1>AA vs BB</h1>''')

        page = agent.parse_page(target)

        self.assertIn("GENERIC_OR_PLACEHOLDER_TITLE", [flag["code"] for flag in page["flags"]])

    @patch.object(agent.requests, "get")
    def test_invalid_fixture_requires_404_and_noindex(self, get):
        target = agent.make_target("https://www.crickzen.com/cric-live/invalid-vs-never-000", "invalid-route", "test", "invalid", "invalid")
        get.return_value = FakeResponse(200, '<title>Live match</title><meta name="robots" content="index,follow"><h1>Live match</h1>')

        page = agent.parse_page(target)

        codes = [flag["code"] for flag in page["flags"]]
        self.assertIn("INVALID_ROUTE_NOT_404", codes)
        self.assertIn("INVALID_ROUTE_INDEXABLE", codes)

    @patch.object(agent.requests, "get")
    def test_schema_url_mismatch_is_critical(self, get):
        target = valid_target()
        wrong_url = "https://www.crickzen.com/cric-live/other-vs-match-999"
        get.return_value = FakeResponse(200, f'''<title>AA vs BB Live | Crickzen</title>
          <link rel="canonical" href="{target['url']}"><meta name="robots" content="index,follow">
          <script type="application/ld+json">{valid_json_ld(wrong_url)}</script><h1>AA vs BB</h1>''')

        page = agent.parse_page(target)
        mismatch = next(flag for flag in page["flags"] if flag["code"] == "SPORTSEVENT_URL_MISMATCH")

        self.assertEqual(mismatch["severity"], "critical")

    def test_schema_accepts_sportsevent_competitors(self):
        summary = agent.schema_summary([{
            "@type": "SportsEvent",
            "name": "AA vs BB",
            "url": "https://www.crickzen.com/cric-live/aa-vs-bb-match-updates-123",
            "startDate": "2026-07-27T10:00:00Z",
            "competitor": [{"@type": "SportsTeam", "name": "AA"}, {"@type": "SportsTeam", "name": "BB"}],
        }], 0)

        self.assertEqual(summary["sportsEvent"]["homeTeam"], "AA")
        self.assertEqual(summary["sportsEvent"]["awayTeam"], "BB")
        self.assertEqual(summary["sportsEvent"]["teamSource"], "competitor")

    @patch.object(agent.requests, "get")
    def test_title_and_h1_must_not_describe_a_different_schema_event(self, get):
        target = valid_target()
        event = json.loads(valid_json_ld(target["url"]))
        event["name"] = "Mumbai Indians vs Delhi Capitals"
        get.return_value = FakeResponse(200, f'''<title>Australia vs England Live | Crickzen</title>
          <link rel="canonical" href="{target['url']}"><meta name="robots" content="index,follow">
          <script type="application/ld+json">{json.dumps(event)}</script><h1>Australia vs England</h1>''')

        page = agent.parse_page(target)

        self.assertIn("TITLE_H1_SCHEMA_IDENTITY_MISMATCH", [flag["code"] for flag in page["flags"]])

    def test_comparison_marks_new_flag_and_body_collapse(self):
        url = valid_target()["url"]
        previous = {"path": "previous/evidence.json", "payload": {"evidence": {"pages": [{"url": url, "flags": [], "bodyBytes": 1000, "status": 200, "canonical": url, "robots": "index,follow", "title": "AA vs BB", "h1": "AA vs BB"}]}}}
        current = [{"url": url, "flags": [{"code": "CANONICAL_NOT_SELF", "severity": "critical"}], "bodyBytes": 500, "status": 200, "canonical": "", "robots": "index,follow", "title": "AA vs BB", "h1": "AA vs BB"}]

        comparison = agent.compare_with_previous(current, previous)

        self.assertTrue(comparison["available"])
        self.assertEqual(comparison["regressions"][0]["value"], "CANONICAL_NOT_SELF")
        self.assertTrue(any(item["type"] == "body-size-collapse" for item in comparison["regressions"]))

    def test_fixture_file_records_expectations(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "fixtures.json"
            path.write_text(json.dumps({"fixtures": [{"url": "/cric-live/known-vs-match-1", "lifecycle": "archive", "expectedRoute": "valid"}]}), encoding="utf-8")
            fixtures = agent.load_fixture_targets(str(path), "https://www.crickzen.com")

        self.assertEqual(fixtures[0]["lifecycle"], "archive")
        self.assertEqual(fixtures[0]["url"], "https://www.crickzen.com/cric-live/known-vs-match-1")

    def test_report_surfaces_resolutions_and_metadata_changes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            state = {
                "output_dir": str(output_dir),
                "evidence": {
                    "auditStatus": "passed",
                    "severityCounts": {"critical": 0, "high": 0, "medium": 0, "low": 0},
                    "pages": [],
                    "targets": [],
                    "selectionWarnings": [],
                },
                "comparison": {
                    "available": True,
                    "regressions": [],
                    "resolutions": [{"url": "https://example.com", "type": "resolved-flag", "value": "CANONICAL_NOT_SELF"}],
                    "changes": [{"url": "https://example.com", "field": "title", "before": "Old", "after": "New"}],
                },
                "synthesis": {"llmStatus": "skipped", "findings": [], "executive_summary": "", "next_run_focus": ""},
            }
            agent.write_node(state)
            report = (output_dir / "report.md").read_text(encoding="utf-8")

        self.assertIn("## Resolutions From Previous Run", report)
        self.assertIn("CANONICAL_NOT_SELF", report)
        self.assertIn("## Metadata Changes From Previous Run", report)
        self.assertIn("Old -> New", report)


if __name__ == "__main__":
    unittest.main()
