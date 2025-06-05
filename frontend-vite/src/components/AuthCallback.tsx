import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loading, handleLinkedInCallback } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Processing authentication...');
    const [authProcessed, setAuthProcessed] = useState(false);
    const [isLinkedInCallback, setIsLinkedInCallback] = useState(false);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check if this is a LinkedIn OAuth callback (has 'code' parameter)
                const linkedinCode = searchParams.get('code');
                const linkedinState = searchParams.get('state');

                if (linkedinCode && linkedinState) {
                    logger.debug('LinkedIn OAuth callback detected');
                    setStatus('Processing LinkedIn connection...');
                    setIsLinkedInCallback(true);

                    try {
                        // handleLinkedInCallback now returns boolean indicating success
                        const connectionSuccess = await handleLinkedInCallback(linkedinCode, linkedinState);

                        if (connectionSuccess) {
                            setStatus('✅ LinkedIn connection successful!');
                            logger.debug('LinkedIn connection completed successfully');
                        } else {
                            setStatus('⚠️ LinkedIn connection validation failed');
                            logger.warn('LinkedIn connection was established but validation failed');
                        }

                        setAuthProcessed(true);
                        return;
                    } catch (error: any) {
                        logger.error('LinkedIn OAuth error:', error);
                        setError(error.message || 'LinkedIn connection failed');
                        return;
                    }
                }

                // Handle Supabase OAuth callback (Google authentication)
                setStatus('Completing Google authentication...');

                // Check if there are OAuth parameters in the URL (hash or query)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const hasOAuthParams = hashParams.has('access_token') || searchParams.has('code') || searchParams.has('access_token');

                logger.debug('Checking OAuth parameters');

                if (hasOAuthParams) {
                    logger.debug('OAuth parameters detected, processing');

                    // For Supabase OAuth, we need to call getSession() which will automatically
                    // process the OAuth callback parameters from the URL
                    const { data, error } = await supabase.auth.getSession();

                    if (error) {
                        logger.error('OAuth processing error:', error);
                        setError(error.message);
                        return;
                    }

                    if (data.session) {
                        logger.debug('OAuth session established successfully');
                        setStatus('Authentication successful! Redirecting to dashboard...');
                        setAuthProcessed(true);
                        return;
                    } else {
                        logger.debug('OAuth parameters found but no session created, waiting for auth context');
                        // Don't immediately redirect, wait for the auth context to update
                        setStatus('Processing authentication...');
                        setAuthProcessed(true);
                        return;
                    }
                }

                // Fallback: check for existing session
                logger.debug('No OAuth parameters, checking for existing session');
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    logger.error('Auth callback error:', sessionError);
                    setError(sessionError.message);
                    return;
                }

                if (sessionData.session) {
                    logger.debug('Existing session found, redirecting to dashboard');
                    setStatus('Authentication successful! Redirecting to dashboard...');
                    setAuthProcessed(true);
                } else {
                    logger.debug('No session found and no OAuth parameters, waiting for auth context');
                    // Instead of immediately redirecting to /auth, wait for the auth context to update
                    // This prevents the double authentication flow
                    setStatus('Checking authentication status...');
                    setAuthProcessed(true);
                }
            } catch (error: any) {
                logger.error('Unexpected error in auth callback:', error);
                setError(error.message || 'An unexpected error occurred');
            }
        };

        handleAuthCallback();
    }, [navigate, searchParams]);

    // Separate effect to handle navigation when user is ready
    useEffect(() => {
        if (authProcessed && !loading) {
            if (user) {
                if (isLinkedInCallback) {
                    // For LinkedIn callbacks, navigate immediately since connection status is already set
                    logger.debug('LinkedIn callback processed, navigating to post creator');
                    navigate('/create');
                } else {
                    logger.debug('User is ready, navigating to dashboard');
                    navigate('/dashboard');
                }
            } else {
                // Give more time for the auth context to update after OAuth
                logger.debug('Auth processed but no user yet, waiting for auth context to update');
                const timer = setTimeout(() => {
                    if (!user) {
                        logger.debug('Still no user after waiting, checking if we should redirect to dashboard anyway');
                        // If we have OAuth parameters or processed auth, try dashboard first
                        const hashParams = new URLSearchParams(window.location.hash.substring(1));
                        const hasOAuthParams = hashParams.has('access_token') || searchParams.has('code') || searchParams.has('access_token');

                        if (hasOAuthParams) {
                            logger.debug('OAuth parameters detected, redirecting to dashboard despite no user context');
                            navigate('/dashboard');
                        } else {
                            logger.debug('No OAuth parameters, redirecting to auth');
                            navigate('/auth');
                        }
                    }
                }, 3000); // Reduced to 3 seconds for faster UX

                return () => clearTimeout(timer);
            }
        }
    }, [authProcessed, loading, user, navigate, isLinkedInCallback]);

    // If user is already authenticated when component loads, redirect immediately
    useEffect(() => {
        if (!loading && user && !authProcessed) {
            logger.debug('User already authenticated, redirecting to dashboard immediately');
            navigate('/dashboard');
        }
    }, [loading, user, authProcessed, navigate]);

    // Additional effect to check Supabase session directly if auth context is slow
    useEffect(() => {
        const checkSupabaseSession = async () => {
            if (authProcessed && !user && !loading) {
                logger.debug('Auth context slow, checking Supabase session directly');
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    if (session && !error) {
                        logger.debug('Found Supabase session, redirecting to dashboard');
                        navigate('/dashboard');
                    }
                } catch (error) {
                    logger.error('Error checking Supabase session:', error);
                }
            }
        };

        // Check after a short delay to allow auth context to update
        const timer = setTimeout(checkSupabaseSession, 1000);
        return () => clearTimeout(timer);
    }, [authProcessed, user, loading, navigate]);

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
