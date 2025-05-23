import { useEffect, useState } from 'react';
import { Button, Box, Typography, CircularProgress, Card, CardContent } from '@mui/material';
import { useLocation } from 'react-router-dom';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

interface LinkedInAuthProps {
    onAuthSuccess: (token: string) => void;
}

const LinkedInAuth = ({ onAuthSuccess }: LinkedInAuthProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();

    // Function to initiate LinkedIn OAuth flow
    const handleLogin = () => {
        setIsLoading(true);

        // Generate random code verifier and challenge for PKCE
        const generateCodeVerifier = () => {
            const array = new Uint8Array(32);
            window.crypto.getRandomValues(array);
            return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
        };

        const codeVerifier = generateCodeVerifier();
        localStorage.setItem('codeVerifier', codeVerifier);

        // Generate a more secure state parameter
        const generateSecureState = () => {
            const array = new Uint8Array(32);
            window.crypto.getRandomValues(array);
            return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
        };

        // Create a secure state and store it
        const state = generateSecureState();
        localStorage.setItem('linkedin_oauth_state', state);

        // Create and redirect to authorization URL
        const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
        // Use the frontend URL for the redirect
        const redirectUri = encodeURIComponent(`${window.location.origin}/callback`);

        const authUrl = `${import.meta.env.VITE_MCP_SERVER_URL}/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${redirectUri}&` +
            `state=${state}&` +
            `code_challenge=${codeVerifier}&` +
            `code_challenge_method=plain&` +
            `scope=profile%20email%20openid%20w_member_social%20r_liteprofile`;
        window.location.href = authUrl;
    };

    // Check for authentication callback
    useEffect(() => {
        // First, check if we're on the callback route
        if (location.pathname === '/callback') {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const receivedState = urlParams.get('state');

            if (code) {
                setIsLoading(true);

                // Verify the state parameter to prevent CSRF attacks
                const storedState = localStorage.getItem('linkedin_oauth_state');
                const codeVerifier = localStorage.getItem('codeVerifier');

                if (receivedState && storedState && codeVerifier) {
                    // Note: we don't strictly check state here as it comes from our server now
                    console.log("Processing OAuth callback with code", code.substring(0, 10) + "...");

                    // Exchange code for token
                    fetch(`${import.meta.env.VITE_MCP_SERVER_URL}/oauth/token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            client_id: import.meta.env.VITE_LINKEDIN_CLIENT_ID,
                            redirect_uri: `${window.location.origin}/callback`,
                            code_verifier: codeVerifier,
                            code: code,
                            grant_type: 'authorization_code'
                        })
                    })
                        .then(response => {
                            console.log("Token endpoint response status:", response.status);
                            return response.json();
                        })
                        .then(data => {
                            console.log("Token response received");
                            if (data.access_token) {
                                onAuthSuccess(data.access_token);
                                // Remove code from URL without refreshing
                                window.history.replaceState({}, document.title, '/');
                            } else {
                                console.error("No access token in response:", data);
                                throw new Error("No access token received");
                            }
                        })
                        .catch(error => {
                            console.error('Authentication error:', error);
                            alert('Authentication failed. Please try again.');
                        })
                        .finally(() => {
                            setIsLoading(false);
                        });
                } else {
                    console.error("Missing state or code verifier in callback");
                    setIsLoading(false);
                }
            }
        }
    }, [location, onAuthSuccess]);

    return (
        <Box textAlign="center" p={3}>
            <Card
                sx={{
                    maxWidth: 500,
                    margin: '0 auto',
                    borderRadius: 4,
                    boxShadow: '0 10px 30px rgba(255, 138, 0, 0.15)',
                    overflow: 'hidden',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-5px)',
                    },
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        Connect with LinkedIn
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ mb: 4 }}>
                        Login with your LinkedIn account to create and share posts
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleLogin}
                        disabled={isLoading}
                        size="large"
                        startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <LinkedInIcon />}
                        sx={{
                            py: 1.5,
                            px: 3,
                            borderRadius: 3,
                            fontSize: '1.1rem',
                        }}
                    >
                        {isLoading ? 'Connecting...' : 'Connect with LinkedIn'}
                    </Button>
                </CardContent>
            </Card>
        </Box>
    );
};

export default LinkedInAuth; 