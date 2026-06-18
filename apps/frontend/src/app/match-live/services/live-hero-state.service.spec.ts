import { NgZone } from '@angular/core';
import { of, Subject } from 'rxjs';

import {
  buildCricketLiveTopicPaths,
  buildCricketSnapshotTopicPath
} from '../../core/utils/cricket-websocket-topics';
import { LiveHeroStateService } from './live-hero-state.service';

describe('LiveHeroStateService websocket handling', () => {
  let topicSubjects: { [topic: string]: Subject<any> };
  let rxStomp: any;
  let zone: NgZone & { run: jasmine.Spy; runOutsideAngular: jasmine.Spy };
  let service: LiveHeroStateService;

  beforeEach(() => {
    topicSubjects = {};
    rxStomp = {
      watch: jasmine.createSpy('watch').and.callFake((topic: string) => {
        const subject = new Subject<any>();
        topicSubjects[topic] = subject;
        return subject.asObservable();
      })
    };

    zone = {
      run: jasmine.createSpy('run').and.callFake((fn: Function) => fn()),
      runOutsideAngular: jasmine.createSpy('runOutsideAngular').and.callFake((fn: Function) => fn())
    } as any;

    service = new LiveHeroStateService(
      {
        getLastUpdatedData: jasmine.createSpy('getLastUpdatedData').and.returnValue(of({
          score: '10-1',
          over: 1,
          batting_team: 'RCB',
          updatedTimeStamp: Date.now(),
          batsman_data: [],
          bowler_data: []
        }))
      } as any,
      rxStomp,
      {
        mapSnapshot: (snapshot: any) => ({
          matchId: snapshot.id,
          status: snapshot.status,
          timestamp: snapshot.timestamp,
          score: {
            teamCode: snapshot.innings.teamCode,
            teamName: snapshot.innings.teamName,
            runs: snapshot.innings.runs,
            wickets: snapshot.innings.wickets,
            overs: snapshot.innings.overs,
            runRateLabel: 'CRR ' + snapshot.innings.runRate,
            status: snapshot.status,
            resultSummary: snapshot.innings.resultSummary || null,
            currentBall: snapshot.currentBall != null ? String(snapshot.currentBall) : null
          },
          chase: { isChasing: false },
          batters: [],
          bowler: null,
          partnershipLabel: null,
          odds: null,
          staleness: snapshot.staleness,
          quickLinks: []
        })
      } as any,
      zone
    );

    spyOn<any>(service, 'isBrowser').and.returnValue(true);
  });

  it('subscribes to the merged snapshot and explicit legacy topics instead of wildcard destinations', () => {
    service.init('match-1');

    const watchedTopics = rxStomp.watch.calls.allArgs().map((args: any[]) => args[0]);
    const expectedTopics = buildCricketLiveTopicPaths('match-1');

    expect(watchedTopics).toEqual(expectedTopics);
    expect(watchedTopics).not.toContain('/topic/cricket.match-1.*');
  });

  it('merges a complete snapshot payload into the live hero', () => {
    let latestView: any = null;
    service.view$.subscribe((view) => {
      latestView = view;
    });
    service.init('match-1');

    topicSubjects[buildCricketSnapshotTopicPath('match-1')].next({
      body: '{"score":"31-2","over":4.3,"battingTeamName":"MI"}'
    });

    expect(latestView.score.runs).toBe(31);
    expect(latestView.score.wickets).toBe(2);
    expect(latestView.score.overs).toBe('4.3');
    expect(latestView.score.teamName).toBe('MI');
  });

  it('re-enters Angular zone when a websocket payload arrives', () => {
    let latestView: any = null;
    service.view$.subscribe((view) => {
      latestView = view;
    });

    service.init('match-1');

    topicSubjects['/topic/cricket.match-1.score'].next({ body: '{"score":"25-1"}' });
    topicSubjects['/topic/cricket.match-1.over'].next({ body: '{"over":3.2}' });
    topicSubjects['/topic/cricket.match-1.batting_team'].next({ body: '{"batting_team":"RCB"}' });

    expect(zone.run).toHaveBeenCalled();
    expect(latestView).toBeTruthy();
    expect(latestView.score.runs).toBe(25);
    expect(latestView.score.wickets).toBe(1);
    expect(latestView.score.overs).toBe('3.2');
    expect(latestView.score.teamName).toBe('RCB');
  });

  it('re-subscribes to websocket topics on manual retry', () => {
    service.init('match-1');
    rxStomp.watch.calls.reset();

    service.manualRetry();

    expect(rxStomp.watch.calls.count()).toBe(buildCricketLiveTopicPaths('match-1').length);
  });
});
