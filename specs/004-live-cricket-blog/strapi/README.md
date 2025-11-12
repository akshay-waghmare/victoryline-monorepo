# Strapi CMS Setup & Editor Workflow

This guide walks through setting up Strapi CMS for the Crickzen blog and the editorial workflow for creating and publishing content.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Content Type Configuration](#content-type-configuration)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Editorial Workflow](#editorial-workflow)
5. [Publishing Process](#publishing-process)
6. [Webhooks Configuration](#webhooks-configuration)
7. [Backup & Restore](#backup--restore)

---

## Initial Setup

### Prerequisites

- Node.js 18+ and npm
- MySQL database running (or PostgreSQL/SQLite)
- Git repository access

### Installation

```bash
# Navigate to the project root
cd /home/nirmal-valvi/Project/victoryline-monorepo

# Create Strapi CMS directory
mkdir -p apps/strapi-cms
cd apps/strapi-cms

# Create new Strapi project
npx create-strapi-app@latest . --quickstart

# Or with MySQL (recommended for production)
npx create-strapi-app@latest . \
  --dbclient=mysql \
  --dbhost=localhost \
  --dbport=3306 \
  --dbname=crickzen_blog \
  --dbusername=root \
  --dbpassword=yourpassword
```

### Environment Configuration

Create `.env` file in `apps/strapi-cms/`:

```env
# Server
HOST=0.0.0.0
PORT=1337
APP_KEYS=YOUR_APP_KEYS_HERE
API_TOKEN_SALT=YOUR_API_TOKEN_SALT
ADMIN_JWT_SECRET=YOUR_ADMIN_JWT_SECRET
TRANSFER_TOKEN_SALT=YOUR_TRANSFER_TOKEN_SALT
JWT_SECRET=YOUR_JWT_SECRET

# Database
DATABASE_CLIENT=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=crickzen_blog
DATABASE_USERNAME=root
DATABASE_PASSWORD=yourpassword
DATABASE_SSL=false

# Public URL (for webhooks and sitemap)
PUBLIC_URL=https://yourdomain.com

# Upload provider (local or cloud)
UPLOAD_PROVIDER=local
```

### Start Strapi

```bash
npm run develop
```

Admin panel will be available at: `http://localhost:1337/admin`

### First-Time Admin User

1. Open `http://localhost:1337/admin`
2. Create admin account:
   - Username: admin
   - Email: admin@crickzen.com
   - Password: (secure password)

---

## Content Type Configuration

### Create BlogPost Content Type

Follow the detailed instructions in [`BlogPost.md`](./BlogPost.md).

**Quick Steps**:

1. Go to **Content-Type Builder** → **Create new collection type**
2. Name: `Blog Post` (API ID: `blog-post`)
3. Add fields as per `BlogPost.md`
4. Save and restart Strapi

### Install Plugins

Follow the instructions in [`Plugins.md`](./Plugins.md) to install:

- ✅ CKEditor 5 (Markdown WYSIWYG)
- ✅ Image Optimizer
- ✅ SEO Plugin (optional)
- ✅ Sitemap Plugin (optional)

---

## User Roles & Permissions

### Default Roles

Strapi provides 4 default roles:

1. **Super Admin** - Full access (use sparingly)
2. **Editor** - Content creation and editing
3. **Author** - Create own content only
4. **Public** - Unauthenticated users (read-only API access)

### Configure ROLE_BLOG_EDITOR

#### Create Custom Role

1. Go to **Settings** → **Roles** → **Create new role**
2. Name: `Blog Editor`
3. Description: Can create, edit, publish, and delete blog posts

#### Set Permissions

**Blog-post permissions**:
- ✅ `find` - List blog posts
- ✅ `findOne` - View single blog post
- ✅ `create` - Create new blog posts
- ✅ `update` - Edit existing blog posts
- ✅ `delete` - Delete blog posts (optional)
- ✅ `publish` - Publish/unpublish posts

**Upload permissions**:
- ✅ `upload` - Upload images
- ✅ `find` - List uploaded files
- ✅ `findOne` - View uploaded file

**Save the role**.

#### Create Editor User

1. Go to **Settings** → **Users**
2. Click **Add new user**
3. Fill details:
   - Username: `editor1`
   - Email: `editor@crickzen.com`
   - Password: (secure password)
   - Role: **Blog Editor**
4. Send invitation email (optional)

### Public API Permissions

For frontend to access published blog posts:

1. Go to **Settings** → **Roles** → **Public**
2. Under **Blog-post**:
   - ✅ `find` - Enable
   - ✅ `findOne` - Enable
   - ❌ All other operations - Disabled
3. Save

---

## Editorial Workflow

### Step 1: Create Draft

1. **Login to Strapi Admin** (`http://localhost:1337/admin`)
2. Go to **Content Manager** → **Blog Post**
3. Click **Create new entry**
4. Fill in required fields:
   - **Title**: "Virat Kohli's Century: A Masterclass in T20 Cricket"
   - **Slug**: Auto-generated from title
   - **Excerpt**: Brief summary (150-300 chars)
   - **Content**: Write article in markdown using CKEditor
   - **Tags**: ["Virat Kohli", "T20", "Century"]
   - **OG Image**: Upload featured image

5. Click **Save** (do NOT publish yet)

### Step 2: Preview Draft

- Drafts are NOT visible on the public website
- Preview in Strapi admin panel
- Share draft link with team for review (requires authentication)

### Step 3: Edit & Review

- Content stays in **Draft** status
- Editors can make changes
- Multiple revisions supported

### Step 4: Publish

1. Open the blog post in Content Manager
2. Click **Publish** button (top right)
3. Confirm publication

**What happens next**:
- Post becomes visible via API: `/api/blog-posts`
- Frontend fetches and displays within **≤2 minutes** (hybrid delivery)
- Redis cache stores response for fast access
- Nightly Scully build will pre-render static page

### Step 5: Update Published Post

1. Make edits to published post
2. Click **Save** (changes are live immediately)
3. Cache invalidation webhook triggers (if configured)
4. Frontend sees updated content within 2 minutes

### Step 6: Unpublish

- Click **Unpublish** to revert to draft
- Post disappears from public API
- Frontend shows 404 for unpublished slug

---

## Publishing Process

### Hybrid Delivery Strategy

The blog uses a **hybrid rendering** approach:

#### Dynamic Delivery (Immediate)
- **When**: Editor clicks "Publish" in Strapi
- **Time to Live**: ≤ 2 minutes
- **How**: Frontend fetches from Strapi API → displays dynamic page → caches in Redis (5-10min TTL)
- **Pros**: Fast content updates
- **Cons**: Slightly slower page load (mitigated by Redis cache)

#### Static Pre-rendering (Nightly)
- **When**: Every night at 2 AM UTC (GitHub Actions workflow)
- **Time to Live**: Next day
- **How**: Scully fetches all blog posts → generates static HTML → deploys to CDN/Nginx
- **Pros**: Ultra-fast page loads, SEO-optimized
- **Cons**: Delayed updates (up to 24 hours for nightly)

### Content Visibility Timeline

```
Time          Action                     Visibility
------------- -------------------------- ----------------------------------
T+0min        Editor clicks "Publish"    Strapi API updated
T+0-2min      Frontend polls API         Dynamic page rendered (cached)
T+0-2min      User visits /blog          Sees new post in list
T+0-2min      User visits /blog/:slug    Sees full post (dynamic HTML)
T+24hrs       Nightly build runs         Static HTML generated
T+24hrs       CDN/Nginx updated          Ultra-fast static page served
```

### Manual Cache Invalidation

If immediate static page regeneration is needed:

```bash
# SSH to production server
cd /home/nirmal-valvi/Project/victoryline-monorepo/apps/frontend

# Run Scully build manually
npm run scully

# Deploy updated static files
npm run deploy:static
```

---

## Webhooks Configuration

### Webhook for Cache Invalidation

Automatically invalidate Redis cache when content is published/updated.

#### Step 1: Create Webhook in Strapi

1. Go to **Settings** → **Webhooks**
2. Click **Create new webhook**
3. Configure:
   - **Name**: Blog Cache Invalidation
   - **URL**: `https://yourdomain.com/api/webhook/blog-cache-invalidate`
   - **Headers**:
     ```
     Authorization: Bearer YOUR_SECRET_TOKEN
     Content-Type: application/json
     ```
   - **Events**:
     - ✅ `entry.create` (Blog-post)
     - ✅ `entry.update` (Blog-post)
     - ✅ `entry.delete` (Blog-post)
     - ✅ `entry.publish` (Blog-post)
     - ✅ `entry.unpublish` (Blog-post)

4. Save webhook

#### Step 2: Verify Webhook Endpoint

The Spring Boot backend should have a webhook handler (see T044):

```java
@RestController
@RequestMapping("/api/webhook")
public class WebhookController {
    
    @PostMapping("/blog-cache-invalidate")
    public ResponseEntity<?> invalidateBlogCache(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody Map<String, Object> payload
    ) {
        // Validate token
        // Invalidate Redis cache for blog_list and blog_post
        // Regenerate sitemap
        // Return 200 OK
    }
}
```

#### Step 3: Test Webhook

1. Publish a test blog post
2. Check Spring Boot logs for webhook receipt
3. Verify Redis cache invalidation
4. Confirm frontend shows updated content

---

## Backup & Restore

### Database Backup

**MySQL Backup**:

```bash
# Backup
mysqldump -u root -p crickzen_blog > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
mysql -u root -p crickzen_blog < backup_20251112_120000.sql
```

**PostgreSQL Backup**:

```bash
# Backup
pg_dump -U postgres crickzen_blog > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -U postgres crickzen_blog < backup_20251112_120000.sql
```

### File Uploads Backup

```bash
# Backup uploads folder
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz apps/strapi-cms/public/uploads/

# Restore
tar -xzf uploads_backup_20251112.tar.gz -C apps/strapi-cms/public/
```

### Automated Backup (Cron)

Add to crontab:

```cron
# Daily database backup at 3 AM
0 3 * * * mysqldump -u root -pYOURPASS crickzen_blog > /backups/db_$(date +\%Y\%m\%d).sql

# Weekly uploads backup on Sundays at 4 AM
0 4 * * 0 tar -czf /backups/uploads_$(date +\%Y\%m\%d).tar.gz /path/to/apps/strapi-cms/public/uploads/
```

---

## Common Editor Tasks

### How to...

#### Add a New Blog Post

1. Content Manager → Blog Post → Create new entry
2. Fill all required fields (title, slug, excerpt, content)
3. Upload featured image (OG Image)
4. Add tags
5. Save → Publish

#### Upload Images in Content

- Use CKEditor's image upload button
- Images are automatically optimized to WebP
- Multiple sizes generated for responsive display

#### Schedule a Post for Later

- If Scheduler plugin is installed: Set publication date/time
- Otherwise: Keep as draft until ready, then publish manually

#### Fix a Typo in Published Post

1. Open published post
2. Make corrections
3. Click Save
4. Changes live in ≤2 minutes (cache TTL)

#### Delete a Post

1. Open post
2. Click **Delete** (bottom right)
3. Confirm deletion
4. Post removed from API and frontend

---

## Troubleshooting

### Post Not Showing on Website

- **Check**: Is post published? (not draft)
- **Check**: Is Public role permission enabled for `find` and `findOne`?
- **Check**: Clear Redis cache: `redis-cli FLUSHDB`
- **Check**: Check frontend API calls in browser DevTools

### Images Not Loading

- **Check**: File uploaded successfully in Media Library?
- **Check**: `public/uploads/` folder has correct permissions
- **Check**: Image path in API response is correct
- **Check**: CORS configured for media files

### Webhook Not Triggering

- **Check**: Webhook URL is reachable (test with `curl`)
- **Check**: Authorization header is correct
- **Check**: Events are selected in webhook config
- **Check**: Backend webhook endpoint logs

---

## References

- [Strapi Documentation](https://docs.strapi.io/)
- [BlogPost Content Type](./BlogPost.md)
- [Plugin Configuration](./Plugins.md)
- [Strapi User Guide](https://docs.strapi.io/user-docs/intro)
- [Content Manager](https://docs.strapi.io/user-docs/content-manager/introduction-to-content-manager)
- [Webhooks](https://docs.strapi.io/dev-docs/configurations/webhooks)
