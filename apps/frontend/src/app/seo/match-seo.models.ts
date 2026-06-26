import { MatchCanonicalPolicyDecision, MatchRouteIntent } from './match-canonical-policy';

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
  team1Short: string;
  team2Short: string;
  shortTeams: string;
  series: string;
  breadcrumbSeries: string;
  statusLabel: string;
  summary: string;
  isIndexable: boolean;
  routeIntent: MatchRouteIntent;
  canonicalDecision: MatchCanonicalPolicyDecision;
}
