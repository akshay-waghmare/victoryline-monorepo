import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ServerModule, ServerTransferStateModule } from '@angular/platform-server';
import { ModuleMapLoaderModule } from '@nguniversal/module-map-ngfactory-loader';
import { RxStompService } from '@stomp/ng2-stompjs';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { ServerApiInterceptor } from './ssr/server-api.interceptor';
import { ServerRxStompService } from './ssr/server-rx-stomp.service';

@NgModule({
  imports: [
    AppModule,
    ServerModule,
    ServerTransferStateModule,
    ModuleMapLoaderModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ServerApiInterceptor,
      multi: true
    },
    {
      provide: RxStompService,
      useClass: ServerRxStompService
    }
  ],
  bootstrap: [AppComponent]
})
export class AppServerModule {}
