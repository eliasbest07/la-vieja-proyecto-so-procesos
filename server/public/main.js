const socket = io("http://localhost:3001");
const menu = document.getElementById("menu");
const waitingRoom = document.getElementById("waitingRoom");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerSymbolDisplay = document.getElementById("playerSymbol");
const gameRoom = document.getElementById("gameRoom");
const gameRoomCode = document.getElementById("gameRoomCode");
const yourSymbol = document.getElementById("yourSymbol");
const turnInfo = document.getElementById("turnInfo");
const board = document.getElementById("board");
const cells = document.querySelectorAll(".cell");

let miFicha = '';
let nombreSala = '';
let esMiTurno = false;
let miNombre = '';
let nombreOponente = '';
let tiempo = 0;
let timerInterval;

document.getElementById("createRoomBtn").addEventListener("click", () => {
  let nombre = document.getElementById("nameInput").value.trim();
  if (!nombre) {
    nombre = "No escribi nombre XD";
  }
  miNombre = nombre;
  const sala = generarCodigoSalaUnico();
  socket.emit("crear-sala", { nombreSala: sala, nombreJugador: nombre });
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  const nombre = document.getElementById("nameInput").value.trim();
  const codigoSala = document.getElementById("roomInput").value.trim().toUpperCase();
  if (nombre && codigoSala) {
    socket.emit("unirse-sala", { nombreSala: codigoSala, nombreJugador: nombre });
  } else {
    alert("Por favor, ingresa tu nombre y el código de la sala.");
  }
});

socket.on("sala-creada", ({ nombreSala: sala, ficha }) => {
  mostrarSala(sala, ficha);
});

socket.on("sala-unida", ({ nombreSala: sala, ficha }) => {
  mostrarSala(sala, ficha);
  // Mostrar sala de juego directamente si se une a sala existente
  waitingRoom.classList.add("hidden");
  gameRoom.classList.remove("hidden");
  gameRoomCode.textContent = sala;
  yourSymbol.textContent = ficha;
});

socket.on('inicio-juego', ({ _, turnoActual, jugador1, jugador2 }) => {
  waitingRoom.classList.add("hidden");
  gameRoom.classList.remove("hidden");
  gameRoomCode.textContent = nombreSala;
  yourSymbol.textContent = miFicha;
  esMiTurno = (turnoActual === miFicha);
  actualizarTurno();
  limpiarTablero();
  document.getElementById("miNombre").textContent = miNombre;
  if (miNombre === jugador1) {
    document.getElementById("miNombre").textContent = jugador1;
    document.getElementById("nombreOponente").textContent = jugador2 || "Esperando...";
  } else {
    document.getElementById("miNombre").textContent = jugador2;
    document.getElementById("nombreOponente").textContent = jugador1 || "Esperando...";
  }
  nombreOponente = (miNombre === jugador1) ? jugador2 : jugador1;
  document.getElementById("nombreOponente").textContent = nombreOponente;
  iniciarContador();
});

socket.on('jugada-realizada', ({ tablero, turnoActual }) => {
  actualizarTablero(tablero);
  esMiTurno = (turnoActual === miFicha);
  actualizarTurno();
});

socket.on('fin-juego', ({ resultado, tablero }) => {
  actualizarTablero(tablero);
  setTimeout(() => {
    alert(`${resultado}\nTiempo: ${document.getElementById("tiempoJuego").textContent}`);
    location.reload(); // Recargar página para volver al menú
  }, 500);
});

socket.on("error", ({ mensaje }) => {
  alert(mensaje);
});

function mostrarSala(sala, ficha) {
  menu.classList.add("hidden");
  waitingRoom.classList.remove("hidden");
  roomCodeDisplay.textContent = sala;
  playerSymbolDisplay.textContent = ficha;
  nombreSala = sala;
  miFicha = ficha;
  nombreSala = sala;
  miFicha = ficha;

}

function actualizarTurno() {
  turnInfo.textContent = esMiTurno ? "Tu turno" : "Turno del oponente";
  const turnoBox = document.getElementById("turnInfo");
  turnoBox.classList.toggle("turno-jugador", esMiTurno);
  turnoBox.classList.toggle("turno-oponente", !esMiTurno);
}

function limpiarTablero() {
  cells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('disabled');
  });
}

function actualizarTablero(tablero) {
  tablero.forEach((valor, index) => {
    cells[index].textContent = valor ?? '';
    if (valor !== null && valor !== '') {
      cells[index].classList.add('disabled');
    }
  });
}

// Manejar clicks en el tablero
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const index = parseInt(cell.getAttribute('data-index'));
    if (esMiTurno && cell.textContent === '') {
      socket.emit('jugada', { nombreSala, index });
    }
  });
});

// Genera un código de sala único, verificando con el servidor
function generarCodigoSalaUnico() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  
  return codigo;
}

function iniciarContador() {
  tiempo = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    tiempo++;
    const minutos = String(Math.floor(tiempo / 60)).padStart(2, '0');
    const segundos = String(tiempo % 60).padStart(2, '0');
    document.getElementById("tiempoJuego").textContent = `${minutos}:${segundos}`;
  }, 1000);
}