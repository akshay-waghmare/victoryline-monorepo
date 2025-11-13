import { Component, OnInit } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { AnimationService } from './core/services/animation.service';
import { ScrollRestorationService } from './services/scroll-restoration.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'laundry-management-app';

  constructor(
    private themeService: ThemeService,
    private animationService: AnimationService,
    private scrollRestoration: ScrollRestorationService
  ) {
    // Enable scroll restoration for better mobile UX
    // Exclude routes that shouldn't restore scroll (e.g., modals, overlays)
    this.scrollRestoration.enable(['/login', '/logout']);
  }

  ngOnInit(): void {
    // Initialize theme system on app startup
    this.themeService.initialize();
    
    console.log('VictoryLine app initialized with theme system and scroll restoration');
  }
}
