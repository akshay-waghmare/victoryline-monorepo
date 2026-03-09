import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ScorecardComponent } from './scorecard.component';

describe('ScorecardComponent', () => {
  let component: ScorecardComponent;
  let fixture: ComponentFixture<ScorecardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ScorecardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScorecardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render caught and bowled for dismissal code ^3', () => {
    component.scorecardInfo = {
      match_stats_by_innings: {
        innings: {
          inning_1: {
            batsman_stats: {
              batter_1: {
                status: 'out',
                dismissal_code: '^3',
                bowler_code: 'Shami',
                player_caught: 'Shami'
              }
            }
          }
        }
      }
    };

    expect(component.getDismissalText('batter_1', 'inning_1')).toBe('c & b Shami');
  });
});
