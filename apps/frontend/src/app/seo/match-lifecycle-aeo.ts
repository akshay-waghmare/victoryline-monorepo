export type MatchLifecycleAeoLifecycle =
  | 'upcoming'
  | 'live'
  | 'innings-break'
  | 'completed'
  | 'delayed'
  | 'abandoned'
  | 'unknown';

export type MatchLifecycleAeoDataState = 'populated' | 'loading' | 'error';

export interface MatchLifecycleAeoFact {
  label: string;
  value: string;
}

export interface MatchLifecycleAeoInput {
  teams: string;
  status: string;
  series?: string | null;
  venue?: string | null;
  scheduledLabel?: string | null;
  score?: string | null;
  result?: string | null;
  toss?: string | null;
  modelAnswer?: string | null;
}

export interface MatchLifecycleAeoBlock {
  lifecycle: Exclude<MatchLifecycleAeoLifecycle, 'unknown'>;
  heading: string;
  answer: string;
  facts: MatchLifecycleAeoFact[];
  modelAnswer: string | null;
}

function clean(value: any): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isUsableIdentity(teams: string): boolean {
  var normalized = clean(teams).toLowerCase();
  return !!normalized
    && normalized !== 'cricket match'
    && normalized !== 'team a vs team b'
    && normalized.indexOf('unknown') === -1
    && normalized.indexOf('tbd') === -1;
}

export function deriveMatchLifecycleAeoLifecycle(status: string, context: string = ''): MatchLifecycleAeoLifecycle {
  var normalized = clean(status + ' ' + context)
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!normalized) {
    return 'unknown';
  }

  if (/ABANDON|NO_RESULT|NORESULT/.test(normalized)) {
    return 'abandoned';
  }

  if (/DELAY|POSTPON|RAIN_DELAY/.test(normalized)) {
    return 'delayed';
  }

  if (/INNINGS_BREAK|INNINGSBREAK|STUMPS|DAY_BREAK/.test(normalized)) {
    return 'innings-break';
  }

  if (/COMPLET|FINISH|RESULT|WON_BY|DRAW|TIED/.test(normalized)) {
    return 'completed';
  }

  if (/UPCOMING|SCHEDULE|FIXTURE|NOT_STARTED|NOTSTARTED/.test(normalized)) {
    return 'upcoming';
  }

  if (/LIVE|IN_PROGRESS|INPROGRESS|STARTED|PLAYING/.test(normalized)) {
    return 'live';
  }

  return 'unknown';
}

export function buildMatchLifecycleAeoBlock(input: MatchLifecycleAeoInput): MatchLifecycleAeoBlock | null {
  var teams = clean(input && input.teams);
  if (!input || !isUsableIdentity(teams)) {
    return null;
  }

  var series = clean(input.series);
  var venue = clean(input.venue);
  var scheduled = clean(input.scheduledLabel);
  var score = clean(input.score);
  var result = clean(input.result);
  var toss = clean(input.toss);
  var lifecycle = deriveMatchLifecycleAeoLifecycle(input.status, result);

  if (lifecycle === 'unknown') {
    return null;
  }

  var competitionCopy = series ? ' in ' + series : '';
  var answer: string;
  var label: string;

  switch (lifecycle) {
    case 'upcoming':
      label = 'Upcoming match';
      answer = teams + ' is scheduled as an upcoming cricket match' + competitionCopy + '.'
        + (scheduled ? ' Start: ' + scheduled + '.' : ' The official start time is not yet available.')
        + (venue ? ' Venue: ' + venue + '.' : ' Venue details are not yet available.');
      break;
    case 'live':
      label = 'Live match';
      answer = teams + ' is live' + competitionCopy + '.'
        + (score ? ' Current score: ' + score + '.' : ' The verified match payload does not include a current score.')
        + (venue ? ' Venue: ' + venue + '.' : '');
      break;
    case 'innings-break':
      label = 'Innings break';
      answer = teams + ' is at an innings break' + competitionCopy + '.'
        + (score ? ' Current score: ' + score + '.' : ' The verified match payload does not include the current score.')
        + (venue ? ' Venue: ' + venue + '.' : '');
      break;
    case 'completed':
      label = 'Completed match';
      answer = teams + ' is completed' + competitionCopy + '.'
        + (result ? ' Result: ' + result + '.' : ' The official final result is being confirmed.');
      break;
    case 'delayed':
      label = 'Match delayed';
      answer = teams + ' is delayed' + competitionCopy + '.'
        + (result ? ' Match note: ' + result + '.' : ' The next official update will confirm when play can resume.');
      break;
    case 'abandoned':
      label = 'Match abandoned or no result';
      answer = teams + ' was abandoned or recorded as no result' + competitionCopy + '.'
        + (result ? ' Official note: ' + result + '.' : ' No completed result is available.');
      break;
    default:
      return null;
  }

  var facts: MatchLifecycleAeoFact[] = [
    { label: 'Teams', value: teams },
    { label: 'Status', value: label }
  ];

  if (series) {
    facts.push({ label: 'Series', value: series });
  }
  if (scheduled) {
    facts.push({ label: 'Start time', value: scheduled });
  }
  if (venue) {
    facts.push({ label: 'Venue', value: venue });
  }
  if (score) {
    facts.push({ label: 'Score', value: score });
  }
  if (result) {
    facts.push({ label: 'Result', value: result });
  }
  if (toss) {
    facts.push({ label: 'Toss', value: toss });
  }

  return {
    lifecycle: lifecycle as Exclude<MatchLifecycleAeoLifecycle, 'unknown'>,
    heading: teams + ' — ' + label,
    answer: answer,
    facts: facts.slice(0, 8),
    modelAnswer: clean(input.modelAnswer) || null
  };
}
