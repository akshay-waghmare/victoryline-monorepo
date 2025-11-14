/**
 * URL utilities for SEO-optimized match, team, and player URLs
 */

export interface MatchUrlParams {
  tournament: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  format: string;
  date: string; // YYYY-MM-DD format
}

export interface TeamUrlParams {
  teamName: string;
}

export interface PlayerUrlParams {
  playerName: string;
}

/**
 * Generates SEO-friendly match URL following the pattern:
 * /match/{tournament}/{season}/{home-team}-vs-{away-team}/{format}/{date}
 *
 * Example: /match/ipl/2023/mumbai-indians-vs-chennai-super-kings/t20/2023-05-29
 */
export function buildMatchUrl(params: MatchUrlParams): string {
  const {
    tournament,
    season,
    homeTeam,
    awayTeam,
    format,
    date
  } = params;

  return `/match/${slugify(tournament)}/${slugify(season)}/${slugify(homeTeam)}-vs-${slugify(awayTeam)}/${slugify(format)}/${date}`;
}

/**
 * Generates SEO-friendly team URL following the pattern:
 * /team/{team-name}
 *
 * Example: /team/mumbai-indians
 */
export function buildTeamUrl(params: TeamUrlParams): string {
  const { teamName } = params;
  return `/team/${slugify(teamName)}`;
}

/**
 * Generates SEO-friendly player URL following the pattern:
 * /player/{player-name}
 *
 * Example: /player/virat-kohli
 */
export function buildPlayerUrl(params: PlayerUrlParams): string {
  const { playerName } = params;
  return `/player/${slugify(playerName)}`;
}

/**
 * Parses match URL to extract parameters
 */
export function parseMatchUrl(url: string): MatchUrlParams | null {
  try {
    const path = url.replace(/^\/match\//, '');
    const parts = path.split('/');

    if (parts.length !== 5) {
      return null;
    }

    const [tournament, season, teamsString, format, date] = parts;
    const teamsParts = teamsString.split('-vs-');

    if (teamsParts.length !== 2) {
      return null;
    }

    return {
      tournament: deslugify(tournament),
      season: deslugify(season),
      homeTeam: deslugify(teamsParts[0]),
      awayTeam: deslugify(teamsParts[1]),
      format: deslugify(format),
      date: date // Keep date as-is (already in YYYY-MM-DD format)
    };
  } catch (error) {
    console.error('Error parsing match URL:', error);
    return null;
  }
}

/**
 * Parses team URL to extract team name
 */
export function parseTeamUrl(url: string): TeamUrlParams | null {
  try {
    const path = url.replace(/^\/team\//, '');
    return {
      teamName: deslugify(path)
    };
  } catch (error) {
    console.error('Error parsing team URL:', error);
    return null;
  }
}

/**
 * Parses player URL to extract player name
 */
export function parsePlayerUrl(url: string): PlayerUrlParams | null {
  try {
    const path = url.replace(/^\/player\//, '');
    return {
      playerName: deslugify(path)
    };
  } catch (error) {
    console.error('Error parsing player URL:', error);
    return null;
  }
}

/**
 * Converts a string to a URL-safe slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove non-word chars except hyphens
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');       // Remove leading/trailing hyphens
}

/**
 * Converts a slug back to a readable string
 */
export function deslugify(slug: string): string {
  return slug
    .replace(/-/g, ' ')              // Replace hyphens with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
}

/**
 * Builds canonical URL with host
 */
export function buildCanonicalUrl(path: string, host: string = 'https://www.crickzen.com'): string {
  return new URL(path, host).toString();
}

/**
 * Validates if a URL matches the expected pattern
 */
export function isValidMatchUrl(url: string): boolean {
  const matchPattern = /^\/match\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+-vs-[a-z0-9-]+\/[a-z0-9]+\/\d{4}-\d{2}-\d{2}$/;
  return matchPattern.test(url);
}

export function isValidTeamUrl(url: string): boolean {
  const teamPattern = /^\/team\/[a-z0-9-]+$/;
  return teamPattern.test(url);
}

export function isValidPlayerUrl(url: string): boolean {
  const playerPattern = /^\/player\/[a-z0-9-]+$/;
  return playerPattern.test(url);
}

/**
 * Generates a match URL from legacy match ID (for backward compatibility)
 */
export function buildMatchUrlFromLegacyId(matchId: string | number): string {
  // For now, use a simple pattern until we have full match data
  return `/cric-live/${matchId}`;
}

/**
 * URL utilities for social sharing
 */
export interface SocialUrlParams {
  url: string;
  text?: string;
  hashtags?: string[];
}

export function buildTwitterShareUrl(params: SocialUrlParams): string {
  const baseUrl = 'https://twitter.com/intent/tweet';
  const searchParams = new URLSearchParams();

  searchParams.set('url', params.url);
  if (params.text) {
    searchParams.set('text', params.text);
  }
  if (params.hashtags && params.hashtags.length > 0) {
    searchParams.set('hashtags', params.hashtags.join(','));
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

export function buildFacebookShareUrl(url: string): string {
  const baseUrl = 'https://www.facebook.com/sharer/sharer.php';
  const searchParams = new URLSearchParams();
  searchParams.set('u', url);

  return `${baseUrl}?${searchParams.toString()}`;
}

export function buildWhatsAppShareUrl(params: SocialUrlParams): string {
  const baseUrl = 'https://wa.me/';
  const text = params.text ? `${params.text} ${params.url}` : params.url;
  const searchParams = new URLSearchParams();
  searchParams.set('text', text);

  return `${baseUrl}?${searchParams.toString()}`;
}
