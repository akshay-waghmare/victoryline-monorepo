# Quickstart: Match Page Title SEO Optimization

**Feature**: 008-match-title-seo  
**Target Audience**: Developers implementing this feature  
**Time to Complete**: 12-18 hours (across 2 weeks)

## Prerequisites

- [ ] Feature 003 (SEO Optimization) deployed (SSR infrastructure exists)
- [ ] Backend API `/api/matches/{id}` returning team names and status
- [ ] Google Cloud Project with Search Console API enabled
- [ ] Access to Google Search Console for victoryline.live domain
- [ ] Node.js 16+ and Java 8/11+ installed locally

---

## Phase 1A: Dynamic Titles (Ship Immediately) ⚡

**Goal**: Get team-based titles visible in search results ASAP  
**Time**: 4-6 hours  
**Deploy**: Same day

### Step 1: Update SSR Server (Frontend)

**File**: `apps/frontend/server.ts`

1. Add match data fetching function at the top of the file:

```typescript
async function fetchMatchData(matchId: string): Promise<{
  homeTeam: string;
  awayTeam: string;
  status: 'live' | 'scheduled' | 'completed' | 'abandoned';
}> {
  try {
    const response = await fetch(`http://backend-service:8080/api/matches/${matchId}`, {
      timeout: 200 // 200ms timeout
    });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    return {
      homeTeam: data.homeTeam || 'TBD',
      awayTeam: data.awayTeam || 'TBD',
      status: data.status || 'scheduled'
    };
  } catch (error) {
    console.error('[SSR] Failed to fetch match data:', error);
    return { homeTeam: 'TBD', awayTeam: 'TBD', status: 'scheduled' };
  }
}
```

2. Add title generation helper:

```typescript
function generateMatchTitle(homeTeam: string, awayTeam: string, status: string): string {
  const teams = `${homeTeam} vs ${awayTeam}`;
  let suffix: string;
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'finished':
      suffix = ' Final Score | Full Scorecard';
      break;
    case 'abandoned':
    case 'cancelled':
      suffix = ' Match Scorecard';
      break;
    default:
      suffix = ' Live Score Ball by Ball';
  }
  
  const fullTitle = teams + suffix;
  
  // Truncate if >60 chars
  if (fullTitle.length > 60) {
    const maxTeamsLength = 60 - suffix.length - 3;
    const truncated = teams.substring(0, maxTeamsLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...' + suffix;
  }
  
  return fullTitle;
}

function generateMatchDescription(homeTeam: string, awayTeam: string, status: string): string {
  const teams = `${homeTeam} vs ${awayTeam}`;
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'finished':
      return `${teams} final score, full scorecard, match summary, and highlights on VictoryLine.`;
    case 'abandoned':
    case 'cancelled':
      return `${teams} match scorecard and status updates on VictoryLine.`;
    default:
      return `${teams} live score, ball by ball commentary, latest runs, wickets, overs, and match updates.`;
  }
}
```

3. Update `/cric-live/:id` route (around line 111):

```typescript
app.get('/cric-live/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const match = await fetchMatchData(id); // ✨ NEW
    
    const title = generateMatchTitle(match.homeTeam, match.awayTeam, match.status); // ✨ FIXED
    const description = generateMatchDescription(match.homeTeam, match.awayTeam, match.status); // ✨ FIXED
    
    // ... rest of existing code (canonical, OG tags, etc.)
    const html = `<!doctype html>
    <html lang="en">
      <head>
        <title>${title}</title>
        <meta name="description" content="${description}"/>
        <!-- ... rest of meta tags -->
      </head>
      <body><!-- ... --></body>
    </html>`;
    
    res.send(html);
  } catch (error) {
    next(error);
  }
});
```

4. **Test locally**:
```bash
cd apps/frontend
npm run serve:ssr  # or your SSR start command

# In another terminal:
curl http://localhost:4000/cric-live/test-match | grep -o '<title>.*</title>'
# Expected: <title>Team A vs Team B Live Score Ball by Ball</title>
```

5. **Deploy** to production:
```bash
git add apps/frontend/server.ts
git commit -m "feat: dynamic team-based titles for match pages (FR-001, FR-013, FR-014)"
git push origin 008-match-title-seo
# Deploy via CI/CD or manual deployment
```

---

### Step 2: Validate Deployment (Go/No-Go Checklist)

After deployment, run these checks:

**Must-Have Validations**:
```bash
# 1. SSR title shows team names
curl https://victoryline.live/cric-live/YOUR_MATCH_ID | grep -o '<title>.*</title>'

# 2. Meta description includes teams
curl https://victoryline.live/cric-live/YOUR_MATCH_ID | grep -o '<meta name="description".*>'

# 3. OG tags present
curl https://victoryline.live/cric-live/YOUR_MATCH_ID | grep 'og:title'

# 4. Canonical present
curl https://victoryline.live/cric-live/YOUR_MATCH_ID | grep 'canonical'
```

**Social Media Test**:
- Share URL on WhatsApp/Twitter
- Verify preview shows team names in title

**If all checks pass**: ✅ Phase 1A complete!

---

## Phase 1B: GSC Automation (Week 1-2) 🤖

**Goal**: Automate sitemap submission to Google  
**Time**: 4-6 hours

### Step 1: Google Cloud Setup

1. **Create/Access Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing "VictoryLine" project

2. **Enable Search Console API**:
   ```
   APIs & Services → Enable APIs and Services → Search for "Search Console API" → Enable
   ```

3. **Create Service Account**:
   ```
   IAM & Admin → Service Accounts → Create Service Account
   - Name: "victoryline-seo-bot"
   - Role: "Service Account User"
   - Create Key → JSON → Download JSON file
   ```

4. **Add to Search Console**:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Select victoryline.live property
   - Settings → Users and permissions → Add user
   - Add service account email (from JSON file) with "Owner" permission

5. **Store credentials**:
   ```bash
   # Save JSON file as:
   cp ~/Downloads/victoryline-seo-bot-xxx.json apps/backend/spring-security-jwt/src/main/resources/gsc-service-account.json
   
   # Add to .gitignore
   echo "src/main/resources/gsc-service-account.json" >> apps/backend/spring-security-jwt/.gitignore
   ```

---

### Step 2: Add Maven Dependency (Backend)

**File**: `apps/backend/spring-security-jwt/pom.xml`

Add inside `<dependencies>`:
```xml
<dependency>
  <groupId>com.google.apis</groupId>
  <artifactId>google-api-services-searchconsole</artifactId>
  <version>v1-rev20230920-2.0.0</version>
</dependency>
<dependency>
  <groupId>com.google.api-client</groupId>
  <artifactId>google-api-client</artifactId>
  <version>1.34.1</version>
</dependency>
```

Run: `mvn clean install`

---

### Step 3: Create GoogleSearchConsoleService

**File**: `apps/backend/spring-security-jwt/src/main/java/com/devglan/service/seo/GoogleSearchConsoleService.java`

```java
package com.devglan.service.seo;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.searchconsole.v1.SearchConsole;
import com.google.api.services.searchconsole.v1.SearchConsoleScopes;
import com.google.api.services.searchconsole.v1.model.UrlNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Service
public class GoogleSearchConsoleService {
    private static final Logger logger = LoggerFactory.getLogger(GoogleSearchConsoleService.class);
    private static final String CREDENTIALS_PATH = "src/main/resources/gsc-service-account.json";
    private static final String APPLICATION_NAME = "VictoryLine-SEO";
    
    private SearchConsole searchConsole;
    
    @PostConstruct
    public void initialize() throws IOException, GeneralSecurityException {
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        JsonFactory jsonFactory = JacksonFactory.getDefaultInstance();
        
        GoogleCredential credential = GoogleCredential
            .fromStream(new FileInputStream(CREDENTIALS_PATH))
            .createScoped(Collections.singleton(SearchConsoleScopes.WEBMASTERS));
        
        searchConsole = new SearchConsole.Builder(httpTransport, jsonFactory, credential)
            .setApplicationName(APPLICATION_NAME)
            .build();
        
        logger.info("[GSC] Service initialized successfully");
    }
    
    public void submitSitemap(String sitemapUrl) {
        try {
            UrlNotification notification = new UrlNotification()
                .setUrl(sitemapUrl)
                .setType("URL_UPDATED");
            
            searchConsole.urlNotifications().publish(notification).execute();
            logger.info("[GSC] Sitemap submitted successfully: {}", sitemapUrl);
        } catch (IOException e) {
            logger.error("[GSC] Failed to submit sitemap: {}", sitemapUrl, e);
        }
    }
}
```

---

### Step 4: Create Scheduled Job

**File**: `apps/backend/spring-security-jwt/src/main/java/com/devglan/scheduler/SitemapScheduler.java`

```java
package com.devglan.scheduler;

import com.devglan.service.seo.GoogleSearchConsoleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SitemapScheduler {
    private static final Logger logger = LoggerFactory.getLogger(SitemapScheduler.class);
    private static final String SITEMAP_URL = "https://victoryline.live/sitemap.xml";
    
    @Autowired
    private GoogleSearchConsoleService gscService;
    
    // Run daily at 3:00 AM
    @Scheduled(cron = "0 0 3 * * *")
    public void submitSitemapDaily() {
        logger.info("[Scheduler] Starting daily sitemap submission");
        gscService.submitSitemap(SITEMAP_URL);
        logger.info("[Scheduler] Daily sitemap submission complete");
    }
}
```

**Enable Scheduling** (if not already):
Add `@EnableScheduling` to your main application class:
```java
@SpringBootApplication
@EnableScheduling  // Add this
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

---

### Step 5: Test & Deploy

**Test locally**:
```bash
cd apps/backend/spring-security-jwt
mvn test  # Run unit tests (add tests first)

# Manual test (trigger job immediately):
# Add this method to SitemapScheduler for testing:
@GetMapping("/api/internal/trigger-sitemap-submit")
public String triggerManual() {
    submitSitemapDaily();
    return "Sitemap submitted";
}

# Then:
curl http://localhost:8080/api/internal/trigger-sitemap-submit
# Check logs for "[GSC] Sitemap submitted successfully"
```

**Deploy**:
```bash
git add apps/backend/spring-security-jwt/
git commit -m "feat: automated daily sitemap submission to GSC (FR-009)"
git push origin 008-match-title-seo
```

**Verify in Production**:
1. Check logs after 3:00 AM next day for "[Scheduler] Daily sitemap submission complete"
2. Go to Google Search Console → Sitemaps → Should see last submission timestamp updated

---

## Phase 2: Client-Side Updates (Week 2) ✨

**Goal**: Update titles during SPA navigation  
**Time**: 2-3 hours

### Update Angular Components

**File**: `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`

```typescript
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

export class CricketOddsComponent implements OnInit {
  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    // ... existing services
  ) {}
  
  ngOnInit() {
    this.route.params.subscribe(params => {
      const matchId = params['path'];
      
      // Fetch match data (reuse existing service)
      this.matchService.getMatchDetails(matchId).subscribe(match => {
        const title = `${match.homeTeam} vs ${match.awayTeam} Live Score Ball by Ball`;
        this.titleService.setTitle(title);
      });
    });
  }
}
```

**Test**:
1. Navigate from homepage to match page
2. Check browser tab title updates immediately
3. Navigate to different match
4. Verify title updates again

---

## Troubleshooting

### Issue: SSR shows "TBD vs TBD"
**Cause**: Backend API not returning team names  
**Fix**: Check `/api/matches/{id}` response format:
```bash
curl http://backend-service:8080/api/matches/YOUR_ID | jq '.homeTeam, .awayTeam'
```

### Issue: GSC API 403 Forbidden
**Cause**: Service account not added to Search Console  
**Fix**: Add service account email to GSC → Settings → Users

### Issue: Title not updating on navigation
**Cause**: Title service not wired up  
**Fix**: Ensure `Title` service is injected and `setTitle()` called in route subscription

---

## Success Metrics

After full deployment, you should see:

- [ ] 30+ match page URLs in Google Search Console within 7 days
- [ ] Click-through rate ≥2% for match-specific queries within 14 days
- [ ] Social media shares show team names in preview
- [ ] Browser tab titles update on SPA navigation
- [ ] Zero duplicate URL errors in GSC Coverage report

---

## Next Steps

After this feature is complete:
1. Monitor GSC for 7 days, check indexing progress
2. Run `/speckit.tasks` to break down implementation into detailed subtasks
3. Track CTR improvements in Google Analytics
4. Consider adding schema.org rich results testing

---

## References

- [spec.md](./spec.md) - Full feature specification
- [IMPLEMENTATION_GAP_ANALYSIS.md](./IMPLEMENTATION_GAP_ANALYSIS.md) - What's already done vs what's needed
- [research.md](./research.md) - Technology choices and best practices
- [Go/No-Go Checklist](./IMPLEMENTATION_GAP_ANALYSIS.md#-gono-go-deployment-checklist) - Production readiness gate
