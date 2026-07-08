import unittest

from collector import (
    _apply_history,
    _extract_sitemap_index_entries,
    _extract_sitemap_url_entries,
    _hub_presence,
    _score_manual_submission_candidate,
    canonical_match_url,
    find_discovery_hubs,
    normalize_schedule_payload,
    normalize_serpbear,
    parse_html_proof,
    summarize,
)


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
        self.assertFalse(proof["sportsEvent"])

    def test_parse_html_proof_detects_freshness_signals(self):
        url = "https://www.crickzen.com/cricket-live-updates/example"
        html = f"""
        <html><head>
          <link rel="canonical" href="{url}">
          <meta name="robots" content="index,follow">
          <script type="application/ld+json">{{"@type":"NewsArticle"}}</script>
          <script type="application/ld+json">{{"@type":"LiveBlogPosting"}}</script>
        </head><body>
          <h1>Example live updates</h1>
          <section><span>Published</span></section>
          <section><span>Updated</span></section>
          <h2>Key events</h2>
          <h2>Keyword ownership</h2>
        </body></html>
        """
        proof = parse_html_proof(html, url)
        self.assertTrue(proof["newsArticle"])
        self.assertTrue(proof["liveBlogPosting"])
        self.assertTrue(proof["publishedTimestamp"])
        self.assertTrue(proof["updatedTimestamp"])
        self.assertTrue(proof["keyEvents"])
        self.assertTrue(proof["keywordOwnership"])

    def test_find_discovery_hubs_supports_relative_links(self):
        canonical_url = "https://www.crickzen.com/cric-live/example"
        hubs = find_discovery_hubs(
            canonical_url,
            "https://www.crickzen.com",
            {
                "/live-score": '<a href="/cric-live/example">Example</a>',
                "/archive": "<p>No link</p>",
            },
        )
        self.assertEqual(hubs, ["/live-score"])

    def test_hub_presence_tracks_series_surface(self):
        presence = _hub_presence(
            "https://www.crickzen.com/cric-live/example",
            "https://www.crickzen.com",
            {
                "/series": '<a href="/cric-live/example">Example</a>',
                "/matches": "<p>No link</p>",
            },
        )
        self.assertTrue(presence["series"])
        self.assertFalse(presence["matches"])

    def test_normalize_serpbear(self):
        rows = normalize_serpbear(
            {"keywords": [{"keyword": "live cricket score", "rank": 7}]}
        )
        self.assertEqual(rows[0]["keyword"], "live cricket score")
        self.assertEqual(rows[0]["position"], 7)

    def test_normalize_schedule_payload_supports_response_wrapper(self):
        rows = normalize_schedule_payload(
            {"success": True, "data": [{"externalMatchKey": "sample-match"}]}
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["externalMatchKey"], "sample-match")

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

    def test_extract_sitemap_index_entries(self):
        entries = _extract_sitemap_index_entries(
            """
            <sitemapindex>
              <sitemap>
                <loc>https://www.crickzen.com/sitemaps/sitemap-matches-0001.xml</loc>
                <lastmod>2026-06-28T01:56:24Z</lastmod>
              </sitemap>
            </sitemapindex>
            """
        )
        self.assertEqual(len(entries), 1)
        self.assertEqual(
            entries[0]["loc"],
            "https://www.crickzen.com/sitemaps/sitemap-matches-0001.xml",
        )

    def test_extract_sitemap_url_entries(self):
        entries = _extract_sitemap_url_entries(
            """
            <urlset>
              <url>
                <loc>https://www.crickzen.com/cric-live/sample-match</loc>
                <lastmod>2026-06-28T01:56:24Z</lastmod>
              </url>
            </urlset>
            """
        )
        self.assertEqual(
            entries["https://www.crickzen.com/cric-live/sample-match"],
            "2026-06-28T01:56:24Z",
        )

    def test_apply_history_preserves_first_seen_timestamps(self):
        state = {"urls": {}}
        row = {
            "url": "https://www.crickzen.com/cric-live/sample-match",
            "slug": "sample-match",
            "category": "upcoming",
            "inSitemap": True,
            "discoveryHubCount": 2,
            "indexed": False,
            "sitemapLastmod": "2026-06-28T01:56:24Z",
        }
        first = _apply_history(dict(row), state, "2026-06-28T08:00:00+00:00")
        second = _apply_history(dict(row), state, "2026-06-28T09:00:00+00:00")
        self.assertEqual(
            first["history"]["firstSeenInSitemapAt"], "2026-06-28T08:00:00+00:00"
        )
        self.assertEqual(
            second["history"]["firstSeenInSitemapAt"], "2026-06-28T08:00:00+00:00"
        )
        self.assertEqual(
            second["history"]["lastObservedAt"], "2026-06-28T09:00:00+00:00"
        )

    def test_score_manual_submission_candidate_prefers_healthy_unknown_upcoming_url(self):
        score = _score_manual_submission_candidate(
            {
                "category": "upcoming",
                "rawHtmlHealth": "healthy",
                "unknownToGoogle": True,
                "discoveredButNotIndexed": False,
                "inSitemap": True,
                "discoveryHubCount": 2,
                "hoursUntilMatch": 5.5,
                "indexed": False,
                "hasImpressions": False,
                "hasClicks": False,
            }
        )
        self.assertEqual(score["recommendedAction"], "manual_submit")
        self.assertGreaterEqual(score["priorityScore"], 55)

    def test_score_manual_submission_candidate_prefers_early_window_reasoning(self):
        score = _score_manual_submission_candidate(
            {
                "category": "upcoming",
                "rawHtmlHealth": "healthy",
                "unknownToGoogle": True,
                "discoveredButNotIndexed": False,
                "inSitemap": True,
                "discoveryHubCount": 2,
                "hoursUntilMatch": 60,
                "indexed": False,
                "hasImpressions": False,
                "hasClicks": False,
            }
        )
        self.assertEqual(score["recommendedAction"], "manual_submit")
        self.assertIn("early-submission window", " ".join(score["queueReasons"]))

    def test_score_manual_submission_candidate_downgrades_broken_rows(self):
        score = _score_manual_submission_candidate(
            {
                "category": "upcoming",
                "rawHtmlHealth": "broken",
                "unknownToGoogle": True,
                "hoursUntilMatch": 3,
            }
        )
        self.assertEqual(score["recommendedAction"], "fix_product")


if __name__ == "__main__":
    unittest.main()
