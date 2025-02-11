import { useDraggable } from '@dnd-kit/core';
import { Paper, Typography } from '@mui/material';

const Card = ({ suit, value, onClick, isPlayable, id }) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: id || `${suit}-${value}`,
			disabled: !isPlayable,
		});

	const getColor = () => {
		return suit === '♥' || suit === '♦' ? 'red' : 'black';
	};

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
				zIndex: isDragging ? 1000 : 1,
				opacity: isDragging ? 0.8 : 1,
		  }
		: undefined;

	return (
		<Paper
			ref={setNodeRef}
			elevation={3}
			sx={{
				width: 60,
				height: 90,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '5px',
				cursor: isPlayable ? 'grab' : 'default',
				'&:hover': isPlayable
					? {
							transform: 'translateY(-10px)',
							transition: 'transform 0.2s',
					  }
					: {},
				position: 'relative',
				touchAction: 'none',
				...style,
			}}
			{...attributes}
			{...listeners}
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
