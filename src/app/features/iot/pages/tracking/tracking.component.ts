import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Telemetry } from '../../models/telemetry.model';
import { TelemetryService } from '../../services/telemetry.service';
import { interval, Subscription, EMPTY, throwError } from 'rxjs';
import { switchMap, catchError, timeout, retryWhen, scan, delay } from 'rxjs/operators';
import * as L from 'leaflet';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  telemetry: Telemetry | undefined;
  waitingForSimulation = false;
  private pollingSub?: Subscription;
  private vehicleId!: number;

  // Leaflet map properties
  private map!: L.Map;
  private marker!: L.Marker;
  private routePolyline?: L.Polyline;
  private isRouteDrawn = false; // Track if route has been drawn
  private lastPosition?: L.LatLng; // Track last marker position for smooth updates

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
              // If 404, simulation hasn't started - set waiting flag and continue polling
              if (err?.status === 404) {
                this.waitingForSimulation = true;
                return EMPTY; // Don't retry, just wait for next interval
              }
              // For other errors (timeout, 504), use retry logic
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
          this.waitingForSimulation = false;
          this.updateMapPosition(data);
        } else {
          // Backend returned null/empty - simulation hasn't started yet
          this.waitingForSimulation = true;
        }
      });
  }

  ngAfterViewInit(): void {
    // Initialize Leaflet map after view is ready
    // Wait a bit for the *ngIf to render the #map div
    setTimeout(() => {
      if (this.telemetry) {
        this.initMap();
      }
    }, 100);
  }

  private initMap(): void {
    // Prevent "Map container is already initialized" error
    if (this.map) {
      this.map.remove();
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
      return;
    }

    // Default center (Lima, Peru)
    const defaultLat = this.telemetry?.latitude || -12.0464;
    const defaultLng = this.telemetry?.longitude || -77.0428;

    // Initialize map with tap tolerance for better mobile experience
    this.map = L.map('map', {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: true,
      preferCanvas: true, // Better performance for many markers/paths
      tapTolerance: 15
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 3
    }).addTo(this.map);

    // Create custom car icon
    const carIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfmpc8L3RleHQ+PC9zdmc+',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Add marker
    this.marker = L.marker([defaultLat, defaultLng], { icon: carIcon }).addTo(this.map);
  }

  private updateMapPosition(data: Telemetry): void {
    // Initialize map if first time receiving data
    if (!this.map && data) {
      this.initMap();
    }

    if (!this.map || !this.marker) {
      return;
    }

    // Draw the planned route if available and not yet drawn
    if (data.plannedRoute && data.plannedRoute.length > 0 && !this.isRouteDrawn) {
      this.drawRoute(data.plannedRoute);
    }

    const newLatLng = L.latLng(data.latitude, data.longitude);

    // Check if position has significantly changed to avoid jitter
    // Only update if distance > 0.0001 degrees (~11 meters)
    if (this.lastPosition) {
      const distance = this.lastPosition.distanceTo(newLatLng);
      if (distance < 1) {
        // Too small, ignore update to prevent jitter
        return;
      }
    }

    // Smooth marker update - reuse existing marker instance
    this.marker.setLatLng(newLatLng);
    this.lastPosition = newLatLng;

    // Pan map smoothly to follow the vehicle
    this.map.panTo(newLatLng, {
      animate: true,
      duration: 1.0 // 1 second smooth animation
    });
  }

  private drawRoute(plannedRoute: number[][]): void {
    if (!this.map) {
      return;
    }

    try {
      // Convert route coordinates to Leaflet LatLng format
      const routeLatLngs: L.LatLngExpression[] = plannedRoute.map(coord => {
        return [coord[0], coord[1]] as L.LatLngExpression;
      });

      // Remove existing route if any
      if (this.routePolyline) {
        this.routePolyline.remove();
      }

      // Draw the route as a red polyline
      this.routePolyline = L.polyline(routeLatLngs, {
        color: 'red',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
      }).addTo(this.map);

      // Fit map bounds to show entire route
      const bounds = this.routePolyline.getBounds();
      this.map.fitBounds(bounds, { padding: [50, 50] });

      this.isRouteDrawn = true;

      console.log('Route drawn successfully with', plannedRoute.length, 'points');
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();

    // Clean up Leaflet map
    if (this.map) {
      this.map.remove();
    }
  }
}
