import { Box, Typography, Paper, Link } from '@mui/material';
import { useEffect, useRef } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export function ApiDocumentation() {
  const swaggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add custom styles to make Swagger UI match our theme
    if (swaggerRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .scheme-container { background: none; box-shadow: none; }
        .swagger-ui .opblock-tag { font-size: 18px; }
        .swagger-ui .opblock { margin: 0 0 15px; }
      `;
      swaggerRef.current.appendChild(style);
    }
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        API Documentation
      </Typography>
      <Typography variant="body1" paragraph>
        Explore and test our API endpoints directly from this interface. You can use these endpoints to integrate our services into your applications.
      </Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quick Start
        </Typography>
        <Typography variant="body2" paragraph>
          1. All API requests must include your Bearer token in the Authorization header
        </Typography>
        <Typography variant="body2" paragraph>
          2. The base URL for all API requests is: {import.meta.env.VITE_API_URL}/api/v1
        </Typography>
        <Typography variant="body2">
          3. For detailed integration guides, visit our{' '}
          <Link href="/docs" target="_blank">
            Developer Portal
          </Link>
        </Typography>
      </Paper>
      <Paper elevation={2} sx={{ p: 0 }}>
        <Box ref={swaggerRef}>
          <SwaggerUI
            url={`${import.meta.env.VITE_API_URL}/api/docs.json`}
            docExpansion="list"
            defaultModelsExpandDepth={-1}
            filter={true}
            tryItOutEnabled={true}
          />
        </Box>
      </Paper>
    </Box>
  );
}
