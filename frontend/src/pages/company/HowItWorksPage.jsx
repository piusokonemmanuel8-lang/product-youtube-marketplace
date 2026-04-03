import React from 'react';

function Step({ number, title, text }) {
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
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '999px',
          background: '#111827',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          marginBottom: '14px',
        }}
      >
        {number}
      </div>
      <h2 style={{ margin: '0 0 10px', fontSize: '22px', color: '#111827' }}>{title}</h2>
      <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.8 }}>{text}</p>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            How VideoGad Works
          </h1>
          <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.7, fontSize: '16px' }}>
            VideoGad helps creators and businesses use video to promote products and reach viewers.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          <Step
            number="1"
            title="Create an Account"
            text="Users can register, set up their profile, and access viewer or creator features depending on account activity."
          />
          <Step
            number="2"
            title="Upload Product Videos"
            text="Creators can upload videos, add details, and attach product-related information or approved external links."
          />
          <Step
            number="3"
            title="Review and Visibility"
            text="VideoGad may review content, links, and promotions to help maintain quality, trust, and platform safety."
          />
          <Step
            number="4"
            title="Grow and Engage"
            text="Viewers watch videos, interact with channels, click product links, and engage with marketplace content."
          />
          <Step
            number="5"
            title="Monetization and Promotion"
            text="Eligible creators may access monetization features, while vendors and advertisers can use VideoGad to increase product exposure."
          />
          <Step
            number="6"
            title="Support and Platform Rules"
            text="All users are expected to follow VideoGad policies, with support available at support@videogad.com."
          />
        </div>
      </div>
    </div>
  );
}