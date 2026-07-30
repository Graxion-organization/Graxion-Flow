import React from 'react';
import SEO from '../../components/seo/SEO';

export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <SEO 
        title="Cookie Policy" 
        description="Learn how Graxion Flow uses cookies to improve your experience and manage sessions securely."
        canonicalUrl="https://flow.graxion.in/cookie-policy"
      />
      <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
      <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
          <p>Cookies are small text files that are stored on your computer or mobile device when you visit our website. They help us remember your actions and preferences.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
          <p>We use essential cookies to manage your authentication sessions and security. We also use analytics cookies to understand how our platform is being used to improve performance.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Managing Cookies</h2>
          <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept essential cookies, you may not be able to use some portions of our Service.</p>
        </section>
      </div>
    </div>
  );
}
