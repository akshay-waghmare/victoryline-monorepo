const { ScullyConfig } = require('@scullyio/scully');

// Import and register custom Strapi blog routes plugin
require('./scully/plugins/strapi-blog-routes');

/** @type {import('@scullyio/scully').ScullyConfig} */
exports.config = {
  projectRoot: './src',
  projectName: 'crickzen-blog',
  outDir: './dist/static',
  distFolder: './dist',
  routes: {
    '/blog/:slug': {
      type: 'strapiBlogPosts',
    },
  },
  puppeteerLaunchOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
};
