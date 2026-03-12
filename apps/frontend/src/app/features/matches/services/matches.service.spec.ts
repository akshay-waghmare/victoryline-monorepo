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
});
