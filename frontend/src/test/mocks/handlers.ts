import { http, HttpResponse } from 'msw';
import {
  mockTemplates,
  mockTemplateHistory,
  mockTemplateAnalytics,
  mockApiErrors
} from './templates';

const API_BASE = '/api/v1';

export const handlers = [
  // Funding Sources
  http.get(`${API_BASE}/funding/sources`, () => {
    return HttpResponse.json([
      {
        id: 'paypal_1',
        provider: 'paypal',
        connected: true,
        name: 'PayPal'
      }
    ]);
  }),

  http.post(`${API_BASE}/funding/connect/:provider`, () => {
    return HttpResponse.json({
      url: 'https://oauth.provider.com',
      state: 'test_state',
      provider: 'paypal'
    });
  }),

  http.delete(`${API_BASE}/funding/sources/:sourceId`, () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // List templates
  http.get(`${API_BASE}/templates`, ({ request }) => {
    const url = new URL(request.url);
    const skip = Number(url.searchParams.get('skip')) || 0;
    const limit = Number(url.searchParams.get('limit')) || 10;
    const activeOnly = url.searchParams.get('active_only') === 'true';

    let templates = [...mockTemplates];
    if (activeOnly) {
      templates = templates.filter(t => t.isActive);
    }

    return HttpResponse.json(
      templates.slice(skip, skip + limit),
      { status: 200 }
    );
  }),

  // Get single template
  http.get(`${API_BASE}/templates/:templateId`, ({ params }) => {
    const { templateId } = params;
    const template = mockTemplates.find(t => t.id === Number(templateId));

    if (!template) {
      return HttpResponse.json(
        mockApiErrors.notFound,
        { status: 404 }
      );
    }

    return HttpResponse.json(template, { status: 200 });
  }),

  // Get template history
  http.get(`${API_BASE}/templates/:templateId/history`, ({ params }) => {
    const { templateId } = params;
    
    // Simulate not found error for specific ID
    if (templateId === '999') {
      return HttpResponse.json(
        mockApiErrors.notFound,
        { status: 404 }
      );
    }

    return HttpResponse.json(mockTemplateHistory, { status: 200 });
  }),

  // Get template analytics
  http.get(`${API_BASE}/templates/:templateId/analytics`, ({ params }) => {
    const { templateId } = params;
    
    // Simulate unauthorized error for specific ID
    if (templateId === '888') {
      return HttpResponse.json(
        mockApiErrors.unauthorized,
        { status: 403 }
      );
    }

    return HttpResponse.json(mockTemplateAnalytics, { status: 200 });
  }),

  // Create template
  http.post(`${API_BASE}/templates`, async ({ request }) => {
    const body = await request.json();
    
    // Simulate validation error for specific case
    if (!body.name) {
      return HttpResponse.json(
        mockApiErrors.validation,
        { status: 400 }
      );
    }

    // Simulate rate limiting
    if (body.name === 'rate-limit-test') {
      return new HttpResponse(
        JSON.stringify(mockApiErrors.rateLimited),
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    return HttpResponse.json({
      ...mockTemplates[0],
      ...body,
      id: Math.floor(Math.random() * 1000) + 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { status: 201 });
  }),

  // Create template version
  http.post(`${API_BASE}/templates/:templateId/versions`, async ({ request, params }) => {
    const { templateId } = params;
    const body = await request.json();

    // Simulate not found error for specific ID
    if (templateId === '999') {
      return HttpResponse.json(
        mockApiErrors.notFound,
        { status: 404 }
      );
    }

    return HttpResponse.json({
      ...mockTemplates[0],
      ...body,
      id: Number(templateId),
      version: mockTemplates[0].version + 1,
      updatedAt: new Date().toISOString()
    }, { status: 201 });
  })
];
