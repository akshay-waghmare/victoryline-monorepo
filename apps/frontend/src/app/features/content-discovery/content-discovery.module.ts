import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ContentDiscoveryComponent } from './content-discovery.component';
import { SearchComponent } from './search.component';
import { MatchSkeletonComponent } from './match-skeleton.component';
import { EmptyStateComponent } from './empty-state.component';
import { LazyLoadDirective } from './lazy-load.directive';

@NgModule({
  imports: [CommonModule, FormsModule, ScrollingModule],
  declarations: [
    ContentDiscoveryComponent,
    SearchComponent,
    MatchSkeletonComponent,
    EmptyStateComponent,
    LazyLoadDirective
  ],
  exports: [ContentDiscoveryComponent]
})
export class ContentDiscoveryModule {}
