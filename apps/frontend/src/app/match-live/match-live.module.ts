import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HeroPodComponent } from './components/hero-pod/hero-pod.component';
import { HeroPodFooterDirective } from './components/hero-pod/hero-pod-footer.directive';
import { LiveHeroComponent } from './components/live-hero/live-hero.component';
import { HeroCondensedComponent } from './components/hero-condensed/hero-condensed.component';

@NgModule({
  imports: [CommonModule, MatIconModule],
  declarations: [HeroPodComponent, HeroPodFooterDirective, LiveHeroComponent, HeroCondensedComponent],
  exports: [HeroPodComponent, HeroPodFooterDirective, LiveHeroComponent, HeroCondensedComponent]
})
export class MatchLiveModule {}
