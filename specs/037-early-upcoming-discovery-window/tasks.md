# Tasks: Early Upcoming Discovery Window

## 1. Backend indexing window

- [x] 1.1 Add a configurable upcoming indexing horizon to `LiveMatchIndexingScheduler`
- [x] 1.2 Prefer `30-120h` upcoming matches ahead of shorter-horizon catch-up fixtures while keeping live first
- [x] 1.3 Add/update scheduler tests for inside-window, catch-up, and >120 hour fixtures

## 2. SSR discovery surface alignment

- [x] 2.1 Update homepage upcoming discovery prioritization to `30-120h`
- [x] 2.2 Update `/matches` upcoming discovery prioritization to `30-120h`
- [x] 2.3 Update `/series` grouped discovery prioritization to `30-120h`
- [x] 2.4 Refresh focused frontend discovery tests to match the new window

## 3. Dashboard/operator alignment

- [x] 3.1 Change dashboard collector defaults from `12-48h` to `30-120h`
- [x] 3.2 Update queue scoring reasons to reward the early-discovery band
- [x] 3.3 Update dashboard UI copy so labels reflect the new strategy
- [x] 3.4 Add/refresh Python collector test coverage

## 4. Documentation and verification

- [x] 4.1 Update prematch strategy documentation with the new target window
- [ ] 4.2 Run targeted backend, frontend, and dashboard tests
Notes: backend and dashboard tests passed. Frontend Karma remains blocked by pre-existing Angular 7 / repo-wide test-environment issues unrelated to this change.
