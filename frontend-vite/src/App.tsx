import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import { AuthProvider } from './contexts/AuthContext';
import GradientBackground from './components/GradientBackground';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import AuthCallback from './components/AuthCallback';
import UserDashboard from './components/UserDashboard';
import NewUnifiedPostCreator from './components/NewUnifiedPostCreator';
import ProtectedRoute from './components/ProtectedRoute';

// Create a theme with orange-yellow sunshine color palette
const theme = createTheme({
  palette: {
    primary: {
      main: '#ff8a00', // Orange
      light: '#ffa33a',
      dark: '#e67a00',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ffc000', // Yellow
      light: '#ffcf33',
      dark: '#e6ac00',
      contrastText: '#000',
    },
    background: {
      default: '#fcfcfc',
      paper: 'rgba(255, 255, 255, 0.85)',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      background: 'linear-gradient(90deg, #ff8a00, #ffc000)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textFillColor: 'transparent',
    },
    h5: {
      fontWeight: 600,
      color: '#ff8a00',
    },
    h1: {
      fontWeight: 800,
      fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
      background: 'linear-gradient(90deg, #ff8a00, #ffc000)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textFillColor: 'transparent',
    },
    h2: {
      fontWeight: 700,
      fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
      color: '#333',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(255, 138, 0, 0.2)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(255, 138, 0, 0.3)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #ff8a00, #ffc000)',
          '&:hover': {
            background: 'linear-gradient(45deg, #ff9d2a, #ffd133)',
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          '& .MuiStepIcon-root.Mui-active': {
            color: '#ff8a00',
          },
          '& .MuiStepIcon-root.Mui-completed': {
            color: '#ffc000',
          },
        },
      },
    },
  },
});

// Main content component that has access to routing
function AppContent() {
  const [showLanding, setShowLanding] = useState(true);
  const navigate = useNavigate();

  // Start the app flow
  const handleGetStarted = () => {
    setShowLanding(false);
  };

  const handleCreatePost = () => {
    navigate('/create');
  };

  return (
    <div className="app-container">
      <GradientBackground />
      <Routes>
        <Route
          path="/"
          element={
            showLanding ?
              <LandingPage onGetStarted={handleGetStarted} /> :
              <Navigate to="/auth" replace />
          }
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard onCreatePost={handleCreatePost} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <NewUnifiedPostCreator />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
