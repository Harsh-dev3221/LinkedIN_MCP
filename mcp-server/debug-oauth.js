const axios = require('axios');
require('dotenv').config();

async function debugOAuthTokenExchange() {
    try {
        // Get the authorization code from command line args
        const code = process.argv[2];
        if (!code) {
            console.error('Please provide the authorization code as a command line argument');
            process.exit(1);
        }

        console.log('Using authorization code:', code);

        // Configuration from environment variables
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        const redirectUrl = `${process.env.SERVER_URL}/oauth/callback`;

        console.log('OAuth Configuration:');
        console.log('- Client ID:', clientId);
        console.log('- Client Secret:', clientSecret ? '****' + clientSecret.substr(-4) : 'MISSING');
        console.log('- Redirect URL:', redirectUrl);

        // Create parameters for token request
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('redirect_uri', redirectUrl);

        console.log('\nSending token request with params:');
        console.log(params.toString());

        // Make the request to LinkedIn
        console.log('\nMaking request to LinkedIn token endpoint...');
        const response = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('\nLinkedIn Response Status:', response.status);
        console.log('LinkedIn Response Headers:', JSON.stringify(response.headers, null, 2));
        console.log('LinkedIn Response Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('\nError during token exchange:');

        if (axios.isAxiosError(error)) {
            console.error('Request failed with status:', error.response?.status);
            console.error('Error response data:', error.response?.data);
            console.error('Error message:', error.message);

            // Additional helpful debugging info
            if (error.response?.status === 400) {
                console.log('\nPossible solutions for 400 Bad Request:');
                console.log('1. Check if the authorization code has already been used (they are one-time use)');
                console.log('2. Verify the redirect_uri matches EXACTLY what is registered with LinkedIn');
                console.log('3. Check that client_id and client_secret are correct');
                console.log('4. Ensure the code hasn\'t expired (LinkedIn codes expire quickly)');
            }
        } else {
            console.error('Non-Axios error:', error);
        }
    }
}

debugOAuthTokenExchange(); 