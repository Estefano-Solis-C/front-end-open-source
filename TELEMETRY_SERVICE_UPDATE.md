# 📡 TelemetryService - Documentación Actualizada

## ✅ ACTUALIZACIÓN COMPLETADA

---

## 📋 RESUMEN

Se ha actualizado el servicio `TelemetryService` para incluir el método `getSimulationRoute` que consume el nuevo endpoint de rutas del backend.

---

## 🎯 MÉTODO AGREGADO

### `getSimulationRoute()`

#### Firma
```typescript
getSimulationRoute(
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number
): Observable<RouteResponse>
```

#### Descripción
Obtiene una ruta simulada entre dos coordenadas geográficas desde el backend.

#### Parámetros
- `startLat` (number): Latitud de inicio
- `startLng` (number): Longitud de inicio
- `endLat` (number): Latitud de destino
- `endLng` (number): Longitud de destino

#### Retorno
- `Observable<RouteResponse>`: Observable que emite la respuesta con la ruta

#### Endpoint
```
GET /api/v1/simulation/route?startLat=X&startLng=Y&endLat=X&endLng=Y
```

---

## 📊 ESTRUCTURA DE DATOS

### RouteResponse Interface
```typescript
export interface RouteResponse {
  route: Array<{ lat: number; lng: number }>;
}
```

### Ejemplo de Respuesta del Backend
```json
{
  "route": [
    { "lat": -12.0464, "lng": -77.0428 },
    { "lat": -12.0470, "lng": -77.0435 },
    { "lat": -12.0480, "lng": -77.0440 },
    { "lat": -12.0490, "lng": -77.0445 },
    { "lat": -12.0500, "lng": -77.0450 }
  ]
}
```

---

## 🔧 CONFIGURACIÓN

### URL Base
```typescript
private simulationUrl = environment.BASE_URL + '/simulation';
```

**Resultado:** `http://localhost:8080/api/v1/simulation`

### Construcción de la URL Completa
```typescript
`${this.simulationUrl}/route` 
// → http://localhost:8080/api/v1/simulation/route
```

### Parámetros de Query String
```typescript
const params = new HttpParams()
  .set('startLat', startLat.toString())
  .set('startLng', startLng.toString())
  .set('endLat', endLat.toString())
  .set('endLng', endLng.toString());
```

**Resultado:** `?startLat=-12.0464&startLng=-77.0428&endLat=-12.0893&endLng=-77.0447`

---

## 💻 EJEMPLO DE USO

### En un Componente

```typescript
import { Component, OnInit } from '@angular/core';
import { TelemetryService } from './services/telemetry.service';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html'
})
export class TrackingComponent implements OnInit {
  
  constructor(private telemetryService: TelemetryService) {}

  ngOnInit(): void {
    this.loadRoute();
  }

  loadRoute(): void {
    // Coordenadas de ejemplo en Lima, Perú
    const startLat = -12.0464; // Miraflores
    const startLng = -77.0428;
    const endLat = -12.0893;   // San Isidro
    const endLng = -77.0447;

    this.telemetryService.getSimulationRoute(startLat, startLng, endLat, endLng)
      .subscribe({
        next: (response) => {
          console.log('Ruta obtenida:', response.route);
          // Usar response.route para dibujar en el mapa
          this.drawRoute(response.route);
        },
        error: (error) => {
          console.error('Error al obtener ruta:', error);
        }
      });
  }

  drawRoute(route: Array<{ lat: number; lng: number }>): void {
    // Lógica para dibujar la ruta en Leaflet
    console.log(`Ruta con ${route.length} puntos`);
  }
}
```

### Con async/await

```typescript
async loadRoute(): Promise<void> {
  try {
    const response = await this.telemetryService.getSimulationRoute(
      -12.0464, -77.0428,  // Inicio
      -12.0893, -77.0447   // Destino
    ).toPromise();

    console.log('Ruta obtenida:', response.route);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Con RxJS Operators

```typescript
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

loadRoute(): void {
  this.telemetryService.getSimulationRoute(-12.0464, -77.0428, -12.0893, -77.0447)
    .pipe(
      map(response => response.route),
      catchError(error => {
        console.error('Error:', error);
        return of([]); // Retornar array vacío en caso de error
      })
    )
    .subscribe(route => {
      console.log(`Ruta con ${route.length} puntos`);
      this.drawRoute(route);
    });
}
```

---

## 🧪 PRUEBAS

### Prueba Manual con Postman/cURL

```bash
curl -X GET "http://localhost:8080/api/v1/simulation/route?startLat=-12.0464&startLng=-77.0428&endLat=-12.0893&endLng=-77.0447"
```

### Prueba desde DevTools Console

```javascript
// En la consola del navegador
fetch('http://localhost:8080/api/v1/simulation/route?startLat=-12.0464&startLng=-77.0428&endLat=-12.0893&endLng=-77.0447')
  .then(r => r.json())
  .then(data => console.log('Ruta:', data));
```

---

## 📝 CÓDIGO COMPLETO DEL SERVICIO

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Telemetry } from '../models/telemetry.model';
import { environment } from '../../../../environments/environment';

export interface RouteResponse {
  route: Array<{ lat: number; lng: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_TELEMETRY;
  private simulationUrl = environment.BASE_URL + '/simulation';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene los datos de telemetría de un vehículo específico
   * @param vehicleId ID del vehículo
   * @returns Observable con array de datos de telemetría
   */
  getTelemetryByVehicleId(vehicleId: number): Observable<Telemetry[]> {
    return this.http.get<Telemetry[]>(`${this.apiUrl}/vehicle/${vehicleId}`);
  }

  /**
   * Obtiene una ruta simulada entre dos coordenadas
   * Endpoint: GET /api/v1/simulation/route?startLat=X&startLng=Y&endLat=X&endLng=Y
   * @param startLat Latitud de inicio
   * @param startLng Longitud de inicio
   * @param endLat Latitud de destino
   * @param endLng Longitud de destino
   * @returns Observable con la ruta simulada (array de coordenadas)
   */
  getSimulationRoute(
    startLat: number, 
    startLng: number, 
    endLat: number, 
    endLng: number
  ): Observable<RouteResponse> {
    // Construir parámetros de consulta
    const params = new HttpParams()
      .set('startLat', startLat.toString())
      .set('startLng', startLng.toString())
      .set('endLat', endLat.toString())
      .set('endLng', endLng.toString());

    // Hacer petición GET con parámetros en query string
    return this.http.get<RouteResponse>(`${this.simulationUrl}/route`, { params });
  }
}
```

---

## 🔍 VERIFICACIÓN

### URLs Generadas

| Escenario | URL Completa |
|-----------|--------------|
| **Endpoint base** | `http://localhost:8080/api/v1` |
| **Telemetría** | `http://localhost:8080/api/v1/telemetry/vehicle/1` |
| **Simulación** | `http://localhost:8080/api/v1/simulation/route` |

### Ejemplo de URL con Parámetros

```
http://localhost:8080/api/v1/simulation/route?startLat=-12.0464&startLng=-77.0428&endLat=-12.0893&endLng=-77.0447
```

---

## ⚙️ CONFIGURACIÓN DE ENVIRONMENT

### environment.ts
```typescript
export const environment = {
  production: true,
  BASE_URL: 'http://localhost:8080/api/v1',
  ENDPOINT_PATH_TELEMETRY: '/telemetry'
};
```

### environment.development.ts
```typescript
export const environment = {
  production: false,
  BASE_URL: 'http://localhost:8080/api/v1',
  ENDPOINT_PATH_TELEMETRY: '/telemetry'
};
```

---

## 🚨 MANEJO DE ERRORES

### Ejemplo con Manejo Completo

```typescript
this.telemetryService.getSimulationRoute(startLat, startLng, endLat, endLng)
  .subscribe({
    next: (response) => {
      if (response.route && response.route.length > 0) {
        console.log('Ruta obtenida exitosamente');
        this.drawRoute(response.route);
      } else {
        console.warn('La ruta está vacía');
        this.handleEmptyRoute();
      }
    },
    error: (error) => {
      console.error('Error al obtener ruta:', error);
      
      if (error.status === 404) {
        console.error('Endpoint no encontrado');
      } else if (error.status === 500) {
        console.error('Error interno del servidor');
      } else if (error.status === 0) {
        console.error('No se puede conectar al servidor');
      }
      
      // Usar ruta de respaldo
      this.useFlbackRoute();
    },
    complete: () => {
      console.log('Petición completada');
    }
  });
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Método `getSimulationRoute` agregado
- [x] Parámetros correctos (4 números)
- [x] Retorna `Observable<RouteResponse>`
- [x] Usa HttpParams para query string
- [x] URL correcta sin duplicación de `/api/v1`
- [x] Variable `simulationUrl` creada
- [x] Comentarios JSDoc agregados
- [x] Interface `RouteResponse` definida
- [x] Imports correctos (`HttpClient`, `HttpParams`, `Observable`)

---

## 🎯 RESULTADO FINAL

```
╔════════════════════════════════════════════════════╗
║                                                    ║
║  ✅ SERVICIO ACTUALIZADO EXITOSAMENTE             ║
║                                                    ║
║  📡 Método: getSimulationRoute()                  ║
║  🔗 Endpoint: /api/v1/simulation/route            ║
║  📊 Parámetros: Query String (4 coordenadas)      ║
║  🔄 Retorno: Observable<RouteResponse>            ║
║                                                    ║
║  Compilación: ✅ Sin errores                      ║
║  Estado: 🟢 Listo para usar                       ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

**Fecha de actualización:** Diciembre 2, 2025  
**Versión del servicio:** 2.0.0  
**Estado:** ✅ Completado y Documentado

