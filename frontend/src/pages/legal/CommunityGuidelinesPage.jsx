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

export default function CommunityGuidelinesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            VideoGad Content & Community Guidelines
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: 1.7 }}>
            These guidelines explain the type of behavior and content expected on VideoGad.
          </p>
        </div>

        <Section title="1. Respect the Community">
          <p>
            Users should treat others with respect. Harassment, abuse, intimidation, hate,
            impersonation, and exploitative behavior are not allowed.
          </p>
        </Section>

        <Section title="2. Honest Content">
          <p>
            Videos, comments, links, descriptions, and promotions must be truthful and must not
            intentionally mislead viewers.
          </p>
        </Section>

        <Section title="3. Safe Platform Use">
          <p>
            Do not upload harmful files, malicious links, scams, spam, or content designed to
            manipulate or exploit users.
          </p>
        </Section>

        <Section title="4. Product-Focused Quality">
          <p>
            VideoGad is a product-video marketplace. Content should be relevant to products,
            services, promotions, creators, brands, or marketplace activity that fits the
            platform’s purpose.
          </p>
        </Section>

        <Section title="5. Rights and Ownership">
          <p>
            Only upload content you own or have permission to use. Copyright infringement,
            unauthorized brand misuse, and stolen content are prohibited.
          </p>
        </Section>

        <Section title="6. Enforcement">
          <p>
            VideoGad may remove content, restrict features, suspend accounts, or apply other
            enforcement actions where community or content rules are violated.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            To report community concerns, contact{' '}
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