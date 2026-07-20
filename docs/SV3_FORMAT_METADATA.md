# sV3 Format Metadata

The scraper now treats the sV3 `fo` field as the authoritative provider label and preserves it verbatim under `format_metadata.label`.

For example:

```json
{
  "fo": "Youth Test",
  "numDays": 4,
  "followOnRuns": 150
}
```

becomes:

```json
{
  "label": "Youth Test",
  "type": "test",
  "variant": "youth",
  "days": 4,
  "follow_on_runs": 150
}
```

Supported normalized types currently include `test`, `first_class`, `list_a`, `odi`, and `t20`. Unknown provider labels remain usable because the raw label is retained and `type` becomes `unknown`. Missing `fo` does not emit metadata.

The metadata is included in both the full sV3 processing path and immediate live patches. Existing raw `live_data` and all existing score fields remain unchanged.

## Meaning of `follow_on_runs`

`follow_on_runs` is a match-rule threshold, not the current score, runs scored on a particular day, or runs remaining. It indicates the minimum first-innings lead required before the leading team may enforce the follow-on.

For example, in a four-day Youth Test:

```json
{"follow_on_runs": 150, "days": 4}
```

means the first team must lead by at least 150 runs after the opposing team completes its innings before the follow-on can be enforced. The value remains relevant even when the match is still on Day 1.
