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

- **LinkedIn Authentication**: Secure OAuth-based authentication
- **Post Management**:
  - Create text-based posts
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
- **User Information**:
  - Retrieve profile details
  - Access profile pictures

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

1. User authenticates via the frontend using LinkedIn OAuth
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

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/oauth/callback

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
     - `r_liteprofile` (Basic profile)
     - `r_emailaddress` (Email address)
     - `w_member_social` (Create/manage posts)
3. Get your Client ID and Client Secret

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
   - Authorize the application

2. **Creating Posts**:
   - Navigate to "Create Post"
   - Enter your content
   - Choose visibility
   - Click "Post"

3. **Image Posts**:
   - Navigate to "Image Post"
   - Upload an image
   - Add a description
   - Optionally use AI-generated content
   - Click "Post"

4. **Managing Posts**:
   - View your posts in the "My Posts" section
   - Edit or delete posts as needed

## 📚 API Documentation

### Server Endpoints

#### Authentication

- `GET /oauth/authorize` - Initiate LinkedIn OAuth flow
- `GET /oauth/callback` - Handle LinkedIn OAuth callback
- `POST /oauth/token` - Exchange code for access token

#### LinkedIn Operations

The server exposes a single `/mcp` endpoint that supports the following operations:

- `getUserInfo` - Get user profile information
- `createPost` - Create a text post
- `createPostV2` - Create a post with newer API
- `updatePost` - Update an existing post
- `deletePost` - Delete a post
- `initImageUpload` - Initialize image upload
- `createImagePost` - Create a post with an image
- `analyzeImageAndCreateContent` - Analyze image and generate content

### Request & Response Format

All requests to `/mcp` follow this format:

```json
{
  "operation": "operationName",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "sessionToken": "user_session_token"
}
```

Responses follow this format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Response content"
    }
  ],
  "isError": false
}
```

## 💻 Development

### Project Structure

```
linkedin-mcp/
├── mcp-server/              # Backend server
│   ├── src/
│   │   ├── auth/            # Authentication logic
│   │   ├── mcp/             # Core MCP functionality
│   │   │   ├── Tools.ts     # LinkedIn API integration
│   │   │   └── ...
│   │   ├── index.ts         # Server entry point
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── frontend-vite/           # Frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Application pages
│   │   ├── App.tsx          # Main application
│   │   └── ...
│   ├── package.json
│   └── ...
│
└── README.md
```

### Adding New Features

1. For new LinkedIn API features:
   - Add methods to `Tools.ts`
   - Ensure proper error handling
   - Update API documentation

2. For new frontend features:
   - Create components in `frontend-vite/src/components`
   - Update routes if adding new pages
   - Connect to backend via appropriate API calls

## 🔍 Troubleshooting

### Common Issues and Resolutions

#### Authentication Challenges

- **Issue**: "LinkedIn session has expired"
  - **Solution**: Sign out completely from the application, clear browser cookies, and perform a fresh login through the LinkedIn OAuth flow
  - **Cause**: OAuth access tokens have a limited lifespan (typically 60 days) and require renewal
  - **Prevention**: Implement proper token refresh mechanisms using the refresh token when available

- **Issue**: "Permission denied" or "Not authorized"
  - **Solution**: 
    1. Verify that your LinkedIn account has the necessary permissions
    2. Check that your LinkedIn Developer application has requested all required scopes
    3. Ensure the account using the application has proper access levels in LinkedIn
  - **Cause**: Missing or insufficient LinkedIn API permissions or scope limitations
  - **Technical Details**: LinkedIn's permissions are granular and must explicitly match the API endpoints you're accessing

#### API Communication Errors

- **Issue**: "LinkedIn API rate limit exceeded"
  - **Solution**: 
    1. Implement exponential backoff strategy for retries
    2. Reduce frequency of API calls
    3. Wait for the rate limit window to reset (typically 24 hours)
  - **Cause**: LinkedIn enforces strict API rate limits (approximately 100 calls per day per user)
  - **Best Practice**: Cache responses when possible to reduce API calls

- **Issue**: "Cannot access one or more requested fields"
  - **Solution**: 
    1. Review your application's permission scopes in LinkedIn Developer Portal
    2. Request minimum necessary permissions based on LinkedIn's documentation
    3. Adjust field projections in API calls to match granted permissions
  - **Cause**: Application's OAuth scope doesn't cover all requested data fields
  - **Reference**: Consult LinkedIn's field projection documentation for specific endpoint requirements

#### Media Upload Complications

- **Issue**: "Invalid image data provided"
  - **Solution**: 
    1. Verify image format is supported (JPEG, PNG recommended)
    2. Ensure image size is within LinkedIn limits (under 5MB)
    3. Check that base64 encoding is properly formatted without data URI prefix
  - **Cause**: Image data not properly formatted, corrupted, or exceeding size limits
  - **Debugging**: Log image metadata (size, type) before attempting upload

- **Issue**: "Error analyzing image with Gemini"
  - **Solution**: 
    1. Verify Gemini API key is valid and has proper permissions
    2. Ensure image complies with Gemini's content policy
    3. Try processing with a smaller or less complex image
    4. Check network connectivity to Gemini API endpoints
  - **Cause**: Issues with Gemini API authentication, rate limits, or image compatibility
  - **Monitoring**: Implement proper error logging for AI processing attempts

## ⚠️ Known Issues

### Critical: LinkedIn API Publishing Limitations

We are currently experiencing significant challenges with post publishing functionality due to recent LinkedIn API changes. LinkedIn has implemented several breaking changes to their publishing endpoints as part of their API version updates (most recently to version 202504).

**Specific issues include:**

- Post creation occasionally fails with error code 403 due to LinkedIn's stricter permission enforcement
- Content distribution options have changed, requiring updates to our publishing pipeline
- Media attachment process has been modified, breaking our existing image upload functionality
- New rate limiting policies affecting bulk publishing operations

**Current workarounds:**

1. We've implemented temporary fallback to the legacy `/shares` endpoint where possible
2. Added additional error handling for the new API response formats
3. Developing an updated authorization flow to accommodate LinkedIn's new permission model

**Status:** Our development team is actively working on a comprehensive update to align with LinkedIn's new API specifications. We expect to release a fix in the next update.

For the latest status on this issue, please check our GitHub issues page or contact our support team directly.

---

## 📬 Contact & Support

If you encounter any issues or need assistance with implementation:

- Open an issue on our GitHub repository
- Join our community Discord for real-time support
- Contact the lead developer directly at harshpatel25800@gmail.com

For enterprise support options or custom implementation assistance, please reach out via email with "Enterprise Support" in the subject line.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 