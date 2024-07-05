import router from './routes';

// Create an Express application
const express = require('express');

// Create an Express application
const app = express();

// Set the port from the environment variable or default to 5000
const port = Number(process.env.PORT) || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Use the routes defined in routes/index.js
app.use(router);

// Start the server
app.listen(port, () => {
  console.log('Server running on port', port);
});
