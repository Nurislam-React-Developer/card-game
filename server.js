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

const CARD_VALUES = {
	6: 6,
	7: 7,
	8: 8,
	9: 9,
	10: 10,
	J: 11,
	Q: 12,
	K: 13,
	A: 14,
};

const canBeat = (attackingCard, defendingCard, trumpSuit) => {
	// Если масти одинаковые, то сравниваем значения
	if (attackingCard.suit === defendingCard.suit) {
		return CARD_VALUES[defendingCard.value] > CARD_VALUES[attackingCard.value];
	}
	// Если защищающаяся карта козырь, а атакующая нет - козырь бьёт
	return defendingCard.suit === trumpSuit && attackingCard.suit !== trumpSuit;
};

const canAttack = (tableCards, newCard, trumpSuit) => {
	// Первый ход можно делать любой картой
	if (tableCards.length === 0) return true;

	// Можно подкидывать только те значения, которые уже есть на столе
	return tableCards.some((card) => card.value === newCard.value);
};

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

	socket.on('playCard', ({ roomId, card, position }) => {
		const room = rooms.get(roomId);
		if (!room) return;

		const player = room.players.find((p) => p.id === socket.id);
		if (!player) return;

		const isAttacking = room.currentPlayer === socket.id;
		const tableCards = room.tableCards || [];

		// Проверяем, можно ли сыграть карту
		if (isAttacking) {
			if (!canAttack(tableCards, card, room.trumpCard.suit)) {
				socket.emit(
					'gameError',
					'Можно подкидывать только карты тех же значений, что уже есть на столе'
				);
				return;
			}
		} else {
			const cardToDefend = tableCards[tableCards.length - 1];
			if (!canBeat(cardToDefend, card, room.trumpCard.suit)) {
				socket.emit('gameError', 'Эта карта не может побить атакующую карту');
				return;
			}
		}

		// Играем карту
		const cardIndex = player.cards.findIndex(
			(c) => c.suit === card.suit && c.value === card.value
		);

		if (cardIndex !== -1) {
			// Удаляем карту из руки игрока
			const playedCard = player.cards.splice(cardIndex, 1)[0];

			// Добавляем карту на стол
			room.tableCards.push({
				...playedCard,
				position,
				playerId: socket.id,
			});

			// Проверяем, нужно ли брать карты
			if (room.deck.length > 0) {
				while (player.cards.length < 6 && room.deck.length > 0) {
					player.cards.push(room.deck.pop());
				}
			}

			// Ход бота
			if (!isAttacking) {
				const bot = room.players.find((p) => p.id === 'bot-1');
				if (bot) {
					// Бот ищет подходящую карту для атаки
					const botCard = bot.cards.find((card) =>
						canAttack(room.tableCards, card, room.trumpCard.suit)
					);

					if (botCard) {
						// Бот атакует
						const botCardIndex = bot.cards.indexOf(botCard);
						const playedBotCard = bot.cards.splice(botCardIndex, 1)[0];
						room.tableCards.push({
							...playedBotCard,
							position: {
								x: room.tableCards.length * 30,
								y: 0,
							},
							playerId: 'bot-1',
						});

						// Бот берет карты
						while (bot.cards.length < 6 && room.deck.length > 0) {
							bot.cards.push(room.deck.pop());
						}
					} else {
						// Бот берет карты со стола
						bot.cards.push(...room.tableCards);
						room.tableCards = [];
					}
				}
			}

			// Отправляем обновленное состояние
			const gameState = {
				players: room.players.map((p) => ({
					id: p.id,
					name: p.name,
					cardCount: p.cards.length,
				})),
				currentPlayer: isAttacking ? 'bot-1' : socket.id,
				myCards: player.cards,
				tableCards: room.tableCards,
				trumpCard: room.trumpCard,
				cardsInDeck: room.deck.length,
			};

			socket.emit('gameState', gameState);
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
