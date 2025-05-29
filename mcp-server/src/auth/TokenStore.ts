import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Session } from "./SessionsStore.js";

// Define OAuthTokens interface
export interface OAuthTokens {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}

// Define AccessToken3LResponse interface
export interface AccessToken3LResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}

type AccessTokenPayload = {
    jti: string;
    iat: number;
    exp: number;
    aud: string;
    scopes?: string[];
};

export class TokensStore {
    private _tokensById: Record<
        string,
        {
            mcpServerToken: OAuthTokens;
            linkedinTokens: OAuthTokens;
        }
    > = {};

    private _TOKEN_DURATION_MINUTES = 24 * 60; // 24 hours
    private _jwtSecret: string;

    constructor() {
        this._jwtSecret = process.env.JWT_SECRET as string;
    }

    public getTokens = (id: string) => this._tokensById[id];

    public storeTokens = (
        session: Session,
        linkedinTokens: AccessToken3LResponse
    ) => {
        const id = randomUUID();
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expiresInSeconds = 60 * this._TOKEN_DURATION_MINUTES;
        const payload: AccessTokenPayload = {
            jti: id,
            iat: nowInSeconds,
            exp: nowInSeconds + expiresInSeconds,
            aud: session.client.client_id,
            scopes: session.params.scopes,
        };

        const accessToken = jwt.sign(payload, this._jwtSecret);

        this._tokensById[id] = {
            mcpServerToken: {
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: expiresInSeconds,
                scope: session.params.scopes?.join(" "),
            },
            linkedinTokens: { ...linkedinTokens, token_type: "Bearer" },
        };

        return { id };
    };

    public parseAccessToken = (accessToken: string) =>
        jwt.verify(accessToken, this._jwtSecret) as AccessTokenPayload;
}