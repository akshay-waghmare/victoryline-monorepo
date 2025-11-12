/**
 * Scully Route Plugin for Strapi Blog Posts
 * 
 * This plugin fetches blog post slugs from Strapi CMS and generates
 * static routes for Scully to pre-render.
 * 
 * Usage in scully.config.js:
 * const { strapiBlogRoutesPlugin } = require('./scully/plugins/strapi-blog-routes');
 * exports.config = {
 *   routes: {
 *     '/blog/:slug': {
 *       type: 'strapiBlogPosts'
 *     }
 *   }
 * };
 */

const { registerPlugin, log, yellow } = require('@scullyio/scully');
const fetch = require('node-fetch');

/**
 * Fetch blog post routes from Strapi
 */
async function strapiBlogRoutesPlugin(route, config) {
  try {
    const strapiUrl = process.env.STRAPI_API_URL || 'http://localhost:1337';
    const endpoint = `${strapiUrl}/api/blog-posts`;
    
    log(yellow(`Fetching blog routes from: ${endpoint}`));

    // Fetch all published posts (pagination may be needed for large blogs)
    const response = await fetch(`${endpoint}?pagination[pageSize]=100&publicationState=live`);
    
    if (!response.ok) {
      throw new Error(`Strapi API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      log(yellow('Warning: No blog posts found in Strapi'));
      return [];
    }

    // Transform Strapi response to Scully route format
    const routes = data.data
      .filter(post => post.attributes && post.attributes.slug)
      .map(post => ({
        route: `/blog/${post.attributes.slug}`,
        data: {
          slug: post.attributes.slug,
          title: post.attributes.title,
          publishedAt: post.attributes.publishedAt
        }
      }));

    log(yellow(`Generated ${routes.length} blog routes`));
    return routes;

  } catch (error) {
    log(yellow(`Error fetching Strapi routes: ${error.message}`));
    console.error(error);
    
    // Return empty array on error - Scully will continue with other routes
    return [];
  }
}

/**
 * Validator function for the plugin
 */
const validator = async (conf) => {
  return [];
};

// Register the plugin with Scully
registerPlugin('router', 'strapiBlogPosts', strapiBlogRoutesPlugin, validator);

module.exports = {
  strapiBlogRoutesPlugin
};
