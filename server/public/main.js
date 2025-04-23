const socket = io("http://localhost:3000");

const menu = document.getElementById("menu");
const waitingRoom = document.getElementById("waitingRoom");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerSymbolDisplay = document.getElementById("playerSymbol");

const workers = new Map(); // me parece mas comodo verificar aqui si la sala esta viva.
                           // que este viva signifca que el worker la tiene como un proceso en ejecucion
document.getElementById("createRoomBtn").addEventListener("click", () => {
  let nombre = document.getElementById("nameInput").value.trim();
  if (!nombre) {
    nombre = "No escribi nombre XD";
    const sala = generarCodigoSala();
    socket.emit("crear-sala", { nombreSala: sala  ,nombreJugador: nombre });
  } else {
    alert("Please enter your name.");
  }
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  const nombre = document.getElementById("nameInput").value.trim();
  const codigoSala = document.getElementById("roomInput").value.trim().toUpperCase();
  if (nombre && codigoSala) {
    socket.emit("unirse-sala", { nombreSala: codigoSala, nombreJugador: nombre });
  } else {
    alert("Please enter your name and room code.");
  }
});

socket.on("sala-creada", ({ nombreSala, ficha }) => {

  mostrarSala(nombreSala, ficha);
});

socket.on("sala-unida", ({ nombreSala, ficha }) => {
  mostrarSala(nombreSala, ficha);
});

socket.on("error", ({ mensaje }) => {
  alert(mensaje);
});

function mostrarSala(sala, ficha) {
  menu.classList.add("hidden");
  waitingRoom.classList.remove("hidden");
  roomCodeDisplay.textContent = sala;
  playerSymbolDisplay.textContent = ficha;
}

function generarCodigoSalaUnico() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo;
  do {
    codigo = Array.from({ length: 5 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  } while (workers.has(codigo)); 
  return codigo;
}