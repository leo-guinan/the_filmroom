import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from src.core import get_logger

logger = get_logger(__name__)


class EmailService:
    """Email service for sending notifications."""
    
    @staticmethod
    def send_invitation(
        to_email: str,
        coach_name: str,
        invitation_link: str,
        personal_message: Optional[str] = None
    ) -> bool:
        """Send invitation email to a new client."""
        
        # Get email configuration from environment variables
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER', '')
        smtp_password = os.getenv('SMTP_PASSWORD', '')
        from_email = os.getenv('FROM_EMAIL', smtp_user)
        
        if not smtp_user or not smtp_password:
            logger.warning(
                "Email credentials not configured. "
                "Set SMTP_USER and SMTP_PASSWORD environment variables to enable email sending."
            )
            logger.info(f"Would send invitation to {to_email} with link: {invitation_link}")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"{coach_name} has invited you to The Film Room"
            msg['From'] = from_email
            msg['To'] = to_email
            
            # Create the HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        border-radius: 10px 10px 0 0;
                        text-align: center;
                    }}
                    .content {{
                        background: white;
                        padding: 30px;
                        border: 1px solid #e1e1e1;
                        border-radius: 0 0 10px 10px;
                    }}
                    .button {{
                        display: inline-block;
                        padding: 12px 30px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }}
                    .message-box {{
                        background: #f7f7f7;
                        padding: 15px;
                        border-left: 4px solid #667eea;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                    .footer {{
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #e1e1e1;
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎬 Welcome to The Film Room</h1>
                    <p>Your coaching journey starts here</p>
                </div>
                <div class="content">
                    <h2>Hi there!</h2>
                    <p><strong>{coach_name}</strong> has invited you to join The Film Room, a platform for personalized coaching sessions.</p>
                    
                    {f'''
                    <div class="message-box">
                        <strong>Personal message from {coach_name}:</strong><br>
                        {personal_message}
                    </div>
                    ''' if personal_message else ''}
                    
                    <p>The Film Room provides:</p>
                    <ul>
                        <li>📹 Live video coaching sessions</li>
                        <li>📅 Easy session scheduling</li>
                        <li>📊 Progress tracking</li>
                        <li>🔒 Secure and private platform</li>
                    </ul>
                    
                    <center>
                        <a href="{invitation_link}" class="button">Accept Invitation</a>
                    </center>
                    
                    <p><small>Or copy and paste this link into your browser:</small><br>
                    <small>{invitation_link}</small></p>
                    
                    <div class="footer">
                        <p>This invitation will expire in 7 days.</p>
                        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Create plain text version
            text_content = f"""
{coach_name} has invited you to The Film Room

Hi there!

{coach_name} has invited you to join The Film Room, a platform for personalized coaching sessions.

{f"Personal message from {coach_name}: {personal_message}" if personal_message else ""}

The Film Room provides:
- Live video coaching sessions
- Easy session scheduling  
- Progress tracking
- Secure and private platform

Accept your invitation here:
{invitation_link}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
            """
            
            # Attach parts
            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            msg.attach(part1)
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            logger.info(f"Successfully sent invitation email to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False