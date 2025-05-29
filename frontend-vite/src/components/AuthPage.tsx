import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Stack
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
    const { signInWithGoogle, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [signingInWith, setSigningInWith] = useState<'google' | null>(null);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            setSigningInWith('google');
            await signInWithGoogle();
        } catch (error: any) {
            console.error('Google sign in failed:', error);
            setError(error.message || 'Failed to sign in with Google');
            setSigningInWith(null);
        }
    };



    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                position: 'relative',
                zIndex: 10
            }}
        >
            <Card
                sx={{
                    maxWidth: 400,
                    width: '100%',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                        Welcome Back
                    </Typography>

                    <Typography variant="body1" sx={{ textAlign: 'center', mb: 4, color: 'text.secondary' }}>
                        Sign in with Google to access your LinkedIn post creator with AI-powered content generation
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    <Stack spacing={2}>
                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            startIcon={
                                signingInWith === 'google' ?
                                    <CircularProgress size={20} color="inherit" /> :
                                    <GoogleIcon />
                            }
                            sx={{
                                py: 1.5,
                                borderRadius: 3,
                                fontSize: '1rem',
                                background: 'linear-gradient(45deg, #4285f4, #34a853)',
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #3367d6, #2d8f47)',
                                },
                            }}
                        >
                            {signingInWith === 'google' ? 'Signing in...' : 'Continue with Google'}
                        </Button>


                    </Stack>

                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            By signing in, you agree to our terms of service and privacy policy.
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255, 138, 0, 0.1)', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600, color: 'primary.main' }}>
                            🎉 Get 50 free tokens daily!
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'center', mt: 1, color: 'text.secondary' }}>
                            • Basic posts: Free<br />
                            • AI-enhanced posts: 5 tokens<br />
                            • Multi-image posts: 10 tokens<br />
                            • Connect LinkedIn after sign-in to start posting
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AuthPage;
