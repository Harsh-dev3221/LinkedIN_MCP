import React, { useState } from 'react';
import {
    Box,
    Card,
    Typography,
    Button,
    Grid,
    Chip,
    Paper,
    CircularProgress
} from '@mui/material';
import {
    Timeline as TimelineIcon,
    Code as CodeIcon,
    EmojiEvents as EmojiEventsIcon,
    School as SchoolIcon,
    AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';

interface StoryExample {
    type: 'journey' | 'technical' | 'achievement' | 'learning';
    title: string;
    icon: React.ReactNode;
    description: string;
    exampleInput: string;
    expectedOutput: string;
    color: string;
}

const StoryTypeDemo: React.FC = () => {
    const [generatingType, setGeneratingType] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});

    const storyExamples: StoryExample[] = [
        {
            type: 'journey',
            title: 'Journey Story',
            icon: <TimelineIcon />,
            description: 'Personal/professional journey with challenges and growth',
            exampleInput: 'Started learning MCP servers 6 months ago, built PostWizz, now launching it as a SaaS',
            expectedOutput: 'Six months ago, I was just another lazy creator who built amazing things but never posted about them...',
            color: '#2196F3'
        },
        {
            type: 'technical',
            title: 'Technical Showcase',
            icon: <CodeIcon />,
            description: 'Technical achievements, projects, and implementations',
            exampleInput: 'Built a custom MCP server with React 19, Supabase, LinkedIn OAuth, and Gemini AI integration',
            expectedOutput: 'Building a production-ready MCP server taught me more about AI orchestration than any tutorial...',
            color: '#4CAF50'
        },
        {
            type: 'achievement',
            title: 'Achievement Post',
            icon: <EmojiEventsIcon />,
            description: 'Celebrating milestones, launches, and successes',
            exampleInput: 'Just launched PostWizz after 6 months of development, got first 100 users in 24 hours',
            expectedOutput: '🚀 PostWizz is officially live! After 6 months of late nights and countless iterations...',
            color: '#FF9800'
        },
        {
            type: 'learning',
            title: 'Learning Story',
            icon: <SchoolIcon />,
            description: 'Educational content with personal insights',
            exampleInput: 'Learned that building an AI assistant requires understanding both technical implementation and user psychology',
            expectedOutput: 'Building an AI assistant taught me that the hardest part isn\'t the code—it\'s understanding what users actually need...',
            color: '#9C27B0'
        }
    ];

    const handleGenerateExample = async (storyType: string) => {
        setGeneratingType(storyType);

        // Simulate API call delay
        setTimeout(() => {
            const example = storyExamples.find(e => e.type === storyType);
            if (example) {
                setGeneratedContent(prev => ({
                    ...prev,
                    [storyType]: example.expectedOutput
                }));
            }
            setGeneratingType(null);
        }, 2000);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
                PostWizz Story Types Demo
            </Typography>

            <Typography variant="body1" sx={{ textAlign: 'center', mb: 4, color: 'text.secondary' }}>
                See how different story types transform your content into engaging LinkedIn posts
            </Typography>

            <Grid container spacing={3}>
                {storyExamples.map((example) => (
                    <Grid size={{ xs: 12, md: 6 }} key={example.type}>
                        <Card
                            sx={{
                                p: 3,
                                height: '100%',
                                borderLeft: `4px solid ${example.color}`,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 3
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ color: example.color, mr: 1 }}>
                                    {example.icon}
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {example.title}
                                </Typography>
                                <Chip
                                    label={example.type}
                                    size="small"
                                    sx={{ ml: 'auto', backgroundColor: example.color, color: 'white' }}
                                />
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {example.description}
                            </Typography>

                            <Paper sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    INPUT:
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    "{example.exampleInput}"
                                </Typography>
                            </Paper>

                            {generatedContent[example.type] && (
                                <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                                        AI GENERATED OUTPUT:
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        {generatedContent[example.type]}
                                    </Typography>
                                </Paper>
                            )}

                            <Button
                                variant="contained"
                                fullWidth
                                onClick={() => handleGenerateExample(example.type)}
                                disabled={generatingType !== null}
                                startIcon={
                                    generatingType === example.type ?
                                        <CircularProgress size={20} color="inherit" /> :
                                        <AutoAwesomeIcon />
                                }
                                sx={{
                                    backgroundColor: example.color,
                                    '&:hover': {
                                        backgroundColor: example.color,
                                        filter: 'brightness(0.9)'
                                    }
                                }}
                            >
                                {generatingType === example.type ? 'Generating...' : 'Generate Example'}
                            </Button>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ mt: 4, p: 3, backgroundColor: 'rgba(255, 138, 0, 0.05)', borderRadius: 2, border: '1px solid rgba(255, 138, 0, 0.2)' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    🎯 How It Works
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Each story type uses specialized AI prompts that understand the unique structure and tone needed for different kinds of LinkedIn content.
                    The AI analyzes your input and transforms it into engaging, professional posts that follow proven storytelling patterns.
                </Typography>
            </Box>
        </Box>
    );
};

export default StoryTypeDemo;
