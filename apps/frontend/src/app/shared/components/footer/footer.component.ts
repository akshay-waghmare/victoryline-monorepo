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
            logoText="CrickZen"
            altText="CrickZen Live Cricket"
            containerClass="footer__logo"
          ></app-logo>
          <p class="footer__tagline">Your ultimate destination for live cricket scores and updates</p>
        </div>
        
        <div class="footer__links">
          <div class="footer__section">
            <h3 class="footer__section-title">Cricket</h3>
            <ul class="footer__list">
              <li><a href="/live-score" class="footer__link">Live Scores</a></li>
              <li><a href="/live-cricket-score" class="footer__link">Live Cricket Score</a></li>
              <li><a href="/live-score/today" class="footer__link">Today Match Live Score</a></li>
              <li><a href="/cricket-schedule/today" class="footer__link">Today Schedule</a></li>
              <li><a href="/live-score/archive" class="footer__link">Match Archive</a></li>
            </ul>
          </div>
          
          <div class="footer__section">
            <h3 class="footer__section-title">Features</h3>
            <ul class="footer__list">
              <li><a href="/live-score/ipl" class="footer__link">IPL Live Score</a></li>
              <li><a href="/cricket-schedule/ipl-2026" class="footer__link">IPL 2026 Schedule</a></li>
              <li><a href="/matches" class="footer__link">All Matches</a></li>
              <li><a href="/players" class="footer__link">Player Stats</a></li>
            </ul>
          </div>
          
          <div class="footer__section">
            <h3 class="footer__section-title">About</h3>
            <ul class="footer__list">
              <li><a href="/about" class="footer__link">About CrickZen</a></li>
              <li><a href="/contact" class="footer__link">Contact</a></li>
              <li><a href="/privacy-policy" class="footer__link">Privacy Policy</a></li>
              <li><a href="/terms-of-service" class="footer__link">Terms of Service</a></li>
              <li><a href="/teams" class="footer__link">Teams</a></li>
              <li><a href="/series" class="footer__link">Series</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="footer__bottom">
        <div class="footer__container">
          <div class="footer__copyright">
            <p>&copy; {{ currentYear }} CrickZen · Operated by Victoricode Labs</p>
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
      background: var(--color-background-footer, linear-gradient(135deg, #1a1a2e 0%, #16213e 100%));
      color: var(--color-text-inverse, #f0f0f0);
      margin-top: auto;
      padding: 2.5rem 0 1rem;
    }

    .footer__container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
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
      color: var(--color-text-muted, #9e9e9e);
      font-size: 0.875rem;
      margin: 0;
      letter-spacing: 0.02em;
    }

    .footer__links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .footer__section-title {
      color: var(--color-info, #29b6f6);
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-info, #29b6f6);
      padding-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
      color: var(--color-text-muted, #9e9e9e);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.2s ease, padding-left 0.2s ease;
    }

    .footer__link:hover {
      color: var(--color-info, #29b6f6);
      padding-left: 4px;
    }

    .footer__bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer__copyright {
      color: var(--color-text-disabled, #616161);
      font-size: 0.8rem;
    }

    .footer__social {
      display: flex;
      gap: 1rem;
    }

    .footer__social-link {
      color: var(--color-text-muted, #9e9e9e);
      font-size: 1.1rem;
      text-decoration: none;
      transition: color 0.2s ease, transform 0.2s ease;
    }

    .footer__social-link:hover {
      color: var(--color-info, #29b6f6);
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .footer {
        padding: 2rem 0 1rem;
      }

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
