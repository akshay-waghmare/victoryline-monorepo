import { Component, Input, OnInit } from '@angular/core';
import { StalenessLevel } from '../../models/match.models';

@Component({
  selector: 'app-staleness-indicator',
  templateUrl: './staleness-indicator.component.html',
  styleUrls: ['./staleness-indicator.component.css']
})
export class StalenessIndicatorComponent implements OnInit {
  @Input() lastUpdated?: string; // ISO 8601 timestamp

  StalenessLevel = StalenessLevel;
  currentLevel: StalenessLevel = StalenessLevel.LIVE;
  secondsSinceUpdate = 0;

  ngOnInit(): void {
    this.updateStaleness();
    // Recompute every second
    setInterval(() => this.updateStaleness(), 1000);
  }

  private updateStaleness(): void {
    if (!this.lastUpdated) {
      this.currentLevel = StalenessLevel.ERROR;
      return;
    }

    const now = new Date().getTime();
    const updated = new Date(this.lastUpdated).getTime();
    this.secondsSinceUpdate = Math.floor((now - updated) / 1000);

    if (this.secondsSinceUpdate < 30) {
      this.currentLevel = StalenessLevel.LIVE;
    } else if (this.secondsSinceUpdate < 120) {
      this.currentLevel = StalenessLevel.WARNING;
    } else {
      this.currentLevel = StalenessLevel.ERROR;
    }
  }

  get levelClass(): string {
    return `staleness-${this.currentLevel.toLowerCase()}`;
  }

  get levelLabel(): string {
    switch (this.currentLevel) {
      case StalenessLevel.LIVE: return 'Live';
      case StalenessLevel.WARNING: return 'Updating…';
      case StalenessLevel.ERROR: return 'Stale';
      default: return '';
    }
  }

  get ariaLive(): string {
    return this.currentLevel === StalenessLevel.ERROR ? 'assertive' : 'polite';
  }
}
