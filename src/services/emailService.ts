import sgMail from '@sendgrid/mail';
import { logger } from '@/utils/logger';
import { config } from '@/config/env';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  dynamicData?: Record<string, any>;
}

export class EmailService {
  private static instance: EmailService;
  private isConfigured = false;

  private constructor() {
    const apiKey = config.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.error('SendGrid API key is required');
      this.isConfigured = false;
      return;
    }
    sgMail.setApiKey(apiKey);
    this.isConfigured = true;
    logger.info('SendGrid email service initialized');
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send email using SendGrid
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      logger.error('Email service not configured. Cannot send email.');
      return false;
    }

    try {
      const { to, template, dynamicData = {} } = options;
      
      // Replace dynamic data in template
      let htmlContent = template.html;
      let textContent = template.text;
      let subject = template.subject;

      Object.entries(dynamicData).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
        textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
      });

      const msg = {
        to,
        from: {
          email: config.SENDGRID_FROM_EMAIL,
          name: config.SENDGRID_FROM_NAME
        },
        subject,
        text: textContent,
        html: htmlContent,
      };

      await sgMail.send(msg);
      logger.info(`Email sent successfully to ${to}`);
      return true;

    } catch (error: any) {
      logger.error('Failed to send email:', {
        error: error.message,
        to: options.to,
        subject: options.template.subject
      });
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName?: string): Promise<boolean> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const template: EmailTemplate = {
      subject: 'Reset Your Password - Legacy Doc Generator',
      html: this.getPasswordResetHtmlTemplate(),
      text: this.getPasswordResetTextTemplate()
    };

    return this.sendEmail({
      to: email,
      template,
      dynamicData: {
        userName: userName || 'User',
        resetUrl,
        resetToken,
        expiryTime: '1 hour'
      }
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(email: string, verificationToken: string, userName?: string): Promise<boolean> {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email/${verificationToken}`;
    
    const template: EmailTemplate = {
      subject: 'Verify Your Email - Legacy Doc Generator',
      html: this.getEmailVerificationHtmlTemplate(),
      text: this.getEmailVerificationTextTemplate()
    };

    return this.sendEmail({
      to: email,
      template,
      dynamicData: {
        userName: userName || 'User',
        verificationUrl,
        verificationToken
      }
    });
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const dashboardUrl = `${config.FRONTEND_URL}/dashboard`;
    
    const template: EmailTemplate = {
      subject: 'Welcome to Legacy Doc Generator!',
      html: this.getWelcomeHtmlTemplate(),
      text: this.getWelcomeTextTemplate()
    };

    return this.sendEmail({
      to: email,
      template,
      dynamicData: {
        userName,
        dashboardUrl
      }
    });
  }

  /**
   * HTML template for password reset email
   */
  private getPasswordResetHtmlTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Legacy Doc Generator</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello {{userName}},</p>
          <p>We received a request to reset your password for your Legacy Doc Generator account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="{{resetUrl}}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
          <p><strong>This link will expire in {{expiryTime}}.</strong></p>
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          <p>Best regards,<br>The Legacy Doc Generator Team</p>
        </div>
        <div class="footer">
          <p>© 2024 Legacy Doc Generator. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Text template for password reset email
   */
  private getPasswordResetTextTemplate(): string {
    return `
Reset Your Password - Legacy Doc Generator

Hello {{userName}},

We received a request to reset your password for your Legacy Doc Generator account.

To reset your password, please visit the following link:
{{resetUrl}}

This link will expire in {{expiryTime}}.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The Legacy Doc Generator Team

© 2024 Legacy Doc Generator. All rights reserved.
    `;
  }

  /**
   * HTML template for email verification
   */
  private getEmailVerificationHtmlTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Legacy Doc Generator</h1>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Hello {{userName}},</p>
          <p>Thank you for signing up for Legacy Doc Generator! To complete your registration, please verify your email address.</p>
          <p>Click the button below to verify your email:</p>
          <a href="{{verificationUrl}}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
          <p>Once verified, you'll have full access to all Legacy Doc Generator features.</p>
          <p>Best regards,<br>The Legacy Doc Generator Team</p>
        </div>
        <div class="footer">
          <p>© 2024 Legacy Doc Generator. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Text template for email verification
   */
  private getEmailVerificationTextTemplate(): string {
    return `
Verify Your Email Address - Legacy Doc Generator

Hello {{userName}},

Thank you for signing up for Legacy Doc Generator! To complete your registration, please verify your email address.

To verify your email, please visit the following link:
{{verificationUrl}}

Once verified, you'll have full access to all Legacy Doc Generator features.

Best regards,
The Legacy Doc Generator Team

© 2024 Legacy Doc Generator. All rights reserved.
    `;
  }

  /**
   * HTML template for welcome email
   */
  private getWelcomeHtmlTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Legacy Doc Generator</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .feature { margin: 15px 0; padding: 10px; background: white; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Legacy Doc Generator!</h1>
        </div>
        <div class="content">
          <h2>Hello {{userName}},</h2>
          <p>Welcome to Legacy Doc Generator! We're excited to help you transform your legacy codebases into comprehensive documentation.</p>
          
          <div class="feature">
            <h3>🚀 What you can do:</h3>
            <ul>
              <li>Upload ZIP files containing your legacy code</li>
              <li>Automatically analyze code structure and dependencies</li>
              <li>Generate comprehensive documentation with AI</li>
              <li>Export documentation in multiple formats</li>
            </ul>
          </div>

          <p>Ready to get started? Click the button below to access your dashboard:</p>
          <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
          
          <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
          
          <p>Happy documenting!<br>The Legacy Doc Generator Team</p>
        </div>
        <div class="footer">
          <p>© 2024 Legacy Doc Generator. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Text template for welcome email
   */
  private getWelcomeTextTemplate(): string {
    return `
Welcome to Legacy Doc Generator!

Hello {{userName}},

Welcome to Legacy Doc Generator! We're excited to help you transform your legacy codebases into comprehensive documentation.

What you can do:
- Upload ZIP files containing your legacy code
- Automatically analyze code structure and dependencies  
- Generate comprehensive documentation with AI
- Export documentation in multiple formats

Ready to get started? Visit your dashboard:
{{dashboardUrl}}

If you have any questions or need assistance, don't hesitate to reach out to our support team.

Happy documenting!
The Legacy Doc Generator Team

© 2024 Legacy Doc Generator. All rights reserved.
    `;
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
