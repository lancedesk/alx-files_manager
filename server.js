const routes = require('./routes/index');

// Create an Express application
const express = require('express');

// Create an Express application
const app = express();

// Set the port from the environment variable or default to 5000
const PORT = Number(process.env.PORT) || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Use the routes defined in routes/index.js
app.use('/', routes);

// Start the server
app.listen(port, () => {
  console.log(`App listening to port ${PORT}`);
});
