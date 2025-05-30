import React, { useState, useEffect } from 'react';
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
    Tooltip,
    Container,
    Grid,
    Paper,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import TokenIcon from '@mui/icons-material/Token';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LinkIcon from '@mui/icons-material/Link';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../contexts/AuthContext';

interface UserDashboardProps {
    onCreatePost: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ onCreatePost }) => {
    const { user, tokenStatus, linkedinConnected, connectLinkedIn, signOut, refreshTokenStatus, refreshLinkedInStatus } = useAuth();
    const [isRefreshingLinkedIn, setIsRefreshingLinkedIn] = useState(false);

    // Force refresh LinkedIn status when component mounts to ensure accurate state
    useEffect(() => {
        console.log('🔄 UserDashboard mounted, refreshing LinkedIn status...');
        refreshLinkedInStatus();
    }, [refreshLinkedInStatus]);

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
                return '#0A66C2';
            default:
                return '#6B6B6B';
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            py: 4,
            background: 'transparent',
        }}>
            <Container maxWidth="lg">
                {/* Welcome Header */}
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography variant="h2" component="h1" gutterBottom sx={{
                        background: 'linear-gradient(135deg, #0A66C2 0%, #F5A623 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        mb: 1,
                    }}>
                        Welcome back, {user?.name?.split(' ')[0] || 'Creator'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                        Ready to create engaging LinkedIn content?
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {/* User Profile Card */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ height: 'fit-content' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar
                                            src={user?.avatar_url}
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                border: '3px solid',
                                                borderColor: 'primary.main',
                                            }}
                                        >
                                            {user?.name?.charAt(0) || user?.email?.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                {user?.name || 'User'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {user?.email}
                                            </Typography>
                                            <Chip
                                                label={user?.provider}
                                                size="small"
                                                sx={{
                                                    backgroundColor: getProviderColor(user?.provider || ''),
                                                    color: 'white',
                                                    textTransform: 'capitalize',
                                                    fontWeight: 500,
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                    <Tooltip title="Sign out">
                                        <IconButton
                                            onClick={handleSignOut}
                                            sx={{
                                                color: 'error.main',
                                                '&:hover': { backgroundColor: 'error.light', color: 'white' }
                                            }}
                                        >
                                            <LogoutIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Token Status Card */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                        }}>
                                            <TokenIcon />
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            Daily Tokens
                                        </Typography>
                                    </Box>
                                    <Tooltip title="Refresh token status">
                                        <IconButton onClick={handleRefreshTokens} size="small">
                                            <RefreshIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                {tokenStatus ? (
                                    <>
                                        <Grid container spacing={3} sx={{ mb: 3 }}>
                                            <Grid size={4}>
                                                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.50' }}>
                                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                        {tokenStatus.tokens_remaining}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Remaining
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={4}>
                                                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.50' }}>
                                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                                        {tokenStatus.tokens_used_today}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Used Today
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={4}>
                                                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.50' }}>
                                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                        {tokenStatus.daily_tokens}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Daily Limit
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        </Grid>

                                        <LinearProgress
                                            variant="determinate"
                                            value={(tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100}
                                            color={getTokenProgressColor()}
                                            sx={{ height: 12, borderRadius: 6, mb: 2 }}
                                        />
                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
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
                    </Grid>

                    {/* Token Usage Guide */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                    <Box sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        backgroundColor: 'secondary.main',
                                        color: 'white',
                                    }}>
                                        <TrendingUpIcon />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Token Usage Guide
                                    </Typography>
                                </Box>
                                <Stack spacing={2}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Basic Post Generation</Typography>
                                        <Chip label="FREE" color="success" size="small" sx={{ fontWeight: 600 }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>AI-Enhanced Single Post</Typography>
                                        <Chip label="5 tokens" color="primary" size="small" sx={{ fontWeight: 600 }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Multi-Image Post Generation</Typography>
                                        <Chip label="10 tokens" color="warning" size="small" sx={{ fontWeight: 600 }} />
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* LinkedIn Connection Card */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            backgroundColor: '#0A66C2',
                                            color: 'white',
                                        }}>
                                            <LinkedInIcon />
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            LinkedIn Connection
                                        </Typography>
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
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                        <Box sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            p: 2,
                                            backgroundColor: 'success.light',
                                            borderRadius: 2,
                                            mb: 2,
                                        }}>
                                            <LinkIcon sx={{ color: 'success.main' }} />
                                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                                                Connected & Ready
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            Your LinkedIn account is connected and ready for posting
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                            Connect your LinkedIn account to start creating and publishing posts
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            onClick={connectLinkedIn}
                                            startIcon={<LinkedInIcon />}
                                            sx={{
                                                borderColor: '#0A66C2',
                                                color: '#0A66C2',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    borderColor: '#004182',
                                                    backgroundColor: 'rgba(10, 102, 194, 0.04)',
                                                },
                                            }}
                                        >
                                            Connect LinkedIn
                                        </Button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Create Post Button */}
                    <Grid size={12}>
                        <Card sx={{
                            background: linkedinConnected
                                ? 'linear-gradient(135deg, #0A66C2 0%, #378FE9 100%)'
                                : 'linear-gradient(135deg, #D4C4B0 0%, #B8A082 100%)',
                            color: 'white',
                            textAlign: 'center',
                        }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                                    <AutoAwesomeIcon sx={{ fontSize: 32 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                        {linkedinConnected ? 'Ready to Create Amazing Content?' : 'Connect LinkedIn to Get Started'}
                                    </Typography>
                                </Box>
                                <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                                    {linkedinConnected
                                        ? 'Transform your ideas into engaging LinkedIn posts with AI-powered assistance'
                                        : 'Connect your LinkedIn account to unlock the full potential of AI-powered content creation'
                                    }
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={onCreatePost}
                                    disabled={!linkedinConnected}
                                    sx={{
                                        py: 2,
                                        px: 4,
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        borderRadius: 3,
                                        backgroundColor: linkedinConnected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        border: '2px solid rgba(255, 255, 255, 0.3)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            transform: 'translateY(-2px)',
                                        },
                                        '&:disabled': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                        },
                                    }}
                                >
                                    {linkedinConnected ? 'Create LinkedIn Post' : 'Connect LinkedIn First'}
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default UserDashboard;
