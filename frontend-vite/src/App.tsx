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

// Professional theme with beige, blue, and orange accents
const theme = createTheme({
  palette: {
    primary: {
      main: '#0A66C2', // LinkedIn blue
      light: '#378FE9',
      dark: '#004182',
      contrastText: '#fff',
    },
    secondary: {
      main: '#F5A623', // Warm orange
      light: '#FFB84D',
      dark: '#E09112',
      contrastText: '#fff',
    },
    background: {
      default: '#FAF7F2', // Warm beige
      paper: 'rgba(255, 255, 255, 0.95)',
    },
    text: {
      primary: '#2F2F2F',
      secondary: '#6B6B6B',
    },
    grey: {
      50: '#FEFDFB',
      100: '#F8F5F0',
      200: '#F0EBE3',
      300: '#E8E0D6',
      400: '#D4C4B0',
      500: '#B8A082',
      600: '#9C8660',
      700: '#7A6B4F',
      800: '#5C5142',
      900: '#3E3A35',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: 'clamp(2.5rem, 5vw, 4rem)',
      lineHeight: 1.2,
      color: '#2F2F2F',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
      lineHeight: 1.3,
      color: '#2F2F2F',
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
      color: '#0A66C2',
    },
    h5: {
      fontWeight: 500,
      color: '#2F2F2F',
    },
    h6: {
      fontWeight: 600,
      color: '#2F2F2F',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#2F2F2F',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#6B6B6B',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #FAF7F2 0%, #F5F1EA 100%)',
          minHeight: '100vh',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(245, 166, 35, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(10, 102, 194, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(245, 166, 35, 0.08) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
            zIndex: -1,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(47, 47, 47, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          background: 'rgba(255, 255, 255, 0.95)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(47, 47, 47, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          background: 'rgba(255, 255, 255, 0.95)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px rgba(47, 47, 47, 0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '0.95rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 25px rgba(10, 102, 194, 0.25)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0A66C2 0%, #378FE9 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #004182 0%, #0A66C2 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #F5A623 0%, #FFB84D 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #E09112 0%, #F5A623 100%)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
          backgroundColor: 'rgba(10, 102, 194, 0.1)',
        },
        bar: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Main content component that has access to routing
function AppContent() {
  const navigate = useNavigate();

  const handleCreatePost = () => {
    navigate('/create');
  };

  return (
    <div className="app-container">
      <GradientBackground />
      <Routes>
        <Route
          path="/"
          element={<LandingPage />}
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
