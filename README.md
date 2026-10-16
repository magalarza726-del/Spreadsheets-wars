# Spreadsheets Wars · V2.0

Juego de conquista territorial inspirado visualmente en una hoja de cálculo. Funciona en GitHub Pages y dentro del APK Android **offline** desde el mismo código base.

## Reglas actuales

- **Partidas de 1:30 exclusivamente**, en tres tamaños independientes: 30×30, 50×50 y 70×70.
- **El escenario se sortea en cada partida** entre Normal, Everest y Cráter (no es seleccionable). Everest derrumba dos celdas simétricas cada cuatro segundos; Cráter bloquea una X de aproximadamente el 10 % del tablero. Las celdas caídas no pueden atravesarse ni pintarse.
- **Bala**: una pareja de power-ups simétricos cada 10 segundos. En los últimos 30 segundos comienza **Muerte súbita** y aparecen cada 5 segundos.
- **Cuenta atrás de 3, 2, 1** antes del primer movimiento, sin consumir tiempo de partida. La música comienza durante esa cuenta atrás.
- Al terminar, aparece la pantalla de victoria y **la música se difumina durante 2,7 segundos** en lugar de detenerse bruscamente.

## Power-ups (se activan automáticamente)

| Poder | Efecto | Duración |
| --- | --- | --- |
| INSERTAR | Explosión de pintura de 7 × 7 celdas | Instantáneo |
| SUMA | Pinta tres celdas por paso, en línea transversal | 10 s |
| PRODUCTO | Pinta cinco celdas por paso en cruz y reduce la velocidad a la mitad | 4 s |
| PROMEDIO | Duplica la velocidad de movimiento | 6 s |
| CONCATENAR | El rival pinta de tu color | 1 s |
| BUSCARV | Se transporta cerca del rival y regresa al terminar | 3 s |

PRODUCTO y PROMEDIO pueden coincidir: **sus efectos de velocidad se compensan** mientras ambos duren. PRODUCTO prevalece sobre SUMA para definir la forma de pintado.

## Interfaz

La pantalla principal tiene botones **J1 vs J2**, **J1 vs COM**, **Guía de poderes** y **Configuración**. La configuración de partida solamente pide **tamaño del tablero** y, si aplica, **dificultad de COM**. Dificultades COM: Fácil 10, Normal 15, Difícil 20 y Experto 25 celdas/segundo. J1/J2: 25 celdas/segundo.

**Configuración** abre una ventana independiente donde se pueden importar canciones propias, seleccionar música y controlar el volumen. En la **aplicación Android**, también contiene una vista previa para arrastrar el joystick de cada jugador, ajustar tamaño entre el 70 % y el 180 % y restablecer su ubicación. Estas posiciones se guardan localmente.

**GitHub Pages/PC** emplea teclado (flechas J1 y WASD J2) sin opción de panel táctil. El **APK Android** siempre utiliza joystick táctil, con un control por jugador en partidas locales.

## Música

Las canciones oficiales se reproducen aleatoriamente, pasando a otra al terminar sin repetir inmediatamente. El APK integra automáticamente las canciones MP3 que estén presentes en `music/` al momento de compilar. Los archivos musicales personales se conservan localmente cuando el dispositivo admite almacenamiento persistente. El juego funciona aunque alguna pista predeterminada esté ausente.

## GitHub Pages

El sitio funciona directamente en el directorio raíz con `index.html`, `styles.css`, `app.js`, `core.js`, `music.js`, `music-library.js`, `touch-controls.js`, `favicon.svg` y `music/`. No necesita servicios externos. GitHub Pages: `https://magalarza726-del.github.io/Spreadsheets-wars/`.

## Android APK offline

La carpeta `android/` contiene el proyecto Java/Gradle que integra los archivos web mediante **WebViewAssetLoader** y no solicita el permiso INTERNET. Usa WebView local con el agente `SpreadsheetsWarsAndroid` para activar los joysticks solo en el APK.

Cada subida a `main` genera automáticamente el APK con la acción **Build offline Android APK**. Descárgalo desde **Releases** o desde el artefacto del workflow. En Android Studio abre la carpeta `android/` y compila `:app:assembleDebug` (JDK 17 / Android SDK 35).

## Comprobaciones

Desde la raíz ejecuta `npm test` para verificar las reglas, el terreno, la música, la configuración y las regresiones de interfaz. Las fuentes web y las del APK se comparten para que las reglas no diverjan.