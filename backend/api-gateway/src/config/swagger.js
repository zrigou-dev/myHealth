const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyHeart API Gateway',
      version: '1.0.0',
      description: 'Interactive API Documentation for MyHeart Microservices',
    },
    servers: [
      {
        url: 'http://localhost:' + (process.env.PORT || 8080),
        description: 'Development Gateway',
      },
    ],
  },
  // Document routes defined in API Gateway
  apis: ['./src/routes/*.js'], 
};

module.exports = swaggerJsdoc(options);
