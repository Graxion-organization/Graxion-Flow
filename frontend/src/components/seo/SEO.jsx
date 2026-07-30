import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title, 
  description, 
  canonicalUrl, 
  type = 'website', 
  image = 'https://flow.graxion.in/og-image.jpg',
  structuredData = null
}) {
  const siteTitle = 'Graxion Flow - AI Automation Platform';
  const fullTitle = title ? `${title} | Graxion Flow` : siteTitle;
  const metaDesc = description || 'Automate WhatsApp Business API chats with AI agents, send broadcasts, and manage omnichannel social campaigns with Graxion Flow.';
  const currentUrl = canonicalUrl || typeof window !== 'undefined' ? window.location.href : 'https://flow.graxion.in';

  // Default Organization Schema
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Graxion Flow",
    "url": "https://flow.graxion.in",
    "logo": "https://flow.graxion.in/favicon.ico",
    "sameAs": [
      "https://www.linkedin.com/company/graxion",
      "https://twitter.com/graxion"
    ]
  };

  const finalStructuredData = structuredData || defaultSchema;

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={metaDesc} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data / JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>
    </Helmet>
  );
}
