// Cloud Run server wrapper for Firebase Functions v2
// This file is required when deploying via gcloud --source

const functions = require('./index.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (required by Cloud Run)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the Firebase Function v2 handler
// onRequest returns a callable function that accepts Express (req, res)
if (functions.api) {
  // Use as catch-all route handler
  // The Firebase Function v2 handler is Express-compatible
  app.all('*', (req, res) => {
    // Call the Firebase Function handler directly
    // It accepts Express req/res objects
    try {
      functions.api(req, res);
    } catch (error) {
      console.error('Error calling Firebase Function:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });
} else {
  // Fallback if api export doesn't exist
  app.all('*', (req, res) => {
    res.status(404).json({ error: 'API handler not found' });
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CafeSync API server running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});

