import React from 'react';
import SEO from '../../components/seo/SEO';

export default function AIPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <SEO 
        title="AI Usage Policy" 
        description="Our commitment to ethical AI automation, fair use, and platform safety on Graxion Flow."
        canonicalUrl="https://flow.graxion.in/ai-policy"
      />
      <h1 className="text-4xl font-bold mb-8">AI Usage Policy</h1>
      <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Ethical AI Principles</h2>
          <p>Graxion Flow is committed to providing responsible AI tools. Our autonomous agents are designed to assist, engage, and streamline communication without deceiving end users.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Prohibited Uses</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Generating spam, phishing, or malicious links.</li>
            <li>Impersonating real humans without disclosure where required by local laws.</li>
            <li>Bypassing social media platform guidelines (e.g., WhatsApp, Meta).</li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Monitoring & Enforcement</h2>
          <p>We actively monitor high-volume AI usage for abuse. Accounts found violating our AI Policy will be permanently suspended.</p>
        </section>
      </div>
    </div>
  );
}
