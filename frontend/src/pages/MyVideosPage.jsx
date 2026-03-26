import React, { useEffect, useMemo, useState } from 'react';

function MyVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  useEffect(() => {
    fetchMyVideos();
  }, []);

  async function fetchMyVideos() {
    try {
      setLoading(true);
      setError('');

      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('videogad_token') ||
        localStorage.getItem('authToken');

      const response = await fetch('/api/videos/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch videos');
      }

      setVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getVideoStatus(video) {
    if (video?.moderation_status === 'pending') return 'Pending Review';
    if (video?.moderation_status === 'rejected') return 'Rejected';
    if (video?.status === 'published') return 'Published';
    if (video?.status === 'draft') return 'Draft';
    return video?.status || 'Unknown';
  }

  function getStatusClass(status) {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const status = getVideoStatus(video);
      const matchesSearch = (video.title || '')
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'All Status' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [videos, search, statusFilter]);

  return (
    <div className="videogad-myvideos-page">
      <div className="videogad-myvideos-card">
        <div className="myvideos-header">
          <div>
            <p className="eyebrow">Creator Library</p>
            <h1>My Videos</h1>
            <span>Manage all uploaded videos, approval status, and dates.</span>
          </div>

          <div className="myvideos-header-actions">
            <a href="/creator-dashboard" className="ghost-btn">Dashboard</a>
            <a href="/upload-video" className="primary-btn">Upload New</a>
          </div>
        </div>

        <div className="myvideos-toolbar">
          <input
            type="text"
            placeholder="Search videos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Published</option>
            <option>Pending Review</option>
            <option>Draft</option>
            <option>Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="myvideos-table-body">
            <div className="myvideos-row">
              <div className="myvideos-video-cell">
                <div>
                  <h4>Loading videos...</h4>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="myvideos-table-body">
            <div className="myvideos-row">
              <div className="myvideos-video-cell">
                <div>
                  <h4>{error}</h4>
                  <p>
                    <button type="button" onClick={fetchMyVideos}>
                      Retry
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="myvideos-table-wrap">
            <div className="myvideos-table-head">
              <span>Video</span>
              <span>Status</span>
              <span>Visibility</span>
              <span>Published</span>
              <span>Date</span>
              <span>Actions</span>
            </div>

            <div className="myvideos-table-body">
              {filteredVideos.length === 0 ? (
                <div className="myvideos-row">
                  <div className="myvideos-video-cell">
                    <div>
                      <h4>No videos found</h4>
                      <p>Your uploaded videos will show here.</p>
                    </div>
                  </div>
                </div>
              ) : (
                filteredVideos.map((video) => {
                  const status = getVideoStatus(video);

                  return (
                    <div className="myvideos-row" key={video.id}>
                      <div className="myvideos-video-cell">
                        <div className="myvideos-thumb">
                          {video.thumbnail_key ? 'Image' : 'Thumb'}
                        </div>
                        <div>
                          <h4>{video.title || 'Untitled Video'}</h4>
                          <p>Video ID: VG-{video.id}</p>
                        </div>
                      </div>

                      <div>
                        <span className={`status-badge ${getStatusClass(status)}`}>
                          {status}
                        </span>
                      </div>

                      <div className="myvideos-muted">
                        {video.visibility || '—'}
                      </div>

                      <div className="myvideos-muted">
                        {formatDate(video.published_at)}
                      </div>

                      <div className="myvideos-muted">
                        {formatDate(video.created_at)}
                      </div>

                      <div className="myvideos-actions">
                        <a
                          href={`/upload-video?edit=${video.id}`}
                          className="myvideos-action-link"
                        >
                          Edit
                        </a>

                        {video.slug && video.status === 'published' ? (
                          <a
                            href={`/watch/${video.slug}`}
                            className="myvideos-action-link"
                          >
                            View
                          </a>
                        ) : (
                          <span className="myvideos-action-link disabled-link">
                            View
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyVideosPage;