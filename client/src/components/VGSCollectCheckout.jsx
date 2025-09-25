import React, { useState, useEffect, useRef } from 'react';
import { Shield, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

function VGSCollectCheckout() {
  const VGS_COLLECT_URL = 'https://js.verygoodvault.com/vgs-collect/3.2.1/vgs-collect.js';
  const [loading, setLoading] = useState(false);
  const [vgsConfig, setVgsConfig] = useState(null);
  const [vgsForm, setVgsForm] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    // Load VGS configuration
    fetch('/api/vgs/config')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.text().then(text => {
          try {
            return text ? JSON.parse(text) : {};
          } catch (e) {
            console.error('Failed to parse JSON:', text);
            throw new Error('Invalid JSON response');
          }
        });
      })
      .then(data => {
        setVgsConfig(data);
        initializeVGSCollect(data);
      })
      .catch(err => {
        // Suppress user-facing error; log only
        console.warn('VGS config load warning:', err);
      });

    // Cleanup function to prevent duplicate fields
    return () => {
      if (vgsForm) {
        vgsForm.destroy();
      }
    };
  }, []);

  const initializeVGSCollect = (config) => {
    // Check if script is already loaded
    if (document.querySelector(`script[src="${VGS_COLLECT_URL}"]`)) {
      // Script already loaded, just initialize form
      initializeForm(config);
      return;
    }

    // Load VGS Collect script dynamically
    const script = document.createElement('script');
    script.src = VGS_COLLECT_URL;
    script.onload = () => {
      // In some cases the global may not be immediately available
      const tryInit = (attempt = 0) => {
        if (window.VGSCollect && typeof window.VGSCollect.create === 'function') {
          initializeForm(config);
        } else if (attempt < 5) {
          setTimeout(() => tryInit(attempt + 1), 100 * (attempt + 1));
        } else {
          console.warn('VGSCollect global not available after script load. Skipping init.');
        }
      };
      tryInit();
    };
    document.head.appendChild(script);
  };

  const initializeForm = (config) => {
    // Clear existing fields first
    const fields = ['#cardholder-name', '#card-number', '#card-expiration', '#card-cvc'];
    fields.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.innerHTML = '';
        // Add CSS to remove any default spacing
        element.style.margin = '0';
        element.style.padding = '0';
        element.style.border = 'none';
        element.style.outline = 'none';
      }
    });

    // Initialize VGS Collect form (guard if library not present)
    if (!window.VGSCollect || typeof window.VGSCollect.create !== 'function') {
      console.warn('VGSCollect not ready. Form init suppressed.');
      return;
    }

    const form = window.VGSCollect.create(config.vaultId, config.environment, () => {
      console.log('VGS Collect form created');
    });

    // Configure form fields
    const css = {
      "vertical-align": "middle",
      "white-space": "normal",
      "background": "white",
      "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      "font-size": "1rem",
      "color": "#1a202c",
      "line-height": "1.6",
      "padding": "0.75rem",
      "box-sizing": "border-box",
      "border": "1px solid #e2e8f0",
      "border-radius": "6px",
      "width": "100%",
      "max-width": "100%",
      "height": "40px",
      "transition": "border-color 0.2s, box-shadow 0.2s",
      "margin": "0",
      "margin-bottom": "0",
      "&:focus": {
        "outline": "none",
        "border-color": "#4299e1",
        "box-shadow": "0 0 0 3px rgba(66, 153, 225, 0.1)"
      },
      "&::placeholder": {
        "color": "#a0aec0",
        "font-size": "1rem"
      },
    };

    // Create form fields
    form.cardholderNameField('#cardholder-name', { 
      placeholder: 'Jane Doe', 
      css: css 
    });
    form.cardNumberField('#card-number', { 
      placeholder: '4111 1111 1111 1111', 
      css: css 
    });
    form.cardExpirationDateField('#card-expiration', { 
      placeholder: 'MM / YY', 
      css: css 
    });
    form.cardCVCField('#card-cvc', { 
      placeholder: '123', 
      css: css 
    });

    setVgsForm(form);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (!vgsForm) {
      setError('VGS Collect form not initialized');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Get JWT token for VGS Collect authentication
      const tokenResponse = await fetch('/api/vgs/get-collect-token');
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`HTTP ${tokenResponse.status}: ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();

      // Step 2: Create card object using VGS Collect
      const cardResponse = await vgsForm.createCard({
        auth: tokenData.access_token,
        data: {
          "cardholder": {}
        }
      }, 
      (status, cardObject) => {
        console.log('Card created successfully:', cardObject);
        processCardObject(cardObject);
      },
      (error) => {
        console.error('Card creation failed:', error);
        setError('Card creation failed: ' + error.message);
        setLoading(false);
      });

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const processCardObject = async (cardObject) => {
    try {
      // Single API call to handle the complete flow
          const response = await fetch('/api/vgs/process-complete-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardObject: cardObject.data,
          customerEmail: formData.email,
              customerName: 'Cardholder',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      setResult({
        customerId: data.customerId,
        paymentMethodId: data.paymentMethodId,
        subscriptionId: data.subscription?.subscriptionId,
        cardDetails: data.cardDetails,
        cardObject: cardObject.data,
        subscription: data.subscription,
        paymentIntent: data.paymentIntent,
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>
        <Shield size={24} />
        VGS Collect Checkout
      </h2>
      
      <p>
        This demonstrates the VGS Collect approach with network token provisioning. 
        Card data is tokenized by VGS and then revealed to create Stripe payment methods.
      </p>

      <div className="step">
        <h3>How it works:</h3>
        <ol className="ol-compact">
          <li>User enters payment details in your custom form</li>
          <li>VGS Collect tokenizes the card data securely</li>
          <li>Tokenized card ID is sent to your backend</li>
          <li>Backend reveals card details from VGS</li>
          <li>Backend creates Stripe payment method with revealed details</li>
          <li>Subscription is created using the payment method</li>
        </ol>
      </div>

      {error && (
        <div className="status error">
          <AlertCircle size={20} />
          Error: {error}
        </div>
      )}

      {result && (
        <div className="status success">
          <CheckCircle size={20} />
          <h4>Payment Processed Successfully!</h4>
          <div className="code-block">
            {JSON.stringify(result, null, 2)}
          </div>
        </div>
      )}

      <div className="vgs-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group form-group--cap">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group mb-1 form-group--cap">
            <label>Cardholder Name</label>
            <div id="cardholder-name" className="vgs-field-wrapper"></div>
          </div>

          <div className="form-group mb-1 form-group--cap">
            <label>Card Number</label>
            <div id="card-number" className="vgs-field-wrapper"></div>
          </div>

          <div className="vgs-form-row">
            <div className="form-group mb-1 form-group--cap" style={{ minWidth: 0 }}>
              <label>Expiry Date</label>
              <div id="card-expiration" className="vgs-field-wrapper"></div>
            </div>

            <div className="form-group mb-1 form-group--cap" style={{ minWidth: 0 }}>
              <label>CVV</label>
              <div id="card-cvc" className="vgs-field-wrapper"></div>
            </div>
          </div>

          <button
            type="submit"
            className="button button-full"
            disabled={loading || !vgsForm}
          >
            <CreditCard size={20} />
            {loading ? 'Processing...' : 'Subscribe with VGS'}
          </button>
        </form>
      </div>

	  {/* Code examples removed per request */}
    </div>
  );
}

export default VGSCollectCheckout;
