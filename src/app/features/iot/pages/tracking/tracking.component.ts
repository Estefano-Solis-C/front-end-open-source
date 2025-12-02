import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Telemetry } from '../../models/telemetry.model';
import { TelemetryService } from '../../services/telemetry.service';
import { interval, Subscription, EMPTY, throwError } from 'rxjs';
import { switchMap, catchError, timeout, retryWhen, scan, delay } from 'rxjs/operators';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit, OnDestroy {
  telemetry: Telemetry | undefined;
  private pollingSub?: Subscription;
  private vehicleId!: number;

  constructor(
    private route: ActivatedRoute,
    private telemetryService: TelemetryService
  ) {}

  ngOnInit(): void {
    this.vehicleId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.vehicleId) {
      return;
    }

    // Start polling every 5 seconds; apply per-request timeout and exponential backoff
    this.pollingSub = interval(5000)
      .pipe(
        switchMap(() => {
          return this.telemetryService.getLatestTelemetry(this.vehicleId).pipe(
            timeout(5000),
            catchError(err => {
              // If backend hasn't generated data yet or gateway timeout, do not break polling
              // Optionally, show a non-blocking toast outside of this logic
              return throwError(() => err);
            }),
            retryWhen(errors =>
              errors.pipe(
                // Exponential backoff: 1s, 2s, 4s, up to max attempts
                scan((acc, err) => {
                  return { count: acc.count + 1, err } as { count: number; err: any };
                }, { count: 0, err: null as any }),
                switchMap(state => {
                  const maxRetries = 3;
                  if (state.count > maxRetries) {
                    // After max retries, swallow error and continue polling without emitting
                    return EMPTY;
                  }
                  const delayMs = Math.pow(2, state.count) * 1000; // 1s, 2s, 4s
                  return interval(delayMs).pipe(switchMap(() => EMPTY));
                })
              )
            )
          );
        }),
        catchError(() => EMPTY)
      )
      .subscribe(data => {
        if (data) {
          this.telemetry = data;
        }
      });
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
  }
}
