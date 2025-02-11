import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';

export type EmailTemplateType = 'payment_reminder' | 'payment_success' | 'payment_failure';

export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  html: string;
  variables: string[];
  isDefault: boolean;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplateData {
  amount: string;
  currency: string;
  provider: string;
  date?: string;
  transactionId?: string;
  error?: string;
  description?: string;
  nextPayment?: string;
  frequency?: string;
  actionUrl?: string;
  agentName?: string;
  agentLogo?: string;
  customVariables?: Record<string, string>;
}

export class EmailTemplateManager {
  private static instance: EmailTemplateManager;
  private templates: Map<string, EmailTemplate>;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate>;

  private constructor() {
    this.templates = new Map();
    this.compiledTemplates = new Map();
    this.registerHelpers();
  }

  static getInstance(): EmailTemplateManager {
    if (!EmailTemplateManager.instance) {
      EmailTemplateManager.instance = new EmailTemplateManager();
    }
    return EmailTemplateManager.instance;
  }

  private registerHelpers(): void {
    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', function(amount: number, currency: string) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    // Date formatting helper
    Handlebars.registerHelper('formatDate', function(date: string) {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Conditional helper
    Handlebars.registerHelper('when', function(condition: any, value: any) {
      return condition ? value : '';
    });

    // String manipulation helpers
    Handlebars.registerHelper('uppercase', function(str: string) {
      return str.toUpperCase();
    });

    Handlebars.registerHelper('lowercase', function(str: string) {
      return str.toLowerCase();
    });

    Handlebars.registerHelper('capitalize', function(str: string) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
  }

  async loadDefaultTemplates(): Promise<void> {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'default_payment_reminder',
        name: 'Default Payment Reminder',
        type: 'payment_reminder',
        subject: 'Upcoming Payment Reminder - {{formatCurrency amount currency}}',
        html: await readFile(join(__dirname, '../templates/payment_reminder.hbs'), 'utf-8'),
        variables: ['amount', 'currency', 'provider', 'nextPayment', 'frequency', 'description'],
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'default_payment_success',
        name: 'Default Payment Success',
        type: 'payment_success',
        subject: 'Payment Successful - {{formatCurrency amount currency}}',
        html: await readFile(join(__dirname, '../templates/payment_success.hbs'), 'utf-8'),
        variables: ['amount', 'currency', 'provider', 'transactionId', 'description'],
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'default_payment_failure',
        name: 'Default Payment Failure',
        type: 'payment_failure',
        subject: 'Payment Failed - {{formatCurrency amount currency}}',
        html: await readFile(join(__dirname, '../templates/payment_failure.hbs'), 'utf-8'),
        variables: ['amount', 'currency', 'provider', 'error', 'description', 'actionUrl'],
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
      this.compiledTemplates.set(template.id, Handlebars.compile(template.html));
    }
  }

  async addTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const id = `${template.agentId}_${template.type}_${Date.now()}`;
    const newTemplate: EmailTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate template variables
    this.validateTemplate(newTemplate);

    // Compile template to verify syntax
    try {
      this.compiledTemplates.set(id, Handlebars.compile(newTemplate.html));
    } catch (error) {
      throw new Error(`Invalid template syntax: ${error.message}`);
    }

    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  private validateTemplate(template: EmailTemplate): void {
    // Check for required variables
    const defaultTemplate = Array.from(this.templates.values())
      .find(t => t.type === template.type && t.isDefault);
    
    if (!defaultTemplate) {
      throw new Error(`No default template found for type: ${template.type}`);
    }

    const missingVars = defaultTemplate.variables
      .filter(v => !template.variables.includes(v));

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }
  }

  getTemplate(agentId: string | undefined, type: EmailTemplateType): EmailTemplate {
    // Try to find agent-specific template
    if (agentId) {
      const agentTemplate = Array.from(this.templates.values())
        .find(t => t.agentId === agentId && t.type === type);
      if (agentTemplate) {
        return agentTemplate;
      }
    }

    // Fall back to default template
    const defaultTemplate = Array.from(this.templates.values())
      .find(t => t.isDefault && t.type === type);

    if (!defaultTemplate) {
      throw new Error(`No template found for type: ${type}`);
    }

    return defaultTemplate;
  }

  renderTemplate(templateId: string, data: EmailTemplateData): { subject: string; html: string } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const compiledTemplate = this.compiledTemplates.get(templateId);
    if (!compiledTemplate) {
      throw new Error(`Compiled template not found: ${templateId}`);
    }

    const subject = Handlebars.compile(template.subject)(data);
    const html = compiledTemplate(data);

    return { subject, html };
  }

  updateTemplate(templateId: string, updates: Partial<EmailTemplate>): EmailTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (template.isDefault) {
      throw new Error('Cannot modify default templates');
    }

    const updatedTemplate: EmailTemplate = {
      ...template,
      ...updates,
      id: templateId,
      isDefault: template.isDefault,
      updatedAt: new Date()
    };

    // Validate and compile updated template
    this.validateTemplate(updatedTemplate);
    this.compiledTemplates.set(templateId, Handlebars.compile(updatedTemplate.html));

    this.templates.set(templateId, updatedTemplate);
    return updatedTemplate;
  }

  deleteTemplate(templateId: string): void {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default templates');
    }

    this.templates.delete(templateId);
    this.compiledTemplates.delete(templateId);
  }

  listTemplates(agentId?: string): EmailTemplate[] {
    if (agentId) {
      return Array.from(this.templates.values())
        .filter(t => t.agentId === agentId || t.isDefault);
    }
    return Array.from(this.templates.values());
  }
}
