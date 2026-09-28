import React, { useCallback, useEffect, useState } from 'react';

// enter → idle (tappable) → spinning (360° rotation) → split (zigzag) → done
type AnimationPhase = 'enter' | 'idle' | 'spinning' | 'split' | 'done';

interface LoginSuccessScreenProps {
  userName: string;
  onEnterApp: () => void;
}

const ENTER_DURATION_MS  = 800;
const SPIN_DURATION_MS   = 650;   // full 360° spin duration
const SPLIT_DURATION_MS  = 900;   // zigzag split + fly-out duration

export const LoginSuccessScreen: React.FC<LoginSuccessScreenProps> = ({
  userName,
  onEnterApp,
}) => {
  const [phase, setPhase] = useState<AnimationPhase>('enter');

  // enter → idle
  useEffect(() => {
    const timer = setTimeout(() => setPhase('idle'), ENTER_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // spinning → split
  useEffect(() => {
    if (phase !== 'spinning') return;
    const timer = setTimeout(() => setPhase('split'), SPIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // split → done → enter app
  useEffect(() => {
    if (phase !== 'split') return;
    const timer = setTimeout(() => {
      setPhase('done');
      onEnterApp();
    }, SPLIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase, onEnterApp]);

  const handleLogoClick = useCallback(() => {
    if (phase === 'idle') setPhase('spinning');
  }, [phase]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && phase === 'idle') {
        setPhase('spinning');
      }
    },
    [phase],
  );

  const isClickable  = phase === 'idle';
  const isSpinning   = phase === 'spinning';
  const isSplitting  = phase === 'split' || phase === 'done';

  return (
    <div className="login-success-overlay" aria-live="polite" aria-label="Đăng nhập thành công">
      {/* Ambient background particles */}
      <div className="login-success-particles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={`login-success-particle login-success-particle-${i + 1}`} />
        ))}
      </div>

      {/* Floating leaf decorations */}
      <div className="login-success-leaves" aria-hidden="true">
        <img src="/images/rice-leaf-cutout.png"   alt="" className="login-success-leaf login-success-leaf-left"  />
        <img src="/images/tea-foliage-cutout.png" alt="" className="login-success-leaf login-success-leaf-right" />
      </div>

      {/* Main content */}
      <div className={`login-success-content ${phase === 'enter' ? 'login-success-content--entering' : 'login-success-content--visible'}`}>

        {/* Greeting text */}
        <div className="login-success-greeting">
          <p className="login-success-label">Đăng nhập thành công</p>
          <h1 className="login-success-name">
            Chào mừng,{' '}
            <span className="login-success-name-highlight">{userName}</span>!
          </h1>
          <p className="login-success-hint">
            {isClickable ? 'Nhấn vào logo để vào ứng dụng' : '\u00a0'}
          </p>
        </div>

        {/* Circular logo button */}
        <div className="login-success-logo-wrapper" aria-hidden={!isClickable}>
          {/* Pulse rings — hidden while spinning/splitting */}
          {!isSpinning && !isSplitting && (
            <>
              <span className="login-success-ring login-success-ring-1" aria-hidden="true" />
              <span className="login-success-ring login-success-ring-2" aria-hidden="true" />
            </>
          )}

          <button
            type="button"
            onClick={handleLogoClick}
            onKeyDown={handleKeyDown}
            disabled={!isClickable}
            aria-label="Nhấn để vào ứng dụng LeafAI"
            className={[
              'login-success-logo-btn',
              isClickable ? 'login-success-logo-btn--active'    : '',
              isSpinning  ? 'login-success-logo-btn--spinning'  : '',
              isSplitting ? 'login-success-logo-btn--splitting' : '',
            ].join(' ')}
          >
            {/* Left zigzag half */}
            <span
              className={[
                'login-success-leaf-half login-success-leaf-half--left',
                isSplitting ? 'login-success-leaf-half--split-left' : '',
              ].join(' ')}
              aria-hidden="true"
            >
              <img src="/images/logo.png" alt="" className="login-success-logo-img" />
            </span>

            {/* Right zigzag half */}
            <span
              className={[
                'login-success-leaf-half login-success-leaf-half--right',
                isSplitting ? 'login-success-leaf-half--split-right' : '',
              ].join(' ')}
              aria-hidden="true"
            >
              <img src="/images/logo.png" alt="" className="login-success-logo-img" />
            </span>

            {/* Inner glow */}
            <span className="login-success-logo-glow" aria-hidden="true" />
          </button>
        </div>

        {/* Tap indicator dots */}
        <div className={`login-success-dots ${isClickable ? 'login-success-dots--visible' : ''}`} aria-hidden="true">
          <span className="login-success-dot" />
          <span className="login-success-dot" />
          <span className="login-success-dot" />
        </div>
      </div>
    </div>
  );
};
