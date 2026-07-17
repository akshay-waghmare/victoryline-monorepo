# ODI and T20 Model Routing

Updated: 2026-07-10

## Match Intelligence Contract

Match Intelligence uses the combined gender-aware v2 models for format-matched fallback inference: `models/t20_all_v2` with `data/t20_all_feature_store_v2` for T20, and `models/odi_all_v2` with `data/odi_all_feature_store_v2` for ODI. Shpageeza is explicitly pinned to the combined T20 route so it does not silently use the legacy men's-only T20 artifact.

## Implemented

- Added `ODI Women` and `ODI Male` dashboard league configurations.
- Added ODI URL detection before the generic women’s T20 tour matcher.
- Routed ODI predictions through `models/odi_mc_v1` with `--mc-only` because ODI feature-store directories are not present in this checkout.
- Made the feature-store argument optional for MC-only models.
- Added public `format_label` and `model_mode` fields.
- Fixed frontend matching for abbreviations and women’s team identities such as `ire-w` / `wi-w` to `Ireland` / `West Indies`.

## Verified Match

Source URL:

`https://crex.com/cricket-live-score/ire-w-vs-wi-w-1st-odi-west-indies-women-tour-of-ireland-2026-match-updates-114S`

Dashboard public payload verified with:

- `league: ODI Women`
- `league_code: odi_female`
- `format_label: odi`
- `model_mode: MC-only`
- live score, overs, probability, projection, and model insight

Crickzen route verified:

`http://localhost:8080/match-intelligence/ire-w-vs-wi-w-1st-odi-west-indies-women-tour-of-ireland-2026-match-updates-114S`

The SSR transfer state now contains a non-null `publicPrediction`, and the page renders the live model insight without a model-unavailable fallback.

## Limitation

The repo contains `models/odi_female_v1` and `models/odi_v1`, but their ODI feature-store directories are not present in this checkout. The current production-safe integration therefore uses the calibrated-by-format ODI Monte Carlo path. A trained ODI ML route can be added after its feature store is restored and verified.

## Next Model Work

- Add explicit `format_label`, `model_mode`, and confidence language to the Crickzen briefing UI.
- Expose ODI phase, par-score, pressure, and probability-swing fields from the public serializer.
- Restore or provision ODI feature stores before switching from MC-only to ODI ML inference.
- Add T20 format routing tests for male, female, and international URL families.
