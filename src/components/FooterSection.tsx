import type { ReactElement } from 'react';

export function FooterSection(): ReactElement {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <div className="site-footer__brand-name">DDC Live Journal</div>
          <p className="site-footer__tagline">Documenting the journey, one checkpoint at a time.</p>
        </div>

        <nav className="site-footer__links">
          <a href="#" className="site-footer__link">Instagram</a>
          <a href="#" className="site-footer__link">Twitter</a>
          <a href="#" className="site-footer__link">YouTube</a>
        </nav>
      </div>

      <p className="site-footer__copy">
        &copy; {new Date().getFullYear()} DDC. All rights reserved. Built with Astro &amp; React.
      </p>
    </footer>
  );
}
