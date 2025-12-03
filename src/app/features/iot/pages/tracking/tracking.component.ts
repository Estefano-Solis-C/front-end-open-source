import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { TelemetryService } from '../../services/telemetry.service';
import { Telemetry } from '../../models/telemetry.model';

interface LatLng { lat: number; lng: number; }

type VehicleState = 'Moviéndose' | 'Detenido';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit, OnDestroy {
  // Mapa y elementos
  private map!: L.Map;
  private vehicleMarker!: L.Marker;
  private routePolyline: L.Polyline | null = null;

  // Estado público para la tarjeta
  renterName: string = 'No disponible';
  vehicleState: VehicleState = 'Detenido';
  currentSpeed: number = 35; // km/h por defecto, puede venir del backend
  currentFuel: number = 100;

  // Color dinámico para el badge de estado en el template
  get statusColor(): string {
    // Verde si está moviéndose (velocidad > 0), rojo si detenido
    return (this.vehicleState === 'Moviéndose' || this.currentSpeed > 0) ? '#4CAF50' : '#f44336';
  }

  // Identificador del vehículo y posición actual
  vehicleId = 0;
  private currentPosition: LatLng = { lat: -12.0464, lng: -77.0428 };

  // Ruta y métricas
  private currentRoute: LatLng[] = [];
  private segmentLengths: number[] = []; // longitudes por segmento (metros)
  private cumulativeLengths: number[] = []; // acumulado (metros)
  private totalRouteLengthMeters = 0;

  // Animación basada en tiempo/distancia
  private animationStartTime = 0;
  private traveledMeters = 0;
  private animationFrameId: number | null = null;
  private stopTimeoutId: number | null = null;

  // Icono del vehículo
  private carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097136.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  constructor(
    private route: ActivatedRoute,
    private telemetryService: TelemetryService
  ) {}

  ngOnInit(): void {
    // Obtener id del vehículo
    const id = this.route.snapshot.paramMap.get('id');
    this.vehicleId = id ? Number(id) : 1;

    // Inicializar mapa y luego cargar datos iniciales reales
    setTimeout(() => {
      this.initializeMap();

      this.telemetryService.getLatestTelemetry(this.vehicleId).subscribe({
        next: (latest: Telemetry) => {
          // Nombre del arrendatario
          this.renterName = latest?.renterName ?? 'No disponible';

          // Posición inicial real
          if (typeof latest?.latitude === 'number' && typeof latest?.longitude === 'number') {
            this.currentPosition = { lat: latest.latitude, lng: latest.longitude };
            this.vehicleMarker.setLatLng([this.currentPosition.lat, this.currentPosition.lng]);
            this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 14);
          }

          // Velocidad inicial si viene del backend
          if (typeof latest?.speed === 'number') {
            this.currentSpeed = latest.speed;
          }

          // Combustible inicial
          if (typeof latest?.fuelLevel === 'number') {
            this.currentFuel = latest.fuelLevel;
          }
        },
        error: () => {
          // Mantener valores por defecto en caso de error
          this.renterName = 'No disponible';
        },
        complete: () => {
          // Iniciar primer tramo desde posición actual a un destino cercano
          this.startNextLeg();
        }
      });
    }, 50);
  }

  ngOnDestroy(): void { this.cleanup(); }

  /**
   * Inicializa Leaflet con mapa base
   */
  private initializeMap(): void {
    this.map = L.map('map', {
      center: [this.currentPosition.lat, this.currentPosition.lng],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Crear marcador con tooltip permanente (equivalente a folium.Tooltip)
    this.vehicleMarker = L.marker([this.currentPosition.lat, this.currentPosition.lng], {
      icon: this.carIcon,
      title: 'Vehículo'
    }).addTo(this.map);

    // Agregar tooltip informativo permanente
    this.updateVehicleTooltip();
  }

  /**
   * Actualiza el tooltip del vehículo con datos en tiempo real
   * Equivalente a folium.Tooltip en Python
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
            ${this.currentFuel.toFixed(1)}%
          </span>
        </div>
        <div style="margin: 6px 0; font-size: 12px;">
          <strong>📊 Estado:</strong>
          <span style="color: ${this.statusColor}; font-weight: bold;">${this.vehicleState}</span>
        </div>
      </div>
    `;

    // Bindear tooltip permanente que se muestra al pasar el mouse
    this.vehicleMarker.bindTooltip(tooltipContent, {
      permanent: false,        // Se muestra al pasar el mouse
      direction: 'top',        // Aparece arriba del marcador
      offset: [0, -20],        // Offset para no cubrir el icono
      className: 'vehicle-tooltip',
      opacity: 0.95
    });
  }

  // Genera siguiente tramo: obtiene ruta y arranca animación temporal
  private startNextLeg(): void {
    if (this.currentFuel <= 0) {
      this.vehicleState = 'Detenido';
      return;
    }

    const destination = this.generateRandomDestination(this.currentPosition);

    this.telemetryService.getSimulationRoute(
      this.currentPosition.lat,
      this.currentPosition.lng,
      destination.lat,
      destination.lng
    ).subscribe({
      next: (response) => {
        this.setRoute(response.route?.length ? response.route : this.generateDenseRoute(this.currentPosition, destination));
        this.vehicleState = 'Moviéndose';
        this.beginTimeBasedAnimation();
      },
      error: () => {
        this.setRoute(this.generateDenseRoute(this.currentPosition, destination));
        this.vehicleState = 'Moviéndose';
        this.beginTimeBasedAnimation();
      }
    });
  }

  // Configura ruta y dibuja polyline
  private setRoute(route: LatLng[]): void {
    this.currentRoute = route;
    this.drawRouteOnMap(route);
    this.computeRouteMetrics(route);
  }

  /**
   * Dibuja la ruta en el mapa con estilo Folium moderno
   * Equivalente a folium.GeoJson en Python
   */
  private drawRouteOnMap(route: LatLng[]): void {
    if (this.routePolyline) this.routePolyline.remove();

    const latLngs: L.LatLngExpression[] = route.map(p => [p.lat, p.lng]);

    // Estilo Folium: línea azul moderna con grosor 5px
    this.routePolyline = L.polyline(latLngs, {
      color: '#2196F3',      // Azul moderno
      weight: 5,             // Grosor 5px (como Folium)
      opacity: 0.9,          // Alta visibilidad
      smoothFactor: 1,       // Sin simplificación para rutas densificadas
      lineCap: 'round',      // Extremos redondeados
      lineJoin: 'round'      // Uniones redondeadas
    }).addTo(this.map);
  }

  // Precalcula longitudes de segmentos y acumulado (metros)
  private computeRouteMetrics(route: LatLng[]): void {
    this.segmentLengths = [];
    this.cumulativeLengths = [0];
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const d = this.haversineMeters(route[i], route[i + 1]);
      this.segmentLengths.push(d);
      total += d;
      this.cumulativeLengths.push(total);
    }
    this.totalRouteLengthMeters = total;
  }

  /**
   * Inicia animación basada en tiempo y velocidad
   * Equivalente a animar el marcador sobre la polyline en Folium
   */
  private beginTimeBasedAnimation(): void {
    this.animationStartTime = performance.now();
    this.traveledMeters = 0;

    // Actualizar tooltip al iniciar
    this.updateVehicleTooltip();

    // Iniciar loop de animación fluida
    this.animateCarAlongPath();
  }

  /**
   * Animación suave del vehículo sobre la polyline densificada
   * Mueve el coche a lo largo de la ruta punto por punto, siguiendo curvas
   */
  private animateCarAlongPath = (): void => {
    if (this.vehicleState !== 'Moviéndose' || this.currentRoute.length < 2) return;

    const now = performance.now();
    const elapsedMs = now - this.animationStartTime;
    const speedMps = (this.currentSpeed * 1000) / 3600; // km/h → m/s
    const targetTraveled = elapsedMs / 1000 * speedMps; // metros esperados por tiempo

    // Clamp: no exceder total
    this.traveledMeters = Math.min(targetTraveled, this.totalRouteLengthMeters);

    // Obtener punto exacto en la ruta a esa distancia (interpolación sobre polyline)
    const point = this.getPointAtDistance(this.traveledMeters);

    // Actualizar marcador y posición actual (el coche "gira" en las curvas)
    this.vehicleMarker.setLatLng([point.lat, point.lng]);
    this.currentPosition = point;

    // Consumo de combustible proporcional a distancia
    const consumedPercent = (this.traveledMeters / 1000) * 0.5; // 0.5% por km
    this.currentFuel = Math.max(0, 100 - consumedPercent);

    // Actualizar tooltip con datos en tiempo real cada 10 frames (~167ms)
    if (Math.floor(this.traveledMeters) % 10 === 0) {
      this.updateVehicleTooltip();
    }

    // Continuar animando si no terminó (movimiento fluido sobre la polyline)
    if (this.traveledMeters < this.totalRouteLengthMeters) {
      this.animationFrameId = requestAnimationFrame(this.animateCarAlongPath);
      return;
    }

    // Al finalizar tramo
    this.onLegComplete();
  };

  // Encuentra el punto (lat,lng) en la polyline a una distancia acumulada dada (metros)
  private getPointAtDistance(distanceMeters: number): LatLng {
    if (distanceMeters <= 0) return this.currentRoute[0];
    if (distanceMeters >= this.totalRouteLengthMeters) return this.currentRoute[this.currentRoute.length - 1];

    // Buscar el segmento que contiene la distancia
    let segIndex = 0;
    while (segIndex < this.segmentLengths.length && this.cumulativeLengths[segIndex + 1] < distanceMeters) {
      segIndex++;
    }

    const segStart = this.currentRoute[segIndex];
    const segEnd = this.currentRoute[segIndex + 1];
    const segStartDist = this.cumulativeLengths[segIndex];
    const segLen = this.segmentLengths[segIndex];
    const withinSeg = distanceMeters - segStartDist;
    const ratio = segLen > 0 ? withinSeg / segLen : 0;

    // Interpolación lineal dentro del segmento
    return {
      lat: segStart.lat + (segEnd.lat - segStart.lat) * ratio,
      lng: segStart.lng + (segEnd.lng - segStart.lng) * ratio
    };
  }

  // Al completar un tramo: detener, esperar 5s, reiniciar si hay combustible
  private onLegComplete(): void {
    if (this.animationFrameId !== null) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
    this.vehicleState = 'Detenido';

    // Esperar 5 segundos y arrancar próximo tramo si hay combustible
    this.stopTimeoutId = window.setTimeout(() => {
      if (this.currentFuel > 0) {
        this.startNextLeg();
      }
    }, 5000);
  }

  // Genera destino cercano dentro de Lima
  private generateRandomDestination(origin: LatLng): LatLng {
    const maxOffsetDeg = 0.02; // ~2 km aprox
    let lat = origin.lat + (Math.random() - 0.5) * 2 * maxOffsetDeg;
    let lng = origin.lng + (Math.random() - 0.5) * 2 * maxOffsetDeg;
    // Limites aproximados de Lima
    const bounds = { minLat: -12.15, maxLat: -11.95, minLng: -77.10, maxLng: -76.95 };
    lat = Math.max(bounds.minLat, Math.min(bounds.maxLat, lat));
    lng = Math.max(bounds.minLng, Math.min(bounds.maxLng, lng));
    return { lat, lng };
  }

  // Fallback: ruta densa con pequeñas curvaturas
  private generateDenseRoute(start: LatLng, end: LatLng): LatLng[] {
    const route: LatLng[] = [];
    const segments = 80;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let lat = start.lat + (end.lat - start.lat) * t;
      let lng = start.lng + (end.lng - start.lng) * t;
      const amp = 0.001; const freq = 3;
      lat += Math.sin(t * Math.PI * freq) * amp;
      lng += Math.cos(t * Math.PI * freq) * amp;
      route.push({ lat, lng });
    }
    return route;
  }

  // Haversine en metros
  private haversineMeters(a: LatLng, b: LatLng): number {
    const R = 6371000; // m
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }
  private toRad(deg: number): number { return deg * Math.PI / 180; }

  // Limpieza
  private cleanup(): void {
    if (this.animationFrameId !== null) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
    if (this.stopTimeoutId !== null) { clearTimeout(this.stopTimeoutId); this.stopTimeoutId = null; }
    if (this.map) { this.map.remove(); }
  }
}
