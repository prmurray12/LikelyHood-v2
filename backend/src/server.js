const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const phishStats = require('./api/phishStats');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(cors());

// Routes
app.use('/api', phishStats);

// Simple health check and root information
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'likelyhood-backend',
    endpoints: ['/api/harry-hood-stats']
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});