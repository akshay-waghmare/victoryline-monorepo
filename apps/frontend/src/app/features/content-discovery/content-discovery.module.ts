import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentDiscoveryComponent } from './content-discovery.component';
import { SearchComponent } from './search.component';
import { MatchSkeletonComponent } from './match-skeleton.component';
import { EmptyStateComponent } from './empty-state.component';

@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [
    ContentDiscoveryComponent, 
    SearchComponent, 
    MatchSkeletonComponent,
    EmptyStateComponent
  ],
  exports: [ContentDiscoveryComponent]
})
export class ContentDiscoveryModule {}
