import { LiveHeroViewModel, LiveMatchStatus } from './live-hero.models';

const COMPLETED_RESULT_PATTERN = /won by|match drawn|match tied|match abandoned|abandoned|no result/i;
const COMPLETED_STATUS_PATTERN = /completed|finished|result/i;

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined') {
    return null;
  }

  return trimmed;
}

function isCompletedResult(value: unknown): boolean {
  const text = normalizeText(value);
  return text !== null && COMPLETED_RESULT_PATTERN.test(text);
}

function isCompletedStatus(value: unknown): boolean {
  const text = normalizeText(value);
  return text !== null && COMPLETED_STATUS_PATTERN.test(text);
}

export function getLiveHeroResultSummary(view: LiveHeroViewModel | null, matchInfo?: any): string | null {
  const scoreResult = normalizeText(view && view.score ? view.score.resultSummary : null);
  if (scoreResult) {
    return scoreResult;
  }

  const finalResult = normalizeText(matchInfo && matchInfo.final_result_text);
  if (finalResult) {
    return finalResult;
  }

  const lastKnownState = normalizeText(matchInfo && matchInfo.lastKnownState);
  if (lastKnownState && isCompletedResult(lastKnownState)) {
    return lastKnownState;
  }

  return null;
}

export function isLiveHeroCompleted(view: LiveHeroViewModel | null, matchInfo?: any): boolean {
  if (!view) {
    return false;
  }

  if (view.status === 'COMPLETED') {
    return true;
  }

  if (getLiveHeroResultSummary(view, matchInfo)) {
    return true;
  }

  return isCompletedStatus(matchInfo && (matchInfo.match_status || matchInfo.status));
}

export function getLiveHeroStatusKey(view: LiveHeroViewModel | null, matchInfo?: any): LiveMatchStatus | null {
  if (!view) {
    return null;
  }

  return isLiveHeroCompleted(view, matchInfo) ? 'COMPLETED' : view.status;
}

export function getLiveHeroStatusLabel(view: LiveHeroViewModel | null, matchInfo?: any): string {
  const status = getLiveHeroStatusKey(view, matchInfo);
  if (!status) {
    return '';
  }

  switch (status) {
    case 'INNINGS_BREAK':
      return 'Innings Break';
    case 'COMPLETED':
      return 'Completed';
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

export function shouldShowLiveHeroChase(view: LiveHeroViewModel | null, matchInfo?: any): boolean {
  if (!view || !view.chase || !view.chase.isChasing) {
    return false;
  }

  if (isLiveHeroCompleted(view, matchInfo) || getLiveHeroResultSummary(view, matchInfo)) {
    return false;
  }

  const runsRemaining = view.chase.runsRemaining;
  const ballsRemaining = view.chase.ballsRemaining;

  return typeof runsRemaining === 'number'
    && isFinite(runsRemaining)
    && runsRemaining >= 0
    && typeof ballsRemaining === 'number'
    && isFinite(ballsRemaining)
    && ballsRemaining > 0;
}
