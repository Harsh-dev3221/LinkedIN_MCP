import { useEffect, useState } from 'react';
import { Button, Box, Typography, CircularProgress } from '@mui/material';

interface LinkedInAuthProps {
    onAuthSuccess: (token: string) => void;
}

const LinkedInAuth = ({ onAuthSuccess }: LinkedInAuthProps) => {
    const [isLoading, setIsLoading] = useState(false);

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
        const redirectUri = encodeURIComponent(`${import.meta.env.VITE_MCP_SERVER_URL}/oauth/callback`);

        const authUrl = `${import.meta.env.VITE_MCP_SERVER_URL}/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${redirectUri}&` +
            `state=${state}&` +
            `code_challenge=${codeVerifier}&` +
            `code_challenge_method=plain&` +
            `scope=profile%20email%20openid%20w_member_social`;

        window.location.href = authUrl;
    };

    // Check for authentication callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const receivedState = urlParams.get('state');
        const storedState = localStorage.getItem('linkedin_oauth_state');

        // If we have a code, process the authentication
        if (code) {
            // Verify the state parameter to prevent CSRF attacks
            if (receivedState && storedState && receivedState === storedState) {
                setIsLoading(true);
                const codeVerifier = localStorage.getItem('codeVerifier');

                // Exchange code for token
                fetch(`${import.meta.env.VITE_MCP_SERVER_URL}/oauth/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: import.meta.env.VITE_LINKEDIN_CLIENT_ID,
                        redirect_uri: `${import.meta.env.VITE_MCP_SERVER_URL}/oauth/callback`,
                        code_verifier: codeVerifier,
                        code: code,
                        grant_type: 'authorization_code'
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.access_token) {
                            onAuthSuccess(data.access_token);
                            // Remove code from URL without refreshing
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    })
                    .catch(error => {
                        console.error('Authentication error:', error);
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            }
        }
    }, [onAuthSuccess]);

    return (
        <Box textAlign="center" p={3}>
            <Typography variant="h5" gutterBottom>
                Connect with LinkedIn
            </Typography>
            <Typography variant="body1" paragraph>
                Login with your LinkedIn account to create and share posts
            </Typography>
            <Button
                variant="contained"
                color="primary"
                onClick={handleLogin}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : null}
            >
                {isLoading ? 'Connecting...' : 'Connect with LinkedIn'}
            </Button>
        </Box>
    );
};

export default LinkedInAuth; 