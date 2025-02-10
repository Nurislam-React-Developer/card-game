import {
	Box,
	Button,
	Container,
	Paper,
	TextField,
	Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Home = () => {
	const navigate = useNavigate();
	const [playerName, setPlayerName] = useState('');

	const startGame = () => {
		if (!playerName.trim()) {
			toast.error('Пожалуйста, введите ваше имя');
			return;
		}

		// Сохраняем имя игрока
		localStorage.setItem('playerName', playerName);

		// Генерируем случайный ID комнаты
		const roomId = Math.random().toString(36).substring(2, 8);

		// Сразу переходим в игру
		navigate(`/game/${roomId}`);
	};

	return (
		<Container maxWidth='sm'>
			<Box sx={{ mt: 8 }}>
				<Paper elevation={3} sx={{ p: 4 }}>
					<Typography variant='h4' gutterBottom align='center'>
						Дурак
					</Typography>

					<Box sx={{ mt: 4 }}>
						<TextField
							fullWidth
							label='Ваше имя'
							variant='outlined'
							value={playerName}
							onChange={(e) => setPlayerName(e.target.value)}
							sx={{ mb: 2 }}
						/>

						<Button
							fullWidth
							variant='contained'
							color='primary'
							size='large'
							onClick={startGame}
						>
							Начать игру
						</Button>
					</Box>
				</Paper>
			</Box>
		</Container>
	);
};

export default Home;
