// Import necessary modules
const express = require('express');
const routes = require('./routes/index');
const dotenv = require('dotenv');

// Load environment variables from a .env file if present
dotenv.config();

// Create an Express application
const app = express();

// Set the port from the environment variable or default to 5000
const port = process.env.PORT || 5000;

// Use the routes defined in routes/index.js
app.use('/', routes);

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
