# Tasks: Homepage CrickZen Brand Identity and Site Name Signals

## Phase 1 — Specification and continuity

- [x] T001 Consult the repository constitution v1.3.0 and wiki mirror before editing.
- [x] T002 Run the read-only SEO-health baseline and record 2,188 unique URLs, zero duplicates, and zero failures.
- [x] T003 Record current homepage metadata/schema gaps and dirty-worktree boundary.
- [x] T004 Create the detailed prompt, specification, implementation plan, and acceptance matrix.

## Phase 2 — Structured-data implementation

- [x] T101 Add a typed `website()` factory to `StructuredDataService`.
- [x] T102 Add exactly one homepage `WebSite` item with `CrickZen`, `crickzen.com`, and the canonical root URL.
- [x] T103 Add one truthful homepage `Organization` item with the verified CrickZen logo URL and no unverified `sameAs` values.
- [x] T104 Align shared `WebPage.isPartOf` output and public schema publisher/author defaults to `CrickZen`.

## Phase 3 — Public brand consistency

- [x] T201 Update homepage static/runtime title, description, and Open Graph site name.
- [x] T202 Update navbar, footer, splash, login, error, and shared logo labels.
- [x] T203 Update About, Contact, Terms, and public SEO copy where `CrickZen` is the product name.
- [x] T204 Preserve lowercase technical identifiers, hostnames, URLs, filenames, and analytics keys.

## Phase 4 — Focused verification

- [x] T301 Add Website factory unit tests.
- [x] T302 Add homepage schema composition/repeat-render tests.
- [x] T303 Run frontend app/spec TypeScript checks and focused Angular tests.
- [x] T304 Run local production SSR/browser-server build and parse raw homepage output.
- [x] T305 Run normal, desktop Googlebot, and mobile Googlebot homepage checks.
- [ ] T306 Rerun the SEO-health audit and confirm no new crawl/indexability failures.

Verification note: local SSR and the three user-agent responses passed. The post-change
public audit at `20260901-081856` recorded 9 transient failures while shared production
rollouts were active (thin fallback/timeouts and two match samples); the earlier clean
pre-deploy audit at `20260901-072155` recorded zero failures. This keeps T306 open.

## Phase 5 — Isolated rollout and observation

- [ ] T401 Build/deploy only the frontend from an isolated clean snapshot with the intended overlay.
- [ ] T402 Verify the exact production homepage, image/digest, title, canonical, robots, H1, and schema.
- [ ] T403 Inspect/request recrawl for the homepage in Search Console; record it as a request only.
- [ ] T404 Verify owned social profiles before adding any `sameAs` or footer URLs.
- [ ] T405 Observe `crickzen` and `crickzen cricket` queries and record whether Google changes its suggestion.
- [x] T406 Update the CrickZen wiki checkpoint/decision with exact evidence and the remaining outcome gate.

## Definition of done

- [ ] Homepage emits one first-class `WebSite` identity and one truthful `Organization` identity.
- [ ] Public product-brand strings use `CrickZen`; technical lowercase tokens are preserved.
- [ ] Focused tests/build/raw SSR/Googlebot matrix and SEO-health audit pass.
- [ ] Production rollout, if performed, has a named frontend rollback artifact and exact public proof.
- [ ] Google correction, indexing, ranking, traffic, and business outcomes remain explicitly unproven until observed.
