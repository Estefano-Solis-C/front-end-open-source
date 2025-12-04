# Instrucciones de Refactorización del Backend (Spring Boot)

## Contexto
El Frontend ahora envía FormData (multipart/form-data) solo cuando hay una imagen nueva, y JSON cuando solo se actualizan otros campos del vehículo. El Backend debe soportar ambos casos sin errores 500.

---

## PENDIENTE 1: Refactorizar VehiclesController.java

### Ubicación del archivo
Busca el archivo `VehiclesController.java` en tu proyecto de Spring Boot, típicamente en:
```
src/main/java/com/tuempresa/vehiculos/interfaces/rest/VehiclesController.java
```

### Cambios a realizar en el método `updateVehicle`

**ANTES:**
```java
@PutMapping("/{id}")
public ResponseEntity<VehicleResource> updateVehicle(
    @PathVariable Long id,
    @RequestPart("resource") UpdateVehicleResource resource,
    @RequestPart("image") MultipartFile image
) {
    try {
        var updateCommand = new UpdateVehicleCommand(
            id,
            resource.brand(),
            resource.model(),
            resource.year(),
            resource.pricePerDay(),
            resource.status(),
            image.getBytes()  // ⚠️ PROBLEMA: Si no hay imagen, esto falla
        );
        // ... resto del código
    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
```

**DESPUÉS:**
```java
@PutMapping("/{id}")
public ResponseEntity<VehicleResource> updateVehicle(
    @PathVariable Long id,
    @RequestPart("resource") UpdateVehicleResource resource,
    @RequestPart(value = "image", required = false) MultipartFile image  // ✅ Imagen ahora es OPCIONAL
) {
    try {
        // ✅ Solo procesar la imagen si está presente y no está vacía
        byte[] imageBytes = null;
        if (image != null && !image.isEmpty()) {
            imageBytes = image.getBytes();
        }
        
        var updateCommand = new UpdateVehicleCommand(
            id,
            resource.brand(),
            resource.model(),
            resource.year(),
            resource.pricePerDay(),
            resource.status(),
            imageBytes  // ✅ Pasa null si no hay imagen nueva
        );
        
        var updatedVehicle = commandService.handle(updateCommand);
        var vehicleResource = VehicleResourceFromEntityAssembler.toResourceFromEntity(updatedVehicle);
        return ResponseEntity.ok(vehicleResource);
        
    } catch (IOException e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
```

### Puntos clave:
1. **`required = false`**: Permite que el endpoint acepte requests sin la parte "image"
2. **Validación `image != null && !image.isEmpty()`**: Evita NullPointerException
3. **`imageBytes = null`**: Si no hay imagen, pasa `null` al comando (no actualiza la imagen)

---

## PENDIENTE 2: Refactorizar Vehicle.java (Aggregate)

### Ubicación del archivo
Busca el archivo `Vehicle.java` (el Aggregate de DDD) en tu proyecto, típicamente en:
```
src/main/java/com/tuempresa/vehiculos/domain/model/aggregates/Vehicle.java
```

### Cambios a realizar en el método `update`

**ANTES:**
```java
public void update(UpdateVehicleCommand command) {
    this.brand = command.brand();
    this.model = command.model();
    this.year = command.year();
    this.pricePerDay = command.pricePerDay();
    this.status = command.status();
    this.image = command.image();  // ⚠️ PROBLEMA: Sobrescribe con null si no hay imagen nueva
}
```

**DESPUÉS:**
```java
public void update(UpdateVehicleCommand command) {
    this.brand = command.brand();
    this.model = command.model();
    this.year = command.year();
    this.pricePerDay = command.pricePerDay();
    this.status = command.status();
    
    // ✅ Solo actualizar la imagen si el comando trae una nueva (no null y con contenido)
    if (command.image() != null && command.image().length > 0) {
        this.image = command.image();
    }
    // ✅ Si command.image() es null, mantiene la imagen existente en la base de datos
}
```

### Puntos clave:
1. **Validación condicional**: Solo actualiza `this.image` si `command.image()` no es null y tiene contenido
2. **Preservación de datos**: Si no hay imagen nueva, mantiene la imagen existente
3. **Flexibilidad**: Permite actualizar precio/nombre sin tener que reenviar la foto

---

## PENDIENTE 3 (Opcional): Soportar actualizaciones JSON puras

Si quieres que el Backend también acepte JSON puro (sin FormData) para actualizaciones sin imagen, puedes agregar un segundo endpoint:

```java
@PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<VehicleResource> updateVehicleJson(
    @PathVariable Long id,
    @RequestBody UpdateVehicleResource resource
) {
    try {
        var updateCommand = new UpdateVehicleCommand(
            id,
            resource.brand(),
            resource.model(),
            resource.year(),
            resource.pricePerDay(),
            resource.status(),
            null  // Sin imagen
        );
        
        var updatedVehicle = commandService.handle(updateCommand);
        var vehicleResource = VehicleResourceFromEntityAssembler.toResourceFromEntity(updatedVehicle);
        return ResponseEntity.ok(vehicleResource);
        
    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
```

Spring Boot automáticamente enrutará la petición al endpoint correcto según el `Content-Type`:
- `multipart/form-data` → Primer endpoint (con imagen opcional)
- `application/json` → Segundo endpoint (sin imagen)

---

## Verificación

Después de aplicar estos cambios, el Backend debería:

✅ **Aceptar actualizaciones sin imagen nueva** (usuario edita precio/nombre sin resubir foto)
✅ **Aceptar actualizaciones con imagen nueva** (usuario cambia la foto)
✅ **No devolver error 500** por parámetros faltantes
✅ **Preservar la imagen existente** cuando no se envía una nueva

---

## Testing Recomendado

### Test 1: Actualizar solo el precio (sin nueva imagen)
```bash
curl -X PUT http://localhost:8080/api/v1/vehicles/1 \
  -F 'resource={"brand":"Toyota","model":"Corolla","year":2021,"pricePerDay":75.00,"status":"available"}' \
  -H "Authorization: Bearer {token}"
```
**Resultado esperado**: Precio actualizado, imagen sin cambios

### Test 2: Actualizar precio + nueva imagen
```bash
curl -X PUT http://localhost:8080/api/v1/vehicles/1 \
  -F 'resource={"brand":"Toyota","model":"Corolla","year":2021,"pricePerDay":80.00,"status":"available"}' \
  -F 'image=@nueva_foto.jpg' \
  -H "Authorization: Bearer {token}"
```
**Resultado esperado**: Precio actualizado, imagen reemplazada

### Test 3: Actualizar con JSON puro (si implementaste el endpoint opcional)
```bash
curl -X PUT http://localhost:8080/api/v1/vehicles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"brand":"Toyota","model":"Corolla","year":2021,"pricePerDay":90.00,"status":"available"}'
```
**Resultado esperado**: Precio actualizado, imagen sin cambios

---

## Resumen de Cambios

| Archivo | Cambio | Propósito |
|---------|--------|-----------|
| `VehiclesController.java` | `@RequestPart(value = "image", required = false)` | Hacer la imagen opcional |
| `VehiclesController.java` | Validación `if (image != null && !image.isEmpty())` | Evitar NullPointerException |
| `Vehicle.java` | Actualización condicional de `this.image` | Preservar imagen existente si no hay nueva |

---

## Archivos Frontend Ya Refactorizados ✅

Los siguientes archivos del Frontend Angular ya han sido actualizados:

1. **`vehicle.service.ts`**:
   - Método `updateVehicle` ahora acepta `imageFile?: File`
   - Envía FormData si hay imagen nueva, JSON si no hay

2. **`vehicle-form.component.ts`**:
   - Método `onSubmit` pasa `this.selectedFile || undefined` al servicio
   - El usuario puede editar sin resubir la foto

---

## Autor
Refactorización realizada por GitHub Copilot el 2025-12-03

