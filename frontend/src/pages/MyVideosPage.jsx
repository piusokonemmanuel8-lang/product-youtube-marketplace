import React from 'react';

const videos = [
  {
    id: 1,
    title: 'Best Wireless Earbuds Under $50',
    status: 'Published',
    views: '3.4K',
    clicks: '214',
    date: 'Mar 20, 2026',
  },
  {
    id: 2,
    title: 'Top 5 Budget Smart Watches',
    status: 'Pending Review',
    views: '1.1K',
    clicks: '98',
    date: 'Mar 18, 2026',
  },
  {
    id: 3,
    title: 'Amazon Finds You Will Actually Use',
    status: 'Draft',
    views: '—',
    clicks: '—',
    date: 'Mar 15, 2026',
  },
  {
    id: 4,
    title: 'Best Ring Light for Beginners',
    status: 'Rejected',
    views: '—',
    clicks: '—',
    date: 'Mar 12, 2026',
  },
];

function MyVideosPage() {
  return (
    <div className="videogad-myvideos-page">
      <div className="videogad-myvideos-card">
        <div className="myvideos-header">
          <div>
            <p className="eyebrow">Creator Library</p>
            <h1>My Videos</h1>
            <span>Manage all uploaded videos, approval status, views, and product clicks.</span>
          </div>

          <div className="myvideos-header-actions">
            <a href="/creator-dashboard" className="ghost-btn">Dashboard</a>
            <a href="/upload-video" className="primary-btn">Upload New</a>
          </div>
        </div>

        <div className="myvideos-toolbar">
          <input type="text" placeholder="Search videos" />
          <select>
            <option>All Status</option>
            <option>Published</option>
            <option>Pending Review</option>
            <option>Draft</option>
            <option>Rejected</option>
          </select>
        </div>

        <div className="myvideos-table-wrap">
          <div className="myvideos-table-head">
            <span>Video</span>
            <span>Status</span>
            <span>Views</span>
            <span>Clicks</span>
            <span>Date</span>
            <span>Actions</span>
          </div>

          <div className="myvideos-table-body">
            {videos.map((video) => (
              <div className="myvideos-row" key={video.id}>
                <div className="myvideos-video-cell">
                  <div className="myvideos-thumb">Thumb</div>
                  <div>
                    <h4>{video.title}</h4>
                    <p>Video ID: VG-{video.id}00{video.id}</p>
                  </div>
                </div>

                <div>
                  <span className={`status-badge ${video.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {video.status}
                  </span>
                </div>

                <div className="myvideos-muted">{video.views}</div>
                <div className="myvideos-muted">{video.clicks}</div>
                <div className="myvideos-muted">{video.date}</div>

                <div className="myvideos-actions">
                  <button type="button">Edit</button>
                  <button type="button">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyVideosPage;