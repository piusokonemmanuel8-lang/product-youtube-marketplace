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

export default function CreatorTermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            VideoGad Creator Terms
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: 1.7 }}>
            These Creator Terms apply to every creator, publisher, or account holder who uploads,
            manages, or monetizes video content on VideoGad.
          </p>
        </div>

        <Section title="1. Creator Role">
          <p>
            Creators on VideoGad may upload videos, manage channels, add product links, grow an
            audience, and where eligible, access monetization, analytics, subscriptions, and other
            creator tools.
          </p>
        </Section>

        <Section title="2. Accuracy and Responsibility">
          <p>
            You are fully responsible for the videos, titles, thumbnails, descriptions, tags,
            product claims, linked stores, and other materials you publish.
          </p>
          <p>
            You must ensure your content is accurate, lawful, non-deceptive, and safe for viewers.
          </p>
        </Section>

        <Section title="3. Product Links and Promotions">
          <p>
            Every product link, store link, and promotional reference you attach to your content
            must lead to a legitimate destination and must not contain harmful redirects, fake
            offers, scams, or prohibited products.
          </p>
        </Section>

        <Section title="4. Content Standards">
          <p>
            Creator content must comply with VideoGad platform rules, content standards, and
            prohibited content restrictions. VideoGad may review and moderate creator content before
            or after publishing.
          </p>
        </Section>

        <Section title="5. Monetization and Earnings">
          <p>
            Monetization access is not automatic. It depends on platform review, eligibility,
            policy compliance, valid audience activity, and any other conditions VideoGad may apply.
          </p>
          <p>
            VideoGad may hold, reverse, delay, or deny earnings where fraud, abuse, invalid
            traffic, policy violations, disputes, or suspicious activity are detected.
          </p>
        </Section>

        <Section title="6. Platform Rights">
          <p>
            VideoGad may remove videos, suspend creator tools, restrict channels, disable
            monetization, or terminate creator access where necessary for safety, trust, quality,
            compliance, or business protection.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            For creator policy issues or creator support, contact{' '}
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