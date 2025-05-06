# LinkedIn Multi-Channel Publisher (MCP)

A powerful tool for managing and automating LinkedIn content publishing with advanced features like image analysis and post scheduling.

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

LinkedIn MCP integrates with LinkedIn's API to provide a streamlined content publishing experience. The application allows users to create, update, and delete posts, upload images, and leverage AI-powered content generation based on image analysis.

### Project Goals

- Simplify LinkedIn content publishing process
- Provide advanced content generation capabilities
- Enable seamless image uploads and sharing
- Support modern LinkedIn API standards

## ✨ Features

- **LinkedIn Authentication**: 
  - Secure OAuth-based authentication
  - OpenID Connect support
  - Proper scope validation and management
- **Post Management**:
  - Create text-based posts (supports up to 3,000 characters)
  - Update existing posts
  - Delete posts
  - Control post visibility (public/connections)
- **Image Handling**:
  - Image upload and initialization
  - Create posts with images
  - AI-powered image analysis
- **Content Generation**:
  - AI-generated content based on image analysis using Gemini AI
  - Personalized content based on user profile
  - One-step image analysis and posting
- **User Information**:
  - Retrieve profile details via OpenID Connect
  - Access profile pictures
- **Advanced Error Handling**:
  - Detailed LinkedIn API error diagnostics
  - Character limit detection
  - Permissions and scope validation

## 🏗️ Architecture

```
┌─────────────────┐      ┌────────────────────┐      ┌───────────────┐
│                 │      │                    │      │               │
│  Frontend (Vue) │◄────►│   MCP Server (TS)  │◄────►│  LinkedIn API │
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

### Data Flow

1. User authenticates via the frontend using LinkedIn OAuth/OpenID Connect
2. Authentication tokens are stored in the MCP server
3. User can perform actions (create posts, upload images) via the frontend
4. MCP server processes requests and communicates with LinkedIn API
5. For image analysis, the server calls Gemini API with the image and instructions
6. Results are returned to the frontend for display

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

```
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

```
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

1. **Authentication**:
   - Click "Login with LinkedIn" on the homepage
   - Authorize the application with the requested permissions

2. **Creating Posts**:
   - Navigate to "Create Post"
   - Enter your content (up to 3,000 characters)
   - Choose visibility
   - Click "Post"

3. **Image Posts**:
   - Navigate to "Image Post"
   - Upload an image
   - Add a description
   - Optionally use AI-generated content
   - Click "Post"

4. **AI-Powered Posts**:
   - Upload an image
   - Provide instructions for content generation
   - Review the generated content
   - Post directly or edit as needed
   - Posts are created using LinkedIn's modern UGC Posts endpoint

5. **Managing Posts**:
   - View your posts in the "My Posts" section
   - Edit or delete posts as needed

## 📚 API Documentation

### Server Endpoints

#### Authentication

- `GET /oauth/authorize` - Initiate LinkedIn OAuth flow
- `GET /oauth/callback` - Handle LinkedIn OAuth callback
- `POST /oauth/token` - Exchange code for access token (PKCE flow)

#### LinkedIn Operations

The server exposes a single `/mcp` endpoint that supports the following tool operations:

- `user-info` - Get user profile information (using OpenID Connect when available)
- `create-post` - Create a text post using UGC Posts endpoint (up to 3,000 characters)
- `init-image-upload` - Initialize image upload to LinkedIn
- `create-image-post` - Create a post with an image using UGC Posts endpoint
- `analyze-image-create-post` - Analyze image and generate content
- `analyze-image-and-post` - Analyze image and directly post the generated content

### API Integration Details

The application uses two main LinkedIn API endpoints for posting:

1. **UGC Posts Endpoint** (`/v2/ugcPosts`):
   - Supports up to 3,000 characters
   - Used for all post creation (text and image posts)
   - Proper structure following LinkedIn API schema

2. **User Info Endpoint**:
   - Uses `/v2/userinfo` for OpenID Connect authentication
   - Falls back to `/v2/me` for traditional OAuth

## 💻 Development

### Project Structure

```
linkedin-mcp/
├── mcp-server/              # Backend server
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
├── frontend-vite/           # Frontend application
```

## 🔧 Recent Improvements

### LinkedIn API Integration

- **Modern Endpoints**: Switched to `/v2/ugcPosts` endpoint for post creation, supporting longer content (up to 3,000 characters)
- **OpenID Connect**: Added support for OpenID Connect authentication for profile information
- **Proper Error Handling**: Improved error diagnostics for LinkedIn API responses
- **Character Limit Detection**: Automatic detection of content that exceeds legacy endpoints' limits

### Content Posting Capabilities

- **One-Step Image Analysis & Posting**: Added the ability to analyze an image and post the generated content in one operation
- **UGC Post Structure**: Properly structured posts following LinkedIn's schema requirements
- **Proper Media Support**: Enhanced image post creation with the correct media attributes

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
- Contact the lead developer directly at harshpatel25800@gmail.com

For enterprise support options or custom implementation assistance, please reach out via email with "Enterprise Support" in the subject line.