import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  template: `
    <main class="trust-page">
      <div class="trust-page__inner">
        <a class="trust-page__back" routerLink="/">← Back to Crickzen</a>
        <p class="trust-page__eyebrow">Contact</p>
        <h1>How can we help?</h1>
        <p class="trust-page__lead">Contact the Crickzen team for data corrections, feedback, privacy requests, or questions about the service.</p>
        <section>
          <h2>Crickzen support</h2>
          <p><strong>Victoricode Labs</strong><br>Registered proprietorship owned by Akshay Waghmare<br>Pune, Maharashtra, India</p>
          <p><a class="contact-email" href="mailto:akshayw@crickzen.com">akshayw@crickzen.com</a></p>
          <p class="trust-page__note">For privacy or account-related requests, please include enough detail for us to identify the request. Do not send passwords or sensitive personal information by email.</p>
        </section>
        <p class="trust-page__links"><a routerLink="/about">About Crickzen</a><a routerLink="/privacy-policy">Privacy Policy</a><a routerLink="/terms-of-service">Terms of Service</a></p>
      </div>
    </main>
  `,
  styles: [`
    .trust-page { min-height: 60vh; padding: 32px 16px 56px; background: var(--color-background, #f7f8fb); color: var(--color-text-primary, #18202a); }
    .trust-page__inner { max-width: 760px; margin: 0 auto; padding: 28px; background: #fff; border: 1px solid rgba(24,32,42,.08); border-radius: 16px; box-shadow: 0 8px 24px rgba(24,32,42,.05); }
    a { color: #1769aa; text-decoration: none; }
    .trust-page__eyebrow { margin: 28px 0 8px; color: #1769aa; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(28px, 4vw, 42px); line-height: 1.1; }
    h2 { margin: 28px 0 8px; font-size: 18px; }
    p { line-height: 1.65; }
    .trust-page__lead { font-size: 18px; color: #52606d; }
    .contact-email { font-weight: 700; }
    .trust-page__note { color: #687583; font-size: 14px; }
    .trust-page__links { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 32px; font-weight: 600; }
  `]
})
export class ContactComponent {}
