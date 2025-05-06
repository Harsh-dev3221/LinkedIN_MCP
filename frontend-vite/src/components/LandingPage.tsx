import React from 'react';
import { Box, Container, Typography, Button, Card, CardContent, useTheme, useMediaQuery } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Logo from './Logo';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const features = [
        {
            icon: <AutoAwesomeIcon fontSize="large" />,
            title: 'AI-Powered Analysis',
            description: 'Our smart technology analyzes your images to extract key themes and insights.'
        },
        {
            icon: <AutoFixHighIcon fontSize="large" />,
            title: 'Instant Content Creation',
            description: 'Transform images into compelling LinkedIn posts with just a few clicks.'
        },
        {
            icon: <AnalyticsIcon fontSize="large" />,
            title: 'Professional Results',
            description: 'Generate content that resonates with your professional network and drives engagement.'
        },
        {
            icon: <SpeedIcon fontSize="large" />,
            title: 'Time-Saving',
            description: 'Create weeks worth of content in minutes, not hours or days.'
        }
    ];

    const testimonials = [
        {
            quote: "This tool has completely transformed my LinkedIn strategy. I've seen a 240% increase in engagement since I started using it.",
            author: "Sarah J., Marketing Director"
        },
        {
            quote: "As a busy entrepreneur, creating consistent content was always a challenge. Now I can share professional updates in minutes!",
            author: "Mike T., Startup Founder"
        }
    ];

    return (
        <Box className="app-container">
            {/* Hero Section */}
            <Box
                className="story-section"
                sx={{
                    minHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    px: 2,
                }}
            >
                <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ mb: 4, transform: 'scale(1.5)' }}>
                        <Logo size="large" />
                    </Box>

                    <Typography variant="h1" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
                        Transform Images into Engaging LinkedIn Posts
                    </Typography>

                    <Typography
                        variant="h5"
                        component="p"
                        className="lead"
                        color="text.secondary"
                        gutterBottom
                        sx={{
                            maxWidth: 700,
                            mb: 5,
                            mx: 'auto'
                        }}
                    >
                        Harness the power of AI to analyze your images and create compelling professional content that
                        stands out on LinkedIn and grows your personal brand.
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={onGetStarted}
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                            py: 1.5,
                            px: 4,
                            fontSize: '1.1rem',
                            borderRadius: 3,
                        }}
                    >
                        Get Started
                    </Button>

                    <Box
                        component="img"
                        src="/dashboard-preview.svg"
                        alt="LinkedIn Post Creator Dashboard Preview"
                        sx={{
                            width: '100%',
                            maxWidth: 900,
                            mt: 8,
                            borderRadius: 4,
                            boxShadow: '0 20px 60px rgba(255, 138, 0, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            display: { xs: 'none', md: 'block' }
                        }}
                    />
                </Container>
            </Box>

            {/* Features Section */}
            <Box className="story-section" sx={{ bgcolor: 'rgba(255, 255, 255, 0.5)', py: 8 }}>
                <Container maxWidth="lg">
                    <Typography variant="h2" component="h2" align="center" gutterBottom>
                        How It Works
                    </Typography>

                    <Typography
                        variant="body1"
                        className="lead"
                        align="center"
                        color="text.secondary"
                        paragraph
                        sx={{ mb: 8 }}
                    >
                        Our powerful platform simplifies the content creation process from start to finish
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                        {features.map((feature, index) => (
                            <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 40%', md: '1 1 20%' } }}>
                                <Card
                                    className="feature-card"
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                    }}
                                >
                                    <CardContent>
                                        <Box
                                            sx={{
                                                color: 'primary.main',
                                                mb: 2,
                                                p: 1.5,
                                                bgcolor: 'rgba(255, 138, 0, 0.1)',
                                                borderRadius: '50%',
                                                width: 60,
                                                height: 60,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mx: 'auto'
                                            }}
                                        >
                                            {feature.icon}
                                        </Box>
                                        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {feature.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Process Steps */}
            <Box className="story-section">
                <Container maxWidth="lg">
                    <Typography variant="h2" component="h2" align="center" gutterBottom>
                        Three Simple Steps
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, my: 5, alignItems: 'center' }}>
                        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, textAlign: 'center' }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 60,
                                    height: 60,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1.5rem',
                                    mb: 2,
                                }}
                            >
                                1
                            </Box>
                            <Typography variant="h5" component="h3" gutterBottom>
                                Connect LinkedIn
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Securely connect your LinkedIn account with just one click.
                            </Typography>
                        </Box>

                        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, textAlign: 'center' }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 60,
                                    height: 60,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1.5rem',
                                    mb: 2,
                                }}
                            >
                                2
                            </Box>
                            <Typography variant="h5" component="h3" gutterBottom>
                                Choose Post Type
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Select from text-only, single image, or carousel posts.
                            </Typography>
                        </Box>

                        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' }, textAlign: 'center' }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 60,
                                    height: 60,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1.5rem',
                                    mb: 2,
                                }}
                            >
                                3
                            </Box>
                            <Typography variant="h5" component="h3" gutterBottom>
                                Publish & Share
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Review the AI-enhanced content and publish directly to LinkedIn.
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ textAlign: 'center', mt: 6 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={onGetStarted}
                            sx={{ py: 1.5, px: 4, borderRadius: 3 }}
                        >
                            Start Creating
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Testimonials */}
            <Box className="story-section" sx={{ bgcolor: 'rgba(255, 138, 0, 0.05)', py: 8 }}>
                <Container maxWidth="md">
                    <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 5 }}>
                        What Our Users Say
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {testimonials.map((testimonial, index) => (
                            <Box key={index} sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        height: '100%',
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        borderRadius: 4,
                                        border: '1px solid rgba(255, 255, 255, 0.5)',
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="body1" paragraph className="testimonial">
                                            {testimonial.quote}
                                        </Typography>
                                        <Typography variant="subtitle2" align="right" color="text.secondary">
                                            — {testimonial.author}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ textAlign: 'center', mt: 8 }}>
                        <Typography variant="h5" component="p" gutterBottom>
                            Ready to transform your LinkedIn presence?
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={onGetStarted}
                            sx={{ mt: 2, py: 1.5, px: 4, borderRadius: 3 }}
                        >
                            Get Started Now
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Footer */}
            <Box
                component="footer"
                sx={{
                    py: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.5)',
                    mt: 'auto',
                }}
            >
                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: isMobile ? 'center' : 'space-between',
                            alignItems: 'center',
                            flexDirection: isMobile ? 'column' : 'row',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 0 }}>
                            <Logo size="small" />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                © 2023 LinkedIn Post Creator. All rights reserved.
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 3 }}>
                            <Typography variant="body2" component="a" href="#" color="text.secondary">
                                Privacy Policy
                            </Typography>
                            <Typography variant="body2" component="a" href="#" color="text.secondary">
                                Terms of Service
                            </Typography>
                            <Typography variant="body2" component="a" href="#" color="text.secondary">
                                Contact
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage; 