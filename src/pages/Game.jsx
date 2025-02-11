import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import {
	Box,
	CircularProgress,
	Container,
	Paper,
	Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Card from '../components/Card';
import socket from '../services/socket';

const CARD_POSITIONS = {
	ATTACK: [
		{ x: 30, y: 0 },
		{ x: 120, y: 0 },
		{ x: 210, y: 0 },
		{ x: 300, y: 0 },
		{ x: 390, y: 0 },
		{ x: 480, y: 0 },
	],
	DEFEND: [
		{ x: 30, y: 40 },
		{ x: 120, y: 40 },
		{ x: 210, y: 40 },
		{ x: 300, y: 40 },
		{ x: 390, y: 40 },
		{ x: 480, y: 40 },
	],
};

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

const Game = () => {
	const { roomId } = useParams();
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(true);
	const [gameState, setGameState] = useState({
		players: [],
		currentPlayer: null,
		myCards: [],
		tableCards: [],
		trumpCard: null,
		cardsInDeck: 0,
	});
	const [isMyTurn, setIsMyTurn] = useState(false);
	const [activeId, setActiveId] = useState(null);
	const [playedCards, setPlayedCards] = useState([]);
	const [draggedCard, setDraggedCard] = useState(null);
	const [dropZones, setDropZones] = useState([]);
	const [cardPositions, setCardPositions] = useState({});
	const [playZone, setPlayZone] = useState({
		left: 0,
		top: 0,
		width: 0,
		height: 0,
	});

	useEffect(() => {
		const playerName = localStorage.getItem('playerName');

		if (!playerName) {
			toast.error('Имя игрока не найдено');
			navigate('/');
			return;
		}

		console.log('Подключаемся к игре...');

		// Подключаемся к игре
		socket.emit('joinRoom', {
			roomId,
			playerName,
			isNewRoom: true,
		});

		// Слушаем обновление состояния игры
		socket.on('gameState', (newState) => {
			console.log('Получено состояние игры:', newState);
			setGameState(newState);
			setIsMyTurn(newState.currentPlayer === socket.id);
			setIsLoading(false);
		});

		// Создаем зоны для сброса карт
		const zones = [];
		for (let i = 0; i < 6; i++) {
			zones.push({
				id: `attack-${i}`,
				position: CARD_POSITIONS.ATTACK[i],
				type: 'attack',
				occupied: false,
			});
			zones.push({
				id: `defend-${i}`,
				position: CARD_POSITIONS.DEFEND[i],
				type: 'defend',
				occupied: false,
			});
		}
		setDropZones(zones);

		// Получаем размеры игровой зоны
		const zone = document.getElementById('playZone');
		if (zone) {
			const rect = zone.getBoundingClientRect();
			setPlayZone({
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
			});
		}

		return () => {
			console.log('Очистка эффекта...');
			socket.off('gameState');
		};
	}, [roomId, navigate]);

	const renderPlayerArea = (position) => {
		const player = gameState.players.find((p) => p.position === position);
		if (!player) return null;

		return (
			<Box
				sx={{
					p: 2,
					border: '1px solid #ccc',
					borderRadius: 2,
					textAlign: 'center',
					bgcolor: player.id === gameState.currentPlayer ? '#e3f2fd' : 'white',
				}}
			>
				<Typography variant='subtitle1'>{player.name}</Typography>
				<Typography variant='caption'>Карт: {player.cardCount}</Typography>
			</Box>
		);
	};

	const handleDragStart = (event) => {
		if (!isMyTurn) return;
		setActiveId(event.active.id);
		const card = gameState.myCards.find(
			(card) => `${card.suit}-${card.value}` === event.active.id
		);
		setDraggedCard(card);
	};

	const handleDragEnd = (event) => {
		const { active } = event;
		setActiveId(null);
		setDraggedCard(null);

		// Получаем координаты относительно игрового поля
		const playZone = document.getElementById('playZone');
		const playZoneRect = playZone.getBoundingClientRect();

		// Получаем координаты курсора
		const x = event.delta.x;
		const y = event.delta.y;

		// Проверяем, что карта находится в пределах игровой зоны
		if (
			x >= 0 &&
			x <= playZoneRect.width &&
			y >= 0 &&
			y <= playZoneRect.height
		) {
			const card = gameState.myCards.find(
				(card) => `${card.suit}-${card.value}` === active.id
			);

			if (card) {
				// Сохраняем позицию карты
				const newPosition = {
					x: event.delta.x,
					y: event.delta.y,
				};

				setCardPositions((prev) => ({
					...prev,
					[`${card.suit}-${card.value}`]: newPosition,
				}));

				// Отправляем ход на сервер
				socket.emit('playCard', {
					roomId,
					card,
					position: newPosition,
				});
			}
		}
	};

	const canPlayCard = (card, zoneType) => {
		if (!isMyTurn) return false;

		const tableCards = gameState.tableCards;

		if (zoneType === 'attack') {
			// Первый ход или подкидывание
			return (
				tableCards.length === 0 ||
				tableCards.some((tc) => tc.value === card.value)
			);
		} else {
			// Защита
			const lastAttackCard = tableCards[tableCards.length - 1];
			if (!lastAttackCard) return false;

			return card.suit === lastAttackCard.suit
				? CARD_VALUES[card.value] > CARD_VALUES[lastAttackCard.value]
				: card.suit === gameState.trumpCard.suit;
		}
	};

	if (isLoading) {
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					gap: 2,
				}}
			>
				<CircularProgress />
				<Typography>Загрузка игры...</Typography>
			</Box>
		);
	}

	return (
		<DndContext
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			collisionDetection={pointerWithin}
		>
			<Container maxWidth='lg' sx={{ height: '100vh' }}>
				<Box
					sx={{
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
						position: 'relative',
						pt: 2,
					}}
				>
					{/* Информация об игре */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							mb: 2,
							px: 2,
						}}
					>
						<Typography variant='h6'>
							{isMyTurn ? 'Ваш ход' : 'Ход противника'}
						</Typography>
						<Typography>Карт в колоде: {gameState.cardsInDeck}</Typography>
					</Box>

					{/* Игровое поле */}
					<Paper
						elevation={3}
						sx={{
							flex: 1,
							backgroundColor: '#2c7d32',
							position: 'relative',
							overflow: 'hidden',
							borderRadius: 2,
							p: 2,
						}}
					>
						{/* Карты противника */}
						<Box
							sx={{
								position: 'absolute',
								top: 20,
								left: '50%',
								transform: 'translateX(-50%)',
								display: 'flex',
								gap: 1,
							}}
						>
							{Array(
								gameState.players.find((p) => p.id === 'bot-1')?.cardCount || 0
							)
								.fill(null)
								.map((_, i) => (
									<Paper
										key={i}
										sx={{
											width: 60,
											height: 90,
											backgroundColor: '#b71c1c',
											borderRadius: 1,
										}}
									/>
								))}
						</Box>

						{/* Игровая зона */}
						<Box
							id='playZone'
							sx={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								width: '60%',
								height: '40%',
								border: '2px dashed rgba(255,255,255,0.2)',
								borderRadius: 2,
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							{/* Сыгранные карты */}
							{gameState.tableCards.map((card, index) => {
								const position = cardPositions[`${card.suit}-${card.value}`];
								return (
									<Box
										key={`table-${card.suit}-${card.value}-${index}`}
										sx={{
											position: 'absolute',
											left: position ? position.x : 0,
											top: position ? position.y : 0,
											transform: 'translate(-50%, -50%)',
											transition: 'all 0.3s ease',
											zIndex: index,
										}}
									>
										<Card {...card} isPlayable={false} />
									</Box>
								);
							})}
						</Box>

						{/* Колода и козырь */}
						<Box
							sx={{
								position: 'absolute',
								right: 40,
								top: '50%',
								transform: 'translateY(-50%)',
							}}
						>
							{gameState.trumpCard && (
								<>
									<Paper
										elevation={3}
										sx={{
											width: 60,
											height: 90,
											mb: 1,
											backgroundColor: 'white',
										}}
									>
										<Typography
											sx={{ textAlign: 'center', lineHeight: '90px' }}
										>
											{gameState.cardsInDeck}
										</Typography>
									</Paper>
									<Box
										sx={{
											transform: 'rotate(90deg)',
											transformOrigin: 'left top',
											ml: 2,
										}}
									>
										<Card {...gameState.trumpCard} isPlayable={false} />
									</Box>
								</>
							)}
						</Box>

						{/* Подсказки */}
						<Box
							sx={{
								position: 'absolute',
								top: 20,
								left: '50%',
								transform: 'translateX(-50%)',
								backgroundColor: 'rgba(0,0,0,0.7)',
								color: 'white',
								padding: 2,
								borderRadius: 2,
								display: isMyTurn ? 'block' : 'none',
							}}
						>
							<Typography>
								{gameState.tableCards.length === 0
									? 'Ходите любой картой'
									: 'Подкидывайте карты тех же значений или бейте карту противника'}
							</Typography>
						</Box>

						{/* Карты на столе с подсветкой козырей */}
						{gameState.tableCards.map((card, index) => (
							<Box
								key={index}
								sx={{
									position: 'absolute',
									left: card.position?.x || 0,
									top: card.position?.y || 0,
									filter:
										card.suit === gameState.trumpCard.suit
											? 'drop-shadow(0 0 5px gold)'
											: 'none',
								}}
							>
								<Card {...card} isPlayable={false} />
							</Box>
						))}

						{/* Мои карты */}
						<Box
							sx={{
								position: 'absolute',
								bottom: 20,
								left: '50%',
								transform: 'translateX(-50%)',
								display: 'flex',
								gap: 2,
								alignItems: 'flex-end',
							}}
						>
							{gameState.myCards.map((card) => {
								const cardId = `${card.suit}-${card.value}`;
								const position = cardPositions[cardId];

								return (
									<Box
										key={cardId}
										sx={{
											position: position ? 'absolute' : 'relative',
											left: position?.x,
											top: position?.y,
											transform: `translateY(${
												activeId === cardId ? -20 : 0
											}px)`,
											transition: 'all 0.3s ease',
										}}
									>
										<Card {...card} id={cardId} isPlayable={isMyTurn} />
									</Box>
								);
							})}
						</Box>
					</Paper>
				</Box>

				<DragOverlay>
					{draggedCard ? <Card {...draggedCard} isPlayable={true} /> : null}
				</DragOverlay>
			</Container>
		</DndContext>
	);
};

export default Game;
