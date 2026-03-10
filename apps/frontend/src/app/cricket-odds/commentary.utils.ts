const COMMENTARY_TYPE_PRIORITY: { [key: string]: number } = {
  OVER_SUMMARY: 0,
  WICKET: 1,
  BOUNDARY: 2,
  BALL: 3,
  INFO: 4
};

function normalizeText(value: any): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function valueOrFallback(primary: any, fallback: any): any {
  if (primary === undefined || primary === null || primary === '') {
    return fallback;
  }

  return primary;
}

function preferredText(primary: any, fallback: any): string {
  var normalizedPrimary = normalizeText(primary);
  var normalizedFallback = normalizeText(fallback);

  if (!normalizedPrimary) {
    return normalizedFallback;
  }

  if (!normalizedFallback) {
    return normalizedPrimary;
  }

  return normalizedPrimary.length >= normalizedFallback.length ? normalizedPrimary : normalizedFallback;
}

function mergeHighlights(existing: any, incoming: any): any[] {
  var merged: any[] = [];
  var seen: { [key: string]: boolean } = {};

  [existing, incoming].forEach(function(source) {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach(function(item) {
      var key = String(item);
      if (!seen[key]) {
        seen[key] = true;
        merged.push(item);
      }
    });
  });

  return merged;
}

function commentaryTypePriority(type: any): number {
  var normalizedType = String(type || '').toUpperCase();
  return COMMENTARY_TYPE_PRIORITY[normalizedType] !== undefined ? COMMENTARY_TYPE_PRIORITY[normalizedType] : 99;
}

export function getCommentaryEntryKey(entry: any): string {
  if (!entry) {
    return '';
  }

  var normalizedType = String(entry.type || '').toUpperCase();
  var innings = entry.inningsNumber || 0;
  var over = entry.overNumber || 0;
  var ball = entry.ballInOver || 0;

  if (normalizedType === 'OVER_SUMMARY' && (innings || over)) {
    return [
      'summary',
      innings,
      over
    ].join('|');
  }

  if (innings || over || ball) {
    return [
      'ball',
      innings,
      over,
      ball
    ].join('|');
  }

  if (entry.id) {
    return String(entry.id);
  }

  if (entry.delivery) {
    return [
      'delivery',
      innings,
      entry.delivery
    ].join('|');
  }

  return normalizeText(entry.text || '');
}

export function mergeCommentaryEntry(existing: any, incoming: any): any {
  var merged = {
    ...(existing || {}),
    ...(incoming || {})
  };

  merged.text = preferredText(incoming && incoming.text, existing && existing.text);
  merged.type = commentaryTypePriority(incoming && incoming.type) <= commentaryTypePriority(existing && existing.type)
    ? valueOrFallback(incoming && incoming.type, existing && existing.type)
    : valueOrFallback(existing && existing.type, incoming && incoming.type);
  merged.runs = valueOrFallback(incoming && incoming.runs, existing && existing.runs);
  merged.overBall = valueOrFallback(incoming && incoming.overBall, existing && existing.overBall);
  merged.overNumber = valueOrFallback(incoming && incoming.overNumber, existing && existing.overNumber);
  merged.ballInOver = valueOrFallback(incoming && incoming.ballInOver, existing && existing.ballInOver);
  merged.delivery = valueOrFallback(incoming && incoming.delivery, existing && existing.delivery);
  merged.inningsNumber = valueOrFallback(incoming && incoming.inningsNumber, existing && existing.inningsNumber);
  merged.batsmanName = valueOrFallback(incoming && incoming.batsmanName, existing && existing.batsmanName);
  merged.bowlerName = valueOrFallback(incoming && incoming.bowlerName, existing && existing.bowlerName);
  merged.totalScore = valueOrFallback(incoming && incoming.totalScore, existing && existing.totalScore);
  merged.highlights = mergeHighlights(existing && existing.highlights, incoming && incoming.highlights);

  return merged;
}

export function sortCommentaryEntries(entries: any[]): any[] {
  return entries.sort(function(a, b) {
    var innDiff = (b.inningsNumber || 0) - (a.inningsNumber || 0);
    if (innDiff !== 0) {
      return innDiff;
    }

    var overDiff = (b.overNumber || 0) - (a.overNumber || 0);
    if (overDiff !== 0) {
      return overDiff;
    }

    var ballDiff = (b.ballInOver || 0) - (a.ballInOver || 0);
    if (ballDiff !== 0) {
      return ballDiff;
    }

    return commentaryTypePriority(a.type) - commentaryTypePriority(b.type);
  });
}

export function upsertCommentaryEntries(existingEntries: any[], incomingEntries: any[]): any[] {
  var merged = (existingEntries || []).slice();
  var entryIndexByKey: { [key: string]: number } = {};

  merged.forEach(function(entry, index) {
    var key = getCommentaryEntryKey(entry);
    if (key) {
      entryIndexByKey[key] = index;
    }
  });

  (incomingEntries || []).forEach(function(entry) {
    var sanitizedEntry = {
      ...(entry || {}),
      text: normalizeText(entry && entry.text)
    };
    var key = getCommentaryEntryKey(sanitizedEntry);
    if (!key) {
      merged.push(sanitizedEntry);
      return;
    }

    if (entryIndexByKey[key] !== undefined) {
      merged[entryIndexByKey[key]] = mergeCommentaryEntry(merged[entryIndexByKey[key]], sanitizedEntry);
      return;
    }

    entryIndexByKey[key] = merged.length;
    merged.push(sanitizedEntry);
  });

  return sortCommentaryEntries(merged);
}