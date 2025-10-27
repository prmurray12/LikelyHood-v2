// Compute probability using shows-based rotation model from a list of recent setlists
// `shows` is an array where the most recent show is at index 0 and has a `setlistdata` string
function computeProbabilityFromSetlists(shows) {
  if (!Array.isArray(shows) || shows.length === 0) return 10;

  // Find positions where Hood appears (indices, most-recent-first ordering)
  const hoodPositions = shows
    .map((s, idx) => (s.setlistdata && s.setlistdata.toLowerCase().includes('harry hood') ? idx : -1))
    .filter(idx => idx !== -1);

  // showsSince is the count of shows after the most recent Hood (i.e., index of the first Hood)
  const showsSince = hoodPositions.length ? hoodPositions[0] : shows.length;

  // Compute average gap (in shows) between appearances within the window
  let avgGapShows = null;
  if (hoodPositions.length >= 2) {
    const gaps = [];
    for (let i = 0; i < hoodPositions.length - 1; i++) {
      const diff = hoodPositions[i + 1] - hoodPositions[i];
      gaps.push(Math.max(0, diff - 1));
    }
    avgGapShows = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }
  if (avgGapShows === null || !isFinite(avgGapShows)) {
    avgGapShows = 6; // default expected shows-between for a common rotation tune
  }

  // Recent rotation effect: frequency in last N shows
  const recentWindow = Math.min(10, shows.length);
  const recentSlice = shows.slice(0, recentWindow);
  const recentCount = recentSlice.filter(s => s.setlistdata && s.setlistdata.toLowerCase().includes('harry hood')).length;
  const recentFreq = recentWindow > 0 ? recentCount / recentWindow : 0;
  const recencyFactor = 0.8 + 0.4 * recentFreq * 2;

  // Probability grows as showsSince approaches/exceeds avg gap
  let probability = ((showsSince) * (100/avgGapShows));
  probability = Math.max(0.01, Math.min(0.99, probability));
  return Math.round(probability * 100);
}

module.exports = {
  computeProbabilityFromSetlists,
  // Compute the average number of shows between appearances of "Harry Hood"
  // using the same detection logic as the probability function.
  computeAvgGapFromSetlists(shows) {
    if (!Array.isArray(shows) || shows.length === 0) return 6;

    const hoodPositions = shows
      .map((s, idx) => (s.setlistdata && s.setlistdata.toLowerCase().includes('harry hood') ? idx : -1))
      .filter(idx => idx !== -1);

    if (hoodPositions.length >= 2) {
      const gaps = [];
      for (let i = 0; i < hoodPositions.length - 1; i++) {
        const diff = hoodPositions[i + 1] - hoodPositions[i];
        gaps.push(Math.max(0, diff - 1));
      }
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      return (isFinite(avg) && avg > 0) ? avg : 6;
    }

    // Fallback default expected gap
    return 6;
  }
};