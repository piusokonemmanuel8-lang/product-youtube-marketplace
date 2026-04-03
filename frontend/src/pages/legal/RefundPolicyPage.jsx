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

export default function RefundPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            VideoGad Refund / Payment Policy
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: 1.7 }}>
            This page explains general payment handling, billing expectations, and refund
            limitations for platform-related charges on VideoGad.
          </p>
        </div>

        <Section title="1. Platform Charges">
          <p>
            VideoGad may offer subscriptions, advertising-related charges, marketplace access
            charges, wallet-based actions, or other payment features depending on the service used.
          </p>
        </Section>

        <Section title="2. Payment Review">
          <p>
            Payments may be subject to review for fraud prevention, security, billing accuracy,
            abuse detection, and platform compliance.
          </p>
        </Section>

        <Section title="3. Refund Decisions">
          <p>
            Refund eligibility, where applicable, may depend on the type of charge, service status,
            delivery status, fraud review, abuse findings, duplicate billing, technical failure, or
            other platform considerations.
          </p>
        </Section>

        <Section title="4. Non-Automatic Refunds">
          <p>
            Refunds are not automatically guaranteed simply because a user changes their mind after
            a valid platform charge has been processed.
          </p>
        </Section>

        <Section title="5. Suspicious or Abusive Activity">
          <p>
            VideoGad may deny refund requests where abuse, manipulation, fraud, chargeback misuse,
            or policy violations are suspected.
          </p>
        </Section>

        <Section title="6. Payment Disputes">
          <p>
            Users should contact VideoGad support first for payment questions, charge concerns, or
            billing disputes before escalating elsewhere where possible.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            For payment and refund support, contact{' '}
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