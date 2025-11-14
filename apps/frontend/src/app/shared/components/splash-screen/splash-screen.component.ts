import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash-screen',
  template: `
    <div class="splash-screen" [@slideOut]="animationState">
      <div class="splash-container">
        <div class="splash-logo">
          <app-logo
            variant="primary"
            size="2xl"
            [showText]="true"
            logoText="Crickzen"
            altText="Crickzen Live Cricket"
            containerClass="splash-logo-container"
          ></app-logo>
        </div>

        <div class="splash-animation">
          <div class="cricket-ball"></div>
          <div class="cricket-stumps">
            <div class="stump"></div>
            <div class="stump"></div>
            <div class="stump"></div>
          </div>
        </div>

        <div class="splash-text">
          <h1 class="splash-title">Welcome to Live Cricket</h1>
          <p class="splash-subtitle">Your ultimate destination for real-time cricket updates</p>
        </div>

        <div class="splash-progress">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressValue"></div>
          </div>
          <p class="progress-text">{{ loadingText }}</p>
        </div>
      </div>
    </div>
  `,
  animations: [
    // Add Angular animations here if needed
  ],
  styles: [`
    .splash-screen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.5s ease-in-out;
    }

    .splash-container {
      text-align: center;
      color: white;
      max-width: 500px;
      padding: 2rem;
    }

    .splash-logo {
      margin-bottom: 3rem;
      animation: logoEntrance 1s ease-out;
    }

    .splash-logo-container {
      justify-content: center;
    }

    .splash-animation {
      position: relative;
      height: 80px;
      margin: 2rem 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cricket-ball {
      width: 40px;
      height: 40px;
      background: #ff4444;
      border-radius: 50%;
      position: relative;
      animation: ballBounce 1.5s ease-in-out infinite;
    }

    .cricket-ball::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -2px;
      right: -2px;
      height: 2px;
      background: white;
      transform: translateY(-50%);
    }

    .cricket-stumps {
      display: flex;
      gap: 4px;
      margin-left: 2rem;
      animation: stumpsShake 2s ease-in-out infinite;
    }

    .stump {
      width: 6px;
      height: 50px;
      background: #8B4513;
      border-radius: 3px;
    }

    .splash-title {
      font-size: 2.5rem;
      font-weight: bold;
      margin: 2rem 0 1rem;
      animation: textSlideIn 1s ease-out 0.5s both;
    }

    .splash-subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin-bottom: 3rem;
      animation: textSlideIn 1s ease-out 0.7s both;
    }

    .splash-progress {
      margin-top: 2rem;
      animation: progressFadeIn 1s ease-out 1s both;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .progress-fill {
      height: 100%;
      background: #4fc3f7;
      border-radius: 2px;
      transition: width 0.3s ease;
      animation: progressGlow 2s ease-in-out infinite;
    }

    .progress-text {
      font-size: 0.9rem;
      opacity: 0.8;
      margin: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes logoEntrance {
      from {
        opacity: 0;
        transform: scale(0.5) rotate(-10deg);
      }
      to {
        opacity: 1;
        transform: scale(1) rotate(0deg);
      }
    }

    @keyframes ballBounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-20px);
      }
      60% {
        transform: translateY(-10px);
      }
    }

    @keyframes stumpsShake {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(1deg); }
      75% { transform: rotate(-1deg); }
    }

    @keyframes textSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes progressFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes progressGlow {
      0%, 100% {
        box-shadow: 0 0 5px rgba(79, 195, 247, 0.3);
      }
      50% {
        box-shadow: 0 0 15px rgba(79, 195, 247, 0.6);
      }
    }

    @media (max-width: 768px) {
      .splash-title {
        font-size: 2rem;
      }

      .splash-subtitle {
        font-size: 1rem;
      }
    }
  `]
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  progressValue = 0;
  loadingText = 'Initializing cricket app...';
  animationState = 'in';

  private loadingSteps = [
    { progress: 20, text: 'Loading cricket data...' },
    { progress: 40, text: 'Connecting to live scores...' },
    { progress: 60, text: 'Setting up real-time updates...' },
    { progress: 80, text: 'Preparing your dashboard...' },
    { progress: 100, text: 'Ready to play!' }
  ];

  private currentStep = 0;
  private intervalId: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.startLoadingSequence();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private startLoadingSequence() {
    this.intervalId = setInterval(() => {
      if (this.currentStep < this.loadingSteps.length) {
        const step = this.loadingSteps[this.currentStep];
        this.progressValue = step.progress;
        this.loadingText = step.text;
        this.currentStep++;
      } else {
        this.completeSplash();
      }
    }, 800);
  }

  private completeSplash() {
    clearInterval(this.intervalId);
    setTimeout(() => {
      this.animationState = 'out';
      // Navigate to main app or hide splash
      // this.router.navigate(['/home']);
    }, 500);
  }
}
