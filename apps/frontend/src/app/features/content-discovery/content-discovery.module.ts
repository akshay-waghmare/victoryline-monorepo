import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentDiscoveryComponent } from './content-discovery.component';
import { SearchComponent } from './search.component';

@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [ContentDiscoveryComponent, SearchComponent],
  exports: [ContentDiscoveryComponent]
})
export class ContentDiscoveryModule {}
