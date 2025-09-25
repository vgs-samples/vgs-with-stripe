# Stripe to VGS Migration Demo

This application demonstrates how to migrate from Stripe hosted checkout to VGS Collect with network token provisioning for enhanced security and compliance.

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
- Stripe sandbox account with API keys
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

### 4. VGS Certificate (No Action Needed)

A sandbox certificate is already committed at `server/outbound-route-sandbox.pem` for the outbound proxy.

- If you need to rotate or use a live environment, replace the file with the appropriate certificate from VGS docs and update your server config accordingly.

### 5. Start the Application

```bash
# Start both frontend and backend
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

**Note**: The backend requires the VGS certificate to be present for the outbound proxy to work correctly.

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

### Migration Guide
See the Migration Plan below. The in-app guide has been removed.

## API Endpoints

### Stripe Routes (`/api/stripe/*`)
- `POST /create-checkout-session` - Create Stripe checkout session
- `GET /checkout-session/:sessionId` - Retrieve checkout session
- `POST /create-customer` - Create Stripe customer
- `POST /create-payment-intent` - Create payment intent

### VGS Routes (`/api/vgs/*`)
- `GET /get-collect-token` - Generate JWT token for VGS Collect authentication
- `POST /process-complete-flow` - Create customer, Payment Method via VGS proxy, and subscription
- `GET /config` - Get VGS configuration (vaultId, environment)

## Testing

### Test Card Numbers
- **Visa**: 4111 1111 1111 1111
- **Mastercard**: 5555 5555 5555 4444
- **American Express**: 3782 8224 6310 005

## Troubleshooting

## Migration Plan (Stripe → VGS)

This plan covers migrating existing Stripe payment methods so VGS becomes the token vault of record, and optionally provisions Network Tokens and enrolls cards in Account Updater.

1) Export data from Stripe
- Use Stripe Dashboard exports as described in `Export file formats` (`https://docs.stripe.com/get-started/data-migrations/export-file-formats`).
- Prefer exporting Payment Methods tied to Customers. Include a header row.
- Suggested columns: `customer_id`, `payment_method_id`, `payment_method_type`, `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year`, `billing_name`, `billing_email`, address fields.
- If subscriptions are used, also export subscription ID and its `default_payment_method` for reconciliation.
- Store CSVs securely until transfer.

2) Transfer CSVs to VGS SFTP; VGS provisions Card IDs (and Network Tokens if enabled)
- VGS provides SFTP credentials and folder conventions. Example naming: `/inbound/stripe_payment_methods_YYYYMMDD.csv`.
- Files should be UTF-8 CSV, comma-separated, quoted where needed, with headers.
- VGS will ingest, create a VGS Card ID for each payment method, and if configured, provision Network Tokens and enroll eligible cards in Account Updater.
- Output mapping (via SFTP `/outbound/` or callback) typically includes: `payment_method_id`, `customer_id`, `vgs_card_id`, `network_token_id` (if provisioned), `status`, `error_message`.

3) Change front-end collection
- Switch to VGS Collect for new cards (see `client/src/components/VGSCollectCheckout.jsx`). Card data never touches your systems.

4) Change back-end PSP token provisioning
- Create Stripe Payment Methods via VGS Outbound Proxy when needed. This repo’s `/api/vgs/process-complete-flow` handles customer creation, Payment Method creation (via proxy), and subscription creation using `STRIPE_PRICE_ID`.

5) Run a delta pass
- After cutover, export a delta from Stripe (records created/updated since the initial export). Upload to SFTP with a `_delta_YYYYMMDD.csv` suffix. VGS will return an updated mapping for any new/changed records.

Operational tips
- Automate SFTP transfers and archiving. Consider PGP encryption for files at rest.
- Monitor VGS processing reports and error rows; re-submit failures after correction.
- Keep a reversible mapping between Stripe Payment Method IDs and `vgs_card_id` during transition.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues:
- Check the migration guide in the application
- Review the VGS documentation
- Check Stripe's API documentation
- Open an issue in this repository
