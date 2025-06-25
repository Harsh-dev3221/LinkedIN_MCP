import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Divider,
    Grid
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ThumbUp as ThumbUpIcon,
    Comment as CommentIcon,
    Share as ShareIcon,
    Public as PublicIcon,
    People as PeopleIcon,
    Lock as LockIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import LinkedInPostService, { LinkedInPost } from '../../services/LinkedInPostService';

// Types

interface PostManagementProps {
    onPostUpdated?: () => void;
    onPostDeleted?: () => void;
}

// Service instance
let postService: LinkedInPostService | null = null;

const PostManagementDashboard: React.FC<PostManagementProps> = ({
    onPostUpdated,
    onPostDeleted
}) => {
    const { mcpToken } = useAuth();
    const [posts, setPosts] = useState<LinkedInPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<LinkedInPost | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS'>('PUBLIC');
    const [editLoading, setEditLoading] = useState(false);

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingPost, setDeletingPost] = useState<LinkedInPost | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Initialize service and load posts
    useEffect(() => {
        if (mcpToken) {
            postService = new LinkedInPostService(mcpToken);
            loadUserPosts();
        }
    }, [mcpToken]);

    const loadUserPosts = async () => {
        if (!postService) return;

        try {
            setLoading(true);
            const response = await postService.getUserPosts();
            setPosts(response.posts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditPost = (post: LinkedInPost) => {
        console.log('📝 Frontend: Opening edit dialog for post');
        console.log('📝 Frontend: Post commentary length:', post.commentary?.length || 0);
        console.log('📝 Frontend: Post commentary preview:', post.commentary?.substring(0, 100) + '...');
        console.log('📝 Frontend: Full post commentary:', post.commentary);

        setEditingPost(post);
        setEditContent(post.commentary);
        setEditVisibility(post.visibility);
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingPost || !postService) return;

        try {
            setEditLoading(true);

            const result = await postService.updatePost({
                postUrn: editingPost.id,
                commentary: editContent,
                visibility: editVisibility
            });

            if (result.success) {
                // Update local state
                setPosts(prev => prev.map(post =>
                    post.id === editingPost.id
                        ? {
                            ...post,
                            commentary: editContent,
                            visibility: editVisibility,
                            updatedAt: new Date().toISOString(),
                            lifecycleState: 'PUBLISHED_EDITED' as const
                        }
                        : post
                ));

                setEditDialogOpen(false);
                onPostUpdated?.();
            } else {
                throw new Error(result.error || 'Failed to update post');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeletePost = (post: LinkedInPost) => {
        setDeletingPost(post);
        setDeleteDialogOpen(true);
    };

    const confirmDeletePost = async () => {
        if (!deletingPost || !postService) return;

        try {
            setDeleteLoading(true);

            const result = await postService.deletePost({
                postUrn: deletingPost.id
            });

            if (result.success) {
                // Remove from local state
                setPosts(prev => prev.filter(post => post.id !== deletingPost.id));
                setDeleteDialogOpen(false);
                onPostDeleted?.();
            } else {
                throw new Error(result.error || 'Failed to delete post');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'PUBLIC': return <PublicIcon fontSize="small" />;
            case 'CONNECTIONS': return <PeopleIcon fontSize="small" />;
            case 'LOGGED_IN_MEMBERS': return <LockIcon fontSize="small" />;
            default: return <PublicIcon fontSize="small" />;
        }
    };

    const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
            case 'PUBLIC': return 'success';
            case 'CONNECTIONS': return 'primary';
            case 'LOGGED_IN_MEMBERS': return 'warning';
            default: return 'default';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                📝 Post Management
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {posts.map((post) => (
                    <Grid key={post.id} sx={{ width: '100%' }}>
                        <Card elevation={2}>
                            <CardContent>
                                {/* Post Header */}
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Chip
                                            icon={getVisibilityIcon(post.visibility)}
                                            label={post.visibility}
                                            color={getVisibilityColor(post.visibility) as any}
                                            size="small"
                                        />
                                        {post.lifecycleState === 'PUBLISHED_EDITED' && (
                                            <Chip label="Edited" color="info" size="small" />
                                        )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDate(post.createdAt)}
                                        {post.updatedAt && (
                                            <> • Edited {formatDate(post.updatedAt)}</>
                                        )}
                                    </Typography>
                                </Box>

                                {/* Post Content */}
                                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                    {post.commentary}
                                </Typography>

                                {/* Engagement Stats */}
                                {post.engagement && (
                                    <Box display="flex" gap={3} mb={2}>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <ThumbUpIcon fontSize="small" color="primary" />
                                            <Typography variant="body2">{post.engagement.likes}</Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <CommentIcon fontSize="small" color="primary" />
                                            <Typography variant="body2">{post.engagement.comments}</Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <ShareIcon fontSize="small" color="primary" />
                                            <Typography variant="body2">{post.engagement.shares}</Typography>
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>

                            <Divider />

                            <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                                <Box>
                                    <Button
                                        startIcon={<EditIcon />}
                                        onClick={() => handleEditPost(post)}
                                        size="small"
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        startIcon={<DeleteIcon />}
                                        onClick={() => handleDeletePost(post)}
                                        color="error"
                                        size="small"
                                    >
                                        Delete
                                    </Button>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                    ID: {post.id.split(':').pop()?.substring(0, 8)}...
                                </Typography>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {posts.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No posts found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Your published LinkedIn posts will appear here for management.
                    </Typography>
                </Paper>
            )}

            {/* Edit Post Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Edit LinkedIn Post</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Post Content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        sx={{ mb: 3, mt: 1 }}
                        inputProps={{ maxLength: 3000 }}
                        helperText={`${editContent.length}/3000 characters`}
                    />

                    <FormControl fullWidth>
                        <InputLabel>Visibility</InputLabel>
                        <Select
                            value={editVisibility}
                            onChange={(e) => setEditVisibility(e.target.value as any)}
                            label="Visibility"
                        >
                            <MenuItem value="PUBLIC">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <PublicIcon fontSize="small" />
                                    Public - Anyone on LinkedIn
                                </Box>
                            </MenuItem>
                            <MenuItem value="CONNECTIONS">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <PeopleIcon fontSize="small" />
                                    Connections - Your connections only
                                </Box>
                            </MenuItem>
                            <MenuItem value="LOGGED_IN_MEMBERS">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <LockIcon fontSize="small" />
                                    Logged-in members - All LinkedIn members
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSaveEdit}
                        variant="contained"
                        disabled={editLoading || !editContent.trim()}
                    >
                        {editLoading ? <CircularProgress size={20} /> : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Post</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this post? This action cannot be undone.
                    </Typography>
                    {deletingPost && (
                        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                "{deletingPost.commentary.substring(0, 100)}
                                {deletingPost.commentary.length > 100 ? '...' : ''}"
                            </Typography>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={confirmDeletePost}
                        color="error"
                        variant="contained"
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? <CircularProgress size={20} /> : 'Delete Post'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PostManagementDashboard;
