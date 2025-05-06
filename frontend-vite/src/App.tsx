import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import LinkedInAuth from './components/LinkedInAuth';
import GradientBackground from './components/GradientBackground';
import LandingPage from './components/LandingPage';
import NewUnifiedPostCreator from './components/NewUnifiedPostCreator';

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
  const location = useLocation();
  const navigate = useNavigate();
  // State management
  const [showLanding, setShowLanding] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Check if we're on the callback route
  useEffect(() => {
    // If we're on the callback route, we don't want to show the landing page
    if (location.pathname === '/callback') {
      setShowLanding(false);
    }

    // Check for existing auth token in localStorage
    const savedToken = localStorage.getItem('linkedin_token');
    if (savedToken) {
      setAuthToken(savedToken);
    }
  }, [location]);

  // Start the app flow
  const handleGetStarted = () => {
    setShowLanding(false);
  };

  // Handle LinkedIn authentication
  const handleAuthSuccess = (token: string) => {
    setAuthToken(token);
    // Save token to localStorage for later use
    localStorage.setItem('linkedin_token', token);
    navigate('/create');
  };

  // Handle reset/logout
  const handleReset = () => {
    localStorage.removeItem('linkedin_token');
    setAuthToken(null);
    setShowLanding(true);
    navigate('/');
  };

  // Render the app UI based on the current state
  const renderAppUI = () => {
    if (showLanding) {
      return <LandingPage onGetStarted={handleGetStarted} />;
    }

    if (!authToken) {
      return <LinkedInAuth onAuthSuccess={handleAuthSuccess} />;
    }

    return <Navigate to="/create" />;
  };

  return (
    <div className="app-container">
      <GradientBackground />
      <Routes>
        <Route path="/" element={renderAppUI()} />
        <Route path="/callback" element={<LinkedInAuth onAuthSuccess={handleAuthSuccess} />} />
        <Route path="/create" element={<NewUnifiedPostCreator authToken={authToken || undefined} />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
