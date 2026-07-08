import { getCommentaryUpdateIntent, getCommentaryUpdateLabel, isMeaningfulCommentaryUpdate } from './live-update-heuristics';

describe('live update heuristics', () => {
  it('recognizes meaningful wicket and chase commentary', () => {
    expect(isMeaningfulCommentaryUpdate('WICKET', 'WICKET! Bowled him.')).toBe(true);
    expect(isMeaningfulCommentaryUpdate('COMMENTARY', 'Need 18 from 12 balls with the required rate rising.')).toBe(true);
  });

  it('classifies update intents consistently', () => {
    expect(getCommentaryUpdateIntent('WICKET', 'WICKET! Bowled him.')).toBe('wicket');
    expect(getCommentaryUpdateIntent('OVER_SUMMARY', 'End of over 10: India are 85/2 after 10 overs.')).toBe('live-update');
    expect(getCommentaryUpdateIntent('COMMENTARY', 'India need 24 runs from 18 balls.')).toBe('chase');
  });

  it('maps intents to stable visible labels', () => {
    expect(getCommentaryUpdateLabel('toss')).toBe('Toss update');
    expect(getCommentaryUpdateLabel('milestone')).toBe('Milestone');
    expect(getCommentaryUpdateLabel('live-update', '12.4')).toBe('12.4');
  });
});
