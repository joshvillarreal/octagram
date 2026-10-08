import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PuzzleErrorBoundary } from './components/PuzzleErrorBoundary';
import './styles.css';
import { savedTheme } from './game/theme';

document.documentElement.dataset.theme = savedTheme();

createRoot(document.getElementById('root')!).render(<StrictMode><PuzzleErrorBoundary><App /></PuzzleErrorBoundary></StrictMode>);
