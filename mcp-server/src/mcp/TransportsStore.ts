import { Response } from "express";

// Define AuthInfo interface
export interface AuthInfo {
    token: string;
    clientId?: string;
    scopes?: string[];
    expiresAt?: number;
    extra?: any;
}

// Define SSEServerTransport class
export class SSEServerTransport {
    public sessionId: string;

    constructor(endpoint: string, res: Response) {
        this.sessionId = Math.random().toString(36).substring(2, 15);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
    }
}

export class TransportsStore {
    private _transportsBySessionId: Record<
        string,
        { transport: SSEServerTransport; auth: AuthInfo }
    > = {};

    public getTransport = (sessionId: string) =>
        this._transportsBySessionId[sessionId];

    public createTransport = (
        _endpoint: string,
        auth: AuthInfo,
        res: Response
    ) => {
        const transport = new SSEServerTransport(_endpoint, res);
        this._transportsBySessionId[transport.sessionId] = { transport, auth };

        return transport;
    };
} 