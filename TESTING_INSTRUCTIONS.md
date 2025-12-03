# 🧪 INSTRUCCIONES DE PRUEBA - Sistema de Tracking

## 🚀 Cómo Probar la Implementación

### Paso 1: Iniciar el Servidor
```bash
cd "E:\Open Source TF\front-end-open-source"
npm start
```

### Paso 2: Abrir en el Navegador
```
http://localhost:4200
```

### Paso 3: Navegar al Componente de Tracking
Dependiendo de tu configuración de rutas, navega a la ruta del tracking component.

---

## ✅ TESTS A REALIZAR

### Test 1: Verificar que el Mapa se Muestra
**Objetivo:** Confirmar que Leaflet está funcionando

**Pasos:**
1. Abrir la página de tracking
2. Verificar que se muestra un mapa real de Lima
3. Intentar hacer zoom in/out
4. Intentar arrastrar el mapa

**Resultado Esperado:**
- ✅ Mapa de OpenStreetMap visible
- ✅ Controles de zoom funcionando
- ✅ Mapa interactivo (arrastrable)
- ✅ Se ve Lima, Perú

---

### Test 2: Verificar Animación Fluida
**Objetivo:** Confirmar que la interpolación funciona

**Pasos:**
1. Hacer clic en "Iniciar Simulación"
2. Observar DETENIDAMENTE el movimiento del auto
3. Verificar que NO hay saltos
4. Confirmar que el movimiento es suave

**Resultado Esperado:**
- ✅ Auto se mueve suavemente
- ✅ NO hay teletransportación
- ✅ Movimiento fluido sin interrupciones
- ✅ Icono de auto visible

**🔍 Señal de Éxito:**
El auto debe moverse como si estuviera realmente conduciendo, no saltando entre puntos.

---

### Test 3: Verificar Datos en Tiempo Real
**Objetivo:** Confirmar que los datos se actualizan

**Pasos:**
1. Iniciar simulación
2. Mirar la tarjeta de información a la derecha
3. Observar la velocidad
4. Observar el combustible

**Resultado Esperado:**
- ✅ Velocidad cambia constantemente (20-60 km/h)
- ✅ Combustible disminuye gradualmente
- ✅ Estado muestra "En movimiento"
- ✅ Animación de "pulse" en el estado

---

### Test 4: Verificar la Ruta
**Objetivo:** Confirmar que la polyline se dibuja

**Pasos:**
1. Observar el mapa después de que cargue
2. Buscar una línea azul
3. Verificar que va de Miraflores a San Isidro

**Resultado Esperado:**
- ✅ Línea azul visible en el mapa
- ✅ Línea conecta los puntos de la ruta
- ✅ Color: #2196F3 (azul)
- ✅ Grosor visible (4px)

---

### Test 5: Verificar Controles
**Objetivo:** Confirmar que los botones funcionan

**Pasos:**
1. Estado inicial: Ambos botones visibles
2. Hacer clic en "Iniciar Simulación"
   - Verificar que "Iniciar" se deshabilita
   - Verificar que "Detener" se habilita
3. Hacer clic en "Detener"
   - Verificar que el auto se detiene
   - Verificar que la velocidad va a 0
   - Verificar que "Iniciar" se habilita
4. Iniciar nuevamente

**Resultado Esperado:**
- ✅ Botones cambian de estado correctamente
- ✅ "Iniciar" solo funciona cuando está detenido
- ✅ "Detener" solo funciona cuando está en movimiento
- ✅ Los botones tienen colores distintos (verde/rojo)

---

### Test 6: Verificar Popup
**Objetivo:** Confirmar que el popup es interactivo

**Pasos:**
1. Iniciar simulación
2. Hacer clic en el icono del auto
3. Observar el popup que aparece
4. Mantener el popup abierto y observar

**Resultado Esperado:**
- ✅ Popup se abre al hacer clic
- ✅ Muestra nombre del arrendatario
- ✅ Muestra velocidad actual
- ✅ Muestra combustible actual
- ✅ Los datos se actualizan en tiempo real

---

### Test 7: Verificar Responsive
**Objetivo:** Confirmar que funciona en diferentes tamaños

**Pasos:**
1. Abrir en pantalla completa
2. Redimensionar la ventana del navegador
3. Hacer la ventana muy pequeña
4. Probar en diferentes tamaños

**Resultado Esperado:**
- ✅ En pantalla grande: Grid de 2 columnas
- ✅ En pantalla pequeña (<1024px): 1 columna
- ✅ Mapa siempre visible
- ✅ Tarjeta siempre legible

---

### Test 8: Verificar Reinicio Automático
**Objetivo:** Confirmar que la simulación se reinicia

**Pasos:**
1. Iniciar simulación
2. Esperar hasta que el auto llegue al final de la ruta
3. Observar qué sucede

**Resultado Esperado:**
- ✅ El auto vuelve al inicio automáticamente
- ✅ El combustible se resetea a 100%
- ✅ La simulación continúa sin detener

---

### Test 9: Verificar Agotamiento de Combustible
**Objetivo:** Confirmar que se detiene sin combustible

**Pasos:**
1. Modificar temporalmente el código:
   ```typescript
   // En updateVehicleData(), cambiar:
   this.currentFuel = Math.max(0, this.currentFuel - 5); // 5 en vez de 0.05
   ```
2. Iniciar simulación
3. Esperar a que el combustible llegue a 0

**Resultado Esperado:**
- ✅ Simulación se detiene automáticamente
- ✅ Aparece alerta: "¡El vehículo se ha quedado sin combustible!"
- ✅ Velocidad va a 0

---

### Test 10: Verificar Fallback
**Objetivo:** Confirmar que funciona sin backend

**Pasos:**
1. Asegurarse de que el backend NO está corriendo
2. Iniciar la aplicación
3. Navegar al tracking
4. Observar la consola del navegador

**Resultado Esperado:**
- ✅ El mapa se muestra igual
- ✅ Se dibuja una ruta simulada
- ✅ La animación funciona normalmente
- ✅ Mensaje en consola sobre fallback (opcional)

---

## 🎯 CHECKLIST DE PRUEBAS

Marca cada uno después de probarlo:

- [ ] Mapa se muestra correctamente
- [ ] Animación es fluida (sin saltos)
- [ ] Velocidad se actualiza en tiempo real
- [ ] Combustible disminuye gradualmente
- [ ] Ruta azul visible en el mapa
- [ ] Botón "Iniciar" funciona
- [ ] Botón "Detener" funciona
- [ ] Popup es interactivo
- [ ] Responsive funciona
- [ ] Reinicio automático funciona
- [ ] Alerta de combustible funciona
- [ ] Fallback funciona sin backend

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Problema: El mapa no aparece
**Solución:**
1. Verificar la consola del navegador
2. Asegurarse de que `leaflet.css` está cargado
3. Verificar que el contenedor `#map` tiene altura

### Problema: El auto se mueve a saltos
**Solución:**
1. Verificar que `interpolateRoute()` se está ejecutando
2. Aumentar el valor de `pointsPerSegment`
3. Revisar la consola por errores

### Problema: Los datos no se actualizan
**Solución:**
1. Verificar que la animación está corriendo
2. Revisar que `updateVehicleData()` se está llamando
3. Verificar la consola por errores

### Problema: Los botones no funcionan
**Solución:**
1. Verificar que no hay errores en la consola
2. Asegurarse de que los eventos click están vinculados
3. Revisar que `startSimulation()` y `stopSimulation()` existen

---

## 📊 MÉTRICAS A OBSERVAR

Durante las pruebas, observa:

1. **FPS (Frames Per Second)**
   - Abrir DevTools → Performance
   - Iniciar grabación
   - Iniciar simulación
   - Detener después de 5 segundos
   - Verificar que el FPS esté cerca de 60

2. **Memoria**
   - Abrir DevTools → Memory
   - Tomar snapshot inicial
   - Iniciar/detener simulación varias veces
   - Tomar snapshot final
   - Verificar que no hay memory leaks significativos

3. **Red (Network)**
   - Abrir DevTools → Network
   - Recargar la página
   - Verificar que `leaflet.css` se carga
   - Verificar que las tiles del mapa se cargan

---

## ✅ CRITERIOS DE ÉXITO

La implementación es exitosa si:

1. ✅ El mapa se renderiza correctamente
2. ✅ El auto se mueve de forma fluida (SIN saltos)
3. ✅ Los datos se actualizan en tiempo real
4. ✅ Los controles funcionan correctamente
5. ✅ La aplicación es responsive
6. ✅ No hay errores en la consola
7. ✅ El rendimiento es bueno (~60 FPS)
8. ✅ Funciona con y sin backend

---

## 🎉 RESULTADO ESPERADO

Después de todas las pruebas, deberías ver:

```
╔════════════════════════════════════════╗
║                                        ║
║  🗺️  Mapa interactivo de Lima        ║
║  🚗  Auto moviéndose suavemente       ║
║  📊  Velocidad cambiando: 45 km/h     ║
║  ⛽  Combustible: 87.3%                ║
║  🟢  Estado: En movimiento            ║
║  🎮  Controles funcionando            ║
║                                        ║
║  ✅ TODO FUNCIONA PERFECTAMENTE       ║
║                                        ║
╚════════════════════════════════════════╝
```

---

## 📹 VIDEO DE DEMOSTRACIÓN (Opcional)

Considera grabar un video corto mostrando:
1. Inicio de la aplicación
2. Hacer clic en "Iniciar Simulación"
3. Auto moviéndose suavemente
4. Datos actualizándose
5. Hacer clic en "Detener"
6. Reiniciar

Esto será útil para documentación y presentaciones.

---

## 📝 REPORTE DE PRUEBAS

Después de completar las pruebas, documenta:

**Fecha de Prueba:** _______________

**Navegador:** _______________

**Resultados:**
- Mapa: ✅ / ❌
- Animación: ✅ / ❌
- Datos: ✅ / ❌
- Controles: ✅ / ❌
- Responsive: ✅ / ❌

**Observaciones:**
_________________________________
_________________________________
_________________________________

**Conclusión:**
□ Todas las pruebas pasaron exitosamente
□ Hay problemas menores (especificar)
□ Hay problemas mayores (especificar)

---

**¡Feliz Testing!** 🧪🎉

