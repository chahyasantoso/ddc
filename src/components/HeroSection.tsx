import type { ReactElement } from 'react';

export function HeroSection(): ReactElement {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" />

      <div className="hero-content">
        <span className="hero-badge">Live Journey</span>

        <h1 className="hero-title">
          Surabaya to <br />
          <span className="hero-title-accent">Bandung</span>
        </h1>

        <p className="hero-subtitle">
          Scroll down to ride along through a visual and interactive mapping experience.
        </p>
      </div>

      <div className="hero-scroll-indicator" aria-hidden="true">
        <span className="hero-scroll-label">Scroll</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
