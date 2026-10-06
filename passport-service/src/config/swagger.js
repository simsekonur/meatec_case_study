const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MEAtec Passport Service API',
      version: '1.0.0',
      description: 'Battery Passport data access microservice',
    },
    servers: [
      { url: '/', description: 'Current environment (Local or Render)' },
      { url: `http://localhost:${process.env.PORT || 3002}`, description: 'Localhost' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
