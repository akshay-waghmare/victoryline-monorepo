# Mobile Testing Checklist - User Story 3

## Overview
This checklist covers the remaining testing tasks for User Story 3 (Responsive Mobile Experience):
- **T067**: Scroll performance testing (60fps target)
- **T069**: Real device testing
- **T070**: Horizontal scrolling verification

---

## T067: Scroll Performance Testing

### Objective
Verify smooth 60fps scrolling across all pages on mobile devices.

### Tools Required
- Chrome DevTools (Performance tab)
- Real mobile devices (iPhone, Android)
- Lighthouse CI

### Test Procedure

#### 1. Chrome DevTools Performance Profiling

**Setup:**
1. Open Chrome DevTools (F12)
2. Navigate to **Performance** tab
3. Enable **CPU throttling**: 4x slowdown (simulates mid-range mobile)
4. Enable **Network throttling**: Fast 3G
5. Enable **Screenshots** checkbox
6. Set device emulation to iPhone 12 Pro (390x844)

**Recording:**
1. Click **Record** button (⏺)
2. Scroll rapidly through the page for 10 seconds
3. Scroll both up and down
4. Stop recording (⏹)

**Analysis:**
- **FPS meter**: Should stay mostly green (>50fps)
  - ✅ Green: 50-60fps (Excellent)
  - ⚠️ Yellow: 30-50fps (Acceptable)
  - ❌ Red: <30fps (Poor - needs optimization)
- **Frame drops**: Count red bars in timeline (<5% acceptable)
- **Long tasks**: Red bars >50ms indicate blocking JavaScript
- **Layout shifts**: Check for unexpected content movement

**Target Metrics:**
```javascript
{
  "averageFPS": "≥55fps",
  "frameDrops": "<5%",
  "longTasks": "<10 tasks",
  "layoutShifts": "<0.1 CLS",
  "scrollJank": "<100ms total"
}
```

#### 2. Pages to Test

| Page | URL | Pass/Fail | FPS | Notes |
|------|-----|-----------|-----|-------|
| Homepage | `/` | [ ] | ___ | |
| Matches List | `/matches` | [ ] | ___ | |
| Match Detail | `/scorecard/:id` | [ ] | ___ | |
| Teams | `/teams` | [ ] | ___ | |
| Players | `/players` | [ ] | ___ | |

#### 3. Performance Optimization Checklist

**Before testing, verify:**
- [ ] Images use `loading="lazy"` for below-fold content
- [ ] CSS animations use only `transform` and `opacity` (GPU accelerated)
- [ ] No synchronous layout reads in scroll handlers
- [ ] Scroll event listeners use `passive: true` flag
- [ ] IntersectionObserver used for lazy loading (not scroll events)
- [ ] `will-change` property used sparingly (only during animation)
- [ ] No large re-renders triggered during scroll

**Common Performance Issues:**

| Issue | Symptom | Fix |
|-------|---------|-----|
| Janky animations | Stuttering during scroll | Use `transform` instead of `top/left` |
| Layout thrashing | FPS drops, red bars | Batch DOM reads, then DOM writes |
| Heavy JS execution | Long tasks >50ms | Debounce handlers, use `requestAnimationFrame` |
| Image loading shifts | Content jumps | Set explicit width/height, use aspect-ratio |
| Too many elements | Slow initial render | Implement virtual scrolling |

#### 4. Automated Performance Testing

```bash
# Run Lighthouse CI with mobile throttling
cd apps/frontend
npm run lighthouse:mobile

# Expected scores:
# Performance: ≥90
# Accessibility: ≥95
# Best Practices: ≥90
```

---

## T069: Real Device Testing

### Objective
Test responsive layouts and touch interactions on physical devices.

### Test Devices Matrix

#### iOS Devices (Priority: HIGH)

| Device | OS Version | Screen Size | Resolution | Status |
|--------|------------|-------------|-----------|---------|
| iPhone 14 Pro Max | iOS 17+ | 6.7" | 430x932 | [ ] |
| iPhone 14 Pro | iOS 17+ | 6.1" | 393x852 | [ ] |
| iPhone 13 | iOS 16+ | 6.1" | 390x844 | [ ] |
| iPhone 12 Mini | iOS 16+ | 5.4" | 375x812 | [ ] |
| iPhone SE (3rd gen) | iOS 16+ | 4.7" | 375x667 | [ ] |
| iPad Air (5th gen) | iPadOS 16+ | 10.9" | 820x1180 | [ ] |
| iPad Pro 12.9" | iPadOS 16+ | 12.9" | 1024x1366 | [ ] |

#### Android Devices (Priority: HIGH)

| Device | OS Version | Screen Size | Resolution | Status |
|--------|------------|-------------|-----------|---------|
| Samsung Galaxy S23 Ultra | Android 13+ | 6.8" | 412x915 | [ ] |
| Samsung Galaxy S22 | Android 13+ | 6.1" | 360x800 | [ ] |
| Google Pixel 7 Pro | Android 13+ | 6.7" | 412x892 | [ ] |
| Google Pixel 6a | Android 13+ | 6.1" | 360x780 | [ ] |
| OnePlus 10 Pro | Android 13+ | 6.7" | 412x919 | [ ] |
| Samsung Galaxy Tab S8 | Android 13+ | 11" | 800x1280 | [ ] |

### Test Scenarios (per device)

#### 1. Layout Responsiveness

- [ ] **Homepage** renders correctly without layout breaks
- [ ] **Match cards** display in correct grid:
  - Mobile (<768px): 1 column
  - Tablet (768-1024px): 2 columns
  - Desktop (>1024px): 3 columns
- [ ] **Navbar** collapses to hamburger menu on mobile
- [ ] **Text** is readable (no truncation, proper line breaks)
- [ ] **Images** scale proportionally without distortion
- [ ] **Spacing** is consistent (8px grid system)
- [ ] **Buttons** and interactive elements are not too small

#### 2. Touch Interactions

- [ ] All buttons are **44x44px minimum** (tap target size)
- [ ] Tap targets **don't overlap** or cause misclicks
- [ ] **Swipe gestures** work on match cards (if implemented)
- [ ] **Pull-to-refresh** works (if implemented)
- [ ] **Modal dismiss** gestures work
- [ ] **Double-tap zoom** is disabled where appropriate
- [ ] **Touch feedback** is visible (ripple effects, highlights)
- [ ] **Long press** doesn't cause unwanted context menus

#### 3. iOS Safe Area Insets (Notched Devices Only)

- [ ] **Navbar** doesn't overlap with notch/Dynamic Island
- [ ] **Banner** doesn't overlap with home indicator
- [ ] **Mobile nav drawer** respects safe areas
- [ ] **Fixed elements** have proper spacing from edges
- [ ] **Landscape orientation** still respects safe areas

#### 4. Scroll Performance

- [ ] **Smooth scrolling** at 60fps (no stuttering)
- [ ] **Match cards** animate in smoothly
- [ ] **Infinite scroll** loads more content without lag
- [ ] **Back button** returns to previous scroll position
- [ ] **Scroll-to-top** button works smoothly

#### 5. Theme Switching

- [ ] Theme toggle button works
- [ ] Dark/light mode transitions smoothly
- [ ] All text remains readable in both themes
- [ ] Images/icons adapt to theme (if applicable)
- [ ] Theme preference persists across page reloads

#### 6. Network Conditions

Test on various network speeds:

- [ ] **4G LTE**: All content loads within 3 seconds
- [ ] **3G**: Skeleton loaders appear, content loads within 5 seconds
- [ ] **2G/Offline**: Appropriate error messages shown

#### 7. Orientation Changes

- [ ] **Portrait → Landscape**: Layout adapts without breaking
- [ ] **Landscape → Portrait**: No content cut off
- [ ] **Auto-rotate**: Smooth transition without flash

### Testing Procedure (per device)

1. **Clear cache** and open app in mobile browser (Safari/Chrome)
2. **Navigate** to all major pages:
   - Homepage
   - Matches list
   - Match detail/scorecard
   - Teams
   - Players
3. **Test interactions**:
   - Tap all buttons
   - Swipe through carousels (if any)
   - Toggle theme
   - Open/close mobile menu
4. **Test scroll**:
   - Scroll rapidly up and down
   - Check for stuttering or lag
5. **Test edge cases**:
   - Rotate device
   - Switch to slow network
   - Background/foreground app
6. **Document issues**:
   - Screenshot any layout breaks
   - Note performance problems
   - Record device/OS/browser version

### Results Template

```markdown
## Device: [iPhone 14 Pro / Galaxy S22 / etc.]
**OS**: iOS 17.1 / Android 13
**Browser**: Safari 17 / Chrome 119
**Screen**: 390x844 / 360x800
**Test Date**: 2025-11-07

### Layout Responsiveness
- ✅ Homepage grid: 1 column, proper spacing
- ⚠️ Match cards: Minor text truncation on long team names
- ✅ Navbar: Hamburger menu works

### Touch Interactions
- ✅ All buttons meet 44x44px minimum
- ❌ Theme toggle overlaps with hamburger on iPhone SE
- ✅ Swipe gestures responsive

### Performance
- ✅ Smooth 60fps scrolling
- ⚠️ Slight lag when loading 50+ match cards

### Issues Found
1. **Theme toggle overlap** - Fix: Adjust spacing in navbar.component.css
2. **Text truncation** - Fix: Use text-overflow: ellipsis with tooltip

### Overall Status
✅ PASS / ⚠️ PASS WITH MINOR ISSUES / ❌ FAIL
```

---

## T070: Horizontal Scrolling Verification

### Objective
Ensure no horizontal scrolling occurs at any viewport width (320px to 2560px).

### Test Viewports

| Width | Device Type | Status |
|-------|-------------|--------|
| 320px | iPhone SE | [ ] |
| 360px | Galaxy S22 | [ ] |
| 375px | iPhone 12 Mini | [ ] |
| 390px | iPhone 14 Pro | [ ] |
| 412px | Pixel 7 | [ ] |
| 768px | iPad Portrait | [ ] |
| 820px | iPad Air | [ ] |
| 1024px | iPad Landscape | [ ] |
| 1280px | Laptop | [ ] |
| 1440px | Desktop | [ ] |
| 1920px | Full HD | [ ] |
| 2560px | 2K Display | [ ] |

### Test Procedure

#### Method 1: Chrome DevTools

1. Open Chrome DevTools (F12)
2. Enable **Device Toolbar** (Ctrl+Shift+M)
3. Set **Responsive** mode
4. Enter test width (e.g., 320px)
5. Open **Console**
6. Run this script:

```javascript
// Check for horizontal scrollbar
const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
console.log(`Width: ${document.documentElement.clientWidth}px`);
console.log(`Has horizontal scroll: ${hasHorizontalScroll}`);
console.log(`ScrollWidth: ${document.documentElement.scrollWidth}px`);
console.log(`ClientWidth: ${document.documentElement.clientWidth}px`);

// Find elements causing overflow
if (hasHorizontalScroll) {
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    if (el.scrollWidth > document.documentElement.clientWidth) {
      console.warn('Overflowing element:', el, `Width: ${el.scrollWidth}px`);
    }
  });
}
```

7. **Visual inspection**: Try to scroll horizontally
   - ✅ PASS: No scrollbar, no content cut off
   - ❌ FAIL: Horizontal scrollbar appears or content is cut off

#### Method 2: Automated Test

Create a test file `e2e/responsive.spec.ts`:

```typescript
describe('Responsive Design - No Horizontal Scroll', () => {
  const viewports = [320, 360, 375, 390, 412, 768, 820, 1024, 1280, 1440, 1920, 2560];
  
  viewports.forEach(width => {
    it(`should not have horizontal scroll at ${width}px width`, () => {
      cy.viewport(width, 844);
      cy.visit('/');
      
      cy.document().then(doc => {
        const hasHorizontalScroll = doc.documentElement.scrollWidth > doc.documentElement.clientWidth;
        expect(hasHorizontalScroll, `No horizontal scroll at ${width}px`).to.be.false;
      });
    });
  });
});
```

### Common Causes of Horizontal Scrolling

| Issue | Cause | Fix |
|-------|-------|-----|
| Fixed width elements | `width: 500px` on small screens | Use `max-width: 100%` or `width: min(500px, 100%)` |
| Large images | Images wider than viewport | Add `max-width: 100%; height: auto;` |
| Negative margins | `margin-left: -20px` without container | Use proper padding/margin on parent |
| Padding on 100% width | `.container { width: 100%; padding: 20px; }` | Use `box-sizing: border-box` |
| Fixed positioning | `left: 0; right: 0; width: 110%;` | Ensure `width` fits between `left` and `right` |
| Text overflow | Long words like URLs | Use `word-break: break-word; overflow-wrap: break-word;` |
| CSS Grid | Fixed column widths `grid-template-columns: 300px 300px` | Use `minmax(0, 1fr)` or `repeat(auto-fit, minmax(250px, 1fr))` |

### Pages to Check

For each viewport width, test these pages:

- [ ] **Homepage** (`/`)
- [ ] **Matches List** (`/matches`)
- [ ] **Match Detail** (`/scorecard/:id`)
- [ ] **Teams** (`/teams`)
- [ ] **Players** (`/players`)
- [ ] **Login** (`/login`)
- [ ] **Dashboard** (`/dashboard`)

### Debugging Overflows

If horizontal scrolling detected:

1. **Add red border** to all elements:
   ```css
   * { outline: 1px solid red; }
   ```

2. **Use Chrome DevTools**:
   - Right-click → Inspect
   - Click "Computed" tab
   - Check element's total width including margins

3. **Binary search**:
   - Hide half the elements (`display: none`)
   - If overflow gone, the issue is in that half
   - Repeat until you find the culprit

4. **Check specific properties**:
   ```javascript
   // Find all elements with fixed width
   document.querySelectorAll('*').forEach(el => {
     const style = window.getComputedStyle(el);
     if (style.width && style.width.includes('px') && parseFloat(style.width) > window.innerWidth) {
       console.warn('Fixed width element:', el, style.width);
     }
   });
   ```

---

## Status Summary

### T067: Scroll Performance Testing
- **Status**: ⏳ Pending manual testing
- **Blocker**: Requires Chrome DevTools profiling + real device testing
- **Time Estimate**: 2-3 hours
- **Dependencies**: None (can start immediately)

### T069: Real Device Testing
- **Status**: ⏳ Pending device access
- **Blocker**: Requires physical iOS/Android devices
- **Time Estimate**: 4-6 hours (all devices)
- **Dependencies**: None (can start immediately)
- **Alternative**: Use BrowserStack or Sauce Labs for cloud device testing

### T070: Horizontal Scrolling Verification
- **Status**: ⏳ Pending automated test setup
- **Blocker**: Requires Cypress/Playwright E2E tests (or manual testing)
- **Time Estimate**: 1-2 hours
- **Dependencies**: None (can start immediately)

---

## Next Actions

1. **Start T067** (Scroll Performance):
   - Open Chrome DevTools
   - Enable CPU throttling (4x slowdown)
   - Profile scroll performance on homepage
   - Document FPS measurements

2. **Start T070** (Horizontal Scroll):
   - Test at 320px, 768px, 1440px viewports
   - Run overflow detection script
   - Fix any issues found

3. **Schedule T069** (Real Devices):
   - Book time with QA team for device testing
   - Or sign up for BrowserStack trial
   - Or test on personal devices (iPhone, Android)

---

## Sign-off

Once all three tasks are completed:

- [ ] T067: Performance profiling shows ≥55fps average
- [ ] T069: All critical devices tested (at least 3 iOS + 3 Android)
- [ ] T070: No horizontal scrolling at any viewport width

**User Story 3 Status**: ✅ COMPLETE

**Next Phase**: Proceed to Phase 6 - User Story 4 (Navigation & Homepage Redesign)
