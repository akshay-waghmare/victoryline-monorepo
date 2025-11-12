# Feature Specification: Live Cricket Updates Blog

**Feature Branch**: `004-live-cricket-blog`  
**Created**: 2025-11-12  
**Status**: Draft  
**Input**: User description: "Live Cricket Updates Blog (Strapi + Angular + Scully) - Integrate a fully SEO-optimized, editor-friendly blog system for live match updates, news, and announcements without rewriting the backend. Support static pre-render for SEO and optional real-time streaming for ball-by-ball commentary."

## Clarifications

### Session 2025-11-12

- Q: How should new content become available on the live site? → A: Incremental + scheduled rebuild - New posts fetch from Strapi API dynamically on first request, then nightly Scully rebuild pre-renders them - Fast publish (1-2 mins), good SEO
- Q: How should Strapi CMS authentication integrate with the existing Spring Boot JWT auth system? → A: Public Strapi, Spring proxy - Strapi API is publicly accessible, Spring Boot middleware validates requests and injects auth context - Simpler but less secure
- Q: Which live match update implementation should be prioritized for initial release? → A: SSE backend only - Build custom SSE endpoint from scratch, no Arena - Full control but delays initial release, more complex
- Q: What content format should be used for blog post body content? → A: Markdown with WYSIWYG preview
- Q: How should uploaded images be optimized for web performance and social sharing? → A: Upload-time processing - Strapi plugin resizes/compresses on upload, generates WebP + multiple sizes, specific 1200x630 for OG - Good performance, reasonable complexity

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public Blog Reading Experience (Priority: P1)

Cricket fans visiting the Crickzen website want to read the latest match updates, news, and announcements in a fast-loading, SEO-optimized format that appears in search results and can be easily shared on social media.

**Why this priority**: Core value proposition - delivers content to end users. Without this, the feature provides no public value. This is the foundation that all other stories build upon.

**Independent Test**: Can be fully tested by publishing a sample blog post via Strapi and verifying it appears on `/blog` list page and `/blog/:slug` detail page with proper SEO meta tags, loads in under 3 seconds, and scores ≥90 on Lighthouse.

**Acceptance Scenarios**:

1. **Given** multiple published blog posts exist, **When** a user navigates to `/blog`, **Then** they see a paginated list of posts with title, excerpt, publish date, and featured image
2. **Given** a blog post with slug "india-vs-australia-recap", **When** a user visits `/blog/india-vs-australia-recap`, **Then** they see the full post content rendered with proper formatting, images, and metadata
3. **Given** a user shares a blog post URL on Twitter, **When** the link is previewed, **Then** Twitter displays the correct Open Graph image, title, and description
4. **Given** a blog post page is accessed, **When** Google's crawler indexes it, **Then** the page includes proper structured data (NewsArticle schema) and SEO meta tags
5. **Given** a user accesses blog pages on mobile, **When** page loads, **Then** content is responsive, readable, and achieves mobile Lighthouse score ≥90

---

### User Story 2 - Content Management Workflow (Priority: P2)

Content editors need to create, draft, edit, and publish blog posts about cricket matches, news, and updates through an intuitive content management interface without requiring developer assistance.

**Why this priority**: Enables content creation independence. Without this, editors cannot produce the content that users consume (P1 dependency).

**Independent Test**: Can be fully tested by logging into Strapi CMS, creating a draft blog post with title, content, SEO fields, and images, editing it, then publishing it, and verifying the published post appears on the public site within the expected timeframe.

**Acceptance Scenarios**:

1. **Given** an editor is logged into Strapi, **When** they create a new blog post, **Then** they can enter title, markdown content with WYSIWYG preview, excerpt, tags, SEO title, SEO description, and upload an OG image
2. **Given** an editor creates a blog post, **When** they save it as DRAFT, **Then** the post is not visible on the public site but remains editable in Strapi
3. **Given** an editor has a draft post, **When** they click "Publish", **Then** the post status changes to PUBLISHED, publishedAt timestamp is set, and the post becomes visible on `/blog` within 2 minutes (initially via dynamic Strapi API fetch, later converted to static during nightly pre-render)
4. **Given** a post title "India's Historic Win", **When** the post is created, **Then** Strapi auto-generates a unique slug "indias-historic-win" that can be manually edited
5. **Given** an editor publishes a post, **When** the publish action completes, **Then** a webhook triggers cache invalidation and sitemap update (full rebuild happens during scheduled nightly job)

---

### User Story 3 - Automated SEO & Discovery (Priority: P2)

The platform automatically ensures all blog content is discoverable by search engines through proper sitemap generation, meta tags, structured data, and search engine notifications.

**Why this priority**: Critical for organic traffic growth and content discoverability. Complements P1 by ensuring content reaches users through search.

**Independent Test**: Can be fully tested by publishing a new blog post, waiting for the automated pipeline to complete, and verifying that sitemap.xml includes the new post URL, Google/Bing receive a sitemap ping, and the post page includes all required SEO elements.

**Acceptance Scenarios**:

1. **Given** a new blog post is published, **When** the CI/CD pipeline runs, **Then** the sitemap.xml file is regenerated to include the new post URL with lastmod timestamp
2. **Given** the sitemap is updated, **When** the deployment completes, **Then** Google and Bing receive automated sitemap ping notifications
3. **Given** any blog post page is rendered, **When** crawled by search engines, **Then** the page includes proper meta tags (title, description, canonical URL, robots), Open Graph tags, Twitter Card tags, and JSON-LD structured data (NewsArticle schema)
4. **Given** blog posts have tags like "IPL", "Test Cricket", "T20", **When** rendered, **Then** tags are included in the structured data and meta keywords
5. **Given** a post is accessed at multiple URLs, **When** rendered, **Then** the canonical URL tag points to the preferred /blog/:slug URL to avoid duplicate content penalties

---

### User Story 4 - Real-Time Live Match Updates (Priority: P3)

During live cricket matches, editors can push ball-by-ball commentary and key events (wickets, boundaries, milestones) that appear in real-time on a live blog page for fans following the match.

**Why this priority**: Enhances engagement during live matches but not essential for basic blog functionality. Can be delivered after core blog features are stable.

**Independent Test**: Can be fully tested by creating a live match page at `/live/:matchId`, connecting to the SSE endpoint, and verifying that editors can push events via POST endpoint that appear instantly on the page without requiring page refresh.

**Acceptance Scenarios**:

1. **Given** a live match is in progress, **When** a user visits `/live/:matchId`, **Then** they see a live blog interface with the latest match events in chronological order streamed via SSE
2. **Given** an editor has ROLE_BLOG_EDITOR permissions, **When** they submit a new event (e.g., "12.4: WICKET! Kohli c Smith b Starc 45(32)") via POST /api/live/matches/:matchId/events, **Then** the event appears on the live page within 2 seconds for all connected users
3. **Given** a user is viewing a live page, **When** new events are pushed, **Then** the page updates automatically via EventSource API without requiring manual refresh
4. **Given** a match concludes, **When** the editor marks it complete, **Then** the live blog content stored in LiveEvent table can be converted to a permanent blog post with slug `/blog/match-recap-:matchId`
5. **Given** multiple users are connected to the same `/live/:matchId` page, **When** an editor pushes a new event, **Then** all connected clients receive the event broadcast simultaneously via SSE

---

### Edge Cases

- What happens when an editor tries to publish a blog post with a slug that already exists? System must reject and prompt for unique slug.
- How does the system handle posts with missing SEO fields? System should use sensible defaults (excerpt for description, title for SEO title).
- What happens if the Strapi webhook fails or CI/CD pipeline errors during sitemap regeneration? System should log errors, retry webhook, and alert DevOps; existing static pages remain accessible.
- How does the system handle blog posts with very long titles (>180 chars)? Strapi enforces field length limits; SEO title and OG title are truncated gracefully.
- What happens when a user tries to access a draft post URL directly? System returns 404 Not Found; only published posts are accessible.
- How does the system handle images that don't meet OG image size requirements (1200x630)? Images are automatically cropped/resized to 1200x630 during upload-time processing by Strapi image optimization plugin, centering the crop by default.
- What happens if two editors publish posts simultaneously? Strapi handles concurrent writes with database transactions; CI/CD queue manages sequential builds.
- How does the system handle deleted posts that are already in the sitemap? CI/CD regeneration removes deleted posts; 404 pages serve proper error messages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a paginated list of published blog posts at `/blog` route with title, excerpt, publish date, featured image, and tags
- **FR-002**: System MUST render individual blog post detail pages at `/blog/:slug` with full content, rich text formatting, images, author info, and metadata
- **FR-003**: System MUST pre-render all blog pages statically using Scully for optimal SEO and load performance
- **FR-004**: System MUST provide a Strapi CMS interface for content editors to create, edit, and manage blog posts
- **FR-005**: System MUST support draft and published status workflow where drafts are not visible publicly
- **FR-006**: System MUST auto-generate unique slugs from blog post titles with manual override capability
- **FR-007**: System MUST validate slug uniqueness and reject duplicate slugs
- **FR-008**: System MUST capture and store SEO metadata fields: seoTitle, seoDescription, ogImage, tags
- **FR-009**: System MUST enforce field length limits (title: 180 chars, seoDescription: 300 chars, slug: 200 chars)
- **FR-010**: System MUST render proper HTML meta tags on every blog page: title, description, canonical URL, robots, Open Graph tags, Twitter Card tags
- **FR-011**: System MUST include JSON-LD structured data (NewsArticle schema) on every blog post detail page
- **FR-012**: System MUST generate and serve a sitemap.xml file at the root domain including all published blog post URLs with lastmod timestamps
- **FR-013**: System MUST trigger sitemap regeneration automatically when blog posts are published or unpublished
- **FR-014**: System MUST send sitemap ping notifications to Google and Bing after sitemap updates
- **FR-015**: System MUST provide a Strapi webhook endpoint that triggers cache invalidation and sitemap update on post publish events
- **FR-016**: System MUST implement hybrid rendering: new/updated posts are fetched dynamically from Strapi API on first request with immediate caching, and a nightly scheduled job runs full Scully pre-render to convert dynamic pages to static
- **FR-016a**: Nightly CI/CD pipeline MUST execute these steps: fetch all published blog posts from Strapi → run ng build --prod → run Scully pre-render → generate sitemap.xml → deploy static files to Nginx → ping search engines
- **FR-016b**: On-demand webhook trigger MUST execute lightweight steps: invalidate Redis cache for affected blog routes → regenerate sitemap.xml → ping search engines (without full Angular rebuild)
- **FR-017**: System MUST support markdown content format with WYSIWYG preview editor in Strapi (e.g., via strapi-plugin-react-md-editor or similar)
- **FR-017a**: Strapi MUST store blog post content as markdown text in the database
- **FR-017b**: Angular blog detail component MUST render markdown content to HTML using a markdown parser library (e.g., marked, markdown-it)
- **FR-017c**: Markdown rendering MUST support standard formatting: headings, bold, italic, links, images, lists, blockquotes, code blocks
- **FR-018**: System MUST allow image uploads and media management in Strapi with automatic URL generation
- **FR-018a**: Strapi MUST implement upload-time image optimization plugin (e.g., strapi-plugin-responsive-image or custom Sharp integration)
- **FR-018b**: On image upload, system MUST automatically generate multiple formats: WebP (preferred) and original format (JPEG/PNG fallback)
- **FR-018c**: On image upload, system MUST automatically generate multiple sizes: thumbnail (150px width), small (500px), medium (1000px), large (1920px), maintaining aspect ratio
- **FR-018d**: For images designated as OG images, system MUST generate a specific 1200x630px crop optimized for social media sharing
- **FR-018e**: Angular blog components MUST serve optimized images using responsive image techniques (srcset, sizes attributes, or <picture> element with WebP preference)
- **FR-019**: System MUST restrict blog post creation, editing, and publishing to users with ROLE_BLOG_EDITOR role validated through Spring Boot proxy middleware
- **FR-019a**: Spring Boot MUST implement proxy endpoints (e.g., /api/strapi/*) that forward requests to Strapi after validating JWT tokens and ROLE_BLOG_EDITOR permissions
- **FR-019b**: Spring Boot proxy MUST inject authenticated user context into Strapi API requests (e.g., via custom headers or Strapi API tokens)
- **FR-019c**: Strapi admin interface MUST be accessed through Spring Boot proxy to enforce consistent authentication and authorization
- **FR-019d**: Direct access to Strapi API endpoints MUST be restricted via network configuration (firewall/security groups) to prevent bypassing Spring Boot auth
- **FR-020**: System MUST provide public read access to all published blog posts without authentication
- **FR-021**: System MUST support pagination on blog list page with configurable page size (default: 10 posts)
- **FR-022**: System MUST implement caching strategy for blog API responses with cache invalidation on publish/unpublish
- **FR-023**: System MUST ensure all blog pages are responsive and mobile-optimized
- **FR-024**: System MUST implement proper error handling for missing posts (404 pages with user-friendly messages)
- **FR-025**: System MUST support live match updates at `/live/:matchId` route via custom Server-Sent Events (SSE) backend implementation
- **FR-025a**: Spring Boot MUST implement SSE endpoint (GET /api/live/matches/:matchId/stream) that maintains persistent connections and streams events to clients
- **FR-025b**: Spring Boot MUST implement event ingestion endpoint (POST /api/live/matches/:matchId/events) for editors to submit live commentary with ROLE_BLOG_EDITOR authorization
- **FR-025c**: SSE implementation MUST support event types: ball, wicket, four, six, info, milestone with structured data (message, over, innings, timestamp)
- **FR-025d**: Angular MUST implement LiveMatchComponent that connects to SSE endpoint using EventSource API and displays events in real-time
- **FR-026**: System MUST provide REST API endpoint for editors to push live match events (POST /api/live/matches/:matchId/events) with ROLE_BLOG_EDITOR authorization
- **FR-027**: System MUST stream live events to connected clients in real-time with latency under 2 seconds
- **FR-028**: System MUST maintain clean URL structure (`/blog/:slug`, no query strings or file extensions)
- **FR-029**: System MUST preserve Angular SPA functionality for non-blog routes
- **FR-030**: System MUST persist live match events in database (LiveEvent table) for historical access and potential blog post conversion after match completion

### Key Entities

- **BlogPost**: Represents a cricket news article, match update, or announcement. Contains title, slug (unique identifier for URL), content (markdown format), excerpt (summary), status (DRAFT or PUBLISHED), publishedAt timestamp, SEO metadata (seoTitle, seoDescription, ogImage), tags (array), creation and update timestamps. Managed through Strapi CMS with markdown editor and WYSIWYG preview.

- **LiveEvent**: Represents a real-time match event for live blog commentary. Contains id (primary key), matchId (reference to match), message (event description), eventType (ball, wicket, four, six, info, milestone), over number, innings number, createdAt timestamp. Persisted in MySQL database via Spring Boot JPA entity. Events are broadcast via SSE to connected clients and stored for historical access and post-match blog conversion.

- **SiteSettings**: Configuration entity for blog system settings. Contains sitemapLastModified timestamp, blogBasePath (default: "/blog"), cache TTL settings, API base URLs. Managed through Strapi or configuration files.

- **SEOMetadata**: Embedded within BlogPost, represents search engine optimization data. Contains canonical URL, robots directives, structured data schema type, social media preview images and descriptions. Auto-generated from post data with manual override capability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Blog list page (`/blog`) loads completely in under 3 seconds on 3G mobile connection with all content visible and interactive
- **SC-002**: Blog post detail pages achieve Lighthouse performance score ≥90 on both desktop and mobile
- **SC-003**: All blog pages pass axe-core accessibility audit with zero critical violations
- **SC-004**: Blog pages achieve Lighthouse SEO score of 100 with all required meta tags, structured data, and semantic HTML
- **SC-005**: Content editors can create, draft, edit, and publish a complete blog post (title, content, images, SEO fields) in under 10 minutes without developer assistance
- **SC-006**: Newly published blog posts appear on public site via dynamic rendering within 2 minutes of publish action, then converted to static pre-rendered pages during nightly rebuild
- **SC-007**: Search engines are notified of sitemap updates within 5 minutes of post publication
- **SC-008**: Blog post pages appear in Google search results within 24 hours of publication with correct title and description
- **SC-009**: Social media shares (Twitter, Facebook) display correct Open Graph preview images and descriptions 100% of the time
- **SC-010**: System handles 10,000 concurrent users viewing blog pages without performance degradation
- **SC-011**: Live match updates appear on `/live/:matchId` pages with latency under 2 seconds from editor submission to user display
- **SC-012**: Zero broken links or 404 errors in generated sitemap.xml file
- **SC-013**: Blog API response time remains under 200ms for cached content (95th percentile)
- **SC-014**: CI/CD pipeline completes full blog deployment (build + pre-render + deploy) in under 15 minutes
- **SC-015**: Blog pages maintain consistent branding and design with existing Crickzen site (visual regression testing passes)

## Assumptions

- **A-001**: Strapi CMS is self-hosted on infrastructure accessible to the development team
- **A-002**: MySQL database is available and configured for Strapi data storage
- **A-003**: GitHub Actions CI/CD pipeline is configured and operational with appropriate secrets and permissions
- **A-004**: Nginx web server is configured to serve static files from the deployment directory
- **A-005**: Domain DNS is configured to route `/blog/*` paths to the Nginx server
- **A-006**: Spring Boot backend handles authentication and authorization for ROLE_BLOG_EDITOR users and proxies requests to Strapi with auth context injection
- **A-007**: Existing Angular 8 application can be upgraded to support Scully static site generation
- **A-008**: Redis is available for caching blog API responses
- **A-009**: Content editors have basic familiarity with content management systems
- **A-010**: Spring Boot backend can support SSE (Server-Sent Events) for real-time live match updates streaming
- **A-011**: Image storage and CDN infrastructure exists for uploaded media files
- **A-012**: Google Search Console and Bing Webmaster Tools are configured for sitemap ping endpoints
- **A-013**: The existing Angular routing structure can accommodate `/blog` and `/live` routes without conflicts
- **A-014**: Legal/compliance team has approved content publication workflow (no additional approval steps required)

## Dependencies

- **D-001**: Strapi CMS must be installed, configured, and accessible before blog post creation can begin
- **D-002**: Scully static site generator must be integrated into Angular project before pre-rendering is possible
- **D-003**: Strapi webhook endpoint must be configured to trigger GitHub Actions workflow
- **D-004**: Spring Boot backend must implement ROLE_BLOG_EDITOR role, JWT authentication, and proxy middleware for Strapi API requests with auth injection
- **D-005**: CI/CD pipeline must have access to Strapi API for fetching blog post data during builds
- **D-006**: Nginx configuration must be updated to serve static pre-rendered files from the correct directory
- **D-007**: Angular router must be configured to handle blog routes and defer to pre-rendered content for SEO
- **D-008**: Image upload and storage solution must be operational in Strapi with upload-time optimization plugin configured (responsive image generation, WebP conversion, OG crop)
- **D-009**: Spring Boot SSE endpoint implementation and LiveEvent entity/repository must be completed before live match updates can function
- **D-010**: Search engine sitemap ping endpoints require valid authentication credentials

## Scope

### In Scope

- Public blog list and detail page display with pagination
- Strapi CMS content management interface for blog posts
- Draft and publish workflow
- SEO meta tags, Open Graph, Twitter Cards, structured data
- Automatic sitemap generation and search engine notifications
- Scully-based static pre-rendering for all blog pages
- Rich text content editing with image uploads
- Responsive mobile design
- Role-based access control for content editors
- CI/CD automation for build, pre-render, and deployment
- Live match updates page with real-time event streaming
- Caching strategy for blog API responses
- Error handling and 404 pages

### Out of Scope

- Comment system (planned for future extension)
- Tag and category filtering pages (planned for future extension)
- RSS feed generation (planned for future extension)
- Multi-language support (planned for future extension via Strapi i18n plugin)
- User-generated content or guest post submissions
- Blog post analytics and view tracking (use external analytics tools)
- Email subscription and newsletter features
- Blog post scheduling for future publication dates
- Version history and content rollback
- A/B testing for blog content
- Related posts recommendations
- Full-text search within blog posts
- Custom domain for blog subdomain
- Integration with external content platforms or syndication
