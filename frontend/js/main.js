// Backend API base URL. For local dev, keep localhost. After deploying to Render,
// replace with your Render service URL, e.g., 'https://likelyhood-backend.onrender.com'
const API_URL = 'http://localhost:3000';

async function fetchHarryHoodStats() {
    try {
        const response = await fetch(`${API_URL}/api/harry-hood-stats`);
        const data = await response.json();

        // Update last performance details
        document.getElementById('last-date').textContent = formatDate(data.lastPerformance.date);
        document.getElementById('last-venue').textContent = data.lastPerformance.venue;

        // Update shows since last performance
        document.getElementById('shows-since').textContent = `${data.showsSinceLastPerformance} shows`;

        // Update probability
        document.getElementById('probability-fill').style.width = `${data.probability}%`;
        document.getElementById('probability-text').textContent = `${data.probability}%`;
    } catch (error) {
        console.error('Error fetching stats:', error);
        document.getElementById('last-date').textContent = 'Error loading data';
        document.getElementById('last-venue').textContent = 'Please try again later';
        document.getElementById('shows-since').textContent = 'Error';
        document.getElementById('probability-text').textContent = 'Error';
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