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
  private tracePolyline!: L.Polyline; // Rastro persistente del recorrido (snake effect)
  private readonly MAX_TRACE_POINTS = 5000; // Límite para optimización de rendimiento
  private readonly MIN_POINT_DISTANCE = 0.005; // 5 metros en km (filtro de ruido)
  private readonly MAX_ANGLE_DIFFERENCE = 5; // Grados máximos para considerar colineal
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

  // Variable para persistencia de sesión (guardado automático cada 5s)
  private lastSaveTime = 0;

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

    // ✅ Inicializar rastro persistente (snake effect) - SE CREA UNA SOLA VEZ
    this.tracePolyline = L.polyline([], {
      color: '#1976D2',        // Azul fuerte distintivo
      weight: 4,               // Grosor visible
      opacity: 0.8,            // Semi-transparente para elegancia
      smoothFactor: 1          // Suavizado de línea
    }).addTo(this.map);

    console.log('🐍 [FRONTEND] Rastro persistente (snake effect) inicializado');

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
      console.log('📚 [RESTAURACIÓN] Cargando historial del vehículo...');

      const sub = this.telemetryService.getTelemetryByVehicleId(this.vehicleId).subscribe({
        next: (historyData) => {
          if (!historyData || historyData.length === 0) {
            console.log('📚 [RESTAURACIÓN] No hay historial previo para este vehículo');
            resolve({ restored: false });
            return;
          }

          // Ordenar por timestamp (más antiguo primero) para reconstruir el camino correctamente
          const sortedHistory = historyData.sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return dateA - dateB;
          });

          console.log(`📚 [RESTAURACIÓN] ${sortedHistory.length} puntos encontrados en el historial`);

          // Reconstruir rastro usando el mismo método optimizado
          let reconstructedPoints = 0;
          sortedHistory.forEach((telemetry) => {
            if (telemetry.latitude && telemetry.longitude) {
              // Usar addOptimizedPoint para mantener la misma simplificación
              this.addOptimizedPoint(telemetry.latitude, telemetry.longitude);
              reconstructedPoints++;
            }
          });

          console.log(`✅ [RESTAURACIÓN] Rastro reconstruido con ${reconstructedPoints} puntos (optimizados)`);

          // Obtener última telemetría para restaurar estado completo
          const lastTelemetry = sortedHistory[sortedHistory.length - 1];

          if (lastTelemetry.latitude && lastTelemetry.longitude) {
            const lastPosition: LatLng = {
              lat: lastTelemetry.latitude,
              lng: lastTelemetry.longitude
            };

            // Actualizar posición del vehículo
            this.currentPosition = lastPosition;
            this.previousPosition = { ...this.currentPosition };
            this.vehicleMarker.setLatLng(this.currentPosition);

            // Restaurar velocidad y combustible
            const lastSpeed = Math.floor(lastTelemetry.speed || 0);
            const lastFuel = Math.floor(lastTelemetry.fuelLevel || 100);

            // Centrar mapa en la última posición
            this.map.setView(this.currentPosition, 15);

            console.log(`📍 [RESTAURACIÓN] Vehículo posicionado en última ubicación: (${this.currentPosition.lat.toFixed(4)}, ${this.currentPosition.lng.toFixed(4)})`);
            console.log(`⚡ [RESTAURACIÓN] Velocidad: ${lastSpeed} km/h | Combustible: ${lastFuel}%`);

            // Mostrar estadísticas del rastro
            const traceLatLngs = this.tracePolyline.getLatLngs() as L.LatLng[];
            console.log(`📊 [RESTAURACIÓN] Puntos en el rastro optimizado: ${traceLatLngs.length}`);

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
          console.error('❌ [RESTAURACIÓN] Error al cargar historial:', err);
          resolve({ restored: false });
        }
      });

      this.subscriptions.push(sub);
    });
  }

  /**
   * Loads initial data for the tracking component.
   * First restores route history if available, then fetches latest telemetry.
   * If telemetry is not found (404), initializes with random position and starts simulation.
   */
  private async loadInitialData(): Promise<void> {
    console.log('🔄 [INIT] Iniciando carga de datos...');

    const restoredState = await this.restoreRouteHistory();

    const sub = this.telemetryService.getLatestTelemetry(this.vehicleId).subscribe({
      next: (data) => {
        if (data) {
          this.renterName = data.renterName ?? 'No disponible';

          if (restoredState.restored) {
            console.log('✨ [INIT] Usando estado restaurado del historial');

            this.currentSpeed = restoredState.lastSpeed || Math.floor(data.speed);
            this.currentFuel = restoredState.lastFuel || Math.floor(data.fuelLevel);

            console.log(`📍 [INIT] Continuando desde posición restaurada: (${this.currentPosition.lat.toFixed(4)}, ${this.currentPosition.lng.toFixed(4)})`);
          } else {
            console.log('🆕 [INIT] No hay historial, usando datos del API');

            this.currentSpeed = Math.floor(data.speed);
            this.currentFuel = Math.floor(data.fuelLevel);

            if (data.latitude && data.longitude) {
              this.currentPosition = { lat: data.latitude, lng: data.longitude };
              this.previousPosition = { ...this.currentPosition };
              this.vehicleMarker.setLatLng(this.currentPosition);
              this.map.setView(this.currentPosition, 15);

              console.log(`📍 [INIT] Vehículo ubicado en posición inicial: (${this.currentPosition.lat.toFixed(4)}, ${this.currentPosition.lng.toFixed(4)})`);
            }
          }

          this.tempSpeed = this.currentSpeed;
          this.tempFuel = this.currentFuel;

          this.vehicleState = this.currentSpeed > 0 ? 'Moviéndose' : 'Detenido';

          this.lastUIUpdateTime = performance.now();
          this.lastSaveTime = performance.now();
          this.nextUIUpdateDelay = 1000 + Math.random() * 1000; // 1-2 segundos

          console.log(`⚙️ [INIT] Estado inicial: Velocidad=${this.currentSpeed} km/h, Combustible=${this.currentFuel}%`);
          console.log('🚀 [INIT] Iniciando simulación continua...');
          this.startRouteSimulation();
        }
      },
      error: (err) => {
        const errorStatus = err?.status;

        if (errorStatus === 404) {
          console.log('🆕 [INIT] No se encontró telemetría previa (404). Inicializando vehículo nuevo con posición aleatoria...');

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
          this.vehicleState = 'Detenido';

          this.lastUIUpdateTime = performance.now();
          this.lastSaveTime = performance.now();
          this.nextUIUpdateDelay = 1000 + Math.random() * 1000;

          console.log(`📍 [INIT] Vehículo nuevo posicionado en: (${this.currentPosition.lat.toFixed(4)}, ${this.currentPosition.lng.toFixed(4)})`);
          console.log(`⚙️ [INIT] Estado inicial: Velocidad=0 km/h, Combustible=100%`);

          console.log('🚀 [INIT] Iniciando simulación automática para vehículo nuevo...');
          this.startRouteSimulation();
        } else {
          console.error('❌ [INIT] Error al obtener datos del API:', err);
        }
      }
    });
    this.subscriptions.push(sub);
  }

  private startRouteSimulation(): void {
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

          if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(this.animateStep);
          }
        } else {
          console.error('⚠️ [FRONTEND] La lista de ruta está vacía.');
        }
      },
      error: (err) => {
        console.error('❌ [FRONTEND] Error HTTP al pedir ruta:', err);
        setTimeout(() => this.startRouteSimulation(), 5000);
      }
    });
    this.subscriptions.push(sub);
  }

  private drawRoute(routePoints: LatLng[]): void {
    // ❌ YA NO DIBUJAMOS LA RUTA ANTICIPADA (eliminado para efecto snake)
    // El usuario NO debe ver el futuro, solo el rastro dejado por el vehículo

    // ✅ Opcional: Ajustar vista del mapa para seguir al vehículo
    // (Comentado para mantener vista estable, pero se puede activar si se desea)
    /*
    if (routePoints.length > 0) {
      const bounds = L.latLngBounds(routePoints.map(p => [p.lat, p.lng] as [number, number]));
      this.map.fitBounds(bounds);
    }
    */

    console.log(`📍 [FRONTEND] Nueva ruta cargada con ${routePoints.length} puntos (no se dibuja anticipadamente)`);
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
    // Convertir de radianes a grados y normalizar a 0-360
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
    // Normalizar para que siempre sea el ángulo más pequeño
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

    // Si no hay puntos, agregar el primero
    if (traceLatLngs.length === 0) {
      this.tracePolyline.addLatLng([newLat, newLng]);
      return;
    }

    const lastPoint = traceLatLngs[traceLatLngs.length - 1];

    // ========== FILTRO 1: DISTANCIA MÍNIMA (5 metros) ==========
    const distanceToLast = this.calculateDistance(
      lastPoint.lat,
      lastPoint.lng,
      newLat,
      newLng
    );

    if (distanceToLast < this.MIN_POINT_DISTANCE) {
      // Ignorar punto por ruido (micro-movimiento)
      return;
    }

    // ========== FILTRO 2: FUSIÓN DE COLINEALES (Simplificación por ángulo) ==========
    if (traceLatLngs.length >= 2) {
      const penultimatePoint = traceLatLngs[traceLatLngs.length - 2];

      // Calcular bearing (ángulo) del segmento anterior
      const previousBearing = this.calculateBearing(
        penultimatePoint.lat,
        penultimatePoint.lng,
        lastPoint.lat,
        lastPoint.lng
      );

      // Calcular bearing del nuevo segmento
      const newBearing = this.calculateBearing(
        lastPoint.lat,
        lastPoint.lng,
        newLat,
        newLng
      );

      // Diferencia angular
      const angleDiff = this.getAngleDifference(previousBearing, newBearing);

      if (angleDiff < this.MAX_ANGLE_DIFFERENCE) {
        // ✅ LÍNEA RECTA: Reemplazar último punto (extender segmento)
        traceLatLngs[traceLatLngs.length - 1] = L.latLng(newLat, newLng);
        this.tracePolyline.setLatLngs(traceLatLngs);
        return;
      }
    }

    // ✅ CURVA O CAMBIO DE DIRECCIÓN: Agregar nuevo punto
    this.tracePolyline.addLatLng([newLat, newLng]);

    // ========== OPTIMIZACIÓN: Limitar puntos totales ==========
    const updatedLatLngs = this.tracePolyline.getLatLngs() as L.LatLng[];
    if (updatedLatLngs.length > this.MAX_TRACE_POINTS) {
      const pointsToRemove = updatedLatLngs.length - this.MAX_TRACE_POINTS;
      const newLatLngs = updatedLatLngs.slice(pointsToRemove);
      this.tracePolyline.setLatLngs(newLatLngs);
      console.log(`🗑️ [OPTIMIZACIÓN] Eliminados ${pointsToRemove} puntos antiguos del rastro`);
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

    // Fire-and-forget: subscribe sin esperar respuesta
    this.telemetryService.recordTelemetry(telemetryData).subscribe({
      next: () => {
        // Guardado exitoso (silencioso)
      },
      error: (err) => {
        console.warn('⚠️ [PERSISTENCIA] Error al guardar estado (no crítico):', err);
      }
    });
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

    // ========== 💾 HEARTBEAT: GUARDAR ESTADO CADA 5 SEGUNDOS ==========
    const timeSinceLastSave = now - this.lastSaveTime;

    if (timeSinceLastSave >= 5000) {
      // Guardar estado actual en el servidor
      this.saveCurrentState();
      this.lastSaveTime = now;
      console.log(`💾 [HEARTBEAT] Estado guardado: Pos(${this.currentPosition.lat.toFixed(4)}, ${this.currentPosition.lng.toFixed(4)}) | Vel: ${this.currentSpeed} km/h | Combustible: ${this.currentFuel}%`);
    }

    // ========== ACTUALIZAR POSICIÓN DEL MARCADOR (SUAVE EN CADA FRAME) ==========
    this.vehicleMarker.setLatLng([interpolatedLat, interpolatedLng]);
    this.previousPosition = { lat: interpolatedLat, lng: interpolatedLng };
    this.currentPosition = { lat: interpolatedLat, lng: interpolatedLng };

    // ========== 🐍 EFECTO SNAKE OPTIMIZADO: Agregar punto con fusión inteligente ==========
    // Usa método optimizado que:
    // - Ignora puntos con movimiento < 5m (ruido)
    // - Fusiona puntos colineales (rectas)
    // - Conserva puntos en curvas
    this.addOptimizedPoint(interpolatedLat, interpolatedLng);

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
