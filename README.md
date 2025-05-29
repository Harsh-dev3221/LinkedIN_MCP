# LinkedIn Multi-Channel Publisher (MCP)

A powerful tool for managing and automating LinkedIn content publishing with advanced features like AI-powered content generation, image analysis, and multi-image carousel posts.

![LinkedIn MCP Logo](https://via.placeholder.com/200x100?text=LinkedIn+MCP)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Known Issues](#known-issues)

## 🔍 Overview

LinkedIn MCP integrates with LinkedIn's API to provide a streamlined content publishing experience. The application offers a unified interface for creating and publishing various types of LinkedIn content, including text posts, single-image posts, and multi-image carousel posts, all enhanced with AI-powered content generation.

### Project Goals

- Simplify LinkedIn content publishing process
- Provide advanced AI-powered content generation capabilities
- Enable seamless image uploads and multi-image carousel posts
- Support modern LinkedIn API standards
- Deliver an intuitive, user-friendly interface

## ✨ Features

- **LinkedIn Authentication**:
  - Secure OAuth-based authentication
  - OpenID Connect support
  - Proper scope validation and management
  - Persistent token storage for seamless experience
- **Unified Post Creation Interface**:
  - Single intuitive interface for all post types
  - Toggle between text-only and image posts
  - Support for up to 3,000 characters
  - Real-time character count validation
- **Advanced Image Handling**:
  - Single image post creation
  - Multi-image carousel posts
  - Image preview before publishing
  - Drag-and-drop image upload
- **AI-Powered Content Generation**:
  - Smart content enhancement for text posts
  - Image analysis and content suggestions using Gemini AI
  - Contextual content generation based on uploaded images
  - One-click content enhancement
- **Multi-Step Publishing Flow**:
  - Draft creation and editing
  - Content preview and review
  - Final publishing with confirmation
- **User Experience**:
  - Modern, responsive UI with gradient backgrounds
  - Step-by-step guided workflow
  - Error handling with clear user feedback
  - Success notifications and confirmations

## 🏗️ Architecture

```ascii
┌─────────────────┐      ┌────────────────────┐      ┌───────────────┐
│                 │      │                    │      │               │
│ Frontend (React)│◄────►│   MCP Server (TS)  │◄────►│  LinkedIn API │
│                 │      │                    │      │               │
└─────────────────┘      └────────────────────┘      └───────────────┘
                                   ▲
                                   │
                                   ▼
                          ┌────────────────┐
                          │                │
                          │   Gemini API   │
                          │                │
                          └────────────────┘
```

### Components

- **Frontend**: React application with TypeScript, Vite, and Material-UI
- **MCP Server**: Node.js TypeScript server handling authentication and API integration
- **LinkedIn API**: External API for post creation and user information
- **Gemini API**: Google's AI model for image analysis and content generation

### Data Flow

1. User starts at the landing page and initiates LinkedIn authentication
2. Authentication tokens are securely stored in the MCP server and browser localStorage
3. User creates content through the unified post interface:
   - For text posts: User enters text and enhances with AI
   - For image posts: User uploads image(s) and generates AI-enhanced content
4. User reviews and edits the generated content in the preview step
5. MCP server processes the final request and communicates with LinkedIn API
6. For image analysis, the server calls Gemini API with the image and instructions
7. Success/error feedback is provided to the user after publishing

## 🔧 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- LinkedIn Developer Account
- Gemini API key (for image analysis)

### Server Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/linkedin-mcp.git
cd linkedin-mcp

# Install server dependencies
cd mcp-server
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend-vite

# Install dependencies
npm install
```

## ⚙️ Configuration

### Environment Variables

#### Server (.env)

```env
# Server Configuration
PORT=3000
NODE_ENV=development
SERVER_URL=http://localhost:3000
CORS_ALLOWED_ORIGIN=http://localhost:5173

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
VITE_LINKEDIN_AUTH_URL=http://localhost:3000/oauth/authorize
```

### LinkedIn Developer Setup

1. Create an application at [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Configure OAuth settings:
   - Add redirect URL: `http://localhost:3000/oauth/callback`
   - Request the following permissions:
     - OpenID Connect scopes: `openid`, `profile`, `email`
     - Content creation: `w_member_social`
3. Get your Client ID and Client Secret
4. Ensure your app is properly configured in the Products tab and verified if necessary

## 🚀 Usage

### Starting the Application

```bash
# Start the server
cd mcp-server
npm run dev

# In a new terminal, start the frontend
cd frontend-vite
npm run dev
```

Access the application at `http://localhost:5173` (or the port configured by Vite)

### User Flow

1. **Getting Started**:
   - Visit the landing page
   - Click "Get Started" to begin the process
   - If not authenticated, you'll be redirected to LinkedIn login

2. **Authentication**:
   - Click "Login with LinkedIn"
   - Authorize the application with the requested permissions
   - Your authentication token is securely stored for the session

3. **Creating Content** (Unified Interface):
   - Enter your post text in the main input field
   - Toggle "Post with Image" switch if you want to include images
   - For image posts:
     - Select between single image or multi-image carousel mode
     - Upload image(s) via drag-and-drop or file selection
   - Click "Enhance & Preview" to generate AI-enhanced content

4. **Review & Edit**:
   - Review the AI-enhanced content
   - Edit the content if needed
   - Check character count (limit is 3,000 characters)
   - Choose to publish or start over

5. **Publishing**:
   - Click the appropriate publish button:
     - "Publish to LinkedIn" for text-only posts
     - "Publish with Image to LinkedIn" for single image posts
     - "Publish Carousel to LinkedIn" for multi-image posts
   - View success confirmation or error messages

## 📚 API Documentation

### Server Endpoints

#### Authentication

- `GET /oauth/authorize` - Initiate LinkedIn OAuth flow
- `GET /oauth/callback` - Handle LinkedIn OAuth callback
- `POST /oauth/token` - Exchange code for access token (PKCE - Proof Key for Code Exchange flow)

#### LinkedIn Operations

The server exposes a single `/mcp` endpoint that supports the following tool operations:

- `user-info` - Get user profile information (using OpenID Connect when available)
- `create-post` - Create a text post using UGC Posts endpoint (up to 3,000 characters)
- `init-image-upload` - Initialize image upload to LinkedIn
- `create-image-post` - Create a post with an image using UGC Posts endpoint
- `analyze-image-structured-post` - Analyze image and generate content for preview
- `analyze-image-structured-post-with-image` - Publish a post with a single image
- `linkedin-post-with-multiple-images` - Create and publish a multi-image carousel post
- `analyze-image-and-post` - Analyze image and directly post the generated content

### API Integration Details

The application uses several LinkedIn API endpoints:

1. **UGC Posts Endpoint** (`/v2/ugcPosts`):
   - Supports up to 3,000 characters
   - Used for all post creation (text and image posts)
   - Proper structure following LinkedIn API schema

2. **User Info Endpoint**:
   - Uses `/v2/userinfo` for OpenID Connect authentication
   - Falls back to `/v2/me` for traditional OAuth

3. **Asset Upload Endpoint**:
   - Used for initializing image uploads
   - Supports single and multiple image uploads
   - Handles proper media registration

## 💻 Development

### Project Structure

```text
linkedin-mcp/
├── mcp-server/              # Backend server (TypeScript)
│   ├── src/
│   │   ├── auth/            # Authentication logic
│   │   │   ├── ClientsStore.ts  # OAuth client management
│   │   │   ├── OAuthServerProvider.ts  # OAuth provider implementation
│   │   │   ├── SessionsStore.ts  # Session management
│   │   │   └── TokenStore.ts     # Token storage and validation
│   │   ├── mcp/             # Core MCP functionality
│   │   │   ├── Tools.ts     # LinkedIn API integration
│   │   │   └── TransportsStore.ts  # MCP transport management
│   │   └── index.ts         # Server entry point
├── frontend-vite/           # Frontend application (React + TypeScript)
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── LinkedInAuth.tsx  # Authentication component
│   │   │   ├── NewUnifiedPostCreator.tsx  # Main post creation flow
│   │   │   ├── PostAI.tsx   # AI-powered post creation component
│   │   │   └── ...          # Other UI components
│   │   ├── App.tsx          # Main application component
│   │   └── main.tsx         # Application entry point
```

## 🔧 Recent Improvements

### User Interface Enhancements

- **Unified Post Creation Interface**: Consolidated separate interfaces into a single, intuitive flow
- **Multi-Image Carousel Support**: Added support for creating posts with multiple images
- **Modern React Components**: Rebuilt UI with Material-UI components and responsive design
- **Step-by-Step Workflow**: Implemented a guided workflow with clear steps and feedback
- **Improved Error Handling**: Enhanced error messages and user feedback throughout the application

### LinkedIn API Integration

- **Modern Endpoints**: Utilizing `/v2/ugcPosts` endpoint for post creation, supporting longer content (up to 3,000 characters)
- **OpenID Connect**: Added support for OpenID Connect authentication for profile information
- **Proper Error Handling**: Improved error diagnostics for LinkedIn API responses
- **Character Limit Detection**: Automatic detection of content that exceeds LinkedIn's limits

### Content Generation Capabilities

- **Enhanced AI Integration**: Improved Gemini AI integration for more relevant content generation
- **Multi-Image Analysis**: Support for analyzing multiple images for carousel posts
- **Structured Content Generation**: More organized and professional content formatting
- **Preview Before Publishing**: Added ability to review and edit AI-generated content before posting

## 🚧 Troubleshooting

### Common Issues and Solutions

1. **Authentication Errors**:
   - Ensure your LinkedIn app is properly configured
   - Check that all required scopes are enabled
   - Verify redirect URLs match exactly

2. **Posting Errors**:
   - If receiving 500 errors, check post length (now handled automatically)
   - Ensure your token includes the `w_member_social` scope
   - Verify your app is approved for posting if required by LinkedIn

3. **Image Upload Issues**:
   - Follow the two-step process: initialize upload, then create post
   - Check that image format and size are supported by LinkedIn
   - Ensure proper URN references in posts

## ✅ Known Issues

- LinkedIn API occasionally returns 500 errors for various reasons
- Token expiration requires re-authentication
- Content with special characters may require additional encoding

---

## 📄 License

MIT License

## 🙏 Acknowledgements

- LinkedIn API Documentation
- Gemini AI for image analysis
- Contributors to this project

## 📬 Contact & Support

If you encounter any issues or need assistance with implementation:

- Open an issue on our GitHub repository
- Join our community Discord for real-time support
- Contact the lead developer directly at [harshpatel25800@gmail.com](mailto:harshpatel25800@gmail.com)

For enterprise support options or custom implementation assistance, please reach out via email with "Enterprise Support" in the subject line.
