import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { TelemetryService } from '../../services/telemetry.service';
import { Telemetry } from '../../models/telemetry.model';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface LatLng {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit, OnDestroy {
  // Propiedades del mapa
  private map!: L.Map;
  private vehicleMarker!: L.Marker;
  private routePolyline: L.Polyline | null = null;

  // Datos de telemetría
  telemetry: Telemetry | null = null;
  vehicleId: number = 0;

  // Propiedades públicas para el template
  renterName: string = 'No disponible';
  vehicleState: string = 'SIN DATOS';
  currentSpeed: number = 0;
  currentFuel: number = 100;

  // Interpolación de posición
  private previousPosition: LatLng | null = null;
  private targetPosition: LatLng | null = null;
  private interpolationStartTime: number = 0;
  private interpolationDuration: number = 5000; // 5 segundos
  private animationFrameId: number | null = null;

  // Suscripciones
  private telemetrySubscription: Subscription | null = null;

  // Estado del vehículo (calculado)
  get vehicleStatus(): string {
    if (!this.telemetry) return 'SIN DATOS';
    return this.telemetry.speed > 0 ? 'MOVIÉNDOSE' : 'DETENIDO';
  }

  get statusColor(): string {
    if (!this.telemetry) return '#999';
    return this.telemetry.speed > 0 ? '#4CAF50' : '#f44336';
  }

  // Iconos personalizados
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
    // Obtener el vehicleId de la ruta
    const id = this.route.snapshot.paramMap.get('id');
    this.vehicleId = id ? Number(id) : 1;

    // Inicializar el mapa
    setTimeout(() => {
      this.initializeMap();

      // Obtener el renterName real antes de iniciar la simulación/polling
      this.telemetryService.getLatestTelemetry(this.vehicleId).subscribe({
        next: (latest) => {
          if (latest && latest.renterName) {
            this.renterName = latest.renterName;
          } else {
            this.renterName = 'No disponible';
          }
        },
        error: () => {
          // En caso de error, mantener valor por defecto
          this.renterName = 'No disponible';
        },
        complete: () => {
          // Iniciar el polling/animación después de setear el nombre
          this.startTelemetryPolling();
        }
      });
    }, 100);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Inicializa el mapa de Leaflet
   */
  private initializeMap(): void {
    // Coordenadas iniciales en Lima, Perú
    const initialLat = -12.0464;
    const initialLng = -77.0428;

    // Crear el mapa centrado en Lima
    this.map = L.map('map', {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true
    });

    // Agregar capa de tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Inicializar el marcador del vehículo en la posición inicial
    this.vehicleMarker = L.marker([initialLat, initialLng], {
      icon: this.carIcon,
      title: 'Vehículo'
    }).addTo(this.map);

    this.vehicleMarker.bindPopup('Esperando datos de telemetría...');
  }

  /**
   * Inicia el polling de datos de telemetría cada 5 segundos
   */
  private startTelemetryPolling(): void {
    // Primera carga inmediata
    this.loadTelemetryData();

    // Polling cada 5 segundos
    this.telemetrySubscription = interval(5000)
      .pipe(
        switchMap(() => this.telemetryService.getTelemetryByVehicleId(this.vehicleId))
      )
      .subscribe({
        next: (dataArray) => {
          if (Array.isArray(dataArray) && dataArray.length > 0) {
            this.updateTelemetryData(dataArray[0]);
          }
        },
        error: (error) => {
          console.error('Error al obtener datos de telemetría:', error);
        }
      });
  }

  /**
   * Carga los datos de telemetría por primera vez
   */
  private loadTelemetryData(): void {
    this.telemetryService.getTelemetryByVehicleId(this.vehicleId).subscribe({
      next: (dataArray) => {
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const data = dataArray[0];

          // Primera carga: establecer posición directamente sin interpolación
          this.telemetry = data;
          this.previousPosition = { lat: data.latitude, lng: data.longitude };
          this.targetPosition = { lat: data.latitude, lng: data.longitude };

          // Inicializar propiedades públicas para el template
          this.renterName = data.renterName || 'No disponible';
          this.currentSpeed = data.speed;
          this.currentFuel = data.fuelLevel;
          this.vehicleState = data.speed > 0 ? 'MOVIÉNDOSE' : 'DETENIDO';

          // Actualizar posición del marcador
          this.vehicleMarker.setLatLng([data.latitude, data.longitude]);
          this.map.setView([data.latitude, data.longitude], 14);

          // Dibujar ruta planificada si existe
          if (data.plannedRoute && data.plannedRoute.length > 0) {
            this.drawPlannedRoute(data.plannedRoute);
          }

          // Actualizar popup
          this.updateMarkerPopup();
        }
      },
      error: (error) => {
        console.error('Error al cargar datos iniciales:', error);
      }
    });
  }

  /**
   * Actualiza los datos de telemetría con interpolación suave
   */
  private updateTelemetryData(newData: Telemetry): void {
    // Guardar posición anterior
    if (this.telemetry) {
      this.previousPosition = {
        lat: this.telemetry.latitude,
        lng: this.telemetry.longitude
      };
    }

    // Actualizar datos de telemetría
    this.telemetry = newData;

    // Actualizar propiedades públicas para el template
    this.renterName = newData.renterName || 'No disponible';
    this.currentSpeed = newData.speed;
    this.currentFuel = newData.fuelLevel;
    this.vehicleState = newData.speed > 0 ? 'MOVIÉNDOSE' : 'DETENIDO';

    // Establecer nueva posición objetivo
    this.targetPosition = {
      lat: newData.latitude,
      lng: newData.longitude
    };

    // Iniciar interpolación
    this.interpolationStartTime = performance.now();
    this.startInterpolation();

    // Actualizar ruta planificada si existe
    if (newData.plannedRoute && newData.plannedRoute.length > 0) {
      this.drawPlannedRoute(newData.plannedRoute);
    }

    // Actualizar popup
    this.updateMarkerPopup();
  }

  /**
   * Dibuja la ruta planificada en el mapa
   */
  private drawPlannedRoute(route: Array<{ lat: number; lng: number }>): void {
    // Remover polyline anterior si existe
    if (this.routePolyline) {
      this.routePolyline.remove();
    }

    // Convertir las coordenadas al formato de Leaflet
    const latLngs: L.LatLngExpression[] = route.map(coord => [coord.lat, coord.lng]);

    // Crear y agregar la polyline azul
    this.routePolyline = L.polyline(latLngs, {
      color: '#2196F3',
      weight: 4,
      opacity: 0.7,
      smoothFactor: 1
    }).addTo(this.map);

    // Ajustar el mapa para mostrar toda la ruta (opcional)
    // this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
  }

  /**
   * Inicia la animación de interpolación
   */
  private startInterpolation(): void {
    if (!this.previousPosition || !this.targetPosition) {
      return;
    }

    // Cancelar animación anterior si existe
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Iniciar el loop de animación
    this.interpolate();
  }

  /**
   * Función de interpolación que se ejecuta en cada frame
   */
  private interpolate = (): void => {
    if (!this.previousPosition || !this.targetPosition) {
      return;
    }

    const currentTime = performance.now();
    const elapsed = currentTime - this.interpolationStartTime;
    const progress = Math.min(elapsed / this.interpolationDuration, 1.0);

    // Función de easing (ease-in-out) para un movimiento más natural
    const easedProgress = this.easeInOutCubic(progress);

    // Calcular posición interpolada
    const interpolatedLat = this.previousPosition.lat +
      (this.targetPosition.lat - this.previousPosition.lat) * easedProgress;
    const interpolatedLng = this.previousPosition.lng +
      (this.targetPosition.lng - this.previousPosition.lng) * easedProgress;

    // Actualizar posición del marcador
    this.vehicleMarker.setLatLng([interpolatedLat, interpolatedLng]);

    // Centrar el mapa en el vehículo suavemente
    this.map.panTo([interpolatedLat, interpolatedLng], {
      animate: true,
      duration: 0.1
    });

    // Continuar interpolando si no hemos llegado al final
    if (progress < 1.0) {
      this.animationFrameId = requestAnimationFrame(this.interpolate);
    } else {
      this.animationFrameId = null;
    }
  };

  /**
   * Función de easing para un movimiento más suave
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Actualiza el contenido del popup del marcador
   */
  private updateMarkerPopup(): void {
    if (!this.telemetry) return;

    const renterName = this.telemetry.renterName || 'No disponible';
    const statusColor = this.statusColor;
    const status = this.vehicleStatus;

    this.vehicleMarker.setPopupContent(`
      <div style="text-align: center; font-family: Arial, sans-serif;">
        <strong style="font-size: 14px;">${renterName}</strong><br>
        <div style="margin-top: 8px;">
          <span style="color: ${statusColor}; font-weight: bold; font-size: 12px;">
            ● ${status}
          </span>
        </div>
        <div style="margin-top: 8px; font-size: 12px;">
          <span style="color: #2196F3;">🚀 ${this.telemetry.speed} km/h</span><br>
          <span style="color: ${this.telemetry.fuelLevel > 20 ? '#4CAF50' : '#f44336'};">
            ⛽ ${this.telemetry.fuelLevel}%
          </span>
        </div>
      </div>
    `);
  }

  /**
   * Limpia todos los recursos
   */
  private cleanup(): void {
    // Cancelar animación
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cancelar suscripción de polling
    if (this.telemetrySubscription) {
      this.telemetrySubscription.unsubscribe();
      this.telemetrySubscription = null;
    }

    // Remover mapa
    if (this.map) {
      this.map.remove();
    }
  }
}
