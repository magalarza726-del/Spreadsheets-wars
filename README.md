# Spreadsheets Wars — V2.1

Juego de conquista territorial inspirado en una hoja de cálculo. La misma base JavaScript sirve para GitHub Pages y el APK Android offline.

## Partida
- Duración fija de 1:30; muerte súbita durante los últimos 30 segundos, con parejas simétricas de power-ups cada 5 segundos (antes, cada 10).
- Tamaños de tablero: 30×30, 50×50, 70×70.
- Mapa sorteado en cada partida: Normal, Everest o Cráter. Las celdas derrumbadas no se pueden cruzar ni pintar.
- Al iniciar se muestra 3, 2, 1 y el nombre del mapa elegido; al finalizar la música se desvanece durante 2,7 segundos.
- J1/J2: 25 celdas/s. COM: Fácil 10, Normal 15, Difícil 20 y Experto 25 celdas/s.

## Power-ups (automáticos al pisar una casilla verde)
- INSERTAR: explosión 7×7 inmediata.
- SUMA: tres celdas por paso, 10 segundos.
- PRODUCTO: exactamente cinco celdas distribuidas en forma de cruz dentro de 5×5 (centro y cuatro extremos), a la mitad de velocidad durante 4 segundos.
- PROMEDIO: el doble de velocidad durante 6 segundos.
- CONCATENAR: el rival pinta de tu color durante 1 segundo.
- BUSCARV: teletransporte temporal cerca del rival, 3 segundos.
- SI.CONTAR: dash recto a 75 celdas/s durante 0,5 segundos; conserva su rumbo aunque se suelte el control.

## Pantallas
El lateral del menú solo muestra Inicio y Configuración. Encabezado: «Se conquista celda por celda». En Crear partida se elige únicamente tamaño del tablero y dificultad de COM si corresponde, seguido de la nota con duración fija y mapa aleatorio. En Configuración se personaliza la música y, en Android, el tamaño y la posición de los joysticks.

## Web
GitHub Pages: https://magalarza726-del.github.io/Spreadsheets-wars/
La versión de escritorio admite flechas para J1 y WASD para J2.

## Android offline
El proyecto está en `android/` (Java y Gradle). WebViewAssetLoader sirve los HTML/JS/CSS/MP3 incluidos en el APK sin permiso INTERNET. El user agent `SpreadsheetsWarsAndroid` activa los joysticks en el APK. Al actualizar main, GitHub Actions ejecuta pruebas y compila el nuevo APK. Versión 2.1.
Las pistas predeterminadas incluidas dependen de cuáles estén presentes en `music/` al momento de compilar.

## Pruebas
Desde el repositorio: `npm test`. Se comprueban las reglas, la UI, la música, la IA y los controles.
