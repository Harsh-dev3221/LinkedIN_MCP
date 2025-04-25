import { Response } from "express";
import { randomBytes } from "crypto";
import axios from "axios";

import { ClientsStore } from "./ClientsStore.js";
import { SessionsStore, OAuthClientInformationFull, AuthorizationParams, Session } from "./SessionsStore.js";
import { TokensStore, OAuthTokens } from "./TokenStore.js";

// LinkedIn authentication client
class LinkedinAuthClient {
    constructor(private config: { clientId: string; clientSecret: string; redirectUrl: string }) { }

    generateMemberAuthorizationUrl(scopes: string[], state: string) {
        return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.config.clientId}&redirect_uri=${encodeURIComponent(this.config.redirectUrl)}&state=${state}&scope=${scopes.join('%20')}`;
    }

    async exchangeAuthCodeForAccessToken(code: string) {
        try {
            console.log('Exchanging code for token with LinkedIn. Code:', code);
            console.log('Using redirect_uri:', this.config.redirectUrl);
            console.log('Using client_id:', this.config.clientId);

            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('client_id', this.config.clientId);
            params.append('client_secret', this.config.clientSecret);
            params.append('redirect_uri', this.config.redirectUrl);

            console.log('Request params:', params.toString());

            const response = await axios.post(
                'https://www.linkedin.com/oauth/v2/accessToken',
                params,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            console.log('LinkedIn token response status:', response.status);
            console.log('LinkedIn token response data:', JSON.stringify(response.data));

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
                    data: error.response?.data,
                    message: error.message
                });
            } else {
                console.error('LinkedIn token exchange non-Axios error:', error);
            }
            throw new Error('Failed to exchange authorization code for access token');
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
    private _LINKEDIN_SCOPES = ["profile", "email", "openid", "w_member_social"];
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
            const state = randomBytes(32).toString("hex");
            this._sessionsStore.registerSession(state, session);
            const url = this._linkedinAuthClient.generateMemberAuthorizationUrl(
                this._LINKEDIN_SCOPES,
                state
            );

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
            console.log(`OAuth callback received with code: ${authorizationCode}`);
            console.log(`State: ${state}`);

            if (!authorizationCode || !state) {
                console.error('Missing authorization code or state');
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
                const linkedinTokens =
                    await this._linkedinAuthClient.exchangeAuthCodeForAccessToken(
                        authorizationCode
                    );

                console.log('LinkedIn tokens obtained');
                const { id } = this._tokensStore.storeTokens(session, linkedinTokens);
                console.log('Tokens stored with ID:', id);

                const code = randomBytes(32).toString("hex");
                this._sessionsStore.registerSession(
                    code,
                    { ...session, tokenId: id },
                    5 * 60
                );
                this._sessionsStore.clearSession(state);

                const redirectUrl = new URL(session.params.redirectUri);
                redirectUrl.searchParams.set("code", code);
                if (session.params.state) {
                    redirectUrl.searchParams.set("state", session.params.state);
                }

                console.log(`Redirecting to: ${redirectUrl.toString()}`);
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
        const { jti, aud, exp, scopes } =
            this._tokensStore.parseAccessToken(accessToken);

        const linkedinTokens = this._tokensStore.getTokens(jti)?.linkedinTokens;

        return {
            token: accessToken,
            clientId: aud,
            scopes: scopes ?? [],
            expiresAt: exp,
            extra: { linkedinTokens },
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