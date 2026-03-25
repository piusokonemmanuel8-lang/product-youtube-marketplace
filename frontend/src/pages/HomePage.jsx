import React, { useEffect, useMemo, useState } from 'react';
import { getCategories, getCategoryTree } from '../services/categoryService';

const featuredVideos = [
  {
    id: 1,
    title: 'Wireless Earbuds Review for Everyday Use',
    creator: 'Tech Market Hub',
    meta: '12K views • Feed endpoint pending',
  },
  {
    id: 2,
    title: 'Top Smart Watches You Can Buy This Month',
    creator: 'Gadget Spot',
    meta: '8.4K views • Feed endpoint pending',
  },
  {
    id: 3,
    title: 'Best Phone Accessories Worth Buying',
    creator: 'Mobile Finds',
    meta: '5.2K views • Feed endpoint pending',
  },
  {
    id: 4,
    title: 'Affordable Camera Gear for Creators',
    creator: 'Creator Tools',
    meta: '10K views • Feed endpoint pending',
  },
  {
    id: 5,
    title: 'Best Lighting Setup for Product Videos',
    creator: 'Studio Market',
    meta: '7.9K views • Feed endpoint pending',
  },
  {
    id: 6,
    title: 'Home Gadgets That Actually Make Sense',
    creator: 'Daily Gadget Lab',
    meta: '15K views • Feed endpoint pending',
  },
];

const shortsItems = [
  { id: 1, title: 'Mini Earbuds', views: '2.1K views' },
  { id: 2, title: 'Phone Case Pick', views: '4.8K views' },
  { id: 3, title: 'Smart Watch Clip', views: '3.7K views' },
  { id: 4, title: 'Desk Setup', views: '5.2K views' },
  { id: 5, title: 'Portable Light', views: '1.9K views' },
  { id: 6, title: 'Budget Speaker', views: '6.1K views' },
  { id: 7, title: 'Ring Light', views: '2.7K views' },
];

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.categories)) return data.categories;
  return [];
}

function HomePage() {
  const [categories, setCategories] = useState([]);
  const [categoryTreeCount, setCategoryTreeCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    async function loadHomepageData() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [categoriesResponse, treeResponse] = await Promise.all([
          getCategories(),
          getCategoryTree(),
        ]);

        const categoriesList = normalizeArrayResponse(categoriesResponse);
        const treeList = normalizeArrayResponse(treeResponse);

        setCategories(categoriesList);
        setCategoryTreeCount(treeList.length);
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load homepage data');
      } finally {
        setLoading(false);
      }
    }

    loadHomepageData();
  }, []);

  const categoryPills = useMemo(() => {
    const names = categories.map((item) => {
      return (
        item?.name ||
        item?.title ||
        item?.category_name ||
        `Category ${item?.id ?? ''}`.trim()
      );
    });

    return ['All', ...names.filter(Boolean)];
  }, [categories]);

  return (
    <div className={`home-layout ${theme === 'dark' ? 'home-layout-dark' : 'home-layout-light'}`}>
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-logo-box">V</div>

          <div className="vg-logo-text-wrap">
            <div className="vg-logo-text">VideoGad</div>
            <div className="vg-logo-subtext">video marketplace</div>
          </div>
        </div>

        <div className="vg-topbar-center">
          <input
            className="vg-search-input"
            type="text"
            placeholder="Search videos, products, creators"
          />
        </div>

        <div className="vg-topbar-right">
          <button
            type="button"
            className="vg-theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <a href="/login" className="vg-link-btn">Login</a>
          <a href="/register" className="vg-link-btn vg-link-btn-dark">Register</a>
        </div>
      </header>

      <div className="vg-main-shell">
        <aside className="vg-sidebar">
          <div className="vg-sidebar-item active">Home</div>
          <div className="vg-sidebar-item">Trending</div>
          <div className="vg-sidebar-item">Categories</div>
          <div className="vg-sidebar-item">Saved</div>
          <div className="vg-sidebar-item">History</div>
          <div className="vg-sidebar-item">Subscriptions</div>
        </aside>

        <main className="vg-content">
          {errorMessage ? (
            <div className="home-state-message error">{errorMessage}</div>
          ) : null}

          {loading ? (
            <div className="home-state-message">Loading categories...</div>
          ) : null}

          <section className="vg-home-hero">
            <div className="vg-home-hero-left">
              <span className="vg-badge">Endpoint-first homepage</span>
              <h1>Watch product videos. Discover trusted stores. Buy smarter.</h1>
              <p className="vg-hero-subtitle">
                A creator-driven video marketplace where buyers can discover products through engaging videos.
                Categories are now connected to your real backend endpoints.
              </p>

              <div className="vg-hero-actions">
                <a href="/login" className="vg-primary-btn">Creator Login</a>
                <a href="/register" className="vg-secondary-btn">Join VideoGad</a>
              </div>
            </div>

            <div className="vg-home-hero-right">
              <div className="vg-stat-card-large">
                <div className="vg-stat-top">Marketplace activity</div>
                <div className="vg-stat-big">24,000+</div>
                <div className="vg-stat-note">Videos available on the marketplace</div>
              </div>

              <div className="vg-stat-card-small">
                <div className="vg-stat-small-number">50,000+</div>
                <div className="vg-stat-small-label">Active viewers</div>
              </div>

              <div className="vg-stat-card-small">
                <div className="vg-stat-small-number">{categories.length}</div>
                <div className="vg-stat-small-label">Categories loaded</div>
              </div>

              <div className="vg-stat-card-small">
                <div className="vg-stat-small-number">{categoryTreeCount}</div>
                <div className="vg-stat-small-label">Category tree roots</div>
              </div>
            </div>
          </section>

          <section className="vg-categories vg-categories-single-line">
            {categoryPills.map((name) => (
              <button
                key={name}
                type="button"
                className={`vg-category-pill ${selectedCategory === name ? 'active' : ''}`}
                onClick={() => setSelectedCategory(name)}
              >
                {name}
              </button>
            ))}
          </section>

          <section className="vg-home-section-head">
            <div>
              <h2>Featured Videos</h2>
              <p>Homepage layout ready. Public feed endpoint still pending.</p>
            </div>
          </section>

          <section className="vg-video-grid">
            {featuredVideos.map((video) => (
              <div className="vg-video-card" key={video.id}>
                <div className="vg-video-thumb">Featured Video</div>

                <div className="vg-video-info">
                  <h3>{video.title}</h3>
                  <div className="vg-creator-name">{video.creator}</div>
                  <div className="vg-meta-text">{video.meta}</div>

                  <div className="vg-card-actions">
                    <button type="button" className="vg-card-btn">Watch</button>
                    <button type="button" className="vg-card-btn vg-card-btn-light">Buy Now</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="vg-home-section-head shorts-head">
            <div>
              <h2>Shorts</h2>
              <p>Quick marketplace clips in a horizontal row.</p>
            </div>
          </section>

          <section className="vg-shorts-row">
            {shortsItems.map((item) => (
              <div className="vg-short-card" key={item.id}>
                <div className="vg-short-thumb">Short</div>
                <h4>{item.title}</h4>
                <p>{item.views}</p>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

export default HomePage;