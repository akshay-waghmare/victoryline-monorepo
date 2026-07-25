import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let service: MatchesService;

  beforeEach(() => {
    service = new MatchesService({} as any, {} as any);
  });

  it('prefers explicit full team names over scorecard short codes', () => {
    const team = (service as any).parseTeamInfo(
      { id: 'match-1', team1Name: 'Ireland' },
      'team1',
      0,
      { team1: 'Ireland' },
      {
        match_stats_by_innings: {
          innings: {
            '1st_inning': {
              team_code: 'IRE'
            }
          }
        }
      }
    );

    expect(team.name).toBe('Ireland');
    expect(team.shortName).toBe('IRE');
  });

  it('uses readable url team names when structured data only has abbreviations', () => {
    const team = (service as any).parseTeamInfo(
      {
        id: 'match-2',
        team1: {
          name: 'IRE'
        }
      },
      'team1',
      0,
      { team1: 'Ireland' },
      null
    );

    expect(team.name).toBe('Ireland');
    expect(team.shortName).toBe('IRE');
  });

  it('maps live card scores to the scorecard team, not batting-order position', () => {
    const scorecard = {
      match_stats_by_innings: {
        innings: {
          '1st_inning': { team_name: 'India', team_score: '219/5(120' },
          '2nd_inning': { team_name: 'Zimbabwe', team_score: '49/4(38' }
        }
      }
    };
    const match = {
      id: 'zim-ind',
      url: 'https://crex.com/cricket-live-score/ind-vs-zim-2nd-t20-match-updates-11EF',
      team1Name: 'Zimbabwe',
      team2Name: 'India'
    };

    expect((service as any).parseScore({}, match, 0, scorecard)).toEqual(jasmine.objectContaining({
      runs: 49, wickets: 4, overs: 6.2
    }));
    expect((service as any).parseScore({}, match, 1, scorecard)).toEqual(jasmine.objectContaining({
      runs: 219, wickets: 5, overs: 20
    }));
  });

  it('keeps global catalog polling off canonical match routes', () => {
    expect((service as any).isCatalogSurface('/cric-live/team-a-vs-team-b-123A')).toBe(false);
    expect((service as any).isCatalogSurface('/cric-live/team-a-vs-team-b-123A/scorecard')).toBe(false);
    expect((service as any).isCatalogSurface('/matches')).toBe(true);
    expect((service as any).isCatalogSurface('/live-score/today')).toBe(true);
  });
});
