# Adding VGS to a Stripe Payments Environment

This application demonstrates how to migrate from a Stripe-hosted checkout experience to VGS Collect while still retaining Stripe as a payments processor and subscription manager.

## Overview

The demo includes:
- **Stripe Hosted Checkout**: Traditional Stripe hosted checkout implementation
- **VGS Collect Checkout**: Integrated checkout experience using VGS Collect

## Architecture
```
Frontend (React + Vite)
├── Stripe Hosted Checkout (redirects to Stripe)
├── VGS Collect Checkout (self-hosted form)

Backend (Node.js + Express)
├── Stripe API routes (/api/stripe/*)
├── VGS API routes (/api/vgs/*)
```

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Stripe sandbox account with publishable and secret API keys
- Stripe sandbox product with price_id available
- VGS sandbox account
- VGS service credentials for creating cards
- VGS vault credentials for forwarding card details to Stripe

### 1. Install Dependencies

```bash
# Install all dependencies
npm run install-all
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp server/env.example server/.env
```

Edit `server/.env` with your actual credentials:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID=price_30_dollars

# VGS Configuration
VGS_VAULT_ID=your_vgs_vault_id
VGS_CLIENT_ID=your_vgs_client_id
VGS_CLIENT_SECRET=your_vgs_client_secret
VGS_PROXY_USERNAME=your_vgs_proxy_username
VGS_PROXY_PASSWORD=your_vgs_proxy_password
VGS_ENVIRONMENT=sandbox
```

### 3. Configure Frontend Environment Variables

The frontend reads its configuration from `.env` files. No code changes are required.

```bash
cp client/env.example client/.env
```

Then set your values in `client/.env`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_STRIPE_PRICE_ID=price_1234567890
```

### 4. Start the Application

```bash
# Start both frontend and backend
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

## Usage
### Testing Stripe Hosted Checkout
1. Navigate to the "Stripe Hosted" tab
2. Click "Start Checkout"
3. You'll be redirected to Stripe's checkout page
4. Use test card numbers (e.g., 4242 4242 4242 4242)

### Testing VGS Collect Checkout
1. Navigate to the "VGS Collect" tab
2. Fill out the checkout form
3. Use test card numbers (e.g., 4111 1111 1111 1111)
4. Click "Subscribe with VGS"

## API Endpoints
### Stripe Routes (`/api/stripe/*`)
- `POST /create-checkout-session` - Create Stripe checkout session
- `GET /checkout-session/:sessionId` - Retrieve checkout session

### VGS Routes (`/api/vgs/*`)
- `GET /get-collect-token` - Generate JWT token for VGS Collect authentication
- `POST /process-complete-flow` - Create customer, Payment Method via VGS proxy, and subscription
- `GET /config` - Get VGS configuration (vaultId, environment)

## Testing

### Test Card Numbers
- **Visa**: 4111 1111 1111 1111
- **Mastercard**: 5555 5555 5555 4444
- **American Express**: 3782 8224 6310 005
