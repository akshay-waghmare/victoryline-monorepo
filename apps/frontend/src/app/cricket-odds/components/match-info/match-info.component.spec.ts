import { MatchDetailsInfoComponent } from './match-info.component';

describe('MatchDetailsInfoComponent', () => {
  let component: MatchDetailsInfoComponent;

  beforeEach(() => {
    component = new MatchDetailsInfoComponent({ getMatchInfo: jasmine.createSpy('getMatchInfo') } as any);
  });

  it('builds recent form pills from match results', () => {
    component.matchInfo = {
      match_name: 'England Women vs New Zealand Women',
      team_form: {
        'England Women': [
          {
            match_name: '3rd T20',
            series_name: 'NZW vs ENGW 2026',
            result: 'W',
            teams: [
              { team_name: 'England Women', innings: [{ team_score: '81/3', team_over: '13.5' }] },
              { team_name: 'New Zealand Women', innings: [{ team_score: '80/10', team_over: '19.1' }] }
            ]
          },
          {
            match_name: 'Warm-up',
            series_name: 'NZW vs ENGW 2026',
            result: 'T',
            teams: []
          },
          {
            match_name: 'Rain-hit',
            series_name: 'NZW vs ENGW 2026',
            result: 'NR',
            teams: []
          },
          {
            match_name: '1st T20',
            series_name: 'NZW vs ENGW 2026',
            result: 'L',
            teams: [
              { team_name: 'England Women', innings: [{ team_score: '140/3', team_over: '17.2' }] },
              { team_name: 'New Zealand Women', innings: [{ team_score: '170/5', team_over: '20.0' }] }
            ]
          }
        ]
      }
    };

    expect(component.formSections.length).toBe(1);
    expect(component.formSections[0].streak.map(function(pill) { return pill.label; })).toEqual(['W', 'D', 'N', 'L']);
    expect(component.formSections[0].summary).toBe('1W • 1L • 1D • 1N in last 4');
    expect(component.formSections[0].insight).toBe('Won last match');
  });

  it('builds side by side comparison rows from team comparison data', () => {
    component.matchInfo = {
      team_comparison: {
        'ENG-W': {
          matches_played: '10',
          win_percentage: '60%',
          avg_score: '140',
          highest_score: '171',
          lowest_score: '82'
        },
        'NZ-W': {
          matches_played: '10',
          win_percentage: '80%',
          avg_score: '162',
          highest_score: '202',
          lowest_score: '65'
        }
      }
    };

    expect(component.comparisonTeams).toEqual(['ENG-W', 'NZ-W']);
    expect(component.comparisonRows).toEqual([
      { label: 'Matches played', firstValue: '10', secondValue: '10', winner: 'tied' },
      { label: 'Win rate', firstValue: '60%', secondValue: '80%', winner: 'second' },
      { label: 'Avg score', firstValue: '140', secondValue: '162', winner: 'second' },
      { label: 'Highest score', firstValue: '171', secondValue: '202', winner: 'second' },
      { label: 'Lowest score', firstValue: '82', secondValue: '65', winner: 'tied' }
    ]);
  });
});
