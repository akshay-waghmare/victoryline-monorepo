import unittest

from collector import canonical_match_url, normalize_serpbear, parse_html_proof, summarize


class CollectorTest(unittest.TestCase):
    def test_canonical_match_url_uses_external_key(self):
        result = canonical_match_url(
            {"externalMatchKey": "aa-vs-bb-live-score-123"},
            "https://www.crickzen.com",
        )
        self.assertEqual(
            result,
            "https://www.crickzen.com/cric-live/aa-vs-bb-live-score-123",
        )

    def test_parse_html_proof(self):
        url = "https://www.crickzen.com/cric-live/example"
        html = f"""
        <html><head>
          <link rel="canonical" href="{url}">
          <meta name="robots" content="index,follow">
        </head><body>
          <h1>Example live score</h1>
          <a href="/cric-live/example">Match</a>
          <section>FAQ</section>
        </body></html>
        """
        proof = parse_html_proof(html, url)
        self.assertEqual(proof["h1Count"], 1)
        self.assertTrue(proof["canonicalMatches"])
        self.assertEqual(proof["cricLiveLinks"], 1)
        self.assertTrue(proof["faqPresent"])

    def test_normalize_serpbear(self):
        rows = normalize_serpbear(
            {"keywords": [{"keyword": "live cricket score", "rank": 7}]}
        )
        self.assertEqual(rows[0]["keyword"], "live cricket score")
        self.assertEqual(rows[0]["position"], 7)

    def test_summarize_uses_weighted_position(self):
        summary = summarize(
            [
                {"clicks": 1, "impressions": 10, "position": 2},
                {"clicks": 2, "impressions": 30, "position": 6},
            ]
        )
        self.assertEqual(summary["clicks"], 3)
        self.assertEqual(summary["impressions"], 40)
        self.assertEqual(summary["position"], 5)


if __name__ == "__main__":
    unittest.main()
