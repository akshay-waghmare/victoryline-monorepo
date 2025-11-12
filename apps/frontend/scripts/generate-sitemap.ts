#!/usr/bin/env ts-node

/**
 * Sitemap Generator for Crickzen Blog
 * 
 * Generates XML sitemap for blog posts and static pages.
 * Integrates with Strapi CMS to fetch published blog posts.
 * 
 * Usage:
 *   npm run generate-sitemap
 *   ts-node scripts/generate-sitemap.ts
 *   ts-node scripts/generate-sitemap.ts --output dist/sitemap.xml
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Configuration
const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const SITE_URL = process.env.SITE_URL || 'https://yourdomain.com';
const OUTPUT_FILE = process.env.SITEMAP_OUTPUT || './dist/sitemap.xml';

interface BlogPost {
  slug: string;
  publishedAt: string;
  updatedAt: string;
}

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Fetch blog posts from Strapi
 */
async function fetchBlogPosts(): Promise<BlogPost[]> {
  const endpoint = `${STRAPI_API_URL}/blog-posts?pagination[pageSize]=1000&publicationState=live&sort=publishedAt:desc`;
  
  console.log(`Fetching blog posts from: ${endpoint}`);

  return new Promise((resolve, reject) => {
    const client = endpoint.startsWith('https') ? https : http;
    
    client.get(endpoint, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.data && Array.isArray(json.data)) {
            const posts: BlogPost[] = json.data
              .filter((post: any) => post.attributes && post.attributes.slug)
              .map((post: any) => ({
                slug: post.attributes.slug,
                publishedAt: post.attributes.publishedAt,
                updatedAt: post.attributes.updatedAt || post.attributes.publishedAt
              }));
            
            console.log(`✅ Fetched ${posts.length} published blog posts`);
            resolve(posts);
          } else {
            console.warn('⚠️  No blog posts found in response');
            resolve([]);
          }
        } catch (error) {
          console.error('❌ Error parsing Strapi response:', error);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Error fetching blog posts:', error);
      reject(error);
    });
  });
}

/**
 * Generate static page URLs
 */
function getStaticPages(): SitemapUrl[] {
  return [
    {
      loc: `${SITE_URL}/`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: `${SITE_URL}/blog`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 0.9
    },
    {
      loc: `${SITE_URL}/matches`,
      lastmod: new Date().toISOString(),
      changefreq: 'hourly',
      priority: 0.9
    },
    {
      loc: `${SITE_URL}/live`,
      lastmod: new Date().toISOString(),
      changefreq: 'always',
      priority: 0.8
    },
    {
      loc: `${SITE_URL}/teams`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7
    },
    {
      loc: `${SITE_URL}/players`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7
    }
  ];
}

/**
 * Convert blog posts to sitemap URLs
 */
function blogPostsToSitemapUrls(posts: BlogPost[]): SitemapUrl[] {
  return posts.map(post => ({
    loc: `${SITE_URL}/blog/${post.slug}`,
    lastmod: new Date(post.updatedAt).toISOString(),
    changefreq: 'weekly' as const,
    priority: 0.8
  }));
}

/**
 * Generate XML sitemap content
 */
function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlElements = urls.map(url => `
  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urlElements}
</urlset>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Write sitemap to file
 */
function writeSitemap(content: string, outputPath: string): void {
  const dir = path.dirname(outputPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`✅ Sitemap written to: ${outputPath}`);
}

/**
 * Generate sitemap statistics
 */
function generateStats(urls: SitemapUrl[]): void {
  const stats = {
    total: urls.length,
    static: urls.filter(u => !u.loc.includes('/blog/')).length,
    blog: urls.filter(u => u.loc.includes('/blog/')).length,
    size: Buffer.byteLength(generateSitemapXml(urls), 'utf8')
  };

  console.log('\n📊 Sitemap Statistics:');
  console.log(`   Total URLs: ${stats.total}`);
  console.log(`   Static Pages: ${stats.static}`);
  console.log(`   Blog Posts: ${stats.blog}`);
  console.log(`   File Size: ${(stats.size / 1024).toFixed(2)} KB`);
  
  // Warn if approaching limits
  if (stats.total > 40000) {
    console.warn('\n⚠️  Warning: Sitemap has more than 40,000 URLs. Consider splitting into multiple sitemaps.');
  }
  if (stats.size > 50 * 1024 * 1024) {
    console.warn('\n⚠️  Warning: Sitemap exceeds 50MB. Consider compressing or splitting.');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { output?: string; help?: boolean } {
  const args = process.argv.slice(2);
  const result: { output?: string; help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      result.output = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
    }
  }

  return result;
}

/**
 * Show usage information
 */
function showUsage(): void {
  console.log(`
Sitemap Generator for Crickzen Blog

Usage:
  npm run generate-sitemap [options]
  ts-node scripts/generate-sitemap.ts [options]

Options:
  --output <path>       Output file path (default: ./dist/sitemap.xml)
  --help, -h            Show this help message

Environment Variables:
  STRAPI_API_URL        Strapi API base URL (default: http://localhost:1337/api)
  SITE_URL              Public site URL (default: https://yourdomain.com)
  SITEMAP_OUTPUT        Output file path (default: ./dist/sitemap.xml)

Examples:
  # Generate sitemap with defaults
  npm run generate-sitemap

  # Specify custom output path
  npm run generate-sitemap -- --output public/sitemap.xml

  # Use production environment
  STRAPI_API_URL=https://cms.yourdomain.com/api \\
  SITE_URL=https://yourdomain.com \\
  npm run generate-sitemap
  `);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showUsage();
    process.exit(0);
  }

  const outputPath = args.output || OUTPUT_FILE;

  console.log('🗺️  Sitemap Generator\n');
  console.log(`Site URL: ${SITE_URL}`);
  console.log(`Strapi API: ${STRAPI_API_URL}`);
  console.log(`Output: ${outputPath}\n`);

  try {
    // Fetch blog posts
    const blogPosts = await fetchBlogPosts();

    // Generate all URLs
    const staticPages = getStaticPages();
    const blogUrls = blogPostsToSitemapUrls(blogPosts);
    const allUrls = [...staticPages, ...blogUrls];

    console.log(`\n📝 Generating sitemap with ${allUrls.length} URLs...`);

    // Generate XML
    const sitemapXml = generateSitemapXml(allUrls);

    // Write to file
    writeSitemap(sitemapXml, outputPath);

    // Show statistics
    generateStats(allUrls);

    console.log('\n✅ Sitemap generation completed successfully!\n');

    // Suggest next steps
    console.log('💡 Next steps:');
    console.log('   1. Deploy sitemap to your web server');
    console.log('   2. Submit to search engines:');
    console.log(`      - Google: https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml`);
    console.log(`      - Bing: https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml`);
    console.log('   3. Add to robots.txt:');
    console.log(`      Sitemap: ${SITE_URL}/sitemap.xml`);

  } catch (error) {
    console.error('\n❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { fetchBlogPosts, generateSitemapXml, blogPostsToSitemapUrls };
