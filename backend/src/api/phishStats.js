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

// Fetch upcoming shows from phish.net and return an array of normalized show objects
async function fetchUpcomingShows() {
  const key = process.env.PHISH_API_KEY;
  const candidates = [
    `${API_BASE_URL}/shows/upcoming?apikey=${key}&callback=?`,
    `${API_BASE_URL}/shows/upcoming.json?apikey=${key}`,
    `${API_BASE_URL}/shows/upcoming?apikey=${key}&format=json`
  ];

  let raw = [];
  for (const url of candidates) {
    try {
      const resp = await axios.get(url, { timeout: 15000 });
      const data = typeof resp.data === 'string' ? parseJsonp(resp.data) : resp.data;
      if (data && data.response && Array.isArray(data.response.data)) {
        raw = data.response.data;
        break;
      }
      // Some variants may return the array directly
      if (Array.isArray(data)) {
        raw = data;
        break;
      }
    } catch (e) {
      // Try next candidate
      continue;
    }
  }

  // Normalize and filter for Phish only
  const isPhish = (s) => {
    const fields = [s.artist, s.artist_name, s.band, s.artist_slug, s.artistid, s.gid, s.group];
    if (typeof s.artistid === 'number' && s.artistid === 1) return true; // common Phish id in phish.net
    return fields.some(f => typeof f === 'string' && /phish/i.test(f));
  };

  const norm = raw
    .filter(isPhish)
    .map(s => {
      // Prefer ISO showdate if present; fallback to short_date (MM/DD/YYYY)
      let isoDate = null;
      if (s.showdate) {
        isoDate = s.showdate; // often YYYY-MM-DD
      } else if (s.short_date) {
        const parts = String(s.short_date).split('/');
        if (parts.length === 3) {
          const [mm, dd, yyyy] = parts;
          isoDate = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
        }
      }
      return {
        id: String(s.showid || s.show_id || `${s.venueid || ''}-${isoDate || ''}`),
        date: isoDate,
        venue: stripHtml(s.venue || s.venue_name || s.location || ''),
        city: s.city || '',
        state: s.state || s.region || '',
        country: s.country || '',
        url: s.url || s.link || ''
      };
    })
    .filter(s => !!s.date);

  // Sort ascending by date
  norm.sort((a, b) => new Date(a.date) - new Date(b.date));
  return norm;
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

    // Upcoming shows for Phish only (fail-safe to empty array on error)
    let upcoming = [];
    try {
      upcoming = await fetchUpcomingShows();
    } catch (e) {
      console.warn('Fetching upcoming shows failed:', e.message);
      upcoming = [];
    }

    // Determine if there is a Phish show today (local date)
    const today = new Date();
    const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const todayStr = formatYMD(today);
    const hasShowToday = upcoming.some(s => s.date === todayStr);

    // Likely Hood (tonight): if show today, same as probability; else small random [0.000001, 0.1]
    let likelyHoodPct;
    if (hasShowToday) {
      likelyHoodPct = probabilityPct;
    } else {
      const r = 0.000001 + Math.random() * (0.1 - 0.000001); // fraction
      likelyHoodPct = Math.max(0.01, Math.round(r * 10000) / 100); // show with 2 decimals, min 0.01%
    }

    // Predict next expected performance using geometric expectation ~ ceil(1/p)
    const p = Math.max(0.0001, Math.min(0.99, probabilityPct / 100));
    const expectedIndex = Math.max(0, Math.ceil(1 / p) - 1);
    const predicted = upcoming.length ? upcoming[Math.min(expectedIndex, upcoming.length - 1)] : null;

    res.json({
      lastPerformance: {
        date: hoodShow.short_date,
        venue: stripHtml(hoodShow.venue),
        setlist: hoodShow.setlistdata
      },
      showsSinceLastPerformance: showsSince,
      probability: probabilityPct,
      likelyHood: likelyHoodPct,
      nextExpectedPerformance: predicted,
      upcomingShows: upcoming
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