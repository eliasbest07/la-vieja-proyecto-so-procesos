const socket = io("http://localhost:3001");
const menu = document.getElementById('menuBingo');
const game = document.getElementById('gameBingo');
const roomCodeEl = document.getElementById('roomCode');
const ultimoNumero = document.getElementById('ultimoNumero');
const tablero = document.getElementById('tablero');
const mensaje = document.getElementById('mensaje');
let sala = '';

function renderTablero(board) {
  tablero.innerHTML = '';
  board.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(num => {
      const td = document.createElement('td');
      td.textContent = num;
      tr.appendChild(td);
    });
    tablero.appendChild(tr);
  });
}

function marcarNumero(num) {
  Array.from(tablero.getElementsByTagName('td')).forEach(td => {
    if (td.textContent == num) td.classList.add('marcado');
  });
}

document.getElementById('createRoomBtn').addEventListener('click', () => {
  const nombre = document.getElementById('nameInput').value.trim() || 'Jugador1';
  sala = Math.random().toString(36).substring(2,7).toUpperCase();
  socket.emit('crear-sala-bingo', { nombreSala: sala, nombreJugador: nombre });
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
  const nombre = document.getElementById('nameInput').value.trim() || 'Jugador2';
  sala = document.getElementById('roomInput').value.trim().toUpperCase();
  socket.emit('unirse-sala-bingo', { nombreSala: sala, nombreJugador: nombre });
});

socket.on('bingo-sala-creada', ({ nombreSala }) => {
  sala = nombreSala;
  roomCodeEl.textContent = sala;
  menu.classList.add('hidden');
  game.classList.remove('hidden');
});

socket.on('bingo-tablero', ({ board }) => {
  renderTablero(board);
});

socket.on('bingo-inicio', () => {
  mensaje.textContent = '¡Inicia el juego!';
});

socket.on('bingo-numero', ({ numero }) => {
  ultimoNumero.textContent = `Número: ${numero}`;
  marcarNumero(numero);
});

socket.on('bingo-fin', ({ mensaje: msg }) => {
  mensaje.textContent = msg;
});

socket.on('error', ({ mensaje: msg }) => alert(msg));
