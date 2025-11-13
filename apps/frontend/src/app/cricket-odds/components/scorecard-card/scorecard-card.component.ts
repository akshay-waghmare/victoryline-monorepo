import { Component, Input } from '@angular/core';

/**
 * Mobile-optimized card component for displaying scorecard data.
 * Used on screens <640px where tables become difficult to read.
 * Each player's stats are displayed in a vertical card layout.
 */
@Component({
  selector: 'app-scorecard-card',
  templateUrl: './scorecard-card.component.html',
  styleUrls: ['./scorecard-card.component.css']
})
export class ScorecardCardComponent {
  @Input() player: any; // Batsman or Bowler data
  @Input() type: 'batting' | 'bowling' = 'batting';

  /**
   * Calculate strike rate for batsmen
   * @param runs Runs scored
   * @param balls Balls faced
   * @returns Formatted strike rate string
   */
  calculateStrikeRate(runs: number, balls: number): string {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 100).toFixed(2);
  }

  /**
   * Calculate economy rate for bowlers
   * @param runs Runs conceded
   * @param overs Overs bowled
   * @returns Formatted economy rate string
   */
  calculateEconomy(runs: number, overs: number): string {
    if (overs === 0) return '0.00';
    return (runs / overs).toFixed(2);
  }

  /**
   * Format overs from decimal to cricket notation (e.g., 3.2 = 3.2 overs)
   * @param overs Overs in decimal format
   * @returns Formatted overs string
   */
  formatOvers(overs: number): string {
    const fullOvers = Math.floor(overs);
    const balls = Math.round((overs - fullOvers) * 10);
    return `${fullOvers}.${balls}`;
  }

  /**
   * Get ARIA label for the card
   * @returns Descriptive label for screen readers
   */
  getAriaLabel(): string {
    if (this.type === 'batting') {
      const status = this.player.isOut ? 'out' : 'not out';
      return `${this.player.name}, ${status}, ${this.player.runs} runs from ${this.player.balls} balls`;
    } else {
      return `${this.player.name}, ${this.player.wickets} wickets for ${this.player.runs} runs in ${this.formatOvers(this.player.overs)} overs`;
    }
  }
}
