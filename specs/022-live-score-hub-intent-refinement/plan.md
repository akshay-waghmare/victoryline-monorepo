# Implementation Plan: Live Score Hub Intent Refinement

**Branch**: `008-match-title-seo` | **Date**: 2026-06-18 | **Spec**: `specs/022-live-score-hub-intent-refinement/spec.md`

## Summary

Refine the existing SEO hub component so every indexable hub keeps the Phase 1 crawl graph but gains clearer search intent. The work stays frontend-only: add route-specific content configuration, FAQ blocks, match-card context text, safer sitemap fallback selection, and a reusable production raw HTML audit script.

## Technical Context

**Language/Version**: Angular 7.2.x, TypeScript 3.2.x, PowerShell  
**Primary Dependencies**: `LiveScoreHubComponent`, `MatchesService`, `MetaTagsService`, sitemap-backed SSR fallback  
**Storage**: None  
**Testing**: TypeScript no-emit checks and script syntax/runtime checks  
**Target Platform**: `apps/frontend`, `scripts`, `specs`  
**Constraints**: Keep Angular 7-compatible TypeScript; do not add backend load; do not remove sitemap fallback; do not change canonical match URLs  

## Architecture Notes

- Extend the hub config object instead of scattering route-specific conditionals through the template.
- Keep a single component for all hubs to avoid drift in canonical, robots, and internal link behavior.
- Use `primaryFallbackLinks` and `discoveryFallbackLinks` so SSR can expose enough links while each route can show a different slice or filtered group.
- Add visible FAQ content, not schema-only content.
- Add a script that tests raw HTML with Googlebot UA and returns JSON suitable for comparing production rollouts.

## Validation

1. `.\apps\frontend\node_modules\.bin\tsc.cmd -p .\apps\frontend\src\tsconfig.app.json --noEmit`
2. `.\apps\frontend\node_modules\.bin\tsc.cmd -p .\apps\frontend\tsconfig.server.json --noEmit`
3. `powershell -ExecutionPolicy Bypass -File .\scripts\Audit-ProdSeoRawHtml.ps1 -BaseUrl https://www.crickzen.com`

## Rollout Notes

This phase is frontend-only unless the audit reveals a backend sitemap or API health regression. Production proof must use raw SSR HTML, not browser hydration.
