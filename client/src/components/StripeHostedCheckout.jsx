import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, ExternalLink, CheckCircle } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');

function StripeHostedCheckout() {
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  const handleCreateCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      setSessionId(data.sessionId);

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSession = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/stripe/checkout-session/${sessionId}`);
      const data = await response.json();

      if (response.ok) {
        setSessionData(data);
      } else {
        throw new Error(data.error || 'Failed to retrieve session');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>
        <CreditCard size={24} />
        Stripe Hosted Checkout
      </h2>
      
      <p>
        This demonstrates the traditional Stripe hosted checkout approach. 
        When you click the button below, you'll be redirected to Stripe's secure checkout page.
      </p>

      <div className="step">
        <h3>How it works:</h3>
        <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>User clicks "Start Checkout"</li>
          <li>Redirected to Stripe's hosted checkout page</li>
          <li>User enters payment details on Stripe's secure form</li>
          <li>Stripe processes the payment and redirects back</li>
          <li>Your application receives the result via webhook or session check</li>
        </ol>
      </div>

      {error && (
        <div className="status error">
          Error: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className="button"
          onClick={handleCreateCheckout}
          disabled={loading}
        >
          <ExternalLink size={20} />
          {loading ? 'Creating...' : 'Start Checkout'}
        </button>

        {sessionId && (
          <button
            className="button secondary"
            onClick={handleCheckSession}
          >
            <CheckCircle size={20} />
            Check Session Status
          </button>
        )}
      </div>

      {sessionData && (
        <div className="status success">
          <h4>Session Details:</h4>
          <div className="code-block">
            {JSON.stringify(sessionData, null, 2)}
          </div>
        </div>
      )}

      {/* Code examples removed per request */}

      {/* Pros/Cons removed per request */}
    </div>
  );
}

export default StripeHostedCheckout;
