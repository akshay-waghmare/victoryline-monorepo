const state = { loading: false };
let refreshTimer = null;

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatPercent(value) {
  return `${formatNumber(Number(value || 0) * 100, 1)}%`;
}

function formatDateTime(value) {
  if (!value) return "Not seen yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sourceLabel(name) {
  return {
    gsc: "Google Search Console",
    indexing: "Live indexing",
    sitemap: "Sitemap",
    liveFeed: "Live feed",
    upcomingFeed: "Upcoming feed",
    completedFeed: "Completed feed"
  }[name] || name;
}

function renderSources(data) {
  const sources = Object.entries(data.sources || {}).map(([name, source]) => `
    <span class="source-pill ${source.ok ? "ok" : "bad"}">
      ${escapeHtml(sourceLabel(name))}: ${source.ok ? "connected" : "attention"}
    </span>
  `);
  const serp = data.serpbear || {};
  sources.push(`
    <span class="source-pill ${serp.configured ? "ok" : "bad"}">
      SerpBear: ${serp.configured ? "import connected" : "not configured"}
    </span>
  `);
  document.querySelector("#source-strip").innerHTML = sources.join("");
}

function deltaClass(metric, value) {
  if (!value) return "";
  const positiveIsGood = metric !== "position";
  const good = positiveIsGood ? value > 0 : value < 0;
  return good ? "good" : "bad";
}

function renderSummary(data) {
  const summary = data.summary || {};
  const delta = summary.delta || {};
  const buckets = data.bucketCounts || {};
  const metrics = [
    ["Live URLs", buckets.liveMatches || 0, 0, value => formatNumber(value)],
    ["Upcoming discovery window", buckets.upcomingMatches || 0, 0, value => formatNumber(value)],
    ["Indexed", buckets.indexed || 0, 0, value => formatNumber(value)],
    ["Discovered not indexed", buckets.discoveredButNotIndexed || 0, 0, value => formatNumber(value)],
    ["Has impressions", buckets.hasImpressions || 0, delta.impressions, value => formatNumber(value)],
    ["Has clicks", buckets.hasClicks || 0, delta.clicks, value => formatNumber(value)]
  ];
  document.querySelector("#summary-grid").innerHTML = metrics.map(([label, value, change, formatter]) => `
    <article class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${formatter(value)}</div>
      <div class="metric-delta ${deltaClass(label.toLowerCase().includes("position") ? "position" : label, change)}">
        ${label === "Live URLs" ? "Rows currently monitored as live" : ""}
        ${label === "Upcoming discovery window" ? `${data.sampleWindow?.upcomingMinHours || 30}-${data.sampleWindow?.upcomingMaxHours || 120} hour window` : ""}
        ${label === "Indexed" ? "Known indexed or impression-earning match URLs" : ""}
        ${label === "Discovered not indexed" ? "Found in hubs or sitemap but not yet indexed" : ""}
        ${label === "Has impressions" ? `${change > 0 ? "+" : ""}${formatNumber(change)} GSC impression delta` : ""}
        ${label === "Has clicks" ? `${change > 0 ? "+" : ""}${formatNumber(change)} GSC click delta` : ""}
      </div>
    </article>
  `).join("");
}

function renderBucketStrip(data) {
  const buckets = data.bucketCounts || {};
  const chips = [
    ["Unknown to Google", buckets.unknownToGoogle || 0, "bad"],
    ["Discovered not indexed", buckets.discoveredButNotIndexed || 0, "warn"],
    ["Indexed", buckets.indexed || 0, "good"],
    ["Has impressions", buckets.hasImpressions || 0, "good"],
    ["Has clicks", buckets.hasClicks || 0, "good"]
  ];
  document.querySelector("#bucket-strip").innerHTML = chips.map(([label, value, tone]) => `
    <span class="status-pill ${tone}">
      ${escapeHtml(label)}: ${formatNumber(value)}
    </span>
  `).join("");
}

function renderManualQueue(data) {
  const rows = data.manualSubmissionQueue || [];
  const summary = data.operatorActionSummary || {};
  document.querySelector("#queue-summary").textContent =
    `${formatNumber(rows.length)} urgent · ${formatNumber(summary.fixProduct || 0)} fix-first · ${formatNumber(summary.monitor || 0)} monitor`;
  const target = document.querySelector("#manual-queue-table");
  if (!rows.length) {
    target.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">No urgent manual submissions right now. Keep watching sitemap, hub, and inspection evidence.</div>
        </td>
      </tr>
    `;
    return;
  }
  target.innerHTML = rows.map(row => `
    <tr>
      <td>
        <a class="match-link" href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.slug)}</a>
        <div class="rank-meta">${escapeHtml(row.status)}</div>
      </td>
      <td>
        <div>${escapeHtml(row.startTime || "Unknown start")}</div>
        <div class="rank-meta">${row.hoursUntilMatch !== null && row.hoursUntilMatch !== undefined ? `${formatNumber(row.hoursUntilMatch, 1)}h until start` : "No start time"}</div>
      </td>
      <td>
        <div class="queue-score">${formatNumber(row.priorityScore || 0)}</div>
        <div class="mini-chip-list">
          ${(row.queueReasons || []).slice(0, 3).map(reason => `<span class="mini-chip warn">${escapeHtml(reason)}</span>`).join("")}
        </div>
      </td>
      <td>
        <div class="timestamp-stack">
          <span>Feed: ${escapeHtml(formatDateTime(row.history?.firstSeenInFeedAt))}</span>
          <span>Sitemap: ${escapeHtml(formatDateTime(row.history?.firstSeenInSitemapAt))}</span>
          <span>Hubs: ${escapeHtml(formatDateTime(row.history?.firstSeenInHubsAt))}</span>
        </div>
      </td>
      <td>
        <span class="status-badge good">manual submit</span>
        <div class="rank-meta">Indexed: ${escapeHtml(formatDateTime(row.history?.firstSeenIndexedAt))}</div>
      </td>
    </tr>
  `).join("");
}

function renderTrend(rows) {
  const target = document.querySelector("#trend-chart");
  if (!rows?.length) {
    target.innerHTML = '<div class="empty-state">No live-page GSC trend data yet.</div>';
    return;
  }
  const width = 820;
  const height = 250;
  const pad = { top: 16, right: 20, bottom: 34, left: 42 };
  const max = Math.max(...rows.map(row => Number(row.impressions || 0)), 1);
  const points = rows.map((row, index) => {
    const x = pad.left + index * ((width - pad.left - pad.right) / Math.max(rows.length - 1, 1));
    const y = pad.top + (1 - Number(row.impressions || 0) / max) * (height - pad.top - pad.bottom);
    return { x, y, row };
  });
  const line = points.map(point => `${point.x},${point.y}`).join(" ");
  const area = `${pad.left},${height - pad.bottom} ${line} ${points.at(-1).x},${height - pad.bottom}`;
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % 3 === 0);
  target.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily live match impressions">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f7657" stop-opacity=".28"/>
          <stop offset="100%" stop-color="#0f7657" stop-opacity=".02"/>
        </linearGradient>
      </defs>
      <line x1="${pad.left}" y1="${height-pad.bottom}" x2="${width-pad.right}" y2="${height-pad.bottom}" stroke="rgba(16,34,29,.15)"/>
      <polygon points="${area}" fill="url(#areaFill)"/>
      <polyline points="${line}" fill="none" stroke="#0f7657" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#f8f5ec" stroke="#0f7657" stroke-width="2"><title>${point.row.date}: ${point.row.impressions} impressions</title></circle>`).join("")}
      ${labels.map(point => `<text class="chart-label" x="${point.x}" y="${height-10}" text-anchor="middle">${escapeHtml(point.row.date.slice(5))}</text>`).join("")}
      <text class="chart-label" x="${pad.left}" y="11">${formatNumber(max)} impressions</text>
    </svg>
  `;
}

function renderHubHealth(rows) {
  const target = document.querySelector("#hub-health");
  target.innerHTML = (rows || []).map(row => {
    const healthy = row.status === 200 && row.h1Count >= 1 && row.canonicalMatches && !row.noindex && row.cricLiveLinks >= 8;
    return `
      <div class="health-row">
        <div>
          <div class="health-path">${escapeHtml(row.path)}</div>
          <div class="health-meta">${formatNumber(row.cricLiveLinks)} live links · H1 ${row.h1Count ?? "?"} · ${escapeHtml(row.robots || "robots missing")}</div>
        </div>
        <span class="status-badge ${healthy ? "good" : "bad"}">${healthy ? "healthy" : "check"}</span>
      </div>
    `;
  }).join("");
}

function renderDiscoveryCell(row) {
  const chips = [
    ["Home", row.linkedFromHomepage],
    ["/matches", row.linkedFromMatches],
    ["/series", row.linkedFromSeries],
    ["/live-score", row.linkedFromLiveScore],
    ["/live-score/today", row.linkedFromLiveScoreToday],
    ["/live-cricket-score", row.linkedFromLiveCricketScore],
    ["/cricket-schedule/today", row.linkedFromScheduleToday]
  ];
  return `
    <div class="cell-stack">
      <span class="status-badge ${row.inSitemap ? "good" : "bad"}">${row.inSitemap ? "sitemap" : "missing"}</span>
      <div class="mini-chip-list">
        ${chips.map(([label, present]) => `<span class="mini-chip ${present ? "good" : "bad"}">${escapeHtml(label)} ${present ? "yes" : "no"}</span>`).join("")}
      </div>
      <div class="rank-meta">${row.discoveryHubCount} hubs · sitemap lastmod ${escapeHtml(row.sitemapLastmod || "n/a")}</div>
      <div class="rank-meta">First seen in sitemap ${escapeHtml(formatDateTime(row.history?.firstSeenInSitemapAt))}</div>
    </div>
  `;
}

function renderGoogleCell(row) {
  const label = row.hasClicks
    ? "has clicks"
    : row.hasImpressions
      ? "has impressions"
      : row.indexed
        ? "indexed"
        : row.discoveredButNotIndexed
          ? "discovered"
          : "unknown";
  const tone = row.hasClicks || row.hasImpressions || row.indexed
    ? "good"
    : row.discoveredButNotIndexed
      ? "warn"
      : "bad";
  const inspection = row.inspection || {};
  const verdict = inspection.coverageState || inspection.verdict || "No inspection";
  return `
    <div class="cell-stack">
      <span class="status-badge ${tone}">${escapeHtml(label)}</span>
      <div class="rank-meta">${escapeHtml(verdict)}</div>
      <div class="rank-meta">${formatNumber(row.impressions)} impressions · ${formatNumber(row.clicks)} clicks</div>
      <div class="rank-meta">First seen indexed ${escapeHtml(formatDateTime(row.history?.firstSeenIndexedAt))}</div>
    </div>
  `;
}

function renderHtmlCell(row) {
  const html = row.html || {};
  const tone = row.rawHtmlHealth === "healthy" ? "good" : row.rawHtmlHealth === "thin" ? "warn" : "bad";
  return `
    <div class="cell-stack">
      <span class="status-badge ${tone}">${escapeHtml(row.rawHtmlHealth || "check")}</span>
      <div class="mini-chip-list">
        <span class="mini-chip ${html.sportsEvent ? "good" : "bad"}">SportsEvent ${html.sportsEvent ? "yes" : "no"}</span>
        <span class="mini-chip ${html.faqPresent ? "good" : "warn"}">FAQ ${html.faqPresent ? "yes" : "no"}</span>
        <span class="mini-chip ${html.mentionsPlayingXI ? "good" : "warn"}">Playing XI ${html.mentionsPlayingXI ? "yes" : "no"}</span>
        <span class="mini-chip ${html.mentionsToss ? "good" : "warn"}">Toss ${html.mentionsToss ? "yes" : "no"}</span>
      </div>
    </div>
  `;
}

function renderMatchTable(rows, countSelector, targetSelector, emptyLabel, includeStart = true) {
  document.querySelector(countSelector).textContent = `${rows?.length || 0} tracked`;
  const target = document.querySelector(targetSelector);
  if (!rows?.length) {
    target.innerHTML = `<tr><td colspan="5"><div class="empty-state">${escapeHtml(emptyLabel)}</div></td></tr>`;
    return;
  }
  target.innerHTML = rows.map(row => `
    <tr>
      <td>
        <a class="match-link" href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.slug)}</a>
        <div class="rank-meta">${escapeHtml(row.status)}</div>
      </td>
      <td>
        ${includeStart ? `<div>${escapeHtml(row.startTime || "Unknown start")}</div>` : "—"}
        <div class="rank-meta">${row.hoursUntilMatch !== null && row.hoursUntilMatch !== undefined ? `${formatNumber(row.hoursUntilMatch, 1)}h until start` : "No start time"}</div>
      </td>
      <td>${renderDiscoveryCell(row)}</td>
      <td>${renderGoogleCell(row)}</td>
      <td>${renderHtmlCell(row)}</td>
    </tr>
  `).join("");
}

function renderFreshnessTable(rows) {
  document.querySelector("#freshness-count").textContent = `${rows?.length || 0} tracked`;
  const target = document.querySelector("#freshness-page-table");
  if (!rows?.length) {
    target.innerHTML = '<tr><td colspan="4"><div class="empty-state">No freshness pages are being monitored yet.</div></td></tr>';
    return;
  }

  target.innerHTML = rows.map(row => {
    const html = row.html || {};
    const typeLabel = row.pageType === "preview" ? "preview" : row.pageType === "result" ? "result" : "live updates";
    const proofTone = row.rawHtmlHealth === "healthy" ? "good" : row.rawHtmlHealth === "thin" ? "warn" : "bad";
    return `
      <tr>
        <td>
          <a class="match-link" href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.slug || row.url)}</a>
          <div class="rank-meta">${escapeHtml(typeLabel)} · ${escapeHtml(row.category || "sample")}</div>
        </td>
        <td>
          <div class="cell-stack">
            <span class="status-badge ${row.inSitemap ? "good" : "bad"}">${row.inSitemap ? "sitemap" : "missing"}</span>
            <div class="mini-chip-list">
              ${(row.discoveryHubs || []).slice(0, 3).map(path => `<span class="mini-chip good">${escapeHtml(path)}</span>`).join("")}
            </div>
            <div class="rank-meta">${row.discoveryHubCount || 0} hubs · lastmod ${escapeHtml(row.sitemapLastmod || "n/a")}</div>
          </div>
        </td>
        <td>
          <div class="cell-stack">
            <span class="status-badge ${row.linkedFromCanonical ? "good" : "bad"}">${row.linkedFromCanonical ? "linked from canonical" : "missing from canonical"}</span>
            <div class="rank-meta"><a class="match-link" href="${escapeHtml(row.canonicalUrl)}" target="_blank" rel="noreferrer">Open canonical</a></div>
            <div class="rank-meta">${row.retainedInArchive ? "retained in archive or series graph" : "retention not yet proven"}</div>
          </div>
        </td>
        <td>
          <div class="cell-stack">
            <span class="status-badge ${proofTone}">${escapeHtml(row.rawHtmlHealth || "check")}</span>
            <div class="mini-chip-list">
              <span class="mini-chip ${html.newsArticle ? "good" : "warn"}">NewsArticle ${html.newsArticle ? "yes" : "no"}</span>
              <span class="mini-chip ${html.liveBlogPosting ? "good" : "warn"}">LiveBlogPosting ${html.liveBlogPosting ? "yes" : "no"}</span>
              <span class="mini-chip ${html.keyEvents ? "good" : "warn"}">Key events ${html.keyEvents ? "yes" : "no"}</span>
              <span class="mini-chip ${html.publishedTimestamp && html.updatedTimestamp ? "good" : "warn"}">Timestamps ${html.publishedTimestamp && html.updatedTimestamp ? "yes" : "no"}</span>
              <span class="mini-chip ${html.keywordOwnership ? "good" : "warn"}">Ownership ${html.keywordOwnership ? "yes" : "no"}</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderRankList(selector, rows, type) {
  const target = document.querySelector(selector);
  if (!rows?.length) {
    target.innerHTML = '<div class="empty-state">No GSC data for this period.</div>';
    return;
  }
  target.innerHTML = rows.slice(0, 10).map((row, index) => {
    const title = type === "page" ? row.url.split("/").at(-1) : row.query;
    return `
      <div class="rank-row">
        <strong>${index + 1}</strong>
        <div>
          <div class="rank-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
          <div class="rank-meta">${formatNumber(row.impressions)} impressions · ${formatNumber(row.clicks)} clicks · ${formatPercent(row.ctr)} CTR</div>
        </div>
        <span class="status-badge ${row.position <= 10 ? "good" : "warn"}">#${formatNumber(row.position, 1)}</span>
      </div>
    `;
  }).join("");
}

function renderSerpBear(serpbear) {
  const status = document.querySelector("#serpbear-status");
  const content = document.querySelector("#serpbear-content");
  status.textContent = serpbear.configured ? "import connected" : "not configured";
  if (!serpbear.configured) {
    content.innerHTML = `
      <div class="empty-state">
        SerpBear is not running or connected. Add a JSON export using <code>SERPBEAR_EXPORT_PATH</code>.
        GSC remains the source of truth until rank data is configured.
      </div>
    `;
    return;
  }
  renderRankList("#serpbear-content", (serpbear.keywords || []).map(row => ({
    query: row.keyword,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    position: row.position
  })), "query");
}

function renderCompetitorKeywords(payload) {
  const status = document.querySelector("#competitor-status");
  const summary = document.querySelector("#competitor-summary");
  const content = document.querySelector("#competitor-content");
  const competitors = payload?.competitors || [];

  if (!payload?.available) {
    status.textContent = "tool missing";
    content.innerHTML = '<div class="empty-state">Competitor keyword discovery script is not available in this checkout.</div>';
    summary.innerHTML = "";
    return;
  }

  if (payload.running) {
    status.textContent = "running";
  } else if (payload.error) {
    status.textContent = "attention";
  } else if (payload.generatedAt) {
    status.textContent = `last run ${formatDateTime(payload.generatedAt)}`;
  } else {
    status.textContent = "not run yet";
  }

  summary.innerHTML = [
    `<span class="source-pill ${payload.available ? "ok" : "bad"}">Tool ${payload.available ? "available" : "missing"}</span>`,
    `<span class="source-pill ${payload.running ? "ok" : "bad"}">Run state: ${payload.running ? "in progress" : "idle"}</span>`,
    `<span class="source-pill ${payload.configured ? "ok" : "bad"}">Results: ${payload.configured ? `${competitors.length} competitor sets` : "no artifact yet"}</span>`
  ].join("");

  if (payload.error) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(payload.error)}</div>`;
    return;
  }

  if (!competitors.length) {
    content.innerHTML = '<div class="empty-state">Run competitor discovery to populate likely keyword targets from CREX, Cricbuzz, and ESPNcricinfo.</div>';
    return;
  }

  content.innerHTML = competitors.map(entry => {
    const keywords = (entry.keywords || []).slice(0, 10);
    const intents = (entry.intentBreakdown || []).slice(0, 4);
    const topPages = (entry.pageSummaries || []).slice(0, 3);
    return `
      <article class="competitor-card">
        <div class="health-row">
          <div>
            <div class="health-path">${escapeHtml(entry.competitor || "competitor")}</div>
            <div class="health-meta">${formatNumber(entry.pageCount || 0)} pages scanned</div>
          </div>
          <span class="status-badge good">${formatNumber(entry.keywordCount || keywords.length)} phrases</span>
        </div>
        <div class="mini-chip-list">
          ${intents.map(intent => `<span class="mini-chip good">${escapeHtml(intent.intent)} ${formatNumber(intent.keywordCount || 0)}</span>`).join("")}
        </div>
        <div class="rank-list competitor-sublist">
          ${topPages.map(page => `
            <div class="rank-row">
              <strong>${escapeHtml(page.pageLabel)}</strong>
              <div>
                <div class="rank-title">${escapeHtml(page.topPhrases?.[0] || page.url || "")}</div>
                <div class="rank-meta">${escapeHtml(page.url || "")}</div>
              </div>
              <span class="status-badge warn">${formatNumber(page.signalScore || 0)}</span>
            </div>
          `).join("")}
        </div>
        <div class="rank-list">
          ${keywords.map((keyword, index) => `
            <div class="rank-row">
              <strong>${index + 1}</strong>
              <div>
                <div class="rank-title">${escapeHtml(keyword.phrase)}</div>
                <div class="rank-meta">${escapeHtml(keyword.intent || "general")} · ${formatNumber(keyword.sourceCount || 0)} sources · ${escapeHtml((keyword.pageLabels || []).join(", "))}</div>
              </div>
              <span class="status-badge ${keyword.score >= 10 ? "good" : "warn"}">${formatNumber(keyword.score || 0)}</span>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function render(data) {
  const generatedAt = data.generatedAt ? new Date(data.generatedAt).toLocaleString() : "Waiting for first refresh";
  document.querySelector("#generated-at").textContent = data.loading
    ? (data.loadingMessage || "Loading production signals...")
    : `Evidence refreshed ${generatedAt}`;
  document.querySelector("#date-range").textContent = data.dateRange?.start && data.dateRange?.end
    ? `${data.dateRange.start} → ${data.dateRange.end}`
    : "Loading date range...";
  renderSources(data);
  renderSummary(data);
  renderBucketStrip(data);
  renderManualQueue(data);
  renderTrend(data.trend);
  renderHubHealth(data.hubHealth);
  renderMatchTable(data.liveMatches, "#live-count", "#live-match-table", "No matches are currently marked LIVE.");
  renderMatchTable(
    data.upcomingMatches,
    "#upcoming-count",
    "#upcoming-match-table",
    "No upcoming discovery samples in the configured early window."
  );
  renderMatchTable(
    data.recentMatches,
    "#recent-count",
    "#recent-match-table",
    "No recently completed match samples are being monitored."
  );
  renderFreshnessTable(data.freshnessPages || []);
  renderRankList("#top-pages", data.topPages, "page");
  renderRankList("#top-queries", data.topQueries, "query");
  renderSerpBear(data.serpbear || {});
  renderCompetitorKeywords(data.competitorKeywords || {});
}

async function loadDashboard(force = false) {
  if (state.loading) return;
  state.loading = true;
  const button = document.querySelector("#refresh-button");
  button.disabled = true;
  button.textContent = force ? "Refreshing..." : "Loading...";
  try {
    const response = await fetch(`/api/dashboard${force ? "?refresh=1" : ""}`);
    if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
    const data = await response.json();
    render(data);
    if (data.loading) {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadDashboard(false), 5000);
    }
  } catch (error) {
    document.querySelector("#source-strip").innerHTML = `<span class="source-pill bad">${escapeHtml(error.message)}</span>`;
  } finally {
    state.loading = false;
    button.disabled = false;
    button.textContent = "Refresh evidence";
  }
}

async function runCompetitorDiscovery() {
  const button = document.querySelector("#competitor-run-button");
  button.disabled = true;
  button.textContent = "Running...";
  try {
    const response = await fetch("/api/competitor-keywords/run", { method: "POST" });
    if (!response.ok) throw new Error(`Competitor API returned ${response.status}`);
    const payload = await response.json();
    renderCompetitorKeywords(payload);
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => loadDashboard(false), 4000);
  } catch (error) {
    document.querySelector("#competitor-content").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = "Run competitor discovery";
  }
}

document.querySelector("#refresh-button").addEventListener("click", () => loadDashboard(true));
document.querySelector("#competitor-run-button").addEventListener("click", () => runCompetitorDiscovery());
loadDashboard();
