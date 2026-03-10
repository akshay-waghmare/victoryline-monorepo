import { upsertCommentaryEntries } from './commentary.utils';

describe('commentary utils', () => {
  it('replaces sparse ball commentary with richer commentary for the same delivery', () => {
    var existing = [{
      id: 'ball-2',
      inningsNumber: 1,
      overNumber: 1,
      ballInOver: 2,
      type: 'BALL',
      text: 'S Khan to M Akram',
      runs: 4,
      highlights: []
    }];
    var incoming = [{
      id: 'ball-2',
      inningsNumber: 1,
      overNumber: 1,
      ballInOver: 2,
      type: 'BOUNDARY',
      text: 'S Khan to M Akram, FOUR!! GLORIOUS!!! Drives it through cover for four.',
      runs: 4,
      highlights: ['BOUNDARY']
    }];

    var merged = upsertCommentaryEntries(existing, incoming);

    expect(merged.length).toBe(1);
    expect(merged[0].type).toBe('BOUNDARY');
    expect(merged[0].text).toContain('FOUR!! GLORIOUS!!!');
    expect(merged[0].highlights).toEqual(['BOUNDARY']);
  });

  it('keeps latest deliveries sorted first after upsert', () => {
    var existing = [{
      id: 'ball-1',
      inningsNumber: 1,
      overNumber: 1,
      ballInOver: 1,
      type: 'BALL',
      text: 'Older',
      runs: 2
    }];
    var incoming = [{
      id: 'ball-4',
      inningsNumber: 1,
      overNumber: 1,
      ballInOver: 4,
      type: 'BALL',
      text: 'Newer',
      runs: 0
    }];

    var merged = upsertCommentaryEntries(existing, incoming);

    expect(merged.map(function(entry) { return entry.id; })).toEqual(['ball-4', 'ball-1']);
  });

  it('replaces terse boundary commentary with richer commentary for the same ball', () => {
    var existing = [{
      id: 'live-ball-1001',
      inningsNumber: 1,
      overNumber: 4,
      ballInOver: 3,
      type: 'BOUNDARY',
      text: 'M Basit to S Ayub',
      runs: 4,
      highlights: []
    }];
    var incoming = [{
      id: 'live-ball-9988',
      inningsNumber: 1,
      overNumber: 4,
      ballInOver: 3,
      type: 'BOUNDARY',
      text: 'M Basit to S Ayub, FOUR!! Cracked away through cover for four.',
      runs: 4,
      highlights: ['BOUNDARY']
    }];

    var merged = upsertCommentaryEntries(existing, incoming);

    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('live-ball-9988');
    expect(merged[0].text).toContain('Cracked away through cover');
  });
});