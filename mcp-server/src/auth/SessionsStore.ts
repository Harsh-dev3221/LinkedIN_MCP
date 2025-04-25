// Define OAuthClientInformationFull interface
export interface OAuthClientInformationFull {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
    name: string;
    website_uri: string;
    logo_uri?: string;
}

// Define AuthorizationParams interface
export interface AuthorizationParams {
    redirectUri: string;
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    scopes?: string[];
}

export type Session = {
    client: OAuthClientInformationFull;
    params: AuthorizationParams;
    tokenId?: string;
};

export class SessionsStore {
    private _sessions: Record<string, Session> = {};

    // Session are usually retrieved using either an OAuth state parameter or a temporary authorization code
    public getSession = (sessionId: string) => this._sessions[sessionId];

    public registerSession = (
        id: string,
        session: Session,
        expirationInSeconds?: number
    ) => {
        this._sessions[id] = session;

        if (expirationInSeconds !== undefined) {
            setTimeout(() => {
                delete this._sessions[id];
            }, expirationInSeconds * 1000);
        }
    };

    public clearSession = (sessionId: string) => {
        delete this._sessions[sessionId];
    };
} 