"""
Email service for sending emails using various providers.
Supports Flask-Mail (built-in) and third-party services (SendGrid, AWS SES, Mailgun).
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from flask import Flask, render_template_string
from config import (
    EMAIL_SERVICE,
    MAIL_SERVER, MAIL_PORT, MAIL_USE_TLS, MAIL_USE_SSL,
    MAIL_USERNAME, MAIL_PASSWORD, MAIL_DEFAULT_SENDER,
    SENDGRID_API_KEY, AWS_SES_REGION, MAILGUN_API_KEY, MAILGUN_DOMAIN,
    RESEND_API_KEY,
    FLASK_API_URL, FRONTEND_URL,
    REQUIRE_EMAIL_VERIFICATION
)

# Load translations for email templates
def load_email_translations():
    """Load email translations from backend locale files."""
    translations = {}
    locale_dir = os.path.join(os.path.dirname(__file__), '..', 'locale')
    
    # Fallback translations for email templates
    fallback_translations = {
        'en': {
            'verification': {
                'subject': 'Verify your email address - Translide',
                'welcome_title': 'Welcome to Translide!',
                'hello': 'Hello {username}!',
                'verification_intro': 'Thank you for registering with Translide. To complete your registration and start using our PowerPoint translation service, please verify your email address.',
                'button_text': 'Verify Email Address',
                'button_fallback': 'If the button doesn\'t work, you can copy and paste this link into your browser:',
                'expires_note': 'This link will expire in 24 hours.',
                'ignore_note': 'If you didn\'t create an account with Translide, you can safely ignore this email.',
                'footer_copyright': '© 2025 Translide. All rights reserved.'
            },
            'reset_password': {
                'subject': 'Reset your password - Translide',
                'welcome_title': 'Password Reset Request',
                'hello': 'Hello {username}!',
                'reset_intro': 'We received a request to reset your password for your Translide account.',
                'button_text': 'Reset Password',
                'button_fallback': 'If the button doesn\'t work, you can copy and paste this link into your browser:',
                'expires_note': 'This link will expire in 1 hour.',
                'ignore_note': 'If you didn\'t request a password reset, you can safely ignore this email.',
                'footer_copyright': '© 2025 Translide. All rights reserved.'
            }
        }
    }
    
    # Define supported locales
    locales = ['en', 'zh', 'zh_hk', 'es', 'fr', 'de', 'ja', 'ko', 'ru']
    
    for locale in locales:
        locale_file = os.path.join(locale_dir, f'{locale}.json')
        if os.path.exists(locale_file):
            try:
                with open(locale_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    translations[locale] = data.get('email', {})
            except Exception as e:
                logging.warning(f"Failed to load translations for {locale}: {e}")
    
    # If no translations were loaded, use fallback
    if not translations:
        logging.warning("No translation files found, using fallback translations")
        translations = fallback_translations
    
    # Ensure English fallback exists
    if 'en' not in translations:
        translations['en'] = fallback_translations['en']
    
    return translations

# Global translations cache
EMAIL_TRANSLATIONS = load_email_translations()

def get_translation(key: str, locale: str = 'en', **kwargs) -> str:
    """Get a translation for the given key and locale."""
    # Get the translation data for the locale, fallback to English
    locale_data = EMAIL_TRANSLATIONS.get(locale, EMAIL_TRANSLATIONS.get('en', {}))
    
    # Navigate through nested keys (e.g., 'verification.subject')
    keys = key.split('.')
    value = locale_data
    
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            # Fallback to English if key not found
            en_data = EMAIL_TRANSLATIONS.get('en', {})
            en_value = en_data
            for k in keys:
                if isinstance(en_value, dict) and k in en_value:
                    en_value = en_value[k]
                else:
                    return key  # Return key as fallback
            value = en_value
            break
    
    # Replace placeholders
    if isinstance(value, str) and kwargs:
        for placeholder, replacement in kwargs.items():
            value = value.replace(f'{{{placeholder}}}', str(replacement))
    
    return value if isinstance(value, str) else key

class EmailService:
    """Unified email service supporting multiple providers."""
    
    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        self.logger = logging.getLogger(__name__)
        self._mail = None
        
        if app:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """Initialize the email service with Flask app."""
        self.app = app
        
        # Configure Flask-Mail if using flask_mail service
        if EMAIL_SERVICE == 'flask_mail':
            self._setup_flask_mail(app)
    
    def _setup_flask_mail(self, app: Flask):
        """Setup Flask-Mail configuration."""
        try:
            from flask_mail import Mail
            
            app.config['MAIL_SERVER'] = MAIL_SERVER
            app.config['MAIL_PORT'] = MAIL_PORT
            app.config['MAIL_USE_TLS'] = MAIL_USE_TLS
            app.config['MAIL_USE_SSL'] = MAIL_USE_SSL
            app.config['MAIL_USERNAME'] = MAIL_USERNAME
            app.config['MAIL_PASSWORD'] = MAIL_PASSWORD
            app.config['MAIL_DEFAULT_SENDER'] = MAIL_DEFAULT_SENDER
            
            self._mail = Mail(app)
            self.logger.info("Flask-Mail configured successfully")
            
        except ImportError:
            self.logger.warning("Flask-Mail not installed. Email features will be disabled.")
            self._mail = None
        except Exception as e:
            self.logger.warning(f"Flask-Mail configuration failed: {str(e)}. Email features will be disabled.")
            self._mail = None
    
    def send_verification_email(self, user_email: str, username: str, verification_token: str, locale: str = 'en') -> bool:
        """Send email verification email."""
        # Check if email verification is required
        if not REQUIRE_EMAIL_VERIFICATION:
            self.logger.info("Email verification is disabled - skipping email send")
            return True
        
        verify_url = f"{FLASK_API_URL}/verify-email?token={verification_token}"
        
        # Get localized strings
        subject = get_translation("verification.subject", locale)
        welcome_title = get_translation("verification.welcome_title", locale)
        hello_text = get_translation("verification.hello", locale, username=username)
        verification_intro = get_translation("verification.verification_intro", locale)
        button_text = get_translation("verification.button_text", locale)
        button_fallback = get_translation("verification.button_fallback", locale)
        expires_note = get_translation("verification.expires_note", locale)
        ignore_note = get_translation("verification.ignore_note", locale)
        footer_copyright = get_translation("verification.footer_copyright", locale)
        
        # HTML email template with fixed button styling
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Email Verification</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background-color: #f9fafb; }
                .button { 
                    display: inline-block; 
                    background-color: #2563eb; 
                    color: white !important; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin: 20px 0;
                    font-weight: bold;
                }
                .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{{ welcome_title }}</h1>
                </div>
                <div class="content">
                    <h2>{{ hello_text }}</h2>
                    <p>{{ verification_intro }}</p>
                    
                    <p style="text-align: center;">
                        <a href="{{ verify_url }}" class="button">{{ button_text }}</a>
                    </p>
                    
                    <p>{{ button_fallback }}</p>
                    <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                        {{ verify_url }}
                    </p>
                    
                    <p><strong>{{ expires_note }}</strong></p>
                    
                    <p>{{ ignore_note }}</p>
                </div>
                <div class="footer">
                    <p>{{ footer_copyright }}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_template = """
        {{ welcome_title }}
        
        {{ hello_text }}
        
        {{ verification_intro }}
        
        {{ verify_url }}
        
        {{ expires_note }}
        
        {{ ignore_note }}
        
        {{ footer_copyright }}
        """
        
        html_content = render_template_string(html_template, 
            welcome_title=welcome_title,
            hello_text=hello_text,
            verification_intro=verification_intro,
            button_text=button_text,
            button_fallback=button_fallback,
            expires_note=expires_note,
            ignore_note=ignore_note,
            footer_copyright=footer_copyright,
            verify_url=verify_url
        )
        
        text_content = render_template_string(text_template,
            welcome_title=welcome_title,
            hello_text=hello_text,
            verification_intro=verification_intro,
            expires_note=expires_note,
            ignore_note=ignore_note,
            footer_copyright=footer_copyright,
            verify_url=verify_url
        )
        
        return self._send_email(
            to_email=user_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
    
    def send_password_reset_email(self, user_email: str, username: str, reset_token: str, locale: str = 'en') -> bool:
        """Send password reset email."""
        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        
        # Get localized strings
        subject = get_translation("reset_password.subject", locale)
        welcome_title = get_translation("reset_password.welcome_title", locale)
        hello_text = get_translation("reset_password.hello", locale, username=username)
        reset_intro = get_translation("reset_password.reset_intro", locale)
        button_text = get_translation("reset_password.button_text", locale)
        button_fallback = get_translation("reset_password.button_fallback", locale)
        expires_note = get_translation("reset_password.expires_note", locale)
        ignore_note = get_translation("reset_password.ignore_note", locale)
        footer_copyright = get_translation("reset_password.footer_copyright", locale)
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background-color: #f9fafb; }
                .button { 
                    display: inline-block; 
                    background-color: #dc2626; 
                    color: white !important; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin: 20px 0;
                    font-weight: bold;
                }
                .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{{ welcome_title }}</h1>
                </div>
                <div class="content">
                    <h2>{{ hello_text }}</h2>
                    <p>{{ reset_intro }}</p>
                    
                    <p style="text-align: center;">
                        <a href="{{ reset_url }}" class="button">{{ button_text }}</a>
                    </p>
                    
                    <p>{{ button_fallback }}</p>
                    <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                        {{ reset_url }}
                    </p>
                    
                    <p><strong>{{ expires_note }}</strong></p>
                    
                    <p>{{ ignore_note }}</p>
                </div>
                <div class="footer">
                    <p>{{ footer_copyright }}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_template = """
        {{ welcome_title }}
        
        {{ hello_text }}
        
        {{ reset_intro }}
        
        {{ reset_url }}
        
        {{ expires_note }}
        
        {{ ignore_note }}
        
        {{ footer_copyright }}
        """
        
        html_content = render_template_string(html_template, 
            welcome_title=welcome_title,
            hello_text=hello_text,
            reset_intro=reset_intro,
            button_text=button_text,
            button_fallback=button_fallback,
            expires_note=expires_note,
            ignore_note=ignore_note,
            footer_copyright=footer_copyright,
            reset_url=reset_url
        )
        
        text_content = render_template_string(text_template,
            welcome_title=welcome_title,
            hello_text=hello_text,
            reset_intro=reset_intro,
            expires_note=expires_note,
            ignore_note=ignore_note,
            footer_copyright=footer_copyright,
            reset_url=reset_url
        )
        
        return self._send_email(
            to_email=user_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
    
    def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email using the configured service."""
        try:
            if EMAIL_SERVICE == 'flask_mail':
                return self._send_flask_mail(to_email, subject, html_content, text_content)
            elif EMAIL_SERVICE == 'sendgrid':
                return self._send_sendgrid(to_email, subject, html_content, text_content)
            elif EMAIL_SERVICE == 'ses':
                return self._send_aws_ses(to_email, subject, html_content, text_content)
            elif EMAIL_SERVICE == 'mailgun':
                return self._send_mailgun(to_email, subject, html_content, text_content)
            elif EMAIL_SERVICE == 'resend':
                return self._send_resend(to_email, subject, html_content, text_content)
            else:
                self.logger.error(f"Unknown email service: {EMAIL_SERVICE}")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def _send_flask_mail(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email using Flask-Mail."""
        if not self._mail:
            self.logger.error("Flask-Mail not configured")
            return False
        
        try:
            from flask_mail import Message
            
            msg = Message(
                subject=subject,
                recipients=[to_email],
                html=html_content,
                body=text_content
            )
            
            self._mail.send(msg)
            self.logger.info(f"Email sent successfully to {to_email} via Flask-Mail")
            return True
            
        except Exception as e:
            self.logger.error(f"Flask-Mail error: {str(e)}")
            return False
    
    def _send_sendgrid(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email using SendGrid."""
        if not SENDGRID_API_KEY:
            self.logger.error("SendGrid API key not configured")
            return False
        
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
            
            from_email = Email(MAIL_DEFAULT_SENDER)
            to_email_obj = To(to_email)
            content = Content("text/html", html_content)
            
            mail = Mail(from_email, to_email_obj, subject, content)
            
            if text_content:
                mail.add_content(Content("text/plain", text_content))
            
            response = sg.client.mail.send.post(request_body=mail.get())
            
            if response.status_code in [200, 201, 202]:
                self.logger.info(f"Email sent successfully to {to_email} via SendGrid")
                return True
            else:
                self.logger.error(f"SendGrid error: {response.status_code}")
                return False
                
        except ImportError:
            self.logger.error("SendGrid not installed. Install with: pip install sendgrid")
            return False
        except Exception as e:
            self.logger.error(f"SendGrid error: {str(e)}")
            return False
    
    def _send_aws_ses(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email using AWS SES."""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            client = boto3.client('ses', region_name=AWS_SES_REGION)
            
            destination = {'ToAddresses': [to_email]}
            message = {
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_content, 'Charset': 'UTF-8'}
                }
            }
            
            if text_content:
                message['Body']['Text'] = {'Data': text_content, 'Charset': 'UTF-8'}
            
            response = client.send_email(
                Source=MAIL_DEFAULT_SENDER,
                Destination=destination,
                Message=message
            )
            
            self.logger.info(f"Email sent successfully to {to_email} via AWS SES")
            return True
            
        except ImportError:
            self.logger.error("Boto3 not installed. Install with: pip install boto3")
            return False
        except ClientError as e:
            self.logger.error(f"AWS SES error: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(f"AWS SES error: {str(e)}")
            return False
    
    def _send_mailgun(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email using Mailgun."""
        if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
            self.logger.error("Mailgun API key or domain not configured")
            return False
        
        try:
            import requests
            
            url = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages"
            
            data = {
                'from': MAIL_DEFAULT_SENDER,
                'to': to_email,
                'subject': subject,
                'html': html_content
            }
            
            if text_content:
                data['text'] = text_content
            
            response = requests.post(
                url,
                auth=('api', MAILGUN_API_KEY),
                data=data
            )
            
            if response.status_code == 200:
                self.logger.info(f"Email sent successfully to {to_email} via Mailgun")
                return True
            else:
                self.logger.error(f"Mailgun error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"Mailgun error: {str(e)}")
            return False
    
    def _send_resend(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email using Resend."""
        if not RESEND_API_KEY:
            self.logger.error("Resend API key not configured")
            return False
        
        try:
            import resend
            
            # Set API key
            resend.api_key = RESEND_API_KEY
            
            # Prepare email data using the new API format
            params: resend.Emails.SendParams = {
                'from': MAIL_DEFAULT_SENDER,
                'to': [to_email],
                'subject': subject,
                'html': html_content
            }
            
            # Add text content if provided
            if text_content:
                params['text'] = text_content
            
            # Send email using the new API
            email = resend.Emails.send(params)
            
            if email and email.get('id'):
                self.logger.info(f"Email sent successfully to {to_email} via Resend (ID: {email.get('id')})")
                return True
            else:
                self.logger.error(f"Resend error: No message ID returned. Response: {email}")
                return False
                
        except ImportError:
            self.logger.error("Resend not installed. Install with: pip install resend")
            return False
        except Exception as e:
            # Check if it's a validation error
            if "validation" in str(e).lower() or "invalid" in str(e).lower():
                self.logger.error(f"Resend validation error: {str(e)}")
            else:
                self.logger.error(f"Resend error: {str(e)}")
            return False
    
    def test_email_configuration(self) -> Dict[str, Any]:
        """Test the email configuration and return status."""
        status = {
            'service': EMAIL_SERVICE,
            'configured': False,
            'error': None
        }
        
        try:
            if EMAIL_SERVICE == 'flask_mail':
                if MAIL_USERNAME and MAIL_PASSWORD and MAIL_SERVER:
                    status['configured'] = True
                else:
                    status['error'] = "Missing MAIL_USERNAME, MAIL_PASSWORD, or MAIL_SERVER"
                    
            elif EMAIL_SERVICE == 'sendgrid':
                if SENDGRID_API_KEY:
                    status['configured'] = True
                else:
                    status['error'] = "Missing SENDGRID_API_KEY"
                    
            elif EMAIL_SERVICE == 'ses':
                try:
                    import boto3
                    # Check if AWS credentials are available
                    boto3.Session().get_credentials()
                    status['configured'] = True
                except:
                    status['error'] = "AWS credentials not configured"
                    
            elif EMAIL_SERVICE == 'mailgun':
                if MAILGUN_API_KEY and MAILGUN_DOMAIN:
                    status['configured'] = True
                else:
                    status['error'] = "Missing MAILGUN_API_KEY or MAILGUN_DOMAIN"
                    
            elif EMAIL_SERVICE == 'resend':
                if RESEND_API_KEY:
                    status['configured'] = True
                else:
                    status['error'] = "Missing RESEND_API_KEY"
            else:
                status['error'] = f"Unknown email service: {EMAIL_SERVICE}"
                
        except Exception as e:
            status['error'] = str(e)
        
        return status

# Global email service instance
email_service = EmailService() 