import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <div class="footer__container">
        <div class="footer__branding">
          <app-logo
            variant="primary"
            size="footer"
            [showText]="true"
            logoText="Crickzen"
            altText="Crickzen Live Cricket"
            containerClass="footer__logo"
          ></app-logo>
          <p class="footer__tagline">Your ultimate destination for live cricket scores and updates</p>
        </div>

        <div class="footer__links">
          <div class="footer__section">
            <h3 class="footer__section-title">Cricket</h3>
            <ul class="footer__list">
              <li><a href="/matches" class="footer__link">Live Scores</a></li>
              <li><a href="/matches" class="footer__link">Recent Matches</a></li>
              <li><a href="/matches" class="footer__link">Upcoming Fixtures</a></li>
              <li><a href="/matches" class="footer__link">Tournament Coverage</a></li>
            </ul>
          </div>

          <div class="footer__section">
            <h3 class="footer__section-title">Features</h3>
            <ul class="footer__list">
              <li><a href="#" class="footer__link">Live Commentary</a></li>
              <li><a href="#" class="footer__link">Score Alerts</a></li>
              <li><a href="#" class="footer__link">Match Analysis</a></li>
              <li><a href="#" class="footer__link">Player Stats</a></li>
            </ul>
          </div>

          <div class="footer__section">
            <h3 class="footer__section-title">About</h3>
            <ul class="footer__list">
              <li><a href="/privacy-policy" class="footer__link">Privacy Policy</a></li>
              <li><a href="/terms-of-service" class="footer__link">Terms of Service</a></li>
              <li><a href="#" class="footer__link">Contact Us</a></li>
              <li><a href="#" class="footer__link">Support</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer__bottom">
        <div class="footer__container">
          <div class="footer__copyright">
            <p>&copy; {{ currentYear }} Crickzen. All rights reserved.</p>
          </div>
          <div class="footer__social">
            <a href="#" class="footer__social-link" aria-label="Follow us on Twitter">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="#" class="footer__social-link" aria-label="Follow us on Facebook">
              <i class="fab fa-facebook"></i>
            </a>
            <a href="#" class="footer__social-link" aria-label="Follow us on Instagram">
              <i class="fab fa-instagram"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #fff;
      margin-top: auto;
      padding: 3rem 0 1rem;
    }

    .footer__container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .footer__branding {
      text-align: center;
      margin-bottom: 2rem;
    }

    .footer__logo {
      justify-content: center;
      margin-bottom: 0.5rem;
    }

    .footer__tagline {
      color: #b0b0b0;
      font-size: 0.9rem;
      margin: 0;
    }

    .footer__links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .footer__section-title {
      color: #4fc3f7;
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      border-bottom: 2px solid #4fc3f7;
      padding-bottom: 0.5rem;
    }

    .footer__list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer__list li {
      margin-bottom: 0.5rem;
    }

    .footer__link {
      color: #b0b0b0;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .footer__link:hover {
      color: #4fc3f7;
    }

    .footer__bottom {
      border-top: 1px solid #404040;
      padding-top: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer__copyright {
      color: #808080;
      font-size: 0.9rem;
    }

    .footer__social {
      display: flex;
      gap: 1rem;
    }

    .footer__social-link {
      color: #b0b0b0;
      font-size: 1.2rem;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .footer__social-link:hover {
      color: #4fc3f7;
    }

    @media (max-width: 768px) {
      .footer__links {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .footer__bottom .footer__container {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
