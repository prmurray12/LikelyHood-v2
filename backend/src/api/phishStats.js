const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_BASE_URL = 'https://api.phish.net/v3';

// Helper to strip HTML tags (e.g., venue anchor -> plain text)
const stripHtml = (html) => (html ? html.replace(/<[^>]*>/g, '').trim() : '');

// Parse JSONP of the form callbackName({...})
function parseJsonp(body) {
  if (typeof body === 'string') {
    const start = body.indexOf('(');
    const end = body.lastIndexOf(')');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(body.slice(start + 1, end));
      } catch (e) {
        console.error('Failed to parse JSONP:', e.message);
      }
    }
  }
  return body;
}

async function fetchLatestSetlists(limit = 200, offset = 0) {
  // v3 tutorials show JSONP access with callback param
  const url = `${API_BASE_URL}/setlists/latest?apikey=${process.env.PHISH_API_KEY}&callback=?&limit=${limit}&offset=${offset}`;
  const resp = await axios.get(url, { timeout: 15000 });
  const parsed = parseJsonp(resp.data);
  return parsed && parsed.response && Array.isArray(parsed.response.data)
    ? parsed.response.data
    : [];
}

router.get('/harry-hood-stats', async (req, res) => {
  try {
    console.log('Starting API request (2-year window)...');

    // Gather up to ~2 years of recent setlists via paging
    const TWO_YEARS_AGO = new Date();
    TWO_YEARS_AGO.setFullYear(TWO_YEARS_AGO.getFullYear() - 2);

    let offset = 0;
    const pageSize = 200;
    let shows = [];
    for (let i = 0; i < 10; i++) { // safety cap of 2000 shows
      const page = await fetchLatestSetlists(pageSize, offset);
      if (!page.length) break;
      shows = shows.concat(page);
      // If the oldest show in this page is older than 2 years, we can stop
      const last = page[page.length - 1];
      const dStr = last.short_date || last.showdate; // short_date like MM/DD/YYYY
      let d = null;
      if (dStr) {
        // Attempt to parse MM/DD/YYYY
        const parts = dStr.split('/');
        if (parts.length === 3) {
          const [mm, dd, yyyy] = parts;
          d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
        } else {
          d = new Date(dStr);
        }
      }
      if (d && d < TWO_YEARS_AGO) break;
      offset += pageSize;
    }

    // Find the index of the most recent show that includes Harry Hood
    const hoodIndex = shows.findIndex(show =>
      show.setlistdata && typeof show.setlistdata === 'string' && show.setlistdata.toLowerCase().includes('harry hood')
    );

    if (hoodIndex === -1) {
      // Not found in this window of recent shows
      res.json({
        lastPerformance: null,
        showsSinceLastPerformance: null,
        probability: 10, // conservative baseline if no appearance found in recent window
        note: 'Harry Hood not found in the latest setlists window. Probability uses a conservative baseline.'
      });
      return;
    }

  const hoodShow = shows[hoodIndex];

    // Calculate shows since last performance as the number of shows that occurred after that show
    const showsSince = hoodIndex; // because index 0 is most recent

    // Probability from util (based on shows window)
    const { computeProbabilityFromSetlists } = require('../utils/probability');
    const probabilityPct = computeProbabilityFromSetlists(shows);

    res.json({
      lastPerformance: {
        date: hoodShow.short_date,
        venue: stripHtml(hoodShow.venue),
        setlist: hoodShow.setlistdata
      },
      showsSinceLastPerformance: showsSince,
      probability: probabilityPct
    });

  } catch (error) {
    console.error('Error fetching Phish stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Phish statistics',
      details: error.message
    });
  }
});

module.exports = router;