import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  template: `
    <main class="trust-page">
      <div class="trust-page__inner">
        <a class="trust-page__back" routerLink="/">← Back to CrickZen</a>
        <p class="trust-page__eyebrow">About CrickZen</p>
        <h1>Live cricket information, made easier to follow.</h1>
        <p class="trust-page__lead">CrickZen brings live scores, match schedules, scorecards, lineups, player statistics, and match intelligence together in one focused cricket experience.</p>

        <section>
          <h2>Who operates CrickZen?</h2>
          <p>CrickZen is operated by <strong>Victoricode Labs</strong>, a registered proprietorship owned by <strong>Akshay Waghmare</strong>, based in Pune, Maharashtra, India.</p>
        </section>

        <section>
          <h2>Our approach</h2>
          <p>We organise cricket data into clear, compact match surfaces so fans can quickly understand what is happening now, what happened in a match, and what is coming next.</p>
          <p>Live information is collected through third-party cricket data feeds and automated processing. Updates can occasionally be delayed, corrected, or unavailable while a source is being refreshed.</p>
        </section>

        <section>
          <h2>Match intelligence</h2>
          <p>CrickZen’s model-based insights are informational only. They are not betting advice, financial advice, or a guarantee of a match result.</p>
        </section>

        <p class="trust-page__links"><a routerLink="/contact">Contact us</a><a routerLink="/privacy-policy">Privacy Policy</a><a routerLink="/terms-of-service">Terms of Service</a></p>
      </div>
    </main>
  `,
  styles: [`
    .trust-page { min-height: 60vh; padding: 32px 16px 56px; background: var(--color-background, #f7f8fb); color: var(--color-text-primary, #18202a); }
    .trust-page__inner { max-width: 760px; margin: 0 auto; padding: 28px; background: #fff; border: 1px solid rgba(24,32,42,.08); border-radius: 16px; box-shadow: 0 8px 24px rgba(24,32,42,.05); }
    .trust-page__back, .trust-page__links a { color: #1769aa; text-decoration: none; }
    .trust-page__eyebrow { margin: 28px 0 8px; color: #1769aa; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(28px, 4vw, 42px); line-height: 1.1; }
    h2 { margin: 28px 0 8px; font-size: 18px; }
    p { line-height: 1.65; }
    .trust-page__lead { font-size: 18px; color: #52606d; }
    .trust-page__links { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 32px; font-weight: 600; }
  `]
})
export class AboutComponent {}
