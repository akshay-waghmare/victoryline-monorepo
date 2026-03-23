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

function buildMatch(status: MatchStatus): MatchCardViewModel {
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
    staleness: 'fresh'
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
