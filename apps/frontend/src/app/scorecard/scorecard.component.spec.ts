import { NO_ERRORS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ScorecardComponent } from './scorecard.component';

describe('ScorecardComponent', () => {
  let component: ScorecardComponent;
  let fixture: ComponentFixture<ScorecardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ScorecardComponent ],
      schemas: [NO_ERRORS_SCHEMA]
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

  it('renders numeric caught dismissal with resolved participants', () => {
    component.scorecardInfo = {
      match_stats_by_innings: { innings: {
        inning_1: { batsman_stats: {
          batter_1: {
            status: 'dismissed', dismissal_code: '2',
            bowler_name: 'Kirstie Gordon', player_caught_name: 'Mady Villiers'
          }
        }}
      }}
    };
    component.ngOnInit();
    expect(component.getDismissalText('batter_1', 'inning_1')).toBe('caught Mady Villiers b Kirstie Gordon');
  });

  it('should prefer player_name for bowler detail identity and display', () => {
    component.scorecardInfo = {
      match_stats_by_innings: {
        innings: {
          inning_1: {
            bowlers_stats: {
              W4: {
                overs: 3,
                runs: 9,
                wickets: 1,
                player_name: 'Linsey Smith'
              }
            }
          }
        }
      }
    };

    expect(component.getBowlerDisplayName('W4', 'inning_1')).toBe('Linsey Smith');
  });

  it('should prefer player_name for yet-to-bat names', () => {
    component.scorecardInfo = {
      match_stats_by_innings: {
        innings: {
          inning_1: {
            batsman_stats: {
              '7YV': {
                status: 'yet_to_bat',
                player_name: 'Sophia Dunkley'
              },
              '6EH': {
                status: 'currently_batting',
                player_name: 'Maddy Green'
              }
            }
          }
        }
      }
    };

    expect(component.getYetToBatDisplayNames('inning_1')).toEqual(['Sophia Dunkley']);
  });

  it('does not render a second-innings tab for an unstarted placeholder', () => {
    component.scorecardInfo = {
      match_stats_by_innings: {
        innings: {
          inning_1: {
            team_code: 'AAA',
            team_score: '154/6 (20.0)',
            batsman_stats: { opener: { status: 'out', runs: 42, balls_faced: 31 } }
          },
          inning_2: {
            team_code: 'BBB',
            team_score: '0/0 (0.0)',
            batsman_stats: { opener: { status: 'yet_to_bat', runs: 0, balls_faced: 0 } },
            bowlers_stats: {}
          }
        }
      }
    };

    component.ngOnInit();

    expect(component.inningsKeys).toEqual(['inning_1']);
  });

  it('keeps an innings tab once a real scoreless delivery has been recorded', () => {
    component.scorecardInfo = {
      match_stats_by_innings: {
        innings: {
          inning_1: { team_score: '154/6 (20.0)' },
          inning_2: {
            team_score: '0/0 (0.1)',
            batsman_stats: { opener: { status: 'currently_batting', runs: 0, balls_faced: 1 } },
            bowlers_stats: { bowler: { overs: '0.1', runs: 0, wickets: 0 } }
          }
        }
      }
    };

    component.ngOnInit();

    expect(component.inningsKeys).toEqual(['inning_1', 'inning_2']);
  });
});
