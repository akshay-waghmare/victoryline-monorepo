# Feature Specification: One Match, One Canonical Slug

**Feature branch**: `054-one-match-one-canonical-slug`  
**Created**: 2026-08-15  
**Status**: Implemented locally; backend/frontend rollout required

## Problem

CREX can revise a human-readable match label while retaining its stable source match ID. CrickZen treated each resulting slug as a separate page. For `10MT`, `/aus-vs-ban-1st-test-...-10MT` and `/aus-vs-ban-1st-match-...-10MT` both returned `200`, self-canonicalised, and emitted contradictory lifecycle content.

## Decision

The CREX API key is the match identity; a slug is only an alias. The oldest non-deleted catalogue row for that identity owns the canonical slug. Every other valid alias receives a permanent `301` to that owner, preserving an allowed child route and query string. The sitemap applies the same one-owner selection.

Freshest sibling evidence can improve lifecycle state but cannot create another URL. `stumps` or `lead by` without a terminal-result signal is `INNINGS_BREAK`, not completed.

## Acceptance criteria

- One CREX API key yields exactly one sitemap URL.
- A non-owner `/cric-live/{alias}` and its child surfaces return `301` to the owner.
- Only the owner can return `200` and self-canonicalise.
- Alias redirection happens before Angular SSR, so no alias HTML/canonical can be emitted.
- A multi-day match at stumps is not labelled upcoming or completed when current sibling evidence says it is in progress.
- Unresolvable/malformed routes remain `404`; no guessed match identity is created.

## Rollback

Roll back backend and frontend together. Do not roll back only one side: frontend without the resolution contract cannot issue the redirect; backend without the redirect still lets aliases render.
