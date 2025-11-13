# T057: Match Details Performance Verification Checklist

**Goal**: Verify match details page meets mobile performance targets:
- Lighthouse mobile score >90
- LCP (Largest Contentful Paint) <2.5s
- FID (First Input Delay) <100ms
- Tab switch <200ms
- Bundle size <2MB total

## Prerequisites

1. Production build: `npm run build -- --prod`
2. Serve production build: `http-server dist/id-card-app -p 4200`
3. Chrome DevTools open with throttling enabled

## Performance Metrics to Verify

### 1. Lighthouse Mobile Score >90

**Steps**:
1. Open Chrome DevTools → Lighthouse tab
2. Select "Mobile" device
3. Enable "Simulated throttling" (4x CPU slowdown, Fast 3G network)
4. Run audit on `/cric-live/[any-match-path]`

**Expected**:
- Performance: >90
- Accessibility: >90
- Best Practices: >85
- SEO: >85

**Pass Criteria**: Performance score ≥90

---

### 2. LCP (Largest Contentful Paint) <2.5s

**Steps**:
1. Chrome DevTools → Performance tab
2. Network: Fast 3G, CPU: 4x slowdown
3. Record page load
4. Check "Timings" section for LCP marker

**Expected LCP Elements**:
- StickyHeaderComponent (when visible)
- First commentary entry
- Team comparison header

**Pass Criteria**: LCP ≤2.5s on Fast 3G

---

### 3. FID (First Input Delay) <100ms

**Steps**:
1. Load match details page
2. Immediately tap/click on tab (within 5s of page load)
3. Measure delay between tap and response

**Test Cases**:
- Tap "Match Info" tab → tab should switch <100ms
- Tap "Load More" in commentary → spinner appears <100ms
- Tap team name → no delay in visual feedback

**Pass Criteria**: All interactions respond <100ms

---

### 4. Tab Switch Performance <200ms

**Steps**:
1. Load match details page (any match)
2. Open Chrome DevTools → Performance tab
3. Start recording
4. Click through all 4 tabs: Live Match → Match Info → Scorecard → Lineups
5. Stop recording

**Measurements** (for each tab switch):
- Animation duration: should be ≤200ms
- Frame rate: should be 60fps (no dropped frames)
- Main thread work: <50ms per tab switch

**Pass Criteria**: Each tab switch completes <200ms with 60fps

---

### 5. Bundle Size <2MB Total

**Steps**:
1. Build production: `npm run build -- --prod`
2. Check `dist/id-card-app/` folder
3. Run: `Get-ChildItem dist/id-card-app -Recurse -File | Measure-Object -Property Length -Sum`

**Expected Bundle Breakdown**:
- `main.[hash].js`: <800KB (gzipped <250KB)
- `polyfills.[hash].js`: <150KB (gzipped <50KB)
- `runtime.[hash].js`: <10KB (gzipped <5KB)
- `styles.[hash].css`: <100KB (gzipped <20KB)
- **Total**: <2MB uncompressed, <500KB gzipped

**Pass Criteria**: Total bundle size ≤2MB uncompressed

---

## Mobile-Specific Performance Tests

### 6. Image Lazy Loading Performance

**Steps**:
1. Open match details page
2. DevTools → Network tab, filter by "Img"
3. Scroll slowly through page
4. Verify images load 200px before entering viewport

**Expected**:
- Team logos load only when near viewport
- No images load on initial page load (except visible ones)
- Intersection Observer working (check console for warnings)

**Pass Criteria**: Images lazy load with 200px buffer

---

### 7. Real-Time Update Performance

**Steps**:
1. Load live match details page
2. Open DevTools → Performance monitor
3. Watch for WebSocket score updates
4. Measure CPU/memory during updates

**Expected**:
- Score pulse animation: 200-500ms, no janking
- Commentary fade-in: 300ms smooth
- No layout thrashing (reflow/repaint <16ms)
- Memory stable (no leaks over 5 minutes)

**Pass Criteria**: Updates smooth at 60fps, no memory leaks

---

### 8. Scroll Performance (60fps)

**Steps**:
1. Load match details page with commentary
2. DevTools → Performance tab → Enable "Screenshots"
3. Record while scrolling through commentary
4. Analyze frame rate in timeline

**Expected**:
- Scrolling: 60fps (16.67ms per frame)
- No long tasks >50ms during scroll
- Sticky header: smooth transition, no jank

**Pass Criteria**: Scrolling maintains 60fps

---

## Optimization Recommendations

### If Performance Score <90:
1. **Reduce JavaScript bundle**:
   - Enable tree-shaking: `"optimization": true` in angular.json
   - Lazy load routes: Convert eager to lazy modules
   - Remove unused dependencies

2. **Optimize images**:
   - Compress team logos with imagemin
   - Use WebP format with JPEG fallback
   - Reduce image dimensions (40x40 max for team logos)

3. **Improve LCP**:
   - Inline critical CSS in index.html
   - Preload key resources: `<link rel="preload">`
   - Server-side render above-the-fold content

4. **Reduce FID**:
   - Code-split heavy components
   - Defer non-critical JavaScript
   - Use web workers for heavy computations

### If Bundle Size >2MB:
1. Analyze with webpack-bundle-analyzer
2. Remove duplicate dependencies
3. Use dynamic imports for large libraries
4. Enable gzip/brotli compression on server

---

## Test Results Log

| Date | Tester | Lighthouse | LCP | FID | Tab Switch | Bundle Size | Pass/Fail |
|------|--------|------------|-----|-----|------------|-------------|-----------|
| YYYY-MM-DD | Name | XX | X.Xs | XXms | XXXms | X.XMB | ✅/❌ |

---

## Notes

- Test on multiple devices: iPhone SE, Samsung Galaxy S21, Pixel 5
- Test on different networks: Fast 3G, Slow 3G, 4G
- Test during peak hours (live match with high WebSocket traffic)
- Document any performance regressions with screenshots
