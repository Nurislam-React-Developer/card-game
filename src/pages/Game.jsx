import {
	Box,
	CircularProgress,
	Container,
	Grid,
	Paper,
	Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Card from '../components/Card';
import socket from '../services/socket';

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

	const handleCardClick = (card) => {
		if (!isMyTurn) return;
		console.log('Играем карту:', card);
		socket.emit('playCard', { roomId, card });
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
		<Container maxWidth='lg'>
			<Box sx={{ mt: 4, height: '100vh' }}>
				<Paper
					elevation={3}
					sx={{
						p: 4,
						height: '100%',
						position: 'relative',
						backgroundColor: '#f5f5f5',
					}}
				>
					{/* Верхний игрок */}
					<Box
						sx={{
							position: 'absolute',
							top: 20,
							left: '50%',
							transform: 'translateX(-50%)',
						}}
					>
						{renderPlayerArea('top')}
					</Box>

					{/* Левый игрок */}
					<Box
						sx={{
							position: 'absolute',
							left: 20,
							top: '50%',
							transform: 'translateY(-50%)',
						}}
					>
						{renderPlayerArea('left')}
					</Box>

					{/* Правый игрок */}
					<Box
						sx={{
							position: 'absolute',
							right: 20,
							top: '50%',
							transform: 'translateY(-50%)',
						}}
					>
						{renderPlayerArea('right')}
					</Box>

					{/* Игровой стол */}
					<Box
						sx={{
							position: 'absolute',
							top: '50%',
							left: '50%',
							transform: 'translate(-50%, -50%)',
							width: 300,
							height: 200,
							border: '2px dashed #ccc',
							borderRadius: 2,
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							backgroundColor: '#e8f5e9',
						}}
					>
						{gameState.tableCards.length > 0 ? (
							<Grid container spacing={2}>
								{gameState.tableCards.map((card, index) => (
									<Grid item key={index}>
										<Card {...card} />
									</Grid>
								))}
							</Grid>
						) : (
							<Typography color='textSecondary'>Ожидание хода...</Typography>
						)}
					</Box>

					{/* Мои карты */}
					<Box
						sx={{
							position: 'absolute',
							bottom: 20,
							left: '50%',
							transform: 'translateX(-50%)',
							display: 'flex',
							gap: 2,
						}}
					>
						{gameState.myCards.map((card, index) => (
							<Card
								key={index}
								{...card}
								isPlayable={isMyTurn}
								onClick={() => handleCardClick(card)}
							/>
						))}
					</Box>

					{/* Колода и козырь */}
					{gameState.trumpCard && (
						<Box
							sx={{
								position: 'absolute',
								right: 100,
								top: '50%',
								transform: 'translateY(-50%)',
							}}
						>
							<Paper
								elevation={3}
								sx={{
									width: 60,
									height: 90,
									mb: 1,
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'center',
									backgroundColor: '#fff',
								}}
							>
								<Typography>{gameState.cardsInDeck}</Typography>
							</Paper>
							<Box
								sx={{
									transform: 'rotate(90deg)',
									transformOrigin: 'left top',
									ml: 2,
								}}
							>
								<Card {...gameState.trumpCard} />
							</Box>
						</Box>
					)}

					{/* Информация о текущем ходе */}
					<Box sx={{ position: 'absolute', top: 20, left: 20 }}>
						<Typography variant='h6'>
							{isMyTurn ? 'Ваш ход' : 'Ход противника'}
						</Typography>
					</Box>
				</Paper>
			</Box>
		</Container>
	);
};

export default Game;
