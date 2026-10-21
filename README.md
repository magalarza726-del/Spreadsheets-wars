# Spreadsheets Wars — V2.5

Juego de conquista territorial con estética de hoja de cálculo. La misma base web funciona en GitHub Pages y Android offline.

## Partida

- Tamaños independientes: 30×30, 50×50 y 70×70.
- **Tipo de mapa seleccionable:** Normal (sin obstáculos), Everest (celdas que caen), Cráter (X bloqueada del 10 %) y **Random** (sortea Normal, Everest o Cráter al iniciar). Por defecto, Random.
- Todas las partidas duran 1:30. Durante los últimos 30 segundos, Muerte súbita duplica la frecuencia de aparición de poderes: cada 5 segundos en lugar de cada 10.
- Los power-ups aparecen en parejas de posiciones reflejadas, y no pueden ocupar celdas bloqueadas.

## Power-ups activos (cinco)

- INSERTAR: pintura 7×7 instantánea.
- SUMA: pinta tres celdas por paso, durante 10 segundos.
- PROMEDIO: duplica la velocidad durante 6 segundos.
- CONCATENAR: el rival pinta con tu color durante 1 segundo.
- BUSCARV: transporta al jugador cerca del rival durante 3 segundos y lo devuelve.

**PRODUCTO y SI.CONTAR fueron eliminados por completo**: ya no aparecen ni pueden activarse.

## Plataformas

- **GitHub Pages:** por defecto J1 (izquierda) usa WASD y J2 (derecha) usa flechas. En Configuración → «Intercambiar botones» puedes invertir ambos esquemas; queda guardado en el navegador.
- **APK Android offline:** joystick táctil configurable por jugador y música empaquetada desde `music/*.mp3`. No necesita internet para jugar.
- J1 vs COM conserva estrategias y velocidades Fácil 10 c/s, Normal 15 c/s, Difícil 20 c/s, Experto 25 c/s. Velocidad humana 25 c/s.
- Menú con Inicio y Configuración. La cuenta atrás 3, 2, 1 anuncia el mapa finalmente elegido, incluso con Random.
- Al terminar la partida la música disminuye progresivamente.

## Desarrollo

Código fuente en HTML, CSS y módulos ES JavaScript. Motor independiente del DOM en `core.js`. Para pruebas usa `npm test`; GitHub Actions publica automáticamente GitHub Pages y compila el APK desde la misma fuente.


## V2.3 · Cruce J1/COM y márgenes Android

- Los jugadores pueden encontrarse y cruzarse en la misma celda sin finalizar la partida. En una celda compartida, el último en pasar determina el color y ambos marcadores se dibujan separados.
- Se añadieron pruebas de colisión, cruces repetidos, recogida de power-ups en celdas compartidas y conteo territorial.
- Android usa un marco nativo de aproximadamente **5 mm por cada lado**, además del espacio ocupado por barras del sistema y recortes de pantalla. Esto protege los controles frente a la barra de navegación y cámaras.
- Si Android cierra inesperadamente el proceso de renderización de WebView, la actividad se recupera en lugar de cerrarse por completo (la partida en curso puede reiniciarse).
- Se mantiene el motor, los cinco power-ups, los tres mapas más Random y la duración de 1:30.

## V2.4 · Android screen margins and scrollable match results

- Shrinks native Android spacing from 5 mm to **2 mm per side**, in addition to real system bar/cutout insets.
- The victory modal can scroll vertically on short landscape phone screens; both scores and the **Revancha** / **Menú principal** buttons remain reachable.
- Short-height viewports receive slightly tighter typography and score-card padding; normal-size screens retain their centered results dialog.
- No gameplay, music or joystick rules were changed.

## V2.5 · Teclados intercambiables (GitHub Pages)

- Por defecto **J1 WASD** y **J2 flechas**, incluidos los rótulos dentro de las hojas.
- En **Configuración**, el botón **Intercambiar botones** alterna ambas asignaciones y conserva la elección con localStorage.
- En J1 vs COM, las teclas de J1 siguen la misma preferencia; COM conserva su movimiento automático.
- Android sigue usando joystick, sin mostrar la opción de teclado.
