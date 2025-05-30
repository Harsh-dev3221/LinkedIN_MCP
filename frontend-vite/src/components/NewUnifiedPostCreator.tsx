import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    Stepper,
    Step,
    StepLabel,
    IconButton,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Chip,
    Stack
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import TokenIcon from '@mui/icons-material/Token';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GradientBackground from './GradientBackground';
import PostAI from './PostAI';
import { useAuth } from '../contexts/AuthContext';
import { TOKEN_COSTS } from '../lib/supabase';

// Create MCP client for API communication
const createMcpClient = (token: string, onTokenExpired?: () => void) => {
    return {
        callTool: async (toolName: string, params: any) => {
            try {
                const response = await axios.post(`${import.meta.env.VITE_MCP_SERVER_URL}/mcp`, {
                    type: "call-tool",
                    tool: toolName,
                    params
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 second timeout
                });

                if (response.data.isError) {
                    throw new Error(response.data.content[0].text);
                }

                return response.data;
            } catch (error: any) {
                console.error(`Error calling tool ${toolName}:`, error);

                // Handle authentication errors
                if (error.response?.status === 401 || error.response?.status === 403) {
                    console.error('MCP token expired or invalid');
                    if (onTokenExpired) {
                        onTokenExpired();
                    }
                    throw new Error('LinkedIn connection expired. Please reconnect your LinkedIn account.');
                }

                // Check if it's an API error related to unknown tool
                if (error.response?.data?.error?.includes('Unknown tool')) {
                    throw new Error(`API tool not available: ${toolName}. Please check if the backend supports this operation.`);
                }

                // Handle network errors
                if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    throw new Error('Network error. Please check your connection and try again.');
                }

                throw error;
            }
        }
    };
};

const NewUnifiedPostCreator = () => {
    const { user, session, tokenStatus, refreshTokenStatus, mcpToken, linkedinConnected, refreshMcpToken, refreshLinkedInStatus } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [activeStep, setActiveStep] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Content state
    const [generatedContent, setGeneratedContent] = useState('');
    const [charCount, setCharCount] = useState(0);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Image state for publishing
    const [imageData, setImageData] = useState<{ base64: string[], mimeType: string } | null>(null);
    const [imageMode, setImageMode] = useState<'single' | 'multi' | null>(null);

    // Character count for LinkedIn posts
    const MAX_CHARS = 3000;

    // Steps in the process
    const steps = ['Create Content', 'Review & Publish'];

    // Check authentication and update character count
    useEffect(() => {
        if (!user || !session) {
            setErrorMessage('Please sign in to continue');
            const timer = setTimeout(() => navigate('/auth'), 3000);
            return () => clearTimeout(timer);
        }

        // Update character count when content changes
        setCharCount(generatedContent.length);
    }, [user, session, navigate, generatedContent]);

    // Force refresh LinkedIn status when component mounts to ensure accurate state
    useEffect(() => {
        console.log('🔄 NewUnifiedPostCreator mounted, refreshing LinkedIn status...');
        refreshLinkedInStatus();
    }, [refreshLinkedInStatus]);

    // Return to the main app
    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
        } else {
            navigate('/dashboard');
        }
    };

    // Handle text changes in the editor
    const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newContent = e.target.value;
        setGeneratedContent(newContent);
        setCharCount(newContent.length);
    };

    // Calculate character count color
    const getCharCountColor = () => {
        if (charCount > MAX_CHARS) return 'error';
        if (charCount > MAX_CHARS * 0.9) return 'warning';
        return 'success';
    };

    // Handle content generation from PostAI component
    const handleGeneratedContent = (data: {
        content: string,
        imageData?: { base64: string[], mimeType: string },
        imageMode?: 'single' | 'multi'
    }) => {
        setGeneratedContent(data.content);

        // Store image data if provided
        if (data.imageData && data.imageMode) {
            setImageData(data.imageData);
            setImageMode(data.imageMode);
        } else {
            setImageData(null);
            setImageMode(null);
        }

        setActiveStep(1); // Move to the review step
    };

    // Handle errors from PostAI component
    const handleError = (message: string) => {
        setErrorMessage(message);
        // Clear the error after 5 seconds
        setTimeout(() => setErrorMessage(''), 5000);
    };

    // Handle success messages from PostAI component
    const handleSuccess = (message: string) => {
        setSuccessMessage(message);
        // Clear the success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    // Handle token expiration
    const handleTokenExpired = () => {
        setErrorMessage('LinkedIn connection expired. Please reconnect your LinkedIn account.');
        // Optionally redirect to dashboard to reconnect
        setTimeout(() => {
            navigate('/dashboard');
        }, 3000);
    };

    // Handle content regeneration
    const handleRegenerateContent = async () => {
        if (!mcpToken) {
            setErrorMessage('LinkedIn connection required. Please connect your LinkedIn account.');
            return;
        }

        setIsRegenerating(true);
        try {
            const mcpClient = createMcpClient(mcpToken, handleTokenExpired);

            // Regenerate content based on the current content
            const result = await mcpClient.callTool('create-post', {
                content: generatedContent,
                userId: user?.id
            });

            setGeneratedContent(result.content[0].text);
            setSuccessMessage('Content regenerated successfully!');
        } catch (error) {
            console.error('Error regenerating content:', error);
            setErrorMessage((error instanceof Error) ? error.message : 'An unknown error occurred');
        } finally {
            setIsRegenerating(false);
        }
    };

    // Handle publish to LinkedIn
    const handlePublish = async () => {
        if (!mcpToken || !user) {
            setErrorMessage('LinkedIn connection required. Please connect your LinkedIn account.');
            return;
        }

        setIsProcessing(true);
        try {
            const mcpClient = createMcpClient(mcpToken, handleTokenExpired);

            // Check if we have image data to publish
            if (imageData && imageMode) {
                // For single image post
                if (imageMode === 'single') {
                    const result = await mcpClient.callTool('analyze-image-structured-post-with-image', {
                        userText: generatedContent,
                        imageBase64: imageData.base64[0],
                        mimeType: imageData.mimeType,
                        userId: user.id
                    });
                    setSuccessMessage('Successfully published to LinkedIn with image!');
                }
                // For multi-image carousel post
                else if (imageMode === 'multi') {
                    const result = await mcpClient.callTool('linkedin-post-with-multiple-images', {
                        text: generatedContent,
                        imageBase64s: imageData.base64,
                        mimeType: imageData.mimeType,
                        userId: user.id
                    });
                    setSuccessMessage('Successfully published carousel to LinkedIn!');
                }
            }
            // Text-only post
            else {
                const result = await mcpClient.callTool('create-post', {
                    content: generatedContent,
                    userId: user.id
                });
                setSuccessMessage('Successfully published to LinkedIn!');
            }

            // Refresh token status after publishing
            await refreshTokenStatus();

            // Reset content after successful publish
            setGeneratedContent('');
            setImageData(null);
            setImageMode(null);
            setActiveStep(0);
        } catch (error) {
            console.error('Error publishing to LinkedIn:', error);
            setErrorMessage((error instanceof Error) ? error.message : 'An unknown error occurred while publishing');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle reset flow
    const handleReset = () => {
        setGeneratedContent('');
        setImageData(null);
        setImageMode(null);
        setActiveStep(0);
        setSuccessMessage('');
        setErrorMessage('');
    };

    // Render the content preview and publish step
    const renderContentPreview = () => (
        <Card sx={{ p: 3, mb: 4, borderRadius: 4, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <IconButton
                    onClick={handleBack}
                    sx={{ mr: 1, color: 'primary.main' }}
                    size="small"
                >
                    <ArrowBackIcon />
                </IconButton>
                Review & Publish
            </Typography>

            {/* Show image preview if available */}
            {imageData && imageMode && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        {imageMode === 'single' ? 'Image Preview:' : 'Carousel Images Preview:'}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {imageData.base64.map((base64, index) => (
                            <Box
                                key={index}
                                sx={{
                                    position: 'relative',
                                    width: { xs: 'calc(50% - 8px)', sm: imageMode === 'single' ? '40%' : 'calc(33.33% - 8px)', md: imageMode === 'single' ? '30%' : 'calc(25% - 8px)' },
                                    height: 120,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                            >
                                <Box
                                    component="img"
                                    src={`data:${imageData.mimeType};base64,${base64}`}
                                    alt={`Image ${index + 1}`}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                {imageMode === 'multi' && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            padding: '2px 8px'
                                        }}
                                    >
                                        {index + 1} / {imageData.base64.length}
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            <Box sx={{ mt: 2, mb: 3 }}>
                <TextField
                    label="LinkedIn Post Content"
                    variant="outlined"
                    multiline
                    rows={8}
                    fullWidth
                    value={generatedContent}
                    onChange={handleContentChange}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        }
                    }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color={getCharCountColor()}>
                        {charCount} / {MAX_CHARS} characters
                        {charCount > MAX_CHARS && ' (exceeds LinkedIn limit)'}
                    </Typography>

                    <Button
                        size="small"
                        variant="outlined"
                        onClick={handleRegenerateContent}
                        disabled={isRegenerating}
                        startIcon={isRegenerating ? <CircularProgress size={16} /> : <RefreshIcon />}
                    >
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                <Button
                    variant="outlined"
                    onClick={handleReset}
                    disabled={isProcessing}
                >
                    Start Over
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handlePublish}
                    disabled={isProcessing || charCount > MAX_CHARS}
                    startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <CheckCircleIcon />}
                >
                    {isProcessing ? 'Publishing...' : imageMode === 'multi'
                        ? 'Publish Carousel to LinkedIn'
                        : imageMode === 'single'
                            ? 'Publish with Image to LinkedIn'
                            : 'Publish to LinkedIn'}
                </Button>
            </Box>
        </Card>
    );

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 }, position: 'relative', zIndex: 10 }}>
            <GradientBackground />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" sx={{ textAlign: 'center', flex: 1 }}>
                    LinkedIn Post Generator
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/dashboard')}
                    startIcon={<ArrowBackIcon />}
                    size="small"
                >
                    Dashboard
                </Button>
            </Box>

            {/* Token Status Display */}
            {tokenStatus && (
                <Card sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.9)' }}>
                    <CardContent sx={{ py: 2 }}>
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TokenIcon color="primary" />
                                <Typography variant="body2" fontWeight={600}>
                                    Daily Tokens: {tokenStatus.tokens_remaining} / {tokenStatus.daily_tokens}
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                <Chip
                                    label={`Basic: ${TOKEN_COSTS.BASIC_POST} tokens`}
                                    color="success"
                                    size="small"
                                />
                                <Chip
                                    label={`Enhanced: ${TOKEN_COSTS.SINGLE_POST} tokens`}
                                    color="primary"
                                    size="small"
                                />
                                <Chip
                                    label={`Multi: ${TOKEN_COSTS.MULTIPLE_POST} tokens`}
                                    color="warning"
                                    size="small"
                                />
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {errorMessage && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {errorMessage}
                </Alert>
            )}

            {successMessage && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {successMessage}
                </Alert>
            )}

            {activeStep === 0 ? (
                linkedinConnected && mcpToken ? (
                    <PostAI
                        authToken={mcpToken}
                        userId={user?.id || ''}
                        onGeneratedContent={handleGeneratedContent}
                        onError={handleError}
                        onSuccess={handleSuccess}
                        onTokenExpired={handleTokenExpired}
                    />
                ) : (
                    <Card sx={{ p: 3, borderRadius: 4, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
                        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', color: 'warning.main' }}>
                            LinkedIn Connection Required
                        </Typography>
                        <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
                            Please connect your LinkedIn account to create and publish posts.
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => navigate('/dashboard')}
                            >
                                Go to Dashboard to Connect LinkedIn
                            </Button>
                        </Box>
                    </Card>
                )
            ) : (
                renderContentPreview()
            )}
        </Box>
    );
};

export default NewUnifiedPostCreator;