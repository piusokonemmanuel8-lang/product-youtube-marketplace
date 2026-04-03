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

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            About VideoGad
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: 1.7 }}>
            VideoGad is a video-first marketplace platform built to help creators, vendors, and
            brands promote products through engaging video content.
          </p>
        </div>

        <Section title="What VideoGad Does">
          <p>
            VideoGad brings together product videos, creator channels, audience engagement,
            marketplace visibility, product links, and promotional tools in one platform.
          </p>
        </Section>

        <Section title="Who It Serves">
          <p>
            VideoGad is built for creators, businesses, vendors, advertisers, and viewers who want
            a video-based way to promote, discover, and interact with product-focused content.
          </p>
        </Section>

        <Section title="Platform Vision">
          <p>
            Our goal is to build a trusted ecosystem where product promotion through video becomes
            more visible, more engaging, and more creator-friendly.
          </p>
        </Section>

        <Section title="Support">
          <p>
            For more information about VideoGad, contact{' '}
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