function HomePage() {
  const videos = [
    { id: 1, title: 'Best Phone Case Review', creator: 'Tech Store', views: '12K views', time: '2 days ago' },
    { id: 2, title: 'Smart Watch Unboxing', creator: 'Gadget Hub', views: '8K views', time: '1 day ago' },
    { id: 3, title: 'Sneaker Video Ad', creator: 'Style Shop', views: '20K views', time: '4 days ago' },
    { id: 4, title: 'Kitchen Blender Demo', creator: 'Home Picks', views: '5K views', time: '6 hours ago' },
    { id: 5, title: 'Laptop Bag Showcase', creator: 'Bag World', views: '15K views', time: '3 days ago' },
    { id: 6, title: 'Wireless Earbuds Test', creator: 'Audio Market', views: '9K views', time: '5 days ago' },
  ]

  return (
    <div className="home-layout">
      <header className="topbar">
        <div className="topbar-left">
          <div className="menu-icon">☰</div>
          <div className="logo-wrap">
            <div className="logo-box">V</div>
            <span className="logo-text">VideoGad</span>
          </div>
        </div>

        <div className="topbar-center">
          <input type="text" placeholder="Search" className="search-input" />
          <button className="search-btn">Search</button>
        </div>

        <div className="topbar-right">
          <a href="/login" className="top-link">Login</a>
          <a href="/register" className="top-link top-link-dark">Register</a>
        </div>
      </header>

      <div className="home-body">
        <aside className="sidebar">
          <a href="/" className="sidebar-item active">Home</a>
          <a href="/" className="sidebar-item">Trending</a>
          <a href="/" className="sidebar-item">Subscriptions</a>
          <a href="/" className="sidebar-item">Library</a>
          <a href="/" className="sidebar-item">History</a>
        </aside>

        <main className="content-area">
          <div className="video-grid">
            {videos.map((video) => (
              <div className="video-card" key={video.id}>
                <div className="video-thumb">Thumbnail</div>

                <div className="video-info">
                  <h3>{video.title}</h3>
                  <p>{video.creator}</p>
                  <p>{video.views} • {video.time}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export default HomePage