# Integration Setup TODO List

## Authentication & Authorization
- [ ] **Google OAuth**
  - Sign up at: https://console.cloud.google.com/apis/credentials
  - Required credentials:
    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`
  - Redirect URI: `http://localhost:5173/auth/callback?provider=google`

- [ ] **GitHub OAuth**
  - Sign up at: https://github.com/settings/developers
  - Required credentials:
    - `GITHUB_CLIENT_ID`
    - `GITHUB_CLIENT_SECRET`
  - Redirect URI: `http://localhost:5173/auth/callback?provider=github`

## Payment Integrations

### PayPal
- [ ] **PayPal Developer Account**
  - Sign up at: https://developer.paypal.com/
  - Required credentials:
    - `PAYPAL_CLIENT_ID`
    - `PAYPAL_CLIENT_SECRET`
    - `PAYPAL_WEBHOOK_ID` (for notifications)
  - Environment URLs:
    - Sandbox: https://api-m.sandbox.paypal.com
    - Production: https://api-m.paypal.com
  - Redirect URI: `http://localhost:8000/api/v1/funding/callback/paypal`

### Venmo
- [ ] **Venmo Developer Account**
  - Sign up at: https://developer.venmo.com/
  - Required credentials:
    - `VENMO_CLIENT_ID`
    - `VENMO_CLIENT_SECRET`
  - Redirect URI: `http://localhost:8000/api/v1/funding/callback/venmo`

### Cash App
- [ ] **Cash App Developer Account**
  - Sign up at: https://developers.cash.app/
  - Required credentials:
    - `CASHAPP_CLIENT_ID`
    - `CASHAPP_CLIENT_SECRET`
    - `CASHAPP_API_KEY`
  - Redirect URI: `http://localhost:8000/api/v1/funding/callback/cashapp`

### Plaid (Coming Soon)
- [ ] **Plaid Developer Account**
  - Sign up at: https://dashboard.plaid.com/signup
  - Required credentials:
    - `PLAID_CLIENT_ID`
    - `PLAID_SECRET`
    - `PLAID_ENV` (sandbox/development/production)
  - Redirect URI: `http://localhost:8000/api/v1/funding/callback/plaid`

## Environment Setup

### Backend (.env)
```env
# Authentication
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENV=sandbox

# Venmo
VENMO_CLIENT_ID=
VENMO_CLIENT_SECRET=

# Cash App
CASHAPP_CLIENT_ID=
CASHAPP_CLIENT_SECRET=
CASHAPP_API_KEY=

# Plaid (Coming Soon)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
```

### Frontend (.env.development)
```env
# API Configuration
VITE_API_URL=http://localhost:8000

# OAuth Credentials
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_SECRET=
VITE_GITHUB_CLIENT_ID=
VITE_GITHUB_CLIENT_SECRET=
```

## Important Notes
1. Always start with sandbox/test credentials before moving to production
2. Keep all credentials secure and never commit them to version control
3. Consider using a secure secrets management service for production
4. Update the redirect URIs to your production URLs when deploying
5. Enable required OAuth scopes and permissions in each developer portal
6. Set up webhook endpoints for real-time notifications where available
