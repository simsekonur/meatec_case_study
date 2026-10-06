require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3003;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Document Service running on port ${PORT}`);
    logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
  });
};

start();
