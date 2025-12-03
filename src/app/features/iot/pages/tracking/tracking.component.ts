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
  // Coordenadas por defecto (Lima)
  currentPosition: LatLng = { lat: -12.0464, lng: -77.0428 };

  // Propiedades públicas usadas por el template
  renterName: string = 'No disponible';
  currentSpeed: number = 0;
  currentFuel: number = 100;
  vehicleState: 'Moviéndose' | 'Detenido' = 'Detenido';
  get statusColor(): string {
    return (this.vehicleState === 'Moviéndose' || this.currentSpeed > 0) ? '#4CAF50' : '#f44336';
  }

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
  }

  private loadInitialData(): void {
    // 1. Obtener última posición
    this.telemetryService.getLatestTelemetry(this.vehicleId).subscribe({
      next: (data) => {
        if (data) {
          // Asignar datos para la tarjeta
          this.renterName = data.renterName ?? 'No disponible';
          this.currentSpeed = data.speed;
          this.currentFuel = data.fuelLevel;
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

  private animateVehicle(routePoints: LatLng[]): void {
    console.log('🚗 [FRONTEND] Iniciando animación simple...');
    let index = 0;

    const move = () => {
      if (index >= routePoints.length) return;

      const point = routePoints[index];
      this.vehicleMarker.setLatLng([point.lat, point.lng]);

      index++;
      // Animación simple a 100ms por punto
      setTimeout(move, 100);
    };

    move();
  }
}
