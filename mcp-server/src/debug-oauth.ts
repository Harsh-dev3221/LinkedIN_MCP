import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugOAuthTokenExchange(authCode: string) {
    try {
        console.log('Starting direct OAuth token exchange debugging...');
        console.log('Auth code (first 10 chars):', authCode.substring(0, 10));

        // Use the correct credentials
        const clientId = process.env.LINKEDIN_CLIENT_ID || '';
        const clientSecret = "WPL_AP1.E1MUOXPg8FmJNQAV.ENdsdg=="; // Hardcoded correct secret
        const redirectUrl = `${process.env.SERVER_URL}/oauth/callback`;

        console.log('Credentials:');
        console.log('- Client ID:', clientId);
        console.log('- Redirect URL:', redirectUrl);

        // Build token exchange request
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', authCode);
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('redirect_uri', redirectUrl);

        console.log('\nSending request parameters:');
        console.log(params.toString());

        // Make direct request to LinkedIn
        const response = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        );

        console.log('\nLinkedIn response status:', response.status);
        console.log('LinkedIn response headers:', response.headers);
        console.log('LinkedIn response data:', response.data);

        return response.data;
    } catch (error) {
        console.error('\nError during token exchange:');

        if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('Status text:', error.response?.statusText);
            console.error('Response data:', error.response?.data);
            console.error('Message:', error.message);
        } else {
            console.error('Non-axios error:', error);
        }

        throw error;
    }
}

// Check for command line arguments
const authCode = process.argv[2];
if (!authCode) {
    console.error('Please provide an authorization code as command line argument');
    console.error('Usage: npx ts-node src/debug-oauth.ts YOUR_AUTH_CODE');
    process.exit(1);
}

// Run the debug function
debugOAuthTokenExchange(authCode)
    .then(result => {
        console.log('\nToken exchange successful!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\nToken exchange failed!');
        process.exit(1);
    }); 