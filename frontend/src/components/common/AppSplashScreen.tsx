import React, { useEffect, useState } from 'react';

/**
 * Full-screen splash shown while the app is restoring the auth session.
 * Fades out gracefully before the real UI appears.
 */
export const AppSplashScreen: React.FC = () => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Start fade-out slightly before parent unmounts (triggered externally via CSS duration)
  useEffect(() => {
    const timer = setTimeout(() => setIsFadingOut(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`app-splash ${isFadingOut ? 'app-splash--out' : ''}`} aria-label="Đang tải LeafAI" role="status">
      {/* Background aurora blobs */}
      <div className="app-splash-aurora app-splash-aurora-1" aria-hidden="true" />
      <div className="app-splash-aurora app-splash-aurora-2" aria-hidden="true" />

      {/* Floating micro-particles */}
      <div className="app-splash-particles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={`app-splash-particle app-splash-particle-${i + 1}`} />
        ))}
      </div>

      {/* Center content */}
      <div className="app-splash-center">
        {/* Logo with pulse rings */}
        <div className="app-splash-logo-wrap">
          <span className="app-splash-ring app-splash-ring-1" aria-hidden="true" />
          <span className="app-splash-ring app-splash-ring-2" aria-hidden="true" />
          <div className="app-splash-logo-circle">
            <img src="/images/logo.png" alt="LeafAI" className="app-splash-logo-img" />
          </div>
        </div>

        {/* Brand name */}
        <div className="app-splash-brand">
          <span className="app-splash-brand-name">
            Leaf<span className="app-splash-brand-accent">AI</span>
          </span>
          <span className="app-splash-brand-tagline">Vì cây trồng Việt</span>
        </div>

        {/* Shimmer progress bar */}
        <div className="app-splash-bar-track" aria-hidden="true">
          <div className="app-splash-bar-fill" />
        </div>
      </div>
    </div>
  );
};
