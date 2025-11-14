# Phase 6 Deployment Guide

**Feature**: Content Discovery  
**Branch**: `004-mobile-ui-redesign`  
**Target**: `master`  
**Date**: November 14, 2025

---

## 🚀 Deployment Workflow

### Status: Ready for Staging Deployment

**Phase 6 Progress**: 20/24 tasks complete (83%)

---

## ✅ Completed Pre-Deployment Tasks

- [X] **T076-T080**: Core features implemented (filtering, search, history, recommendations, UI)
- [X] **T083-T089**: Quality features (caching, unit tests, E2E tests, accessibility, performance, analytics, offline)
- [X] **T091-T093**: Polish (UI polish, integration, rate limiting)
- [X] **T094**: Documentation (README.md 567 lines)
- [X] **T095**: Code review & QA (QA_REPORT.md 287 lines, 5/5 rating)
- [X] **T096**: Release notes (CHANGELOG.md 466 lines)
- [X] **T097**: Rollout plan (ROLLOUT_PLAN.md 865 lines)
- [X] **T098**: Security review (SECURITY_REVIEW.md 1,326 lines, 4/5 rating)
- [X] **T099**: PR description created (PR_DESCRIPTION.md 618 lines)

---

## 📋 Next Steps for Production Deployment

### Step 1: Address Pre-Existing Linting Errors 🔴 BLOCKER

**Issue**: 800+ linting errors in existing codebase (NOT Phase 6 code)

**Quick Fix** (5-10 minutes):
```bash
cd apps/frontend
ng lint --fix
```

**Alternative** (2 minutes): Update `tslint.json` to disable problematic rules:
```json
{
  "rules": {
    "trailing-whitespace": false,
    "quotemark": [true, "single", "avoid-escape"],
    "curly": false
  }
}
```

**Verification**:
```bash
ng lint                    # Should pass
ng build --prod            # Should compile successfully
```

**Owner**: Tech Lead / DevOps  
**Priority**: P0 (Critical)  
**ETA**: 10 minutes

---

### Step 2: Run Dependency Audit ⚠️ HIGH PRIORITY

**Issue**: 1 npm vulnerability found, Angular 7 is EOL

**Quick Check**:
```bash
cd apps/frontend
npm audit                  # View vulnerabilities
npm audit fix              # Attempt automatic fixes
npm audit fix --force      # Force fix (may cause breaking changes)
```

**If Automatic Fix Fails**:
1. Document the vulnerability in SECURITY_REVIEW.md
2. Assess risk (most likely low/medium for Phase 6)
3. Create follow-up task for Angular upgrade

**Owner**: Engineering Lead  
**Priority**: P1 (High)  
**ETA**: 30 minutes

---

### Step 3: Create Pull Request on GitHub

**Branch**: `004-mobile-ui-redesign` → `master`

**PR Title**:
```
Phase 6: Content Discovery Feature - Mobile-First Match Discovery System
```

**PR Description**: Use content from `PR_DESCRIPTION.md`

**Labels**:
- `feature`
- `mobile-ui`
- `phase-6`
- `ready-for-review`

**Reviewers**:
- Engineering Lead
- QA Lead
- DevOps Lead
- Security Engineer (optional)

**Manual Steps** (via GitHub UI or CLI):

**Option A: GitHub Web UI**
1. Go to https://github.com/akshay-waghmare/victoryline-monorepo
2. Click "Pull Requests" → "New Pull Request"
3. Select base: `master`, compare: `004-mobile-ui-redesign`
4. Copy content from `PR_DESCRIPTION.md` into description
5. Add reviewers and labels
6. Click "Create Pull Request"

**Option B: GitHub CLI** (if installed):
```bash
cd d:\victoryline\victoryline-monorepo

# Push branch to origin (if not already pushed)
git push origin 004-mobile-ui-redesign

# Create PR
gh pr create \
  --base master \
  --head 004-mobile-ui-redesign \
  --title "Phase 6: Content Discovery Feature - Mobile-First Match Discovery System" \
  --body-file specs/004-mobile-ui-redesign/PR_DESCRIPTION.md \
  --label feature,mobile-ui,phase-6,ready-for-review \
  --reviewer <engineering-lead-username>,<qa-lead-username>
```

**Owner**: Feature Owner  
**Priority**: P0 (Critical)  
**ETA**: 10 minutes

---

### Step 4: Deploy to Staging Environment

**Prerequisites**:
- Staging environment provisioned
- Database migrations applied (if any)
- Environment variables configured

**Deployment Steps**:

**Option A: Automated CI/CD** (Recommended)
1. Merge PR to `staging` branch (if exists)
2. CI/CD pipeline automatically builds and deploys
3. Monitor pipeline logs for errors

**Option B: Manual Deployment**
```bash
# 1. Build production bundle
cd apps/frontend
ng build --prod --configuration=staging

# 2. Deploy to staging server (example using rsync)
rsync -avz --delete dist/ user@staging-server:/var/www/crickzen-staging/

# 3. Restart web server (example)
ssh user@staging-server "sudo systemctl restart nginx"
```

**Option C: Docker Deployment**
```bash
# 1. Build Docker image
docker build -t crickzen-frontend:staging -f apps/frontend/Dockerfile .

# 2. Push to registry
docker push your-registry.com/crickzen-frontend:staging

# 3. Deploy to staging (Kubernetes example)
kubectl set image deployment/crickzen-frontend \
  crickzen-frontend=your-registry.com/crickzen-frontend:staging \
  -n staging
```

**Verification**:
```bash
# Check deployment status
curl -I https://staging.crickzen.com/

# Verify /discovery route
curl https://staging.crickzen.com/discovery
```

**Owner**: DevOps Lead  
**Priority**: P0 (Critical)  
**ETA**: 30 minutes

---

### Step 5: Execute Staging Smoke Tests

**Manual Testing Checklist**:

**Navigation & Basic Functionality**:
- [ ] Navigate to https://staging.crickzen.com/discovery
- [ ] Page loads without errors (check console)
- [ ] All filters visible (Status, League, Team)
- [ ] Search bar visible and functional
- [ ] Recently Viewed section visible (if history exists)
- [ ] Recommendations section visible

**Filter Functionality**:
- [ ] Click "Live" filter → matches update
- [ ] Click "Upcoming" filter → matches update
- [ ] Click "Completed" filter → matches update
- [ ] Select league filter (e.g., "IPL") → matches update
- [ ] Clear filters → all matches displayed

**Search Functionality**:
- [ ] Type "India" in search → suggestions appear after 300ms
- [ ] Click suggestion → navigates to match details
- [ ] Search with no results → empty state displayed
- [ ] Clear search → filters remain active

**Offline Mode**:
- [ ] Open DevTools → Network tab → Set to "Offline"
- [ ] Reload page → cached data displayed
- [ ] Offline indicator visible
- [ ] Click "Retry" button when back online → data refreshes

**Analytics**:
- [ ] Open DevTools → Console
- [ ] Search for "gtag" or "analytics" logs
- [ ] Verify events firing:
  - `discovery_view`
  - `discovery_search`
  - `discovery_filter`
  - `discovery_click`

**Performance**:
- [ ] Run Lighthouse audit (DevTools → Lighthouse → Mobile)
- [ ] Verify score >90 on Performance
- [ ] Verify LCP <2.5s
- [ ] Verify FID <100ms
- [ ] Verify CLS <0.1

**Accessibility**:
- [ ] Run Lighthouse accessibility audit
- [ ] Verify score >90 on Accessibility
- [ ] Tab through page → logical focus order
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)

**Cross-Browser Testing**:
- [ ] Chrome (latest) - Full functionality
- [ ] Firefox (latest) - Full functionality
- [ ] Safari (latest) - Full functionality (IndexedDB may be limited in private mode)
- [ ] Edge (latest) - Full functionality

**Mobile Device Testing**:
- [ ] iOS Safari (iPhone) - Touch gestures, responsive layout
- [ ] Android Chrome (Samsung/Pixel) - Touch gestures, responsive layout

**Automated E2E Tests**:
```bash
cd apps/frontend

# Run smoke tests
npm run e2e -- --suite=smoke --base-url=https://staging.crickzen.com

# Run full E2E suite
npm run e2e -- --base-url=https://staging.crickzen.com
```

**Pass Criteria**:
- All manual tests pass
- Lighthouse Performance >90
- Lighthouse Accessibility >90
- E2E tests pass (60+ test cases)
- No console errors

**Owner**: QA Lead  
**Priority**: P0 (Critical)  
**ETA**: 2 hours

---

### Step 6: Address Staging Issues (If Any)

**If Issues Found**:
1. Document issue in GitHub issue tracker
2. Prioritize by severity (P0, P1, P2, P3)
3. Fix in `004-mobile-ui-redesign` branch
4. Redeploy to staging
5. Re-run smoke tests
6. Repeat until staging is stable

**Common Issues & Quick Fixes**:

**Issue: API not loading matches**
- Check environment.staging.ts has correct `apiBaseUrl`
- Verify backend API is running on staging
- Check CORS configuration

**Issue: Analytics not tracking**
- Verify Google Analytics tracking ID in environment.staging.ts
- Check `analytics.enabled: true`
- Verify gtag.js script loaded in index.html

**Issue: Service worker not caching**
- Verify ngsw-config.json deployed
- Check service worker registered (DevTools → Application → Service Workers)
- Clear cache and reload

**Issue: Performance below target**
- Run Lighthouse in throttled mode (Simulated Slow 4G)
- Check network waterfall for slow requests
- Verify CDN caching headers

**Owner**: Feature Owner + QA Lead  
**Priority**: P0 (Critical)  
**ETA**: Variable (depends on issues found)

---

### Step 7: Production Deployment (Canary Rollout)

**Prerequisites**:
- Staging tests passed
- PR approved and merged to `master`
- Production environment ready
- Monitoring dashboards configured
- On-call team notified

**Phase 1: Canary 10% (Day 1-2)**

**1. Configure Feature Flag**:
```typescript
// environment.prod.ts
export const environment = {
  production: true,
  features: {
    contentDiscovery: true,
    contentDiscoveryRolloutPercentage: 10  // 10% of users
  },
  analytics: {
    enabled: true,
    trackingId: 'UA-XXXXX-PROD'  // Production GA ID
  }
};
```

**2. Build & Deploy**:
```bash
cd apps/frontend
ng build --prod

# Deploy via your pipeline (example)
# deploy-script.sh production
```

**3. Monitor (24-48 hours)**:
- Error rate: Target <0.5%
- API latency: Target <500ms
- Page load time: Target <2.5s
- User engagement: Track discovery page visits

**4. Success Criteria**:
- [ ] Error rate <0.5%
- [ ] No P0/P1 bugs reported
- [ ] Performance metrics within targets
- [ ] No backend overload

**5. Rollback Trigger**:
- Error rate >1%
- P0 bug discovered
- Backend performance degradation >20%

**Rollback Command** (if needed):
```typescript
// environment.prod.ts
features: {
  contentDiscovery: false  // Disable feature
}
```

---

**Phase 2: Canary 50% (Day 3-5)**

**1. Scale Up**:
```typescript
// environment.prod.ts
features: {
  contentDiscoveryRolloutPercentage: 50  // 50% of users
}
```

**2. Monitor (48-72 hours)**:
- Sustained error rates
- Database query performance
- Cache efficiency
- User behavior patterns

**3. Success Criteria**:
- [ ] Error rate remains <0.5%
- [ ] No new P0/P1 bugs
- [ ] Performance stable under increased load
- [ ] Positive user engagement metrics

**4. Rollback Trigger**:
- Sustained error rate >1%
- Performance degradation >15%
- Critical user complaints

---

**Phase 3: Full Rollout 100% (Day 6-7)**

**1. Enable for All Users**:
```typescript
// environment.prod.ts
features: {
  contentDiscoveryRolloutPercentage: 100  // All users
}
```

**2. Monitor (7+ days)**:
- Long-term stability
- Resource utilization trends
- User adoption rate
- Feature usage patterns

**3. Success Criteria**:
- [ ] Feature stable for 7+ days
- [ ] User adoption >30% within 2 weeks
- [ ] Support tickets <5% of active users
- [ ] Positive sentiment in feedback

---

### Step 8: Post-Deployment Monitoring (24 Hours)

**Monitoring Checklist**:

**Real-Time Operations** (Check every 15 minutes for first 2 hours):
- [ ] Error rate dashboard (target: <0.5%)
- [ ] API latency dashboard (target: <500ms)
- [ ] Request rate (track traffic patterns)
- [ ] Server resource utilization (CPU, memory)

**User Experience** (Check every hour):
- [ ] Google Analytics real-time users
- [ ] Page views for /discovery route
- [ ] Event tracking (search, filter, click)
- [ ] Session duration
- [ ] Bounce rate

**Error Tracking** (Check every 30 minutes):
- [ ] Sentry/Rollbar error count
- [ ] Top 10 error messages
- [ ] Affected users count
- [ ] Browser/device error breakdown

**Performance** (Check every 6 hours):
- [ ] Lighthouse CI automated run
- [ ] Core Web Vitals (LCP, FID, CLS)
- [ ] Time to Interactive
- [ ] Cache hit rates

**Business Metrics** (Check daily):
- [ ] Feature adoption rate
- [ ] Match detail page views (compare to baseline)
- [ ] User retention (D1, D7)
- [ ] Support ticket volume

**Alert Response**:
- **Critical Alert** (Error rate >1%): Investigate immediately, prepare rollback
- **Warning Alert** (Error rate >0.5%): Monitor closely, investigate root cause
- **Info Alert** (Traffic spike): Track patterns, ensure infrastructure scales

**Owner**: DevOps + Engineering Lead  
**Priority**: P0 (Critical)  
**ETA**: Continuous for 24 hours

---

### Step 9: Create Release Tag

**After 24 Hours of Stable Production**:

**1. Create Git Tag**:
```bash
cd d:\victoryline\victoryline-monorepo

# Ensure on master branch
git checkout master
git pull origin master

# Create annotated tag
git tag -a v1.0.0-phase6 -m "Phase 6: Content Discovery Feature

- Smart filtering by match status and league
- Search with autocomplete suggestions
- Personalized recommendations based on viewing history
- Recently viewed matches tracking
- Offline support with IndexedDB and service worker
- Analytics integration with 7 event types
- Rate limiting with exponential backoff
- Comprehensive testing (150+ unit tests, 60+ E2E tests)

See CHANGELOG.md for full details."

# Push tag to origin
git push origin v1.0.0-phase6
```

**2. Create GitHub Release**:

**Option A: GitHub Web UI**
1. Go to https://github.com/akshay-waghmare/victoryline-monorepo/releases
2. Click "Draft a new release"
3. Select tag: `v1.0.0-phase6`
4. Release title: "Phase 6: Content Discovery Feature"
5. Description: Copy from CHANGELOG.md
6. Click "Publish release"

**Option B: GitHub CLI**
```bash
gh release create v1.0.0-phase6 \
  --title "Phase 6: Content Discovery Feature" \
  --notes-file CHANGELOG.md
```

**3. Update Documentation**:
- [ ] Update main README.md with Phase 6 features
- [ ] Update user documentation with /discovery page guide
- [ ] Create FAQ for common questions
- [ ] Record demo video (optional)

**Owner**: Engineering Lead  
**Priority**: P2 (Medium)  
**ETA**: 30 minutes

---

## 📊 Success Metrics (Week 1)

**Track and Report**:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Error Rate | <0.5% | TBD | ⏳ |
| Lighthouse Score | >90 | TBD | ⏳ |
| Feature Adoption | >10% (week 1) | TBD | ⏳ |
| Support Tickets | <20 tickets | TBD | ⏳ |
| User Satisfaction | >4/5 | TBD | ⏳ |
| Match Detail Views | +5% vs baseline | TBD | ⏳ |

**Report to Stakeholders**: [Slack channel / Email]

---

## 🐛 Rollback Procedures

**If Critical Issue Occurs**:

### Option 1: Feature Flag Disable (30 seconds)
```typescript
// environment.prod.ts
features: {
  contentDiscovery: false  // Disable immediately
}
```
Redeploy with CI/CD pipeline.

### Option 2: Gradual Rollback (5 minutes)
```typescript
// Reduce exposure gradually
contentDiscoveryRolloutPercentage: 50 → 25 → 10 → 0
```

### Option 3: Full Deployment Rollback (15 minutes)
```bash
# Revert to previous version
git revert <commit-hash>
ng build --prod
# Deploy via your pipeline
```

**Escalation Path**:
1. On-call engineer → Team lead → Engineering manager → CTO

**Documentation**: See [ROLLOUT_PLAN.md](./ROLLOUT_PLAN.md) for detailed procedures

---

## 📞 Support & Contacts

**On-Call Rotation**:
- Primary: [Name, Phone, Slack]
- Secondary: [Name, Phone, Slack]

**Slack Channels**:
- #004-mobile-ui-redesign (development)
- #releases (deployment updates)
- #alerts (critical issues)
- #support (user issues)

**Documentation**:
- Feature Spec: [spec.md](./spec.md)
- Implementation Plan: [plan.md](./plan.md)
- QA Report: [QA_REPORT.md](./QA_REPORT.md)
- Security Review: [SECURITY_REVIEW.md](./SECURITY_REVIEW.md)
- Rollout Plan: [ROLLOUT_PLAN.md](./ROLLOUT_PLAN.md)

---

## ✅ Final Checklist

**Before Production Deployment**:
- [ ] Linting errors resolved
- [ ] npm audit completed
- [ ] PR created and approved
- [ ] Staging tests passed (Lighthouse >90)
- [ ] Monitoring dashboards configured
- [ ] Feature flags configured
- [ ] On-call team notified
- [ ] Rollback procedures tested
- [ ] Stakeholder communication sent

**After Production Deployment**:
- [ ] 24-hour monitoring complete
- [ ] No critical issues reported
- [ ] Success metrics tracked
- [ ] Release tag created
- [ ] Documentation updated
- [ ] Post-deployment summary sent

---

**Deployment Status**: 🟡 Ready for Staging (pending lint fixes)  
**Next Action**: Fix linting errors, then proceed to Step 3 (Create PR)  
**Owner**: Engineering Team  
**Last Updated**: November 14, 2025
