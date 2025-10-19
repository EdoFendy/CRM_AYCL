import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';
import { Observable, Subscriber, Subscription } from 'rxjs';

@Injectable()
export class CorrelationIdService {
  private readonly storage = new AsyncLocalStorage<string>();

  runWith<T>(correlationId: string, callback: () => Observable<T>): Observable<T> {
    return new Observable<T>((subscriber: Subscriber<T>) => {
      let subscription: Subscription | undefined;
      this.storage.run(correlationId, () => {
        subscription = callback().subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete()
        });
      });

      return () => subscription?.unsubscribe();
    });
  }

  getId(): string | undefined {
    return this.storage.getStore();
  }
}
// CRITIC PASS: Implementazione usa AsyncLocalStorage senza gestione per scenari non HTTP (es. cron, queue); TODO adattare per worker BullMQ e WebSocket.
