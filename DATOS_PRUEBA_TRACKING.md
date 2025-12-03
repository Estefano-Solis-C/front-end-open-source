# 🧪 DATOS DE PRUEBA - Monitor de Rastreo

## 📊 Ejemplos de Datos del Backend

### Ejemplo 1: Vehículo en Movimiento

```json
[
  {
    "id": 1,
    "vehicleId": 101,
    "latitude": -12.0464,
    "longitude": -77.0428,
    "speed": 45,
    "fuelLevel": 75,
    "timestamp": "2025-12-02T10:30:00Z",
    "renterName": "Juan Pérez",
    "plannedRoute": [
      { "lat": -12.0464, "lng": -77.0428 },
      { "lat": -12.0480, "lng": -77.0440 },
      { "lat": -12.0500, "lng": -77.0450 },
      { "lat": -12.0520, "lng": -77.0460 },
      { "lat": -12.0550, "lng": -77.0480 }
    ]
  }
]
```

**Resultado Esperado:**
- Estado: **MOVIÉNDOSE** (verde)
- Velocidad: 45 km/h (azul)
- Gasolina: 75% (verde)
- Ruta azul visible en el mapa
- Marcador se mueve suavemente

---

### Ejemplo 2: Vehículo Detenido

```json
[
  {
    "id": 2,
    "vehicleId": 102,
    "latitude": -12.0893,
    "longitude": -77.0447,
    "speed": 0,
    "fuelLevel": 50,
    "timestamp": "2025-12-02T10:35:00Z",
    "renterName": "María García",
    "plannedRoute": [
      { "lat": -12.0893, "lng": -77.0447 },
      { "lat": -12.0900, "lng": -77.0450 }
    ]
  }
]
```

**Resultado Esperado:**
- Estado: **DETENIDO** (rojo)
- Velocidad: 0 km/h
- Gasolina: 50% (verde)
- Marcador estático
- Indicador rojo sin pulsar

---

### Ejemplo 3: Combustible Bajo

```json
[
  {
    "id": 3,
    "vehicleId": 103,
    "latitude": -12.1200,
    "longitude": -77.0300,
    "speed": 30,
    "fuelLevel": 15,
    "timestamp": "2025-12-02T10:40:00Z",
    "renterName": "Carlos Rodríguez",
    "plannedRoute": []
  }
]
```

**Resultado Esperado:**
- Estado: **MOVIÉNDOSE** (verde)
- Velocidad: 30 km/h
- Gasolina: 15% (naranja - alerta)
- Sin ruta planificada visible

---

### Ejemplo 4: Combustible Crítico

```json
[
  {
    "id": 4,
    "vehicleId": 104,
    "latitude": -12.0700,
    "longitude": -77.0600,
    "speed": 15,
    "fuelLevel": 8,
    "timestamp": "2025-12-02T10:45:00Z",
    "renterName": "Ana Martínez"
  }
]
```

**Resultado Esperado:**
- Estado: **MOVIÉNDOSE** (verde)
- Velocidad: 15 km/h
- Gasolina: 8% (rojo parpadeante - crítico)
- Sin ruta planificada

---

### Ejemplo 5: Sin Nombre de Conductor

```json
[
  {
    "id": 5,
    "vehicleId": 105,
    "latitude": -12.0500,
    "longitude": -77.0400,
    "speed": 60,
    "fuelLevel": 90,
    "timestamp": "2025-12-02T10:50:00Z"
  }
]
```

**Resultado Esperado:**
- Conductor: "No disponible"
- Estado: **MOVIÉNDOSE** (verde)
- Velocidad: 60 km/h
- Gasolina: 90% (verde)

---

## 🧪 SIMULACIÓN DE MOVIMIENTO

### Secuencia de Actualizaciones (cada 5 segundos)

#### Update 1 (t=0s)
```json
{
  "latitude": -12.0464,
  "longitude": -77.0428,
  "speed": 40
}
```

#### Update 2 (t=5s)
```json
{
  "latitude": -12.0480,
  "longitude": -77.0440,
  "speed": 45
}
```

#### Update 3 (t=10s)
```json
{
  "latitude": -12.0500,
  "longitude": -77.0450,
  "speed": 50
}
```

**Comportamiento Esperado:**
- Entre t=0s y t=5s: Marcador se mueve suavemente de posición 1 a posición 2
- Entre t=5s y t=10s: Marcador se mueve suavamente de posición 2 a posición 3
- Sin saltos bruscos
- Transiciones fluidas

---

## 🎬 ESCENARIOS DE PRUEBA

### Escenario 1: Arranque del Vehículo
```json
// Estado inicial
{ "speed": 0, "fuelLevel": 100 }

// Después de 5 segundos
{ "speed": 20, "fuelLevel": 99 }
```
**Verificar:** Estado cambia de DETENIDO (rojo) a MOVIÉNDOSE (verde)

---

### Escenario 2: Parada del Vehículo
```json
// Estado en movimiento
{ "speed": 50, "fuelLevel": 80 }

// Después de 5 segundos
{ "speed": 0, "fuelLevel": 79 }
```
**Verificar:** Estado cambia de MOVIÉNDOSE (verde) a DETENIDO (rojo)

---

### Escenario 3: Consumo de Combustible
```json
// Update 1
{ "fuelLevel": 25 }  // Verde

// Update 2
{ "fuelLevel": 20 }  // Naranja (alerta)

// Update 3
{ "fuelLevel": 10 }  // Rojo (crítico)

// Update 4
{ "fuelLevel": 8 }   // Rojo parpadeante
```
**Verificar:** Cambios de color y animaciones

---

### Escenario 4: Ruta Larga
```json
{
  "plannedRoute": [
    { "lat": -12.0464, "lng": -77.0428 },
    { "lat": -12.0470, "lng": -77.0435 },
    { "lat": -12.0480, "lng": -77.0440 },
    { "lat": -12.0490, "lng": -77.0445 },
    { "lat": -12.0500, "lng": -77.0450 },
    { "lat": -12.0510, "lng": -77.0455 },
    { "lat": -12.0520, "lng": -77.0460 },
    { "lat": -12.0530, "lng": -77.0465 },
    { "lat": -12.0540, "lng": -77.0470 },
    { "lat": -12.0550, "lng": -77.0480 }
  ]
}
```
**Verificar:** Polyline azul se dibuja correctamente con todos los puntos

---

## 🔧 CONFIGURACIÓN DEL SERVIDOR DE PRUEBAS

### db.json (para json-server)
```json
{
  "telemetry": [
    {
      "id": 1,
      "vehicleId": 1,
      "latitude": -12.0464,
      "longitude": -77.0428,
      "speed": 45,
      "fuelLevel": 75,
      "timestamp": "2025-12-02T10:30:00Z",
      "renterName": "Juan Pérez",
      "plannedRoute": [
        { "lat": -12.0464, "lng": -77.0428 },
        { "lat": -12.0480, "lng": -77.0440 },
        { "lat": -12.0500, "lng": -77.0450 }
      ]
    }
  ]
}
```

### Endpoint
```
GET http://localhost:3000/telemetry?vehicleId=1
```

---

## 📍 COORDENADAS DE LIMA

### Ubicaciones de Referencia
```javascript
const locations = {
  miraflores: { lat: -12.0464, lng: -77.0428 },
  sanIsidro: { lat: -12.0893, lng: -77.0447 },
  barranco: { lat: -12.1460, lng: -77.0200 },
  surco: { lat: -12.1461, lng: -76.9947 },
  lince: { lat: -12.0823, lng: -77.0329 }
};
```

### Generar Ruta entre Dos Puntos
```javascript
function generateRoute(start, end, points = 10) {
  const route = [];
  for (let i = 0; i <= points; i++) {
    const ratio = i / points;
    route.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio
    });
  }
  return route;
}

// Ejemplo: Ruta de Miraflores a San Isidro
const route = generateRoute(
  { lat: -12.0464, lng: -77.0428 },
  { lat: -12.0893, lng: -77.0447 },
  15
);
```

---

## 🎯 CHECKLIST DE PRUEBAS

### Visualización
- [ ] Mapa se muestra correctamente
- [ ] Tiles de OpenStreetMap cargan
- [ ] Marcador aparece en la posición correcta
- [ ] Icono de coche se ve bien

### Ruta
- [ ] Polyline azul se dibuja
- [ ] Polyline sigue la plannedRoute
- [ ] Color es #2196F3
- [ ] Grosor es visible (4px)

### Panel de Estado
- [ ] Panel aparece en esquina superior derecha
- [ ] Animación de entrada se ve suave
- [ ] Todos los datos se muestran
- [ ] Formato de timestamp es correcto

### Interpolación
- [ ] Movimiento es suave (no a saltos)
- [ ] Tarda aproximadamente 5 segundos
- [ ] Aceleración/desaceleración es natural
- [ ] Marcador sigue la trayectoria

### Estados
- [ ] Velocidad > 0 → MOVIÉNDOSE (verde)
- [ ] Velocidad = 0 → DETENIDO (rojo)
- [ ] Badge cambia de color
- [ ] Indicador pulsa cuando está en movimiento

### Combustible
- [ ] Normal (>20%) → Verde
- [ ] Bajo (≤20%) → Naranja
- [ ] Crítico (≤10%) → Rojo parpadeante

### Actualización
- [ ] Polling cada 5 segundos funciona
- [ ] Datos se actualizan en el panel
- [ ] Nueva posición se interpola suavemente

### Responsive
- [ ] Desktop: Panel en derecha, tamaño correcto
- [ ] Mobile: Panel ocupa ancho completo
- [ ] Controles se adaptan

---

## 🐛 PROBLEMAS COMUNES

### Problema: Mapa no se muestra
**Solución:** Verificar que `leaflet.css` esté importado en `styles.css`

### Problema: Marcador no aparece
**Solución:** Verificar que las coordenadas sean válidas y estén en el formato correcto

### Problema: Movimiento a saltos
**Solución:** Verificar que la interpolación se esté ejecutando (console.log en `interpolate()`)

### Problema: Panel no aparece
**Solución:** Verificar que `telemetry` no sea null (agregar console.log)

---

## 📝 LOGS DE CONSOLA

Durante el funcionamiento normal, deberías ver:

```
Interpolación iniciada desde (-12.0464, -77.0428) hasta (-12.0480, -77.0440)
Progress: 0.0
Progress: 0.1
Progress: 0.2
...
Progress: 1.0
Interpolación completada
```

---

**Documento creado:** Diciembre 2, 2025  
**Propósito:** Guía de pruebas y datos de ejemplo

