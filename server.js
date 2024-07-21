import routes from './routes';
import express from 'express';

const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json({ limit: '200Mb' }));

routes(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
module.exports = app;
