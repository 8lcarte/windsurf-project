import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { EmailTemplateManager, EmailTemplateType, EmailTemplateData } from './emailTemplateManager';

interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface EmailServiceConfig {
  agentId?: string;
  agentName?: string;
  agentLogo?: string;
  headerBgColor?: string;
  buttonBgColor?: string;
  customCss?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  private templateManager: EmailTemplateManager;
  private config: EmailServiceConfig;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    this.templateManager = EmailTemplateManager.getInstance();
    this.config = {};
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(config: EmailConfig): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: config.from,
        to: config.to,
        subject: config.subject,
        html: config.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  setConfig(config: EmailServiceConfig): void {
    this.config = { ...this.config, ...config };
  }

  async sendRecurringPaymentNotification(params: {
    to: string;
    amount: number;
    currency: string;
    provider: string;
    frequency: string;
    nextPayment: Date;
    description?: string;
  }): Promise<void> {
    const template = this.templateManager.getTemplate(this.config.agentId, 'payment_reminder');
    const { subject, html } = this.templateManager.renderTemplate(template.id, {
      amount: params.amount,
      currency: params.currency,
      provider: params.provider,
      frequency: params.frequency,
      nextPayment: params.nextPayment.toISOString(),
      description: params.description,
      actionUrl: `${process.env.APP_URL}/funding/recurring`,
      ...this.config
    });

    await this.sendEmail({
      from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
      to: params.to,
      subject,
      html,
    });
  }

  async sendPaymentSuccessNotification(params: {
    to: string;
    amount: number;
    currency: string;
    provider: string;
    transactionId: string;
    description?: string;
  }): Promise<void> {
    const template = this.templateManager.getTemplate(this.config.agentId, 'payment_success');
    const { subject, html } = this.templateManager.renderTemplate(template.id, {
      amount: params.amount,
      currency: params.currency,
      provider: params.provider,
      transactionId: params.transactionId,
      description: params.description,
      actionUrl: `${process.env.APP_URL}/funding/transactions`,
      ...this.config
    });

    await this.sendEmail({
      from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
      to: params.to,
      subject,
      html,
    });
  }

  async sendPaymentFailureNotification(params: {
    to: string;
    amount: number;
    currency: string;
    provider: string;
    error: string;
    description?: string;
  }): Promise<void> {
    const template = this.templateManager.getTemplate(this.config.agentId, 'payment_failure');
    const { subject, html } = this.templateManager.renderTemplate(template.id, {
      amount: params.amount,
      currency: params.currency,
      provider: params.provider,
      error: params.error,
      description: params.description,
      actionUrl: `${process.env.APP_URL}/funding/recurring`,
      ...this.config
    });

    await this.sendEmail({
      from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
      to: params.to,
      subject,
      html,
    });
  }
}
