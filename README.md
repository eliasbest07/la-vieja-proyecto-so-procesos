
# 🕹️ La Vieja (Tic Tac Toe) Multijugador en Tiempo Real

Este es un proyecto del clásico juego **Tic Tac Toe** implementado como una aplicación **multijugador en tiempo real** usando tecnologías modernas de Node.js:

- ⚙️ `Express`: para servir archivos estáticos del frontend.
- 🔌 `Socket.IO`: para comunicación en tiempo real entre jugadores.
- 🧵 `worker_threads`: para manejar cada sala de juego de forma aislada.
- 🖼️ `CSS Html Javascript`: para el Frontend 
---

## 📦 Tecnologías utilizadas

| Tecnología     | Descripción                                              |
|----------------|----------------------------------------------------------|
| `express`      | Servidor HTTP para enviar archivos estáticos             |
| `socket.io`    | Comunicación cliente-servidor en tiempo real             |
| `worker_threads` | Módulo nativo de Node.js para usar hilos independientes |

---

## 🚀 Instalación

```bash
npm install express socket.io
```

---

## ▶️ Ejecución

```bash
npm start
```

> Asegúrate de tener Node.js versión actual instalada.

---

## 🧠 ¿Cómo funciona?

### 🔄 Comunicación con Socket.IO

- El servidor crea y administra salas de juego usando `socket.io`.
- Cada jugador se conecta con un nombre y código de sala.
- Los eventos enviados por los sockets incluyen:
  - `crear-sala`: un jugador crea una nueva sala.
  - `unirse-sala`: otro jugador se une a una sala existente.
  - `jugada`: se envía la jugada (posición) al servidor.

- El servidor reenvía los eventos relevantes a los clientes en la misma sala.
- Cuando el juego termina, se transmite un evento `fin-juego` con el resultado.

### 🧵 Lógica del juego con Worker Threads

- Cada sala es manejada por un **`Worker`**, lo que permite procesar múltiples juegos al mismo tiempo sin bloquear el servidor principal.
- El `Worker`:
  - Guarda el estado del tablero.
  - Verifica si hay ganador o empate.
  - Cambia los turnos.
  - Finaliza la sala automáticamente si un jugador se desconecta.

---

## 📁 Estructura del proyecto

```
node_modules
├── index.js           # Servidor Express + Socket.IO
├── salaWorker.js      # Lógica del juego en un Worker Thread
├── package-laokc.json
├── package.json
├── /public
│   ├── index.html     # Interfaz del cliente
│   ├── main.js        # Lógica del cliente con Socket.IO
│   └── styles.css     # Estilos visuales
.gitignore
README.md
```

---

## 🎮 Flujo de juego

✦ Un jugador ingresa su nombre y crea una sala.
✦ Comparte el código de sala con su oponente.
✦ El segundo jugador se une escribiendo el mismo código.
✦ El juego empieza automáticamente cuando ambos están listos.
✦ El tablero se actualiza en tiempo real según las jugadas.
✦ Al terminar el juego, se muestra el resultado y duración total.

---

## 📝 Notas

- No es necesario instalar `worker_threads`, `http`, `path` ni `url`, ya que son módulos nativos de Node.js.
- Puedes personalizar los estilos visuales en `styles.css`.

---

## 📸 Captura 

<img width="738" alt="image" src="https://github.com/user-attachments/assets/d35fca54-e348-4f52-9b59-c8e7f4ccda3a" />
<img width="690" alt="image" src="https://github.com/user-attachments/assets/f39fccc9-3645-4e51-9b76-f1b787ae5f12" />
<img width="846" alt="image" src="https://github.com/user-attachments/assets/aa8874ba-eecc-4c14-b97e-06c484653068" />
<img width="846" alt="image" src="https://github.com/user-attachments/assets/56244d6b-d13f-4885-8c47-4b65356bf1ff" />
<img width="1154" alt="image" src="https://github.com/user-attachments/assets/7ccae150-8912-42a4-abcc-d979fe79f288" />


---

## 🙌 Autor

Desarrollado por Elias Montilla como parte del segundo proyecto para la materia Sistemas Operaticos profesor Dimitrios Mandamadiotis de la Universidad de los Andes Merida - Venezuela y asi aprender comunicación en tiempo real, programación multiproceso y diseño de juegos simples.

---
