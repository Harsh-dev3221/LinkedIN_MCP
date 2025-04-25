import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    CircularProgress,
    Snackbar,
    Alert
} from '@mui/material';

interface PostEditorProps {
    generatedContent: string;
    onPublish: (content: string) => Promise<void>;
    onReset: () => void;
}

const PostEditor = ({
    generatedContent,
    onPublish,
    onReset
}: PostEditorProps) => {
    const [content, setContent] = useState(generatedContent);
    const [isPublishing, setIsPublishing] = useState(false);
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        type: 'success' as 'success' | 'error'
    });

    const handlePublish = async () => {
        if (!content.trim()) return;

        setIsPublishing(true);
        try {
            await onPublish(content);
            setNotification({
                open: true,
                message: 'Post published successfully to LinkedIn!',
                type: 'success'
            });
        } catch (error) {
            setNotification({
                open: true,
                message: 'Failed to publish post: ' + (error instanceof Error ? error.message : 'Unknown error'),
                type: 'error'
            });
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCloseNotification = () => {
        setNotification({
            ...notification,
            open: false
        });
    };

    return (
        <Box sx={{ mt: 4 }}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Generated LinkedIn Post
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Review and edit the generated content below:
                </Typography>

                <TextField
                    fullWidth
                    multiline
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 3 }}
                    disabled={isPublishing}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                        variant="outlined"
                        onClick={onReset}
                        disabled={isPublishing}
                    >
                        Start Over
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handlePublish}
                        disabled={!content.trim() || isPublishing}
                        startIcon={isPublishing ? <CircularProgress size={24} color="inherit" /> : null}
                    >
                        {isPublishing ? 'Publishing...' : 'Publish to LinkedIn'}
                    </Button>
                </Box>
            </Paper>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.type}
                    variant="filled"
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PostEditor; 