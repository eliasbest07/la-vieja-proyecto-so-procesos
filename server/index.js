import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(path.join(__dirname, './public')));

let salaId = 1;
const colaSalas = []; // cola de solicitudes para crear nuevas salas
const workers = new Map(); // salaId -> worker
const socketsPorSala = new Map(); // salaId -> [socket1, socket2]

// Crear worker por sala
function crearSalaWorker(nombreSala, jugador1) {
  const worker = new Worker(path.resolve('./server/salaWorker.js'), {
    workerData: {
      nombreSala,
      jugadoresInfo: {
        jugador1: { nombre: jugador1, ficha: 'X' },
        jugador2: { nombre: '', ficha: 'O' }
      }
    }
  });

  workers.set(nombreSala, worker);
  socketsPorSala.set(nombreSala, []);

  worker.on('message', (msg) => {
    const sockets = socketsPorSala.get(nombreSala);
    if (!sockets) return;

    if (msg.type === 'broadcast') {
      sockets.forEach(sock => sock.emit(msg.event, msg.data));
    }

    if (msg.type === 'cerrar') {
      workers.get(nombreSala)?.terminate();
      workers.delete(nombreSala);
      socketsPorSala.delete(nombreSala);
    }
  });

  worker.on('error', (err) => console.error('Worker error:', err));
}

// Escuchar conexiones de clientes
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Crear una nueva sala
  socket.on('crear-sala', ({ nombreJugador }) => {
    const nombreSala = `Sala ${salaId++}`;
    crearSalaWorker(nombreSala, nombreJugador);
    socketsPorSala.get(nombreSala).push(socket);

    socket.join(nombreSala);
    socket.emit('sala-creada', { nombreSala });

    const worker = workers.get(nombreSala);
    worker?.postMessage({ type: 'jugador-listo' });
  });

  // Unirse a una sala existente
  socket.on('unirse-sala', ({ nombreSala, nombreJugador }) => {
    const worker = workers.get(nombreSala);
    const sockets = socketsPorSala.get(nombreSala);

    if (!worker || !sockets || sockets.length >= 2) {
      socket.emit('error', { mensaje: 'Sala no disponible' });
      return;
    }

    // Actualizar info del jugador 2
    worker.postMessage({
      type: 'actualizar-jugador2',
      data: { nombre: nombreJugador }
    });

    sockets.push(socket);
    socket.join(nombreSala);
    socket.emit('sala-unida', { nombreSala });

    worker.postMessage({ type: 'jugador-listo' });
  });

  // Recibir jugada del cliente
  socket.on('jugada', ({ nombreSala, index }) => {
    const worker = workers.get(nombreSala);
    if (worker) {
      worker.postMessage({ type: 'jugada', index });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    // Aquí puedes manejar la desconexión si es necesario
  });
});

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});