// Simple direct test of LinkedIn OAuth token exchange
// Run with: node direct-test.js YOUR_AUTH_CODE
const axios = require('axios');

// LinkedIn credentials - REPLACE THESE WITH YOUR ACTUAL VALUES
const CLIENT_ID = "78zxehcjixf66p";  // Your LinkedIn Client ID
const CLIENT_SECRET = "WPI_AP1.E1MUOXPg5FmJNC";  // Your LinkedIn Client Secret
const REDIRECT_URI = "http://localhost:3001/oauth/callback";  // Your callback URL

async function testDirectExchange() {
    // Get auth code from command line
    const authCode = process.argv[2];
    if (!authCode) {
        console.error("Please provide your authorization code as an argument");
        console.error("Usage: node direct-test.js YOUR_AUTH_CODE");
        process.exit(1);
    }

    console.log("Testing direct exchange with LinkedIn API");
    console.log("----------------------------------------");
    console.log("Client ID:", CLIENT_ID);
    console.log("Redirect URI:", REDIRECT_URI);
    console.log("Auth Code:", authCode.substring(0, 15) + "...");
    console.log("----------------------------------------");

    try {
        // Create parameters for token exchange - format exactly as LinkedIn expects
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', authCode);
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('redirect_uri', REDIRECT_URI);

        console.log("Request parameters:", params.toString());

        // Direct API call to LinkedIn
        const response = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log("\n✅ SUCCESS! LinkedIn returned:");
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error("\n❌ ERROR during exchange:");

        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));

            // Provide helpful suggestions based on error
            if (error.response.status === 400) {
                console.log("\nPossible solutions:");
                console.log("1. The authorization code may have already been used (codes are one-time use)");
                console.log("2. The authorization code may have expired (codes expire quickly)");
                console.log("3. The redirect_uri might not match EXACTLY what LinkedIn has registered");
                console.log("4. Client ID or secret might be incorrect");
            }
        } else {
            console.error("Error:", error.message);
        }
    }
}

testDirectExchange(); 