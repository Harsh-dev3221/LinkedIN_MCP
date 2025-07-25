import { Response } from "express";
import { randomBytes } from "crypto";
import axios from "axios";

import { ClientsStore } from "./ClientsStore.js";
import { SessionsStore, OAuthClientInformationFull, AuthorizationParams, Session } from "./SessionsStore.js";
import { TokensStore, OAuthTokens } from "./TokenStore.js";

// LinkedIn authentication client
class LinkedinAuthClient {
    // Hardcoded correct client secret
    private readonly correctClientSecret = "WPL_AP1.E1MUOXPg8FmJNQAV.ENdsdg==";

    constructor(private config: { clientId: string; clientSecret: string; redirectUrl: string }) { }

    generateMemberAuthorizationUrl(scopes: string[], state: string) {
        return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.config.clientId}&redirect_uri=${encodeURIComponent(this.config.redirectUrl)}&state=${state}&scope=${scopes.join('%20')}`;
    }

    async exchangeAuthCodeForAccessToken(code: string) {
        try {
            console.log('Exchanging code for token with LinkedIn. Code:', code.substring(0, 10), '...');
            console.log('Using redirect_uri:', this.config.redirectUrl);
            console.log('Using client_id:', this.config.clientId);

            // LinkedIn is very specific about encoding - ensure exact same format as in authorization request
            const redirectUri = this.config.redirectUrl;

            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('client_id', this.config.clientId);
            // Use the hardcoded correct client secret instead of the one from config
            params.append('client_secret', this.correctClientSecret);
            params.append('redirect_uri', redirectUri);

            console.log('Request params:', params.toString());

            // Use axios with increased timeout
            const response = await axios.post(
                'https://www.linkedin.com/oauth/v2/accessToken',
                params.toString(), // Convert to string to ensure proper formatting
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000 // Increase timeout to 10 seconds
                }
            );

            console.log('LinkedIn token response status:', response.status);
            console.log('LinkedIn token response data:', JSON.stringify(response.data, null, 2));

            // Check if the expected fields are in the response
            if (!response.data.access_token) {
                throw new Error('LinkedIn response missing access_token');
            }

            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in || 3600,
                refresh_token: response.data.refresh_token || null
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('LinkedIn token exchange error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message,
                    config: {
                        url: error.config?.url,
                        headers: error.config?.headers,
                        params: error.config?.params
                    }
                });
            } else {
                console.error('LinkedIn token exchange non-Axios error:', error);
            }
            throw new Error(`Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Define OAuthServerProviderInterface
export interface OAuthServerProviderInterface {
    clientsStore: ClientsStore;
    authorize: (client: OAuthClientInformationFull, params: AuthorizationParams, res: Response) => Promise<void>;
    callback: (authorizationCode: string, state: string, res: Response) => Promise<void | Response>;
    challengeForAuthorizationCode: (client: OAuthClientInformationFull, authorizationCode: string) => Promise<string | undefined>;
    verifyAccessToken: (accessToken: string) => Promise<{
        token: string;
        clientId: string;
        scopes: string[];
        expiresAt: number;
        extra: any;
    }>;
    exchangeRefreshToken: () => Promise<any>;
    exchangeAuthorizationCode: (client: OAuthClientInformationFull, authorizationCode: string) => Promise<OAuthTokens>;
}

export class OAuthServerProvider implements OAuthServerProviderInterface {
    // LinkedIn OAuth scopes - using OpenID Connect + posting permissions
    // Note: r_basicprofile and r_liteprofile may not be available for all LinkedIn apps
    // Using OpenID Connect scopes which provide basic profile information
    private _LINKEDIN_SCOPES = ["openid", "profile", "email", "w_member_social"];
    private _linkedinAuthClient: LinkedinAuthClient;

    private _clientsStore: ClientsStore;
    private _sessionsStore: SessionsStore;
    private _tokensStore: TokensStore;

    constructor(clientConfiguration: {
        clientId: string;
        clientSecret: string;
        redirectUrl: string;
    }) {
        this._linkedinAuthClient = new LinkedinAuthClient(clientConfiguration);

        this._clientsStore = new ClientsStore();
        this._sessionsStore = new SessionsStore();
        this._tokensStore = new TokensStore();
    }

    public get clientsStore() {
        return this._clientsStore;
    }

    public authorize = async (
        client: OAuthClientInformationFull,
        params: AuthorizationParams,
        res: Response
    ) => {
        try {
            const session = { client, params };

            // Use the state parameter from the frontend if provided, otherwise generate one
            const frontendState = params.state;
            const state = frontendState || randomBytes(32).toString("hex");

            console.log('🔧 OAuth authorize called with state:', {
                frontendState: frontendState,
                finalState: state,
                hasUserIdInState: state.includes(':')
            });

            this._sessionsStore.registerSession(state, session);
            const url = this._linkedinAuthClient.generateMemberAuthorizationUrl(
                this._LINKEDIN_SCOPES,
                state
            );

            console.log('🔗 Redirecting to LinkedIn with state:', state);
            res.redirect(url);
        } catch (error) {
            console.error("OAuthServerProvider authorize error:", error);

            res.status(500).send("Server error");
        }
    };

    public callback = async (
        authorizationCode: string,
        state: string,
        res: Response
    ) => {
        try {
            console.log('🔍 OAuth callback received with parameters:', {
                hasCode: !!authorizationCode,
                codeLength: authorizationCode?.length || 0,
                codePreview: authorizationCode ? `${authorizationCode.substring(0, 10)}...` : 'undefined',
                hasState: !!state,
                state: state
            });

            if (!authorizationCode || !state) {
                console.error('❌ Missing authorization code or state:', {
                    authorizationCode: !!authorizationCode,
                    state: !!state
                });
                return res.status(400).send("Bad request: Missing required parameters");
            }

            const session = this._sessionsStore.getSession(state);
            if (!session) {
                console.error(
                    `OAuthServerProvider callback error: No session found for state ${state}`
                );
                return res.status(400).send("Bad request: Invalid state parameter");
            }

            console.log('Session found:', {
                client: session.client.client_id,
                redirectUri: session.params.redirectUri,
                hasTokenId: !!session.tokenId
            });

            try {
                // Create a server-side initiated token exchange with more details and error handling
                const linkedinTokens = await this.directTokenExchange(authorizationCode, session);
                if (!linkedinTokens) {
                    return res.status(500).send("Server error: Failed to exchange authorization code (null response)");
                }

                console.log('LinkedIn tokens obtained successfully');

                // Extract user ID from state parameter (format: "randomState:userId")
                let userId: string | undefined;
                console.log('Raw state parameter:', state);

                if (state && state.includes(':')) {
                    // URL decode the state parameter first
                    const decodedState = decodeURIComponent(state);
                    console.log('Decoded state parameter:', decodedState);

                    const parts = decodedState.split(':');
                    if (parts.length === 2) {
                        userId = parts[1];
                        console.log('✅ Extracted user ID from state:', userId);
                    } else {
                        console.log('❌ State parameter format invalid:', parts);
                    }
                } else {
                    console.log('❌ State parameter does not contain user ID separator (:)');
                }

                const { id } = await this._tokensStore.storeTokens(session, linkedinTokens, userId);
                console.log('Tokens stored with ID:', id);

                const code = randomBytes(32).toString("hex");
                this._sessionsStore.registerSession(
                    code,
                    { ...session, tokenId: id },
                    5 * 60
                );
                this._sessionsStore.clearSession(state);

                // IMPORTANT FIX: Use the frontend URL as the redirect target, not the server's callback URL
                // The redirectUri from session should be the frontend application, not the server callback
                let frontendRedirectUrl = process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173';
                frontendRedirectUrl = `${frontendRedirectUrl}/auth/callback`;

                const redirectUrl = new URL(frontendRedirectUrl);
                redirectUrl.searchParams.set("code", code);
                if (session.params.state) {
                    redirectUrl.searchParams.set("state", session.params.state);
                }

                console.log(`Redirecting to frontend: ${redirectUrl.toString()}`);
                return res.redirect(redirectUrl.toString());
            } catch (error) {
                console.error("LinkedIn token exchange failed:", error);
                return res.status(500).send("Server error: Failed to exchange authorization code");
            }
        } catch (error) {
            console.error("OAuthServerProvider callback error:", error);
            return res.status(500).send("Server error: An unexpected error occurred");
        }
    };

    // Direct token exchange with LinkedIn for callback path
    private async directTokenExchange(authorizationCode: string, session: Session) {
        try {
            console.log('Starting direct token exchange with LinkedIn...');
            console.log('Auth code (first 10 chars):', authorizationCode.substring(0, 10));

            // LinkedIn requires exact matching redirect URL
            const redirectUrl = `${process.env.SERVER_URL}/oauth/callback`;

            // Use the correct client secret
            const clientSecret = "WPL_AP1.E1MUOXPg8FmJNQAV.ENdsdg==";

            // Build params manually
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', authorizationCode);
            params.append('client_id', process.env.LINKEDIN_CLIENT_ID || '');
            params.append('client_secret', clientSecret);
            params.append('redirect_uri', redirectUrl);

            console.log('Token exchange parameters:', params.toString());

            const response = await axios.post(
                'https://www.linkedin.com/oauth/v2/accessToken',
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                }
            );

            console.log('LinkedIn token response status:', response.status);
            console.log('LinkedIn token response data keys:', Object.keys(response.data));

            if (!response.data.access_token) {
                throw new Error('LinkedIn response missing access_token');
            }

            // Log and validate the scopes returned in the response
            const returnedScopes = response.data.scope || '';
            console.log('LinkedIn returned scopes:', returnedScopes);

            // Check if essential scopes are included
            if (!returnedScopes.includes('w_member_social')) {
                console.warn('Warning: w_member_social scope not granted. Post creation will fail.');
            }

            // Check for OpenID Connect scopes
            if (!returnedScopes.includes('openid')) {
                console.warn('Warning: openid scope not granted. OpenID Connect features may be limited.');
            }

            if (!returnedScopes.includes('profile')) {
                console.warn('Warning: profile scope not granted. Profile information may be limited.');
            }

            // Note: r_basicprofile and r_liteprofile are not requested as they may not be available
            // for all LinkedIn applications. We rely on OpenID Connect for profile information.

            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in || 3600,
                refresh_token: response.data.refresh_token || null,
                scope: returnedScopes // Store the scope information for later verification
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('LinkedIn direct token exchange error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
            } else {
                console.error('Non-Axios error during token exchange:', error);
            }
            throw new Error(`LinkedIn token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public challengeForAuthorizationCode = async (
        _client: OAuthClientInformationFull,
        authorizationCode: string
    ) => {
        console.log(`Looking for session with authorization code: ${authorizationCode}`);

        const session = this._sessionsStore.getSession(authorizationCode);
        if (!session) {
            console.error(`No session found for authorization code: ${authorizationCode}`);
            throw new Error("No session found for authorization code");
        }

        console.log(`Session found for authorization code with challenge: ${session.params.codeChallenge}`);

        return session.params.codeChallenge;
    };

    public verifyAccessToken = async (accessToken: string) => {
        // Use the new TokenStore method that checks Supabase
        const tokenData = await this._tokensStore.verifyAccessToken(accessToken);
        const { jti, aud, exp, scopes } = this._tokensStore.parseAccessToken(accessToken);

        console.log('🔍 OAuthServerProvider.verifyAccessToken result:', {
            hasExtra: !!tokenData.extra,
            hasLinkedInTokens: !!(tokenData.extra?.linkedinTokens),
            linkedInTokensNull: tokenData.extra?.linkedinTokens === null,
            jti: jti
        });

        return {
            token: accessToken,
            clientId: aud,
            scopes: scopes ?? [],
            expiresAt: exp,
            extra: tokenData.extra,
            jti: jti // Include the JWT ID for token ownership verification
        };
    };

    public exchangeRefreshToken = async () => {
        throw new Error("Not implemented");
    };

    public exchangeAuthorizationCode = async (
        _client: OAuthClientInformationFull,
        authorizationCode: string
    ) => {
        console.log(`Exchanging authorization code: ${authorizationCode}`);

        const session = this._sessionsStore.getSession(authorizationCode);
        if (!session) {
            console.error(`No session found for authorization code: ${authorizationCode}`);
            throw new Error("No session found for authorization code");
        }

        if (!session.tokenId) {
            console.error("Session has no token id");
            throw new Error("Session has no token id");
        }

        console.log(`Found session with tokenId: ${session.tokenId}`);

        const tokens = this._tokensStore.getTokens(session.tokenId);
        if (!tokens) {
            console.error(`No tokens found for tokenId: ${session.tokenId}`);
            throw new Error(`No tokens found for tokenId: ${session.tokenId}`);
        }

        console.log("Retrieved tokens successfully");

        return tokens.mcpServerToken;
    };
}