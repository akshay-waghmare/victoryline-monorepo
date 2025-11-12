# Strapi CMS Setup for Blog

## Installation

1. Install Strapi (Node.js required):
```bash
npx create-strapi-app@latest strapi-blog --quickstart
```

2. Access admin panel: http://localhost:1337/admin

## BlogPost Content Type

Create a new content type called "BlogPost" with these fields:

### Fields Configuration

| Field Name | Type | Settings |
|------------|------|----------|
| title | Text (short) | Required, Max 180 chars |
| slug | UID | Target field: title, Required, Max 200 chars |
| excerpt | Text (long) | Optional |
| content | Rich Text | Required, Use markdown editor |
| status | Enumeration | Values: DRAFT, PUBLISHED; Default: DRAFT |
| publishedAt | Datetime | Optional, auto-set on publish |
| seoTitle | Text (short) | Optional, Max 180 chars |
| seoDescription | Text (long) | Optional, Max 300 chars |
| ogImage | Media (single) | Optional, Images only |
| tags | Text (short) | Repeatable |

## Required Plugins

### 1. Markdown Editor
```bash
cd strapi-blog
npm install strapi-plugin-react-md-editor
```

Add to `config/plugins.js`:
```js
module.exports = {
  'react-md-editor': {
    enabled: true,
  },
};
```

### 2. Image Optimization (Sharp)
```bash
npm install @strapi/provider-upload-local sharp
```

Create `config/plugins.js` or update existing:
```js
module.exports = {
  upload: {
    config: {
      provider: 'local',
      providerOptions: {
        sizeLimit: 10000000, // 10MB
      },
      breakpoints: {
        xlarge: 1920,
        large: 1000,
        medium: 750,
        small: 500,
        xsmall: 64
      },
      formats: ['thumbnail', 'small', 'medium', 'large'],
    },
  },
};
```

For OG image 1200x630 generation, add custom middleware in `src/api/blog-post/content-types/blog-post/lifecycles.js`:
```js
module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    if (data.ogImage) {
      // Generate 1200x630 crop
      // Use Sharp to resize/crop uploaded image
    }
  },
};
```

## API Configuration

### Enable Public Read Access

In Strapi admin:
1. Settings → Roles → Public
2. Enable these permissions for BlogPost:
   - find (GET /api/blog-posts)
   - findOne (GET /api/blog-posts/:id)

### Enable Editor Access

1. Settings → Roles → Authenticated
2. Enable all CRUD permissions for BlogPost

## Webhook Configuration

1. Settings → Webhooks → Create
2. Name: "GitHub Actions Webhook"
3. URL: Your GitHub Actions webhook endpoint
4. Events:
   - entry.publish
   - entry.unpublish
5. Headers:
   - Authorization: Bearer YOUR_SECRET_TOKEN

## Database

Strapi uses SQLite by default. For production, configure MySQL:

`config/database.js`:
```js
module.exports = ({ env }) => ({
  connection: {
    client: 'mysql',
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 3306),
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'strapi'),
    },
  },
});
```

## Testing

1. Create a draft blog post with all fields
2. Verify markdown preview works
3. Upload image and verify responsive versions generated
4. Publish post
5. Verify webhook fires to GitHub Actions
6. Check public API: `http://localhost:1337/api/blog-posts?populate=*`

## Notes

- Keep Strapi CMS accessible only through Spring Boot proxy for editor operations
- Public reads can hit Strapi directly but should be cached by Redis
- Ensure CORS is configured if frontend accesses Strapi directly
