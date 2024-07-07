import express from 'express';
import routes from './routes';

// Create an Express application
const app = express();;

// Set the port from the environment variable or default to 5000
const PORT = Number(process.env.PORT) || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Use the routes defined in routes/index.js
routes(app);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
module.exports = app;
