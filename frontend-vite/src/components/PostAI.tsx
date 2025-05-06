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
    Tab
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CollectionsIcon from '@mui/icons-material/Collections';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

// Create MCP client for API communication
const createMcpClient = (token: string) => {
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
                    }
                });

                if (response.data.isError) {
                    throw new Error(response.data.content[0].text);
                }

                return response.data;
            } catch (error: any) {
                console.error(`Error calling tool ${toolName}:`, error);
                // Check if it's an API error related to unknown tool
                if (error.response?.data?.error?.includes('Unknown tool')) {
                    throw new Error(`API tool not available: ${toolName}. Please check if the backend supports this operation.`);
                }
                throw error;
            }
        }
    };
};

interface PostAIProps {
    authToken: string;
    onGeneratedContent: (data: {
        content: string,
        imageData?: { base64: string[], mimeType: string },
        imageMode?: 'single' | 'multi'
    }) => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
}

const PostAI = ({ authToken, onGeneratedContent, onError, onSuccess }: PostAIProps) => {
    // State management
    const [postText, setPostText] = useState('');
    const [isImageEnabled, setIsImageEnabled] = useState(false);
    const [imageMode, setImageMode] = useState<'single' | 'multi'>('single');
    const [selectedImages, setSelectedImages] = useState<{ base64: string, mimeType: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Constants
    const MIN_IMAGES = 2;
    const MAX_IMAGES = 10;

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
            const mcpClient = createMcpClient(authToken);

            // Text-only post
            if (!isImageEnabled || selectedImages.length === 0) {
                const result = await mcpClient.callTool('create-post', {
                    userText: postText
                });
                onGeneratedContent({ content: result.content[0].text });
                onSuccess('Content generated successfully!');
            }
            // Single image post
            else if (imageMode === 'single' && selectedImages.length > 0) {
                const imageData = selectedImages[0];
                const base64Data = imageData.base64.split(',')[1] || imageData.base64;

                const result = await mcpClient.callTool('analyze-image-structured-post', {
                    imageBase64: base64Data,
                    userText: postText,
                    mimeType: imageData.mimeType
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
                onSuccess('Content generated with image analysis!');
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
                const result = await mcpClient.callTool('analyze-image-structured-post', {
                    imageBase64: firstImageData,
                    userText: `Create an engaging, professional LinkedIn carousel post that will accompany ${selectedImages.length} images.

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
                    mimeType: selectedImages[0].mimeType
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
            console.error('Error processing content:', error);
            onError((error instanceof Error) ? error.message : 'An unknown error occurred');
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
                PostAI - Smart LinkedIn Content Creator
            </Typography>

            <Box sx={{ mb: 4 }}>
                <TextField
                    fullWidth
                    label="Your LinkedIn Post Draft"
                    placeholder="Write your LinkedIn post draft here. Our AI will enhance it with engaging content and formatting."
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