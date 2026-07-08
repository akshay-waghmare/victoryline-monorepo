# Discovery Evidence

Use this file when the user wants proof from Search Console, sitemap timing, or discovery hubs.

## Evidence order

1. Verify raw HTML for the target `/cric-live/{slug}` URL.
2. Verify raw HTML for the hub that should expose the URL.
3. Verify sitemap inclusion and `lastmod`.
4. Verify GSC or MCP evidence for discovery, crawl, and indexing timing.
5. Only then judge whether the problem is a page-template issue or a discovery-path issue.

## If a GSC MCP tool is available

Prefer the MCP for:

- URL inspection state
- sitemap fetch status
- impression, click, query, and page-level performance
- comparing discovery time against match start time

Pull only the evidence needed for the diagnosis and keep credentials outside the repo.

## If no GSC MCP tool is available

Use the repo script:

```powershell
python .\scripts\query_gsc_search_analytics.py --credentials <service-account-json> --start-date YYYY-MM-DD --end-date YYYY-MM-DD --inspect-url-file <urls.txt>
```

Also use:

- `.\scripts\Start-SeoDashboard.ps1`
- `artifacts/seo-health/`
- `artifacts/seo-investigation-20260610/` when older discovery evidence is needed for comparison

## Key timing questions

Answer these explicitly:

- Did the page exist before match start?
- When was it first emitted into sitemap?
- When was it first linked from a crawlable hub?
- When did Google first discover it?
- Was it crawled or indexed before the match started?
- Did impressions begin only after the match was already live or completed?

## Strong discovery path

The healthy path is:

- URL returns `200`
- self-canonical
- `index,follow`
- valid JSON-LD
- listed in sitemap
- linked by SSR anchors from discovery hubs
- GSC recognizes the URL before match start

If the page is valid but "URL is unknown to Google", suspect sitemap freshness, missing hub links, or late publication before changing metadata.
