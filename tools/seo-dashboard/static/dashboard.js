const state = { loading: false };

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatPercent(value) {
  return `${formatNumber(Number(value || 0) * 100, 1)}%`;
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
    liveFeed: "Live feed"
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
  const liveMatches = data.liveMatches || [];
  const discoveredMatches = liveMatches.filter(row => row.discoveryHubCount > 0);
  const metrics = [
    ["Live URLs", liveMatches.length, 0, value => formatNumber(value)],
    ["Hub-discovered", discoveredMatches.length, 0, value => formatNumber(value)],
    ["Impressions", summary.impressions, delta.impressions, value => formatNumber(value)],
    ["Clicks", summary.clicks, delta.clicks, value => formatNumber(value)],
    ["CTR", summary.ctr, delta.ctr, value => formatPercent(value)],
    ["Avg position", summary.position, delta.position, value => formatNumber(value, 1)]
  ];
  document.querySelector("#summary-grid").innerHTML = metrics.map(([label, value, change, formatter]) => `
    <article class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${formatter(value)}</div>
      <div class="metric-delta ${deltaClass(label.toLowerCase().includes("position") ? "position" : label, change)}">
        ${label === "Live URLs" ? "Current backend LIVE catalog" : ""}
        ${label === "Hub-discovered" ? `${discoveredMatches.length}/${liveMatches.length || 0} visible in monitored hubs` : ""}
        ${!["Live URLs", "Hub-discovered"].includes(label) ? `${change > 0 ? "+" : ""}${label === "CTR" ? formatPercent(change) : formatNumber(change, label === "Avg position" ? 1 : 0)} vs previous period` : ""}
      </div>
    </article>
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
    const healthy = row.status === 200 && row.h1Count === 1 && row.canonicalMatches && !row.noindex && row.cricLiveLinks >= 80;
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

function renderLiveMatches(rows) {
  document.querySelector("#live-count").textContent = `${rows?.length || 0} live`;
  const target = document.querySelector("#live-match-table");
  if (!rows?.length) {
    target.innerHTML = '<tr><td colspan="6"><div class="empty-state">No matches are currently marked LIVE.</div></td></tr>';
    return;
  }
  target.innerHTML = rows.map(row => {
    const inspection = row.inspection || {};
    const verdict = inspection.coverageState || inspection.verdict || "Pending";
    const html = row.html || {};
    const htmlGood = html.status === 200 && html.canonicalMatches && html.h1Count === 1 && !html.noindex;
    return `
      <tr>
        <td>
          <a class="match-link" href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.slug)}</a>
          <div class="rank-meta">${escapeHtml(row.status)}</div>
        </td>
        <td>
          <span class="status-badge ${row.inSitemap ? "good" : "bad"}">${row.inSitemap ? "sitemap" : "missing"}</span>
          <div class="rank-meta">${row.discoveryHubCount} hubs</div>
        </td>
        <td>
          <span class="status-badge ${/submitted and indexed|indexed/i.test(verdict) && !/unknown|not indexed/i.test(verdict) ? "good" : "warn"}">${escapeHtml(verdict)}</span>
          <div class="rank-meta">${escapeHtml(inspection.lastCrawlTime || "No crawl time")}</div>
        </td>
        <td>${formatNumber(row.impressions)}</td>
        <td>${row.position ? formatNumber(row.position, 1) : "—"}</td>
        <td><span class="status-badge ${htmlGood ? "good" : "bad"}">${htmlGood ? "valid" : "check"}</span></td>
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

function render(data) {
  document.querySelector("#generated-at").textContent = `Evidence refreshed ${new Date(data.generatedAt).toLocaleString()}`;
  document.querySelector("#date-range").textContent = `${data.dateRange.start} → ${data.dateRange.end}`;
  renderSources(data);
  renderSummary(data);
  renderTrend(data.trend);
  renderHubHealth(data.hubHealth);
  renderLiveMatches(data.liveMatches);
  renderRankList("#top-pages", data.topPages, "page");
  renderRankList("#top-queries", data.topQueries, "query");
  renderSerpBear(data.serpbear || {});
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
    render(await response.json());
  } catch (error) {
    document.querySelector("#source-strip").innerHTML = `<span class="source-pill bad">${escapeHtml(error.message)}</span>`;
  } finally {
    state.loading = false;
    button.disabled = false;
    button.textContent = "Refresh evidence";
  }
}

document.querySelector("#refresh-button").addEventListener("click", () => loadDashboard(true));
loadDashboard();
