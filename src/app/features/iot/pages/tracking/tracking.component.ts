import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { TelemetryService } from '../../services/telemetry.service';

interface LatLng {
  lat: number;
  lng: number;
}

type VehicleState = 'Moviéndose' | 'Detenido';

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

  // Posición actual del vehículo
  private currentPosition: LatLng = { lat: -12.0464, lng: -77.0428 }; // Miraflores inicial

  // Datos de la ruta actual
  private currentRoute: LatLng[] = [];
  private currentRouteIndex = 0;

  // Control de animación
  private animationFrameId: number | null = null;
  private lastUpdateTime = 0;
  private stopTimeoutId: number | null = null;

  // Estado del vehículo
  vehicleState: VehicleState = 'Detenido';

  // Información del vehículo
  renterName = 'Juan Pérez';
  currentSpeed = 0;
  currentFuel = 100;

  // Distancia acumulada en el tramo actual (en km)
  private currentLegDistance = 0;

  // Configuración
  private readonly FUEL_CONSUMPTION_PER_KM = 0.5; // 0.5% por km
  private readonly STOP_DURATION_MS = 5000; // 5 segundos
  private readonly LIMA_BOUNDS = {
    minLat: -12.15,
    maxLat: -11.95,
    minLng: -77.10,
    maxLng: -76.95
  };
  private readonly MAX_ROUTE_DISTANCE = 0.02; // ~2km en grados

  // Configuración del icono del vehículo
  private carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097136.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  constructor(
    private telemetryService: TelemetryService
  ) {}

  ngOnInit(): void {
    // Inicializar el mapa después de que la vista esté cargada
    setTimeout(() => {
      this.initializeMap();
      // Auto-arranque: iniciar simulación automáticamente
      this.startNextLeg();
    }, 100);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Inicializa el mapa de Leaflet
   */
  private initializeMap(): void {
    // Crear el mapa centrado en Lima
    this.map = L.map('map', {
      center: [this.currentPosition.lat, this.currentPosition.lng],
      zoom: 14,
      zoomControl: true
    });

    // Agregar capa de tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Inicializar el marcador del vehículo
    this.vehicleMarker = L.marker([this.currentPosition.lat, this.currentPosition.lng], {
      icon: this.carIcon,
      title: 'Vehículo'
    }).addTo(this.map);

    this.updatePopup();
  }

  /**
   * Actualiza el contenido del popup
   */
  private updatePopup(): void {
    this.vehicleMarker.setPopupContent(`
      <div style="text-align: center;">
        <strong>${this.renterName}</strong><br>
        Estado: <span style="font-weight: bold; color: ${this.vehicleState === 'Moviéndose' ? '#FF9800' : '#999'};">${this.vehicleState}</span><br>
        Velocidad: <span style="color: #2196F3; font-weight: bold;">${this.currentSpeed}</span> km/h<br>
        Combustible: <span style="color: ${this.currentFuel > 20 ? '#4CAF50' : '#f44336'}; font-weight: bold;">${this.currentFuel.toFixed(1)}</span>%
      </div>
    `);
  }

  /**
   * FUNCIÓN PRINCIPAL DE CICLO: Inicia el siguiente tramo de la simulación
   */
  private startNextLeg(): void {
    // Verificar si hay combustible suficiente
    if (this.currentFuel <= 0) {
      this.vehicleState = 'Detenido';
      this.currentSpeed = 0;
      this.updatePopup();
      console.log('Simulación terminada: Sin combustible');
      return;
    }

    // Generar un punto de destino aleatorio cercano
    const destination = this.generateRandomDestination();

    // Obtener la ruta desde el servicio
    this.loadRouteAndAnimate(this.currentPosition, destination);
  }

  /**
   * Genera un punto de destino aleatorio dentro de un rango cercano en Lima
   */
  private generateRandomDestination(): LatLng {
    // Generar offset aleatorio (entre -MAX_ROUTE_DISTANCE y +MAX_ROUTE_DISTANCE)
    const latOffset = (Math.random() - 0.5) * 2 * this.MAX_ROUTE_DISTANCE;
    const lngOffset = (Math.random() - 0.5) * 2 * this.MAX_ROUTE_DISTANCE;

    let newLat = this.currentPosition.lat + latOffset;
    let newLng = this.currentPosition.lng + lngOffset;

    // Asegurar que el destino esté dentro de los límites de Lima
    newLat = Math.max(this.LIMA_BOUNDS.minLat, Math.min(this.LIMA_BOUNDS.maxLat, newLat));
    newLng = Math.max(this.LIMA_BOUNDS.minLng, Math.min(this.LIMA_BOUNDS.maxLng, newLng));

    return { lat: newLat, lng: newLng };
  }

  /**
   * Carga la ruta desde el servicio y comienza la animación
   */
  private loadRouteAndAnimate(start: LatLng, end: LatLng): void {
    this.telemetryService.getSimulationRoute(
      start.lat,
      start.lng,
      end.lat,
      end.lng
    ).subscribe({
      next: (response) => {
        if (response.route && response.route.length > 0) {
          // El servicio devuelve un array denso de coordenadas (geometría real de la calle)
          this.currentRoute = response.route;
        } else {
          // Fallback: generar ruta densa simulada
          this.currentRoute = this.generateDenseRoute(start, end);
        }

        // Dibujar la polyline y comenzar animación
        this.drawRouteOnMap();
        this.startMoving();
      },
      error: () => {
        // Fallback: generar ruta densa simulada
        this.currentRoute = this.generateDenseRoute(start, end);
        this.drawRouteOnMap();
        this.startMoving();
      }
    });
  }

  /**
   * Genera una ruta densa simulada (fallback) con curvas realistas
   */
  private generateDenseRoute(start: LatLng, end: LatLng): LatLng[] {
    const route: LatLng[] = [];
    const segments = 50; // Muchos puntos para simular geometría de calle

    for (let i = 0; i <= segments; i++) {
      const ratio = i / segments;

      // Interpolación lineal base
      let lat = start.lat + (end.lat - start.lat) * ratio;
      let lng = start.lng + (end.lng - start.lng) * ratio;

      // Agregar curvas sinusoidales para simular calles reales
      const curveAmplitude = 0.001;
      const curveFrequency = 3;
      lat += Math.sin(ratio * Math.PI * curveFrequency) * curveAmplitude;
      lng += Math.cos(ratio * Math.PI * curveFrequency) * curveAmplitude;

      // Pequeña variación aleatoria
      lat += (Math.random() - 0.5) * 0.0002;
      lng += (Math.random() - 0.5) * 0.0002;

      route.push({ lat, lng });
    }

    return route;
  }

  /**
   * Dibuja la ruta en el mapa usando Polyline
   */
  private drawRouteOnMap(): void {
    // Remover polyline anterior si existe
    if (this.routePolyline) {
      this.routePolyline.remove();
    }

    // Dibujar la nueva polyline usando TODOS los puntos del array
    const latLngs: L.LatLngExpression[] = this.currentRoute.map(coord => [coord.lat, coord.lng]);

    this.routePolyline = L.polyline(latLngs, {
      color: '#2196F3',
      weight: 4,
      opacity: 0.7,
      smoothFactor: 1
    }).addTo(this.map);

    // Ajustar vista para mostrar la ruta (opcional)
    // this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
  }

  /**
   * Comienza el movimiento del vehículo (Estado: Moviéndose)
   */
  private startMoving(): void {
    this.vehicleState = 'Moviéndose';
    this.currentRouteIndex = 0;
    this.currentLegDistance = 0;
    this.currentSpeed = this.getRandomSpeed();
    this.lastUpdateTime = performance.now();

    this.updatePopup();
    this.animate();
  }

  /**
   * Obtiene una velocidad aleatoria realista
   */
  private getRandomSpeed(): number {
    return Math.floor(Math.random() * (60 - 25 + 1)) + 25; // 25-60 km/h
  }



  /**
   * Función principal de animación usando requestAnimationFrame
   */
  private animate = (): void => {
    if (this.vehicleState !== 'Moviéndose') {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;

    // Actualizar cada ~50ms para movimiento suave
    if (deltaTime >= 50) {
      this.updateVehiclePosition();
      this.lastUpdateTime = currentTime;
    }

    // Continuar la animación
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Actualiza la posición del vehículo en el mapa
   * Itera sobre CADA punto del array de la ruta
   */
  private updateVehiclePosition(): void {
    // Verificar si hemos llegado al final de la ruta
    if (this.currentRouteIndex >= this.currentRoute.length) {
      this.onRouteComplete();
      return;
    }

    // Obtener la posición actual de la ruta
    const newPosition = this.currentRoute[this.currentRouteIndex];

    // Calcular distancia recorrida desde el último punto
    if (this.currentRouteIndex > 0) {
      const prevPosition = this.currentRoute[this.currentRouteIndex - 1];
      const distance = this.calculateDistance(prevPosition, newPosition);
      this.currentLegDistance += distance;
    }

    // Actualizar posición del marcador
    this.vehicleMarker.setLatLng([newPosition.lat, newPosition.lng]);
    this.currentPosition = newPosition;

    // Centrar el mapa en el vehículo (suavemente)
    this.map.panTo([newPosition.lat, newPosition.lng], { animate: true, duration: 0.25 });

    // Variar la velocidad ligeramente para realismo
    if (Math.random() < 0.1) { // 10% de probabilidad de cambiar velocidad
      this.currentSpeed = this.getRandomSpeed();
    }

    // Actualizar popup si está abierto
    if (this.vehicleMarker.isPopupOpen()) {
      this.updatePopup();
    }

    this.currentRouteIndex++;
  }

  /**
   * Calcula la distancia entre dos puntos (en km)
   * Fórmula de Haversine simplificada
   */
  private calculateDistance(pos1: LatLng, pos2: LatLng): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(pos2.lat - pos1.lat);
    const dLng = this.toRadians(pos2.lng - pos1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(pos1.lat)) * Math.cos(this.toRadians(pos2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Se ejecuta cuando el vehículo completa una ruta
   * Cambia a estado "Detenido" y espera 5 segundos
   */
  private onRouteComplete(): void {
    // Detener la animación
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cambiar estado a Detenido
    this.vehicleState = 'Detenido';
    this.currentSpeed = 0;

    // Consumir combustible proporcional a la distancia recorrida
    const fuelConsumed = this.currentLegDistance * this.FUEL_CONSUMPTION_PER_KM;
    this.currentFuel = Math.max(0, this.currentFuel - fuelConsumed);
    this.currentFuel = Math.round(this.currentFuel * 100) / 100;

    console.log(`Tramo completado. Distancia: ${this.currentLegDistance.toFixed(2)} km, Combustible consumido: ${fuelConsumed.toFixed(2)}%, Combustible restante: ${this.currentFuel.toFixed(1)}%`);

    this.updatePopup();

    // Remover la polyline actual
    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = null;
    }

    // Esperar 5 segundos y luego reiniciar el ciclo
    this.stopTimeoutId = window.setTimeout(() => {
      // Verificar si hay combustible antes de continuar
      if (this.currentFuel > 0) {
        console.log('Reiniciando ciclo - generando nueva ruta...');
        this.startNextLeg(); // Llamada recursiva para el siguiente tramo
      } else {
        console.log('Simulación terminada: Sin combustible');
        this.vehicleState = 'Detenido';
        this.updatePopup();
      }
    }, this.STOP_DURATION_MS);
  }

  /**
   * Limpia todos los recursos y timeouts
   */
  private cleanup(): void {
    // Cancelar animación
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cancelar timeout de parada
    if (this.stopTimeoutId !== null) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    // Remover mapa
    if (this.map) {
      this.map.remove();
    }
  }
}
