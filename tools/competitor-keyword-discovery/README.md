# Competitor Keyword Discovery

This tool uses Playwright to inspect public competitor pages and compile a list
of likely keyword targets for live-match SEO research.

It is for **discovery**, not ground-truth traffic estimation. Competitor traffic
keywords cannot be directly known without their analytics or Search Console.

## What it collects

- page title
- meta description
- `h1` and `h2` text
- navigation labels
- internal anchor text
- keyword-looking phrases from URLs and slugs
- optional Google autosuggest expansions

## Default competitors

- `https://crex.com/`
- `https://www.cricbuzz.com/cricket-match/live-scores`
- `https://www.espncricinfo.com/live-cricket-score`

## Run it

Use the scraper Python environment because Playwright is already present there.

```powershell
python .\tools\competitor-keyword-discovery\competitor_keyword_discovery.py --google-suggest
```

If Playwright Chromium is missing on this machine:

```powershell
python -m playwright install chromium
```

## Output

Artifacts are written to:

- `artifacts/competitor-keyword-discovery/competitor-keywords.json`
- `artifacts/competitor-keyword-discovery/competitor-keywords.csv`

CSV columns:

- `competitor`
- `phrase`
- `score`
- `sourceCount`
- `sources`

## Custom competitors

Create a JSON file like this:

```json
[
  {
    "name": "crex_match",
    "url": "https://crex.com/cricket-live-score/"
  },
  {
    "name": "cricbuzz_live",
    "url": "https://www.cricbuzz.com/cricket-match/live-scores"
  }
]
```

Then run:

```powershell
python .\tools\competitor-keyword-discovery\competitor_keyword_discovery.py --competitors-file .\tools\competitor-keyword-discovery\competitors.example.json
```

## How to use the output for Crickzen

1. Review the top phrases per competitor.
2. Group phrases into intent buckets:
   - live score
   - scorecard
   - commentary
   - playing xi
   - toss
   - squads
   - schedule
   - prediction
3. Compare those buckets with Crickzen titles, H1s, and hub links.
4. Use Search Console to validate which discovered phrases actually matter for Crickzen traffic.

## Notes

- The script scores phrases by repeated appearance across stronger fields like title, headings, anchors, and slug patterns.
- `--google-suggest` is useful for expansion, but keep requests moderate.
- For a tighter audit, point the script at specific competitor match URLs instead of just the default live hubs.
