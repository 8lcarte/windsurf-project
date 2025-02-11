import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { Express } from 'express';

/**
 * Configure and initialize Swagger UI for API documentation
 * @param app Express application instance
 */
export function setupSwagger(app: Express): void {
  // Load OpenAPI specification
  const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));

  // Add server URL based on environment
  const serverUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.yourapp.com'
    : 'http://localhost:' + (process.env.PORT || '3000');

  swaggerDocument.servers = [
    {
      url: serverUrl + '/api/v1',
      description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server'
    }
  ];

  // Configure Swagger UI options
  const options: swaggerUi.SwaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Digital Wallet API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  };

  // Serve Swagger documentation
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(swaggerDocument, options));

  // Serve raw OpenAPI spec
  app.get('/api/docs.json', (req, res) => {
    res.json(swaggerDocument);
  });

  // Redirect root to docs
  app.get('/api', (req, res) => {
    res.redirect('/api/docs');
  });
}
