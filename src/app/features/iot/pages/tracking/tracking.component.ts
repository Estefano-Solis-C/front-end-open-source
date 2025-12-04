import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import { TelemetryService } from '../../services/telemetry.service';
import { VehicleService } from '../../../listings/services/vehicle.service';
import Vehicle from '../../../listings/models/vehicle.model';
import { Subscription } from 'rxjs';

interface LatLng { lat: number; lng: number; }

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})

export class TrackingComponent implements OnInit, OnDestroy {
  private map!: L.Map;
  private vehicleMarker!: L.Marker;
  private tracePolyline!: L.Polyline;
  private readonly MAX_TRACE_POINTS = 5000;
  private readonly MIN_POINT_DISTANCE = 0.005;
  private readonly MAX_ANGLE_DIFFERENCE = 5;
  private carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097136.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  vehicleId = 0;
  currentPosition: LatLng = { lat: -12.0464, lng: -77.0428 };
  private previousPosition: LatLng = { lat: -12.0464, lng: -77.0428 };

  private vehicle: Vehicle | null = null;
  private isVehicleParked: boolean = false;

  renterName: string = 'No disponible';
  currentSpeed: number = 0;
  currentFuel: number = 100;
  vehicleState: 'Moviéndose' | 'Detenido' | 'Repostando' | 'Estacionado' = 'Detenido';
  get statusColor(): string {
    if (this.vehicleState === 'Repostando') return '#FF9800';
    if (this.vehicleState === 'Estacionado') return '#FFA726';
    return (this.vehicleState === 'Moviéndose' || this.currentSpeed > 0) ? '#4CAF50' : '#f44336';
  }

  private animationFrameId: number | null = null;
  private routePoints: LatLng[] = [];
  private currentSegmentIndex = 0;
  private segmentStartTime = 0;
  private readonly SEGMENT_DURATION_MS = 800;

  private subscriptions: Subscription[] = [];
  private refuelTimeout: any = null;
  private isRefueling = false;
  private readonly FUEL_CONSUMPTION_RATE = 0.02;
  private readonly LIMA_BOUNDS = {
    latMin: -12.13,
    latMax: -12.04,
    lngMin: -77.08,
    lngMax: -76.95
  };

  private lastUIUpdateTime = 0;
  private nextUIUpdateDelay = 1000;
  private tempSpeed = 0;
  private tempFuel = 100;

  private lastSaveTime = 0;

  constructor(
    private route: ActivatedRoute,
    private telemetryService: TelemetryService,
    private vehicleService: VehicleService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.vehicleId = id ? Number(id) : 1;

    this.loadVehicleInfo();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.refuelTimeout) {
      clearTimeout(this.refuelTimeout);
      this.refuelTimeout = null;
    }

    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    if (this.map) this.map.remove();
  }

  private initializeMap(): void {
    this.map = L.map('map').setView([this.currentPosition.lat, this.currentPosition.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.vehicleMarker = L.marker([this.currentPosition.lat, this.currentPosition.lng], {
      icon: this.carIcon
    }).addTo(this.map);

    this.tracePolyline = L.polyline([], {
      color: '#1976D2',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1
    }).addTo(this.map);

    this.updateVehicleTooltip();
  }

  /**
   * Actualiza el tooltip del vehículo con valores formateados (números enteros)
   * 🅿️ MODIFICADO: Muestra información diferente si el vehículo está estacionado
   */
  private updateVehicleTooltip(): void {
    const vehicleInfo = this.vehicle
      ? `${this.vehicle.brand} ${this.vehicle.model}`
      : `${this.translate.instant('TRACKING.VEHICLE_LABEL')} ${this.vehicleId}`;

    let tooltipContent: string;

    if (this.isVehicleParked) {
      const parkedState = this.translate.instant('TRACKING.TOOLTIP_PARKED_STATE');
      const availableForRent = this.translate.instant('TRACKING.TOOLTIP_AVAILABLE_FOR_RENT');
      const priceLabel = this.translate.instant('TRACKING.TOOLTIP_PRICE');
      const infoLabel = this.translate.instant('TRACKING.TOOLTIP_INFO');
      const statusLabel = this.translate.instant('TRACKING.TOOLTIP_STATUS');
      const unitPerDay = this.translate.instant('TRACKING.UNIT_PER_DAY');

      tooltipContent = `
        <div style="font-family: Arial, sans-serif; padding: 8px; min-width: 180px;">
          <h4 style="margin: 0 0 8px 0; color: #FF9800; font-size: 14px; border-bottom: 2px solid #FFA726; padding-bottom: 4px;">
            🅿️ ${vehicleInfo}
          </h4>
          <div style="margin: 6px 0; font-size: 12px;">
            <strong>📊 ${statusLabel}:</strong>
            <span style="color: #FF9800; font-weight: bold;">${parkedState}</span>
          </div>
          <div style="margin: 6px 0; font-size: 12px;">
            <strong>ℹ️ ${infoLabel}:</strong><br/>
            <span style="color: #666;">${availableForRent}</span>
          </div>
          <div style="margin: 6px 0; font-size: 12px;">
            <strong>💵 ${priceLabel}:</strong>
            <span style="color: #4CAF50; font-weight: bold;">S/ ${this.vehicle?.pricePerDay || 0}${unitPerDay}</span>
          </div>
        </div>
      `;
    } else {
      const driverLabel = this.translate.instant('TRACKING.TOOLTIP_DRIVER');
      const speedLabel = this.translate.instant('TRACKING.TOOLTIP_SPEED');
      const fuelLabel = this.translate.instant('TRACKING.TOOLTIP_FUEL');
      const statusLabel = this.translate.instant('TRACKING.TOOLTIP_STATUS');
      const unitKmh = this.translate.instant('TRACKING.UNIT_KMH');
      const unitPercent = this.translate.instant('TRACKING.UNIT_PERCENT');

      tooltipContent = `
        <div style="font-family: Arial, sans-serif; padding: 8px; min-width: 180px;">
          <h4 style="margin: 0 0 8px 0; color: #1976D2; font-size: 14px; border-bottom: 2px solid #2196F3; padding-bottom: 4px;">
            🚗 ${vehicleInfo}
          </h4>
          <div style="margin: 6px 0; font-size: 12px;">
            <strong>👤 ${driverLabel}:</strong><br/>
            <span style="color: #333;">${this.renterName}</span>
          </div>
          <div style="margin: 6px 0; font-size: 12px;">
            <strong>🚀 ${speedLabel}:</strong>
            <span style="color: #2196F3; font-weight: bold;">${Math.round(this.currentSpeed)} ${unitKmh}</span>
          </div>
          <div style="margin: 6px 0; font-size: 12px;">
            <strong>⛽ ${fuelLabel}:</strong>
            <span style="color: ${this.currentFuel > 20 ? '#4CAF50' : '#f44336'}; font-weight: bold;">
              ${Math.round(this.currentFuel)}${unitPercent}
            </span>
          </div>
          <div style="margin: 6px 0; font-size: 12px;">
            <strong>📊 ${statusLabel}:</strong>
            <span style="color: ${this.statusColor}; font-weight: bold;">${this.vehicleState}</span>
          </div>
        </div>
      `;
    }

    this.vehicleMarker.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      offset: [0, -20],
      className: 'vehicle-tooltip',
      opacity: 0.95
    });
  }

  /**
   * 🔄 PERSISTENCIA: Restaura el historial del recorrido del vehículo
   * - Carga todos los puntos de telemetría históricos
   * - Los ordena cronológicamente (más antiguo → más reciente)
   * - Reconstruye el rastro usando addOptimizedPoint (con simplificación)
   * - Actualiza la posición inicial al último punto conocido
   * - Retorna Promise con información de si se restauró el estado
   */
  private restoreRouteHistory(): Promise<{ restored: boolean; lastPosition?: LatLng; lastSpeed?: number; lastFuel?: number }> {
    return new Promise((resolve) => {

      const sub = this.telemetryService.getTelemetryByVehicleId(this.vehicleId).subscribe({
        next: (historyData) => {
          if (!historyData || historyData.length === 0) {
            resolve({ restored: false });
            return;
          }

          const sortedHistory = historyData.sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return dateA - dateB;
          });

          let reconstructedPoints = 0;
          sortedHistory.forEach((telemetry) => {
            if (telemetry.latitude && telemetry.longitude) {
              this.addOptimizedPoint(telemetry.latitude, telemetry.longitude);
              reconstructedPoints++;
            }
          });

          const lastTelemetry = sortedHistory[sortedHistory.length - 1];

          if (lastTelemetry.latitude && lastTelemetry.longitude) {
            const lastPosition: LatLng = {
              lat: lastTelemetry.latitude,
              lng: lastTelemetry.longitude
            };

            this.currentPosition = lastPosition;
            this.previousPosition = { ...this.currentPosition };
            this.vehicleMarker.setLatLng(this.currentPosition);

            const lastSpeed = Math.floor(lastTelemetry.speed || 0);
            const lastFuel = Math.floor(lastTelemetry.fuelLevel || 100);

            this.map.setView(this.currentPosition, 15);

            const traceLatLngs = this.tracePolyline.getLatLngs() as L.LatLng[];

            resolve({
              restored: true,
              lastPosition,
              lastSpeed,
              lastFuel
            });
          } else {
            resolve({ restored: false });
          }
        },
        error: (err) => {
          resolve({ restored: false });
        }
      });

      this.subscriptions.push(sub);
    });
  }

  /**
   * 🚗 NUEVO: Obtiene información del vehículo para determinar si debe animarse o estar estático
   * - Si status === 'available': Vehículo estacionado (NO animar)
   * - Si status === 'rented': Vehículo en movimiento (SÍ animar)
   */
  private loadVehicleInfo(): void {

    const sub = this.vehicleService.getVehicle(this.vehicleId).subscribe({
      next: (vehicle) => {
        this.vehicle = vehicle;
        this.isVehicleParked = vehicle.status === 'available';

        if (this.isVehicleParked) {
          this.vehicleState = 'Estacionado';
        } else {
        }

        setTimeout(() => {
          this.initializeMap();
          this.loadInitialData();
        }, 100);
      },
      error: (err) => {

        this.isVehicleParked = true;
        this.vehicleState = 'Estacionado';

        setTimeout(() => {
          this.initializeMap();
          this.loadInitialData();
        }, 100);
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Loads initial data for the tracking component.
   * First restores route history if available, then fetches latest telemetry.
   * If telemetry is not found (404), initializes with random position and starts simulation.
   * 🚗 MODIFICADO: Solo inicia simulación si el vehículo NO está estacionado
   */
  private async loadInitialData(): Promise<void> {

    const restoredState = await this.restoreRouteHistory();

    const sub = this.telemetryService.getLatestTelemetry(this.vehicleId).subscribe({
      next: (data) => {
        if (data) {
          this.renterName = data.renterName ?? 'No disponible';

          if (restoredState.restored) {

            this.currentSpeed = restoredState.lastSpeed || Math.floor(data.speed);
            this.currentFuel = restoredState.lastFuel || Math.floor(data.fuelLevel);

          } else {

            this.currentSpeed = Math.floor(data.speed);
            this.currentFuel = Math.floor(data.fuelLevel);

            if (data.latitude && data.longitude) {
              this.currentPosition = { lat: data.latitude, lng: data.longitude };
              this.previousPosition = { ...this.currentPosition };
              this.vehicleMarker.setLatLng(this.currentPosition);
              this.map.setView(this.currentPosition, 15);

            }
          }

          this.tempSpeed = this.currentSpeed;
          this.tempFuel = this.currentFuel;

          this.vehicleState = this.currentSpeed > 0 ? 'Moviéndose' : 'Detenido';

          this.lastUIUpdateTime = performance.now();
          this.lastSaveTime = performance.now();
          this.nextUIUpdateDelay = 1000 + Math.random() * 1000;

          if (this.isVehicleParked) {
            this.vehicleState = 'Estacionado';
            this.currentSpeed = 0;
            this.tempSpeed = 0;
            this.updateVehicleTooltip();
          } else {
            this.startRouteSimulation();
          }
        }
      },
      error: (err) => {
        const errorStatus = err?.status;

        if (errorStatus === 404) {

          const randomLat = this.LIMA_BOUNDS.latMin + Math.random() * (this.LIMA_BOUNDS.latMax - this.LIMA_BOUNDS.latMin);
          const randomLng = this.LIMA_BOUNDS.lngMin + Math.random() * (this.LIMA_BOUNDS.lngMax - this.LIMA_BOUNDS.lngMin);

          this.currentPosition = { lat: randomLat, lng: randomLng };
          this.previousPosition = { ...this.currentPosition };

          this.vehicleMarker.setLatLng(this.currentPosition);
          this.map.setView(this.currentPosition, 15);

          this.currentSpeed = 0;
          this.currentFuel = 100;
          this.tempSpeed = 0;
          this.tempFuel = 100;
          this.renterName = 'No disponible';

          this.lastUIUpdateTime = performance.now();
          this.lastSaveTime = performance.now();
          this.nextUIUpdateDelay = 1000 + Math.random() * 1000;

          if (this.isVehicleParked) {
            this.vehicleState = 'Estacionado';
          } else {
            this.startRouteSimulation();
          }
        } else {
        }
      }
    });
    this.subscriptions.push(sub);
  }

  private startRouteSimulation(): void {
    if (this.isVehicleParked) {
      return;
    }

    const destLat = this.LIMA_BOUNDS.latMin + Math.random() * (this.LIMA_BOUNDS.latMax - this.LIMA_BOUNDS.latMin);
    const destLng = this.LIMA_BOUNDS.lngMin + Math.random() * (this.LIMA_BOUNDS.lngMax - this.LIMA_BOUNDS.lngMin);

    const sub = this.telemetryService.getSimulationRoute(
      this.currentPosition.lat,
      this.currentPosition.lng,
      destLat,
      destLng
    ).subscribe({
      next: (res) => {

        if (res && res.length > 0) {
          this.routePoints = res;
          this.currentSegmentIndex = 0;
          this.segmentStartTime = performance.now();
          this.vehicleState = 'Moviéndose';
          this.updateVehicleTooltip();

          if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(this.animateStep);
          }
        } else {
        }
      },
      error: (err) => {
        setTimeout(() => this.startRouteSimulation(), 5000);
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
   * @param lat1 Latitud del punto 1
   * @param lng1 Longitud del punto 1
   * @param lat2 Latitud del punto 2
   * @param lng2 Longitud del punto 2
   * @returns Distancia en kilómetros
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Calcula el ángulo (bearing) entre dos puntos en grados (0-360)
   * @param lat1 Latitud del punto 1
   * @param lng1 Longitud del punto 1
   * @param lat2 Latitud del punto 2
   * @param lng2 Longitud del punto 2
   * @returns Ángulo en grados (0-360)
   */
  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = this.deg2rad(lng2 - lng1);
    const lat1Rad = this.deg2rad(lat1);
    const lat2Rad = this.deg2rad(lat2);

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
  }

  /**
   * Calcula la diferencia angular entre dos bearings (0-180 grados)
   * @param bearing1 Primer ángulo en grados
   * @param bearing2 Segundo ángulo en grados
   * @returns Diferencia angular absoluta (0-180)
   */
  private getAngleDifference(bearing1: number, bearing2: number): number {
    let diff = Math.abs(bearing1 - bearing2);
    if (diff > 180) {
      diff = 360 - diff;
    }
    return diff;
  }

  /**
   * 🚀 OPTIMIZACIÓN INTELIGENTE: Agrega punto al rastro con fusión de colineales
   * - Filtro de distancia mínima (5m) para eliminar ruido
   * - Fusión de puntos colineales (rectas) para optimizar rendimiento
   * - Conserva puntos en curvas para suavidad visual
   *
   * @param newLat Latitud del nuevo punto
   * @param newLng Longitud del nuevo punto
   */
  private addOptimizedPoint(newLat: number, newLng: number): void {
    const traceLatLngs = this.tracePolyline.getLatLngs() as L.LatLng[];

    if (traceLatLngs.length === 0) {
      this.tracePolyline.addLatLng([newLat, newLng]);
      return;
    }

    const lastPoint = traceLatLngs[traceLatLngs.length - 1];

    const distanceToLast = this.calculateDistance(
      lastPoint.lat,
      lastPoint.lng,
      newLat,
      newLng
    );

    if (distanceToLast < this.MIN_POINT_DISTANCE) {
      return;
    }

    if (traceLatLngs.length >= 2) {
      const penultimatePoint = traceLatLngs[traceLatLngs.length - 2];

      const previousBearing = this.calculateBearing(
        penultimatePoint.lat,
        penultimatePoint.lng,
        lastPoint.lat,
        lastPoint.lng
      );

      const newBearing = this.calculateBearing(
        lastPoint.lat,
        lastPoint.lng,
        newLat,
        newLng
      );

      const angleDiff = this.getAngleDifference(previousBearing, newBearing);

      if (angleDiff < this.MAX_ANGLE_DIFFERENCE) {
        traceLatLngs[traceLatLngs.length - 1] = L.latLng(newLat, newLng);
        this.tracePolyline.setLatLngs(traceLatLngs);
        return;
      }
    }

    this.tracePolyline.addLatLng([newLat, newLng]);

    const updatedLatLngs = this.tracePolyline.getLatLngs() as L.LatLng[];
    if (updatedLatLngs.length > this.MAX_TRACE_POINTS) {
      const pointsToRemove = updatedLatLngs.length - this.MAX_TRACE_POINTS;
      const newLatLngs = updatedLatLngs.slice(pointsToRemove);
      this.tracePolyline.setLatLngs(newLatLngs);
    }
  }

  /**
   * 💾 PERSISTENCIA: Guarda el estado actual del vehículo en el servidor
   * Fire-and-forget: No espera respuesta para no bloquear la animación
   */
  private saveCurrentState(): void {
    const telemetryData = {
      vehicleId: this.vehicleId,
      latitude: this.currentPosition.lat,
      longitude: this.currentPosition.lng,
      speed: Math.floor(this.currentSpeed),
      fuelLevel: Math.floor(this.currentFuel)
    };

    this.telemetryService.recordTelemetry(telemetryData).subscribe({
      next: () => {
      },
      error: (err) => {
      }
    });
  }

  /**
   * Verifica el nivel de combustible y simula repostaje si es necesario
   */
  private checkAndRefuel(): void {
    if (this.currentFuel <= 0 && !this.isRefueling) {
      this.isRefueling = true;
      this.vehicleState = 'Repostando';

      this.currentSpeed = 0;
      this.tempSpeed = 0;

      this.updateVehicleTooltip();

      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      this.refuelTimeout = setTimeout(() => {
        this.currentFuel = 100;
        this.tempFuel = 100;

        this.isRefueling = false;
        this.vehicleState = 'Moviéndose';
        this.updateVehicleTooltip();

        this.lastUIUpdateTime = performance.now();
        this.nextUIUpdateDelay = 1000 + Math.random() * 1000;

        if (this.routePoints.length > 0 && this.currentSegmentIndex < this.routePoints.length - 1) {
          this.segmentStartTime = performance.now();
          this.animationFrameId = requestAnimationFrame(this.animateStep);
        } else {
          this.startRouteSimulation();
        }
      }, 3000);
    }
  }

  /**
   * Paso de animación ejecutado en cada frame (usando requestAnimationFrame)
   * Implementa interpolación lineal (LERP) entre punto actual y siguiente
   * Incluye: consumo de combustible, velocidad variable y bucle continuo
   * CON THROTTLE: Velocidad y combustible se actualizan cada 1-2 segundos (aleatorio)
   */
  private animateStep = (): void => {
    if (this.currentFuel <= 0) {
      this.checkAndRefuel();
      return;
    }

    if (this.currentSegmentIndex >= this.routePoints.length - 1) {
      this.animationFrameId = null;

      this.startRouteSimulation();
      return;
    }

    const now = performance.now();
    const elapsed = now - this.segmentStartTime;
    const progress = Math.min(elapsed / this.SEGMENT_DURATION_MS, 1.0);

    const startPoint = this.routePoints[this.currentSegmentIndex];
    const endPoint = this.routePoints[this.currentSegmentIndex + 1];

    const easedProgress = this.easeInOutQuad(progress);
    const interpolatedLat = this.lerp(startPoint.lat, endPoint.lat, easedProgress);
    const interpolatedLng = this.lerp(startPoint.lng, endPoint.lng, easedProgress);

    const distanceTraveled = this.calculateDistance(
      this.previousPosition.lat,
      this.previousPosition.lng,
      interpolatedLat,
      interpolatedLng
    );

    if (distanceTraveled > 0) {
      const fuelConsumed = distanceTraveled * this.FUEL_CONSUMPTION_RATE;
      this.tempFuel = Math.max(0, this.tempFuel - fuelConsumed);
    }

    if (progress < 1.0 && this.vehicleState === 'Moviéndose') {
      this.tempSpeed = 30 + Math.random() * 30;
    } else if (this.vehicleState === 'Detenido') {
      this.tempSpeed = 0;
    }

    const timeSinceLastUIUpdate = now - this.lastUIUpdateTime;

    if (timeSinceLastUIUpdate >= this.nextUIUpdateDelay) {
      this.currentSpeed = Math.floor(this.tempSpeed);
      this.currentFuel = Math.floor(this.tempFuel);

      this.updateVehicleTooltip();

      this.lastUIUpdateTime = now;
      this.nextUIUpdateDelay = 1000 + Math.random() * 1000;

    }

    const timeSinceLastSave = now - this.lastSaveTime;

    if (timeSinceLastSave >= 5000) {
      this.saveCurrentState();
      this.lastSaveTime = now;
    }

    this.vehicleMarker.setLatLng([interpolatedLat, interpolatedLng]);
    this.previousPosition = { lat: interpolatedLat, lng: interpolatedLng };
    this.currentPosition = { lat: interpolatedLat, lng: interpolatedLng };

    this.addOptimizedPoint(interpolatedLat, interpolatedLng);

    if (progress >= 1.0) {
      this.currentSegmentIndex++;
      this.segmentStartTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.animateStep);
  };

  /**
   * Interpolación lineal (LERP) entre dos valores
   * @param start Valor inicial
   * @param end Valor final
   * @param t Progreso (0.0 a 1.0)
   * @returns Valor interpolado
   */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Función de easing (ease-in-out quadratic) para movimiento más natural
   * @param t Progreso lineal (0.0 a 1.0)
   * @returns Progreso con easing aplicado
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
