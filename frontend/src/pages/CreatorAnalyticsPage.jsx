import React, { useMemo, useState } from 'react';

const overviewStats = [
  { label: 'Views', value: '18.4K', change: '+12.6%' },
  { label: 'Watch Time', value: '1,284 hrs', change: '+8.3%' },
  { label: 'Subscribers', value: '+86', change: '+5.1%' },
  { label: 'Product Clicks', value: '942', change: '+14.2%' },
  { label: 'Comments', value: '318', change: '+9.4%' },
  { label: 'Shares', value: '127', change: '+4.8%' },
];

const trendData = [
  { day: 'Mon', views: 1200, clicks: 72, watch: 148 },
  { day: 'Tue', views: 1500, clicks: 88, watch: 172 },
  { day: 'Wed', views: 1320, clicks: 79, watch: 160 },
  { day: 'Thu', views: 1820, clicks: 101, watch: 214 },
  { day: 'Fri', views: 1650, clicks: 96, watch: 198 },
  { day: 'Sat', views: 2100, clicks: 124, watch: 256 },
  { day: 'Sun', views: 1940, clicks: 118, watch: 239 },
];

const topVideos = [
  {
    id: 1,
    title: 'Best Wireless Earbuds Under $50',
    views: '3.4K',
    watchTime: '182 hrs',
    clicks: '214',
    ctr: '6.2%',
  },
  {
    id: 2,
    title: 'Top 5 Budget Smart Watches',
    views: '1.1K',
    watchTime: '96 hrs',
    clicks: '98',
    ctr: '5.4%',
  },
  {
    id: 3,
    title: 'Amazon Finds You Will Actually Use',
    views: '860',
    watchTime: '74 hrs',
    clicks: '67',
    ctr: '4.9%',
  },
  {
    id: 4,
    title: 'Best Ring Light for Beginners',
    views: '740',
    watchTime: '61 hrs',
    clicks: '51',
    ctr: '4.1%',
  },
];

const trafficSources = [
  { name: 'Browse Features', value: '38%' },
  { name: 'Search', value: '26%' },
  { name: 'Suggested Videos', value: '18%' },
  { name: 'External Links', value: '11%' },
  { name: 'Direct', value: '7%' },
];

const deviceData = [
  { name: 'Mobile', value: '64%' },
  { name: 'Desktop', value: '24%' },
  { name: 'Tablet', value: '8%' },
  { name: 'TV', value: '4%' },
];

const audienceCountries = [
  { name: 'Nigeria', value: '42%' },
  { name: 'United States', value: '18%' },
  { name: 'United Kingdom', value: '11%' },
  { name: 'Canada', value: '7%' },
  { name: 'Other', value: '22%' },
];

function CreatorAnalyticsPage() {
  const [range, setRange] = useState('7d');
  const [metric, setMetric] = useState('views');
  const [startDate, setStartDate] = useState('2026-03-18');
  const [endDate, setEndDate] = useState('2026-03-24');

  const maxMetricValue = useMemo(() => {
    return Math.max(...trendData.map((item) => item[metric]));
  }, [metric]);

  return (
    <div className="videogad-analytics-page">
      <div className="videogad-analytics-card">
        <div className="analytics-header">
          <div>
            <p className="eyebrow">Creator Insights</p>
            <h1>Analytics Dashboard</h1>
            <span>
              Monitor performance by date range, track engagement trends, and review the content driving product clicks.
            </span>
          </div>

          <div className="analytics-header-actions">
            <a href="/creator-dashboard" className="ghost-btn">Dashboard</a>
            <a href="/my-videos" className="primary-btn">My Videos</a>
          </div>
        </div>

        <div className="analytics-filter-bar">
          <div className="analytics-range-pills">
            <button
              type="button"
              className={range === '7d' ? 'active' : ''}
              onClick={() => setRange('7d')}
            >
              Last 7 days
            </button>
            <button
              type="button"
              className={range === '14d' ? 'active' : ''}
              onClick={() => setRange('14d')}
            >
              Last 14 days
            </button>
            <button
              type="button"
              className={range === '30d' ? 'active' : ''}
              onClick={() => setRange('30d')}
            >
              Last 30 days
            </button>
            <button
              type="button"
              className={range === 'custom' ? 'active' : ''}
              onClick={() => setRange('custom')}
            >
              Custom
            </button>
          </div>

          <div className="analytics-calendar-box">
            <div className="analytics-date-field">
              <label>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="analytics-date-field">
              <label>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button type="button" className="analytics-apply-btn">
              Apply
            </button>
          </div>
        </div>

        <div className="analytics-overview-grid">
          {overviewStats.map((item) => (
            <div className="analytics-overview-card" key={item.label}>
              <p>{item.label}</p>
              <h3>{item.value}</h3>
              <span>{item.change} vs previous period</span>
            </div>
          ))}
        </div>

        <div className="analytics-main-grid">
          <div className="analytics-panel analytics-chart-panel">
            <div className="panel-head">
              <div>
                <h2>Performance Trend</h2>
                <small>{range === 'custom' ? `${startDate} to ${endDate}` : `Selected range: ${range}`}</small>
              </div>

              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="analytics-metric-select"
              >
                <option value="views">Views</option>
                <option value="clicks">Product Clicks</option>
                <option value="watch">Watch Time</option>
              </select>
            </div>

            <div className="analytics-big-chart">
              {trendData.map((item) => {
                const barHeight = `${(item[metric] / maxMetricValue) * 100}%`;

                return (
                  <div className="analytics-chart-col" key={item.day}>
                    <div className="analytics-chart-value">{item[metric]}</div>
                    <div className="analytics-chart-bar-wrap">
                      <div className="analytics-chart-bar" style={{ height: barHeight }}></div>
                    </div>
                    <span>{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="panel-head">
              <h2>Traffic Sources</h2>
            </div>

            <div className="analytics-list-block">
              {trafficSources.map((item) => (
                <div className="analytics-progress-row" key={item.name}>
                  <div className="analytics-progress-top">
                    <span>{item.name}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="analytics-progress-track">
                    <div className="analytics-progress-fill" style={{ width: item.value }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="analytics-lower-grid">
          <div className="analytics-panel">
            <div className="panel-head">
              <h2>Top Performing Videos</h2>
            </div>

            <div className="analytics-video-table">
              <div className="analytics-video-head">
                <span>Video</span>
                <span>Views</span>
                <span>Watch Time</span>
                <span>Clicks</span>
                <span>CTR</span>
              </div>

              {topVideos.map((video) => (
                <div className="analytics-video-row" key={video.id}>
                  <div className="analytics-video-main">
                    <div className="analytics-video-thumb">Thumb</div>
                    <div>
                      <h4>{video.title}</h4>
                      <p>Video ID: VG-A{video.id}00{video.id}</p>
                    </div>
                  </div>

                  <span>{video.views}</span>
                  <span>{video.watchTime}</span>
                  <span>{video.clicks}</span>
                  <span>{video.ctr}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-side-stack">
            <div className="analytics-panel">
              <div className="panel-head">
                <h2>Devices</h2>
              </div>

              <div className="analytics-list-block">
                {deviceData.map((item) => (
                  <div className="analytics-progress-row" key={item.name}>
                    <div className="analytics-progress-top">
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="analytics-progress-track">
                      <div className="analytics-progress-fill" style={{ width: item.value }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-panel">
              <div className="panel-head">
                <h2>Top Locations</h2>
              </div>

              <div className="analytics-list-block">
                {audienceCountries.map((item) => (
                  <div className="analytics-progress-row" key={item.name}>
                    <div className="analytics-progress-top">
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="analytics-progress-track">
                      <div className="analytics-progress-fill" style={{ width: item.value }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-panel">
              <div className="panel-head">
                <h2>Audience Summary</h2>
              </div>

              <div className="audience-summary-grid">
                <div className="audience-summary-card">
                  <p>Returning Viewers</p>
                  <h4>38%</h4>
                </div>
                <div className="audience-summary-card">
                  <p>New Viewers</p>
                  <h4>62%</h4>
                </div>
                <div className="audience-summary-card">
                  <p>Avg Watch Duration</p>
                  <h4>4m 28s</h4>
                </div>
                <div className="audience-summary-card">
                  <p>Average CTR</p>
                  <h4>5.7%</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatorAnalyticsPage;