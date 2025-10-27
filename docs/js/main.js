// Backend API base URL.
// - Uses localhost when running the site locally
// - Uses the deployed Render URL in production
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://likelyhood-v2.onrender.com';

async function fetchHarryHoodStats() {
    try {
    const response = await fetch(`${API_BASE}/api/harry-hood-stats`);
        const data = await response.json();

        // Update last performance details
        document.getElementById('last-date').textContent = formatDate(data.lastPerformance.date);
        document.getElementById('last-venue').textContent = data.lastPerformance.venue;

        // Update shows since last performance
        document.getElementById('shows-since').textContent = `${data.showsSinceLastPerformance} shows`;

        // Update Likely Hood (tonight) percentage
        const likely = typeof data.likelyHood === 'number' ? data.likelyHood : data.probability;
        document.getElementById('probability-fill').style.width = `${likely}%`;
        document.getElementById('probability-text').textContent = `${likely}%`;

        // Update Next Expected Performance (date + venue)
        if (data.nextExpectedPerformance) {
            const nd = data.nextExpectedPerformance.date;
            const nv = data.nextExpectedPerformance.venue || `${data.nextExpectedPerformance.city || ''}${data.nextExpectedPerformance.state ? ', ' + data.nextExpectedPerformance.state : ''}`;
            document.getElementById('next-expected-date').textContent = nd ? formatDate(nd) : 'TBD';
            document.getElementById('next-expected-venue').textContent = nv || 'TBD';
        } else {
            document.getElementById('next-expected-date').textContent = 'TBD';
            document.getElementById('next-expected-venue').textContent = '';
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        document.getElementById('last-date').textContent = 'Error loading data';
        document.getElementById('last-venue').textContent = 'Please try again later';
        document.getElementById('shows-since').textContent = 'Error';
    document.getElementById('probability-text').textContent = 'Error';
    const ned = document.getElementById('next-expected-date');
    const nev = document.getElementById('next-expected-venue');
    if (ned) ned.textContent = 'Error';
    if (nev) nev.textContent = '';
    }
}

function formatDate(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Fetch stats when page loads
fetchHarryHoodStats();

// Refresh stats every 5 minutes
setInterval(fetchHarryHoodStats, 300000);