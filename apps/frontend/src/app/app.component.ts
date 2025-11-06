import { Component, OnInit } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { AnimationService } from './core/services/animation.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'laundry-management-app';

  constructor(
    private themeService: ThemeService,
    private animationService: AnimationService
  ) {}

  ngOnInit(): void {
    // Initialize theme system on app startup
    this.themeService.initialize();
    
    console.log('VictoryLine app initialized with theme system');
  }
}
