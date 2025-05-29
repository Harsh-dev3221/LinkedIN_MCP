# 🚀 Supabase Setup Guide for LinkedIn Post Creator

## What is Supabase?

**Supabase** is like "Firebase for PostgreSQL" - it provides:
- **PostgreSQL Database** (SQL, not MongoDB)
- **Authentication** (Google, GitHub, etc.)
- **Real-time subscriptions**
- **Auto-generated APIs**
- **Row Level Security**

Think of it as a **backend-as-a-service** that gives you a complete database + auth system without managing servers.

## 🎯 Our Architecture

```
Google OAuth → Supabase Auth → Our App → PostgreSQL Database
     ↓              ↓              ↓              ↓
User signs in → Gets JWT token → Makes API calls → Stores data
```

**Key Points:**
- **Google OAuth**: For website user authentication (sign up/sign in)
- **LinkedIn OAuth**: For connecting user's LinkedIn account (posting capability)
- **Supabase**: Stores all user data, tokens, posts, analytics
- **PostgreSQL**: Our database (like MongoDB but SQL-based)

## 📝 Step-by-Step Setup

### Step 1: Create Supabase Project

1. **Go to Supabase**: https://supabase.com
2. **Sign up/Login** with your email
3. **Click "New Project"**
4. **Fill in details**:
   - **Organization**: Create new or use existing
   - **Project Name**: `linkedin-post-creator`
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for setup to complete

### Step 2: Get Your Credentials

Once your project is ready:

1. **Go to Settings** (gear icon in sidebar)
2. **Click "API"**
3. **Copy these values** (you'll need them later):

```env
# Project URL (looks like this)
SUPABASE_URL=https://abcdefghijklmnop.supabase.co

# Anon public key (starts with eyJ...)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (starts with eyJ... - KEEP SECRET!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Set Up Database Schema

**IMPORTANT**: Use the simple schema first to avoid type casting errors.

1. **Go to SQL Editor** (in sidebar)
2. **Copy the entire content** from `mcp-server/database/schema-simple.sql`
3. **Paste it in the SQL Editor**
4. **Click "Run"** to create all tables and functions

**If you get an error about "operator does not exist: text = uuid":**
- This is a common issue with RLS policies
- Use the `schema-simple.sql` file instead
- You can add Row Level Security later if needed

This creates:
- **users** table (user profiles)
- **user_tokens** table (daily token tracking)
- **token_usage_history** table (usage analytics)
- **posts** table (post history)
- **Database functions** (for token management)

### Step 4: Configure Google OAuth

#### A. Get Google OAuth Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create new project** or select existing
3. **Enable APIs**:
   - Go to **"APIs & Services" → "Library"**
   - Search **"Google+ API"** and click **"Enable"**
4. **Create OAuth credentials**:
   - Go to **"APIs & Services" → "Credentials"**
   - Click **"Create Credentials" → "OAuth 2.0 Client ID"**
   - Choose **"Web application"**
   - **Name**: `LinkedIn Post Creator`
   - **Authorized redirect URIs**: Add this URL:
     ```
     https://YOUR_SUPABASE_PROJECT_URL/auth/v1/callback
     ```
     (Replace YOUR_SUPABASE_PROJECT_URL with your actual Supabase URL)
5. **Copy Client ID and Client Secret**

#### B. Configure in Supabase

1. **Go back to Supabase dashboard**
2. **Go to Authentication → Providers**
3. **Find "Google"** and click to expand
4. **Enable Google provider**
5. **Paste your Google credentials**:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
6. **Click "Save"**

### Step 5: Configure Environment Variables

#### Backend (.env in mcp-server/)
```env
# Server Configuration
PORT=3001
SERVER_URL=http://localhost:3001
CORS_ALLOWED_ORIGIN=http://localhost:5173

# LinkedIn OAuth (for posting capability)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini AI (for image analysis)
GEMINI_API_KEY=your_gemini_api_key
```

#### Frontend (.env in frontend-vite/)
```env
# Backend API
VITE_MCP_SERVER_URL=http://localhost:3001

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 6: Test Your Setup

1. **Install dependencies**:
   ```bash
   # Backend
   cd mcp-server
   npm install

   # Frontend
   cd ../frontend-vite
   npm install
   ```

2. **Test database setup**:
   ```bash
   cd mcp-server
   npm run test-setup
   ```

3. **Start the application**:
   ```bash
   # Backend (terminal 1)
   cd mcp-server
   npm run dev

   # Frontend (terminal 2)
   cd frontend-vite
   npm run dev
   ```

4. **Test authentication**:
   - Open http://localhost:5173
   - Click "Get Started"
   - Try signing in with Google
   - Check if you see the dashboard

## 🔍 Understanding the Data Flow

### Authentication Flow
```
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. Google redirects back to Supabase
4. Supabase creates user session
5. Frontend gets JWT token
6. Backend validates token with Supabase
7. User data stored in PostgreSQL
```

### Token System Flow
```
1. User signs up → Gets 50 daily tokens
2. User creates post → Tokens deducted
3. Midnight UTC → Tokens refresh to 50
4. Usage tracked in database
```

### Data Storage (PostgreSQL Tables)
```sql
-- User profiles
users: id, email, name, provider, created_at

-- Token tracking
user_tokens: user_id, daily_tokens, tokens_used_today, last_refresh_date

-- Usage analytics
token_usage_history: user_id, action_type, tokens_consumed, timestamp

-- Post history
posts: user_id, content, tokens_used, post_type, created_at
```

## 🛠️ Common Issues & Solutions

### Issue: "Missing Supabase configuration"
**Solution**: Check your .env files have the correct SUPABASE_URL and keys

### Issue: "Database connection failed"
**Solution**:
1. Verify your Supabase project is active
2. Check if database schema was created properly
3. Run `npm run setup-db` to recreate schema

### Issue: "Google OAuth not working"
**Solution**:
1. Check redirect URI in Google Console matches Supabase
2. Verify Google+ API is enabled
3. Check Client ID/Secret in Supabase settings

### Issue: "Token refresh not working"
**Solution**: Check if database functions were created properly in schema

## 🎉 What You Get

After setup, your app will have:
- ✅ **Google authentication** for user sign-up/sign-in
- ✅ **PostgreSQL database** storing all user data
- ✅ **Token-based usage system** (50 tokens/day)
- ✅ **Automatic token refresh** daily
- ✅ **Usage analytics** and post history
- ✅ **Secure session management**
- ✅ **Real-time token tracking**

## 📞 Need Help?

If you get stuck:
1. Check the main `SETUP_GUIDE.md` for detailed instructions
2. Run `npm run test-setup` to diagnose issues
3. Check Supabase dashboard for error logs
4. Contact: harshpatel25800@gmail.com

---

**Remember**: Supabase is your database + authentication provider. It replaces what you would typically do with MongoDB + custom auth system, but uses PostgreSQL (SQL) instead of MongoDB (NoSQL).
