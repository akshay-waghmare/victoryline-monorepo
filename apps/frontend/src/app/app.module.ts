import { RouteReuseStrategy, RouterModule } from '@angular/router';
import { BrowserModule, BrowserTransferStateModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';

import { AppComponent } from './app.component';
import { AppRoutingModule } from '../app/app.routing';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SidebarComponent } from './component/sidebar/sidebar.component';
import {ComponentsModule} from '../app/component/components.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


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
import { HttpClientModule } from '@angular/common/http';
import { AuthenticationGuard } from './authentication.guard';
import { TokenStorage } from './token.storage';
import { ElapsedTimePipe } from './utils/elapsed-time.pipe';
import { CustomReuseStrategy } from './custom-reuse-strategy';
import { LogoutFormComponent } from './logout-form/logout-form.component';
import { LazyMediaService } from './seo/lazy-media.service';
//import { HomeComponent } from './home/home.component';

@NgModule({
  declarations: [
    AppComponent,
    ElapsedTimePipe,
    
    
        
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'crickzen-app' }),
    BrowserTransferStateModule,
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
    HttpClientModule,
    {
      provide: APP_INITIALIZER,
      useFactory: (lazyMediaService: LazyMediaService) => () => lazyMediaService.init(),
      deps: [LazyMediaService],
      multi: true
    },
    {provide: RouteReuseStrategy, useClass: CustomReuseStrategy }],
  bootstrap: [AppComponent],
  
  // exports: [SidebarComponent]
})
export class AppModule { }
