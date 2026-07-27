import importlib.util
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


class SeoAuditAgentTest(unittest.TestCase):
    def test_canonical_url_prefers_external_match_key(self):
        self.assertEqual(
            agent.canonical_url({"externalMatchKey": "aa-vs-bb-match-updates-123"}, "https://example.com"),
            "https://example.com/cric-live/aa-vs-bb-match-updates-123",
        )

    @patch.object(agent.requests, "get")
    def test_parse_page_keeps_healthy_canonical_match_clean(self, get):
        url = "https://www.crickzen.com/cric-live/aa-vs-bb-match-updates-123"
        get.return_value = FakeResponse(200, f'''<title>AA vs BB Live | Crickzen</title>
          <link rel="canonical" href="{url}"><meta name="robots" content="index,follow">
          <script type="application/ld+json">{{"@type":"SportsEvent"}}</script><h1>AA vs BB</h1>''')

        page = agent.parse_page(url)

        self.assertEqual(page["flags"], [])
        self.assertEqual(page["h1Count"], 1)

    @patch.object(agent.requests, "get")
    def test_parse_page_flags_generic_match_title(self, get):
        url = "https://www.crickzen.com/cric-live/aa-vs-bb-match-updates-123"
        get.return_value = FakeResponse(200, f'''<title>Cricket match not available</title>
          <link rel="canonical" href="{url}"><meta name="robots" content="index,follow"><h1>AA vs BB</h1>''')

        page = agent.parse_page(url)

        self.assertIn("GENERIC_OR_PLACEHOLDER_TITLE", page["flags"])
        self.assertIn("SPORTSEVENT_MISSING", page["flags"])


if __name__ == "__main__":
    unittest.main()
