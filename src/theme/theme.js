import { createTheme } from '@mui/material';

export const theme = createTheme({
	palette: {
		primary: {
			main: '#1976d2',
		},
		secondary: {
			main: '#dc004e',
		},
		background: {
			default: '#f5f5f5',
			paper: '#ffffff',
		},
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					textTransform: 'none',
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
				},
			},
		},
	},
});
