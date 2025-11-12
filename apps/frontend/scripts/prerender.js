/*
  Simple prerender script for homepage (/) and matches page (/matches).
  - Fetches live matches from backend (if reachable)
  - Generates lightweight static HTML snapshots with basic meta tags and a simple list
  - Outputs to ../prerender/home.html and ../prerender/matches.html

  Usage:
    BACKEND_URL=http://localhost:8099 node scripts/prerender.js

  Notes:
    - If backend is unavailable, generates a minimal fallback page so Nginx can still serve something.
    - Nginx is configured to prefer /prerender/*.html when present, else falls back to Angular /index.html.
*/

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8099';
const OUT_DIR = process.env.PRERENDER_OUT_DIR
  ? path.resolve(process.env.PRERENDER_OUT_DIR)
  : path.resolve(__dirname, '..', 'prerender');
// Try to include Angular asset tags from the built index.html so the app boots after prerender
const INDEX_HTML_PATH = process.env.PRERENDER_INDEX_HTML || '/shared-html/index.html';

async function fetchLiveMatches() {
  const url = `${BACKEND_URL}/cricket-data/live-matches`;
  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (Array.isArray(res.data)) return res.data;
    // Some controllers wrap in an object
    if (res.data && Array.isArray(res.data.matches)) return res.data.matches;
    return [];
  } catch (e) {
    return [];
  }
}

async function fetchMatchInfo(urlSlug) {
  const url = `${BACKEND_URL}/cricket-data/match-info/get?url=${encodeURIComponent(urlSlug)}`;
  try {
    const res = await axios.get(url, { timeout: 3000 });
    return res.data || null;
  } catch (e) {
    return null;
  }
}

async function fetchBlogPosts() {
  const url = `${BACKEND_URL}/cricket-data/blog-posts`;
  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (Array.isArray(res.data)) return res.data.slice(0, 6); // Get top 6 posts
    return [];
  } catch (e) {
    return [];
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function deriveStatus(lastKnownState) {
  if (!lastKnownState) return '';
  // Trim excessive whitespace
  let s = String(lastKnownState).trim();
  // Collapse multiple spaces
  s = s.replace(/\s{2,}/g, ' ');
  // If extremely long (e.g. ball-by-ball commentary), truncate
  if (s.length > 140) s = s.slice(0, 137) + '…';
  return s;
}

function extractUrlSlug(url) {
  if (!url) return null;
  // Extract slug from URL like: https://crex.com/scoreboard/.../ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025/live
  const parts = url.split('/').filter(p => p && p !== 'live' && p !== 'scoreboard' && !p.startsWith('http'));
  return parts.pop() || null;
}

function deriveTitle(m, matchInfo = null) {
  // Use match info venue if available
  if (matchInfo && matchInfo.venue) {
    const venue = matchInfo.venue;
    // Try to extract team names from venue or use URL parsing
    if (m.url) {
      const urlPart = extractUrlSlug(m.url);
      if (urlPart) {
        const vsMatch = urlPart.match(/^([a-z]{3})-vs-([a-z]{3})-(.+)/i);
        if (vsMatch) {
          const team1 = vsMatch[1].toUpperCase();
          const team2 = vsMatch[2].toUpperCase();
          const rest = vsMatch[3]
            .replace(/-/g, ' ')
            .replace(/\d{4}$/, '')
            .trim()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          return `${team1} vs ${team2} - ${rest}`;
        }
      }
    }
  }
  
  // Attempt to build a human readable title from lastKnownState or URL slug
  const status = deriveStatus(m.lastKnownState);
  if (status && /won by/.test(status)) {
    return status.split(' won by')[0];
  }
  
  // Fallback: parse team names from URL if possible
  if (m.url) {
    const urlPart = extractUrlSlug(m.url);
    if (urlPart) {
      const vsMatch = urlPart.match(/^([a-z]{3})-vs-([a-z]{3})-(.+)/i);
      if (vsMatch) {
        const team1 = vsMatch[1].toUpperCase();
        const team2 = vsMatch[2].toUpperCase();
        const rest = vsMatch[3]
          .replace(/-/g, ' ')
          .replace(/\d{4}$/, '')
          .trim()
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return `${team1} vs ${team2} - ${rest}`;
      }
      
      return urlPart
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  return `Match ${m.id || ''}`.trim();
}

function renderPlayingXI(playingXi) {
  if (!playingXi) return '';
  
  const teams = Object.keys(playingXi);
  if (teams.length === 0) return '';
  
  return `<div class="playing-xi">
    <h4>Playing XI</h4>
    ${teams.map(team => {
      const players = playingXi[team];
      if (!players || players.length === 0) return '';
      
      return `<div class="team-xi">
        <strong>${escapeHtml(team)}:</strong>
        <ul class="players-list">
          ${players.slice(0, 11).map(player => {
            const name = player.playerName ? player.playerName.split('\n')[0] : '';
            const role = player.playerRole || '';
            return `<li itemprop="performer" itemscope itemtype="https://schema.org/Person">
              <span itemprop="name">${escapeHtml(name)}</span>${role ? ` <em>(${escapeHtml(role)})</em>` : ''}
            </li>`;
          }).join('')}
        </ul>
      </div>`;
    }).join('')}
  </div>`;
}

function renderMatchItem(m, matchInfo = null) {
  const title = deriveTitle(m, matchInfo);
  const matchName = matchInfo && matchInfo.match_name ? escapeHtml(matchInfo.match_name) : '';
  const status = deriveStatus(m.lastKnownState || m.status || m.matchStatus || '');
  const linkPath = m.id ? `/cric-live/${m.id}` : '#';
  const matchState = m.finished ? 'Completed' : 'Live';
  const venue = matchInfo && matchInfo.venue ? escapeHtml(matchInfo.venue) : 'Cricket Stadium';
  const playingXiHtml = matchInfo && matchInfo.playing_xi ? renderPlayingXI(matchInfo.playing_xi) : '';
  const tossInfo = matchInfo && matchInfo.toss_info ? escapeHtml(matchInfo.toss_info) : '';
  
  return `<li class="match-item" itemscope itemtype="https://schema.org/SportsEvent">
    <a href="${escapeHtml(linkPath)}" class="match-link" itemprop="url">
      <h3 class="match-title" itemprop="name">${escapeHtml(title)}</h3>
      ${matchName ? `<p class="match-series"><strong>${matchName}</strong></p>` : ''}
      ${status ? `<p class="match-status" itemprop="description">${escapeHtml(status)}</p>` : `<p class="match-status" itemprop="description">${matchState} Cricket Match</p>`}
      <p class="match-venue" itemprop="location" itemscope itemtype="https://schema.org/Place">
        <span itemprop="name">📍 ${venue}</span>
      </p>
      ${tossInfo ? `<p class="toss-info">🪙 ${tossInfo}</p>` : ''}
    </a>
    ${playingXiHtml}
    <meta itemprop="eventStatus" content="${m.finished ? 'EventScheduled' : 'EventLive'}" />
    <meta itemprop="sport" content="Cricket" />
  </li>`;
}

function renderBlogPost(post) {
  const title = escapeHtml(post.title || '');
  const description = post.description ? escapeHtml(post.description.slice(0, 200) + '...') : '';
  const link = escapeHtml(post.link || '#');
  const imgUrl = escapeHtml(post.imgUrl || '');
  
  return `<article class="blog-post" itemscope itemtype="https://schema.org/BlogPosting">
    ${imgUrl ? `<img src="${imgUrl}" alt="${title}" itemprop="image" loading="lazy" style="max-width:100%;height:auto;" />` : ''}
    <h3 itemprop="headline"><a href="${link}" target="_blank" rel="noopener">${title}</a></h3>
    ${description ? `<p itemprop="description">${description}</p>` : ''}
    <meta itemprop="url" content="${link}" />
  </article>`;
}

function extractAngularAssets() {
  try {
    if (!fs.existsSync(INDEX_HTML_PATH)) return '';
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    const linkTags = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || []).join('\n');
    const scriptTags = (html.match(/<script[^>]+src=["'][^"']+["'][^>]*><\/script>/gi) || []).join('\n');
    const assets = [linkTags, scriptTags].filter(Boolean).join('\n');
    if (assets && assets.trim().length > 0) return assets;
    // Fallback minimal bundle set (Angular 7 default bundle names)
    return [
      '<link rel="stylesheet" href="/styles.css" />',
      '<script src="/runtime.js"></script>',
      '<script src="/polyfills.js"></script>',
      '<script src="/scripts.js"></script>',
      '<script src="/vendor.js"></script>',
      '<script src="/main.js"></script>'
    ].join('\n');
  } catch (e) {
    // Conservative fallback
    return [
      '<link rel="stylesheet" href="/styles.css" />',
      '<script src="/runtime.js"></script>',
      '<script src="/polyfills.js"></script>',
      '<script src="/scripts.js"></script>',
      '<script src="/vendor.js"></script>',
      '<script src="/main.js"></script>'
    ].join('\n');
  }
}

function extractBaseHref() {
  try {
    if (!fs.existsSync(INDEX_HTML_PATH)) return '<base href="/">';
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    const match = html.match(/<base\s+href=["'][^"']+["']\s*\/>/i);
    return match ? match[0] : '<base href="/">';
  } catch (e) {
    return '<base href="/">';
  }
}

function buildMatchesJsonLd(matchesWithInfo) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': matchesWithInfo.map((item, idx) => {
      const m = item.match;
      const info = item.info;
      const title = deriveTitle(m, info);
      const status = deriveStatus(m.lastKnownState || m.status || '');
      const eventStatus = m.finished ? 'EventScheduled' : 'EventLive';
      const venue = info && info.venue ? info.venue : 'Cricket Stadium';
      const matchName = info && info.match_name ? info.match_name : title;
      
      // Extract all players from playing XI for rich schema
      const performers = [];
      if (info && info.playing_xi) {
        Object.keys(info.playing_xi).forEach(team => {
          const players = info.playing_xi[team];
          if (players && Array.isArray(players)) {
            players.slice(0, 11).forEach(player => {
              const name = player.playerName ? player.playerName.split('\n')[0] : '';
              if (name) {
                performers.push({
                  '@type': 'Person',
                  'name': name
                });
              }
            });
          }
        });
      }
      
      const event = {
        '@type': 'SportsEvent',
        'position': idx + 1,
        'name': matchName,
        'description': status || `${m.finished ? 'Completed' : 'Live'} Cricket Match`,
        'url': `https://www.crickzen.com/cric-live/${m.id}`,
        'eventStatus': `https://schema.org/${eventStatus}`,
        'sport': 'Cricket',
        'location': {
          '@type': 'Place',
          'name': venue
        }
      };
      
      if (performers.length > 0) {
        event.performer = performers;
      }
      
      return event;
    })
  };
  return `<script type="application/ld+json">${JSON.stringify(itemList)}</script>`;
}

function buildBlogJsonLd(posts) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': posts.map((post, idx) => ({
      '@type': 'BlogPosting',
      'position': idx + 1,
      'headline': post.title,
      'description': post.description ? post.description.slice(0, 200) : '',
      'url': post.link,
      'image': post.imgUrl || '',
      'author': {
        '@type': 'Organization',
        'name': 'Crickzen'
      }
    }))
  };
  return `<script type="application/ld+json">${JSON.stringify(itemList)}</script>`;
}

function pageTemplate({ title, description, canonical, contentHtml, jsonLd }) {
  const assets = extractAngularAssets();
  const baseHref = extractBaseHref();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    ${baseHref}
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : ''}
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <style>
      #prerender-root { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
      h1 { color: #1a73e8; margin-bottom: 20px; }
      h2 { color: #333; margin: 30px 0 20px; }
      .matches-list { list-style: none; padding: 0; }
      .match-item { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; transition: box-shadow 0.2s; background: #fff; }
      .match-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
      .match-title { color: #1a73e8; font-size: 1.3em; margin: 0 0 8px; font-weight: 600; }
      .match-series { color: #2e7d32; font-size: 1.05em; margin: 5px 0; }
      .match-status { color: #666; margin: 8px 0; line-height: 1.4; }
      .match-venue { color: #888; font-size: 0.95em; margin: 8px 0; }
      .toss-info { color: #795548; font-size: 0.9em; margin: 8px 0; font-style: italic; }
      .playing-xi { margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }
      .playing-xi h4 { color: #555; margin: 0 0 12px; font-size: 1.05em; }
      .team-xi { margin-bottom: 12px; }
      .team-xi strong { color: #1a73e8; font-size: 1em; }
      .players-list { list-style: none; padding: 5px 0 0 15px; margin: 5px 0; display: flex; flex-wrap: wrap; gap: 10px; }
      .players-list li { font-size: 0.9em; color: #444; padding: 4px 10px; background: #f5f5f5; border-radius: 4px; }
      .players-list em { color: #888; font-size: 0.85em; }
      .match-venue { color: #888; font-size: 0.9em; margin: 5px 0 0; }
      .blog-posts { margin-top: 40px; }
      .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
      .blog-post { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; transition: transform 0.2s; }
      .blog-post:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .blog-post img { width: 100%; height: 200px; object-fit: cover; }
      .blog-post h3 { padding: 15px 15px 10px; margin: 0; font-size: 1.1em; }
      .blog-post h3 a { color: #333; text-decoration: none; }
      .blog-post h3 a:hover { color: #1a73e8; }
      .blog-post p { padding: 0 15px 15px; color: #666; line-height: 1.5; }
    </style>
    ${assets}
    ${jsonLd || ''}
  </head>
  <body>
    <div id="prerender-root">
      ${contentHtml}
    </div>
    <app-root></app-root>
    <!-- Angular will bootstrap and enhance this page at runtime. -->
  </body>
</html>`;
}

async function build() {
  ensureDir(OUT_DIR);
  const live = await fetchLiveMatches();
  const blogs = await fetchBlogPosts();

  // Fetch match info for each live match to get venue details
  const matchesWithInfo = [];
  if (live && live.length) {
    for (const match of live) {
      const urlSlug = extractUrlSlug(match.url);
      const info = urlSlug ? await fetchMatchInfo(urlSlug) : null;
      matchesWithInfo.push({ match, info });
    }
  }

  const listHtml = matchesWithInfo.length
    ? `<ul class="matches-list">${matchesWithInfo.map(item => renderMatchItem(item.match, item.info)).join('')}</ul>`
    : '<p>No live matches at the moment. Please check back soon.</p>';

  const blogsHtml = blogs && blogs.length
    ? `<section class="blog-posts">
        <h2>Latest Cricket News & Analysis</h2>
        <div class="blog-grid">
          ${blogs.map(renderBlogPost).join('')}
        </div>
      </section>`
    : '';

  const matchesJsonLd = matchesWithInfo.length ? buildMatchesJsonLd(matchesWithInfo) : '';
  const blogsJsonLd = blogs && blogs.length ? buildBlogJsonLd(blogs) : '';
  const combinedJsonLd = [matchesJsonLd, blogsJsonLd].filter(Boolean).join('\n');

  // Homepage snapshot
  const homeHtml = pageTemplate({
    title: 'Crickzen | Live Cricket Scores, News & Real-time Updates',
    description: 'Live cricket scores, match updates, and latest cricket news. Get real-time coverage of international and domestic matches with expert analysis.',
    canonical: 'https://www.crickzen.com/',
    contentHtml: `<h1>Live Cricket Matches</h1>${listHtml}${blogsHtml}`,
    jsonLd: combinedJsonLd
  });
  fs.writeFileSync(path.join(OUT_DIR, 'home.html'), homeHtml, 'utf8');

  // Matches page snapshot
  const matchesHtml = pageTemplate({
    title: 'Crickzen | Live Cricket Matches & Scores',
    description: 'Browse live cricket matches with real-time updates, ball-by-ball commentary, and quick links to match details.',
    canonical: 'https://www.crickzen.com/matches',
    contentHtml: `<h1>Cricket Matches</h1>${listHtml}${blogsHtml}`,
    jsonLd: combinedJsonLd
  });
  fs.writeFileSync(path.join(OUT_DIR, 'matches.html'), matchesHtml, 'utf8');
}
module.exports = { build };

if (require.main === module) {
  build().then(() => {
    // eslint-disable-next-line no-console
    console.log('Prerender complete. Files written to', OUT_DIR);
  }).catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Prerender failed:', e);
    process.exitCode = 1;
  });
}
