import { AddCustomerComponent } from './../../add-customer/add-customer.component';
import { Component } from '@angular/core';
import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { HomeComponent } from 'src/app/home/home.component';
import {DashboardComponent} from '../../dashboard/dashboard.component';
import {AddServiceComponent} from '../../add-service/add-service.component';
import { ServiceListComponent } from 'src/app/service-list/service-list.component';
import { CustomerListComponent } from '../../customer-list/customer-list.component';
import { AddFullerComponent } from '../../add-fuller/add-fuller.component';
import { FullerListComponent } from '../../fuller-list/fuller-list.component';
import { LoginComponent } from 'src/app/login/login.component';
import { AuthenticationGuard } from 'src/app/authentication.guard';
import { BetMarketComponent } from 'src/app/bet-market/bet-market.component';
import { TennisListComponent } from 'src/app/tennis-card-list/tennis-list/tennis-list.component';
import { TennisRankingComponent } from 'src/app/tennis-card-list/tennis-list/tennis-ranking/tennis-ranking.component';


import { CricketOddsComponent } from 'src/app/cricket-odds/cricket-odds.component';
import { BetHistoryComponent } from 'src/app/bet-history/bet-history.component';
import { LogoutFormComponent } from 'src/app/logout-form/logout-form.component';
import { ProfitLossComponent } from 'src/app/profit-loss/profit-loss.component';
import { ScrapeControlComponent } from 'src/app/scrape-control/scrape-control.component';
import { ScorecardComponent } from 'src/app/scorecard/scorecard.component';
import { BannerComponent } from 'src/app/component/banner/banner.component';
import { PrivacyPolicyComponent } from 'src/app/privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from 'src/app/terms-of-service/terms-of-service.component';
import { MatchesListComponent } from 'src/app/features/matches/pages/matches-list/matches-list.component';
import { PlayersPageComponent } from 'src/app/features/stats/players-page/players-page.component';
import { TeamsPageComponent } from 'src/app/features/stats/teams-page/teams-page.component';
import { SeriesPageComponent } from 'src/app/features/stats/series-page/series-page.component';
import { LiveScoreHubComponent } from 'src/app/features/seo-hubs/live-score-hub/live-score-hub.component';
import { Error404Component } from 'src/app/shared/components/error-404/error-404.component';
import { normalizeMatchRoutePath } from 'src/app/core/utils/match-utils';

export function cricLiveMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length < 2 || segments[0].path !== 'cric-live') {
    return null;
  }

  var joinedPath = segments
    .slice(1)
    .map(function(segment: UrlSegment) { return segment.path; })
    .join('/');

  var decodedPath = joinedPath;
  try {
    decodedPath = decodeURIComponent(joinedPath);
  } catch (error) {
    decodedPath = joinedPath;
  }

  var normalizedPath = normalizeMatchRoutePath('/cric-live/' + decodedPath);
  var slug = normalizedPath
    ? normalizedPath.replace(/^\/cric-live\//, '')
    : (decodedPath.split('/').filter(Boolean).reverse().find(function(part: string) { return part.indexOf('-vs-') !== -1; }) || segments[1].path);

  return {
    consumed: segments,
    posParams: {
      path: new UrlSegment(slug, {})
    }
  };
}

export const AdminLayoutsRoute: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'Home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'live-cricket-score', component: LiveScoreHubComponent, data: { hubType: 'liveCricketScore' } },
  { path: 'matches', component: MatchesListComponent },
  { path: 'live-score', component: LiveScoreHubComponent, data: { hubType: 'liveScore' } },
  { path: 'live-score/today', component: LiveScoreHubComponent, data: { hubType: 'today' } },
  { path: 'live-score/ipl', component: LiveScoreHubComponent, data: { hubType: 'ipl' } },
  { path: 'live-score/archive', component: LiveScoreHubComponent, data: { hubType: 'archive' } },
  { path: 'live-score/archive/:page', component: LiveScoreHubComponent, data: { hubType: 'archive' } },
  { path: 'cricket-schedule/today', component: LiveScoreHubComponent, data: { hubType: 'scheduleToday' } },
  { path: 'cricket-schedule/ipl-2026', component: LiveScoreHubComponent, data: { hubType: 'iplSchedule' } },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-service', component: AddServiceComponent },
  { path: 'football', component: ServiceListComponent },
  { path: 'add-customer', component: AddCustomerComponent },
  { path: 'customer-list', component: CustomerListComponent },
  { matcher: cricLiveMatcher, component: CricketOddsComponent },
  { path: 'cric-live/:path', component: CricketOddsComponent },
  { path: 'add-fuller', component: AddFullerComponent },
  { path: 'fuller-list', component: FullerListComponent },
  { path: 'bet-market/:id', component: BetMarketComponent },
  { path: 'tennis', component: TennisListComponent },
  { path: 'tennis/atp/ranking', component: TennisRankingComponent },
  { path: 'tennis/wta/ranking', component: TennisRankingComponent },
  { path: 'account/bet-history', component: BetHistoryComponent },
  { path: 'account/profit-loss', component: ProfitLossComponent },
  { path: 'scraping', component: ScrapeControlComponent },
  { path: 'logout', component: LogoutFormComponent },
  { path: 'scorecard', component: ScorecardComponent },
  { path: 'banner', component: BannerComponent},
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'terms-of-service', component: TermsOfServiceComponent },
  { path: 'players', component: PlayersPageComponent },
  { path: 'teams', component: TeamsPageComponent },
  { path: 'series', component: SeriesPageComponent },
  { path: '**', component: Error404Component },
];



