import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { MatchCardComponent } from './match-card.component';
import { AnimationService } from '../../../../core/services/animation.service';
import { MatchCardViewModel, MatchStatus } from '../../models/match-card.models';

class AnimationServiceStub {
  isAnimating(): boolean {
    return false;
  }

  startAnimation(): boolean {
    return true;
  }

  prefersReducedMotion(): boolean {
    return false;
  }
}

describe('MatchCardComponent', () => {
  let component: MatchCardComponent;
  let fixture: ComponentFixture<MatchCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MatchCardComponent],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: AnimationService, useClass: AnimationServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchCardComponent);
    component = fixture.componentInstance;
  });

  it('shows full team names for upcoming matches', () => {
    component.match = buildMatch(MatchStatus.UPCOMING);

    fixture.detectChanges();

    const teamNames = fixture.debugElement
      .queryAll(By.css('.match-card__team-name'))
      .map((element) => element.nativeElement.textContent.trim());

    expect(teamNames).toEqual(['Mumbai Indians', 'Chennai Super Kings']);
  });

  it('keeps short team names for live matches', () => {
    component.match = buildMatch(MatchStatus.LIVE);

    fixture.detectChanges();

    const teamNames = fixture.debugElement
      .queryAll(By.css('.match-card__team-name'))
      .map((element) => element.nativeElement.textContent.trim());

    expect(teamNames).toEqual(['MI', 'CSK']);
  });

  it('uses full team names for compact upcoming cards', () => {
    component.variant = 'compact';
    component.match = buildMatch(MatchStatus.UPCOMING);

    fixture.detectChanges();

    const teamNames = fixture.debugElement
      .queryAll(By.css('.match-card__team-name'))
      .map((element) => element.nativeElement.textContent.trim());

    expect(teamNames).toEqual(['Mumbai Indians', 'Chennai Super Kings']);
  });

  it('removes noisy match update suffixes from the series label', () => {
    component.variant = 'compact';
    component.match = buildMatch(MatchStatus.LIVE, {
      seriesName: '4th Match Ireland Womens T20i Tri Series 2026 Match Updates 11BW'
    });

    fixture.detectChanges();

    const series = fixture.debugElement.query(By.css('.match-card__series')).nativeElement.textContent.trim();

    expect(series).toBe('4th Match Ireland Womens T20i Tri Series 2026 • T20');
  });

  it('separates scraped live fixture text into headline and match meta', () => {
    component.variant = 'compact';
    component.match = buildMatch(MatchStatus.LIVE, {
      team1: {
        id: 'team-1',
        name: 'North Mumbai Panthers',
        shortName: 'NMP',
        logoUrl: '',
        score: { runs: 16, wickets: 0, overs: 0, runRate: 0, displayText: '16/0 (0 ov)' }
      },
      team2: {
        id: 'team-2',
        name: 'Triumph Knights Mumbai North East',
        shortName: 'TKMN',
        logoUrl: '',
        score: null
      },
      seriesName: 'North Mumbai Panthers 8:30 AM 3rdT20, Mumbai T20 2026 Triumph Knights Mumbai North East',
      venue: '3rd Match Mumbai T20 League 2026 Match Updates 125V',
      matchFormat: 'T20'
    });

    fixture.detectChanges();

    const headline = fixture.debugElement.query(By.css('.match-card__headline')).nativeElement.textContent.trim();
    const series = fixture.debugElement.query(By.css('.match-card__series')).nativeElement.textContent.trim();
    const teamNames = fixture.debugElement
      .queryAll(By.css('.match-card__team-name'))
      .map((element) => element.nativeElement.textContent.trim());

    expect(headline).toBe('North Mumbai Panthers vs Triumph Knights Mumbai North East');
    expect(series).toBe('3rd T20, Mumbai T20 2026');
    expect(fixture.debugElement.query(By.css('.match-card__venue'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.match-card__time'))).toBeNull();
    expect(teamNames).toEqual(['North Mumbai Panthers', 'Triumph Knights Mumbai North East']);
  });

  it('removes scheduled time from live fixture text with multi-word formats', () => {
    component.variant = 'compact';
    component.match = buildMatch(MatchStatus.LIVE, {
      team1: {
        id: 'team-1',
        name: 'Marylebone Cricket Club',
        shortName: 'MAR',
        logoUrl: '',
        score: { runs: 104, wickets: 2, overs: 19.2, runRate: 5.38, displayText: '104/2 (19.2 ov)' }
      },
      team2: {
        id: 'team-2',
        name: 'Speen Ghar Region',
        shortName: 'SGR',
        logoUrl: '',
        score: null
      },
      seriesName: 'Marylebone Cricket Club 3:00 AM 15thOne Day, Afghanistan One Day Cup 2026 Speen Ghar Region',
      venue: '15th Match Afghanistan One Day Cup 2026 Match Updates 126W',
      matchFormat: 'ODI'
    });

    fixture.detectChanges();

    const headline = fixture.debugElement.query(By.css('.match-card__headline')).nativeElement.textContent.trim();
    const series = fixture.debugElement.query(By.css('.match-card__series')).nativeElement.textContent.trim();

    expect(headline).toBe('Marylebone Cricket Club vs Speen Ghar Region');
    expect(series).toBe('15th One Day, Afghanistan One Day Cup 2026');
    expect(fixture.debugElement.query(By.css('.match-card__time'))).toBeNull();
  });

  it('strips raw scheduled time from live labels even when fixture text is unparsable', () => {
    component.variant = 'compact';
    component.match = buildMatch(MatchStatus.LIVE, {
      seriesName: 'Some Team 8:30 AM noisy live text without a fixture delimiter',
      venue: '',
      matchFormat: 'T20'
    });

    fixture.detectChanges();

    const series = fixture.debugElement.query(By.css('.match-card__series')).nativeElement.textContent.trim();

    expect(series).toBe('Some Team noisy live text without a fixture delimiter • T20');
    expect(series).not.toContain('8:30 AM');
    expect(fixture.debugElement.query(By.css('.match-card__time'))).toBeNull();
  });

  it('hides the repetitive result summary for compact live cards', () => {
    component.variant = 'compact';
    component.match = buildMatch(MatchStatus.LIVE, {
      resultSummary: 'MI 180 for 4 versus CSK 92 for 3'
    });

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.match-card__result'))).toBeNull();
  });

  it('derives team initials from the visible team name when short codes are mismatched', () => {
    component.variant = 'compact';
    component.match = buildMatch(MatchStatus.LIVE, {
      team1: {
        id: 'team-1',
        name: 'West Indies Women',
        shortName: 'IW',
        logoUrl: '',
        score: null
      },
      team2: {
        id: 'team-2',
        name: 'Ireland Women',
        shortName: 'WIW',
        logoUrl: '',
        score: null
      }
    });

    fixture.detectChanges();

    const avatars = fixture.debugElement
      .queryAll(By.css('.match-card__avatar'))
      .map((element) => element.nativeElement.textContent.trim());

    expect(avatars).toEqual(['WIW', 'IW']);
  });

  it('uses a dark foreground color for live status pills', () => {
    component.match = buildMatch(MatchStatus.LIVE);

    expect(component.getStatusTextColor()).toBe('#0f172a');
  });

  it('emits swipe events and suppresses click after a horizontal drag', () => {
    component.enableSwipeGesture = true;
    component.match = buildMatch(MatchStatus.LIVE);
    fixture.detectChanges();

    const swipeLeftSpy = spyOn(component.swipeLeft, 'emit');
    const cardClickSpy = spyOn(component.cardClick, 'emit');

    component.onTouchStart(createTouchEvent(220, 80) as TouchEvent);
    component.onTouchMove(createTouchEvent(140, 86) as TouchEvent);
    component.onTouchEnd(createTouchEvent(140, 86, true) as TouchEvent);
    component.onCardClick();

    expect(swipeLeftSpy).toHaveBeenCalledWith('match-1');
    expect(cardClickSpy).not.toHaveBeenCalled();
  });
});

function buildMatch(status: MatchStatus, overrides: Partial<MatchCardViewModel> = {}): MatchCardViewModel {
  return {
    id: 'match-1',
    team1: {
      id: 'team-1',
      name: 'Mumbai Indians',
      shortName: 'MI',
      logoUrl: '',
      score: null
    },
    team2: {
      id: 'team-2',
      name: 'Chennai Super Kings',
      shortName: 'CSK',
      logoUrl: '',
      score: null
    },
    status,
    venue: 'Wankhede Stadium',
    startTime: new Date('2026-03-12T18:30:00Z'),
    seriesName: 'Indian Premier League',
    matchFormat: 'T20',
    displayStatus: status,
    statusColor: '#2196f3',
    timeDisplay: '6:30 PM',
    isLive: status === MatchStatus.LIVE,
    canAnimate: status === MatchStatus.LIVE,
    isHovered: false,
    isSelected: false,
    lastUpdated: new Date('2026-03-12T10:30:00Z'),
    staleness: 'fresh',
    ...overrides
  };
}

function createTouchEvent(x: number, y: number, includeChangedTouch?: boolean): Partial<TouchEvent> {
  const touch = { clientX: x, clientY: y };

  return {
    touches: includeChangedTouch ? [] as any : [touch] as any,
    changedTouches: includeChangedTouch ? [touch] as any : [] as any,
    cancelable: true,
    preventDefault(): void {}
  };
}
