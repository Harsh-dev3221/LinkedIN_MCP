# LinkedIn Post Creator with Gemini AI

MCP server for creating LinkedIn posts with AI-generated content based on image analysis using Google's Gemini AI.

This MCP server:
* Can be hosted locally or remotely: uses HTTP+SSE transport defined in MCP
* Implements the Third-Party Authorization Flow from MCP specs to delegate authorization to LinkedIn's OAuth authorization server
* Integrates with Google's Gemini Pro Vision API for AI-powered image analysis

## Features

### Tools

* `user-info` - Get current logged in user information (name, headline and profile picture)
* `create-post` - Create a new post on LinkedIn
* `analyze-image-create-post` - Analyze an image with Gemini AI and generate LinkedIn post content

## Installation

Follow these instructions to run the LinkedIn Post Creator on your host.

### Requirements

* Node.js v18 or higher
* npm 8 or higher
* A LinkedIn client with Community Management API access and `http://localhost:3001/oauth/callback` added to the authorized redirect URLs
* Google Gemini API key

### Backend Setup

1. Navigate to the MCP server directory:
```
cd mcp-server
```

2. Install dependencies:
```
npm install
```

3. Create an environment file with your credentials:
```
cp .env.template .env
```

4. Edit the .env file with your LinkedIn client credentials, JWT secret, and Gemini API key:
```
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
JWT_SECRET=random_secure_string
GEMINI_API_KEY=your_gemini_api_key
CORS_ALLOWED_ORIGIN=http://localhost:3000
SERVER_URL=http://localhost:3001
PORT=3001
```

5. Build and start the server:
```
npm run build
npm start
```

For development mode:
```
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```
cd frontend/frontend-vite
```

2. Install dependencies:
```
npm install
```

3. Create a .env file with your configuration:
```
VITE_MCP_SERVER_URL=http://localhost:3001
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
```

4. Start the development server:
```
npm run dev
```

The application will be accessible at http://localhost:5173

## Usage

1. Open the application in your browser
2. Click "Connect with LinkedIn" to authenticate
3. Upload an image and provide instructions for post creation
4. Review and edit the AI-generated content
5. Publish the post to your LinkedIn profile

## Project Structure

```
linkedin-post-creator/
├── mcp-server/            # Backend code
│   ├── src/
│   │   ├── auth/          # Authentication related code
│   │   ├── mcp/           # MCP tools implementation
│   │   ├── index.ts       # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.template
│   ├── .env
├── frontend/              # Frontend code
│   ├── frontend-vite/     # Vite-based React application
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── App.tsx        # Main application component
│   │   ├── package.json
│   │   ├── .env
```

## Acknowledgments

* Based on the [linkedin-mcp-server](https://github.com/fredericbarthelet/linkedin-mcp-server) repository by Frederic Barthelet
* Uses Google's Gemini AI for image analysis and content generation

## License

This project is licensed under the MIT License. 