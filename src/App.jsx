import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { theme } from './theme/theme';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
function App() {
	return (
		<ThemeProvider theme={theme}>
			<BrowserRouter>
				<Routes>
					<Route path='/' element={<Home />} />
					<Route path='/lobby/:roomId' element={<Lobby />} />
					<Route path='/game/:roomId' element={<Game />} />
				</Routes>
			</BrowserRouter>
			<ToastContainer />
		</ThemeProvider>
	);
}

export default App;
