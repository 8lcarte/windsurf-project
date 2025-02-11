import { Router } from 'express';
import { EmailTemplateManager } from '../services/emailTemplateManager';

export const router = Router();
const templateManager = EmailTemplateManager.getInstance();

// List all email templates
router.get('/', async (req, res, next) => {
  try {
    const { agentId } = req.query;
    const templates = await templateManager.getTemplates(agentId as string);
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

// Create new email template
router.post('/', async (req, res, next) => {
  try {
    const template = await templateManager.addTemplate(req.body);
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

// Update email template
router.put('/:id', async (req, res, next) => {
  try {
    const template = await templateManager.updateTemplate(req.params.id, req.body);
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

// Delete email template
router.delete('/:id', async (req, res, next) => {
  try {
    await templateManager.deleteTemplate(req.params.id);
    res.json({
      success: true
    });
  } catch (error) {
    next(error);
  }
});


