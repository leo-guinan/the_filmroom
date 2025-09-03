# Loops.so Email Setup for The Film Room

## Overview
The Film Room uses Loops.so for transactional emails. This provides a modern, developer-friendly email service with great deliverability.

## Setup Steps

### 1. Create Loops.so Account
1. Go to [Loops.so](https://loops.so) and sign up
2. Get your API key from Settings → API

### 2. Create Transactional Email Templates

In Loops.so, create these transactional email templates:

#### Client Invitation Email (`client-invitation`)
Variables needed:
- `coach_name` - Name of the coach sending invitation
- `invitation_link` - The signup link with invitation token
- `personal_message` - Optional personal message from coach
- `has_message` - Boolean to conditionally show message section

Example template:
```html
Subject: {{coach_name}} has invited you to The Film Room

Hi there!

{{coach_name}} has invited you to join The Film Room for personalized coaching sessions.

{{#if has_message}}
Personal message from {{coach_name}}:
{{personal_message}}
{{/if}}

Accept your invitation: {{invitation_link}}

This invitation expires in 7 days.
```

#### Session Reminder Email (`session-reminder`)
Variables needed:
- `client_name` - Client's name
- `coach_name` - Coach's name
- `session_time` - Formatted session time
- `session_link` - Link to join the session

#### Welcome Email (`welcome-email`)
Variables needed:
- `user_name` - New user's name
- `user_type` - Either "coach" or "client"

### 3. Environment Variables

Set these environment variables:

```bash
# Required
LOOPS_API_KEY=your_loops_api_key

# Optional (defaults shown)
LOOPS_INVITATION_EMAIL_ID=client-invitation
LOOPS_REMINDER_EMAIL_ID=session-reminder  
LOOPS_WELCOME_EMAIL_ID=welcome-email
```

### 4. Testing

To test locally:
```bash
export LOOPS_API_KEY=your_api_key
python
>>> from src.services.email import EmailService
>>> EmailService.send_invitation(
...     to_email="test@example.com",
...     coach_name="Test Coach",
...     invitation_link="https://filmroom.leoasaservice.com/signup?invitation=test123",
...     personal_message="Looking forward to working with you!"
... )
```

### 5. Production Deployment

In FlightControl, set the `LOOPS_API_KEY` environment variable with your production API key.

## API Integration

The email service automatically:
1. Adds/updates contacts in Loops.so
2. Sends transactional emails using your templates
3. Logs all email activities

## Benefits of Using Loops.so

- **Better Deliverability**: Professional email infrastructure
- **Template Management**: Edit email templates without code changes
- **Analytics**: Track open rates, click rates
- **Contact Management**: Automatic contact list building
- **GDPR Compliant**: Built-in unsubscribe handling
- **No SMTP Configuration**: Simple API-based integration

## Troubleshooting

If emails aren't sending:
1. Check that `LOOPS_API_KEY` is set correctly
2. Verify template IDs match your Loops.so templates
3. Check backend logs for detailed error messages
4. Ensure your Loops.so account is verified and active

## Support

- Loops.so Documentation: https://loops.so/docs
- Loops.so API Reference: https://loops.so/docs/api