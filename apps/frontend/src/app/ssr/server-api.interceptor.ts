import { Inject, Injectable, Optional } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { REQUEST } from '@nguniversal/express-engine/tokens';

declare const process: any;

@Injectable()
export class ServerApiInterceptor implements HttpInterceptor {
  constructor(@Optional() @Inject(REQUEST) private request: any) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.url || !req.url.startsWith('/')) {
      return next.handle(req);
    }

    const backendUrl = this.getBackendUrl();
    const rewrittenUrl = this.rewriteUrl(req.url, backendUrl);

    if (!rewrittenUrl) {
      return next.handle(req);
    }

    const setHeaders: { [name: string]: string } = {};
    const cookie = this.request && this.request.headers ? this.request.headers.cookie : null;
    const authorization = this.request && this.request.headers ? this.request.headers.authorization : null;

    if (cookie && !req.headers.has('Cookie')) {
      setHeaders.Cookie = cookie;
    }
    if (authorization && !req.headers.has('Authorization')) {
      setHeaders.Authorization = authorization;
    }

    return next.handle(req.clone({ url: rewrittenUrl, setHeaders: setHeaders }));
  }

  private getBackendUrl(): string {
    if (typeof process !== 'undefined' && process.env && process.env.BACKEND_URL) {
      return process.env.BACKEND_URL.replace(/\/+$/, '');
    }
    return 'http://localhost:8099';
  }

  private rewriteUrl(url: string, backendUrl: string): string | null {
    const stripApiPrefix = this.shouldStripApiPrefix(backendUrl);

    if (url.indexOf('/api/v1') === 0 || url.indexOf('/api/poll') === 0) {
      return stripApiPrefix ? backendUrl + url.replace(/^\/api/, '') : backendUrl + url;
    }

    if (url.indexOf('/api/') === 0) {
      return stripApiPrefix ? backendUrl + url.replace(/^\/api/, '') : backendUrl + url;
    }

    if (url === '/api') {
      return stripApiPrefix ? backendUrl + '/' : backendUrl + '/api';
    }

    if (url.indexOf('/token/') === 0 || url === '/token') {
      return backendUrl + url;
    }

    if (url.indexOf('/sitemaps/') === 0 || url === '/sitemap.xml' || url === '/robots.txt') {
      return backendUrl + url;
    }

    return null;
  }

  private shouldStripApiPrefix(backendUrl: string): boolean {
    try {
      const parsed = new URL(backendUrl);
      const host = (parsed.hostname || '').toLowerCase();
      const path = (parsed.pathname || '').replace(/\/+$/, '');

      if (path === '/api') {
        return true;
      }

      return host === 'localhost'
        || host === '127.0.0.1'
        || host === 'backend'
        || parsed.port === '8099';
    } catch (_) {
      return backendUrl.indexOf('/api') !== -1;
    }
  }
}
