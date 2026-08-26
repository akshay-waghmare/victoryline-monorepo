import { Inject, Injectable, Optional } from '@angular/core';
import { REQUEST } from '@nguniversal/express-engine/tokens';

@Injectable({ providedIn: 'root' })
export class PublicPredictionHostService {
  readonly publicOrigin = 'https://prediction.crickzen.com';

  constructor(@Optional() @Inject(REQUEST) private request: any) {}

  isPredictionHost(): boolean {
    return this.getHostname() === 'prediction.crickzen.com';
  }

  private getHostname(): string {
    const requestHost = this.request && this.request.headers
      ? (this.request.headers.host || this.request.headers.Host)
      : '';
    if (requestHost) {
      return String(requestHost).split(':')[0].toLowerCase();
    }

    if (typeof window !== 'undefined' && window.location) {
      return String(window.location.hostname || '').toLowerCase();
    }

    return '';
  }
}
