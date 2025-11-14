import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error-404',
  template: `
    <div class="error-page">
      <div class="error-container">
        <div class="error-branding">
          <app-logo
            variant="primary"
            size="xl"
            [showText]="true"
            logoText="Crickzen"
            altText="Crickzen Live Cricket"
            containerClass="error-logo"
          ></app-logo>
        </div>

        <div class="error-content">
          <div class="error-icon">
            <i class="material-icons">sports_cricket</i>
          </div>
          <h1 class="error-title">404</h1>
          <h2 class="error-subtitle">Oops! That's a Wide Ball!</h2>
          <p class="error-message">
            The page you're looking for seems to have gone for a six!
            Let's get you back to the cricket action.
          </p>

          <div class="error-actions">
            <button
              class="btn btn-primary"
              (click)="goHome()"
            >
              <i class="material-icons">home</i>
              Back to Home
            </button>

            <button
              class="btn btn-secondary"
              (click)="goBack()"
            >
              <i class="material-icons">arrow_back</i>
              Go Back
            </button>
          </div>
        </div>

        <div class="error-suggestions">
          <h3>What would you like to do?</h3>
          <div class="suggestions-grid">
            <a href="/matches" class="suggestion-card">
              <i class="material-icons">live_tv</i>
              <span>View Live Matches</span>
            </a>
            <a href="/matches" class="suggestion-card">
              <i class="material-icons">event</i>
              <span>Upcoming Fixtures</span>
            </a>
            <a href="/matches" class="suggestion-card">
              <i class="material-icons">history</i>
              <span>Recent Results</span>
            </a>
            <a href="#" class="suggestion-card">
              <i class="material-icons">search</i>
              <span>Search Teams</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .error-container {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      text-align: center;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    }

    .error-branding {
      margin-bottom: 2rem;
    }

    .error-logo {
      justify-content: center;
    }

    .error-content {
      margin-bottom: 3rem;
    }

    .error-icon {
      font-size: 4rem;
      color: #ff6b6b;
      margin-bottom: 1rem;
    }

    .error-icon .material-icons {
      font-size: inherit;
    }

    .error-title {
      font-size: 6rem;
      font-weight: bold;
      color: #333;
      margin: 0;
      line-height: 1;
    }

    .error-subtitle {
      color: #666;
      font-size: 1.5rem;
      margin: 1rem 0;
    }

    .error-message {
      color: #777;
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-bottom: 2rem;
    }

    .btn {
      padding: 0.8rem 1.5rem;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn-primary {
      background: #4fc3f7;
      color: white;
    }

    .btn-primary:hover {
      background: #29b6f6;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #e0e0e0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #bdbdbd;
      transform: translateY(-2px);
    }

    .error-suggestions h3 {
      color: #333;
      margin-bottom: 1.5rem;
    }

    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
    }

    .suggestion-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 10px;
      text-decoration: none;
      color: #666;
      transition: all 0.2s ease;
    }

    .suggestion-card:hover {
      background: #e9ecef;
      color: #4fc3f7;
      transform: translateY(-3px);
    }

    .suggestion-card .material-icons {
      font-size: 2rem;
    }

    .suggestion-card span {
      font-size: 0.9rem;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .error-container {
        padding: 2rem;
      }

      .error-title {
        font-size: 4rem;
      }

      .error-actions {
        flex-direction: column;
        align-items: center;
      }

      .suggestions-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class Error404Component {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    window.history.back();
  }
}
