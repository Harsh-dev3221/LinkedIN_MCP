#!/usr/bin/env node

/**
 * Setup Test Script
 * 
 * This script tests the basic functionality of the LinkedIn Post Creator
 * token-based system to ensure everything is working correctly.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testSetup() {
    console.log('🧪 Testing LinkedIn Post Creator setup...\n');

    const tests = [
        {
            name: 'Database Connection',
            test: async () => {
                const { data, error } = await supabase.from('users').select('count').limit(1);
                if (error && error.code !== 'PGRST116') throw error;
                return true;
            }
        },
        {
            name: 'Users Table',
            test: async () => {
                const { error } = await supabase.from('users').select('*').limit(1);
                if (error && error.code !== 'PGRST116') throw error;
                return true;
            }
        },
        {
            name: 'User Tokens Table',
            test: async () => {
                const { error } = await supabase.from('user_tokens').select('*').limit(1);
                if (error && error.code !== 'PGRST116') throw error;
                return true;
            }
        },
        {
            name: 'Token Usage History Table',
            test: async () => {
                const { error } = await supabase.from('token_usage_history').select('*').limit(1);
                if (error && error.code !== 'PGRST116') throw error;
                return true;
            }
        },
        {
            name: 'Posts Table',
            test: async () => {
                const { error } = await supabase.from('posts').select('*').limit(1);
                if (error && error.code !== 'PGRST116') throw error;
                return true;
            }
        },
        {
            name: 'Refresh Tokens Function',
            test: async () => {
                const { error } = await supabase.rpc('refresh_daily_tokens');
                if (error) throw error;
                return true;
            }
        },
        {
            name: 'Environment Variables',
            test: async () => {
                const required = [
                    'SUPABASE_URL',
                    'SUPABASE_SERVICE_ROLE_KEY',
                    'JWT_SECRET',
                    'LINKEDIN_CLIENT_ID',
                    'LINKEDIN_CLIENT_SECRET'
                ];
                
                const missing = required.filter(key => !process.env[key]);
                if (missing.length > 0) {
                    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
                }
                return true;
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            await test.test();
            console.log(`✅ ${test.name}`);
            passed++;
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
        console.log('\n🎉 All tests passed! Your setup is ready to go.');
        console.log('\nYou can now:');
        console.log('1. Start the backend: npm run dev');
        console.log('2. Start the frontend: cd ../frontend-vite && npm run dev');
        console.log('3. Open http://localhost:5173 in your browser');
    } else {
        console.log('\n⚠️  Some tests failed. Please check your configuration.');
        console.log('\nCommon fixes:');
        console.log('1. Run the database setup: npm run setup-db');
        console.log('2. Check your .env file for missing variables');
        console.log('3. Verify your Supabase project is active');
        process.exit(1);
    }
}

// Run the tests
testSetup().catch(error => {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
});
