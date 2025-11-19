import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { BlogRoutingModule } from './blog-routing.module';
import { BlogListComponent } from './list/blog-list.component';
import { BlogDetailComponent } from './detail/blog-detail.component';
import { BlogApiService } from './blog-api.service';
import { BlogSeoService } from './blog-seo.service';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    BlogListComponent,
    BlogDetailComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    BlogRoutingModule,
    SharedModule
  ],
  providers: [
    BlogApiService,
    BlogSeoService
  ]
})
export class BlogModule { }
