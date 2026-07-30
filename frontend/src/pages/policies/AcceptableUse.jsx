import React from 'react';
import SEO from '../../components/seo/SEO';

export default function AcceptableUse() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <SEO 
        title="Acceptable Use Policy" 
        description="Guidelines and prohibited actions when using Graxion Flow APIs and platform services."
        canonicalUrl="https://flow.graxion.in/acceptable-use"
      />
      <h1 className="text-4xl font-bold mb-8">Acceptable Use Policy</h1>
      <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. General Guidelines</h2>
          <p>This Acceptable Use Policy outlines unacceptable uses of our SaaS platform. You agree not to use the Service to harm others or disrupt operations.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Unacceptable Content</h2>
          <p>You may not use our API or dashboard to transmit content that is illegal, defamatory, abusive, or infringing on intellectual property.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. API Abuse</h2>
          <p>Automated bulk scraping, reverse engineering, or intentional network exhaustion (DDoS) against Graxion Flow infrastructure is strictly prohibited.</p>
        </section>
      </div>
    </div>
  );
}
