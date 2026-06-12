# ARMY MOVES — Operación Delta (v2.0)

Réplica-homenaje del clásico **Army Moves** de Dinamic Software (1986),
reconstruida desde cero en HTML5/Canvas con código y arte originales.
Sin dependencias, sin build: abre `index.html` y juega.

## Cómo ejecutarlo

```bash
# opción 1: abrir index.html directamente en el navegador
# opción 2 (recomendada):
cd army-moves
python3 -m http.server 8080   # → http://localhost:8080
```

## Las 5 misiones (como el original: vehículos primero, infantería después)

| # | Misión | Modo | Jefe |
|---|--------|------|------|
| 1 | El Puente del Diablo | Jeep: salta tramos derruidos, esquiva minas y bombarderos | — |
| 2 | Halcón Nocturno | Helicóptero: cazas, misiles SAM teledirigidos, bombardeo a tierra | — |
| 3 | Selva Hostil | Infantería: trincheras, minas, patrullas | Super-tanque |
| 4 | Paso Helado | Infantería bajo la ventisca | Apache Rojo |
| 5 | Cuartel General | Asalto final a la base | Fortaleza |

Al ganar se revela el código **15315** — el mismo que el Army Moves de 1986
daba para acceder a la segunda parte.

## Controles

| Acción | Teclado | Mando | Táctil |
|--------|---------|-------|--------|
| Mover (y volar en el helicóptero) | ←→↑↓ / WASD | stick o cruceta (analógico en heli) | **joystick virtual flotante** (pulgar izquierdo, aparece donde toques) |
| Saltar | ↑ / W / Espacio | A | ⬆ o **joystick hacia arriba** |
| Agacharse | ↓ / S | cruceta ↓ | joystick hacia abajo |
| Disparar | X / J / Ctrl | X / RT | ◉ |
| Especial (granada · antiaéreo · bomba) | C / Z / K / Shift | B / RB | 💣 / 🚀 / 💥 |
| Pausa | P / Esc | Start | ⏸ |
| Salir al menú principal | — | — | ⌂ (siempre visible en partida) |

### Diseñado para móvil

- Joystick flotante con eje analógico (control fino del helicóptero) y zona
  muerta; los botones tienen radio de acierto inflado y cualquier toque libre
  en la zona derecha dispara la acción primaria.
- Multitáctil real con seguimiento por puntero (deslizar el dedo no corta la acción).
- Botones ⌂ (salir al menú) y ⏸ (pausa) pequeños en la esquina superior derecha.
- Vibración háptica (golpes, explosiones, jefes, recompensas) — desactivable.
- Pantalla completa y bloqueo horizontal automáticos al primer toque;
  aviso de «gira el dispositivo» y pausa automática en vertical.
- Botones y joystick escalan con `vmin` y respetan las *safe areas* (notch).

En el título se configuran por tacto o tecla: **M**úsica · **S**onido ·
**V**ibración · **C**RT.

## Características

- 3 esquemas de juego (run-and-gun, conducción con física de salto, vuelo libre con inercia)
- 10 tipos de enemigo + 3 jefes con fases de comportamiento
- Música chiptune secuenciada y efectos sintetizados por Web Audio (sin assets)
- Power-ups, combos, continuaciones, tabla de récords persistente
- Bucle a 60 fps con timestep fijo (estable en pantallas de 120 Hz)
- Pausa automática al perder el foco; opciones persistentes

### Apartado visual (look actual)

- Render interno a **2× (960×540)**: texto, curvas y degradados suaves
- **Iluminación aditiva**: balas trazadoras con halo, explosiones con bola de
  fuego y onda expansiva, sol/luna con bloom, postquemadores, hogueras
- **Sombras suaves** bajo todas las unidades (las aéreas, proyectadas al suelo)
- Cielos cinematográficos de 4 paradas con **niebla atmosférica de profundidad**
- Agua con degradado y destellos especulares; gradación de color *teal & orange*
- HUD de juego moderno: paneles redondeados translúcidos y barras con degradado
- Modo **CRT retro opcional** (scanlines), ahora desactivado por defecto

## Estructura

```
index.html        casco DOM + UI táctil
css/style.css     escalado 16:9, botones táctiles, safe-areas
js/core.js        constantes, utilidades, guardado
js/audio.js       SFX sintetizados + secuenciador de música
js/input.js       teclado + táctil + gamepad unificados
js/sprites.js     todos los sprites (pixel art procedural)
js/background.js  temas, parallax, clima, puente, post-FX
js/entities.js    partículas, balas, granadas, enemigos, jugadores
js/game.js        estados, misiones, oleadas, colisiones, HUD, menús
tools/smoke.js    test integral sin navegador (node tools/smoke.js)
```

## Tests

```bash
node tools/smoke.js
```
Simula partidas completas (las 5 fases, jefes, game over, continuar,
pausa, victoria, récords) con stubs de DOM/canvas.

## Publicación en Steam

1. **Empaquetar como app de escritorio** (Electron):
   ```bash
   npm init -y && npm i -D electron electron-builder
   ```
   `main.js` mínimo: una `BrowserWindow` 1280×720 (`fullscreenable`,
   `autoHideMenuBar`) que cargue `index.html`. El juego ya escala a
   cualquier resolución 16:9 y soporta mando, imprescindible para Steam Deck.
   Alternativa más ligera: [Tauri](https://tauri.app).
2. **Integración Steamworks**: [steamworks.js](https://github.com/ceifa/steamworks.js)
   para logros (p. ej. «Cruza el puente sin caer», «Precisión > 80 %»),
   y reemplazar `localStorage` por Steam Cloud si se desea.
3. **Checklist de la página de tienda**: cápsulas (616×353, 231×87…),
   6+ capturas 1920×1080, tráiler, descripción ES/EN.
4. **Aviso legal**: «Army Moves» es una marca de su titular. Para venta
   comercial renombra el juego (p. ej. *Operación Delta*) o licencia la IP;
   este proyecto es un homenaje con código y arte 100 % propios.

---
v2.0 · Homenaje a Dinamic Software (1986) · Hecho con Canvas 2D y Web Audio
