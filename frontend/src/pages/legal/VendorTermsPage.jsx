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

export default function VendorTermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            VideoGad Advertiser / Vendor Terms
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: 1.7 }}>
            These terms apply to vendors, advertisers, store owners, brands, and businesses that
            promote products or services through VideoGad.
          </p>
        </div>

        <Section title="1. Vendor and Advertiser Access">
          <p>
            VideoGad allows approved vendors and advertisers to promote products through videos,
            channels, ad campaigns, creator partnerships, and related marketplace tools.
          </p>
        </Section>

        <Section title="2. Honest Business Information">
          <p>
            You must provide truthful information about your brand, products, pricing, delivery,
            store links, promotions, and claims. Misrepresentation is prohibited.
          </p>
        </Section>

        <Section title="3. Product and Service Rules">
          <p>
            You may not use VideoGad to promote illegal, unsafe, deceptive, counterfeit, abusive,
            or otherwise prohibited products or services.
          </p>
        </Section>

        <Section title="4. Store Links and External Pages">
          <p>
            All links connected to vendor or advertiser content must point to valid and safe
            destinations. Harmful redirects, malware, fake stores, phishing pages, and misleading
            landing pages are not allowed.
          </p>
        </Section>

        <Section title="5. Advertising Review">
          <p>
            VideoGad may review, reject, limit, pause, or remove ads, videos, campaigns, or vendor
            listings at its discretion where trust, safety, compliance, or quality concerns exist.
          </p>
        </Section>

        <Section title="6. Payment and Billing">
          <p>
            Ad-related billing, promotions, subscriptions, or campaign charges may be subject to
            internal review, fraud checks, policy compliance, and platform billing rules.
          </p>
        </Section>

        <Section title="7. Liability for Claims">
          <p>
            Vendors and advertisers are solely responsible for their claims, offers, product
            accuracy, store performance, and external sales pages.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            For vendor or advertiser support, contact{' '}
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