# LinkedIn Post Creator - Setup Guide

## 🎉 New Token-Based System Features

This application now includes a comprehensive token-based usage system with modern authentication!

### Key Features
- **50 free tokens daily** for each user
- **Google OAuth** and **LinkedIn OAuth** authentication
- **Real-time token tracking** and usage analytics
- **Secure user management** with Supabase
- **Daily automatic token refresh**

### Token Consumption Rates
- **Basic post generation**: FREE (0 tokens)
- **AI-enhanced single post**: 5 tokens
- **Multi-image post generation**: 10 tokens

## 🚀 Quick Setup

### 1. Prerequisites
- Node.js (v16 or higher)
- Supabase account (free tier available)
- LinkedIn Developer Account
- Google Cloud Console account (for OAuth)
- Gemini API key

### 2. Supabase Setup

1. **Create a new Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and keys

2. **Set up the database**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `mcp-server/database/schema.sql`
   - Run the SQL to create all tables and functions

3. **Configure Authentication**:
   - Go to Authentication > Providers
   - Enable Google OAuth provider
   - Add your Google OAuth credentials
   - Set redirect URL to: `http://localhost:5173/auth/callback`

### 3. Google OAuth Setup

1. **Create Google OAuth credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials > Create Credentials > OAuth 2.0 Client ID
   - Set authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

### 4. LinkedIn Developer Setup

1. **Create LinkedIn App**:
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
   - Create a new app
   - Add redirect URL: `http://localhost:3001/oauth/callback`
   - Request permissions: `openid`, `profile`, `email`, `w_member_social`

### 5. Backend Configuration

1. **Install dependencies**:
   ```bash
   cd mcp-server
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file**:
   ```env
   # Server Configuration
   PORT=3001
   SERVER_URL=http://localhost:3001
   CORS_ALLOWED_ORIGIN=http://localhost:5173
   
   # LinkedIn OAuth
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   
   # JWT Secret (generate a random string)
   JWT_SECRET=your_super_secret_jwt_key_here
   
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key
   ```

### 6. Frontend Configuration

1. **Install dependencies**:
   ```bash
   cd frontend-vite
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file**:
   ```env
   # Backend API
   VITE_MCP_SERVER_URL=http://localhost:3001
   
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### 7. Start the Application

1. **Start the backend**:
   ```bash
   cd mcp-server
   npm run dev
   ```

2. **Start the frontend** (in a new terminal):
   ```bash
   cd frontend-vite
   npm run dev
   ```

3. **Access the application**:
   - Open `http://localhost:5173`
   - Sign in with Google or LinkedIn
   - Start creating posts!

## 🔧 Database Schema

The application uses the following main tables:

- **users**: User profiles and authentication info
- **user_tokens**: Daily token allocation and usage tracking
- **token_usage_history**: Detailed usage analytics
- **posts**: Post history and content tracking

## 🎯 User Flow

1. **Landing Page** → Choose to get started
2. **Authentication** → Sign in with Google or LinkedIn
3. **Dashboard** → View token status and create posts
4. **Post Creation** → Choose post type and create content
5. **Token Consumption** → Automatic deduction based on post type
6. **Publishing** → Direct posting to LinkedIn

## 🛡️ Security Features

- **Row Level Security (RLS)** on all database tables
- **JWT token validation** for API requests
- **Rate limiting** to prevent abuse
- **Secure session management** with Supabase
- **Environment variable protection**

## 📊 Token Management

- **Daily refresh** at midnight UTC
- **Automatic cleanup** of expired sessions
- **Usage analytics** for insights
- **Graceful error handling** for insufficient tokens

## 🔍 Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check Supabase URL and keys
   - Ensure database schema is properly created

2. **Authentication failures**:
   - Verify OAuth redirect URLs
   - Check provider configurations in Supabase

3. **Token consumption issues**:
   - Check user_tokens table for proper initialization
   - Verify database functions are created correctly

### Support

For issues or questions:
- Check the main README.md for detailed documentation
- Open an issue on GitHub
- Contact: harshpatel25800@gmail.com
