import { parentPort, workerData } from 'worker_threads';

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generarCarton() {
  const rangos = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75]
  ];
  const board = [];
  for (const [min, max] of rangos) {
    const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    shuffle(nums);
    board.push(nums.slice(0, 5));
  }
  board[2][2] = 'FREE';
  return board;
}

function marcarNumero(board, numero) {
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (board[i][j] === numero) {
        board[i][j] = 'X';
      }
    }
  }
}

function checkBingo(board) {
  // filas y columnas
  for (let i = 0; i < 5; i++) {
    if (board[i].every(n => n === 'X' || n === 'FREE')) return true;
    if (board.every(row => row[i] === 'X' || row[i] === 'FREE')) return true;
  }
  // diagonales
  if ([0,1,2,3,4].every(i => board[i][i] === 'X' || board[i][i] === 'FREE')) return true;
  if ([0,1,2,3,4].every(i => board[i][4 - i] === 'X' || board[i][4 - i] === 'FREE')) return true;
  return false;
}

const { nombreSala, jugador1 } = workerData;
const infoJugadores = {
  jugador1: { nombre: jugador1, board: generarCarton() },
  jugador2: { nombre: '', board: null }
};
let jugadoresListos = 1; // jugador1 listo
let juegoTerminado = false;

parentPort.postMessage({ type: 'privado', jugador: 1, event: 'bingo-tablero', data: { board: infoJugadores.jugador1.board } });

function iniciarJuego() {
  const numeros = shuffle(Array.from({ length: 75 }, (_, i) => i + 1));
  let index = 0;
  const interval = setInterval(() => {
    if (index >= numeros.length || juegoTerminado) {
      clearInterval(interval);
      if (!juegoTerminado) {
        parentPort.postMessage({ type: 'broadcast', event: 'bingo-fin', data: { mensaje: 'Se extrajeron todos los números sin ganador.' } });
      }
      parentPort.postMessage({ type: 'cerrar' });
      return;
    }
    const numero = numeros[index++];
    marcarNumero(infoJugadores.jugador1.board, numero);
    marcarNumero(infoJugadores.jugador2.board || [], numero);
    parentPort.postMessage({ type: 'broadcast', event: 'bingo-numero', data: { numero } });

    if (infoJugadores.jugador1.board && checkBingo(infoJugadores.jugador1.board)) {
      juegoTerminado = true;
      parentPort.postMessage({ type: 'broadcast', event: 'bingo-fin', data: { mensaje: `${infoJugadores.jugador1.nombre} canta BINGO!` } });
      parentPort.postMessage({ type: 'cerrar' });
      return;
    }
    if (infoJugadores.jugador2.board && checkBingo(infoJugadores.jugador2.board)) {
      juegoTerminado = true;
      parentPort.postMessage({ type: 'broadcast', event: 'bingo-fin', data: { mensaje: `${infoJugadores.jugador2.nombre} canta BINGO!` } });
      parentPort.postMessage({ type: 'cerrar' });
      return;
    }
  }, 5000);
}

parentPort.on('message', (msg) => {
  if (msg.type === 'actualizar-jugador2') {
    infoJugadores.jugador2.nombre = msg.data.nombre;
    infoJugadores.jugador2.board = generarCarton();
    parentPort.postMessage({ type: 'privado', jugador: 2, event: 'bingo-tablero', data: { board: infoJugadores.jugador2.board } });
    jugadoresListos++;
    if (jugadoresListos === 2) {
      parentPort.postMessage({ type: 'broadcast', event: 'bingo-inicio', data: {} });
      iniciarJuego();
    }
  }

  if (msg.type === 'jugador-desconectado') {
    if (!juegoTerminado) {
      juegoTerminado = true;
      const nombre = msg.index === 0 ? infoJugadores.jugador1.nombre : infoJugadores.jugador2.nombre;
      parentPort.postMessage({ type: 'broadcast', event: 'bingo-fin', data: { mensaje: `${nombre} se desconectó. Fin del juego.` } });
      parentPort.postMessage({ type: 'cerrar' });
    }
  }
});
