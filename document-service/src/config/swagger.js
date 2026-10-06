const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MEAtec Document Service API',
      version: '1.0.0',
      description: 'File upload and management microservice for the Battery Passport Platform',
    },
    servers: [
      { url: '/', description: 'Current environment (Local or Render)' },
      { url: `http://localhost:${process.env.PORT || 3003}`, description: 'Localhost' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
