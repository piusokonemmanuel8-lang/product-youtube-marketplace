import React from 'react';

function Section({ title, children }) {
  return (
    <section
      style={{
        marginBottom: '28px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        background: '#ffffff',
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 700, color: '#111827' }}>
        {title}
      </h2>
      <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#374151' }}>{children}</div>
    </section>
  );
}

export default function ProhibitedContentPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            VideoGad Prohibited Content / Products
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: 1.7 }}>
            The following categories are not allowed on VideoGad and may be removed or restricted.
          </p>
        </div>

        <Section title="1. Illegal and Dangerous Items">
          <p>
            Content or promotions involving illegal products, unsafe goods, prohibited services, or
            unlawful activity are not allowed.
          </p>
        </Section>

        <Section title="2. Fraud and Deception">
          <p>
            Fake stores, scam offers, phishing links, impersonation, false product claims, and
            deceptive promotions are prohibited.
          </p>
        </Section>

        <Section title="3. Harmful Links and Files">
          <p>
            Malware, spyware, malicious downloads, harmful redirects, hidden destinations, and
            security threats are not allowed.
          </p>
        </Section>

        <Section title="4. Rights-Infringing Content">
          <p>
            Stolen content, copyright violations, unauthorized brand use, trademark abuse, and
            other rights-infringing material are prohibited.
          </p>
        </Section>

        <Section title="5. Abusive or Unsafe Material">
          <p>
            Abusive, hateful, exploitative, or dangerous content that harms users, creators,
            viewers, businesses, or the platform is not allowed.
          </p>
        </Section>

        <Section title="6. Manipulation and Abuse">
          <p>
            Content or systems designed to manipulate views, clicks, engagement, earnings,
            subscriptions, or trust signals are prohibited.
          </p>
        </Section>

        <Section title="7. Platform Enforcement">
          <p>
            VideoGad may remove content, reject uploads, block links, restrict monetization, or
            suspend accounts where prohibited content or products are detected.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            To report prohibited content or unsafe product promotions, contact{' '}
            <a
              href="mailto:support@videogad.com"
              style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
            >
              support@videogad.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}