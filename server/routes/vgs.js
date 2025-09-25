const express = require('express');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const qs = require('qs');
const tunnel = require('tunnel');
const router = express.Router();

// VGS API configuration
const VGS_VAULT_ID = process.env.VGS_VAULT_ID;
const VGS_CLIENT_ID = process.env.VGS_CLIENT_ID;
const VGS_CLIENT_SECRET = process.env.VGS_CLIENT_SECRET;
const VGS_PROXY_USERNAME = process.env.VGS_PROXY_USERNAME;
const VGS_PROXY_PASSWORD = process.env.VGS_PROXY_PASSWORD;
const VGS_ENVIRONMENT = process.env.VGS_ENVIRONMENT || 'sandbox';

const VGS_AUTH_TOKEN_URL = 'https://auth.verygoodsecurity.com/auth/realms/vgs/protocol/openid-connect/token';

// Generate JWT token for VGS Collect authentication
router.get('/get-collect-token', async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append('client_id', VGS_CLIENT_ID);
    params.append('client_secret', VGS_CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(VGS_AUTH_TOKEN_URL, params);
    res.json({ access_token: response.data.access_token });
  } catch (error) {
    console.error('Error getting VGS token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get token' });
  }
});


// Create VGS outbound proxy client for PSP token provisioning
function getProxyAgent() {
  const vgs_outbound_url = `${VGS_VAULT_ID}.${VGS_ENVIRONMENT}.verygoodproxy.com`;
  console.log(`Sending request through outbound Route: ${vgs_outbound_url}`);
  
  const proxyConfig = {
    proxy: {
      servername: vgs_outbound_url,
      host: vgs_outbound_url,
      port: 8443,
      proxyAuth: `${VGS_PROXY_USERNAME}:${VGS_PROXY_PASSWORD}`
    }
  };

  return tunnel.httpsOverHttps(proxyConfig);
}

// Create Stripe payment method using VGS outbound proxy
async function createStripePaymentMethod(cardObject, customerId = null) {
  try {
    const agent = getProxyAgent();
    const buff = Buffer.from(process.env.STRIPE_SECRET_KEY + ':');
    const base64Auth = buff.toString('base64');

    const instance = axios.create({
      baseURL: 'https://api.stripe.com',
      headers: { 'authorization': `Basic ${base64Auth}` },
      httpsAgent: agent,
    });

    const pmResponse = await instance.post('/v1/payment_methods', qs.stringify({
      type: 'card',
      card: {
        number: cardObject.attributes.pan_alias,
        cvc: cardObject.attributes.cvc_alias,
        exp_month: cardObject.attributes.exp_month,
        exp_year: cardObject.attributes.exp_year,
      }
    }));

    // Attach to customer if provided
    if (customerId) {
      await instance.post(`/v1/payment_methods/${pmResponse.data.id}/attach`, qs.stringify({
        customer: customerId
      }));
    }

    return {
      success: true,
      paymentMethodId: pmResponse.data.id,
      cardDetails: {
        last4: cardObject.attributes.last4,
        brand: pmResponse.data.card.brand,
        exp_month: cardObject.attributes.exp_month,
        exp_year: cardObject.attributes.exp_year,
      }
    };
  } catch (error) {
    console.error('Error creating Stripe payment method:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Complete VGS Collect flow - single endpoint for all operations
router.post('/process-complete-flow', async (req, res) => {
  try {
        const { cardObject, customerEmail, customerName } = req.body;

    if (!cardObject || !cardObject.attributes) {
      return res.status(400).json({ error: 'Invalid card object provided' });
    }

    // Step 1: Create Stripe customer
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName || 'Cardholder',
    });

    // Step 2: Create Stripe payment method using VGS outbound proxy
    const paymentResult = await createStripePaymentMethod(cardObject, customer.id);

    if (!paymentResult.success) {
      return res.status(500).json({ error: paymentResult.error });
    }

    // Step 3: Create subscription or process payment
        // Always create a subscription using STRIPE_PRICE_ID
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: process.env.STRIPE_PRICE_ID }],
          default_payment_method: paymentResult.paymentMethodId,
          expand: ['latest_invoice.payment_intent'],
        });

        res.json({
          success: true,
          customerId: customer.id,
          paymentMethodId: paymentResult.paymentMethodId,
          cardDetails: paymentResult.cardDetails,
          subscription: {
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
          },
          paymentIntent: null,
        });
  } catch (error) {
    console.error('Error processing complete flow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get VGS configuration for frontend
router.get('/config', (req, res) => {
  res.json({
    vaultId: VGS_VAULT_ID,
    environment: VGS_ENVIRONMENT,
  });
});

module.exports = router;
