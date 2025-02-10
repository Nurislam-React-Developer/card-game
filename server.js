import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:5173',
		methods: ['GET', 'POST'],
	},
});

// Создаем колоду карт
const createDeck = () => {
	const suits = ['♠', '♣', '♥', '♦'];
	const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
	const deck = [];

	for (let suit of suits) {
		for (let value of values) {
			deck.push({ suit, value });
		}
	}

	return shuffle(deck);
};

// Перемешивание карт
const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

// Хранение данных о комнатах
const rooms = new Map();

io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	socket.on('joinRoom', ({ roomId, playerName, isNewRoom }) => {
		console.log(`Player ${playerName} (${socket.id}) joining room ${roomId}`);

		let room = rooms.get(roomId);

		if (!room) {
			console.log('Creating new room:', roomId);
			const deck = createDeck();
			const trumpCard = deck.pop();

			room = {
				players: [],
				deck: deck,
				trumpCard: trumpCard,
				currentPlayer: null,
				tableCards: [],
			};
			rooms.set(roomId, room);
		}

		// Добавляем игрока
		const player = {
			id: socket.id,
			name: playerName,
			cards: room.deck.splice(0, 6),
		};
		console.log('Player cards:', player.cards);

		// Добавляем бота, если это первый игрок
		if (room.players.length === 0) {
			console.log('Adding bot to room:', roomId);
			const bot = {
				id: 'bot-1',
				name: 'Бот',
				isBot: true,
				cards: room.deck.splice(0, 6),
			};
			room.players.push(bot);
			console.log('Bot cards:', bot.cards);
		}

		room.players.push(player);
		room.currentPlayer = socket.id;

		socket.join(roomId);
		console.log('Room state after join:', {
			players: room.players.map((p) => p.name),
			deckSize: room.deck.length,
			trumpCard: room.trumpCard,
		});

		// Отправляем состояние игры
		const gameState = {
			players: room.players.map((p) => ({
				id: p.id,
				name: p.name,
				cardCount: p.cards.length,
			})),
			currentPlayer: room.currentPlayer,
			myCards: player.cards,
			tableCards: room.tableCards,
			trumpCard: room.trumpCard,
			cardsInDeck: room.deck.length,
		};

		console.log('Sending game state to player:', socket.id);
		io.to(socket.id).emit('gameState', gameState);
		socket.emit('joinedRoom');
	});

	socket.on('playCard', ({ roomId, card }) => {
		const room = rooms.get(roomId);
		if (!room || room.currentPlayer !== socket.id) return;

		const player = room.players.find((p) => p.id === socket.id);
		if (!player) return;

		// Находим и удаляем карту из руки игрока
		const cardIndex = player.cards.findIndex(
			(c) => c.suit === card.suit && c.value === card.value
		);

		if (cardIndex !== -1) {
			player.cards.splice(cardIndex, 1);
			room.tableCards.push(card);
			room.currentPlayer = 'bot-1';

			// Отправляем обновленное состояние
			const gameState = {
				players: room.players.map((p) => ({
					id: p.id,
					name: p.name,
					cardCount: p.cards.length,
				})),
				currentPlayer: room.currentPlayer,
				myCards: player.cards,
				tableCards: room.tableCards,
				trumpCard: room.trumpCard,
				cardsInDeck: room.deck.length,
			};

			socket.emit('gameState', gameState);

			// Ход бота
			setTimeout(() => {
				const bot = room.players.find((p) => p.id === 'bot-1');
				if (bot && bot.cards.length > 0) {
					const botCard = bot.cards.shift();
					room.tableCards.push(botCard);
					room.currentPlayer = socket.id;

					// Отправляем обновленное состояние после хода бота
					const newState = {
						players: room.players.map((p) => ({
							id: p.id,
							name: p.name,
							cardCount: p.cards.length,
						})),
						currentPlayer: room.currentPlayer,
						myCards: player.cards,
						tableCards: room.tableCards,
						trumpCard: room.trumpCard,
						cardsInDeck: room.deck.length,
					};

					socket.emit('gameState', newState);
				}
			}, 1000);
		}
	});

	socket.on('leaveRoom', ({ roomId }) => {
		if (rooms.has(roomId)) {
			const room = rooms.get(roomId);
			room.players = room.players.filter((player) => player.id !== socket.id);

			if (room.players.length === 0) {
				rooms.delete(roomId);
			} else {
				if (!room.players.some((player) => player.isHost)) {
					room.players[0].isHost = true;
				}
				io.to(roomId).emit('playersList', room.players);
			}
		}
		socket.leave(roomId);
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
