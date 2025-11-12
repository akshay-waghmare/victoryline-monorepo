import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LazyMediaService {
  init(): void {
    if (!this.isBrowser()) {
      return;
    }

    const schedule = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback.bind(window)
      : (cb: () => void) => setTimeout(cb, 32);

    schedule(() => this.bootstrap());
  }

  private bootstrap(): void {
    if (!this.isBrowser()) {
      return;
    }

  const selector = 'img:not([data-critical]), iframe[data-lazy], video[data-lazy]';
  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

    if (!elements.length) {
      return;
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          }
          const target = entry.target as HTMLElement;
          this.activateMedia(target);
          obs.unobserve(target);
        });
      }, { rootMargin: '200px 0px', threshold: 0.01 });

      elements.forEach(element => this.registerElement(element, observer));
      this.observeMutations(selector, observer);
    } else {
      elements.forEach(element => {
        this.prepareElement(element);
        this.activateMedia(element);
      });
    }
  }

  private registerElement(element: HTMLElement, observer: IntersectionObserver): void {
    if (element.hasAttribute('data-critical')) {
      return;
    }

    this.prepareElement(element);
    observer.observe(element);
  }

  private prepareElement(element: HTMLElement): void {
    if (element instanceof HTMLImageElement) {
      if (!element.hasAttribute('loading')) {
        element.setAttribute('loading', 'lazy');
      }
      if (!element.hasAttribute('decoding')) {
        element.setAttribute('decoding', 'async');
      }
      if (!element.hasAttribute('fetchpriority')) {
        element.setAttribute('fetchpriority', 'low');
      }
    }

    if (element instanceof HTMLIFrameElement) {
      if (!element.hasAttribute('loading')) {
        element.setAttribute('loading', 'lazy');
      }
    }
  }

  private activateMedia(element: HTMLElement): void {
    if (element instanceof HTMLImageElement) {
      const dataSrcset = element.getAttribute('data-srcset');
      const dataSrc = element.getAttribute('data-src');

      if (dataSrcset && !element.srcset) {
        element.srcset = dataSrcset;
      }
      if (dataSrc && !element.src) {
        element.src = dataSrc;
      }
    }

    if (element instanceof HTMLIFrameElement || element instanceof HTMLVideoElement) {
      const dataSrc = element.getAttribute('data-src');
      if (dataSrc && !(element as HTMLIFrameElement | HTMLVideoElement).src) {
        (element as HTMLIFrameElement | HTMLVideoElement).src = dataSrc;
      }
    }
  }

  private observeMutations(selector: string, observer: IntersectionObserver): void {
    const mutationObserver = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches(selector)) {
            this.registerElement(node, observer);
          }

          Array.from(node.querySelectorAll(selector)).forEach(child => {
            this.registerElement(child as HTMLElement, observer);
          });
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }
}
