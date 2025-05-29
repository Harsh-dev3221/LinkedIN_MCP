import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loading, handleLinkedInCallback } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Processing authentication...');
    const [authProcessed, setAuthProcessed] = useState(false);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check if this is a LinkedIn OAuth callback (has 'code' parameter)
                const linkedinCode = searchParams.get('code');
                const linkedinState = searchParams.get('state');

                if (linkedinCode && linkedinState) {
                    console.log('LinkedIn OAuth callback detected');
                    setStatus('Processing LinkedIn connection...');

                    try {
                        await handleLinkedInCallback(linkedinCode, linkedinState);
                        setStatus('LinkedIn connection successful! Redirecting to post creator...');
                        setAuthProcessed(true);
                        return;
                    } catch (error: any) {
                        console.error('LinkedIn OAuth error:', error);
                        setError(error.message || 'LinkedIn connection failed');
                        return;
                    }
                }

                // Handle Supabase OAuth callback (Google authentication)
                setStatus('Completing Google authentication...');

                // Check if there are OAuth parameters in the URL (hash or query)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const hasOAuthParams = hashParams.has('access_token') || searchParams.has('code');

                if (hasOAuthParams) {
                    console.log('OAuth parameters detected, processing...');
                    // Let Supabase handle the OAuth callback
                    const { data, error } = await supabase.auth.getSession();

                    if (error) {
                        console.error('OAuth processing error:', error);
                        setError(error.message);
                        return;
                    }

                    if (data.session) {
                        console.log('OAuth session established successfully');
                        setStatus('Authentication successful! Redirecting to dashboard...');
                        setAuthProcessed(true);
                        return;
                    }
                }

                // Fallback: check for existing session
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Auth callback error:', sessionError);
                    setError(sessionError.message);
                    return;
                }

                if (sessionData.session) {
                    console.log('Google authentication successful, redirecting to dashboard');
                    setStatus('Authentication successful! Redirecting to dashboard...');
                    setAuthProcessed(true);
                } else {
                    console.log('No session found, redirecting to auth');
                    navigate('/auth');
                }
            } catch (error: any) {
                console.error('Unexpected error in auth callback:', error);
                setError(error.message || 'An unexpected error occurred');
            }
        };

        handleAuthCallback();
    }, [navigate, searchParams]);

    // Separate effect to handle navigation when user is ready
    useEffect(() => {
        if (authProcessed && !loading) {
            if (user) {
                // Check if this was a LinkedIn OAuth callback
                const linkedinCode = searchParams.get('code');

                if (linkedinCode) {
                    console.log('LinkedIn connection successful, navigating to post creator');
                    navigate('/create');
                } else {
                    console.log('User is ready, navigating to dashboard');
                    navigate('/dashboard');
                }
            } else {
                // Give a bit more time for the auth context to update
                console.log('Auth processed but no user yet, waiting a bit more...');
                const timer = setTimeout(() => {
                    if (!user) {
                        console.log('Still no user after waiting, redirecting to auth');
                        navigate('/auth');
                    }
                }, 2000);

                return () => clearTimeout(timer);
            }
        }
    }, [authProcessed, loading, user, navigate, searchParams]);

    // If user is already authenticated when component loads, redirect immediately
    useEffect(() => {
        if (!loading && user && !authProcessed) {
            console.log('User already authenticated, redirecting to dashboard immediately');
            navigate('/dashboard');
        }
    }, [loading, user, authProcessed, navigate]);

    if (error) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2
                }}
            >
                <Alert severity="error" sx={{ maxWidth: 400 }}>
                    <Typography variant="h6" gutterBottom>
                        Authentication Error
                    </Typography>
                    <Typography variant="body2">
                        {error}
                    </Typography>
                </Alert>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2
            }}
        >
            <CircularProgress size={60} />
            <Typography variant="h6" color="text.secondary">
                {status}
            </Typography>
        </Box>
    );
};

export default AuthCallback;
