import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroPodComponent } from './components/hero-pod/hero-pod.component';
import { HeroPodFooterDirective } from './components/hero-pod/hero-pod-footer.directive';
import { LiveHeroComponent } from './components/live-hero/live-hero.component';

@NgModule({
  imports: [CommonModule],
  declarations: [HeroPodComponent, HeroPodFooterDirective, LiveHeroComponent],
  exports: [HeroPodComponent, HeroPodFooterDirective, LiveHeroComponent]
})
export class MatchLiveModule {}
