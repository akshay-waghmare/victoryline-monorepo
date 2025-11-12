# Strapi BlogPost Content Type

This document describes the BlogPost content-type configuration for Strapi CMS.

## Overview

The BlogPost content type stores all blog articles with rich text content, metadata, and media assets. It supports draft/published workflows and SEO optimization.

## Content Type Definition

**API ID**: `blog-post`  
**Display Name**: Blog Post  
**Singular**: blog-post  
**Plural**: blog-posts  
**Draft & Publish**: Enabled  
**Internationalization**: Optional (future)

## Fields

### Basic Information

| Field Name | Type | Required | Unique | Description |
|------------|------|----------|--------|-------------|
| `title` | Text (Short) | Yes | No | Article title (max 255 chars) |
| `slug` | UID | Yes | Yes | URL-friendly identifier, auto-generated from title |
| `excerpt` | Text (Long) | Yes | No | Brief summary (150-300 chars) for cards and meta descriptions |
| `content` | Rich Text | Yes | No | Main article content in Markdown format |
| `publishedAt` | DateTime | Auto | No | Publication timestamp (managed by Strapi) |

### SEO Metadata

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `metaDescription` | Text (Long) | No | Custom meta description (overrides excerpt if provided) |
| `metaKeywords` | Text (Long) | No | Comma-separated keywords for SEO |
| `ogImageUrl` | Text (Long) | No | Open Graph / Twitter Card image URL |

### Media

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `ogImage` | Media (Single) | No | Featured image for social sharing and article header |

### Categorization

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tags` | JSON | No | Array of tag strings (e.g., ["IPL", "T20", "Virat Kohli"]) |

### Timestamps (Auto)

- `createdAt`: Creation timestamp (auto-managed by Strapi)
- `updatedAt`: Last modification timestamp (auto-managed by Strapi)

## Field Validation Rules

### Title
- **Min Length**: 10 characters
- **Max Length**: 255 characters
- **Pattern**: No special HTML characters

### Slug
- **Pattern**: lowercase, hyphens only (`^[a-z0-9-]+$`)
- **Max Length**: 255 characters
- **Auto-generate**: From title on creation

### Excerpt
- **Min Length**: 50 characters
- **Max Length**: 500 characters
- **Recommended**: 150-300 characters for optimal display

### Content
- **Format**: Markdown
- **Min Length**: 100 characters
- **Editor**: Rich text with markdown support

### Meta Description
- **Max Length**: 160 characters (Google truncation limit)

### Tags
- **Format**: JSON array of strings
- **Example**: `["IPL", "Mumbai Indians", "Match Analysis"]`

## Strapi Admin UI Configuration

### Create Content Type Steps

1. **Navigate to Content-Type Builder**
   - Go to Strapi Admin Panel → Content-Type Builder
   - Click "Create new collection type"

2. **Configure Basic Settings**
   ```
   Display name: Blog Post
   API ID (Singular): blog-post
   API ID (Plural): blog-posts
   ```
   - Enable "Draft & Publish"

3. **Add Fields (in order)**

   a) **Title** (Text - Short text)
   - Name: `title`
   - Type: Short text
   - Required: Yes
   - Advanced Settings:
     - Minimum length: 10
     - Maximum length: 255

   b) **Slug** (UID - Attached to "title")
   - Name: `slug`
   - Type: UID
   - Attached field: title
   - Required: Yes
   - Unique: Yes
   - Advanced Settings:
     - RegExp pattern: `^[a-z0-9-]+$`

   c) **Excerpt** (Text - Long text)
   - Name: `excerpt`
   - Type: Long text
   - Required: Yes
   - Advanced Settings:
     - Minimum length: 50
     - Maximum length: 500

   d) **Content** (Rich Text)
   - Name: `content`
   - Type: Rich text
   - Required: Yes
   - Advanced Settings:
     - Minimum length: 100

   e) **Meta Description** (Text - Long text)
   - Name: `metaDescription`
   - Type: Long text
   - Required: No
   - Advanced Settings:
     - Maximum length: 160

   f) **Meta Keywords** (Text - Long text)
   - Name: `metaKeywords`
   - Type: Long text
   - Required: No

   g) **OG Image URL** (Text - Long text)
   - Name: `ogImageUrl`
   - Type: Long text
   - Required: No

   h) **OG Image** (Media - Single media)
   - Name: `ogImage`
   - Type: Media
   - Required: No
   - Multiple: No
   - Allowed types: Images only

   i) **Tags** (JSON)
   - Name: `tags`
   - Type: JSON
   - Required: No
   - Default value: `[]`

4. **Save and Restart Strapi**

## API Endpoints

After creating the content type, Strapi automatically generates:

### Public Endpoints (Read-only)

```
GET /api/blog-posts
GET /api/blog-posts/:id
GET /api/blog-posts?filters[slug][$eq]=my-article-slug
```

### Authenticated Endpoints (ROLE_BLOG_EDITOR)

```
POST /api/blog-posts
PUT /api/blog-posts/:id
DELETE /api/blog-posts/:id
```

## Response Format (Strapi v4)

```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "title": "IPL 2025: Mumbai Indians vs Chennai Super Kings Analysis",
        "slug": "ipl-2025-mi-vs-csk-analysis",
        "excerpt": "A comprehensive analysis of the thrilling encounter between MI and CSK in IPL 2025.",
        "content": "# Match Overview\n\nThe match between Mumbai Indians and Chennai Super Kings...",
        "metaDescription": "Read our in-depth analysis of the MI vs CSK match in IPL 2025.",
        "metaKeywords": "IPL, Mumbai Indians, Chennai Super Kings, cricket analysis",
        "ogImageUrl": "https://yourdomain.com/uploads/mi-vs-csk.webp",
        "tags": ["IPL", "Mumbai Indians", "CSK", "Match Analysis"],
        "createdAt": "2025-11-12T10:30:00.000Z",
        "updatedAt": "2025-11-12T11:00:00.000Z",
        "publishedAt": "2025-11-12T11:00:00.000Z",
        "ogImage": {
          "data": {
            "id": 5,
            "attributes": {
              "url": "/uploads/mi_vs_csk_featured_1920x1080_abc123.webp",
              "formats": {
                "large": {
                  "url": "/uploads/large_mi_vs_csk_featured_1000x563_abc123.webp"
                },
                "medium": {
                  "url": "/uploads/medium_mi_vs_csk_featured_750x422_abc123.webp"
                },
                "small": {
                  "url": "/uploads/small_mi_vs_csk_featured_500x281_abc123.webp"
                },
                "thumbnail": {
                  "url": "/uploads/thumbnail_mi_vs_csk_featured_245x138_abc123.webp"
                }
              }
            }
          }
        }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 5,
      "total": 42
    }
  }
}
```

## Permissions Configuration

### Public Role
- **blog-post.find**: Enabled (list all published posts)
- **blog-post.findOne**: Enabled (get single published post)
- All other operations: Disabled

### Authenticated Role (ROLE_BLOG_EDITOR)
- **blog-post.find**: Enabled
- **blog-post.findOne**: Enabled
- **blog-post.create**: Enabled
- **blog-post.update**: Enabled (own entries only, or all if admin)
- **blog-post.delete**: Enabled (own entries only, or all if admin)

## Lifecycle Hooks (Optional Enhancement)

You can add custom lifecycle hooks in `api/blog-post/content-types/blog-post/lifecycles.js`:

```javascript
module.exports = {
  // Auto-generate slug from title if not provided
  beforeCreate(event) {
    const { data } = event.params;
    if (!data.slug && data.title) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  },

  // Update ogImageUrl when ogImage is uploaded
  afterCreate(event) {
    // Trigger webhook to invalidate cache
  },

  afterUpdate(event) {
    // Trigger webhook to invalidate cache
  }
};
```

## Sample Data for Testing

```json
{
  "title": "Virat Kohli's Century: A Masterclass in T20 Cricket",
  "slug": "virat-kohli-century-t20-masterclass",
  "excerpt": "Virat Kohli showcased his exceptional skill with a stunning century in the T20 match against Australia, leading India to a memorable victory.",
  "content": "# Introduction\n\nVirat Kohli's performance in the recent T20 match against Australia was nothing short of spectacular...\n\n## Key Moments\n\n- **Over 10**: Kohli hits a six...\n- **Over 15**: Reaches his fifty...\n- **Over 18**: Century celebration...\n\n## Conclusion\n\nThis match will be remembered as one of Kohli's finest performances.",
  "metaDescription": "Analysis of Virat Kohli's stunning century in T20 cricket against Australia.",
  "metaKeywords": "Virat Kohli, T20 cricket, century, India vs Australia",
  "tags": ["Virat Kohli", "T20", "India", "Australia", "Century"]
}
```

## References

- [Strapi Content-Type Builder](https://docs.strapi.io/dev-docs/backend-customization/models)
- [Strapi v4 REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Strapi Draft & Publish](https://docs.strapi.io/user-docs/content-manager/saving-and-publishing-content)
