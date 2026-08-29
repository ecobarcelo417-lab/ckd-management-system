import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import DialysisOrb from '../components/DialysisOrb';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState(new Date());
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || "That username or password doesn't match our records.");
    } finally {
      setLoading(false);
    }
  };

  const timeString = clock.toLocaleTimeString('en-US', { hour12: false });
  const dateString = clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="ckd-login">
      <style>{`
        .ckd-login {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          background: #F7F5EF;
          font-family: 'IBM Plex Sans', sans-serif;
        }

        .ckd-login__rail {
          position: relative;
          background: #0B1D22;
          color: #EDE7D9;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem clamp(1.75rem, 4vw, 4rem);
        }

        .ckd-login__rail::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 15% 15%, rgba(201,162,75,0.10), transparent 45%),
            radial-gradient(circle at 85% 90%, rgba(63,191,143,0.08), transparent 40%);
          pointer-events: none;
        }

        .ckd-login__hero3d {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.85;
          mix-blend-mode: screen;
        }

        .ckd-login__mark {
          display: flex;
          align-items: baseline;
          gap: 0.6rem;
          position: relative;
          z-index: 1;
        }

        .ckd-login__mark-glyph {
          font-family: 'Fraunces', serif;
          font-size: 1.7rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .ckd-login__mark-sep {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #C9A24B;
          flex-shrink: 0;
        }

        .ckd-login__mark-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #7C8E90;
        }

        .ckd-login__body {
          position: relative;
          z-index: 1;
          max-width: 30rem;
        }

        .ckd-login__headline {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          line-height: 1.18;
          letter-spacing: -0.01em;
          color: #F7F5EF;
          margin: 0 0 1rem 0;
        }

        .ckd-login__headline em {
          font-style: italic;
          color: #C9A24B;
        }

        .ckd-login__lede {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #A9B6B7;
          margin: 0;
        }

        .ckd-login__wave {
          position: relative;
          z-index: 1;
          margin: 2.75rem 0 2.25rem;
          width: 100%;
          height: 84px;
        }

        .ckd-login__wave svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .ckd-login__wave-path {
          fill: none;
          stroke: #C9A24B;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 6px rgba(201,162,75,0.35));
          stroke-dasharray: 6 480;
          animation: ckd-trace 2.6s linear infinite;
        }

        .ckd-login__wave-ghost {
          fill: none;
          stroke: rgba(237,231,217,0.14);
          stroke-width: 1.2;
        }

        @keyframes ckd-trace {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -486; }
        }

        .ckd-login__status {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(237,231,217,0.12);
          font-family: 'IBM Plex Mono', monospace;
        }

        .ckd-login__status-left {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .ckd-login__pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #3FBF8F;
          box-shadow: 0 0 0 rgba(63,191,143,0.6);
          animation: ckd-pulse 1.8s ease-out infinite;
        }

        @keyframes ckd-pulse {
          0% { box-shadow: 0 0 0 0 rgba(63,191,143,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(63,191,143,0); }
          100% { box-shadow: 0 0 0 0 rgba(63,191,143,0); }
        }

        .ckd-login__status-label {
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #9AACAD;
        }

        .ckd-login__status-time {
          text-align: right;
          font-size: 0.72rem;
          color: #7C8E90;
        }

        .ckd-login__status-time strong {
          color: #EDE7D9;
          font-weight: 500;
        }

        .ckd-login__panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .ckd-login__card {
          width: 100%;
          max-width: 23rem;
        }

        .ckd-login__card-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #96A0A1;
          margin: 0 0 0.6rem;
        }

        .ckd-login__card-title {
          font-family: 'Fraunces', serif;
          font-size: 1.9rem;
          font-weight: 500;
          color: #0B1D22;
          margin: 0 0 2rem;
          letter-spacing: -0.01em;
        }

        .ckd-login__error {
          margin: 0 0 1.25rem;
          padding: 0.7rem 0.9rem;
          background: #FBF0EC;
          border-left: 2px solid #B5482E;
          color: #8A3520;
          font-size: 0.83rem;
          line-height: 1.45;
        }

        .ckd-login__field {
          margin-bottom: 1.4rem;
        }

        .ckd-login__field label {
          display: block;
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #5B6B6E;
          margin-bottom: 0.5rem;
        }

        .ckd-login__input-wrap {
          position: relative;
          border-bottom: 1.5px solid #D8D2C2;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .ckd-login__input-wrap:focus-within {
          border-color: #C9A24B;
          box-shadow: 0 1px 0 0 #C9A24B, 0 6px 14px -10px rgba(201,162,75,0.6);
        }

        .ckd-login__input-wrap input {
          width: 100%;
          border: none;
          background: transparent;
          padding: 0.55rem 2rem 0.55rem 0.1rem;
          font-size: 0.98rem;
          color: #0B1D22;
          font-family: 'IBM Plex Sans', sans-serif;
        }

        .ckd-login__input-wrap input:focus {
          outline: none;
        }

        .ckd-login__input-wrap input::placeholder {
          color: #B7B2A3;
        }

        .ckd-login__eye {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #96A0A1;
          cursor: pointer;
          display: flex;
          padding: 0.2rem;
        }

        .ckd-login__eye:hover {
          color: #5B6B6E;
        }

        .ckd-login__submit {
          width: 100%;
          margin-top: 0.75rem;
          padding: 0.85rem 1.1rem;
          background: #0B1D22;
          color: #F7F5EF;
          border: none;
          border-radius: 2px;
          font-size: 0.92rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(11,29,34,0.15);
          transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.25s ease;
        }

        .ckd-login__submit::after {
          content: '';
          position: absolute;
          top: -60%;
          left: -20%;
          width: 30%;
          height: 220%;
          background: linear-gradient(90deg, transparent, rgba(247,245,239,0.28), transparent);
          transform: translateX(-160%) skewX(-12deg);
          pointer-events: none;
        }

        .ckd-login__submit:hover:not(:disabled)::after {
          animation: ckd-shine 1s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes ckd-shine {
          to { transform: translateX(160%) skewX(-12deg); }
        }

        .ckd-login__submit:hover:not(:disabled) {
          background: #16333B;
          box-shadow: 0 10px 24px -8px rgba(11,29,34,0.45);
          transform: translateY(-1px);
        }

        .ckd-login__submit:active:not(:disabled) {
          transform: scale(0.99);
        }

        .ckd-login__submit:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .ckd-login__submit-arrow {
          transition: transform 0.2s ease;
        }

        .ckd-login__submit:hover:not(:disabled) .ckd-login__submit-arrow {
          transform: translateX(3px);
        }

        .ckd-login__spinner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(247,245,239,0.35);
          border-top-color: #F7F5EF;
          animation: ckd-spin 0.7s linear infinite;
        }

        @keyframes ckd-spin {
          to { transform: rotate(360deg); }
        }

        .ckd-login__footnote {
          margin-top: 1.75rem;
          font-size: 0.78rem;
          color: #8A8578;
          text-align: center;
          line-height: 1.5;
        }

        @media (max-width: 860px) {
          .ckd-login {
            grid-template-columns: 1fr;
          }
          .ckd-login__rail {
            padding: 2.25rem 1.5rem;
          }
          .ckd-login__wave {
            margin: 1.75rem 0;
            height: 56px;
          }
          .ckd-login__body {
            max-width: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ckd-login__wave-path,
          .ckd-login__pulse,
          .ckd-login__spinner {
            animation: none;
          }
        }
      `}</style>

      <div className="ckd-login__rail">
        <div className="ckd-login__hero3d" aria-hidden="true">
          <DialysisOrb color="#3FBF8F" secondaryColor="#C9A24B" distort={0.28} />
        </div>

        <div className="ckd-login__mark animate-reveal-blur">
          <span className="ckd-login__mark-glyph">CKD Management</span>
          <span className="ckd-login__mark-sep" aria-hidden="true" />
          <span className="ckd-login__mark-sub">Renal Care Platform</span>
        </div>

        <div>
          <div className="ckd-login__body animate-reveal-blur" style={{ animationDelay: '80ms' }}>
            <h1 className="ckd-login__headline">
              Every session, every reading, <em>tracked without gaps.</em>
            </h1>
            <p className="ckd-login__lede">
              A single record of dialysis sessions, labs, and prescriptions for clinicians and
              patients — kept current in real time.
            </p>
          </div>

          <div className="ckd-login__wave animate-reveal-blur" style={{ animationDelay: '160ms' }} aria-hidden="true">
            <svg viewBox="0 0 520 84" preserveAspectRatio="none">
              <path
                className="ckd-login__wave-ghost"
                d="M0,42 L90,42 L104,42 L114,10 L124,74 L134,42 L150,42 L520,42"
              />
              <path
                className="ckd-login__wave-path"
                d="M0,42 L90,42 L104,42 L114,10 L124,74 L134,42 L150,42 L520,42"
              />
            </svg>
          </div>

          <div className="ckd-login__status animate-reveal-blur" style={{ animationDelay: '220ms' }}>
            <div className="ckd-login__status-left">
              <span className="ckd-login__pulse" aria-hidden="true" />
              <span className="ckd-login__status-label">System Online</span>
            </div>
            <div className="ckd-login__status-time">
              {dateString} &nbsp;·&nbsp; <strong>{timeString}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="ckd-login__panel">
        <div className="ckd-login__card animate-reveal-blur" style={{ animationDelay: '140ms' }}>
          <p className="ckd-login__card-eyebrow">Restricted access</p>
          <h2 className="ckd-login__card-title">Sign in</h2>

          {error && <div className="ckd-login__error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="ckd-login__field">
              <label htmlFor="username">Username</label>
              <div className="ckd-login__input-wrap">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="ckd-login__field">
              <label htmlFor="password">Password</label>
              <div className="ckd-login__input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="ckd-login__eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" className="ckd-login__submit" disabled={loading}>
              {loading ? (
                <span className="ckd-login__spinner" aria-hidden="true" />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} className="ckd-login__submit-arrow" />
                </>
              )}
            </button>
          </form>

          <p className="ckd-login__footnote">
            Access is provisioned by your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
