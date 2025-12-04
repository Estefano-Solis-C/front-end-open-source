# 🐛 Guía Rápida de Debugging: "My Bookings" Vacío

## ⚡ Checklist Rápido

### 1. Verificar Frontend ✅ (Ya Corregido)

```bash
# Verificar que la corrección del rol está aplicada
grep -n "ROLE_RENTER" src/app/features/booking/pages/my-bookings/my-bookings.component.ts
# Debería mostrar línea 35 con 'ROLE_RENTER'
```

### 2. Verificar que el Usuario está Autenticado

**Abrir Developer Tools (F12) > Console:**

```javascript
// Ver el usuario actual
JSON.parse(localStorage.getItem('currentUser'))

// Debería mostrar:
// {
//   id: 2,
//   name: "Juan Pérez",
//   email: "juan@example.com",
//   role: "ROLE_RENTER"  // ✅ Debe ser ROLE_RENTER, NO ROLE_ARRENDATARIO
// }
```

### 3. Verificar la Petición HTTP

**Developer Tools > Network tab:**

1. Ir a "My Bookings"
2. Filtrar por `my-bookings`
3. Verificar:

```
Request URL: https://back-end-open-source.onrender.com/api/v1/bookings/my-bookings
Request Method: GET
Status Code: ¿200 OK o error?
Request Headers:
  Authorization: Bearer eyJhbGc...
```

**Posibles Respuestas:**

| Status | Response | Significado | Solución |
|--------|----------|-------------|----------|
| `200 OK` | `[]` | Endpoint funciona pero no hay datos | Verificar filtro en Backend |
| `200 OK` | `[{...}, {...}]` | ✅ TODO FUNCIONA | - |
| `404 Not Found` | - | Endpoint no existe en Backend | Crear endpoint en `BookingsController.java` |
| `401 Unauthorized` | - | Token inválido | Re-login |
| `500 Internal Server Error` | - | Error en Backend | Ver logs del servidor |

### 4. Verificar el Token JWT

```javascript
// En Developer Tools > Console
const token = localStorage.getItem('authToken');
console.log(token);

// Decodificar el token (usar jwt.io o):
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);

// Verificar:
// - userId está presente
// - role es correcto
// - token no está expirado
```

### 5. Verificar los Datos del Backend (SQL)

```sql
-- Verificar que existen reservas para el usuario
SELECT * FROM bookings WHERE renter_id = 2;  -- Cambiar 2 por tu userId

-- Verificar la estructura de la tabla
DESCRIBE bookings;

-- Verificar que el campo renterId existe
-- Si el campo se llama 'user_id' en lugar de 'renter_id', actualizar el repository
```

---

## 🔍 Casos de Debugging Específicos

### Caso 1: "No veo mis reservas pero sé que las creé"

**Posible causa:** El Backend filtra por `ownerId` en lugar de `renterId`

**Verificar en BookingsController.java:**
```java
// ❌ INCORRECTO
var query = new GetBookingsByOwnerIdQuery(userId);

// ✅ CORRECTO
var query = new GetBookingsByRenterIdQuery(userId);
```

---

### Caso 2: "Error 404 en /my-bookings"

**Posible causa:** El endpoint no existe en el Backend

**Verificar en BookingsController.java:**
```java
// Buscar:
@GetMapping("/my-bookings")
public ResponseEntity<List<BookingResource>> getMyBookings(...)

// Si no existe, agregarlo según las instrucciones en BACKEND_FIX_MY_BOOKINGS.md
```

---

### Caso 3: "Error 500 en /my-bookings"

**Posible causa:** El método del repository no existe o el nombre del campo es incorrecto

**Verificar en BookingRepository.java:**
```java
// ¿Existe este método?
List<Booking> findAllByRenterId(Long renterId);

// Si el campo en la entidad es 'userId' en lugar de 'renterId', usar:
List<Booking> findAllByUserId(Long userId);

// Si hay relación @ManyToOne con User:
List<Booking> findAllByRenter_Id(Long renterId);
```

---

### Caso 4: "El endpoint devuelve [] pero hay reservas en la BD"

**Posible causa:** El filtro usa el campo incorrecto o el userId no coincide

**Debugging paso a paso:**

1. **Agregar logs en BookingsController.java:**
```java
@GetMapping("/my-bookings")
public ResponseEntity<List<BookingResource>> getMyBookings(@RequestHeader("Authorization") String auth) {
    String token = auth.replace("Bearer ", "");
    Long userId = jwtService.extractUserId(token);
    
    System.out.println("=== MY BOOKINGS DEBUG ===");
    System.out.println("User ID: " + userId);
    
    var query = new GetBookingsByRenterIdQuery(userId);
    var bookings = queryService.handle(query);
    
    System.out.println("Bookings found: " + bookings.size());
    bookings.forEach(b -> System.out.println("  - Booking ID: " + b.getId() + ", RenterId: " + b.getRenterId()));
    
    // ... resto del código
}
```

2. **Verificar en la base de datos:**
```sql
-- Usar el userId que aparece en los logs
SELECT id, vehicle_id, renter_id, status FROM bookings WHERE renter_id = {userId};
```

3. **Comparar:**
   - ¿El userId del token coincide con el renter_id de las reservas?
   - ¿El método del repository está buscando en el campo correcto?

---

### Caso 5: "Página siempre muestra 'cargando...'"

**Posible causa:** Error en el componente que impide completar el Observable

**Verificar en my-bookings.component.ts:**

```typescript
ngOnInit(): void {
  this.authService.currentUser$.pipe(
    take(1),
    switchMap(user => {
      console.log('Current user:', user);  // ✅ Agregar log
      
      if (user && user.role === 'ROLE_RENTER') {  // ✅ Verificar que esta condición es true
        console.log('Fetching bookings...');  // ✅ Agregar log
        return this.getMyBookings.execute();
      }
      console.log('User is not RENTER or not logged in');  // ✅ Agregar log
      return of([]);
    }),
    // ...
  ).subscribe({
    next: detailedBookings => {
      console.log('Bookings received:', detailedBookings);  // ✅ Agregar log
      this.bookingsWithDetails = detailedBookings;
      this.isLoading = false;
    },
    error: err => {
      console.error('Error loading bookings:', err);  // ✅ Agregar log
      this.isLoading = false;  // ✅ Importante: Quitar el loading en caso de error
    }
  });
}
```

---

## 📋 Checklist de Verificación Completa

Usa esta lista para verificar sistemáticamente cada parte del flujo:

### Frontend ✅

- [ ] Usuario está autenticado (localStorage tiene 'currentUser' y 'authToken')
- [ ] Rol del usuario es 'ROLE_RENTER' (no 'ROLE_ARRENDATARIO')
- [ ] Componente ejecuta la validación `user.role === 'ROLE_RENTER'` correctamente
- [ ] `BookingService.getMyBookings()` llama a `/my-bookings`
- [ ] Interceptor agrega el header `Authorization: Bearer {token}`
- [ ] No hay errores en la consola del navegador
- [ ] Network tab muestra la petición a `/my-bookings`

### Backend 🔴

- [ ] Endpoint `GET /api/v1/bookings/my-bookings` existe en `BookingsController.java`
- [ ] Endpoint usa `GetBookingsByRenterIdQuery(userId)` (NO `GetBookingsByOwnerIdQuery`)
- [ ] `JwtService.extractUserId(token)` funciona correctamente
- [ ] `BookingRepository.findAllByRenterId(Long renterId)` existe
- [ ] Query `GetBookingsByRenterIdQuery` existe y está registrada
- [ ] `BookingQueryServiceImpl` tiene handler para `GetBookingsByRenterIdQuery`
- [ ] Entidad `Booking` tiene el campo `renterId` (o el nombre correcto del campo)
- [ ] Los logs del servidor no muestran errores

### Base de Datos 💾

- [ ] Tabla `bookings` existe
- [ ] Existe columna `renter_id` (o `user_id` según tu schema)
- [ ] Hay registros en `bookings` con `renter_id = {userId del usuario actual}`
- [ ] El valor de `renter_id` coincide con el `id` del usuario autenticado

---

## 🚨 Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "Cannot read property 'role' of null" | Usuario no autenticado | Verificar que el login funciona y guarda el usuario |
| "Validación de rol siempre false" | Rol normalizado vs rol original | Usar `ROLE_RENTER` no `ROLE_ARRENDATARIO` |
| "404 en /my-bookings" | Endpoint no existe | Crear endpoint en `BookingsController.java` |
| "500 en /my-bookings" | Error en Backend | Ver logs del servidor y verificar repository |
| "[] respuesta vacía" | Filtro incorrecto | Usar `renterId` no `ownerId` |
| "Página se queda en loading" | Error no capturado | Agregar `.subscribe({ error: ... })` |

---

## 🎯 Test End-to-End

Para verificar que TODO funciona correctamente:

### Paso 1: Crear Test User

```sql
-- Usuario Arrendatario
INSERT INTO users (id, name, email, password, role) 
VALUES (999, 'Test Renter', 'test-renter@example.com', '$2a$10$...', 'ROLE_ARRENDATARIO');

-- Usuario Arrendador
INSERT INTO users (id, name, email, password, role) 
VALUES (998, 'Test Owner', 'test-owner@example.com', '$2a$10$...', 'ROLE_ARRENDADOR');

-- Vehículo del Owner
INSERT INTO vehicles (id, brand, model, year, price_per_day, status, owner_id) 
VALUES (999, 'Toyota', 'Test Car', 2023, 50.0, 'available', 998);

-- Reserva del Renter
INSERT INTO bookings (id, vehicle_id, renter_id, start_date, end_date, total_price, status) 
VALUES (999, 999, 999, '2025-12-10', '2025-12-15', 250.0, 'CONFIRMED');
```

### Paso 2: Probar Flujo Completo

1. **Login como Renter:**
   - Email: `test-renter@example.com`
   - Password: (tu contraseña)

2. **Verificar en Console:**
   ```javascript
   JSON.parse(localStorage.getItem('currentUser'))
   // Debería mostrar role: "ROLE_RENTER"
   ```

3. **Ir a "My Bookings":**
   - URL: `/my-bookings`
   - Debería mostrar 1 booking (el que insertaste)

4. **Verificar Network:**
   - Debería hacer GET a `/my-bookings`
   - Status: 200 OK
   - Response: Array con 1 booking

5. **Verificar Vista:**
   - Debería mostrar card con "Toyota Test Car"
   - Status: "CONFIRMED"
   - Fechas: 10-15 Dic 2025
   - Precio: S/ 250.00

---

## 📞 Contacto para Soporte

Si después de seguir esta guía el problema persiste:

1. Captura de pantalla de:
   - Network tab con la petición a `/my-bookings`
   - Console con cualquier error
   - La vista de "My Bookings"

2. Logs del Backend (últimas 50 líneas cuando haces la petición)

3. Query SQL:
   ```sql
   SELECT * FROM bookings WHERE renter_id = {tu_userId};
   ```

---

**Autor:** GitHub Copilot  
**Fecha:** 2025-12-03  
**Versión:** 1.0

