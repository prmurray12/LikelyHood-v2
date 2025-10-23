const { computeProbabilityFromSetlists } = require('../src/utils/probability');

describe('computeProbabilityFromSetlists', () => {
  const mkShow = (hasHood) => ({ setlistdata: hasHood ? '... Harry Hood ...' : '... Another Song ...' });

  test('returns a number between 5 and 95', () => {
    const shows = [mkShow(false), mkShow(false), mkShow(true), mkShow(false)];
    const p = computeProbabilityFromSetlists(shows);
    expect(typeof p).toBe('number');
    expect(p).toBeGreaterThanOrEqual(5);
    expect(p).toBeLessThanOrEqual(95);
  });

  test('higher when more shows since last Hood', () => {
    // Case A: Hood in the most recent show (index 0)
    const showsA = [mkShow(true), mkShow(false), mkShow(false), mkShow(false)];
    const pA = computeProbabilityFromSetlists(showsA);

    // Case B: Hood farther back (index 3) => more shows since last Hood
    const showsB = [mkShow(false), mkShow(false), mkShow(false), mkShow(true)];
    const pB = computeProbabilityFromSetlists(showsB);

    expect(pB).toBeGreaterThanOrEqual(pA);
  });

  test('frequency in recent window bumps probability', () => {
    // Many Hoods recently
    const showsHigh = [mkShow(true), mkShow(true), mkShow(false), mkShow(true), mkShow(false), mkShow(false), mkShow(true)];
    // Few/no Hoods recently
    const showsLow = [mkShow(false), mkShow(false), mkShow(false), mkShow(false), mkShow(false), mkShow(false), mkShow(true)];

    const pHigh = computeProbabilityFromSetlists(showsHigh);
    const pLow = computeProbabilityFromSetlists(showsLow);

    expect(pHigh).toBeGreaterThanOrEqual(pLow);
  });
});
