import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { TelemetryService } from '../../services/telemetry.service';
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
  private routePolyline: L.Polyline | null = null;
  private carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097136.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  vehicleId = 0;
  currentPosition: LatLng = { lat: -12.0464, lng: -77.0428 };
  private previousPosition: LatLng = { lat: -12.0464, lng: -77.0428 };

  // Propiedades públicas usadas por el template
  renterName: string = 'No disponible';
  currentSpeed: number = 0;
  currentFuel: number = 100;
  vehicleState: 'Moviéndose' | 'Detenido' | 'Repostando' = 'Detenido';
  get statusColor(): string {
    if (this.vehicleState === 'Repostando') return '#FF9800';
    return (this.vehicleState === 'Moviéndose' || this.currentSpeed > 0) ? '#4CAF50' : '#f44336';
  }

  // Variables para animación suave con interpolación
  private animationFrameId: number | null = null;
  private routePoints: LatLng[] = [];
  private currentSegmentIndex = 0;
  private segmentStartTime = 0;
  private readonly SEGMENT_DURATION_MS = 800; // Duración por segmento (800ms)

  // Variables para simulación continua
  private subscriptions: Subscription[] = [];
  private refuelTimeout: any = null;
  private isRefueling = false;
  private readonly FUEL_CONSUMPTION_RATE = 0.02; // % por km
  private readonly LIMA_BOUNDS = {
    latMin: -12.13,
    latMax: -12.04,
    lngMin: -77.08,
    lngMax: -76.95
  };

  // Variables para throttle de actualización de UI (velocidad/combustible)
  private lastUIUpdateTime = 0;
  private nextUIUpdateDelay = 1000; // Intervalo aleatorio entre 1000-2000ms
  private tempSpeed = 0; // Velocidad temporal calculada en cada frame
  private tempFuel = 100; // Combustible temporal calculado en cada frame

  constructor(
    private route: ActivatedRoute,
    private telemetryService: TelemetryService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.vehicleId = id ? Number(id) : 1;

    setTimeout(() => {
      this.initializeMap();
      this.loadInitialData();
    }, 100);
  }

  ngOnDestroy(): void {
    // Cancelar animación si está en curso
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Limpiar timeout de repostaje
    if (this.refuelTimeout) {
      clearTimeout(this.refuelTimeout);
      this.refuelTimeout = null;
    }

    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    if (this.map) this.map.remove();
  }

  private initializeMap(): void {
    console.log('🗺️ [FRONTEND] Inicializando mapa...');
    this.map = L.map('map').setView([this.currentPosition.lat, this.currentPosition.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.vehicleMarker = L.marker([this.currentPosition.lat, this.currentPosition.lng], {
      icon: this.carIcon
    }).addTo(this.map);

    // Agregar tooltip informativo con formato correcto
    this.updateVehicleTooltip();
  }

  /**
   * Actualiza el tooltip del vehículo con valores formateados (números enteros)
   */
  private updateVehicleTooltip(): void {
    const tooltipContent = `
      <div style="font-family: Arial, sans-serif; padding: 8px; min-width: 180px;">
        <h4 style="margin: 0 0 8px 0; color: #1976D2; font-size: 14px; border-bottom: 2px solid #2196F3; padding-bottom: 4px;">
          🚗 Vehículo ${this.vehicleId}
        </h4>
        <div style="margin: 6px 0; font-size: 12px;">
          <strong>👤 Conductor:</strong><br/>
          <span style="color: #333;">${this.renterName}</span>
        </div>
        <div style="margin: 6px 0; font-size: 12px;">
          <strong>🚀 Velocidad:</strong>
          <span style="color: #2196F3; font-weight: bold;">${Math.round(this.currentSpeed)} km/h</span>
        </div>
        <div style="margin: 6px 0; font-size: 12px;">
          <strong>⛽ Gasolina:</strong>
          <span style="color: ${this.currentFuel > 20 ? '#4CAF50' : '#f44336'}; font-weight: bold;">
            ${Math.round(this.currentFuel)}%
          </span>
        </div>
        <div style="margin: 6px 0; font-size: 12px;">
          <strong>📊 Estado:</strong>
          <span style="color: ${this.statusColor}; font-weight: bold;">${this.vehicleState}</span>
        </div>
      </div>
    `;

    this.vehicleMarker.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      offset: [0, -20],
      className: 'vehicle-tooltip',
      opacity: 0.95
    });
  }

  private loadInitialData(): void {
    // 1. Obtener última posición
    const sub = this.telemetryService.getLatestTelemetry(this.vehicleId).subscribe({
      next: (data) => {
        if (data) {
          // Asignar datos para la tarjeta
          this.renterName = data.renterName ?? 'No disponible';

          // ✅ REDONDEO A ENTERO (sin decimales) - Valores iniciales
          this.currentSpeed = Math.floor(data.speed);
          this.currentFuel = Math.floor(data.fuelLevel);

          // Inicializar valores temporales con los mismos valores
          this.tempSpeed = this.currentSpeed;
          this.tempFuel = this.currentFuel;

          this.vehicleState = this.currentSpeed > 0 ? 'Moviéndose' : 'Detenido';

          if (data.latitude && data.longitude) {
            this.currentPosition = { lat: data.latitude, lng: data.longitude };
            this.previousPosition = { ...this.currentPosition };
            this.vehicleMarker.setLatLng(this.currentPosition);
            this.map.setView(this.currentPosition, 15);
            console.log(`📍 [FRONTEND] Vehículo ubicado en: ${this.currentPosition.lat}, ${this.currentPosition.lng}`);

            // Inicializar timer de actualización de UI
            this.lastUIUpdateTime = performance.now();
            this.nextUIUpdateDelay = 1000 + Math.random() * 1000; // 1-2 segundos

            // 2. Iniciar ruta de prueba (Simulación)
            this.startRouteSimulation();
          }
        }
      }
    });
    this.subscriptions.push(sub);
  }

  private startRouteSimulation(): void {
    // Generar destino aleatorio dentro de los límites de Lima
    const destLat = this.LIMA_BOUNDS.latMin + Math.random() * (this.LIMA_BOUNDS.latMax - this.LIMA_BOUNDS.latMin);
    const destLng = this.LIMA_BOUNDS.lngMin + Math.random() * (this.LIMA_BOUNDS.lngMax - this.LIMA_BOUNDS.lngMin);

    console.log(`🔄 [FRONTEND] Solicitando nueva ruta desde (${this.currentPosition.lat.toFixed(4)}, ${this.currentPosition.lng.toFixed(4)}) hacia (${destLat.toFixed(4)}, ${destLng.toFixed(4)})...`);

    const sub = this.telemetryService.getSimulationRoute(
      this.currentPosition.lat,
      this.currentPosition.lng,
      destLat,
      destLng
    ).subscribe({
      next: (res) => {
        console.log('📦 [FRONTEND] Respuesta del API recibida (Array directo):', res);

        if (res && res.length > 0) {
          console.log(`✅ [FRONTEND] Ruta válida con ${res.length} puntos.`);
          this.drawRoute(res);
          this.routePoints = res;
          this.currentSegmentIndex = 0;
          this.segmentStartTime = performance.now();
          this.vehicleState = 'Moviéndose';
          this.updateVehicleTooltip();

          // Iniciar animación si no está corriendo
          if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(this.animateStep);
          }
        } else {
          console.error('⚠️ [FRONTEND] La lista de ruta está vacía.');
        }
      },
      error: (err) => {
        console.error('❌ [FRONTEND] Error HTTP al pedir ruta:', err);
        // Reintentar después de 5 segundos
        setTimeout(() => this.startRouteSimulation(), 5000);
      }
    });
    this.subscriptions.push(sub);
  }

  private drawRoute(routePoints: LatLng[]): void {
    if (this.routePolyline) this.routePolyline.remove();

    // Convertir a formato Leaflet [lat, lng]
    const latLngs = routePoints.map(p => [p.lat, p.lng] as [number, number]);

    this.routePolyline = L.polyline(latLngs, {
      color: 'blue',
      weight: 4,
      opacity: 0.7
    }).addTo(this.map);

    // Ajustar mapa para ver toda la ruta
    this.map.fitBounds(this.routePolyline.getBounds());
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
    const R = 6371; // Radio de la Tierra en km
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
   * Verifica el nivel de combustible y simula repostaje si es necesario
   */
  private checkAndRefuel(): void {
    if (this.currentFuel <= 0 && !this.isRefueling) {
      console.log('⛽ [FRONTEND] Combustible agotado. Iniciando repostaje...');
      this.isRefueling = true;
      this.vehicleState = 'Repostando';

      // ✅ REDONDEO A ENTERO (sin decimales)
      this.currentSpeed = 0;
      this.tempSpeed = 0;

      this.updateVehicleTooltip();

      // Detener animación actual
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      // Simular repostaje de 3 segundos
      this.refuelTimeout = setTimeout(() => {
        // ✅ REDONDEO A ENTERO (sin decimales) - Recargar al 100%
        this.currentFuel = 100;
        this.tempFuel = 100;

        this.isRefueling = false;
        this.vehicleState = 'Moviéndose';
        console.log('✅ [FRONTEND] Repostaje completado. Continuando ruta...');
        this.updateVehicleTooltip();

        // Resetear timer de UI para actualización inmediata
        this.lastUIUpdateTime = performance.now();
        this.nextUIUpdateDelay = 1000 + Math.random() * 1000;

        // Reiniciar animación
        if (this.routePoints.length > 0 && this.currentSegmentIndex < this.routePoints.length - 1) {
          this.segmentStartTime = performance.now();
          this.animationFrameId = requestAnimationFrame(this.animateStep);
        } else {
          // Si se acabó la ruta durante el repostaje, solicitar nueva ruta
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
    // Verificar si hay combustible
    if (this.currentFuel <= 0) {
      this.checkAndRefuel();
      return;
    }

    // Verificar si terminó la ruta actual
    if (this.currentSegmentIndex >= this.routePoints.length - 1) {
      console.log('✅ [FRONTEND] Ruta completada. Generando nueva ruta...');
      this.animationFrameId = null;

      // Solicitar nueva ruta automáticamente
      this.startRouteSimulation();
      return;
    }

    const now = performance.now();
    const elapsed = now - this.segmentStartTime;
    const progress = Math.min(elapsed / this.SEGMENT_DURATION_MS, 1.0);

    // Obtener punto actual y siguiente
    const startPoint = this.routePoints[this.currentSegmentIndex];
    const endPoint = this.routePoints[this.currentSegmentIndex + 1];

    // Interpolación lineal (LERP) con easing suave
    const easedProgress = this.easeInOutQuad(progress);
    const interpolatedLat = this.lerp(startPoint.lat, endPoint.lat, easedProgress);
    const interpolatedLng = this.lerp(startPoint.lng, endPoint.lng, easedProgress);

    // Calcular distancia recorrida en este frame
    const distanceTraveled = this.calculateDistance(
      this.previousPosition.lat,
      this.previousPosition.lng,
      interpolatedLat,
      interpolatedLng
    );

    // ========== ACTUALIZACIÓN CONTINUA DE VALORES TEMPORALES ==========
    // (El marcador se mueve suave en cada frame, pero los números NO se muestran aún)

    // Consumir combustible proporcionalmente a la distancia (valor temporal)
    if (distanceTraveled > 0) {
      const fuelConsumed = distanceTraveled * this.FUEL_CONSUMPTION_RATE;
      this.tempFuel = Math.max(0, this.tempFuel - fuelConsumed);
    }

    // Calcular velocidad variable (30-60 km/h) - valor temporal
    if (progress < 1.0 && this.vehicleState === 'Moviéndose') {
      this.tempSpeed = 30 + Math.random() * 30; // Entre 30 y 60 km/h
    } else if (this.vehicleState === 'Detenido') {
      this.tempSpeed = 0;
    }

    // ========== THROTTLE: ACTUALIZAR UI SOLO CADA 1-2 SEGUNDOS ==========
    const timeSinceLastUIUpdate = now - this.lastUIUpdateTime;

    if (timeSinceLastUIUpdate >= this.nextUIUpdateDelay) {
      // ✅ APLICAR REDONDEO A ENTEROS (sin decimales)
      this.currentSpeed = Math.floor(this.tempSpeed);
      this.currentFuel = Math.floor(this.tempFuel);

      // Actualizar tooltip con los nuevos valores
      this.updateVehicleTooltip();

      // Resetear timer y generar nuevo delay aleatorio entre 1000-2000ms
      this.lastUIUpdateTime = now;
      this.nextUIUpdateDelay = 1000 + Math.random() * 1000; // 1-2 segundos

      console.log(`🔄 [UI UPDATE] Velocidad: ${this.currentSpeed} km/h | Combustible: ${this.currentFuel}%`);
    }

    // ========== ACTUALIZAR POSICIÓN DEL MARCADOR (SUAVE EN CADA FRAME) ==========
    this.vehicleMarker.setLatLng([interpolatedLat, interpolatedLng]);
    this.previousPosition = { lat: interpolatedLat, lng: interpolatedLng };
    this.currentPosition = { lat: interpolatedLat, lng: interpolatedLng };

    // Si terminó este segmento, pasar al siguiente
    if (progress >= 1.0) {
      this.currentSegmentIndex++;
      this.segmentStartTime = now;
    }

    // Continuar animación
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
