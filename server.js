const express = require('express');
const process = require('process');
const routes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
