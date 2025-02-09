import { rest } from 'msw';
import {
  mockTemplates,
  mockTemplateHistory,
  mockTemplateAnalytics,
  mockApiErrors
} from './templates';

const API_BASE = '/api/v1';

export const handlers = [
  // List templates
  rest.get(`${API_BASE}/templates`, (req, res, ctx) => {
    const skip = Number(req.url.searchParams.get('skip')) || 0;
    const limit = Number(req.url.searchParams.get('limit')) || 10;
    const activeOnly = req.url.searchParams.get('active_only') === 'true';

    let templates = [...mockTemplates];
    if (activeOnly) {
      templates = templates.filter(t => t.isActive);
    }

    return res(
      ctx.status(200),
      ctx.json(templates.slice(skip, skip + limit))
    );
  }),

  // Get single template
  rest.get(`${API_BASE}/templates/:templateId`, (req, res, ctx) => {
    const { templateId } = req.params;
    const template = mockTemplates.find(t => t.id === Number(templateId));

    if (!template) {
      return res(
        ctx.status(404),
        ctx.json(mockApiErrors.notFound)
      );
    }

    return res(
      ctx.status(200),
      ctx.json(template)
    );
  }),

  // Get template history
  rest.get(`${API_BASE}/templates/:templateId/history`, (req, res, ctx) => {
    const { templateId } = req.params;
    
    // Simulate not found error for specific ID
    if (templateId === '999') {
      return res(
        ctx.status(404),
        ctx.json(mockApiErrors.notFound)
      );
    }

    return res(
      ctx.status(200),
      ctx.json(mockTemplateHistory)
    );
  }),

  // Get template analytics
  rest.get(`${API_BASE}/templates/:templateId/analytics`, (req, res, ctx) => {
    const { templateId } = req.params;
    
    // Simulate unauthorized error for specific ID
    if (templateId === '888') {
      return res(
        ctx.status(403),
        ctx.json(mockApiErrors.unauthorized)
      );
    }

    return res(
      ctx.status(200),
      ctx.json(mockTemplateAnalytics)
    );
  }),

  // Create template
  rest.post(`${API_BASE}/templates`, async (req, res, ctx) => {
    const body = await req.json();
    
    // Simulate validation error for specific case
    if (!body.name) {
      return res(
        ctx.status(400),
        ctx.json(mockApiErrors.validation)
      );
    }

    // Simulate rate limiting
    if (body.name === 'rate-limit-test') {
      return res(
        ctx.status(429),
        ctx.set('Retry-After', '60'),
        ctx.json(mockApiErrors.rateLimited)
      );
    }

    return res(
      ctx.status(201),
      ctx.json({
        ...mockTemplates[0],
        ...body,
        id: Math.floor(Math.random() * 1000) + 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
  }),

  // Create template version
  rest.post(`${API_BASE}/templates/:templateId/versions`, async (req, res, ctx) => {
    const { templateId } = req.params;
    const body = await req.json();

    // Simulate not found error for specific ID
    if (templateId === '999') {
      return res(
        ctx.status(404),
        ctx.json(mockApiErrors.notFound)
      );
    }

    return res(
      ctx.status(201),
      ctx.json({
        ...mockTemplates[0],
        ...body,
        id: Number(templateId),
        version: mockTemplates[0].version + 1,
        updatedAt: new Date().toISOString()
      })
    );
  })
];
