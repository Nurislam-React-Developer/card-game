const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:5173',
		methods: ['GET', 'POST'],
	},
});

// Хранение данных о комнатах
const rooms = new Map();

io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	socket.on('joinRoom', ({ roomId, playerName, isNewRoom }) => {
		console.log(`Player ${playerName} joining room ${roomId}`);

		// Получаем или создаем комнату
		if (!rooms.has(roomId)) {
			rooms.set(roomId, {
				players: [],
				gameStarted: false,
			});
		}

		const room = rooms.get(roomId);

		// Проверяем, не превышено ли количество игроков
		if (room.players.length >= 4) {
			socket.emit('roomError', 'Комната переполнена');
			return;
		}

		// Добавляем игрока в комнату
		const player = {
			id: socket.id,
			name: playerName,
			isHost: isNewRoom || room.players.length === 0,
		};

		room.players.push(player);
		socket.join(roomId);

		// Отправляем подтверждение
		socket.emit('joinedRoom');

		// Отправляем статус хоста
		socket.emit('hostStatus', player.isHost);

		// Оповещаем всех в комнате о новом списке игроков
		io.to(roomId).emit('playersList', room.players);
	});

	socket.on('leaveRoom', ({ roomId }) => {
		if (rooms.has(roomId)) {
			const room = rooms.get(roomId);
			room.players = room.players.filter((player) => player.id !== socket.id);

			if (room.players.length === 0) {
				rooms.delete(roomId);
			} else {
				// Если ушел хост, назначаем нового
				if (!room.players.some((player) => player.isHost)) {
					room.players[0].isHost = true;
				}
				io.to(roomId).emit('playersList', room.players);
			}
		}
		socket.leave(roomId);
	});

	socket.on('startGame', ({ roomId }) => {
		const room = rooms.get(roomId);
		if (room && room.players.length >= 2 && room.players.length <= 4) {
			room.gameStarted = true;
			io.to(roomId).emit('gameStarted');
		}
	});

	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id);
		rooms.forEach((room, roomId) => {
			if (room.players.some((player) => player.id === socket.id)) {
				const updatedPlayers = room.players.filter(
					(player) => player.id !== socket.id
				);
				if (updatedPlayers.length === 0) {
					rooms.delete(roomId);
				} else {
					room.players = updatedPlayers;
					if (!room.players.some((player) => player.isHost)) {
						room.players[0].isHost = true;
					}
					io.to(roomId).emit('playersList', room.players);
				}
			}
		});
	});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
