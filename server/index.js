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

const workers = new Map(); // nombreSala -> worker (La Vieja)
const socketsPorSala = new Map(); // nombreSala -> [socket1, socket2]
const fichasPorSala = new Map(); // nombreSala -> { jugador1: 'X', jugador2: 'O' }

// Mapas para Bingo
const bingoWorkers = new Map();
const bingoSocketsPorSala = new Map();

// Crear worker por sala
function crearSalaWorker(nombreSala, jugador1, fichaJugador1, fichaJugador2) {
  const worker = new Worker(path.resolve('./salaWorker.js'), {
    workerData: {
      nombreSala,
      jugadoresInfo: {
        jugador1: { nombre: jugador1, ficha: fichaJugador1 },
        jugador2: { nombre: '', ficha: fichaJugador2 }
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
      fichasPorSala.delete(nombreSala);
    }
  });
  
  worker.on('error', (err) => console.error('Worker error:', err));
}

// Crear worker de Bingo por sala
function crearSalaBingoWorker(nombreSala, jugador1) {
  const worker = new Worker(path.resolve('./bingoWorker.js'), {
    workerData: {
      nombreSala,
      jugador1
    }
  });

  bingoWorkers.set(nombreSala, worker);
  bingoSocketsPorSala.set(nombreSala, []);

  worker.on('message', (msg) => {
    const sockets = bingoSocketsPorSala.get(nombreSala);
    if (!sockets) return;

    if (msg.type === 'broadcast') {
      sockets.forEach(sock => sock.emit(msg.event, msg.data));
    }

    if (msg.type === 'privado') {
      const target = sockets[msg.jugador - 1];
      target?.emit(msg.event, msg.data);
    }

    if (msg.type === 'cerrar') {
      bingoWorkers.get(nombreSala)?.terminate();
      bingoWorkers.delete(nombreSala);
      bingoSocketsPorSala.delete(nombreSala);
    }
  });

  worker.on('error', (err) => console.error('Bingo worker error:', err));
}

// Escuchar conexiones de clientes
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Crear una nueva sala
  socket.on('crear-sala', ({ nombreSala, nombreJugador }) => {
    // Verificar si la sala ya existe
    if (workers.has(nombreSala)) {
      socket.emit('error', { mensaje: 'Esta sala ya existe, intenta con otro código.' });
      return;
    }
    
    // Asignar ficha aleatoria
    const fichasPosibles = ['X', 'O'];
    const fichaJugador1 = fichasPosibles[Math.floor(Math.random() * 2)];
    const fichaJugador2 = fichaJugador1 === 'X' ? 'O' : 'X';
    
    // Guardar las fichas para esta sala
    fichasPorSala.set(nombreSala, { jugador1: fichaJugador1, jugador2: fichaJugador2 });
    
    // Crear sala y worker
    crearSalaWorker(nombreSala, nombreJugador, fichaJugador1, fichaJugador2);
    socketsPorSala.get(nombreSala).push(socket);
    socket.join(nombreSala);
    
    // Notificar al cliente
    socket.emit('sala-creada', { nombreSala, ficha: fichaJugador1 });
    
    const worker = workers.get(nombreSala);
    worker?.postMessage({ type: 'jugador-listo' });
  });
  
  // Verificar si una sala existe
  socket.on('verificar-sala', ({ nombreSala }) => {
    const salaExiste = workers.has(nombreSala);
    socket.emit('sala-verificada', { 
      nombreSala, 
      existe: salaExiste,
      disponible: salaExiste && socketsPorSala.get(nombreSala).length < 2
    });
  });
  
  // Unirse a una sala existente
  socket.on('unirse-sala', ({ nombreSala, nombreJugador }) => {
    const worker = workers.get(nombreSala);
    const sockets = socketsPorSala.get(nombreSala);
    
    if (!worker || !sockets) {
      socket.emit('error', { mensaje: 'Esta sala no existe.' });
      return;
    }
    
    if (sockets.length >= 2) {
      socket.emit('error', { mensaje: 'Sala llena, ya hay dos jugadores.' });
      return;
    }
    
    // Obtener la ficha para el jugador 2
    const fichas = fichasPorSala.get(nombreSala);
    if (!fichas) {
      socket.emit('error', { mensaje: 'Error en la configuración de la sala.' });
      return;
    }
    
    // Actualizar info del jugador 2
    worker.postMessage({
      type: 'actualizar-jugador2',
      data: { nombre: nombreJugador }
    });
    
    sockets.push(socket);
    socket.join(nombreSala);
    
    // Notificar al cliente con su ficha
    socket.emit('sala-unida', { nombreSala, ficha: fichas.jugador2 });
    
    worker.postMessage({ type: 'jugador-listo' });
  });
  
  // Recibir jugada del cliente
  socket.on('jugada', ({ nombreSala, index }) => {
    const worker = workers.get(nombreSala);
    if (worker) {
      worker.postMessage({ type: 'jugada', index });
    }
  });

  // --- Bingo events ---
  socket.on('crear-sala-bingo', ({ nombreSala, nombreJugador }) => {
    if (bingoWorkers.has(nombreSala)) {
      socket.emit('error', { mensaje: 'Esta sala ya existe, intenta con otro código.' });
      return;
    }

    crearSalaBingoWorker(nombreSala, nombreJugador);
    bingoSocketsPorSala.get(nombreSala).push(socket);
    socket.join(nombreSala);

    socket.emit('bingo-sala-creada', { nombreSala });
  });

  socket.on('unirse-sala-bingo', ({ nombreSala, nombreJugador }) => {
    const worker = bingoWorkers.get(nombreSala);
    const sockets = bingoSocketsPorSala.get(nombreSala);

    if (!worker || !sockets) {
      socket.emit('error', { mensaje: 'Esta sala no existe.' });
      return;
    }

    if (sockets.length >= 2) {
      socket.emit('error', { mensaje: 'Sala llena, ya hay dos jugadores.' });
      return;
    }

    worker.postMessage({
      type: 'actualizar-jugador2',
      data: { nombre: nombreJugador }
    });

    sockets.push(socket);
    socket.join(nombreSala);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);

    // Buscar y manejar la desconexión del jugador
    for (const [nombreSala, sockets] of socketsPorSala.entries()) {
      const index = sockets.indexOf(socket);
      if (index !== -1) {
        sockets.splice(index, 1);
        
        // Notificar al worker que un jugador se desconectó
        const worker = workers.get(nombreSala);
        if (worker) {
          worker.postMessage({ 
            type: 'jugador-desconectado', 
            index // 0 para jugador1, 1 para jugador2
          });
        }
        
        // Si no quedan jugadores, cerrar la sala
        if (sockets.length === 0) {
          workers.get(nombreSala)?.terminate();
          workers.delete(nombreSala);
          socketsPorSala.delete(nombreSala);
          fichasPorSala.delete(nombreSala);
        }
        
        break;
      }
    }

    for (const [nombreSala, sockets] of bingoSocketsPorSala.entries()) {
      const index = sockets.indexOf(socket);
      if (index !== -1) {
        sockets.splice(index, 1);

        const worker = bingoWorkers.get(nombreSala);
        if (worker) {
          worker.postMessage({
            type: 'jugador-desconectado',
            index
          });
        }

        if (sockets.length === 0) {
          bingoWorkers.get(nombreSala)?.terminate();
          bingoWorkers.delete(nombreSala);
          bingoSocketsPorSala.delete(nombreSala);
        }

        break;
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});