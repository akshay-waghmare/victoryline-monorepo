export type CommentaryUpdateIntent = 'toss' | 'wicket' | 'innings-break' | 'weather' | 'milestone' | 'chase' | 'boundary' | 'live-update';

export function isMeaningfulCommentaryUpdate(type: any, text: string): boolean {
  var normalizedType = normalizeType(type);
  var normalizedText = normalizeText(text);
  if (!normalizedText) {
    return false;
  }

  if (normalizedType === 'WICKET' || normalizedType === 'OVER_SUMMARY' || normalizedType === 'BOUNDARY') {
    return true;
  }

  return /(toss|won the toss|review|rain|innings break|target|needs|required rate|fifty|hundred|partnership|six|four|wicket|match-winning|wins by|won by|stumps)/i.test(normalizedText);
}

export function getCommentaryUpdateIntent(type: any, text: string): CommentaryUpdateIntent {
  var normalizedType = normalizeType(type);
  var normalizedText = normalizeText(text).toLowerCase();

  if (/toss/.test(normalizedText)) {
    return 'toss';
  }
  if (normalizedType === 'WICKET' || /wicket|out\b/.test(normalizedText)) {
    return 'wicket';
  }
  if (/innings break|stumps|tea|lunch/.test(normalizedText)) {
    return 'innings-break';
  }
  if (/rain|bad light|weather/.test(normalizedText)) {
    return 'weather';
  }
  if (/fifty|hundred|milestone|partnership/.test(normalizedText)) {
    return 'milestone';
  }
  if (/target|needs|required rate|equation/.test(normalizedText)) {
    return 'chase';
  }
  if (normalizedType === 'BOUNDARY' || /four|six/.test(normalizedText)) {
    return 'boundary';
  }

  return 'live-update';
}

export function getCommentaryUpdateLabel(intent: CommentaryUpdateIntent, fallbackLabel?: string): string {
  switch (intent) {
    case 'toss':
      return 'Toss update';
    case 'wicket':
      return 'Wicket moment';
    case 'innings-break':
      return 'Innings change';
    case 'weather':
      return 'Weather update';
    case 'milestone':
      return 'Milestone';
    case 'chase':
      return 'Chase pressure';
    case 'boundary':
      return 'Boundary burst';
    default:
      return fallbackLabel || 'Match update';
  }
}

function normalizeType(type: any): string {
  return String(type || '').toUpperCase();
}

function normalizeText(text: string): string {
  return String(text || '').replace(/\s+/g, ' ').trim();
}
