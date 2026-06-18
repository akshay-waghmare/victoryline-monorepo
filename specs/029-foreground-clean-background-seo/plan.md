# Implementation Plan: Foreground Clean Background SEO

## Scope

Do one coordinated hierarchy cleanup across:

- homepage
- `/matches`
- individual match details

The goal is to keep SEO support in the background while making the visible UI cleaner and more competitor-like.

## Inputs

- Competitor audit showed cleaner visible surfaces with background SEO handling.
- Local inspection showed support-link and support-detail clusters still fully expanded and visually noisy.

## Workstreams

1. **Homepage**
   - Move richer score-hub and direct-link clusters into a quieter secondary drawer.

2. **Matches page**
   - Move richer discovery and direct-link clusters into a quieter secondary drawer.

3. **Individual page**
   - Keep the compact support strip visible.
   - Move the heavy SEO detail grid into a quieter secondary drawer.

4. **Verification**
   - Rebuild the frontend and verify the served hierarchy with raw HTML checks and local route checks.

## Constraints

- Do not remove SSR-visible support content.
- Do not change canonical or routing behavior.
- Do not undo the existing at-a-glance fixes.
