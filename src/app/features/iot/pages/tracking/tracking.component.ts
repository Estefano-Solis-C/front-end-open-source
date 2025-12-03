import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { TelemetryService } from '../../services/telemetry.service';
import { Telemetry } from '../../models/telemetry.model';

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

  // Propiedades públicas usadas por el template
  renterName: string = 'No disponible';
  currentSpeed: number = 0;
  currentFuel: number = 100;
  vehicleState: 'Moviéndose' | 'Detenido' = 'Detenido';
  get statusColor(): string {
    return (this.vehicleState === 'Moviéndose' || this.currentSpeed > 0) ? '#4CAF50' : '#f44336';
  }

  // Variables para animación suave con interpolación
  private animationFrameId: number | null = null;
  private routePoints: LatLng[] = [];
  private currentSegmentIndex = 0;
  private segmentStartTime = 0;
  private readonly SEGMENT_DURATION_MS = 800; // Duración por segmento (800ms)

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
          <span style="color: #2196F3; font-weight: bold;">${this.currentSpeed} km/h</span>
        </div>
        <div style="margin: 6px 0; font-size: 12px;">
          <strong>⛽ Gasolina:</strong>
          <span style="color: ${this.currentFuel > 20 ? '#4CAF50' : '#f44336'}; font-weight: bold;">
            ${this.currentFuel}%
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
    this.telemetryService.getLatestTelemetry(this.vehicleId).subscribe({
      next: (data) => {
        if (data) {
          // Asignar datos para la tarjeta
          this.renterName = data.renterName ?? 'No disponible';
          this.currentSpeed = Math.round(data.speed);
          this.currentFuel = Math.round(data.fuelLevel);
          this.vehicleState = this.currentSpeed > 0 ? 'Moviéndose' : 'Detenido';

          if (data.latitude && data.longitude) {
            this.currentPosition = { lat: data.latitude, lng: data.longitude };
            this.vehicleMarker.setLatLng(this.currentPosition);
            this.map.setView(this.currentPosition, 15);
            console.log(`📍 [FRONTEND] Vehículo ubicado en: ${this.currentPosition.lat}, ${this.currentPosition.lng}`);

            // 2. Iniciar ruta de prueba (Simulación)
            this.startRouteSimulation();
          }
        }
      }
    });
  }

  private startRouteSimulation(): void {
    const destLat = this.currentPosition.lat + 0.01;
    const destLng = this.currentPosition.lng + 0.01;

    console.log('🔄 [FRONTEND] Solicitando ruta al API...');

    this.telemetryService.getSimulationRoute(
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
          this.animateVehicle(res);
        } else {
          console.error('⚠️ [FRONTEND] La lista de ruta está vacía.');
        }
      },
      error: (err) => {
        console.error('❌ [FRONTEND] Error HTTP al pedir ruta:', err);
      }
    });
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
   * Anima el vehículo con interpolación suave (LERP) entre puntos usando requestAnimationFrame
   * @param routePoints Array de coordenadas de la ruta
   */
  animateVehicle(route: LatLng[]) {
    let index = 0;
    let startTime: number | null = null;
    const duration = 1000; // 1 segundo para ir de un punto a otro

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;

      if (progress < 1) {
        // Calcula punto intermedio
        const startPt = route[index];
        const endPt = route[index + 1];
        const lat = startPt.lat + (endPt.lat - startPt.lat) * progress;
        const lng = startPt.lng + (endPt.lng - startPt.lng) * progress;

        this.vehicleMarker.setLatLng([lat, lng]);
        requestAnimationFrame(animate);
      } else {
        // Segmento terminado, pasar al siguiente
        index++;
        if (index < route.length - 1) {
          startTime = null;
          requestAnimationFrame(animate);
        }
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * Paso de animación ejecutado en cada frame (usando requestAnimationFrame)
   * Implementa interpolación lineal (LERP) entre punto actual y siguiente
   */
  private animateStep = (): void => {
    if (this.currentSegmentIndex >= this.routePoints.length - 1) {
      // Animación completada
      console.log('✅ [FRONTEND] Animación completada');
      this.vehicleState = 'Detenido';
      this.animationFrameId = null;
      this.updateVehicleTooltip(); // Actualizar tooltip al finalizar
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

    // Actualizar posición del marcador
    this.vehicleMarker.setLatLng([interpolatedLat, interpolatedLng]);
    this.currentPosition = { lat: interpolatedLat, lng: interpolatedLng };

    // Si terminó este segmento, pasar al siguiente
    if (progress >= 1.0) {
      this.currentSegmentIndex++;
      this.segmentStartTime = now;

      // Actualizar tooltip cada ciertos segmentos
      if (this.currentSegmentIndex % 5 === 0) {
        this.updateVehicleTooltip();
      }
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
