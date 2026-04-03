import React, { useEffect, useState } from 'react';

const footerLinkBaseStyle = {
  color: '#cbd5e1',
  textDecoration: 'none',
  fontSize: '14px',
  lineHeight: 1.8,
  transition: 'all 0.2s ease',
  wordBreak: 'break-word',
};

function FooterLink({ href, children }) {
  return (
    <a
      href={href}
      style={footerLinkBaseStyle}
      onMouseOver={(e) => {
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.transform = 'translateX(2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.color = '#cbd5e1';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      {children}
    </a>
  );
}

function FooterSectionTitle({ children }) {
  return (
    <h3
      style={{
        margin: '0 0 14px',
        fontSize: '15px',
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: '#ffffff',
      }}
    >
      {children}
    </h3>
  );
}

export default function Footer() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      setIsMobile(width <= 767);
      setIsTablet(width > 767 && width <= 1024);
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const gridTemplateColumns = isMobile
    ? '1fr'
    : isTablet
      ? 'repeat(2, minmax(0, 1fr))'
      : 'minmax(280px, 1.5fr) repeat(3, minmax(0, 1fr))';

  return (
    <footer
      style={{
        marginTop: '56px',
        background:
          'linear-gradient(180deg, #020817 0%, #08142c 45%, #0b1733 100%)',
        color: '#ffffff',
        borderTop: '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: '0 -8px 30px rgba(2, 6, 23, 0.25)',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: isMobile ? '40px 16px 18px' : '56px 20px 22px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns,
            gap: isMobile ? '28px' : '32px',
            alignItems: 'start',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: isMobile ? '38px' : '42px',
                  height: isMobile ? '38px' : '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #0f172a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: isMobile ? '17px' : '18px',
                  color: '#ffffff',
                  boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
                  flexShrink: 0,
                }}
              >
                V
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: isMobile ? '22px' : '28px',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: '#ffffff',
                    wordBreak: 'break-word',
                  }}
                >
                  VideoGad
                </div>
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: isMobile ? '11px' : '12px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#93c5fd',
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  Video Products Marketplace
                </div>
              </div>
            </div>

            <p
              style={{
                margin: '0 0 18px',
                color: '#dbe4f0',
                fontSize: isMobile ? '14px' : '15px',
                lineHeight: 1.95,
                maxWidth: isMobile ? '100%' : '360px',
                wordBreak: 'break-word',
              }}
            >
              VideoGad is a video products marketplace where creators and vendors
              upload product videos, attach their buy now links, and turn views
              into real customer action. We help viewers discover products through
              video and redirect interested buyers straight to each seller&apos;s
              landing page.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <span
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  background: 'rgba(37, 99, 235, 0.14)',
                  border: '1px solid rgba(96, 165, 250, 0.2)',
                  color: '#bfdbfe',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Upload Videos
              </span>
              <span
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Add Buy Links
              </span>
              <span
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Drive Sales
              </span>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <FooterSectionTitle>Legal</FooterSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/creator-terms">Creator Terms</FooterLink>
              <FooterLink href="/vendor-terms">Advertiser / Vendor Terms</FooterLink>
              <FooterLink href="/refund-policy">Refund / Payment Policy</FooterLink>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <FooterSectionTitle>Platform</FooterSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <FooterLink href="/monetization-policy">Monetization Policy</FooterLink>
              <FooterLink href="/community-guidelines">
                Content &amp; Community Guidelines
              </FooterLink>
              <FooterLink href="/prohibited-content">
                Prohibited Content / Products
              </FooterLink>
              <FooterLink href="/how-it-works">How It Works</FooterLink>
              <FooterLink href="/about">About VideoGad</FooterLink>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <FooterSectionTitle>Support</FooterSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <FooterLink href="/contact">Contact / Support</FooterLink>
              <a
                href="mailto:support@videogad.com"
                style={{
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  fontSize: '14px',
                  lineHeight: 1.8,
                  transition: 'all 0.2s ease',
                  wordBreak: 'break-word',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                support@videogad.com
              </a>

              <div
                style={{
                  marginTop: '12px',
                  padding: '14px',
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#ffffff',
                    marginBottom: '6px',
                  }}
                >
                  Built for product discovery
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: '#cbd5e1',
                  }}
                >
                  VideoGad helps product videos do more than entertain — they lead
                  viewers directly to action.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '34px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(148, 163, 184, 0.14)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#94a3b8',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          >
            © {new Date().getFullYear()} VideoGad. All rights reserved.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/contact">Support</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}