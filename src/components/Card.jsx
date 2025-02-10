import { Paper, Typography } from '@mui/material';

const Card = ({ suit, value, onClick, isPlayable }) => {
	const getColor = () => {
		return suit === '♥' || suit === '♦' ? 'red' : 'black';
	};

	return (
		<Paper
			elevation={3}
			sx={{
				width: 60,
				height: 90,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '5px',
				cursor: isPlayable ? 'pointer' : 'default',
				'&:hover': isPlayable
					? {
							transform: 'translateY(-10px)',
							transition: 'transform 0.2s',
					  }
					: {},
				position: 'relative',
				backgroundColor: 'white',
			}}
			onClick={isPlayable ? onClick : undefined}
		>
			<Typography sx={{ color: getColor(), fontSize: '1.2rem' }}>
				{value}
			</Typography>
			<Typography
				sx={{
					color: getColor(),
					fontSize: '1.5rem',
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
				}}
			>
				{suit}
			</Typography>
			<Typography
				sx={{
					color: getColor(),
					fontSize: '1.2rem',
					alignSelf: 'flex-end',
					transform: 'rotate(180deg)',
				}}
			>
				{value}
			</Typography>
		</Paper>
	);
};

export default Card;
