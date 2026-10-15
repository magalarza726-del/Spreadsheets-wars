# Spreadsheets Wars 🎨📊

Un juego local de conquista territorial con una interfaz inspirada en las hojas de cálculo. Diseñado para **GitHub Pages**: sin backend, cuentas, instalación ni servicios de terceros.

> Proyecto original e independiente, no afiliado a Microsoft ni a Excel.

## Jugar

Abre `index.html` mediante un servidor estático, o publica la raíz del repositorio en GitHub Pages. El menú ofrece:

- **J1 vs J2:** pantalla dividida verticalmente; ambos recorren **el mismo** tablero, cada uno con su cámara.
- **J1 vs COM:** una sola vista y una computadora que conquista celdas y persigue power-ups.

El tamaño y la duración se seleccionan **de manera independiente**. Cualquiera de los tres mapas puede combinarse con 1, 2 o 3 minutos, o un tiempo personalizado de 0,5 a 15 minutos (pasos de 30 segundos).

| Tablero | Dimensiones | Celdas |
| --- | --- | --- |
| Pequeño | 30 × 30 | 900 |
| Mediano | 50 × 50 | 2.500 |
| Grande | 70 × 70 | 4.900 |

| Duración | Tiempo |
| --- | --- |
| Bala | 1:00 |
| Blitz | 2:00 |
| Rápida | 3:00 |
| Personalizado | 0:30 a 15:00 |

En **J1 vs COM** hay cuatro dificultades con velocidades distintas, conservando sus estrategias: **Fácil** (10 c/s) explora de forma más aleatoria; **Normal** (15 c/s) busca casillas y power-ups próximos; **Difícil** (20 c/s) prioriza objetivos y disputa territorio; **Experto** (25 c/s) evalúa concentraciones de casillas y persigue estratégicamente power-ups. El jugador J1 mantiene 25 c/s.

### Controles

- **Jugador 1:** flechas ↑ ↓ ← →.
- **Jugador 2:** W A S D.
- **Esc:** pausar / reanudar.
- **Rueda del ratón:** recorrer la hoja temporalmente; la cámara vuelve a seguir al jugador.
- **Zoom:** control de la barra de estado (65–130%).

Velocidad humana: **25 celdas por segundo (1 celda cada 40 ms)** al mantener la dirección. COM: **10 / 15 / 20 / 25 celdas/s**, según la dificultad elegida; PROMEDIO duplica temporalmente la velocidad individual. Cada movimiento ocupa exactamente una celda. Entrar en una celda rival la convierte a tu color. Las casillas pueden reconquistarse. La barra de conquista muestra territorio por propietario, no golpes acumulados.

### Power-ups simétricos

Cada **10 s** aparece un par de power-ups idénticos, con un miembro en `(x,y)` y otro en `(N-1-x,N-1-y)`, usando coordenadas internas desde 0. Visualmente, `(A1)` se corresponde con la última columna/fila del tablero. Solo aparecen sobre posiciones libres de otros objetos y jugadores.

Las **casillas verde claro** activan el efecto automáticamente al recogerlas. Permanecen disponibles hasta ser recogidas; no se requiere pulsar teclas de habilidades. Las habilidades temporales pueden coexistir y sus temporizadores son independientes.

| Poder | Efecto | Duración |
| --- | --- | --- |
| Bomba | Zona 7 × 7, hasta 49 casillas, limitada por bordes | Inmediato |
| SUMA | Franja de tres celdas perpendicular al movimiento | 10 s |
| PRODUCTO | Cuadrado de 3 × 3 en cada paso | 4 s |
| PROMEDIO | Doble velocidad (20 ms/celda, 50 celdas/s) | 6 s |
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

## Música de partida (V1.4)
Al crear una partida se reproduce una canción aleatoria. Cuando acaba, empieza otra sin repetir inmediatamente la anterior; la música se pausa junto a la partida, se detiene al salir o finalizar y cuenta con volumen, silencio y cambio de pista en la cinta.

Se recibieron **seis MP3 diferentes**, no siete. Esta es la estructura necesaria:

| Canción | Ruta |
| --- | --- |
| Garra de Acero | `music/garra-de-acero.mp3` |
| Garra de Acero (versión 2) | `music/garra-de-acero-2.mp3` |
| Laboratorio X | `music/laboratorio-x.mp3` |
| Marcha de Cero | `music/marcha-de-cero.mp3` |
| Ceniza y Rayo | `music/ceniza-y-rayo.mp3` |
| Pulso de Acero | `music/pulso-de-acero.mp3` |

Los archivos MP3 están incluidos en el ZIP completo de la V1.4. **Para reproducirlos en GitHub Pages hay que subir también los seis MP3 a la carpeta `music/` del repositorio.** El conector de edición de código no permitió adjuntar automáticamente archivos binarios grandes. Hasta entonces, el sitio muestra que la música no está disponible, sin interrumpir el juego. Cuando se entregue la séptima canción, añádela a `music/` y al arreglo `TRACKS` de `music.js`.


## Biblioteca musical desde Configurar partida (V1.5)

En **Configurar partida → Música de la partida → Añadir canciones** se pueden seleccionar varios archivos de audio del dispositivo (MP3, M4A, AAC, WAV, OGG, FLAC y WebM, siempre que el navegador reproduzca el formato; máximo 45 MB por pista). Las canciones aparecen en una lista y se pueden eliminar con **×**. Cuando el jugador añade canciones, se usan esas pistas; alternativamente puede elegir **Solo música incluida** si la carpeta `music/` está publicada. En ambas opciones la selección es aleatoria, sin repetir una canción hasta completar la lista.

Los archivos personales **no se envían al repositorio ni a ningún servidor**. Se almacenan con **IndexedDB** en el propio navegador para reutilizarlos en futuras partidas y visitas desde el mismo origen web. Si el navegador bloquea este almacenamiento, las canciones siguen disponibles durante la sesión actual y la interfaz lo advierte; borrar los datos del sitio también elimina la biblioteca. Para usar la música incluida en GitHub Pages hay que publicar sus MP3 una sola vez; **importar canciones desde el menú no requiere cargar ningún MP3 a GitHub**. La funcionalidad no convierte el juego en PWA, por lo que recargar la web sin conexión puede requerir que el navegador ya conserve los archivos del sitio.
