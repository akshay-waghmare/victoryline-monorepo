export interface MatchSeoViewModel {
  canonicalPath: string;
  canonicalUrl: string;
  title: string;
  description: string;
  ogImageUrl: string;
  h1: string;
  robots: 'index,follow' | 'noindex,follow';
  teams: string;
  team1: string;
  team2: string;
  series: string;
  statusLabel: string;
  summary: string;
  isIndexable: boolean;
}
