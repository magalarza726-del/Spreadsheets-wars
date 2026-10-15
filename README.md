# Spreadsheets Wars 🎨📊

Un juego local de conquista territorial con una interfaz inspirada en las hojas de cálculo. Diseñado para **GitHub Pages**: sin backend, cuentas, instalación ni servicios de terceros.

> Proyecto original e independiente, no afiliado a Microsoft ni a Excel.

## Jugar

Abre `index.html` mediante un servidor estático, o publica la raíz del repositorio en GitHub Pages. El menú ofrece:

- **J1 vs J2:** pantalla dividida verticalmente; ambos recorren **el mismo** tablero, cada uno con su cámara.
- **J1 vs COM:** una sola vista y una computadora que conquista celdas y persigue power-ups.

| Modo | Tamaño | Tiempo |
| --- | --- | --- |
| Bala | 20 × 20 | 1:00 |
| Blitz | 30 × 30 | 2:00 |
| Rápida | 60 × 60 | 3:00 |

### Controles

- **Jugador 1:** flechas ↑ ↓ ← →.
- **Jugador 2:** W A S D.
- **Esc:** pausar / reanudar.
- **Rueda del ratón:** recorrer la hoja temporalmente; la cámara vuelve a seguir al jugador.
- **Zoom:** control de la barra de estado (65–130%).

Velocidad: **1 celda cada 250 ms** al mantener la dirección. Cada movimiento ocupa exactamente una celda. Entrar en una celda rival la convierte a tu color. Las casillas pueden reconquistarse. La barra de conquista muestra territorio por propietario, no golpes acumulados.

### Power-ups simétricos

Cada **10 s** aparece un par de power-ups idénticos, con un miembro en `(x,y)` y otro en `(N-1-x,N-1-y)`, usando coordenadas internas desde 0. Visualmente, `(A1)` se corresponde con la última columna/fila del tablero. Solo aparecen sobre posiciones libres de otros objetos y jugadores.

Las **casillas verde claro** activan el efecto automáticamente al recogerlas. Permanecen disponibles hasta ser recogidas; no se requiere pulsar teclas de habilidades. Las habilidades temporales pueden coexistir y sus temporizadores son independientes.

| Poder | Efecto | Duración |
| --- | --- | --- |
| Bomba | Zona 7 × 7, hasta 49 casillas, limitada por bordes | Inmediato |
| SUMA | Franja de tres celdas perpendicular al movimiento | 10 s |
| PRODUCTO | Cuadrado de 3 × 3 en cada paso | 4 s |
| PROMEDIO | Doble velocidad (125 ms/celda) | 6 s |
| CONCATENAR | Durante el efecto el rival pinta con tu color | 2 s |
| ÍNDICE | Salto automático junto al rival; retorno a la posición original | 3 s |

Si SUMA y PRODUCTO coinciden, PRODUCTO determina el área pintada (3×3, que ya contiene las tres celdas de SUMA); PROMEDIO sigue aplicándose. Las celdas fuera de los límites nunca se pintan. Si las habilidades idénticas se vuelven a recoger, se renueva su duración.

En un empate exacto de celdas, el resultado es **empate**.

## Publicar en GitHub Pages

1. Sube estos archivos a la rama `main`, en la raíz.
2. En **Settings → Pages**, elige **Deploy from a branch**, rama **main**, carpeta **/(root)** y guarda.
3. La página debería quedar disponible en `https://magalarza726-del.github.io/Spreadsheets-wars/` una vez que GitHub confirme el despliegue. La URL no estará activa hasta configurar Pages y completar la publicación.

El juego emplea rutas relativas (`./styles.css`, `./app.js`, `./core.js`) para funcionar correctamente desde la subruta del repositorio.

## Desarrollar / probar

```bash
python -m http.server 8000
# Visita http://localhost:8000
npm test
```

`core.js` contiene el motor jugable independiente de la interfaz; `app.js` se ocupa de entradas, ordenador, dibujo y pantallas. `tests/core.test.mjs` ofrece pruebas automatizadas con `node:test` sin paquetes externos.

### Estructura

```text
index.html
styles.css
app.js
core.js
favicon.svg
package.json
tests/core.test.mjs
README.md
```

## Pendiente para V2

Ajuste fino de la IA y balance competitivo con partidas reales, sonido opcional, accesibilidad avanzada y multijugador online. La V1 no incluye sincronización online ni almacenamiento de partidas.