# SerpBear Keyword Tracking Notes

SerpBear is a tracking/monitoring tool only. It should not be added to the Crickzen app runtime, Docker runtime, Angular bundle, backend service, or scraper lifecycle.

## General Live Score Keywords

- today match live score
- cricket live score today
- IPL live score today
- live score today cricket
- today cricket match live score
- cricket scorecard today
- cricket match result today

## Match-Specific Keyword Template

Replace `team a` and `team b` with the actual team names or short names from the canonical `/cric-live/{slug}` page.

- team a vs team b live score
- team a vs team b live score today
- team a vs team b scorecard
- team a vs team b toss time
- team a vs team b playing 11
- team a vs team b match result
- team a vs team b today match live score

## Language Variants

- aaj ka match live score
- today cricket match live score hindi
- live score marathi
- team a vs team b live score marathi
- team a vs team b live score hindi
- aaj ka cricket match scorecard
- team a vs team b playing 11 hindi

## Suggested Tracking Groups

- `General live score`: broad live-score and scorecard keywords.
- `Today intent`: keywords containing today, aaj, or schedule intent.
- `IPL intent`: IPL live score, IPL schedule, IPL scorecard, IPL result.
- `Match pages`: top active/upcoming matches generated from `/cric-live/{slug}`.
- `Language variants`: Hindi and Marathi long-tail keywords.

## Starter 20 Keywords

- today match live score
- cricket live score today
- ipl live score today
- live cricket score
- live score cricket
- mi vs csk live score
- mi vs csk live score today
- mi vs csk scorecard
- mi vs csk playing 11
- mi vs csk toss time
- ind vs aus live score
- ind vs aus live score today
- pak w vs sa w live score
- pak w vs sa w scorecard
- aaj ka match live score
- cricket live score hindi
- live score marathi
- today match scorecard
- cricket match result today
- ipl match scorecard

## Weekly Review Checklist

- Compare impressions and average position for `/cric-live/*` against `/live-score/*` hubs.
- Check whether hub pages are ranking as discovery pages and not competing with canonical match pages.
- Add match-specific keywords only for indexable canonical URLs with useful SSR content.
- Remove completed low-value keywords after the match is stale unless they still receive scorecard/result impressions.
