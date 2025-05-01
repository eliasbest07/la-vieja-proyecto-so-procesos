import { parentPort, workerData } from 'worker_threads';

const { nombreSala, jugadoresInfo } = workerData;
let tablero = Array(9).fill(null); // tablero vacío
let turnoActual = jugadoresInfo.jugador1.ficha; // empieza jugador1 (puede ser 'X' u 'O')
let jugadoresListos = 0;
let juegoTerminado = false;

// Función para comprobar ganador
function checkWinner() {
  const lineasGanadoras = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // horizontales
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // verticales
    [0, 4, 8], [2, 4, 6]            // diagonales
  ];
  
  for (const [a, b, c] of lineasGanadoras) {
    if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
      return tablero[a]; // devuelve ficha ganadora
    }
  }
  
  if (tablero.every(cell => cell !== null)) {
    return 'Empate'; // si el tablero está lleno
  }
  
  return null; // no hay ganador todavía
}

// Función para manejar jugada
function procesarJugada(index) {
  if (juegoTerminado) return;
  if (tablero[index] !== null) return; // casilla ocupada
  
  tablero[index] = turnoActual;
  
  // Revisar si ganó
  const resultado = checkWinner();
  if (resultado) {
    juegoTerminado = true;
    
    // Determinar mensaje de resultado
    let mensajeResultado;
    if (resultado === 'Empate') {
      mensajeResultado = '¡Empate!';
    } else {
      // Determinar qué jugador ganó
      const ganador = resultado === jugadoresInfo.jugador1.ficha ? 
                    jugadoresInfo.jugador1.nombre : 
                    jugadoresInfo.jugador2.nombre;
      mensajeResultado = `¡${ganador} ha ganado con ${resultado}!`;
    }
    
    parentPort.postMessage({
      type: 'broadcast',
      event: 'fin-juego',
      data: { resultado: mensajeResultado, tablero }
    });
    
    // cerrar sala después de terminar
    setTimeout(() => {
      parentPort.postMessage({ type: 'cerrar' });
    }, 5000); // espera 5 segundos para cerrar
    return;
  }
  
  // Cambiar turno
  turnoActual = turnoActual === jugadoresInfo.jugador1.ficha ? 
              jugadoresInfo.jugador2.ficha : 
              jugadoresInfo.jugador1.ficha;
  
    parentPort.postMessage({
        type: 'broadcast',
        event: 'jugada-realizada',
        data: { tablero, turnoActual }
    });
}

// Mensajes que recibe el worker
parentPort.on('message', (msg) => {
   if (msg.type === 'actualizar-jugador2') {
    jugadoresInfo.jugador2.nombre = msg.data.nombre;
    jugadoresListos++;
    if (jugadoresListos === 2) {
      parentPort.postMessage({
        type: 'broadcast',
        event: 'inicio-juego',
        data: {
          mensaje: '¡Empieza el juego!',
          turnoActual,
          jugador1: jugadoresInfo.jugador1.nombre,
          jugador2: jugadoresInfo.jugador2.nombre
        }
      });
    }
  }
  
  if (msg.type === 'jugador-listo') {
    jugadoresListos++;
  }
  
  // Permitir actualizar fichas si es necesario
  if (msg.type === 'actualizar-fichas') {
    if (msg.data.fichaJugador1) jugadoresInfo.jugador1.ficha = msg.data.fichaJugador1;
    if (msg.data.fichaJugador2) jugadoresInfo.jugador2.ficha = msg.data.fichaJugador2;
    // Actualizar turno si es necesario
    turnoActual = jugadoresInfo.jugador1.ficha;
  }
  
  if (msg.type === 'jugada') {
    procesarJugada(msg.index);
  }
  
  // Manejar desconexión de jugadores
  if (msg.type === 'jugador-desconectado') {
    if (!juegoTerminado) {
      juegoTerminado = true;
      const jugadorDesconectado = msg.index === 0 ? 
                               jugadoresInfo.jugador1.nombre : 
                               jugadoresInfo.jugador2.nombre;
      
      parentPort.postMessage({
        type: 'broadcast',
        event: 'fin-juego',
        data: { 
          resultado: `${jugadorDesconectado} se ha desconectado. Juego terminado.`, 
          tablero 
        }
      });
      
      // Cerrar sala
      setTimeout(() => {
        parentPort.postMessage({ type: 'cerrar' });
      }, 2000);
    }
  }
});