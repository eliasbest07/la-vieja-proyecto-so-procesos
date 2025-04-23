import { parentPort, workerData } from 'worker_threads';

const { nombreSala, jugadoresInfo } = workerData;

let tablero = Array(9).fill(null);
let turno = 'X';
let terminado = false;

function revisarGanador() {
  const combos = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6],
  ];

  for (let [a, b, c] of combos) {
    if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
      return tablero[a];
    }
  }

  if (!tablero.includes(null)) return 'Empate';
  return null;
}

// Solo para saber si los dos jugadores están conectados
let jugadoresConectados = 0;

parentPort.on('message', (msg) => {
  if (terminado) return;

  if (msg.type === 'jugador-listo') {
    jugadoresConectados++;
    if (jugadoresConectados === 2) {
      parentPort.postMessage({ 
        type: 'broadcast',
        event: 'comenzar-partida',
        data: {
          sala: nombreSala,
          tablero,
          turno,
          jugadores: jugadoresInfo
        }
      });
    }
  }

  if (msg.type === 'jugada') {
    if (tablero[msg.index] !== null) return;

    tablero[msg.index] = turno;

    const ganador = revisarGanador();

    parentPort.postMessage({
      type: 'broadcast',
      event: 'actualizar-tablero',
      data: { tablero }
    });

    if (ganador) {
      parentPort.postMessage({
        type: 'broadcast',
        event: 'fin-partida',
        data: {
          ganador,
          jugadores: jugadoresInfo,
          sala: nombreSala
        }
      });
      parentPort.postMessage({ type: 'cerrar' });
      terminado = true;
    } else {
      turno = turno === 'X' ? 'O' : 'X';
      parentPort.postMessage({
        type: 'broadcast',
        event: 'turno',
        data: { turno }
      });
    }
  }
});