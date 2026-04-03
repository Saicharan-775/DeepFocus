import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="px-6 pt-14 pb-8 footer-v3-shell">
      <div className="max-w-6xl mx-auto">
        <div className="footer-v3-top">
          <div>
            <p className="footer-v3-brand">DeepFocus</p>
            <p className="footer-v3-copy">
              Train real problem-solving discipline on LeetCode.
            </p>
            <p className="footer-v3-copy-muted">No hacks. No shortcuts. Just focus.</p>
          </div>

          <div className="footer-v3-columns">
            <div className="footer-v3-col">
              <p>Product</p>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#final-cta">Install</a>
            </div>

            <div className="footer-v3-col">
              <p>Workflow</p>
              <a href="#features">Guardrails</a>
              <a href="#how-it-works">Timeline</a>
              <Link to="/revision">Revision</Link>
            </div>

            <div className="footer-v3-col">
              <p>Connect</p>
              <a href="#">Chrome Web Store</a>
              <a href="#">GitHub</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>

        <div className="footer-v3-divider" aria-hidden="true" />

        <div className="footer-v3-bottom">
          <p>(c) 2026 DeepFocus. All rights reserved.</p>
          <div className="footer-v3-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
