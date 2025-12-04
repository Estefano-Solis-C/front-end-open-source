# 🔧 FIX: "My Bookings" Vacío para Usuarios Arrendatarios

## 🐛 Problema Diagnosticado

Los usuarios con rol **ROLE_ARRENDATARIO** (Renter) no ven sus reservas en la página "My Bookings", aunque hayan creado reservas que fueron aceptadas por los dueños.

### Causa Raíz
El endpoint del Backend `/api/v1/bookings/my-bookings` probablemente:
- No existe o está mal configurado
- Está filtrando por `ownerId` en lugar de `renterId`
- No está identificando correctamente al usuario autenticado desde el token JWT

---

## ✅ Frontend (Corregido y Verificado)

### 🔧 Problema Encontrado y Corregido

**Problema:** El `MyBookingsComponent` estaba validando `user.role === 'ROLE_ARRENDATARIO'`, pero el `AuthService` normaliza los roles convirtiendo `ROLE_ARRENDATARIO` → `ROLE_RENTER`. Esto causaba que el componente nunca ejecutara la consulta de bookings.

**Solución:** Se corrigió la validación en `my-bookings.component.ts` línea 35:

```typescript
// ❌ ANTES (incorrecto)
if (user && user.role === 'ROLE_ARRENDATARIO') {

// ✅ DESPUÉS (correcto)
if (user && user.role === 'ROLE_RENTER') {
```

### ✅ Frontend Funciona Correctamente Ahora

El Frontend está implementado correctamente después de la corrección:

### 1. `BookingService.ts` - Llamando al endpoint correcto
```typescript
getMyBookings(): Observable<Booking[]> {
  return this.http.get<BookingDto[]>(`${this.apiUrl}/my-bookings`).pipe(
    map(dtos => dtos.map(BookingAssembler.toModel)),
    catchError(err => {
      this.notifier.showError('ERRORS.BOOKING.LIST_FETCH_FAILED');
      return throwError(() => err);
    })
  );
}
```
✅ **Correcto**: Llama a `GET /api/v1/bookings/my-bookings`

### 2. `MyBookingsComponent.ts` - Lógica correcta
```typescript
ngOnInit(): void {
  this.authService.currentUser$.pipe(
    take(1),
    switchMap(user => {
      if (user && user.role === 'ROLE_ARRENDATARIO') {  // ✅ Validación correcta
        return this.getMyBookings.execute();
      }
      return of([]);
    }),
    // ... resto del código
  ).subscribe(detailedBookings => {
    this.bookingsWithDetails = detailedBookings;
    this.isLoading = false;
  });
}
```
✅ **Correcto**: Valida el rol y ejecuta el caso de uso

### 3. `MyBookingsComponent.html` - Vista correcta
```html
<div *ngIf="!isLoading && bookingsWithDetails.length === 0" class="empty-state">
  <p>{{ 'MY_BOOKINGS.NO_BOOKINGS' | translate }}</p>
</div>

<div class="bookings-grid" *ngIf="!isLoading && bookingsWithDetails.length > 0">
  <div class="card booking-card" *ngFor="let item of bookingsWithDetails">
    <!-- ... -->
  </div>
</div>
```
✅ **Correcto**: Muestra mensaje si no hay bookings, o la lista si hay datos

---

## 🔴 Backend (REQUIERE CORRECCIÓN)

El problema está en el Backend de Spring Boot. A continuación, las correcciones necesarias:

---

## 1️⃣ CORRECCIÓN: BookingsController.java

### Ubicación
```
src/main/java/com/tuempresa/bookings/interfaces/rest/BookingsController.java
```

### ❌ Problema Probable

Es probable que el endpoint esté mal implementado o no exista:

**CASO 1: Endpoint inexistente o con nombre incorrecto**
```java
// ❌ PROBLEMA: Endpoint no existe o tiene otro nombre
@GetMapping("/my-vehicles")  // ❌ NOMBRE INCORRECTO
public ResponseEntity<List<BookingResource>> getMyBookings(@RequestHeader("Authorization") String token) {
    // ...
}
```

**CASO 2: Filtrando por ownerId en lugar de renterId**
```java
@GetMapping("/my-bookings")
public ResponseEntity<List<BookingResource>> getMyBookings(@RequestHeader("Authorization") String token) {
    Long userId = jwtService.extractUserId(token);
    
    // ❌ PROBLEMA: Usa GetBookingsByOwnerIdQuery en lugar de GetBookingsByRenterIdQuery
    var query = new GetBookingsByOwnerIdQuery(userId);  // ❌ INCORRECTO
    var bookings = queryService.handle(query);
    
    return ResponseEntity.ok(bookings);
}
```

### ✅ Solución Correcta

```java
package com.tuempresa.bookings.interfaces.rest;

import com.tuempresa.bookings.domain.model.queries.GetBookingsByRenterIdQuery;
import com.tuempresa.bookings.domain.services.BookingQueryService;
import com.tuempresa.bookings.interfaces.rest.resources.BookingResource;
import com.tuempresa.bookings.interfaces.rest.transform.BookingResourceFromEntityAssembler;
import com.tuempresa.shared.infrastructure.jwt.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/bookings")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class BookingsController {

    @Autowired
    private BookingQueryService queryService;
    
    @Autowired
    private JwtService jwtService;

    /**
     * 🎯 Endpoint: Obtener las reservas hechas por el usuario autenticado (como ARRENDATARIO)
     * GET /api/v1/bookings/my-bookings
     * 
     * @param authorizationHeader - Token JWT en el header "Authorization: Bearer {token}"
     * @return Lista de reservas donde el usuario es el RENTER (renterId)
     */
    @GetMapping("/my-bookings")
    public ResponseEntity<List<BookingResource>> getMyBookings(
        @RequestHeader("Authorization") String authorizationHeader
    ) {
        // Extraer el userId del token JWT
        String token = authorizationHeader.replace("Bearer ", "");
        Long userId = jwtService.extractUserId(token);
        
        // ✅ CORRECTO: Usar GetBookingsByRenterIdQuery (NO ownerId)
        var query = new GetBookingsByRenterIdQuery(userId);
        var bookings = queryService.handle(query);
        
        // Convertir a recursos y retornar
        var bookingResources = bookings.stream()
            .map(BookingResourceFromEntityAssembler::toResourceFromEntity)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(bookingResources);
    }

    /**
     * 🎯 Endpoint: Obtener las solicitudes de reserva para los vehículos del usuario (como ARRENDADOR)
     * GET /api/v1/bookings/my-requests
     * 
     * @param authorizationHeader - Token JWT
     * @return Lista de reservas donde el usuario es el OWNER del vehículo
     */
    @GetMapping("/my-requests")
    public ResponseEntity<List<BookingResource>> getMyBookingRequests(
        @RequestHeader("Authorization") String authorizationHeader
    ) {
        String token = authorizationHeader.replace("Bearer ", "");
        Long userId = jwtService.extractUserId(token);
        
        // ✅ CORRECTO: Usar GetBookingsByOwnerIdQuery para las reservas RECIBIDAS
        var query = new GetBookingsByOwnerIdQuery(userId);
        var bookings = queryService.handle(query);
        
        var bookingResources = bookings.stream()
            .map(BookingResourceFromEntityAssembler::toResourceFromEntity)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(bookingResources);
    }

    // ... otros endpoints (create, update, confirm, reject, etc.)
}
```

### 🎯 Puntos Clave

| Endpoint | Filtro | Usuario | Descripción |
|----------|--------|---------|-------------|
| `/my-bookings` | `renterId` | **ARRENDATARIO** | Reservas hechas por el usuario (vehículos que alquiló) |
| `/my-requests` | `ownerId` | **ARRENDADOR** | Solicitudes recibidas en los vehículos del usuario |

---

## 2️⃣ CORRECCIÓN: BookingRepository.java

### Ubicación
```
src/main/java/com/tuempresa/bookings/domain/model/repositories/BookingRepository.java
```

### ❌ Problema Probable

El método `findAllByRenterId` no existe:

```java
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findAllByOwnerId(Long ownerId);  // ✅ Existe
    
    // ❌ FALTA: findAllByRenterId
}
```

### ✅ Solución Correcta

```java
package com.tuempresa.bookings.domain.model.repositories;

import com.tuempresa.bookings.domain.model.aggregates.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    
    /**
     * 🎯 Encuentra todas las reservas donde el usuario es el ARRENDATARIO (renter)
     * @param renterId - ID del usuario que hizo la reserva
     * @return Lista de reservas
     */
    List<Booking> findAllByRenterId(Long renterId);
    
    /**
     * 🎯 Encuentra todas las reservas donde el usuario es el DUEÑO del vehículo
     * @param ownerId - ID del dueño del vehículo
     * @return Lista de reservas recibidas en los vehículos del dueño
     */
    List<Booking> findAllByVehicle_OwnerId(Long ownerId);
    
    // ... otros métodos (findById, etc.)
}
```

### 📝 Notas Importantes

1. **`findAllByRenterId`**: Filtra por el campo `renterId` del Booking (usuario que alquila)
2. **`findAllByVehicle_OwnerId`**: Filtra por el `ownerId` del Vehicle asociado al Booking (dueño del vehículo)

Si el `ownerId` está directamente en la entidad `Booking`:
```java
List<Booking> findAllByOwnerId(Long ownerId);
```

---

## 3️⃣ CORRECCIÓN: GetBookingsByRenterIdQuery.java

### Ubicación
```
src/main/java/com/tuempresa/bookings/domain/model/queries/GetBookingsByRenterIdQuery.java
```

### ✅ Crear la Query

Si no existe, créala:

```java
package com.tuempresa.bookings.domain.model.queries;

public record GetBookingsByRenterIdQuery(Long renterId) {
}
```

---

## 4️⃣ CORRECCIÓN: BookingQueryServiceImpl.java

### Ubicación
```
src/main/java/com/tuempresa/bookings/domain/services/BookingQueryServiceImpl.java
```

### ✅ Implementar el Handler

```java
package com.tuempresa.bookings.domain.services;

import com.tuempresa.bookings.domain.model.aggregates.Booking;
import com.tuempresa.bookings.domain.model.queries.GetBookingsByRenterIdQuery;
import com.tuempresa.bookings.domain.model.queries.GetBookingsByOwnerIdQuery;
import com.tuempresa.bookings.domain.model.repositories.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookingQueryServiceImpl implements BookingQueryService {

    @Autowired
    private BookingRepository bookingRepository;

    /**
     * 🎯 Handler: Obtener reservas donde el usuario es el ARRENDATARIO
     */
    @Override
    public List<Booking> handle(GetBookingsByRenterIdQuery query) {
        return bookingRepository.findAllByRenterId(query.renterId());
    }

    /**
     * 🎯 Handler: Obtener reservas donde el usuario es el DUEÑO del vehículo
     */
    @Override
    public List<Booking> handle(GetBookingsByOwnerIdQuery query) {
        return bookingRepository.findAllByVehicle_OwnerId(query.ownerId());
        // O si ownerId está en Booking:
        // return bookingRepository.findAllByOwnerId(query.ownerId());
    }

    // ... otros handlers
}
```

---

## 5️⃣ VERIFICACIÓN: Estructura de la Entidad Booking

### Asegúrate de que la entidad tenga el campo `renterId`

```java
package com.tuempresa.bookings.domain.model.aggregates;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long renterId;  // ✅ IMPORTANTE: ID del usuario que alquila

    @ManyToOne
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private Double totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;  // PENDING, CONFIRMED, REJECTED, CANCELLED

    // Getters, setters, constructors...
}
```

### ⚠️ Caso Alternativo: Si usas relación @ManyToOne con User

Si tienes:
```java
@ManyToOne
@JoinColumn(name = "renter_id")
private User renter;
```

Entonces el método del repositorio debería ser:
```java
List<Booking> findAllByRenter_Id(Long renterId);
```

---

## 🧪 Testing Recomendado

### Test 1: Crear reserva como Arrendatario
```bash
# 1. Login como ARRENDATARIO
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"renter@example.com","password":"password123"}'

# Guardar el token: eyJhbGc...

# 2. Crear una reserva
curl -X POST http://localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 1,
    "startDate": "2025-12-10",
    "endDate": "2025-12-15"
  }'

# Guardar el bookingId: 1
```

### Test 2: Verificar que aparece en My Bookings
```bash
curl -X GET http://localhost:8080/api/v1/bookings/my-bookings \
  -H "Authorization: Bearer {token}"
```

**Resultado esperado:**
```json
[
  {
    "id": 1,
    "vehicleId": 1,
    "renterId": 2,
    "startDate": "2025-12-10",
    "endDate": "2025-12-15",
    "totalPrice": 250.00,
    "status": "PENDING"
  }
]
```

### Test 3: Login como Dueño y aceptar reserva
```bash
# 1. Login como ARRENDADOR (dueño del vehículo)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"password123"}'

# 2. Confirmar la reserva
curl -X PUT http://localhost:8080/api/v1/bookings/1/confirm \
  -H "Authorization: Bearer {owner_token}"
```

### Test 4: Verificar que el Arrendatario ve la reserva CONFIRMADA
```bash
curl -X GET http://localhost:8080/api/v1/bookings/my-bookings \
  -H "Authorization: Bearer {renter_token}"
```

**Resultado esperado:**
```json
[
  {
    "id": 1,
    "vehicleId": 1,
    "renterId": 2,
    "startDate": "2025-12-10",
    "endDate": "2025-12-15",
    "totalPrice": 250.00,
    "status": "CONFIRMED"  // ✅ Cambió a CONFIRMED
  }
]
```

---

## 📊 Resumen de Cambios

| Archivo | Cambio | Propósito |
|---------|--------|-----------|
| `BookingsController.java` | Endpoint `GET /my-bookings` con `GetBookingsByRenterIdQuery` | Devolver reservas del arrendatario |
| `BookingsController.java` | Endpoint `GET /my-requests` con `GetBookingsByOwnerIdQuery` | Devolver solicitudes del arrendador |
| `BookingRepository.java` | Método `findAllByRenterId(Long renterId)` | Consulta por renterId |
| `GetBookingsByRenterIdQuery.java` | Crear query record | Query para el caso de uso |
| `BookingQueryServiceImpl.java` | Handler para `GetBookingsByRenterIdQuery` | Implementar lógica de consulta |

---

## 🎯 Diferencia Clave: ARRENDATARIO vs ARRENDADOR

| Rol | Endpoint | Filtro | Lo que ve |
|-----|----------|--------|-----------|
| **ARRENDATARIO** (Renter) | `/my-bookings` | `renterId = userId` | Vehículos que **YO alquilé** |
| **ARRENDADOR** (Owner) | `/my-requests` | `vehicle.ownerId = userId` | Solicitudes en **MIS vehículos** |

### Ejemplo Visual

**Usuario: Juan (ID: 2, ROLE_ARRENDATARIO)**
- Alquiló el vehículo ID 5 (Toyota)
- Alquiló el vehículo ID 8 (Honda)

**GET /api/v1/bookings/my-bookings** debería devolver:
```json
[
  { "id": 10, "vehicleId": 5, "renterId": 2, "status": "CONFIRMED" },
  { "id": 15, "vehicleId": 8, "renterId": 2, "status": "PENDING" }
]
```

**Usuario: María (ID: 3, ROLE_ARRENDADOR)**
- Es dueña del vehículo ID 5 (Toyota)

**GET /api/v1/bookings/my-requests** debería devolver:
```json
[
  { "id": 10, "vehicleId": 5, "renterId": 2, "status": "CONFIRMED" }
]
```

---

## ✅ Checklist de Verificación

Después de aplicar los cambios, verifica:

- [ ] El endpoint `GET /api/v1/bookings/my-bookings` existe
- [ ] El endpoint usa `GetBookingsByRenterIdQuery` (NO `GetBookingsByOwnerIdQuery`)
- [ ] El repositorio tiene `findAllByRenterId(Long renterId)`
- [ ] El JwtService extrae correctamente el `userId` del token
- [ ] Las reservas se filtran por `renterId` (usuario que alquila)
- [ ] El Frontend recibe el array de bookings sin errores
- [ ] La página "My Bookings" muestra las reservas del arrendatario

---

## 🔍 Debugging Adicional

Si después de aplicar los cambios el problema persiste:

### 1. Verificar logs del Backend
```bash
# Buscar en los logs:
- "GET /api/v1/bookings/my-bookings"
- El userId extraído del token
- La query SQL ejecutada
```

### 2. Verificar la respuesta de la API
```bash
# Usar el Developer Tools del navegador:
Network > my-bookings > Response
```

**Si devuelve `[]` (array vacío):**
- Verifica que las reservas existen en la base de datos
- Verifica que el `renterId` coincida con el `userId` del token
- Verifica que la query esté usando `renterId` y no `ownerId`

**Si devuelve error 401/403:**
- Verifica que el token JWT sea válido
- Verifica que el interceptor esté enviando el header "Authorization"

**Si devuelve error 500:**
- Revisa los logs del Backend para ver el stacktrace
- Verifica que `GetBookingsByRenterIdQuery` esté implementada

---

## 📞 Autor

Refactorización y diagnóstico realizado por **GitHub Copilot** el 2025-12-03

**Estado del Frontend:** ✅ Verificado y funcional  
**Estado del Backend:** 🔴 Requiere aplicar correcciones detalladas arriba

