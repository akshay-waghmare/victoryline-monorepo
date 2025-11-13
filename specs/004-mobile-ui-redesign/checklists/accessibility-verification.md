# T058: Match Details Accessibility Verification Checklist

**Goal**: Verify match details page meets WCAG 2.1 AA standards:
- Sticky header doesn't obscure content
- Tabs are keyboard navigable
- Scorecard/commentary are screen reader friendly
- All interactive elements have proper ARIA labels
- Touch targets ≥44x44px
- Color contrast ≥4.5:1 for text

## Prerequisites

1. Screen reader installed: NVDA (Windows), VoiceOver (Mac/iOS), TalkBack (Android)
2. Chrome DevTools Accessibility inspector enabled
3. axe DevTools extension installed

## Accessibility Tests

### 1. Sticky Header - Content Obscuring

**Issue**: Sticky header may cover content when scrolling or jumping to anchors.

**Steps**:
1. Load match details page
2. Scroll down 250px (sticky header should appear)
3. Click a tab → verify content under sticky header is visible
4. Scroll to top → verify sticky header disappears

**Expected**:
- Sticky header z-index: 10 (below modals, above content)
- Top padding on main content: 0px (sticky header positioned absolutely)
- No content obscured when sticky header active
- Smooth transition (200ms) when appearing/disappearing

**Pass Criteria**: ✅ No content obscured by sticky header

---

### 2. Tabs - Keyboard Navigation

**Steps**:
1. Load match details page
2. Use **Tab** key to focus on tab group
3. Use **Arrow Left/Right** to switch between tabs
4. Press **Enter** to activate focused tab
5. Use **Tab** to navigate within tab content

**Expected Keyboard Behavior**:
- Tab focus visible: 2px blue outline on focused tab
- Arrow keys: Switch between tabs (circular navigation)
- Enter/Space: Activate focused tab
- Tab: Move focus into/out of tab content
- Escape: (if implemented) Close tab group focus

**ARIA Attributes** (check in DevTools):
```html
<mat-tab-group role="tablist" aria-label="Match sections">
  <mat-tab role="tab" aria-selected="true|false" aria-controls="tab-panel-X">
    Tab Label
  </mat-tab>
</mat-tab-group>
<div role="tabpanel" aria-labelledby="tab-X" id="tab-panel-X">
  Tab Content
</div>
```

**Pass Criteria**: ✅ All tabs keyboard navigable with proper ARIA

---

### 3. Scorecard - Screen Reader Friendly

**Steps**:
1. Enable screen reader (NVDA/VoiceOver)
2. Navigate to Scorecard tab
3. Use screen reader commands to explore scorecard

**Mobile Card Layout (<640px)**:
```html
<div class="scorecard-cards" role="list" aria-label="Batting scorecard">
  <app-scorecard-card 
    *ngFor="let player of batting"
    [player]="player"
    [type]="'batting'"
    role="listitem"
    [attr.aria-label]="player.name + ', scored ' + player.runs + ' runs'">
  </app-scorecard-card>
</div>
```

**Expected Announcements** (batting card):
- "Virat Kohli, scored 89 runs off 47 balls, strike rate 189.36, hit 8 fours and 4 sixes"
- "Rohit Sharma, scored 45 runs off 28 balls, caught by Smith, bowled by Starc"

**Desktop Table Layout (≥640px)**:
```html
<table role="table" aria-label="Batting scorecard">
  <thead>
    <tr>
      <th scope="col">Batsman</th>
      <th scope="col">Runs</th>
      <th scope="col">Balls</th>
      ...
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Virat Kohli</td>
      <td>89</td>
      <td>47</td>
      ...
    </tr>
  </tbody>
</table>
```

**Pass Criteria**: ✅ Screen reader announces all player stats correctly

---

### 4. Commentary - Screen Reader Friendly

**Steps**:
1. Enable screen reader
2. Navigate to Live Match tab (commentary section)
3. Use screen reader to read commentary entries

**Expected Structure**:
```html
<div class="commentary-list" role="region" aria-label="Ball-by-ball commentary">
  <div class="commentary-item" 
       role="article" 
       aria-label="Over 19.4, Virat Kohli hit a boundary for 4 runs">
    <div class="commentary-item__header">
      <span class="over-ball-number">19.4</span>
      <span class="commentary-icon" aria-hidden="true">🟢</span>
    </div>
    <div class="commentary-item__body">
      <p class="commentary-text">
        Kohli cuts it past point for a boundary!
      </p>
      <span class="commentary-highlight" role="status">BOUNDARY</span>
    </div>
    <time class="commentary-time" datetime="2025-11-14T15:30:00">
      2 minutes ago
    </time>
  </div>
</div>
```

**Expected Announcements**:
- "Ball-by-ball commentary region"
- "Over 19.4, Virat Kohli hit a boundary for 4 runs"
- "2 minutes ago"
- "BOUNDARY" (status update)

**Pass Criteria**: ✅ Commentary entries fully readable by screen reader

---

### 5. ARIA Labels - All Interactive Elements

**Elements to Check**:

| Element | ARIA Label | Pass/Fail |
|---------|------------|-----------|
| Sticky header | `aria-label="Live match score: India 189/5 vs Australia 156"` | |
| Tab group | `aria-label="Match sections"` | |
| Each tab | `aria-label="Live Match"`, `aria-label="Match Info"` | |
| Load more button | `aria-label="Load more commentary"` | |
| Team logo | `alt="India Logo"` (on <img>) | |
| Live indicator | `aria-label="Match is live"` or `aria-hidden="true"` | |
| Score updates | `aria-live="polite"` (for real-time updates) | |

**Steps**:
1. Open Chrome DevTools → Elements tab
2. Search for each element
3. Verify ARIA attributes present and descriptive

**Pass Criteria**: ✅ All interactive elements have meaningful ARIA labels

---

### 6. Touch Targets ≥44x44px

**Elements to Measure**:

| Element | Expected Size | Actual Size | Pass/Fail |
|---------|---------------|-------------|-----------|
| Tab labels | 48px height | | |
| Load more button | 44px height | | |
| Scorecard player card | 44px min-height | | |
| Commentary item (tap target) | 44px min-height | | |
| Team form result badge | 32x32px (visual only, not interactive) | | |

**Steps**:
1. Open Chrome DevTools → Elements tab
2. Select element → Computed styles
3. Check `height` and `width` (or `min-height`)

**Pass Criteria**: ✅ All touch targets ≥44x44px

---

### 7. Color Contrast ≥4.5:1 for Text

**Text to Check**:

| Element | Foreground | Background | Contrast Ratio | Pass/Fail |
|---------|------------|------------|----------------|-----------|
| Body text (commentary) | #212121 | #ffffff | | |
| Tab labels | #666666 | #ffffff | | |
| Active tab label | #2196F3 | #ffffff | | |
| Team score (sticky header) | #ffffff | #2196F3 | | |
| Commentary timestamp | #757575 | #ffffff | | |

**Steps**:
1. Use Chrome DevTools Color Picker
2. Select text element
3. Check "Contrast ratio" in color picker
4. Verify ratio ≥4.5:1 (AA) or ≥7:1 (AAA)

**Tools**:
- Chrome DevTools: Built-in contrast checker
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

**Pass Criteria**: ✅ All text ≥4.5:1 contrast ratio

---

### 8. Focus Indicators - Visible on All Elements

**Steps**:
1. Use **Tab** key to navigate through page
2. Verify focus indicator visible on each interactive element

**Expected Focus Styles**:
```css
:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

:focus-visible {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}
```

**Elements to Check**:
- Tab labels
- Buttons (Load more, etc.)
- Links (team names, if clickable)
- Scorecard cards (if interactive)

**Pass Criteria**: ✅ Focus indicators visible on all focusable elements

---

### 9. Reduced Motion Support

**Steps**:
1. Open OS accessibility settings
2. Enable "Reduce motion" (Windows: Settings → Ease of Access → Display → Show animations)
3. Reload match details page
4. Verify animations disabled

**Expected Behavior** (with reduced motion enabled):
- Commentary fade-in: disabled (items appear instantly)
- Score pulse: disabled (no scale/color animation)
- Tab transitions: disabled (instant switch, no slide)
- Sticky header: disabled (no slide-in animation)

**CSS Check**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

**Pass Criteria**: ✅ All animations respect prefers-reduced-motion

---

### 10. Screen Reader - Live Updates

**Steps**:
1. Enable screen reader
2. Open live match details page
3. Wait for WebSocket score update
4. Verify screen reader announces update

**Expected ARIA Live Regions**:
```html
<div class="sticky-header__team" aria-live="polite" aria-atomic="true">
  <span class="team-score">189/5</span>
</div>

<div class="commentary-list" aria-live="polite" aria-atomic="false">
  <!-- New commentary entries announced as they arrive -->
</div>
```

**Expected Announcements**:
- "Score updated: India 189/5"
- "New ball: Over 19.4, boundary scored"

**Pass Criteria**: ✅ Screen reader announces live score/commentary updates

---

## Automated Testing Tools

### 1. axe DevTools (Chrome Extension)

**Steps**:
1. Install axe DevTools extension
2. Open match details page
3. Run axe scan
4. Review violations

**Expected**:
- 0 critical violations
- <5 moderate violations (if any)
- All issues documented with fix plan

### 2. Lighthouse Accessibility Audit

**Steps**:
1. Open Chrome DevTools → Lighthouse
2. Select "Accessibility" category
3. Run audit

**Expected Score**: ≥90

### 3. WAVE (Web Accessibility Evaluation Tool)

**Steps**:
1. Install WAVE extension
2. Run WAVE on match details page
3. Check for errors, alerts, features

**Expected**:
- 0 errors
- <10 alerts (warnings)
- All alerts reviewed and documented

---

## Test Results Log

| Date | Tester | Screen Reader | Keyboard Nav | Touch Targets | Color Contrast | axe Score | Pass/Fail |
|------|--------|---------------|--------------|---------------|----------------|-----------|-----------|
| YYYY-MM-DD | Name | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | XX/100 | ✅/❌ |

---

## Known Issues & Fixes

### Issue: Sticky header covers first commentary entry
- **Fix**: Add `scroll-margin-top: 60px` to `.commentary-item:first-child`

### Issue: Tab focus not visible on high contrast mode
- **Fix**: Increase outline width to `3px` and add `outline-color: currentColor`

### Issue: Screen reader announces "clickable" for non-interactive elements
- **Fix**: Remove `cursor: pointer` from `.scorecard-card` if not interactive

---

## Accessibility Compliance Statement

After all tests pass, the match details page will meet:
- ✅ WCAG 2.1 Level AA
- ✅ Section 508 compliance
- ✅ ADA (Americans with Disabilities Act) requirements
- ✅ Mobile accessibility best practices
