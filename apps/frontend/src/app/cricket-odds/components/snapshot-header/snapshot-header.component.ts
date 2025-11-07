import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ScoreSnapshot, StalenessLevel } from '../../../shared/models/match.models';
import { MatchLiveFacade } from '../../match-live.facade';
import { AnalyticsService } from '../../analytics.service';

@Component({
  selector: 'app-snapshot-header',
  templateUrl: './snapshot-header.component.html',
  styleUrls: ['./snapshot-header.component.css']
})
export class SnapshotHeaderComponent implements OnInit, OnDestroy {
  @Input() matchId!: string;

  snapshot: ScoreSnapshot | null = null;
  private snapshotSub?: Subscription;

  constructor(
    private liveFacade: MatchLiveFacade,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    if (!this.matchId) {
      console.error('[SnapshotHeader] matchId is required');
      return;
    }

    this.liveFacade.init(this.matchId);
    
    this.snapshotSub = this.liveFacade.getSnapshotStream().subscribe(data => {
      if (data) {
        this.analytics.mark('snapshot_render_start');
        this.snapshot = data;
        this.analytics.mark('snapshot_render_end');
        this.analytics.measure('snapshot_render', 'snapshot_render_start', 'snapshot_render_end');
        this.analytics.trackSnapshotRefresh(this.matchId);
      }
    });
  }

  ngOnDestroy(): void {
    this.snapshotSub?.unsubscribe();
    this.liveFacade.dispose();
  }

  get teamScore(): string {
    return this.snapshot?.score || '-/-';
  }

  get overs(): string {
    return this.snapshot?.overs ? this.snapshot.overs.toFixed(1) : '0.0';
  }

  get crr(): string {
    return this.snapshot?.currentRunRate ? this.snapshot.currentRunRate.toFixed(2) : '0.00';
  }

  get rrr(): string | null {
    return this.snapshot?.requiredRunRate !== undefined && this.snapshot.requiredRunRate !== null
      ? this.snapshot.requiredRunRate.toFixed(2)
      : null;
  }

  get matchStatus(): string {
    return this.snapshot?.matchStatus || 'Unknown';
  }

  get recentBalls() {
    return this.snapshot?.recentBalls || [];
  }

  get lastUpdated(): string | undefined {
    return this.snapshot?.lastUpdated;
  }

  getBallClass(ball: any): string {
    const outcome = ball.outcome?.toString().toUpperCase();
    if (ball.highlight === 'WICKET' || outcome === 'W') {
      return 'ball-wicket';
    } else if (ball.highlight === 'SIX' || outcome === '6') {
      return 'ball-six';
    } else if (ball.highlight === 'BOUNDARY' || outcome === '4') {
      return 'ball-boundary';
    }
    return 'ball-normal';
  }
}
