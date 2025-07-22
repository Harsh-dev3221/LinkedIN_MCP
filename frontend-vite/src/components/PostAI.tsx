import { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    Switch,
    FormControlLabel,
    CircularProgress,
    Card,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CollectionsIcon from '@mui/icons-material/Collections';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import TimelineIcon from '@mui/icons-material/Timeline';
import CodeIcon from '@mui/icons-material/Code';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import LinkScrapingIndicator from './LinkScrapingIndicator';

// Create MCP client for API communication
const createMcpClient = (token: string, onTokenExpired?: () => void) => {
    return {
        callTool: async (toolName: string, params: any) => {
            try {
                // Use longer timeout for image processing tools
                const isImageTool = toolName.includes('image') || toolName.includes('analyze');
                const timeout = isImageTool ? 60000 : 30000; // 60 seconds for image tools, 30 for others

                console.log(`🔧 Calling tool: ${toolName} with timeout: ${timeout}ms`);
                console.log(`📊 Request params:`, { ...params, imageBase64: params.imageBase64 ? '[IMAGE_DATA]' : undefined });

                const response = await axios.post(`${import.meta.env.VITE_MCP_SERVER_URL}/mcp`, {
                    type: "call-tool",
                    tool: toolName,
                    params
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout
                });

                console.log(`✅ Tool response received:`, {
                    tool: toolName,
                    isError: response.data.isError,
                    hasContent: !!response.data.content,
                    contentLength: response.data.content?.[0]?.text?.length,
                    enhanced: response.data.enhanced,
                    processingTime: response.data.processingTime
                });

                if (response.data.isError) {
                    console.error(`❌ Tool error:`, response.data.content[0].text);
                    throw new Error(response.data.content[0].text);
                }

                // Validate response structure
                if (!response.data.content || !response.data.content[0] || !response.data.content[0].text) {
                    console.error(`❌ Invalid response structure:`, response.data);
                    throw new Error('Invalid response structure from server');
                }

                return response.data;
            } catch (error: any) {
                console.error(`❌ Tool call failed for ${toolName}:`, {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    data: error.response?.data
                });

                // Handle authentication errors
                if (error.response?.status === 401 || error.response?.status === 403) {
                    if (onTokenExpired) {
                        onTokenExpired();
                    }
                    throw new Error('LinkedIn connection expired. Please reconnect your LinkedIn account.');
                }

                // Check if it's an API error related to unknown tool
                if (error.response?.data?.error?.includes('Unknown tool')) {
                    throw new Error(`API tool not available: ${toolName}. Please check if the backend supports this operation.`);
                }

                // Handle timeout errors specifically
                if (error.code === 'ECONNABORTED') {
                    throw new Error(`Request timeout. ${toolName.includes('image') ? 'Image processing is taking longer than expected. Please try with a smaller image or simpler content.' : 'Please try again.'}`);
                }

                // Handle network errors
                if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    throw new Error('Network error. Please check your connection and try again.');
                }

                // Handle server errors with more detail
                if (error.response?.status >= 500) {
                    throw new Error(`Server error (${error.response.status}): ${error.response?.data?.message || error.message}`);
                }

                // Handle client errors with more detail
                if (error.response?.status >= 400) {
                    throw new Error(`Request error (${error.response.status}): ${error.response?.data?.message || error.message}`);
                }

                throw error;
            }
        }
    };
};

interface PostAIProps {
    authToken: string;
    userId: string;
    onGeneratedContent: (data: {
        content: string,
        imageData?: { base64: string[], mimeType: string },
        imageMode?: 'single' | 'multi'
    }) => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
    onTokenExpired?: () => void;
}

const PostAI = ({ authToken, userId, onGeneratedContent, onError, onSuccess, onTokenExpired }: PostAIProps) => {
    // State management
    const [postText, setPostText] = useState('');
    const [isImageEnabled, setIsImageEnabled] = useState(false);
    const [imageMode, setImageMode] = useState<'single' | 'multi'>('single');
    const [selectedImages, setSelectedImages] = useState<{ base64: string, mimeType: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [storyType, setStoryType] = useState<'journey' | 'technical' | 'achievement' | 'learning'>('journey');
    const [useIntelligentClassification, setUseIntelligentClassification] = useState(true);
    const [detectedLinks, setDetectedLinks] = useState<any[]>([]);

    // Constants
    const MIN_IMAGES = 2;
    const MAX_IMAGES = 10;

    // Story type configurations
    const storyTypes = [
        {
            value: 'journey',
            label: 'Journey Story',
            icon: <TimelineIcon />,
            description: 'Personal/professional journey with challenges and growth',
            example: 'From learning MCP to launching PostWizz...'
        },
        {
            value: 'technical',
            label: 'Technical Showcase',
            icon: <CodeIcon />,
            description: 'Technical achievements, projects, and implementations',
            example: 'Built a custom MCP server with React 19...'
        },
        {
            value: 'achievement',
            label: 'Achievement Post',
            icon: <EmojiEventsIcon />,
            description: 'Celebrating milestones, launches, and successes',
            example: 'Just launched PostWizz after 6 months...'
        },
        {
            value: 'learning',
            label: 'Learning Story',
            icon: <SchoolIcon />,
            description: 'Educational content with personal insights',
            example: 'What I learned building an AI assistant...'
        }
    ] as const;

    // Handle image drop/selection
    const onDrop = (acceptedFiles: File[]) => {
        if (selectedImages.length >= MAX_IMAGES && imageMode === 'multi') {
            onError(`Maximum ${MAX_IMAGES} images allowed`);
            return;
        }

        // For single image mode, replace the existing image
        if (imageMode === 'single') {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                setSelectedImages([{ base64, mimeType: file.type }]);
            };
            reader.readAsDataURL(file);
            return;
        }

        // For multi-image mode, add images up to the limit
        const filesToProcess = acceptedFiles.slice(0, MAX_IMAGES - selectedImages.length);
        filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                setSelectedImages(prev => [...prev, { base64, mimeType: file.type }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif']
        },
        disabled: isProcessing || (imageMode === 'multi' && selectedImages.length >= MAX_IMAGES)
    });

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleImageModeChange = (_event: React.SyntheticEvent, newMode: 'single' | 'multi') => {
        setImageMode(newMode);
        setSelectedImages([]); // Clear images when changing modes
    };

    // Handle toggle change
    const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsImageEnabled(event.target.checked);
        if (!event.target.checked) {
            setSelectedImages([]);
        }
    };

    // Process the post content
    const handleEnhanceAndPreview = async () => {
        if (!authToken) {
            onError('No authentication token found. Please reconnect your LinkedIn account.');
            return;
        }

        setIsProcessing(true);
        try {
            const mcpClient = createMcpClient(authToken, onTokenExpired);

            // Text-only post with intelligent or manual classification
            if (!isImageEnabled || selectedImages.length === 0) {
                if (useIntelligentClassification) {
                    try {
                        // Check if there are detected links for enhanced generation
                        if (detectedLinks.length > 0) {
                            // Use intelligent content generation with link scraping
                            const result = await mcpClient.callTool('intelligent-content-with-links', {
                                content: postText,
                                userId: userId,
                                userContext: {
                                    name: userId, // Will be enhanced with actual user data
                                    role: undefined, // Could be collected from user profile
                                    industry: undefined, // Could be inferred from LinkedIn data
                                    previousPosts: [] // Could be stored for learning
                                }
                            });
                            onGeneratedContent({ content: result.content[0].text });
                            onSuccess('🔗 Enhanced content generated with scraped insights!');
                        } else {
                            // Use standard intelligent AI classification and generation
                            const result = await mcpClient.callTool('generate-intelligent-content', {
                                content: postText,
                                userId: userId,
                                userContext: {
                                    name: userId, // Will be enhanced with actual user data
                                    role: undefined, // Could be collected from user profile
                                    industry: undefined, // Could be inferred from LinkedIn data
                                    previousPosts: [] // Could be stored for learning
                                }
                            });
                            onGeneratedContent({ content: result.content[0].text });
                            onSuccess('🧠 Intelligent content generated successfully!');
                        }
                    } catch (error) {
                        // Intelligent generation failed, falling back to manual story type
                        // Fallback to manual story type selection
                        const result = await mcpClient.callTool('create-post', {
                            content: postText,
                            userId: userId,
                            storyType: storyType
                        });
                        onGeneratedContent({ content: result.content[0].text });
                        onSuccess('Content generated successfully (fallback)!');
                    }
                } else {
                    // Use manual story type selection
                    const result = await mcpClient.callTool('create-post', {
                        content: postText,
                        userId: userId,
                        storyType: storyType
                    });
                    onGeneratedContent({ content: result.content[0].text });
                    onSuccess(`${storyTypes.find(t => t.value === storyType)?.label} story generated successfully!`);
                }
            }
            // Single image post
            else if (imageMode === 'single' && selectedImages.length > 0) {
                const imageData = selectedImages[0];
                const base64Data = imageData.base64.split(',')[1] || imageData.base64;

                console.log(`🖼️ Starting single image analysis...`);
                console.log(`📊 Image info:`, {
                    mimeType: imageData.mimeType,
                    sizeKB: Math.round(base64Data.length * 0.75 / 1024),
                    promptLength: postText.length
                });

                const result = await mcpClient.callTool('analyze-image-create-post', {
                    imageBase64: base64Data,
                    prompt: postText,
                    mimeType: imageData.mimeType,
                    userId: userId
                });

                console.log(`✅ Image analysis completed:`, {
                    contentLength: result.content[0].text.length,
                    enhanced: result.enhanced,
                    processingTime: result.processingTime
                });

                // Provide both the content and image data to the parent
                onGeneratedContent({
                    content: result.content[0].text,
                    imageData: {
                        base64: [base64Data],
                        mimeType: imageData.mimeType
                    },
                    imageMode: 'single'
                });
                onSuccess(`Content generated with image analysis! ${result.enhanced ? '(Enhanced with link insights)' : ''}`);
            }
            // Multi-image post (carousel)
            else if (imageMode === 'multi' && selectedImages.length >= MIN_IMAGES) {
                // Extract base64 data from the image objects
                const imageBase64s = selectedImages.map(img => {
                    const base64Data = img.base64.split(',')[1] || img.base64;
                    return base64Data;
                });

                // Use the first image for analysis to generate optimized carousel post
                const firstImageData = imageBase64s[0];
                const result = await mcpClient.callTool('analyze-image-create-post', {
                    imageBase64: firstImageData,
                    prompt: `Create an engaging, professional LinkedIn carousel post that will accompany ${selectedImages.length} images.

IMPORTANT FORMATTING GUIDELINES:
1. Use LinkedIn's supported formatting:
   - Use asterisks for *bold text*
   - Use line breaks strategically for readability
   - Include 3-5 relevant emojis placed naturally
   - Create short paragraphs (2-3 sentences maximum)

2. Structure:
   - Start with an attention-grabbing first line
   - Include a clear value proposition
   - Add numbered points or bullet points if appropriate
   - End with a clear call-to-action and question to drive engagement
   - Include 3-5 trending hashtags at the end

3. Content length: 800-1200 characters for optimal engagement

My draft text to enhance: "${postText}"`,
                    mimeType: selectedImages[0].mimeType,
                    userId: userId
                });

                // Provide both the content and all image data to the parent
                onGeneratedContent({
                    content: result.content[0].text,
                    imageData: {
                        base64: imageBase64s,
                        mimeType: selectedImages[0].mimeType
                    },
                    imageMode: 'multi'
                });
                onSuccess('Carousel post content generated!');
            } else {
                onError(`Please select at least ${MIN_IMAGES} images for a carousel post.`);
            }
        } catch (error) {
            console.error(`❌ Content generation failed:`, error);
            const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred';
            console.error(`❌ Error details:`, {
                message: errorMessage,
                imageMode,
                selectedImagesCount: selectedImages.length,
                postTextLength: postText.length
            });
            onError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card
            sx={{
                p: 3,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                mb: 4
            }}
        >
            <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                <AutoAwesomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                PostWizz - Smart LinkedIn Content Creator
            </Typography>

            <Box sx={{ mb: 4 }}>
                {/* AI Classification Toggle */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(76, 175, 80, 0.05)', borderRadius: 2, border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={useIntelligentClassification}
                                onChange={(e) => setUseIntelligentClassification(e.target.checked)}
                                disabled={isProcessing}
                                color="primary"
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    🧠 Intelligent AI Classification
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    {useIntelligentClassification
                                        ? 'AI will automatically detect the best story type for your content'
                                        : 'Manually select the story type below'
                                    }
                                </Typography>
                            </Box>
                        }
                    />
                </Box>

                {/* Story Type Selector - Only show when manual classification is enabled */}
                {!useIntelligentClassification && (
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel id="story-type-label">Story Type</InputLabel>
                        <Select
                            labelId="story-type-label"
                            value={storyType}
                            label="Story Type"
                            onChange={(e) => setStoryType(e.target.value as typeof storyType)}
                            disabled={isProcessing}
                            sx={{
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            }}
                        >
                            {storyTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {type.icon}
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                {type.label}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                {type.description}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* Story Type Example - Only show when manual classification is enabled */}
                {!useIntelligentClassification && (
                    <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 138, 0, 0.05)', borderRadius: 2, border: '1px solid rgba(255, 138, 0, 0.2)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                            Example for {storyTypes.find(t => t.value === storyType)?.label}:
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                            "{storyTypes.find(t => t.value === storyType)?.example}"
                        </Typography>
                    </Box>
                )}

                <TextField
                    fullWidth
                    label="Your LinkedIn Post Draft"
                    placeholder={useIntelligentClassification
                        ? "Write your content here. Our AI will automatically detect the best story type and enhance it with engaging formatting."
                        : `Write your ${storyTypes.find(t => t.value === storyType)?.label.toLowerCase()} here. Our AI will enhance it with engaging content and formatting.`
                    }
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    multiline
                    rows={4}
                    variant="outlined"
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        }
                    }}
                    disabled={isProcessing}
                    InputProps={{
                        startAdornment: (
                            <FormatQuoteIcon color="primary" sx={{ mr: 1, verticalAlign: 'top', mt: 1 }} />
                        ),
                    }}
                    required
                />

                {/* Link Scraping Indicator */}
                <LinkScrapingIndicator
                    text={postText}
                    onLinksDetected={setDetectedLinks}
                    isProcessing={isProcessing}
                />

                <FormControlLabel
                    control={
                        <Switch
                            checked={isImageEnabled}
                            onChange={handleToggleChange}
                            disabled={isProcessing}
                            color="primary"
                        />
                    }
                    label="Post with Image"
                    sx={{ mb: 2 }}
                />

                {isImageEnabled && (
                    <Box sx={{ width: '100%', mb: 3 }}>
                        <Tabs
                            value={imageMode}
                            onChange={handleImageModeChange}
                            centered
                            sx={{
                                mb: 2,
                                '& .MuiTabs-indicator': {
                                    backgroundColor: '#ff8a00',
                                },
                                '& .Mui-selected': {
                                    color: '#ff8a00 !important',
                                },
                            }}
                        >
                            <Tab
                                icon={<ImageIcon />}
                                label="Single Image"
                                value="single"
                                disabled={isProcessing}
                                sx={{
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    fontSize: '0.9rem',
                                }}
                            />
                            <Tab
                                icon={<CollectionsIcon />}
                                label="Multi-Image"
                                value="multi"
                                disabled={isProcessing}
                                sx={{
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    fontSize: '0.9rem',
                                }}
                            />
                        </Tabs>

                        <Paper
                            {...getRootProps()}
                            sx={{
                                p: 3,
                                mb: 2,
                                textAlign: 'center',
                                borderRadius: 3,
                                cursor: 'pointer',
                                border: isDragActive
                                    ? '2px dashed #ff8a00'
                                    : '2px dashed #ccc',
                                backgroundColor: isDragActive
                                    ? 'rgba(255, 138, 0, 0.05)'
                                    : 'rgba(255, 255, 255, 0.8)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: '#ff8a00',
                                    backgroundColor: 'rgba(255, 138, 0, 0.05)',
                                },
                                opacity: isProcessing || (imageMode === 'multi' && selectedImages.length >= MAX_IMAGES) ? 0.7 : 1,
                            }}
                        >
                            <input {...getInputProps()} />

                            <Box>
                                <CloudUploadIcon
                                    sx={{
                                        fontSize: 50,
                                        color: isDragActive
                                            ? '#ff8a00'
                                            : (imageMode === 'multi' && selectedImages.length >= MAX_IMAGES)
                                                ? '#ccc'
                                                : '#aaa',
                                        mb: 2
                                    }}
                                />
                                <Typography variant="body1" gutterBottom>
                                    {isDragActive
                                        ? 'Drop your images here'
                                        : (imageMode === 'multi' && selectedImages.length >= MAX_IMAGES)
                                            ? 'Maximum number of images reached'
                                            : imageMode === 'single'
                                                ? 'Drag and drop your image here'
                                                : 'Drag and drop multiple images here'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {imageMode === 'multi'
                                        ? `${selectedImages.length}/${MAX_IMAGES} images (min ${MIN_IMAGES} required)`
                                        : 'or click to select file'}
                                </Typography>
                            </Box>
                        </Paper>

                        {selectedImages.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                                {selectedImages.map((img, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            position: 'relative',
                                            width: { xs: 'calc(50% - 8px)', sm: imageMode === 'single' ? '100%' : 'calc(33.33% - 8px)', md: imageMode === 'single' ? '100%' : 'calc(25% - 8px)' },
                                            height: imageMode === 'single' ? 200 : 120,
                                            borderRadius: 2,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={img.base64}
                                            alt={`Image ${index + 1}`}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                transition: 'transform 0.2s',
                                                '&:hover': {
                                                    transform: 'scale(1.05)'
                                                }
                                            }}
                                        />
                                        <Button
                                            size="small"
                                            variant="contained"
                                            sx={{
                                                position: 'absolute',
                                                top: 5,
                                                right: 5,
                                                minWidth: 'auto',
                                                p: '4px',
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255,0,0,0.7)',
                                                },
                                            }}
                                            onClick={() => removeImage(index)}
                                            disabled={isProcessing}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </Button>
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
                                                {index + 1} / {selectedImages.length}
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={isProcessing || !postText || (isImageEnabled && imageMode === 'multi' && selectedImages.length < MIN_IMAGES)}
                        sx={{ py: 1.5, px: 4, borderRadius: 3 }}
                        startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <AutoAwesomeIcon />}
                        onClick={handleEnhanceAndPreview}
                    >
                        {isProcessing ? 'Processing...' : 'Enhance & Preview'}
                    </Button>
                </Box>
            </Box>
        </Card>
    );
};

export default PostAI;