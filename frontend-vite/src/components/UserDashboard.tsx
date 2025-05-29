import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Avatar,
    Chip,
    LinearProgress,
    Stack,
    IconButton,
    Tooltip
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import TokenIcon from '@mui/icons-material/Token';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LinkIcon from '@mui/icons-material/Link';
import { useAuth } from '../contexts/AuthContext';

interface UserDashboardProps {
    onCreatePost: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ onCreatePost }) => {
    const { user, tokenStatus, linkedinConnected, connectLinkedIn, signOut, refreshTokenStatus, refreshLinkedInStatus } = useAuth();
    const [isRefreshingLinkedIn, setIsRefreshingLinkedIn] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleRefreshTokens = async () => {
        try {
            await refreshTokenStatus();
        } catch (error) {
            console.error('Error refreshing tokens:', error);
        }
    };

    const handleRefreshLinkedIn = async () => {
        try {
            setIsRefreshingLinkedIn(true);
            await refreshLinkedInStatus();
        } catch (error) {
            console.error('Error refreshing LinkedIn status:', error);
        } finally {
            setIsRefreshingLinkedIn(false);
        }
    };

    const getTokenProgressColor = () => {
        if (!tokenStatus) return 'primary';
        const percentage = (tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100;
        if (percentage > 50) return 'success';
        if (percentage > 20) return 'warning';
        return 'error';
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'google':
                return '#4285f4';
            case 'linkedin':
                return '#0077b5';
            default:
                return '#666';
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            {/* User Profile Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                src={user?.avatar_url}
                                sx={{ width: 60, height: 60 }}
                            >
                                {user?.name?.charAt(0) || user?.email?.charAt(0)}
                            </Avatar>
                            <Box>
                                <Typography variant="h6">
                                    {user?.name || 'User'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {user?.email}
                                </Typography>
                                <Chip
                                    label={user?.provider}
                                    size="small"
                                    sx={{
                                        mt: 0.5,
                                        backgroundColor: getProviderColor(user?.provider || ''),
                                        color: 'white',
                                        textTransform: 'capitalize'
                                    }}
                                />
                            </Box>
                        </Box>
                        <IconButton onClick={handleSignOut} color="error">
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                </CardContent>
            </Card>

            {/* Token Status Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TokenIcon color="primary" />
                            <Typography variant="h6">Daily Tokens</Typography>
                        </Box>
                        <Tooltip title="Refresh token status">
                            <IconButton onClick={handleRefreshTokens} size="small">
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {tokenStatus ? (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Remaining: {tokenStatus.tokens_remaining} / {tokenStatus.daily_tokens}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Used: {tokenStatus.tokens_used_today}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={(tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100}
                                color={getTokenProgressColor()}
                                sx={{ height: 8, borderRadius: 4, mb: 2 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Tokens refresh daily at midnight UTC
                            </Typography>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Loading token status...
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Token Usage Guide */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Token Usage Guide
                    </Typography>
                    <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">Basic Post Generation</Typography>
                            <Chip label="FREE" color="success" size="small" />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">AI-Enhanced Single Post</Typography>
                            <Chip label="5 tokens" color="primary" size="small" />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">Multi-Image Post Generation</Typography>
                            <Chip label="10 tokens" color="warning" size="small" />
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {/* LinkedIn Connection Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkedInIcon sx={{ color: '#0077b5' }} />
                            <Typography variant="h6">LinkedIn Connection</Typography>
                        </Box>
                        <Tooltip title="Refresh LinkedIn connection status">
                            <IconButton
                                onClick={handleRefreshLinkedIn}
                                size="small"
                                disabled={isRefreshingLinkedIn}
                            >
                                <RefreshIcon sx={{
                                    animation: isRefreshingLinkedIn ? 'spin 1s linear infinite' : 'none',
                                    '@keyframes spin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' }
                                    }
                                }} />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {linkedinConnected ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                label="Connected"
                                color="success"
                                icon={<LinkIcon />}
                                size="small"
                            />
                            <Typography variant="body2" color="text.secondary">
                                Ready to post to LinkedIn
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Connect your LinkedIn account to start posting
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={connectLinkedIn}
                                startIcon={<LinkedInIcon />}
                                sx={{
                                    borderColor: '#0077b5',
                                    color: '#0077b5',
                                    '&:hover': {
                                        borderColor: '#005885',
                                        backgroundColor: 'rgba(0, 119, 181, 0.04)',
                                    },
                                }}
                            >
                                Connect LinkedIn
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Create Post Button */}
            <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={onCreatePost}
                disabled={!linkedinConnected}
                sx={{
                    py: 2,
                    fontSize: '1.1rem',
                    borderRadius: 3,
                }}
            >
                {linkedinConnected ? 'Create LinkedIn Post' : 'Connect LinkedIn to Create Posts'}
            </Button>
        </Box>
    );
};

export default UserDashboard;
