import { RouteReuseStrategy, RouterModule } from '@angular/router';
import { BrowserModule, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';

import { AppComponent } from './app.component';
import { AppRoutingModule } from '../app/app.routing';
import { AdminLayoutsComponent } from './layouts/admin-layouts/admin-layouts.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SidebarComponent } from './component/sidebar/sidebar.component';
import {ComponentsModule} from '../app/component/components.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CustomHammerConfig } from './hammer-config';


import 'hammerjs';
import { LoginComponent } from './login/login.component';
import {
  MatFormFieldModule,
  MatButtonModule,
  MatInputModule,
  MatRippleModule,
  MatProgressSpinnerModule,
  MatToolbarModule,
  MatIconModule,
  MatDialogModule,
  MatTooltipModule,
  MatSnackBar
} from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthenticationGuard } from './authentication.guard';
import { TokenStorage } from './token.storage';
import { LoaderComponent } from './loader/loader.component';
import { LoaderService } from './loader/loader.service';
import { LoaderInterceptor } from './loader/loader.interceptor';
import { StompService, StompConfig } from '@stomp/ng2-stompjs';
import { ElapsedTimePipe } from './utils/elapsed-time.pipe';
import { CustomReuseStrategy } from './custom-reuse-strategy';
import { environment } from 'src/environments/environment';
import { LogoutFormComponent } from './logout-form/logout-form.component';
import { LazyMediaService } from './seo/lazy-media.service';

// Mobile-first components
import { ViewportService } from './services/viewport.service';
import { LazyImageComponent } from './components/lazy-image/lazy-image.component';
import { LoadingSkeletonComponent } from './components/loading-skeleton/loading-skeleton.component';
import { MatchCardComponent } from './components/match-card/match-card.component';
import { StickyHeaderComponent } from './components/sticky-header/sticky-header.component';
import { TouchFeedbackDirective } from './directives/touch-feedback.directive';
import { SwipeGestureDirective } from './directives/swipe-gesture.directive';
import { PullToRefreshDirective } from './directives/pull-to-refresh.directive';
//import { HomeComponent } from './home/home.component';


const stompConfig: StompConfig = {
  // added '/websocket' for spring boot SockJS
  url: environment.ws.brokerURL,
  headers: {
    login: 'guest',
    passcode: 'guest'
  },
  heartbeat_in: 0,
  heartbeat_out: 20000, // 20000 - every 20 seconds
  reconnect_delay: 5000,
  debug: true
};


@NgModule({
  declarations: [
    AppComponent,
    AdminLayoutsComponent,
    LoginComponent,
    LoaderComponent,
    ElapsedTimePipe,
    
    // Mobile-first components
    LazyImageComponent,
    LoadingSkeletonComponent,
    MatchCardComponent,
    StickyHeaderComponent,
    TouchFeedbackDirective,
    SwipeGestureDirective,
    PullToRefreshDirective,
    
        
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AppRoutingModule,
    ComponentsModule,
    BrowserAnimationsModule,
    MatRippleModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,


  ],
  entryComponents: [
    LogoutFormComponent // Ensure the component is in entryComponents
  ],
  providers: [AuthenticationGuard,TokenStorage,
    LoaderService,
    HttpClientModule,
    StompConfig,
    {
      provide: APP_INITIALIZER,
      useFactory: (lazyMediaService: LazyMediaService) => () => lazyMediaService.init(),
      deps: [LazyMediaService],
      multi: true
    },
    {provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
    { provide: HTTP_INTERCEPTORS,useValue: stompConfig, useClass: LoaderInterceptor, multi: true },
    { provide: HAMMER_GESTURE_CONFIG, useClass: CustomHammerConfig }],
  bootstrap: [AppComponent],
  
  // exports: [SidebarComponent]
})
export class AppModule { }
