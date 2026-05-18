import { EMPTY, Observable } from 'rxjs';
import { InjectableRxStompConfig, rxStompServiceFactory } from '@stomp/ng2-stompjs';

export class ServerRxStompService {
  watch(_topic: string): Observable<any> {
    return EMPTY;
  }
}

export function ssrSafeRxStompServiceFactory(config: InjectableRxStompConfig): any {
  if (typeof window === 'undefined' || (window as any).__SSR__) {
    return new ServerRxStompService();
  }

  return rxStompServiceFactory(config);
}
