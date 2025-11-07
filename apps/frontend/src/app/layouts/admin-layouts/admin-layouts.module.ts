import { AddCustomerComponent } from './../../add-customer/add-customer.component';
import { RouteReuseStrategy, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '@angular/cdk/layout';
import { AdminLayoutsRoute } from './admin-layouts.routing';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { AddServiceComponent } from '../../add-service/add-service.component';
import { ServiceListComponent } from '../../service-list/service-list.component';
import { CustomerListComponent } from '../../customer-list/customer-list.component';
import { AddFullerComponent } from '../../add-fuller/add-fuller.component';
import { FullerListComponent } from '../../fuller-list/fuller-list.component';
import { LoginComponent } from 'src/app/login/login.component';
import { TennisService } from 'src/app/tennis-card-list/tennis-list/tennis.service';
import { TennisaRankingService } from 'src/app/tennis-card-list/tennis-list/tennis-ranking/tennisa-ranking.service';
import { LogoutFormComponent } from 'src/app/logout-form/logout-form.component';

import {
  MatFormFieldModule,
  MatButtonModule,
  MatInputModule,
  MatRippleModule,
  MatTableModule,
  MatIconModule,
  MatCardModule,
  MatTabsModule,
  MatDividerModule,
  MatGridListModule,
  MatToolbarModule,
  MatSelectModule,
  MatDatepickerModule,
  MatNativeDateModule,
  DateAdapter,
  MAT_DATE_LOCALE,
  MatList,
  MatListModule,
  MatSnackBar,
  MatSnackBarModule,
  MatProgressSpinnerModule,
  MatExpansionModule,
  MatSliderModule,
  MatProgressBarModule,
  MatTooltipModule
} from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthenticationGuard } from 'src/app/authentication.guard';
import { BetMarketComponent } from 'src/app/bet-market/bet-market.component';
import { StompService, StompConfig ,rxStompServiceFactory ,RxStompService, InjectableRxStompConfig  } from '@stomp/ng2-stompjs';
import { FootballCardListComponent } from 'src/app/football-card-list/football-card-list.component';
import { TennisListComponent } from 'src/app/tennis-card-list/tennis-list/tennis-list.component';
import { TennisCardListComponent } from 'src/app/tennis-card-list/tennis-card-list.component';
import { TennisRankingComponent } from 'src/app/tennis-card-list/tennis-list/tennis-ranking/tennis-ranking.component';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule, MomentDateAdapter } from '@angular/material-moment-adapter';
import { CricketOddsComponent } from 'src/app/cricket-odds/cricket-odds.component';
import { BetHistoryComponent } from 'src/app/bet-history/bet-history.component';
import { environment } from 'src/environments/environment';
import { ComponentsModule } from 'src/app/component/components.module';
import { ProfitLossComponent } from 'src/app/profit-loss/profit-loss.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Ensure this is imported
import { ScrapeControlComponent } from 'src/app/scrape-control/scrape-control.component';
import { HomeComponent } from 'src/app/home/home.component';
import { ScorecardComponent } from 'src/app/scorecard/scorecard.component';
import { PrivacyPolicyComponent } from 'src/app/privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from 'src/app/terms-of-service/terms-of-service.component';

// New match card components
import { MatchCardComponent } from 'src/app/features/matches/components/match-card/match-card.component';
import { SkeletonCardComponent } from 'src/app/shared/components/skeleton-card/skeleton-card.component';
import { MatchesListComponent } from 'src/app/features/matches/pages/matches-list/matches-list.component';
import { TabNavComponent } from 'src/app/shared/components/tab-nav/tab-nav.component';

// 002-match-details-ux: Shared components
import { StalenessIndicatorComponent } from 'src/app/shared/components/staleness-indicator/staleness-indicator.component';

// 002-match-details-ux: Cricket odds feature components
import { SnapshotHeaderComponent } from 'src/app/cricket-odds/components/snapshot-header/snapshot-header.component';
import { ScorecardComponent as MatchDetailsScorecardComponent } from 'src/app/cricket-odds/components/scorecard/scorecard.component';
import { LineupsComponent } from 'src/app/cricket-odds/components/lineups/lineups.component';
import { MatchDetailsInfoComponent } from 'src/app/cricket-odds/components/match-info/match-info.component';



const myRxStompConfig: InjectableRxStompConfig = {
  // added '/websocket' for spring boot SockJS
  brokerURL: environment.ws.brokerURL,
  connectHeaders: {
    login: 'guest',
    passcode: 'guest'
  },
  heartbeatIncoming: 0,
  heartbeatOutgoing: 20000, // 20000 - every 20 seconds
  reconnectDelay: 5000,
  debug: (msg: string): void => {
    console.log(new Date(), msg);
  }
};

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(AdminLayoutsRoute),
    FormsModule,
    MatTableModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatButtonModule,
    MatProgressBarModule,
    MatInputModule,
    MatRippleModule,
    MatSliderModule,
    FormsModule, // Ensure FormsModule is imported as well
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDividerModule,
    MatGridListModule,
    MatToolbarModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule, 
  MatMomentDateModule,
  MatListModule,
  LayoutModule,
    ComponentsModule,
    MatSnackBarModule, // Import MatSnackBarModule
    MatTooltipModule, // Import MatTooltipModule for navbar tooltips (T046)
    
  
  ],
  declarations: [
    DashboardComponent,
    AddServiceComponent,
    ServiceListComponent,
    AddCustomerComponent,
    CustomerListComponent,
    AddFullerComponent,
    FullerListComponent,
    BetMarketComponent,
    FootballCardListComponent,
    TennisListComponent,
    TennisCardListComponent,
    TennisRankingComponent,
    CricketOddsComponent,
    BetHistoryComponent,
    ProfitLossComponent,
    ScrapeControlComponent,
    HomeComponent,
    ScorecardComponent,
    PrivacyPolicyComponent,
    TermsOfServiceComponent,
    // New match card components
    MatchCardComponent,
    SkeletonCardComponent,
    MatchesListComponent,
    TabNavComponent,
    // 002-match-details-ux: Shared components
    StalenessIndicatorComponent,
    // 002-match-details-ux: Cricket odds feature components
    SnapshotHeaderComponent,
    MatchDetailsScorecardComponent,
    LineupsComponent,
    MatchDetailsInfoComponent,
    
  ],
  providers: [
    
    RxStompService,
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    {
      provide: InjectableRxStompConfig,
      useValue: myRxStompConfig
    },
    {
      provide: RxStompService,
      useFactory: rxStompServiceFactory,
      deps: [InjectableRxStompConfig]
    }
  ],
  exports: [
    RouterModule
  ],
})
export class AdminLayoutsModule {
}

