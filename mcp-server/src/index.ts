import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";

import { OAuthServerProvider } from "./auth/OAuthServerProvider.js";
import { Tools } from "./mcp/Tools.js";
import { TransportsStore, AuthInfo } from "./mcp/TransportsStore.js";
import { OAuthTokens } from "./auth/TokenStore.js";

// Simple MCP Server implementation
class MCPServer {
    constructor(private oauthProvider: OAuthServerProvider) { }

    private tools: Record<string, {
        description: string;
        schema: z.ZodType<any>,
        handler: (params: any, context: { sessionId?: string }) => Promise<any>
    }> = {};

    tool(name: string, description: string, schema: any, handler: (params: any, context: { sessionId?: string }) => Promise<any>) {
        this.tools[name] = {
            description,
            schema: z.object(schema),
            handler
        };
    }

    async handle(body: any, context: { transport: any }) {
        const { type, tool, params } = body;

        if (type !== 'call-tool' || !this.tools[tool]) {
            return { error: 'Invalid request' };
        }

        try {
            const toolInfo = this.tools[tool];
            const validatedParams = toolInfo.schema.parse(params);
            return await toolInfo.handler(validatedParams, { sessionId: context.transport.sessionId });
        } catch (error) {
            console.error('Error handling tool call:', error);
            return {
                isError: true,
                content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]
            };
        }
    }
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize CORS with allowed origins
app.use(
    cors({
        origin: process.env.CORS_ALLOWED_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize OAuth provider
const oauthProvider = new OAuthServerProvider({
    clientId: process.env.LINKEDIN_CLIENT_ID as string,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
    redirectUrl: `${process.env.SERVER_URL}/oauth/callback`,
});

// Register the LinkedIn client for OAuth
oauthProvider.clientsStore.registerClient({
    client_id: process.env.LINKEDIN_CLIENT_ID as string,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET as string,
    redirect_uris: [`${process.env.SERVER_URL}/oauth/callback`],
    name: "Post_AI",
    website_uri: process.env.CORS_ALLOWED_ORIGIN as string,
    logo_uri: undefined,
});

// Initialize transport store
const transportsStore = new TransportsStore();

// Initialize MCP server
const server = new MCPServer(oauthProvider);

// Initialize tools
const tools = new Tools();

// Register user-info tool
server.tool(
    "user-info",
    "Get information about the authenticated LinkedIn user",
    {},
    async (_params, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const { auth } = transportsStore.getTransport(sessionId);
        const { linkedinTokens } = (
            auth as unknown as { extra: { linkedinTokens: OAuthTokens } }
        ).extra;

        return tools.getUserInfo(linkedinTokens);
    }
);

// Register create-post tool
server.tool(
    "create-post",
    "Create a post on LinkedIn",
    {
        content: z.string(),
    },
    async ({ content }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const { auth } = transportsStore.getTransport(sessionId);
        const { linkedinTokens } = (
            auth as unknown as { extra: { linkedinTokens: OAuthTokens } }
        ).extra;

        return tools.createPost({ content }, linkedinTokens);
    }
);

// Register analyze-image-create-post tool
server.tool(
    "analyze-image-create-post",
    "Analyze an image and create LinkedIn post content",
    {
        imageBase64: z.string(),
        prompt: z.string(),
        mimeType: z.string()
    },
    async ({ imageBase64, prompt, mimeType }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const { auth } = transportsStore.getTransport(sessionId);
        const { linkedinTokens } = (
            auth as unknown as { extra: { linkedinTokens: OAuthTokens } }
        ).extra;

        return tools.analyzeImageAndCreateContent({ imageBase64, prompt, mimeType }, linkedinTokens);
    }
);

// Setup OAuth routes
app.get("/oauth/authorize", (req, res) => {
    const clientId = req.query.client_id as string;
    const redirectUri = req.query.redirect_uri as string;
    const state = req.query.state as string;
    const codeChallenge = req.query.code_challenge as string;
    const codeChallengeMethod = req.query.code_challenge_method as string;
    const scopes = req.query.scope ? (req.query.scope as string).split(" ") : ["r_liteprofile", "w_member_social"];

    const client = oauthProvider.clientsStore.getClient(clientId);
    if (!client) {
        return res.status(400).send("Invalid client_id");
    }

    return oauthProvider.authorize(
        client,
        {
            redirectUri,
            state,
            codeChallenge,
            codeChallengeMethod,
            scopes,
        },
        res
    );
});

app.get("/oauth/callback", (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    return oauthProvider.callback(code, state, res);
});

// Token endpoint for PKCE flow
app.post("/oauth/token", async (req, res) => {
    try {
        console.log('Token endpoint called with body:', req.body);

        const { client_id, code, code_verifier, redirect_uri, grant_type } = req.body;

        if (grant_type !== "authorization_code") {
            console.error('Invalid grant type:', grant_type);
            return res.status(400).json({ error: "unsupported_grant_type" });
        }

        const client = oauthProvider.clientsStore.getClient(client_id);
        if (!client) {
            console.error('Invalid client ID:', client_id);
            return res.status(400).json({ error: "invalid_client" });
        }

        console.log('Client found:', client.client_id);

        // Verify code_verifier matches the code_challenge
        try {
            const expectedCodeChallenge = await oauthProvider.challengeForAuthorizationCode(client, code);
            console.log('Code challenge verification:', {
                expected: expectedCodeChallenge,
                received: code_verifier,
                match: expectedCodeChallenge === code_verifier
            });

            if (expectedCodeChallenge !== code_verifier) {
                return res.status(400).json({ error: "invalid_grant", message: "Code verifier does not match challenge" });
            }
        } catch (error) {
            console.error('Code challenge verification error:', error);
            return res.status(400).json({ error: "invalid_grant", message: "Error verifying code challenge" });
        }

        // Exchange authorization code for access token
        try {
            const tokens = await oauthProvider.exchangeAuthorizationCode(client, code);
            console.log('Tokens generated successfully');
            return res.json(tokens);
        } catch (error) {
            console.error('Token exchange error:', error);
            return res.status(500).json({ error: "server_error", message: "Failed to exchange authorization code" });
        }
    } catch (error) {
        console.error("Token endpoint error:", error);
        return res.status(500).json({ error: "server_error" });
    }
});

// Setup MCP endpoint
app.post("/mcp", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).send("Unauthorized");
    }

    server.handle(req.body, {
        transport: transportsStore.createTransport("/mcp", { token: auth } as AuthInfo, res),
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 