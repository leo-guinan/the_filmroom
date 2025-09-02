# LiveKit Configuration Instructions

## Issue
The application is failing to connect to LiveKit Cloud because the API credentials are not configured properly.

## Error Details
- Token validation is failing with "invalid token" and "error in cryptographic primitive"
- The LiveKit server URL is: `coachalia-pe53z5zq.livekit.cloud`
- The token issuer in the logs is: `API9oTTEYPWgi9d`

## Solution

You need to update the environment variables in your production deployment with your actual LiveKit Cloud credentials.

### 1. Get Your LiveKit Cloud Credentials

1. Log in to your LiveKit Cloud account at https://cloud.livekit.io
2. Navigate to your project settings
3. Find your API Key and API Secret

### 2. Update FlightControl Configuration

Edit the `flightcontrol.json` file and update the backend service environment variables:

```json
"envVariables": {
  ...
  "LIVEKIT_API_KEY": "YOUR_ACTUAL_API_KEY",
  "LIVEKIT_API_SECRET": "YOUR_ACTUAL_API_SECRET", 
  "LIVEKIT_URL": "wss://coachalia-pe53z5zq.livekit.cloud"
}
```

### 3. Deploy the Changes

After updating the configuration:
1. Commit the changes to your repository
2. Push to trigger a new deployment
3. The application should now be able to generate valid tokens for LiveKit

## Security Note

For production, consider using FlightControl's secrets management instead of hardcoding credentials in the JSON file:
- Use FlightControl's dashboard to set these as secure environment variables
- Reference them in your configuration using FlightControl's secret syntax

## Verification

After deployment, you can verify the configuration by:
1. Logging into the application
2. Creating a test room
3. The video connection should establish successfully without 401 errors