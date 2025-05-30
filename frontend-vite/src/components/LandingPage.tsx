"use client"

import type React from "react"
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Paper,
    Stack,
    Avatar,
} from "@mui/material"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import AnalyticsIcon from "@mui/icons-material/Analytics"
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh"
import SpeedIcon from "@mui/icons-material/Speed"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import LinkedInIcon from "@mui/icons-material/LinkedIn"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import Logo from "./Logo"

interface LandingPageProps {
    onGetStarted: () => void
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const features = [
        {
            icon: <AutoAwesomeIcon fontSize="large" />,
            title: "AI-Powered Analysis",
            description:
                "Advanced AI technology analyzes your content to extract key themes, insights, and engagement opportunities.",
            color: "#0A66C2",
        },
        {
            icon: <AutoFixHighIcon fontSize="large" />,
            title: "Instant Content Creation",
            description: "Transform ideas and images into compelling LinkedIn posts with professional formatting in seconds.",
            color: "#F5A623",
        },
        {
            icon: <AnalyticsIcon fontSize="large" />,
            title: "Professional Results",
            description: "Generate content that resonates with your professional network and drives meaningful engagement.",
            color: "#0A66C2",
        },
        {
            icon: <SpeedIcon fontSize="large" />,
            title: "Time-Saving Efficiency",
            description: "Create weeks worth of high-quality content in minutes, not hours. Focus on what matters most.",
            color: "#F5A623",
        },
    ]

    const testimonials = [
        {
            quote:
                "This tool has completely transformed my LinkedIn strategy. I've seen a 240% increase in engagement since I started using it.",
            author: "Sarah J.",
            role: "Marketing Director",
            avatar: "/placeholder.svg?height=60&width=60",
        },
        {
            quote:
                "As a busy entrepreneur, creating consistent content was always a challenge. Now I can share professional updates in minutes!",
            author: "Mike T.",
            role: "Startup Founder",
            avatar: "/placeholder.svg?height=60&width=60",
        },
    ]

    const stats = [
        { number: "10K+", label: "Posts Created" },
        { number: "500+", label: "Active Users" },
        { number: "95%", label: "Satisfaction Rate" },
        { number: "3x", label: "Engagement Boost" },
    ]

    return (
        <Box sx={{ minHeight: "100vh", background: "transparent" }}>
            {/* Hero Section */}
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    px: 2,
                    py: 8,
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ mb: 4 }}>
                        <Logo size="large" />
                    </Box>

                    <Typography
                        variant="h1"
                        component="h1"
                        gutterBottom
                        sx={{
                            mb: 3,
                            background: "linear-gradient(135deg, #0A66C2 0%, #F5A623 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        Transform Ideas into Engaging LinkedIn Posts
                    </Typography>

                    <Typography
                        variant="h5"
                        component="p"
                        color="text.secondary"
                        gutterBottom
                        sx={{
                            maxWidth: 800,
                            mb: 6,
                            mx: "auto",
                            fontWeight: 400,
                            lineHeight: 1.6,
                        }}
                    >
                        Harness the power of AI to analyze your content and create compelling professional posts that stand out on
                        LinkedIn and grow your personal brand.
                    </Typography>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        justifyContent="center"
                        sx={{ mb: 8 }}
                    >
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={onGetStarted}
                            endIcon={<ArrowForwardIcon />}
                            sx={{
                                py: 2,
                                px: 4,
                                fontSize: "1.1rem",
                                fontWeight: 600,
                            }}
                        >
                            Get Started Free
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            size="large"
                            startIcon={<LinkedInIcon />}
                            sx={{
                                py: 2,
                                px: 4,
                                fontSize: "1.1rem",
                                fontWeight: 600,
                            }}
                        >
                            See How It Works
                        </Button>
                    </Stack>

                    {/* Stats */}
                    <Grid container spacing={4} justifyContent="center" sx={{ mb: 8 }}>
                        {stats.map((stat, index) => (
                            <Grid size={{ xs: 6, sm: 3 }} key={index}>
                                <Paper
                                    sx={{
                                        p: 3,
                                        textAlign: "center",
                                        background: "rgba(255, 255, 255, 0.8)",
                                        backdropFilter: "blur(10px)",
                                    }}
                                >
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            fontWeight: 700,
                                            color: "primary.main",
                                            mb: 1,
                                        }}
                                    >
                                        {stat.number}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                        {stat.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Preview Image Placeholder */}
                    <Box
                        sx={{
                            width: "100%",
                            maxWidth: 900,
                            height: { xs: 300, md: 500 },
                            mx: "auto",
                            borderRadius: 4,
                            background: "linear-gradient(135deg, rgba(10, 102, 194, 0.1) 0%, rgba(245, 166, 35, 0.1) 100%)",
                            border: "2px solid rgba(255, 255, 255, 0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        <Typography variant="h6" color="text.secondary">
                            Dashboard Preview
                        </Typography>
                    </Box>
                </Container>
            </Box>

            {/* Features Section */}
            <Box sx={{ py: 10, background: "rgba(255, 255, 255, 0.3)", backdropFilter: "blur(10px)" }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: "center", mb: 8 }}>
                        <Typography variant="h2" component="h2" gutterBottom sx={{ mb: 3 }}>
                            Powerful Features for Content Creators
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.2rem", maxWidth: 600, mx: "auto" }}>
                            Everything you need to create professional LinkedIn content that drives engagement and builds your brand
                        </Typography>
                    </Box>

                    <Grid container spacing={4}>
                        {features.map((feature, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                                <Card
                                    sx={{
                                        height: "100%",
                                        textAlign: "center",
                                        transition: "all 0.3s ease",
                                        "&:hover": {
                                            transform: "translateY(-8px)",
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 4 }}>
                                        <Box
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: "50%",
                                                background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}40)`,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                mx: "auto",
                                                mb: 3,
                                                color: feature.color,
                                            }}
                                        >
                                            {feature.icon}
                                        </Box>
                                        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                            {feature.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Process Steps */}
            <Box sx={{ py: 10 }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: "center", mb: 8 }}>
                        <Typography variant="h2" component="h2" gutterBottom sx={{ mb: 3 }}>
                            Three Simple Steps to Success
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.2rem" }}>
                            Get started in minutes with our streamlined process
                        </Typography>
                    </Box>

                    <Grid container spacing={6} alignItems="center">
                        {[
                            {
                                step: 1,
                                title: "Connect LinkedIn",
                                description:
                                    "Securely connect your LinkedIn account with enterprise-grade security and one-click authentication.",
                                icon: <LinkedInIcon fontSize="large" />,
                            },
                            {
                                step: 2,
                                title: "Choose Content Type",
                                description: "Select from text-only posts, single image posts, or engaging carousel content formats.",
                                icon: <AutoFixHighIcon fontSize="large" />,
                            },
                            {
                                step: 3,
                                title: "Publish & Engage",
                                description:
                                    "Review AI-enhanced content, make final adjustments, and publish directly to your LinkedIn feed.",
                                icon: <TrendingUpIcon fontSize="large" />,
                            },
                        ].map((step, index) => (
                            <Grid size={{ xs: 12, md: 4 }} key={index}>
                                <Card
                                    sx={{
                                        textAlign: "center",
                                        p: 3,
                                        height: "100%",
                                        background: "rgba(255, 255, 255, 0.9)",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: "50%",
                                            background: "linear-gradient(135deg, #0A66C2, #F5A623)",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            mx: "auto",
                                            mb: 3,
                                            fontSize: "2rem",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {step.step}
                                    </Box>
                                    <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                        {step.title}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                        {step.description}
                                    </Typography>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    <Box sx={{ textAlign: "center", mt: 8 }}>
                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            onClick={onGetStarted}
                            sx={{ py: 2, px: 4, fontSize: "1.1rem", fontWeight: 600 }}
                        >
                            Start Creating Now
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Testimonials */}
            <Box sx={{ py: 10, background: "rgba(10, 102, 194, 0.05)" }}>
                <Container maxWidth="md">
                    <Box sx={{ textAlign: "center", mb: 8 }}>
                        <Typography variant="h2" component="h2" gutterBottom sx={{ mb: 3 }}>
                            Trusted by Content Creators
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.2rem" }}>
                            See what our users are saying about their success
                        </Typography>
                    </Box>

                    <Grid container spacing={4}>
                        {testimonials.map((testimonial, index) => (
                            <Grid size={{ xs: 12, md: 6 }} key={index}>
                                <Card
                                    sx={{
                                        p: 4,
                                        height: "100%",
                                        background: "rgba(255, 255, 255, 0.9)",
                                    }}
                                >
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontSize: "1.1rem",
                                            lineHeight: 1.7,
                                            fontStyle: "italic",
                                            mb: 3,
                                        }}
                                    >
                                        "{testimonial.quote}"
                                    </Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Avatar src={testimonial.avatar} sx={{ width: 50, height: 50 }} />
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                {testimonial.author}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {testimonial.role}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box sx={{ py: 10 }}>
                <Container maxWidth="md">
                    <Card
                        sx={{
                            p: 6,
                            textAlign: "center",
                            background: "linear-gradient(135deg, #0A66C2 0%, #F5A623 100%)",
                            color: "white",
                        }}
                    >
                        <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                            Ready to Transform Your LinkedIn Presence?
                        </Typography>
                        <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                            Join thousands of professionals who are already creating engaging content with AI
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={onGetStarted}
                            sx={{
                                py: 2,
                                px: 4,
                                fontSize: "1.2rem",
                                fontWeight: 600,
                                backgroundColor: "rgba(255, 255, 255, 0.2)",
                                color: "white",
                                border: "2px solid rgba(255, 255, 255, 0.3)",
                                "&:hover": {
                                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                                },
                            }}
                        >
                            Get Started Free Today
                        </Button>
                    </Card>
                </Container>
            </Box>

            {/* Footer */}
            <Box
                component="footer"
                sx={{
                    py: 6,
                    background: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(10px)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.6)",
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Logo size="small" />
                                <Typography variant="body2" color="text.secondary">
                                    © 2024 LinkedIn Post Creator. All rights reserved.
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 4,
                                    justifyContent: { xs: "center", md: "flex-end" },
                                    flexWrap: "wrap",
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    component="a"
                                    href="#"
                                    color="text.secondary"
                                    sx={{
                                        textDecoration: "none",
                                        "&:hover": { color: "primary.main" },
                                    }}
                                >
                                    Privacy Policy
                                </Typography>
                                <Typography
                                    variant="body2"
                                    component="a"
                                    href="#"
                                    color="text.secondary"
                                    sx={{
                                        textDecoration: "none",
                                        "&:hover": { color: "primary.main" },
                                    }}
                                >
                                    Terms of Service
                                </Typography>
                                <Typography
                                    variant="body2"
                                    component="a"
                                    href="#"
                                    color="text.secondary"
                                    sx={{
                                        textDecoration: "none",
                                        "&:hover": { color: "primary.main" },
                                    }}
                                >
                                    Contact
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </Box>
    )
}

export default LandingPage
