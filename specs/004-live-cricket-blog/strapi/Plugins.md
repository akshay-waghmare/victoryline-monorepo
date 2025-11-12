# Strapi Plugins Configuration

This document describes the required and recommended plugins for the Crickzen blog CMS.

## Required Plugins

### 1. CKEditor 5 (Markdown WYSIWYG)

**Purpose**: Rich text editor with markdown support for blog content creation.

#### Installation

```bash
cd strapi-cms
npm install @ckeditor/strapi-plugin-ckeditor
```

#### Configuration

Add to `config/plugins.js`:

```javascript
module.exports = ({ env }) => ({
  ckeditor: {
    enabled: true,
    config: {
      editor: {
        editorConfig: {
          language: 'en',
          image: {
            toolbar: [
              'imageTextAlternative',
              'imageStyle:inline',
              'imageStyle:block',
              'imageStyle:side'
            ]
          },
          table: {
            contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' }
            ]
          },
          toolbar: {
            items: [
              'heading',
              '|',
              'bold',
              'italic',
              'link',
              'bulletedList',
              'numberedList',
              '|',
              'outdent',
              'indent',
              '|',
              'imageUpload',
              'blockQuote',
              'insertTable',
              'code',
              'codeBlock',
              '|',
              'undo',
              'redo'
            ]
          }
        }
      }
    }
  }
});
```

#### Features
- ✅ Markdown-compatible rich text editing
- ✅ Image upload and embedding
- ✅ Table creation
- ✅ Code blocks with syntax highlighting
- ✅ Bullet and numbered lists
- ✅ Blockquotes
- ✅ Heading levels (H1-H4)
- ✅ Bold, italic, links

#### Usage
Replace the default rich text field in BlogPost content type:
1. Go to Content-Type Builder → Blog Post → Edit `content` field
2. Change type from "Rich Text" to "CKEditor"
3. Save and restart Strapi

---

### 2. Image Optimization Plugin

**Purpose**: Automatically optimize uploaded images to WebP format with responsive sizes.

#### Option A: Strapi Image Optimizer (Recommended)

```bash
npm install strapi-plugin-image-optimizer
```

**Configuration** (`config/plugins.js`):

```javascript
module.exports = ({ env }) => ({
  // ... other plugins
  'image-optimizer': {
    enabled: true,
    config: {
      include: ['jpeg', 'jpg', 'png'],
      exclude: ['gif'],
      formats: ['original', 'webp', 'avif'],
      sizes: [
        {
          name: 'xs',
          width: 300
        },
        {
          name: 'sm',
          width: 768
        },
        {
          name: 'md',
          width: 1024
        },
        {
          name: 'lg',
          width: 1920
        },
        {
          name: 'xl',
          width: 2560
        },
        {
          name: 'original'
        }
      ],
      quality: 80,
      progressive: true,
      autoOrientation: true
    }
  }
});
```

#### Option B: Sharp Plugin (Built-in Enhancement)

Strapi uses Sharp by default. Enhance with custom middleware in `src/middlewares/image-processing.js`:

```javascript
const sharp = require('sharp');

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    await next();

    // Intercept image uploads
    if (ctx.request.files && ctx.request.files.files) {
      const files = Array.isArray(ctx.request.files.files)
        ? ctx.request.files.files
        : [ctx.request.files.files];

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const buffer = await sharp(file.path)
            .webp({ quality: 80 })
            .resize(1920, 1080, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();

          // Generate responsive sizes
          const sizes = [
            { width: 300, suffix: '_xs' },
            { width: 768, suffix: '_sm' },
            { width: 1024, suffix: '_md' },
            { width: 1920, suffix: '_lg' }
          ];

          for (const size of sizes) {
            await sharp(buffer)
              .resize(size.width, null, { withoutEnlargement: true })
              .toFile(`${file.path}${size.suffix}.webp`);
          }
        }
      }
    }
  };
};
```

#### Features
- ✅ Auto-convert to WebP format
- ✅ Generate multiple responsive sizes
- ✅ Optimize file size (quality: 80)
- ✅ Preserve aspect ratios
- ✅ Auto-orientation correction
- ✅ Progressive image loading

---

## Optional Plugins

### 3. SEO Plugin

**Purpose**: Manage meta tags and structured data for blog posts.

```bash
npm install @strapi/plugin-seo
```

**Configuration**:

```javascript
module.exports = ({ env }) => ({
  seo: {
    enabled: true
  }
});
```

**Usage**: Adds a "SEO" component to content types with fields for:
- Meta title
- Meta description
- Keywords
- Canonical URL
- Structured data (JSON-LD)

---

### 4. Sitemap Plugin

**Purpose**: Automatically generate XML sitemap for blog posts.

```bash
npm install strapi-plugin-sitemap
```

**Configuration**:

```javascript
module.exports = ({ env }) => ({
  sitemap: {
    enabled: true,
    config: {
      cron: '0 0 * * *', // Daily at midnight
      excludedTypes: ['admin::user'],
      hostname: env('PUBLIC_URL', 'https://yourdomain.com'),
      contentTypes: [
        {
          type: 'api::blog-post.blog-post',
          priority: 0.8,
          changefreq: 'weekly'
        }
      ]
    }
  }
});
```

---

### 5. Markdown Preview Plugin

**Purpose**: Preview markdown content in real-time.

```bash
npm install strapi-plugin-react-md-editor
```

**Configuration**:

```javascript
module.exports = ({ env }) => ({
  'react-md-editor': {
    enabled: true
  }
});
```

---

### 6. Duplicate Button Plugin

**Purpose**: Quickly duplicate blog posts for similar content.

```bash
npm install strapi-plugin-duplicate-button
```

**Configuration**:

```javascript
module.exports = ({ env }) => ({
  'duplicate-button': {
    enabled: true,
    config: {
      contentTypes: [
        {
          name: 'api::blog-post.blog-post',
          excludeFields: ['slug', 'publishedAt']
        }
      ]
    }
  }
});
```

---

### 7. Scheduler Plugin

**Purpose**: Schedule blog posts for future publication.

```bash
npm install strapi-plugin-scheduler
```

**Configuration**:

```javascript
module.exports = ({ env }) => ({
  scheduler: {
    enabled: true
  }
});
```

---

## Installation Summary

### Minimal Setup (Required Only)

```bash
cd strapi-cms
npm install @ckeditor/strapi-plugin-ckeditor strapi-plugin-image-optimizer
```

### Full Setup (Recommended)

```bash
cd strapi-cms
npm install \
  @ckeditor/strapi-plugin-ckeditor \
  strapi-plugin-image-optimizer \
  @strapi/plugin-seo \
  strapi-plugin-sitemap \
  strapi-plugin-react-md-editor \
  strapi-plugin-duplicate-button \
  strapi-plugin-scheduler
```

### Complete `config/plugins.js`

```javascript
module.exports = ({ env }) => ({
  // Markdown WYSIWYG Editor
  ckeditor: {
    enabled: true,
    config: {
      editor: {
        editorConfig: {
          toolbar: {
            items: [
              'heading', '|',
              'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
              'outdent', 'indent', '|',
              'imageUpload', 'blockQuote', 'insertTable', 'code', 'codeBlock', '|',
              'undo', 'redo'
            ]
          }
        }
      }
    }
  },

  // Image Optimization
  'image-optimizer': {
    enabled: true,
    config: {
      include: ['jpeg', 'jpg', 'png'],
      exclude: ['gif'],
      formats: ['original', 'webp', 'avif'],
      sizes: [
        { name: 'xs', width: 300 },
        { name: 'sm', width: 768 },
        { name: 'md', width: 1024 },
        { name: 'lg', width: 1920 },
        { name: 'xl', width: 2560 },
        { name: 'original' }
      ],
      quality: 80,
      progressive: true,
      autoOrientation: true
    }
  },

  // SEO
  seo: {
    enabled: true
  },

  // Sitemap
  sitemap: {
    enabled: true,
    config: {
      cron: '0 0 * * *',
      hostname: env('PUBLIC_URL', 'https://yourdomain.com'),
      contentTypes: [
        {
          type: 'api::blog-post.blog-post',
          priority: 0.8,
          changefreq: 'weekly'
        }
      ]
    }
  },

  // Markdown Preview
  'react-md-editor': {
    enabled: true
  },

  // Duplicate Button
  'duplicate-button': {
    enabled: true,
    config: {
      contentTypes: [
        {
          name: 'api::blog-post.blog-post',
          excludeFields: ['slug', 'publishedAt']
        }
      ]
    }
  },

  // Scheduler
  scheduler: {
    enabled: true
  }
});
```

---

## Plugin Verification

After installation and configuration:

1. **Restart Strapi**:
   ```bash
   npm run develop
   ```

2. **Verify in Admin Panel**:
   - Go to Settings → Plugins
   - Confirm all plugins are listed and enabled

3. **Test CKEditor**:
   - Go to Content Manager → Blog Posts → Create new entry
   - Verify the `content` field uses CKEditor with markdown support

4. **Test Image Optimization**:
   - Upload an image in a blog post
   - Check the `uploads` folder for generated WebP files and responsive sizes

5. **Check Sitemap** (if installed):
   - Visit: `http://localhost:1337/sitemap/index.xml`

---

## Troubleshooting

### CKEditor Not Showing
- Clear browser cache
- Restart Strapi: `npm run develop`
- Check `node_modules/@ckeditor` exists

### Image Optimization Not Working
- Verify Sharp is installed: `npm list sharp`
- Check file permissions on `public/uploads/`
- Review Strapi logs for errors

### Plugin Conflicts
- Disable conflicting plugins in `config/plugins.js`
- Check plugin compatibility with Strapi version

---

## References

- [CKEditor for Strapi](https://github.com/nshenderov/strapi-plugin-ckeditor)
- [Strapi Image Optimizer](https://www.npmjs.com/package/strapi-plugin-image-optimizer)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Strapi Plugins Marketplace](https://market.strapi.io/)
