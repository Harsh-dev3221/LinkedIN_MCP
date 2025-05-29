import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, User, TokenStatus } from '../lib/supabase';
import axios from 'axios';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    tokenStatus: TokenStatus | null;
    linkedinConnected: boolean;
    mcpToken: string | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    connectLinkedIn: () => Promise<void>;
    handleLinkedInCallback: (code: string, state: string) => Promise<void>;
    refreshMcpToken: () => Promise<boolean>;
    refreshLinkedInStatus: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshTokenStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    const [mcpToken, setMcpToken] = useState<string | null>(() => {
        // Initialize from localStorage
        return localStorage.getItem('mcp_token');
    });
    const [loading, setLoading] = useState(true);
    const processingUserRef = useRef<string | null>(null);

    const API_BASE_URL = import.meta.env.VITE_MCP_SERVER_URL;

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                handleUserSession(session.user, session);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email);
                setSession(session);

                if (session?.user) {
                    await handleUserSession(session.user, session);
                } else {
                    setUser(null);
                    setTokenStatus(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const handleUserSession = async (supabaseUser: SupabaseUser, session: Session) => {
        try {
            console.log('Handling user session for:', supabaseUser.email);

            // Check if we're already processing this user to prevent duplicate calls
            if (processingUserRef.current === supabaseUser.email) {
                console.log('Already processing user session for:', supabaseUser.email);
                return;
            }

            // Check if we already have this user to prevent duplicate calls
            if (user && user.email === supabaseUser.email) {
                console.log('User already exists, skipping user creation');
                setLoading(false);
                return;
            }

            // Mark that we're processing this user
            processingUserRef.current = supabaseUser.email || null;

            // Create or get user in our backend
            const userData = {
                email: supabaseUser.email!,
                name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
                avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
                provider: supabaseUser.app_metadata?.provider as 'google' | 'linkedin',
                provider_id: supabaseUser.id
            };

            console.log('Creating/getting user with data:', userData);

            const response = await axios.post(`${API_BASE_URL}/api/users`, userData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            });

            console.log('User creation response:', response.data);
            console.log('Response status:', response.status);
            console.log('Response success field:', response.data.success);
            console.log('Response user field:', response.data.user);

            if (response.data.success) {
                setUser(response.data.user);
                console.log('User set successfully, fetching token status...');

                // Fetch token status immediately
                await fetchTokenStatus(session.access_token);

                // Validate LinkedIn connection using MCP token
                await validateLinkedInConnection();
            } else {
                console.error('Failed to create/get user:', response.data);
                console.error('Success field is:', response.data.success);
            }
        } catch (error) {
            console.error('Error handling user session:', error);
            if (axios.isAxiosError(error)) {
                console.error('Response data:', error.response?.data);
                console.error('Response status:', error.response?.status);
            }
        } finally {
            // Clear the processing flag
            processingUserRef.current = null;
            setLoading(false);
        }
    };

    const fetchTokenStatus = async (accessToken: string) => {
        try {
            console.log('Fetching token status with access token...');
            const response = await axios.get(`${API_BASE_URL}/api/users/tokens`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                timeout: 10000 // 10 second timeout
            });

            console.log('Token status response:', response.data);

            if (response.data.success) {
                setTokenStatus(response.data.tokens);
                console.log('Token status set successfully:', response.data.tokens);
            } else {
                console.error('Failed to get token status:', response.data);
            }
        } catch (error) {
            console.error('Error fetching token status:', error);
            if (axios.isAxiosError(error)) {
                console.error('Token fetch error - Status:', error.response?.status);
                console.error('Token fetch error - Data:', error.response?.data);
                console.error('Token fetch error - Headers:', error.response?.headers);
            }
        }
    };



    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) {
                console.error('Google sign in error:', error);
                throw error;
            }
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const connectLinkedIn = async () => {
        try {
            setLoading(true);
            // Generate and store state and code verifier for PKCE
            const state = Math.random().toString(36).substring(2, 15);
            const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            localStorage.setItem('linkedin_oauth_state', state);
            localStorage.setItem('codeVerifier', codeVerifier);

            // Redirect to our backend LinkedIn OAuth endpoint
            const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
            const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);

            window.location.href = `${API_BASE_URL}/oauth/authorize?` +
                `client_id=${clientId}&` +
                `redirect_uri=${redirectUri}&` +
                `state=${state}&` +
                `code_challenge=${codeVerifier}&` +
                `code_challenge_method=plain&` +
                `scope=openid%20profile%20email%20w_member_social`;
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const handleLinkedInCallback = async (code: string, state: string) => {
        try {
            setLoading(true);
            console.log('Processing LinkedIn OAuth callback...');

            // Verify state parameter
            const storedState = localStorage.getItem('linkedin_oauth_state');
            const codeVerifier = localStorage.getItem('codeVerifier');

            if (!storedState || !codeVerifier) {
                throw new Error('Missing OAuth state or code verifier');
            }

            if (state !== storedState) {
                throw new Error('Invalid OAuth state parameter');
            }

            // Exchange code for MCP token
            const response = await fetch(`${API_BASE_URL}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: import.meta.env.VITE_LINKEDIN_CLIENT_ID,
                    redirect_uri: `${window.location.origin}/auth/callback`,
                    code_verifier: codeVerifier,
                    code: code,
                    grant_type: 'authorization_code'
                })
            });

            if (!response.ok) {
                throw new Error(`Token exchange failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data.access_token) {
                throw new Error('No access token received from LinkedIn OAuth');
            }

            // Store the MCP token
            setMcpToken(data.access_token);
            localStorage.setItem('mcp_token', data.access_token);
            setLinkedinConnected(true);

            // Clean up localStorage
            localStorage.removeItem('linkedin_oauth_state');
            localStorage.removeItem('codeVerifier');

            console.log('LinkedIn OAuth completed successfully');
        } catch (error) {
            console.error('LinkedIn OAuth callback error:', error);
            setLinkedinConnected(false);
            setMcpToken(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
                throw error;
            }

            setUser(null);
            setTokenStatus(null);
            setSession(null);
            setMcpToken(null);
            localStorage.removeItem('mcp_token');
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const refreshTokenStatus = async () => {
        if (session?.access_token) {
            await fetchTokenStatus(session.access_token);
            // Don't use the old checkLinkedInConnection - use MCP token validation instead
            await validateLinkedInConnection();
        }
    };

    // Validate LinkedIn connection by checking MCP token
    const validateLinkedInConnection = async () => {
        if (mcpToken) {
            const isValid = await validateMcpToken(mcpToken);
            setLinkedinConnected(isValid);
        } else {
            setLinkedinConnected(false);
        }
    };

    // Manually refresh LinkedIn connection status
    const refreshLinkedInStatus = async () => {
        console.log('Manually refreshing LinkedIn connection status...');
        await validateLinkedInConnection();
    };

    // Check if stored MCP token is still valid
    const validateMcpToken = async (token: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/mcp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: "call-tool",
                    tool: "ping",
                    params: {}
                }),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.isError) {
                    return true;
                }
            }

            // Only clear token on authentication errors (401/403)
            if (response.status === 401 || response.status === 403) {
                console.log('MCP token expired or invalid, clearing...');
                setMcpToken(null);
                localStorage.removeItem('mcp_token');
                setLinkedinConnected(false);
                return false;
            }

            // For other errors (network, server errors), don't clear the token
            console.warn('MCP token validation failed with non-auth error:', response.status);
            return false;
        } catch (error: any) {
            // Only clear token if it's clearly an authentication issue
            if (error.name === 'AbortError') {
                console.warn('MCP token validation timed out');
                return false;
            }

            console.warn('MCP token validation error:', error.message);
            // Don't clear token on network errors - it might be temporary
            return false;
        }
    };

    // Refresh MCP token by re-authenticating with LinkedIn
    const refreshMcpToken = async (): Promise<boolean> => {
        try {
            if (!user) {
                console.error('No user found for MCP token refresh');
                return false;
            }

            console.log('Attempting to refresh MCP token...');
            setLoading(true);

            // Clear current token
            setMcpToken(null);
            localStorage.removeItem('mcp_token');
            setLinkedinConnected(false);

            // Redirect to LinkedIn OAuth to get a new token
            await connectLinkedIn();
            return true;
        } catch (error) {
            console.error('Error refreshing MCP token:', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Validate MCP token on app load and when token changes
    useEffect(() => {
        if (mcpToken && user) {
            validateMcpToken(mcpToken).then(isValid => {
                setLinkedinConnected(isValid);
                if (!isValid) {
                    console.log('MCP token validation failed - LinkedIn connection set to false');
                }
            });
        } else {
            // No MCP token means no LinkedIn connection
            setLinkedinConnected(false);
        }
    }, [mcpToken, user]);

    const value: AuthContextType = {
        user,
        session,
        tokenStatus,
        linkedinConnected,
        mcpToken,
        loading,
        signInWithGoogle,
        connectLinkedIn,
        handleLinkedInCallback,
        refreshMcpToken,
        refreshLinkedInStatus,
        signOut,
        refreshTokenStatus
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
