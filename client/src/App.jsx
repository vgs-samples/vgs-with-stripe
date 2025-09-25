import React, { useState } from 'react';
import StripeHostedCheckout from './components/StripeHostedCheckout';
import VGSCollectCheckout from './components/VGSCollectCheckout';
import { CreditCard, Shield } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('stripe');

  const tabs = [
    { id: 'stripe', label: 'Stripe Hosted Redirect', icon: CreditCard },
    { id: 'vgs', label: 'VGS Collect on Frontend' , icon: CreditCard}
  ];

  return (
    <div className="container">
      <header className="header">
        <h1>Adding VGS to a Stripe Payments Environment</h1>
        <p>
          This application demonstrates how to migrate from Stripe hosted checkout 
          to VGS Collect with network token provisioning for enhanced security and compliance.
        </p>
      </header>

      <div className="demo-section">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`button ${activeTab === id ? '' : 'secondary'}`}
              onClick={() => setActiveTab(id)}
              style={{ flex: 1 }}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'stripe' && <StripeHostedCheckout />}
        {activeTab === 'vgs' && <VGSCollectCheckout />}
      </div>
    </div>
  );
}

export default App;
