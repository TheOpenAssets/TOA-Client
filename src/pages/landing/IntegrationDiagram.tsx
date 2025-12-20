const IntegrationDiagram = () => {
  return (
    <div className="integration-container">
      {/* Left Icons */}
      <div className="left-icons">
        <div className="icon-pill icon-1">
          <div className="icon-container">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <path d="m2 7 10 6 10-6"/>
            </svg>
          </div>
        </div>
        
        <div className="icon-pill icon-2">
          <div className="icon-container">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </div>
        </div>
        
        <div className="icon-pill icon-3">
          <div className="icon-container">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v4"/>
              <path d="M12 18v4"/>
              <path d="M4.93 4.93l2.83 2.83"/>
              <path d="M16.24 16.24l2.83 2.83"/>
              <path d="M2 12h4"/>
              <path d="M18 12h4"/>
              <path d="M4.93 19.07l2.83-2.83"/>
              <path d="M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Right Icons */}
      <div className="right-icons">
        <div className="icon-pill icon-4">
          <div className="icon-container">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
            </svg>
          </div>
        </div>
        
        <div className="icon-pill icon-5">
          <div className="icon-container">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 17H7A5 5 0 0 1 7 7h2"/>
              <path d="M15 7h2a5 5 0 1 1 0 10h-2"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
        </div>
        
        <div className="icon-pill icon-6">
          <div className="icon-container">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Central Logo */}
      <div className="central-logo">
        <div className="logo-container">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
              <path d="M2 12l7-7 3 3 7-7v5l-7 7-3-3-7 7V12z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Connecting Lines - SVG Paths */}
      <div className="connecting-lines">
        {/* Left Top Line - LinkedIn to Center */}
        <svg className="line-left-top" viewBox="0 0 400 200" style={{
          position: 'absolute',
          top: '9px',
          left: '60px',
          width: '400px',
          height: '200px',
          pointerEvents: 'none'
        }}>
          <path d="M 0 1 L 122.022 1 C 130.298 1 137.01 7.702 137.022 15.978 L 137.175 122.029 C 137.187 130.302 143.895 137.003 152.168 137.007 L 275.007 137.066 C 283.289 137.07 290 143.785 290 152.066 L 290 177 C 290 185.284 296.716 192 305 192 L 437 192"
                fill="transparent"
                stroke="rgb(156,163,175)"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeDasharray="6,4"
                strokeLinecap="round"/>
        </svg>

        {/* Left Middle Line - Facebook to Center (Direct) */}
        <svg className="line-left-middle" viewBox="0 0 300 60" style={{
          position: 'absolute',
          top: 'calc(50% - 30px)',
          left: '104px',
          width: '300px',
          height: '60px',
          pointerEvents: 'none'
        }}>
          <path d="M 0 30 L 300 30"
                fill="transparent"
                stroke="rgb(156,163,175)"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeDasharray="6,4"
                strokeLinecap="round"/>
        </svg>

        {/* Left Bottom Line - Google to Center */}
        <svg className="line-left-bottom" viewBox="0 0 400 200" style={{
          position: 'absolute',
          bottom: '1px',
          left: '60px',
          width: '400px',
          height: '200px',
          pointerEvents: 'none'
        }}>
          <path d="M 0 192 L 122.022 192 C 130.298 192 137.01 185.298 137.022 177.022 L 137.175 70.971 C 137.187 62.698 143.906 55.997 152.179 55.993 L 274.996 55.933 C 283.278 55.93 290 49.215 290 40.933 L 290 16 C 290 7.716 296.716 1 305 1 L 437 1"
                fill="transparent"
                stroke="rgb(156,163,175)"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeDasharray="6,4"
                strokeLinecap="round"/>
        </svg>

        {/* Right Top Line - Twitter to Center */}
        <svg className="line-right-top" viewBox="0 0 400 200" style={{
          position: 'absolute',
          top: '9px',
          right: '104px',
          width: '400px',
          height: '200px',
          pointerEvents: 'none'
        }}>
          <path d="M 437 1 L 314.978 1 C 306.702 1 299.99 7.702 299.978 15.978 L 299.825 122.029 C 299.813 130.302 293.105 137.003 284.832 137.007 L 161.993 137.066 C 153.711 137.07 147 143.785 147 152.066 L 147 177 C 147 185.284 140.284 192 132 192 L 0 192"
                fill="transparent"
                stroke="rgb(156,163,175)"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeDasharray="6,4"
                strokeLinecap="round"/>
        </svg>

        {/* Right Middle Line - TikTok to Center (Direct) */}
        <svg className="line-right-middle" viewBox="0 0 300 60" style={{
          position: 'absolute',
          top: 'calc(50% - 30px)',
          right: '104px',
          width: '300px',
          height: '60px',
          pointerEvents: 'none'
        }}>
          <path d="M 300 30 L 0 30"
                fill="transparent"
                stroke="rgb(156,163,175)"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeDasharray="6,4"
                strokeLinecap="round"/>
        </svg>

        {/* Right Bottom Line - GitHub to Center */}
        <svg className="line-right-bottom" viewBox="0 0 400 200" style={{
          position: 'absolute',
          bottom: '1px',
          right: '104px',
          width: '400px',
          height: '200px',
          pointerEvents: 'none'
        }}>
          <path d="M 437 192 L 314.978 192 C 306.702 192 299.99 185.298 299.978 177.022 L 299.825 70.971 C 299.813 62.698 293.105 55.997 284.832 55.993 L 161.993 55.933 C 153.711 55.93 147 49.215 147 40.933 L 147 16 C 147 7.716 140.284 1 132 1 L 0 1"
                fill="transparent"
                stroke="rgb(156,163,175)"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeDasharray="6,4"
                strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
};

export default IntegrationDiagram;