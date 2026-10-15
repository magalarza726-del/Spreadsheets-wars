# Spreadsheets Wars — edición 1.7

Juego de conquista territorial con la apariencia de una hoja de cálculo. Compatible con GitHub Pages; no necesita un servidor para jugar.

## Partidas y velocidades

- J1 vs J2: pantalla dividida, flechas para J1 y WASD para J2. Ambos: 25 celdas/s.
- J1 vs COM: vista individual con cuatro estrategias y velocidades: Fácil 10 c/s, Normal 15 c/s, Difícil 20 c/s y Experto 25 c/s. La IA mantiene sus comportamientos anteriores.
- Tamaños: 30×30, 50×50 y 70×70, independientes del escenario y del modo de tiempo.
- **Bala: 1:30.** Hay una pareja de power-ups simétricos cada 10 segundos. Al llegar a los últimos 30 segundos se activa **Muerte súbita** y aparecen cada 5 segundos.
- **Rápida: 3:00.** Cada 30 segundos aparecen **tres parejas de power-ups simétricos** a la vez (seis casillas verdes, tres oportunidades de cada lado).

## Escenarios

- **Normal**: todas las celdas transitables.
- **Everest**: cada 4 segundos caen dos celdas simétricas seleccionadas al azar. Quedan permanentemente intransitables.
- **Cráter**: una X centrada bloquea exactamente el 10% de las celdas iniciales de cada tablero, con espacio de paso alrededor de sus extremos.

No se puede atravesar ni pintar una celda caída, **ni siquiera con las bombas, SUMA o PRODUCTO**. No aparecen poderes sobre dichas celdas y se excluyen de los porcentajes de conquista. La COM las evita al moverse.

## Guía de power-ups en pantalla principal

- **Bomba**: pinta 7×7 instantáneamente, salvo celdas caídas.
- **SUMA**: 3 celdas por paso durante 10 segundos.
- **PRODUCTO**: 3×3 por paso durante 4 segundos.
- **PROMEDIO**: velocidad doble durante 6 segundos.
- **CONCATENAR**: el rival pinta de tu color durante 2 segundos.
- **ÍNDICE**: teletransporte temporal cerca del rival durante 3 segundos.

## Móvil

En la ventana de configuración elige **No**, **Joystick** o **Flechas**. Los controles táctiles aparecen superpuestos en la hoja de cada jugador; en J1 vs J2 hay dos controladores independientes. El teclado sigue disponible. Se usa Pointer Events y los movimientos conservan la velocidad establecida por dificultad/poder.

## Música

El juego reproduce canciones aleatorias y cambia al terminar una pista; también permite añadir MP3 y otros archivos de audio desde la pantalla de configuración, con biblioteca local y controles de volumen.

El **ZIP completo entregado contiene los seis MP3 originales, sin recortes**, en la carpeta `music/`: dos versiones distintas de Garra de Acero, Laboratorio X, Marcha de Cero, Ceniza y Rayo y Pulso de Acero.

**Para reproducir esas canciones de forma predeterminada en GitHub Pages, los seis archivos MP3 deben estar subidos individualmente al directorio `music/` del repositorio.** El ZIP por sí mismo no cuenta como archivos publicados. La conexión utilizada para actualizar el código no permite transferir directamente estos binarios grandes. Si faltan, el juego funciona de todos modos y se pueden importar las canciones desde el navegador.

## Desarrollo

HTML, CSS, JavaScript ES Modules y Canvas 2D; GitHub Pages. Ejecuta `npm test` en Node.js para validar el motor, las reglas, la IA, la biblioteca de música y las regresiones de interfaz.

## Mejoras móviles V1.8
La partida se adapta a teléfonos tanto en horizontal como en vertical: cinta de Excel y HUD compactos, minimapa ocultable desde **▦ Mapa**, controles táctiles más pequeños, zoom inicial del 75 % y respeto de las áreas seguras. En J1 vs J2 vertical las hojas se apilan para facilitar el uso. El joystick se selecciona automáticamente en móviles salvo que el jugador haya guardado otra preferencia (No / Joystick / Flechas).

### Música predeterminada
Los seis MP3 completos siguen **incluidos en el ZIP descargable**, dentro de `music/`. El conector disponible de GitHub no admite cargar directamente estos archivos binarios grandes; mientras no estén subidos a `music/` en GitHub, el sitio publicado permite añadir canciones desde la configuración, pero no puede reproducir las predeterminadas ausentes. Para llevarlas a Pages se deben transferir los archivos originales a ese directorio. No hay que modificar más código.
