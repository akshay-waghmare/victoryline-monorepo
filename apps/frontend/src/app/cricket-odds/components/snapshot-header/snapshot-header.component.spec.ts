import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { SnapshotHeaderComponent } from './snapshot-header.component';
import { MatchLiveFacade } from '../../match-live.facade';
import { AnalyticsService } from '../../analytics.service';
import { ScoreSnapshot, HighlightType } from '../../../shared/models/match.models';

describe('SnapshotHeaderComponent', () => {
  let component: SnapshotHeaderComponent;
  let fixture: ComponentFixture<SnapshotHeaderComponent>;
  let mockLiveFacade: jasmine.SpyObj<MatchLiveFacade>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;
  let snapshotSubject: BehaviorSubject<ScoreSnapshot | null>;

  beforeEach(() => {
    snapshotSubject = new BehaviorSubject<ScoreSnapshot | null>(null);

    mockLiveFacade = jasmine.createSpyObj('MatchLiveFacade', ['init', 'getSnapshotStream', 'dispose']);
    mockLiveFacade.getSnapshotStream.and.returnValue(snapshotSubject.asObservable());

    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['mark', 'measure', 'trackSnapshotRefresh']);

    TestBed.configureTestingModule({
      declarations: [SnapshotHeaderComponent],
      providers: [
        { provide: MatchLiveFacade, useValue: mockLiveFacade },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    });

    fixture = TestBed.createComponent(SnapshotHeaderComponent);
    component = fixture.componentInstance;
    component.matchId = 'test-match-123';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize facade on ngOnInit', () => {
    fixture.detectChanges();
    expect(mockLiveFacade.init).toHaveBeenCalledWith('test-match-123');
  });

  it('should render live snapshot data', () => {
    const mockSnapshot: ScoreSnapshot = {
      matchId: 'test-match-123',
      battingTeamId: 'team1',
      score: '132/4',
      overs: 17.3,
      currentRunRate: 7.61,
      requiredRunRate: 8.42,
      recentBalls: [
        { overBall: '17.3', outcome: '4', highlight: HighlightType.BOUNDARY },
        { overBall: '17.2', outcome: '1', highlight: HighlightType.NONE },
        { overBall: '17.1', outcome: 'W', highlight: HighlightType.WICKET }
      ],
      matchStatus: 'LIVE',
      lastUpdated: new Date().toISOString()
    };

    fixture.detectChanges();
    snapshotSubject.next(mockSnapshot);
    fixture.detectChanges();

    expect(component.snapshot).toEqual(mockSnapshot);
    expect(component.teamScore).toBe('132/4');
    expect(component.overs).toBe('17.3');
    expect(component.crr).toBe('7.61');
    expect(component.rrr).toBe('8.42');
    expect(component.recentBalls.length).toBe(3);
  });

  it('should handle completed match (no RRR)', () => {
    const mockSnapshot: ScoreSnapshot = {
      matchId: 'test-match-123',
      battingTeamId: 'team1',
      score: '180/7',
      overs: 20.0,
      currentRunRate: 9.00,
      requiredRunRate: undefined,
      recentBalls: [],
      matchStatus: 'COMPLETED',
      lastUpdated: new Date().toISOString()
    };

    fixture.detectChanges();
    snapshotSubject.next(mockSnapshot);
    fixture.detectChanges();

    expect(component.rrr).toBeNull();
    expect(component.matchStatus).toBe('COMPLETED');
  });

  it('should handle stale data warning', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const mockSnapshot: ScoreSnapshot = {
      matchId: 'test-match-123',
      battingTeamId: 'team1',
      score: '100/3',
      overs: 12.0,
      currentRunRate: 8.33,
      recentBalls: [],
      matchStatus: 'LIVE',
      lastUpdated: twoMinutesAgo
    };

    fixture.detectChanges();
    snapshotSubject.next(mockSnapshot);
    fixture.detectChanges();

    expect(component.lastUpdated).toBe(twoMinutesAgo);
    // StalenessIndicator component will compute WARNING tier internally
  });

  it('should dispose facade on ngOnDestroy', () => {
    fixture.detectChanges();
    component.ngOnDestroy();
    expect(mockLiveFacade.dispose).toHaveBeenCalled();
  });

  it('should apply correct ball highlight classes', () => {
    const wicketBall = { overBall: '10.1', outcome: 'W', highlight: HighlightType.WICKET };
    const sixBall = { overBall: '10.2', outcome: '6', highlight: HighlightType.SIX };
    const boundaryBall = { overBall: '10.3', outcome: '4', highlight: HighlightType.BOUNDARY };
    const normalBall = { overBall: '10.4', outcome: '1', highlight: HighlightType.NONE };

    expect(component.getBallClass(wicketBall)).toBe('ball-wicket');
    expect(component.getBallClass(sixBall)).toBe('ball-six');
    expect(component.getBallClass(boundaryBall)).toBe('ball-boundary');
    expect(component.getBallClass(normalBall)).toBe('ball-normal');
  });
});
