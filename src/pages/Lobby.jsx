import {
	Box,
	CircularProgress,
	Container,
	List,
	ListItem,
	ListItemText,
	Paper,
	Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import socket from '../services/socket';

const Lobby = () => {
	const { roomId } = useParams();
	const navigate = useNavigate();
	const [players, setPlayers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isHost, setIsHost] = useState(false);

	useEffect(() => {
		const playerName = localStorage.getItem('playerName');

		if (!playerName) {
			toast.error('Имя игрока не найдено');
			navigate('/');
			return;
		}

		// Подключаемся к комнате
		socket.emit('joinRoom', {
			roomId,
			playerName,
			isNewRoom: window.location.pathname.includes('/create'),
		});

		// Слушаем подтверждение присоединения
		socket.on('joinedRoom', () => {
			setIsLoading(false);
		});

		// Слушаем обновления списка игроков
		socket.on('playersList', (playersList) => {
			setPlayers(playersList);
			setIsLoading(false);

			// Автоматически начинаем игру, когда есть игрок и бот
			if (playersList.length === 2) {
				socket.emit('startGame', { roomId });
			}
		});

		// Слушаем статус хоста
		socket.on('hostStatus', (status) => {
			setIsHost(status);
		});

		// Слушаем начало игры
		socket.on('gameStarted', () => {
			navigate(`/game/${roomId}`);
		});

		return () => {
			socket.emit('leaveRoom', { roomId });
			socket.off('joinedRoom');
			socket.off('playersList');
			socket.off('hostStatus');
			socket.off('gameStarted');
		};
	}, [roomId, navigate]);

	if (isLoading) {
		return (
			<Container>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						minHeight: '100vh',
					}}
				>
					<CircularProgress />
				</Box>
			</Container>
		);
	}

	return (
		<Container>
			<Box sx={{ mt: 4 }}>
				<Paper elevation={3} sx={{ p: 4 }}>
					<Typography variant='h4' gutterBottom>
						Комната ожидания
					</Typography>

					<Box sx={{ mt: 2 }}>
						<Typography variant='subtitle1'>ID комнаты: {roomId}</Typography>
					</Box>

					<Box sx={{ mt: 4 }}>
						<Typography variant='h6' gutterBottom>
							Игроки:
						</Typography>
						<List>
							{players.map((player) => (
								<ListItem key={player.id}>
									<ListItemText
										primary={`${player.name} ${player.isHost ? '(Хост)' : ''}`}
									/>
								</ListItem>
							))}
						</List>
					</Box>

					<Typography variant='body2' color='textSecondary' sx={{ mt: 2 }}>
						Игра начнется автоматически после подключения бота...
					</Typography>
				</Paper>
			</Box>
		</Container>
	);
};

export default Lobby;
