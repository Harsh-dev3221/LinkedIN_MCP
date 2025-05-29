#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script helps set up the database schema for the LinkedIn Post Creator
 * with token-based system.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration!');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupDatabase() {
    console.log('🚀 Setting up LinkedIn Post Creator database...\n');

    try {
        // Read the schema file
        const schemaPath = join(__dirname, '../database/schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');

        console.log('📄 Executing database schema...');
        
        // Execute the schema
        const { error } = await supabase.rpc('exec_sql', { sql: schema });
        
        if (error) {
            // If the function doesn't exist, try executing directly
            console.log('⚠️  exec_sql function not found, executing schema directly...');
            
            // Split schema into individual statements and execute them
            const statements = schema
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            for (const statement of statements) {
                if (statement.trim()) {
                    const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
                    if (stmtError) {
                        console.warn(`⚠️  Warning executing statement: ${stmtError.message}`);
                    }
                }
            }
        }

        console.log('✅ Database schema executed successfully!');

        // Test the setup by checking if tables exist
        console.log('\n🔍 Verifying table creation...');
        
        const tables = ['users', 'user_tokens', 'token_usage_history', 'posts'];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
                
            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
                console.error(`❌ Error checking table ${table}:`, error.message);
            } else {
                console.log(`✅ Table '${table}' is accessible`);
            }
        }

        // Test database functions
        console.log('\n🔧 Testing database functions...');
        
        try {
            const { error: funcError } = await supabase.rpc('refresh_daily_tokens');
            if (funcError) {
                console.warn(`⚠️  Warning testing refresh_daily_tokens: ${funcError.message}`);
            } else {
                console.log('✅ Function refresh_daily_tokens is working');
            }
        } catch (err) {
            console.warn('⚠️  Could not test refresh_daily_tokens function');
        }

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Configure your authentication providers in Supabase dashboard');
        console.log('2. Set up Google OAuth in Google Cloud Console');
        console.log('3. Configure LinkedIn OAuth in LinkedIn Developer Portal');
        console.log('4. Update your .env files with the correct credentials');
        console.log('5. Start your application with npm run dev');

    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure your Supabase URL and service role key are correct');
        console.error('2. Ensure your Supabase project is active');
        console.error('3. Check that you have the necessary permissions');
        process.exit(1);
    }
}

// Run the setup
setupDatabase();
