import React from 'react';

function ContactCard({ title, text, href, label }) {
  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        background: '#ffffff',
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: '22px', color: '#111827' }}>{title}</h2>
      <p style={{ margin: '0 0 14px', color: '#4b5563', lineHeight: 1.8 }}>{text}</p>
      <a
        href={href}
        style={{
          display: 'inline-block',
          padding: '10px 16px',
          borderRadius: '10px',
          background: '#111827',
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        {label}
      </a>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            Contact / Support
          </h1>
          <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.7, fontSize: '16px' }}>
            Need help with VideoGad? Reach out for account, creator, vendor, payment, moderation,
            policy, or platform support.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          <ContactCard
            title="General Support"
            text="For general questions, account help, login issues, and platform support."
            href="mailto:support@videogad.com"
            label="Email support@videogad.com"
          />
          <ContactCard
            title="Creator Support"
            text="For creator accounts, channel issues, upload questions, and monetization support."
            href="mailto:support@videogad.com"
            label="Contact Creator Support"
          />
          <ContactCard
            title="Vendor / Advertiser Support"
            text="For ad approvals, store links, product promotion, and campaign-related support."
            href="mailto:support@videogad.com"
            label="Contact Vendor Support"
          />
        </div>
      </div>
    </div>
  );
}