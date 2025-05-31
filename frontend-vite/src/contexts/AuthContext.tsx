import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, User, TokenStatus } from '../lib/supabase';
import axios from 'axios';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    tokenStatus: TokenStatus | null;
    linkedinConnected: boolean;
    linkedinStatusLoading: boolean;
    mcpToken: string | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    connectLinkedIn: () => Promise<void>;
    handleLinkedInCallback: (code: string, state: string) => Promise<boolean>;
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

// Auth state machine to prevent cascading updates
enum AuthState {
    INITIALIZING = 'initializing',
    AUTHENTICATED = 'authenticated',
    CHECKING_LINKEDIN = 'checking_linkedin',
    READY = 'ready',
    ERROR = 'error'
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    // Core state
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    const [linkedinStatusLoading, setLinkedinStatusLoading] = useState(false);
    const [mcpToken, setMcpToken] = useState<string | null>(() => {
        // SECURITY: Get token from localStorage but will validate ownership later
        return localStorage.getItem('mcp_token');
    });
    const [lastAuthenticatedUserId, setLastAuthenticatedUserId] = useState<string | null>(() => {
        return localStorage.getItem('last_user_id');
    });
    const [loading, setLoading] = useState(true);

    // State machine to prevent cascading updates
    const [authState, setAuthState] = useState<AuthState>(AuthState.INITIALIZING);

    // Refs to prevent duplicate operations
    const initializationRef = useRef<boolean>(false);
    const userCreationRef = useRef<Set<string>>(new Set());
    const linkedinValidationRef = useRef<boolean>(false);
    const tokenValidationCacheRef = useRef<{
        token: string | null;
        isValid: boolean;
        timestamp: number;
    }>({ token: null, isValid: false, timestamp: 0 });

    // Additional protection against window focus and refresh issues
    const lastProcessedSessionRef = useRef<string | null>(null);
    const sessionProcessingRef = useRef<boolean>(false);

    const API_BASE_URL = import.meta.env.VITE_MCP_SERVER_URL;
    const TOKEN_VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Single initialization effect - runs once only
    useEffect(() => {
        if (initializationRef.current) return;
        initializationRef.current = true;

        const initializeAuth = async () => {
            try {
                setAuthState(AuthState.INITIALIZING);

                // Get initial session
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);

                // Set up auth listener FIRST (before processing initial session)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    async (event, session) => {
                        console.log(`🔔 Auth event: ${event}, Session exists: ${!!session?.user}`);

                        // Prevent processing if already processing a session
                        if (sessionProcessingRef.current) {
                            console.log(`⏳ BLOCKED: Session already being processed`);
                            return;
                        }

                        // Create session identifier for deduplication
                        const sessionId = session?.user ? `${session.user.id}-${session.access_token?.substring(0, 10)}` : null;

                        // Skip if we just processed this exact session
                        if (sessionId && lastProcessedSessionRef.current === sessionId) {
                            console.log(`🔄 SKIPPED: Session already processed: ${sessionId}`);
                            return;
                        }

                        setSession(session);

                        // Only process specific auth events that require user creation
                        if (event === 'SIGNED_IN') {
                            if (session?.user) {
                                lastProcessedSessionRef.current = sessionId;
                                sessionProcessingRef.current = true;
                                try {
                                    await createOrGetUser(session.user, session);
                                } finally {
                                    sessionProcessingRef.current = false;
                                }
                            }
                        } else if (event === 'SIGNED_OUT') {
                            lastProcessedSessionRef.current = null;
                            resetAuthState();
                        } else if (event === 'TOKEN_REFRESHED') {
                            // Don't create user on token refresh, just update session
                            console.log(`🔄 Token refreshed, session updated`);
                        } else {
                            console.log(`ℹ️ Ignored auth event: ${event}`);
                        }
                    }
                );

                // Process initial session AFTER listener is set up
                if (session?.user) {
                    console.log(`🔄 Processing initial session for: ${session.user.email}`);
                    const sessionId = `${session.user.id}-${session.access_token?.substring(0, 10)}`;
                    lastProcessedSessionRef.current = sessionId;
                    sessionProcessingRef.current = true;
                    try {
                        await createOrGetUser(session.user, session);
                    } finally {
                        sessionProcessingRef.current = false;
                    }
                } else {
                    console.log(`ℹ️ No initial session found`);
                    setAuthState(AuthState.READY);
                    setLoading(false);
                }

                return () => subscription.unsubscribe();
            } catch (error) {
                console.error('Auth initialization error:', error);
                setAuthState(AuthState.ERROR);
                setLoading(false);
            }
        };

        initializeAuth();
    }, []); // Empty deps - run once only



    // Reset auth state on logout - SECURITY: Clear ALL user data
    const resetAuthState = useCallback(() => {
        console.log('🧹 SECURITY: Clearing all user data and tokens');

        // Clear React state
        setUser(null);
        setTokenStatus(null);
        setLinkedinConnected(false);
        setMcpToken(null);
        setAuthState(AuthState.READY);
        setLoading(false);

        // SECURITY: Clear ALL localStorage items to prevent token leakage
        localStorage.removeItem('mcp_token');
        localStorage.removeItem('linkedin_oauth_state');
        localStorage.removeItem('codeVerifier');
        localStorage.removeItem('last_user_id');

        // SECURITY: Clear all validation caches and refs
        linkedinValidationRef.current = false;
        tokenValidationCacheRef.current = { token: null, isValid: false, timestamp: 0 };
        userCreationRef.current.clear();
        lastProcessedSessionRef.current = null;
        sessionProcessingRef.current = false;

        console.log('✅ SECURITY: All user data cleared successfully');
    }, []);

    // Create or get user - ABSOLUTELY no duplicate calls
    const createOrGetUser = useCallback(async (supabaseUser: SupabaseUser, session: Session) => {
        const userKey = `${supabaseUser.id}-${supabaseUser.email}`;

        console.log(`🔍 createOrGetUser called for: ${supabaseUser.email}`);

        // FIRST CHECK: Prevent duplicate user creation
        if (userCreationRef.current.has(userKey)) {
            console.log(`❌ BLOCKED: User creation already in progress for: ${supabaseUser.email}`);
            return;
        }

        // SECOND CHECK: If we already have this exact user, skip completely
        if (user && user.email === supabaseUser.email) {
            console.log(`✅ SKIPPED: User already exists: ${supabaseUser.email}`);
            setLoading(false);
            return;
        }

        // THIRD CHECK: If auth state is already READY or AUTHENTICATED, skip
        if (authState === AuthState.READY || authState === AuthState.AUTHENTICATED) {
            console.log(`✅ SKIPPED: Auth already in progress/complete for: ${supabaseUser.email}`);
            setLoading(false);
            return;
        }

        try {
            console.log(`🚀 PROCEEDING: Creating/getting user: ${supabaseUser.email}`);
            userCreationRef.current.add(userKey);
            setAuthState(AuthState.AUTHENTICATED);

            const userData = {
                email: supabaseUser.email!,
                name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
                avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
                provider: supabaseUser.app_metadata?.provider as 'google' | 'linkedin',
                provider_id: supabaseUser.id
            };

            const response = await axios.post(`${API_BASE_URL}/api/users`, userData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.success) {
                const backendUser = response.data.user;
                console.log(`✅ SUCCESS: User created/retrieved: ${backendUser.email}`);

                // SECURITY: Check if this is a different user than last time
                if (lastAuthenticatedUserId && lastAuthenticatedUserId !== backendUser.id) {
                    console.log('🔄 SECURITY: Different user detected, clearing previous user data');
                    localStorage.removeItem('mcp_token');
                    localStorage.removeItem('linkedin_oauth_state');
                    localStorage.removeItem('codeVerifier');
                    setMcpToken(null);
                    setLinkedinConnected(false);
                    tokenValidationCacheRef.current = { token: null, isValid: false, timestamp: 0 };
                }

                // Store current user ID for future security checks
                setLastAuthenticatedUserId(backendUser.id);
                localStorage.setItem('last_user_id', backendUser.id);

                setUser(backendUser);

                // Fetch token status (inline to avoid circular dependency)
                try {
                    const tokenResponse = await axios.get(`${API_BASE_URL}/api/users/tokens`, {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        timeout: 10000
                    });
                    if (tokenResponse.data.success) {
                        setTokenStatus(tokenResponse.data.tokens);
                    }
                } catch (error) {
                    console.error('Error fetching token status:', error);
                }

                // Check LinkedIn status (inline to avoid circular dependency)
                if (mcpToken) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/mcp`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${mcpToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                type: "call-tool",
                                tool: "ping",
                                params: {}
                            }),
                            signal: AbortSignal.timeout(10000)
                        });
                        const responseData = await response.json();
                        const isValid = response.ok && !responseData.isError && responseData.linkedinConnected;
                        setLinkedinConnected(isValid);
                    } catch (error) {
                        setLinkedinConnected(false);
                    }
                } else {
                    setLinkedinConnected(false);
                }

                setAuthState(AuthState.READY);
            } else {
                throw new Error('Failed to create user');
            }
        } catch (error) {
            console.error('❌ ERROR creating user:', error);
            setAuthState(AuthState.ERROR);
        } finally {
            userCreationRef.current.delete(userKey);
            setLoading(false);
        }
    }, [user, authState, API_BASE_URL, mcpToken]);

    // Fetch token status from backend
    const fetchTokenStatus = useCallback(async (accessToken: string) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/tokens`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                timeout: 10000
            });

            if (response.data.success) {
                setTokenStatus(response.data.tokens);
            }
        } catch (error) {
            console.error('Error fetching token status:', error);
        }
    }, [API_BASE_URL]);

    // Validate MCP token with caching and ownership verification
    const validateMcpToken = useCallback(async (token: string, forceValidation = false): Promise<boolean> => {
        // Check cache first (but only if not forcing validation)
        if (!forceValidation) {
            const cache = tokenValidationCacheRef.current;
            const now = Date.now();

            if (cache.token === token && (now - cache.timestamp) < TOKEN_VALIDATION_CACHE_DURATION) {
                console.log('🔒 Using cached token validation result');
                return cache.isValid;
            }
        }

        try {
            console.log(`🔍 Validating MCP token...`);

            // Prepare headers and body - include user info if available for security
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const requestBody: any = {
                type: "call-tool",
                tool: "ping",
                params: {}
            };

            // SECURITY: Include user ID if available for backend verification
            if (user) {
                headers['X-User-ID'] = user.id;
                requestBody.params.userId = user.id;
                console.log(`🔍 SECURITY: Including user ID for validation: ${user.email}`);
            } else {
                console.log('🔍 Validating token without user context (during OAuth flow)');
            }

            const response = await fetch(`${API_BASE_URL}/mcp`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(10000)
            });

            const responseData = await response.json();
            console.log('🔍 Full response data:', JSON.stringify(responseData, null, 2));
            console.log('🔍 Response structure check:', {
                responseOk: response.ok,
                hasIsError: 'isError' in responseData,
                isError: responseData.isError,
                hasLinkedinConnected: 'linkedinConnected' in responseData,
                linkedinConnected: responseData.linkedinConnected,
                responseKeys: Object.keys(responseData)
            });
            const isValid = response.ok && !responseData.isError && responseData.linkedinConnected;

            // SECURITY: Additional check for token ownership (only if user is available)
            if (user && response.ok && !responseData.isError && responseData.userId && responseData.userId !== user.id) {
                console.error('🚨 SECURITY VIOLATION: Token belongs to different user!');
                console.error(`Expected user: ${user.id}, Token user: ${responseData.userId}`);
                setMcpToken(null);
                localStorage.removeItem('mcp_token');
                setLinkedinConnected(false);
                return false;
            }

            // Cache the result
            tokenValidationCacheRef.current = {
                token,
                isValid,
                timestamp: Date.now()
            };

            if (!isValid && (response.status === 401 || response.status === 403)) {
                console.log('🔒 Clearing invalid/unauthorized token');
                setMcpToken(null);
                localStorage.removeItem('mcp_token');
                setLinkedinConnected(false);
            }

            console.log(`🔒 Token validation result: ${isValid ? 'VALID' : 'INVALID'}`);
            return isValid;
        } catch (error) {
            console.error('🔒 Token validation failed:', error);
            // Cache negative result
            tokenValidationCacheRef.current = {
                token,
                isValid: false,
                timestamp: Date.now()
            };
            return false;
        }
    }, [API_BASE_URL, user]);

    // Validate MCP token with retry mechanism for better reliability
    const validateMcpTokenWithRetry = useCallback(async (token: string, maxRetries: number = 3): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxRetries}: Validating MCP token...`);
                const isValid = await validateMcpToken(token, true);

                if (isValid) {
                    console.log(`✅ Token validation successful on attempt ${attempt}`);
                    return true;
                }

                if (attempt < maxRetries) {
                    console.log(`⏳ Attempt ${attempt} failed, waiting before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                }
            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed with error:`, error);
                if (attempt < maxRetries) {
                    console.log(`⏳ Waiting before retry attempt ${attempt + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                }
            }
        }

        console.error(`❌ All ${maxRetries} validation attempts failed`);
        return false;
    }, [validateMcpToken]);

    // Check LinkedIn connection status - only validates when needed
    const checkLinkedInStatus = useCallback(async () => {
        if (!mcpToken) {
            setLinkedinConnected(false);
            setLinkedinStatusLoading(false);
            return;
        }

        // Prevent duplicate validation
        if (linkedinValidationRef.current) {
            return;
        }

        try {
            linkedinValidationRef.current = true;
            setLinkedinStatusLoading(true);
            setAuthState(AuthState.CHECKING_LINKEDIN);

            const isValid = await validateMcpToken(mcpToken);
            setLinkedinConnected(isValid);

            if (isValid) {
                setAuthState(AuthState.READY);
            }
        } catch (error) {
            console.error('Error checking LinkedIn status:', error);
            setLinkedinConnected(false);
        } finally {
            setLinkedinStatusLoading(false);
            linkedinValidationRef.current = false;
        }
    }, [mcpToken, validateMcpToken]);

    // Effect to validate LinkedIn connection when mcpToken changes
    useEffect(() => {
        if (mcpToken && !linkedinValidationRef.current) {
            console.log('🔍 MCP token detected, validating LinkedIn connection...');
            checkLinkedInStatus();
        } else if (!mcpToken) {
            console.log('🔗 No MCP token, setting LinkedIn as disconnected');
            setLinkedinConnected(false);
        }
    }, [mcpToken, checkLinkedInStatus]);

    // Google OAuth sign in
    const signInWithGoogle = useCallback(async () => {
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
    }, []);

    // LinkedIn OAuth connection
    const connectLinkedIn = useCallback(async () => {
        try {
            setLoading(true);

            if (!user) {
                throw new Error('User must be authenticated before connecting LinkedIn');
            }

            // Generate and store state and code verifier for PKCE
            const state = Math.random().toString(36).substring(2, 15);
            const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // Include user ID in the state for backend token storage
            const stateWithUserId = `${state}:${user.id}`;

            localStorage.setItem('linkedin_oauth_state', state);
            localStorage.setItem('codeVerifier', codeVerifier);

            // Redirect to our backend LinkedIn OAuth endpoint
            const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
            const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);

            window.location.href = `${API_BASE_URL}/oauth/authorize?` +
                `client_id=${clientId}&` +
                `redirect_uri=${redirectUri}&` +
                `state=${stateWithUserId}&` +
                `code_challenge=${codeVerifier}&` +
                `code_challenge_method=plain&` +
                `scope=openid%20profile%20email%20w_member_social`;
        } catch (error) {
            setLoading(false);
            throw error;
        }
    }, [API_BASE_URL, user]);

    const handleLinkedInCallback = async (code: string, state: string) => {
        try {
            setLoading(true);
            console.log('🔗 Processing LinkedIn OAuth callback...');
            console.log('Received state:', state);

            // Verify state parameter
            const storedState = localStorage.getItem('linkedin_oauth_state');
            const codeVerifier = localStorage.getItem('codeVerifier');

            if (!storedState || !codeVerifier) {
                throw new Error('Missing OAuth state or code verifier');
            }

            console.log('Stored state:', storedState);

            // Extract the state part (before the colon) for comparison
            let stateToCompare = state;
            if (state.includes(':')) {
                stateToCompare = state.split(':')[0];
                console.log('Extracted state for comparison:', stateToCompare);
            }

            if (stateToCompare !== storedState) {
                console.error('State mismatch:', { received: stateToCompare, stored: storedState });
                throw new Error('Invalid OAuth state parameter');
            }

            console.log('✅ State verification passed');

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

            // Store the MCP token FIRST
            setMcpToken(data.access_token);
            localStorage.setItem('mcp_token', data.access_token);
            console.log('🔑 MCP token stored successfully');

            // Set loading state to indicate validation is in progress
            setLinkedinStatusLoading(true);

            // Add a small delay to ensure database consistency before validation
            console.log('⏳ Waiting for database consistency...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Validate the token with retry mechanism
            console.log('🔍 Validating LinkedIn connection with retry...');
            const isValid = await validateMcpTokenWithRetry(data.access_token, 3);

            // CRITICAL: Set the connection status immediately and synchronously
            setLinkedinConnected(isValid);
            setLinkedinStatusLoading(false);

            // Force a state update to ensure UI components get the latest state
            if (isValid) {
                console.log('✅ LinkedIn connection validated and state updated successfully');
                // Clear the validation cache to force fresh validation on next check
                tokenValidationCacheRef.current = {
                    token: data.access_token,
                    isValid: true,
                    timestamp: Date.now()
                };
            } else {
                console.warn('⚠️ LinkedIn connection validation failed after retries');
                // Clear invalid token
                setMcpToken(null);
                localStorage.removeItem('mcp_token');
            }

            // Clean up localStorage
            localStorage.removeItem('linkedin_oauth_state');
            localStorage.removeItem('codeVerifier');

            console.log('🎉 LinkedIn OAuth completed successfully');

            // Return the validation result for the callback component
            return isValid;
        } catch (error) {
            console.error('❌ LinkedIn OAuth callback error:', error);
            setLinkedinConnected(false);
            setMcpToken(null);
            localStorage.removeItem('mcp_token');
            throw error;
        } finally {
            setLoading(false);
        }
    };



    // Manually refresh LinkedIn connection status (forces validation)
    const refreshLinkedInStatus = useCallback(async () => {
        console.log('🔄 Manually refreshing LinkedIn connection status...');
        setLinkedinStatusLoading(true);
        try {
            if (mcpToken) {
                const isValid = await validateMcpTokenWithRetry(mcpToken, 2); // Use retry with 2 attempts
                setLinkedinConnected(isValid);
                console.log(`🔗 LinkedIn connection status updated: ${isValid ? 'Connected' : 'Disconnected'}`);
            } else {
                setLinkedinConnected(false);
                console.log('🔗 LinkedIn connection status updated: Disconnected (no token)');
            }
        } finally {
            setLinkedinStatusLoading(false);
        }
    }, [mcpToken, validateMcpTokenWithRetry]);

    // Refresh MCP token by re-authenticating with LinkedIn
    const refreshMcpToken = useCallback(async (): Promise<boolean> => {
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
    }, [user, connectLinkedIn]);

    // Refresh token status
    const refreshTokenStatus = useCallback(async () => {
        if (session?.access_token) {
            await fetchTokenStatus(session.access_token);
        }
    }, [session?.access_token, fetchTokenStatus]);

    // Sign out function
    const signOut = useCallback(async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
                throw error;
            }

            // Reset all state
            resetAuthState();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [resetAuthState]);

    const value: AuthContextType = {
        user,
        session,
        tokenStatus,
        linkedinConnected,
        linkedinStatusLoading,
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
