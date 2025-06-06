// Initialize Logger first to capture all logs
import "./utils/Logger";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import rateLimit from "express-rate-limit";

import { OAuthServerProvider } from "./auth/OAuthServerProvider.js";
import { Tools } from "./mcp/Tools.js";
import { TransportsStore } from "./mcp/TransportsStore.js";
import { UserService } from "./services/UserService.js";
import { LinkedInTokenService } from "./services/LinkedInTokenService.js";
import { tokenScheduler } from "./services/TokenScheduler.js";
import { postScheduler } from "./services/PostScheduler.js";
import { TOKEN_COSTS } from "./database/supabase.js";
import { OverdueManagementTools } from "./tools/OverdueManagementTools.js";
import userRoutes from "./routes/users.js";

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

// Trust proxy for Render deployment (fixes rate limiting issue)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Initialize CORS with allowed origins
app.use(
    cors({
        origin: process.env.CORS_ALLOWED_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const userService = new UserService();
const linkedinTokenService = new LinkedInTokenService();

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
const overdueManagementTools = new OverdueManagementTools();

// API Routes
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        scheduler: tokenScheduler.getStatus()
    });
});

// Register ping tool for token validation
server.tool(
    "ping",
    "Ping the server to validate authentication and LinkedIn connectivity",
    {},
    async (_params, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        // Check if LinkedIn tokens are available and valid
        try {
            const authInfo = transport.auth;
            const mcpTokenId = (authInfo as any).jti;

            console.log("🔍 Ping: Starting LinkedIn validation for MCP token:", mcpTokenId);
            console.log("🔍 Ping: Auth info structure:", {
                hasExtra: !!(authInfo as any).extra,
                extraKeys: (authInfo as any).extra ? Object.keys((authInfo as any).extra) : [],
                hasLinkedinTokens: !!((authInfo as any).extra?.linkedinTokens),
                linkedinTokensKeys: (authInfo as any).extra?.linkedinTokens ? Object.keys((authInfo as any).extra.linkedinTokens) : [],
                linkedinTokensNull: (authInfo as any).extra?.linkedinTokens === null,
                mcpTokenId: mcpTokenId
            });

            const linkedinTokens = (authInfo as any).extra?.linkedinTokens;

            if (!linkedinTokens || linkedinTokens === null) {
                console.log("❌ Ping: No LinkedIn tokens found in auth info, attempting direct database lookup...");

                // Try to fetch tokens directly from database
                try {
                    const directTokens = await linkedinTokenService.getLinkedInTokens(mcpTokenId);
                    if (directTokens && directTokens.access_token) {
                        console.log("✅ Ping: Found LinkedIn tokens in database, testing API call...");

                        // Test the LinkedIn API with the tokens from database
                        const response = await fetch('https://api.linkedin.com/v2/userinfo', {
                            headers: {
                                'Authorization': `Bearer ${directTokens.access_token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            console.log(`❌ Ping: LinkedIn API call failed with status ${response.status}`);
                            const errorText = await response.text();
                            console.log(`❌ Ping: LinkedIn API error response: ${errorText}`);
                            return {
                                content: [{ type: "text", text: "pong - LinkedIn token expired or invalid" }],
                                isError: true,
                                linkedinConnected: false
                            };
                        }

                        console.log("✅ Ping: LinkedIn API call successful with database tokens");
                        return {
                            content: [{ type: "text", text: "pong - fully connected (via database)" }],
                            isError: false,
                            linkedinConnected: true
                        };
                    } else {
                        console.log("❌ Ping: No LinkedIn tokens found in database either");
                        return {
                            content: [{ type: "text", text: "pong - MCP token valid but LinkedIn not connected" }],
                            isError: true,
                            linkedinConnected: false
                        };
                    }
                } catch (dbError) {
                    console.error("❌ Ping: Error fetching tokens from database:", dbError);
                    return {
                        content: [{ type: "text", text: "pong - database error during LinkedIn check" }],
                        isError: true,
                        linkedinConnected: false
                    };
                }
            }

            if (!linkedinTokens.access_token) {
                console.log("❌ Ping: LinkedIn tokens found but no access_token");
                return {
                    content: [{ type: "text", text: "pong - LinkedIn tokens incomplete" }],
                    isError: true,
                    linkedinConnected: false
                };
            }

            console.log("🔍 Ping: Testing LinkedIn API with cached tokens...");
            // Verify LinkedIn token is still valid by making a simple API call
            // Use /v2/userinfo which works with openid scope (which we have)
            const response = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${linkedinTokens.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log(`❌ Ping: LinkedIn token validation failed with status ${response.status}`);
                const errorText = await response.text();
                console.log(`❌ Ping: LinkedIn API error response: ${errorText}`);
                return {
                    content: [{ type: "text", text: "pong - MCP token valid but LinkedIn token expired" }],
                    isError: true,
                    linkedinConnected: false
                };
            }

            console.log("✅ Ping: Both MCP and LinkedIn tokens are valid");
            return {
                content: [{ type: "text", text: "pong - fully connected" }],
                isError: false,
                linkedinConnected: true
            };
        } catch (error) {
            console.error("❌ Ping: Error checking LinkedIn connectivity:", error);
            return {
                content: [{ type: "text", text: "pong - MCP token valid but LinkedIn check failed" }],
                isError: true,
                linkedinConnected: false
            };
        }
    }
);

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

// Register linkedin-analytics tool
server.tool(
    "linkedin-analytics",
    "Get LinkedIn profile analytics and engagement metrics",
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
        return tools.getLinkedInAnalytics(linkedinTokens);
    }
);

// Register intelligent content generation tool (NEW - Cursor AI-like system)
server.tool(
    "generate-intelligent-content",
    "Generate AI-enhanced LinkedIn content using intelligent classification and optimization (FREE)",
    {
        content: z.string(),
        userId: z.string().optional(),
        userContext: z.object({
            name: z.string().optional(),
            role: z.string().optional(),
            industry: z.string().optional(),
            previousPosts: z.array(z.string()).optional()
        }).optional(),
    },
    async ({ content, userId, userContext }, { sessionId }) => {
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

        // Use intelligent AI orchestration system
        return tools.generateIntelligentContent({ prompt: content, userContext }, linkedinTokens);
    }
);

// Register create-post tool (Basic post - FREE content generation only)
server.tool(
    "create-post",
    "Generate AI-enhanced LinkedIn post content (FREE - content generation only)",
    {
        content: z.string(),
        userId: z.string().optional(),
        storyType: z.enum(['journey', 'technical', 'achievement', 'learning']).optional(),
    },
    async ({ content, userId, storyType = 'journey' }, { sessionId }) => {
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

        // Generate enhanced content using Gemini 2.0 Flash with story template (FREE)
        const enhancedContentResult = await tools.generateTextContent({ prompt: content, storyType }, linkedinTokens);

        if (enhancedContentResult.isError) {
            // If AI enhancement fails, return original content
            console.warn('AI enhancement failed, returning original content:', enhancedContentResult.content[0].text);
            return {
                content: [
                    {
                        type: "text",
                        text: content
                    }
                ]
            };
        }

        // Return the enhanced content for user review
        return enhancedContentResult;
    }
);

// Register specialized story creation tools
server.tool(
    "create-journey-story",
    "Create a personal/professional journey story post (FREE - content generation only)",
    {
        content: z.string(),
        userId: z.string().optional(),
    },
    async ({ content, userId }, { sessionId }) => {
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
        return tools.generateTextContent({ prompt: content, storyType: 'journey' }, linkedinTokens);
    }
);

server.tool(
    "create-technical-showcase",
    "Create a technical achievement/project showcase story (FREE - content generation only)",
    {
        content: z.string(),
        userId: z.string().optional(),
    },
    async ({ content, userId }, { sessionId }) => {
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
        return tools.generateTextContent({ prompt: content, storyType: 'technical' }, linkedinTokens);
    }
);

server.tool(
    "create-achievement-post",
    "Create an achievement celebration story (FREE - content generation only)",
    {
        content: z.string(),
        userId: z.string().optional(),
    },
    async ({ content, userId }, { sessionId }) => {
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
        return tools.generateTextContent({ prompt: content, storyType: 'achievement' }, linkedinTokens);
    }
);

server.tool(
    "create-learning-story",
    "Create an educational story with personal experience (FREE - content generation only)",
    {
        content: z.string(),
        userId: z.string().optional(),
    },
    async ({ content, userId }, { sessionId }) => {
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
        return tools.generateTextContent({ prompt: content, storyType: 'learning' }, linkedinTokens);
    }
);

// Register publish-text-post tool (Basic post publishing - FREE)
server.tool(
    "publish-text-post",
    "Publish text content to LinkedIn (FREE - publishing only)",
    {
        content: z.string(),
        userId: z.string().optional(),
    },
    async ({ content, userId }, { sessionId }) => {
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

        // Publish the content to LinkedIn
        const result = await tools.createUgcPost({ content }, linkedinTokens);

        // Record the post if userId is provided
        if (userId) {
            try {
                await userService.recordPost(userId, content, TOKEN_COSTS.BASIC_POST, 'basic');
            } catch (error) {
                console.error('Error recording basic post:', error);
                // Don't fail the request if recording fails
            }
        }

        return result;
    }
);

// Register analyze-image-create-post tool (Content generation only - FREE)
server.tool(
    "analyze-image-create-post",
    "Analyze an image and create LinkedIn post content (FREE - content generation only)",
    {
        imageBase64: z.string(),
        prompt: z.string(),
        mimeType: z.string(),
        userId: z.string()
    },
    async ({ imageBase64, prompt, mimeType, userId }, { sessionId }) => {
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

        // No token consumption for content generation - this is FREE
        const linkedinTokens = transport.auth.extra.linkedinTokens;
        const result = await tools.analyzeImageAndCreateContent({ imageBase64, prompt, mimeType }, linkedinTokens);

        // No post recording for content generation - only for actual publishing

        return result;
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

// Register the new tool that analyzes image and posts with the image (Single image post - 5 tokens)
server.tool(
    "analyze-image-structured-post-with-image",
    "Analyze an image, create structured content based on user text, and post to LinkedIn with the image - 5 tokens",
    {
        imageBase64: z.string(),
        userText: z.string(),
        mimeType: z.string(),
        userId: z.string()
    },
    async ({ imageBase64, userText, mimeType, userId }, { sessionId }) => {
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

        // Check and consume tokens for single image post
        const canConsume = await userService.canConsumeTokens(userId, 'SINGLE_POST');
        if (!canConsume) {
            throw new Error("Insufficient tokens for single image post creation");
        }

        const consumed = await userService.consumeTokens(userId, 'SINGLE_POST', userText);
        if (!consumed) {
            throw new Error("Failed to consume tokens");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        const result = await tools.analyzeImageStructuredPostWithImage({ imageBase64, userText, mimeType }, linkedinTokens);

        // Record the post
        try {
            await userService.recordPost(userId, userText, TOKEN_COSTS.SINGLE_POST, 'single');
        } catch (error) {
            console.error('Error recording single image post:', error);
        }

        return result;
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

// Register linkedin-post-with-multiple-images tool (Multi-image post - 10 tokens)
server.tool(
    "linkedin-post-with-multiple-images",
    "Create a LinkedIn post with multiple images (carousel post) - 10 tokens",
    {
        imageBase64s: z.array(z.string()),
        text: z.string(),
        mimeType: z.string().optional(),
        userId: z.string()
    },
    async ({ imageBase64s, text, mimeType, userId }, { sessionId }) => {
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

        // Check and consume tokens for multi-image post
        const canConsume = await userService.canConsumeTokens(userId, 'MULTIPLE_POST');
        if (!canConsume) {
            throw new Error("Insufficient tokens for multi-image post creation");
        }

        const consumed = await userService.consumeTokens(userId, 'MULTIPLE_POST', text);
        if (!consumed) {
            throw new Error("Failed to consume tokens");
        }

        const linkedinTokens = transport.auth.extra.linkedinTokens;
        const result = await tools.linkedInPostWithMultipleImages({ imageBase64s, text, mimeType }, linkedinTokens);

        // Record the post
        try {
            await userService.recordPost(userId, text, TOKEN_COSTS.MULTIPLE_POST, 'multiple');
        } catch (error) {
            console.error('Error recording multi-image post:', error);
        }

        return result;
    }
);

// ==================== DRAFT MANAGEMENT TOOLS ====================

// Register save-draft tool
server.tool(
    "save-draft",
    "Save a post as draft for later editing or publishing",
    {
        userId: z.string(),
        title: z.string().optional(),
        content: z.string(),
        postType: z.enum(['basic', 'single', 'multiple']).optional(),
        tags: z.array(z.string()).optional()
    },
    async ({ userId, title, content, postType, tags }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.draftTools.saveDraft({ userId, title, content, postType, tags });
    }
);

// Register get-drafts tool
server.tool(
    "get-drafts",
    "Get all drafts for the authenticated user",
    {
        userId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional()
    },
    async ({ userId, limit, offset }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.draftTools.getDrafts({ userId, limit, offset });
    }
);

// Register get-draft tool
server.tool(
    "get-draft",
    "Get a specific draft by ID",
    {
        userId: z.string(),
        draftId: z.string()
    },
    async ({ userId, draftId }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.draftTools.getDraft({ userId, draftId });
    }
);

// Register update-draft tool
server.tool(
    "update-draft",
    "Update an existing draft",
    {
        userId: z.string(),
        draftId: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        postType: z.enum(['basic', 'single', 'multiple']).optional(),
        tags: z.array(z.string()).optional()
    },
    async ({ userId, draftId, title, content, postType, tags }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.draftTools.updateDraft({ userId, draftId, title, content, postType, tags });
    }
);

// Register delete-draft tool
server.tool(
    "delete-draft",
    "Delete a draft permanently",
    {
        userId: z.string(),
        draftId: z.string()
    },
    async ({ userId, draftId }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.draftTools.deleteDraft({ userId, draftId });
    }
);

// ==================== POST SCHEDULING TOOLS ====================

// Register schedule-post tool
server.tool(
    "schedule-post",
    "Schedule a post for future publishing",
    {
        userId: z.string(),
        content: z.string(),
        scheduledTime: z.string(), // ISO string
        postType: z.enum(['basic', 'single', 'multiple']).optional()
    },
    async ({ userId, content, scheduledTime, postType }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.schedulingTools.schedulePost({ userId, content, scheduledTime, postType });
    }
);

// Register get-scheduled-posts tool
server.tool(
    "get-scheduled-posts",
    "Get all scheduled posts for the authenticated user",
    {
        userId: z.string(),
        status: z.enum(['pending', 'published', 'failed', 'cancelled']).optional(),
        limit: z.number().optional(),
        offset: z.number().optional()
    },
    async ({ userId, status, limit, offset }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.schedulingTools.getScheduledPosts({ userId, status, limit, offset });
    }
);

// Register get-scheduled-post tool
server.tool(
    "get-scheduled-post",
    "Get a specific scheduled post by ID",
    {
        userId: z.string(),
        scheduledPostId: z.string()
    },
    async ({ userId, scheduledPostId }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.schedulingTools.getScheduledPost({ userId, scheduledPostId });
    }
);

// Register cancel-scheduled-post tool
server.tool(
    "cancel-scheduled-post",
    "Cancel a pending scheduled post",
    {
        userId: z.string(),
        scheduledPostId: z.string()
    },
    async ({ userId, scheduledPostId }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.schedulingTools.cancelScheduledPost({ userId, scheduledPostId });
    }
);

// Register reschedule-post tool
server.tool(
    "reschedule-post",
    "Reschedule a pending or failed post",
    {
        userId: z.string(),
        scheduledPostId: z.string(),
        newScheduledTime: z.string() // ISO string
    },
    async ({ userId, scheduledPostId, newScheduledTime }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.schedulingTools.reschedulePost({ userId, scheduledPostId, newScheduledTime });
    }
);

// ==================== ANALYTICS TOOLS ====================

// Register get-token-analytics tool
server.tool(
    "get-token-analytics",
    "Get comprehensive token usage analytics and statistics",
    {
        userId: z.string(),
        timeframe: z.enum(['7d', '30d', '90d', 'all']).optional()
    },
    async ({ userId, timeframe }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.analyticsTools.getTokenAnalytics({ userId, timeframe });
    }
);

// Register get-token-usage-history tool
server.tool(
    "get-token-usage-history",
    "Get detailed token usage history with pagination",
    {
        userId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        actionType: z.enum(['basic_post', 'single_post', 'multiple_post']).optional()
    },
    async ({ userId, limit, offset, actionType }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.analyticsTools.getTokenUsageHistory({ userId, limit, offset, actionType });
    }
);

// Register get-post-analytics tool
server.tool(
    "get-post-analytics",
    "Get post performance analytics and statistics",
    {
        userId: z.string(),
        timeframe: z.enum(['7d', '30d', '90d', 'all']).optional()
    },
    async ({ userId, timeframe }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.analyticsTools.getPostAnalytics({ userId, timeframe });
    }
);

// ==================== ACTIVITY TRACKING TOOLS ====================

// Register get-activity-summary tool
server.tool(
    "get-activity-summary",
    "Get comprehensive user activity summary and statistics",
    {
        userId: z.string(),
        timeframe: z.enum(['7d', '30d', '90d', 'all']).optional()
    },
    async ({ userId, timeframe }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.activityTools.getActivitySummary({ userId, timeframe });
    }
);

// Register get-activity-timeline tool
server.tool(
    "get-activity-timeline",
    "Get chronological activity timeline with pagination",
    {
        userId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional()
    },
    async ({ userId, limit, offset }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.activityTools.getActivityTimeline({ userId, limit, offset });
    }
);

// Register get-content-calendar tool
server.tool(
    "get-content-calendar",
    "Get content calendar view for a specific month",
    {
        userId: z.string(),
        month: z.number().optional(), // 1-12
        year: z.number().optional()   // e.g., 2024
    },
    async ({ userId, month, year }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return tools.activityTools.getContentCalendar({ userId, month, year });
    }
);

// ==================== OVERDUE MANAGEMENT TOOLS ====================

// Register get-overdue-analysis tool
server.tool(
    "get-overdue-analysis",
    "Analyze overdue scheduled posts and get comprehensive status report",
    {
        userId: z.string()
    },
    async ({ userId }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return overdueManagementTools.getOverdueAnalysis({ userId });
    }
);

// Register reschedule-overdue-posts tool
server.tool(
    "reschedule-overdue-posts",
    "Reschedule all overdue posts to future times",
    {
        userId: z.string(),
        hoursFromNow: z.number().optional()
    },
    async ({ userId, hoursFromNow }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return overdueManagementTools.rescheduleOverduePosts({ userId, hoursFromNow });
    }
);

// Register mark-critically-overdue-as-failed tool
server.tool(
    "mark-critically-overdue-as-failed",
    "Mark all critically overdue posts (>7 days) as failed",
    {
        userId: z.string()
    },
    async ({ userId }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        return overdueManagementTools.markCriticallyOverdueAsFailed({ userId });
    }
);

// Register trigger-post-scheduler tool (for testing)
server.tool(
    "trigger-post-scheduler",
    "Manually trigger the post scheduler to check and publish overdue posts",
    {
        userId: z.string().optional()
    },
    async ({ userId }, { sessionId }) => {
        if (!sessionId) {
            throw new Error("No sessionId found");
        }

        const transport = transportsStore.getTransport(sessionId);
        if (!transport || !transport.auth) {
            throw new Error("Invalid session or missing authentication");
        }

        try {
            console.log('🔧 Manual trigger: Running post scheduler check...');
            await postScheduler.triggerCheck();

            return {
                content: [{
                    type: "text",
                    text: "✅ Post scheduler triggered successfully! Check server logs for publishing activity."
                }]
            };
        } catch (error) {
            console.error('Error triggering post scheduler:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `❌ Failed to trigger post scheduler: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
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

// Supabase auth callback endpoint (for Google OAuth)
app.get("/auth/callback", (req, res) => {
    console.log('🔍 Supabase auth callback received:', {
        query: req.query,
        headers: req.headers.referer
    });

    // For Supabase OAuth, we just redirect back to frontend
    // The frontend will handle the actual token processing
    const redirectUrl = `${process.env.CORS_ALLOWED_ORIGIN}/auth/callback${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;

    console.log('🔄 Redirecting to frontend:', redirectUrl);
    return res.redirect(redirectUrl);
});

// LinkedIn OAuth callback endpoint
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

// Setup MCP endpoint with enhanced security
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

        // SECURITY: Get user ID from request headers for ownership verification
        const requestUserId = req.headers['x-user-id'] as string;
        const mcpRequest = req.body;

        try {
            // Verify the token and get user info
            const authInfo = await oauthProvider.verifyAccessToken(token);
            console.log("🔒 SECURITY: Auth info for MCP call:", {
                clientId: authInfo.clientId,
                scopes: authInfo.scopes,
                expiresAt: new Date(authInfo.expiresAt * 1000).toISOString(),
                requestUserId: requestUserId,
                tool: mcpRequest.tool,
                jti: authInfo.jti
            });

            // SECURITY: Verify token ownership if user ID is provided
            if (requestUserId && authInfo.jti) {
                try {
                    // Get user ID from LinkedIn connection using the public method
                    const tokenOwnerUserId = await linkedinTokenService.getUserIdByMcpToken(authInfo.jti);

                    if (tokenOwnerUserId && tokenOwnerUserId !== requestUserId) {
                        console.error('🚨 SECURITY VIOLATION: Token ownership mismatch!');
                        console.error(`Token belongs to: ${tokenOwnerUserId}, Request from: ${requestUserId}`);
                        return res.status(403).json({
                            isError: true,
                            content: [{ type: "text", text: "Token ownership violation: This token does not belong to the requesting user" }]
                        });
                    }

                    console.log('✅ SECURITY: Token ownership verified for user:', requestUserId);
                } catch (dbError) {
                    console.warn('⚠️ SECURITY: Could not verify token ownership:', dbError);
                    // Continue without blocking - this is for additional security, not core functionality
                }
            }

            // Create a transport with the verified auth info
            const transport = transportsStore.createTransport("/mcp", authInfo, res);

            // Handle the request
            const result = await server.handle(req.body, { transport });

            // SECURITY: Include user verification in response for frontend validation
            if (requestUserId && mcpRequest.tool === 'ping') {
                result.userId = requestUserId;
            }

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

    // Start the token scheduler
    tokenScheduler.start();

    // Start the post scheduler
    postScheduler.start();

    console.log('LinkedIn Post Creator MCP Server initialized successfully');
    console.log('Features enabled:');
    console.log('- User authentication and management');
    console.log('- Token-based usage tracking');
    console.log('- Daily token refresh (50 tokens/day)');
    console.log('- Rate limiting and security');
    console.log('- Draft management (save, edit, delete drafts)');
    console.log('- Post scheduling (schedule for later publishing)');
    console.log('- Automatic overdue post management (smart publishing)');
    console.log('- Token usage analytics (comprehensive statistics)');
    console.log('- Activity tracking (timeline and calendar views)');
    console.log('- Post history and performance analytics');
});