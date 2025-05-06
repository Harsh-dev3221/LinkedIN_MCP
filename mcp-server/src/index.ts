// Initialize Logger first to capture all logs
import "./utils/Logger";

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

        if (type !== 'call-tool') {
            return {
                isError: true,
                content: [{ type: "text", text: "Invalid request type. Expected 'call-tool'." }]
            };
        }

        if (!this.tools[tool]) {
            return {
                isError: true,
                content: [{ type: "text", text: `Unknown tool: ${tool}. Available tools: ${Object.keys(this.tools).join(', ')}` }]
            };
        }

        try {
            const toolInfo = this.tools[tool];
            console.log(`Executing tool: ${tool}`, { params: JSON.stringify(params).substring(0, 100) + '...' });

            let validatedParams;
            try {
                validatedParams = toolInfo.schema.parse(params);
            } catch (validationError) {
                console.error(`Validation error for tool ${tool}:`, validationError);
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Invalid parameters for tool ${tool}: ${validationError instanceof Error ? validationError.message : 'Validation failed'}`
                    }]
                };
            }

            const result = await toolInfo.handler(validatedParams, { sessionId: context.transport.sessionId });
            console.log(`Tool ${tool} executed successfully`);
            return result;
        } catch (error) {
            console.error(`Error executing tool ${tool}:`, error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error executing tool ${tool}: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
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

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
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

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        return tools.createUgcPost({ content }, linkedinTokens);
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

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        return tools.analyzeImageAndCreateContent({ imageBase64, prompt, mimeType }, linkedinTokens);
    }
);

// Register the new structured post creation tool
server.tool(
    "analyze-image-structured-post",
    "Analyze an image and create a structured LinkedIn post based on user text using XML format",
    {
        imageBase64: z.string(),
        userText: z.string(),
        mimeType: z.string()
    },
    async ({ imageBase64, userText, mimeType }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        return tools.analyzeImageCreateStructuredPost({ imageBase64, userText, mimeType }, linkedinTokens);
    }
);

// Register the new tool that analyzes image and posts with the image
server.tool(
    "analyze-image-structured-post-with-image",
    "Analyze an image, create structured content based on user text, and post to LinkedIn with the image",
    {
        imageBase64: z.string(),
        userText: z.string(),
        mimeType: z.string()
    },
    async ({ imageBase64, userText, mimeType }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        return tools.analyzeImageStructuredPostWithImage({ imageBase64, userText, mimeType }, linkedinTokens);
    }
);

// Register create-image-post tool
server.tool(
    "create-image-post",
    "Create a post with an image on LinkedIn using UGC Posts endpoint",
    {
        content: z.string(),
        imageUrn: z.string(),
        title: z.string().optional(),
        visibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional()
    },
    async ({ content, imageUrn, title, visibility }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        return tools.createUgcImagePost({ content, imageUrn, title, visibility }, linkedinTokens);
    }
);

// Register init-image-upload tool
server.tool(
    "init-image-upload",
    "Initialize an image upload to LinkedIn",
    {
        description: z.string().optional()
    },
    async ({ description }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        return tools.initImageUpload({ description }, linkedinTokens);
    }
);

// Register analyze-image-and-post tool
server.tool(
    "analyze-image-and-post",
    "Analyze an image and create a LinkedIn post with the generated content using UGC Posts endpoint",
    {
        imageBase64: z.string(),
        prompt: z.string(),
        mimeType: z.string(),
        visibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional()
    },
    async ({ imageBase64, prompt, mimeType, visibility }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;

        // First analyze the image and generate content
        const contentResult = await tools.analyzeImageAndCreateContent(
            { imageBase64, prompt, mimeType },
            linkedinTokens
        );

        if (contentResult.isError) {
            return contentResult;
        }

        // Extract the generated content
        const generatedContent = contentResult.content[0].text;

        // Strip out any notes about character limits that might have been added
        const cleanContent = generatedContent.split("\n\nNote: This generated content is")[0];

        // Create the post using UGC Posts endpoint
        return tools.createUgcPost({ content: cleanContent, visibility }, linkedinTokens);
    }
);

// Register linkedin-post-with-multiple-images tool
server.tool(
    "linkedin-post-with-multiple-images",
    "Create a LinkedIn post with multiple images (carousel post)",
    {
        imageBase64s: z.array(z.string()),
        text: z.string(),
        mimeType: z.string().optional()
    },
    async ({ imageBase64s, text, mimeType }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        if (!transport.auth.extra || !transport.auth.extra.linkedinTokens) {
            throw new Error("LinkedIn tokens not found in session");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        return tools.linkedInPostWithMultipleImages({ imageBase64s, text, mimeType }, linkedinTokens);
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
app.post("/mcp", async (req, res) => {
    try {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({
                isError: true,
                content: [{ type: "text", text: "Unauthorized: Missing or invalid authorization header" }]
            });
        }

        const token = auth.replace('Bearer ', '');

        try {
            // Verify the token and get user info
            const authInfo = await oauthProvider.verifyAccessToken(token);
            console.log("Auth info for MCP call:", {
                clientId: authInfo.clientId,
                scopes: authInfo.scopes,
                expiresAt: new Date(authInfo.expiresAt * 1000).toISOString()
            });

            // Create a transport with the verified auth info
            const transport = transportsStore.createTransport("/mcp", authInfo, res);

            // Handle the request
            const result = await server.handle(req.body, { transport });
            return res.json(result);
        } catch (error) {
            console.error("Token verification error:", error);
            return res.status(401).json({
                isError: true,
                content: [{ type: "text", text: "Unauthorized: Invalid token" }]
            });
        }
    } catch (error) {
        console.error("MCP endpoint error:", error);
        return res.status(500).json({
            isError: true,
            content: [{ type: "text", text: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` }]
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});