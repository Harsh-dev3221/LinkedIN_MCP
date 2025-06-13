import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Chip,
    LinearProgress,
    Card,
    CardContent,
    Collapse,
    IconButton,
    Alert,
    Stack
} from '@mui/material';
import {
    Link as LinkIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    GitHub as GitHubIcon,
    Article as ArticleIcon,
    Language as WebsiteIcon,
    Description as DocsIcon,
    Share as SocialIcon
} from '@mui/icons-material';

interface DetectedLink {
    url: string;
    type: 'github' | 'article' | 'website' | 'documentation' | 'social';
    position: [number, number];
    confidence: number;
}

interface LinkScrapingIndicatorProps {
    text: string;
    onLinksDetected: (links: DetectedLink[]) => void;
    onScrapingComplete: (scrapedData: any[]) => void;
    isProcessing: boolean;
}

const LinkScrapingIndicator: React.FC<LinkScrapingIndicatorProps> = ({
    text,
    onLinksDetected,
    onScrapingComplete,
    isProcessing
}) => {
    const [detectedLinks, setDetectedLinks] = useState<DetectedLink[]>([]);
    const [scrapingProgress, setScrapingProgress] = useState<Record<string, 'pending' | 'processing' | 'success' | 'error'>>({});
    const [scrapedData, setScrapedData] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showProgress, setShowProgress] = useState(false);

    // Detect links in real-time
    useEffect(() => {
        if (!text || text.trim().length === 0) {
            setDetectedLinks([]);
            setScrapingProgress({});
            setScrapedData([]);
            setShowProgress(false);
            return;
        }

        // Simple URL detection regex
        const urlRegex = /https?:\/\/[^\s]+/gi;
        const matches = Array.from(text.matchAll(urlRegex));
        
        const links: DetectedLink[] = matches.map((match, index) => {
            const url = match[0];
            const type = getUrlType(url);
            
            return {
                url,
                type,
                position: [match.index || 0, (match.index || 0) + url.length],
                confidence: getConfidence(url, type)
            };
        });

        setDetectedLinks(links);
        onLinksDetected(links);

        // Show progress indicator if links are detected
        if (links.length > 0) {
            setShowProgress(true);
            // Initialize scraping progress
            const progress: Record<string, 'pending' | 'processing' | 'success' | 'error'> = {};
            links.forEach(link => {
                progress[link.url] = 'pending';
            });
            setScrapingProgress(progress);
        } else {
            setShowProgress(false);
        }
    }, [text, onLinksDetected]);

    // Simulate scraping progress when processing starts
    useEffect(() => {
        if (isProcessing && detectedLinks.length > 0) {
            // Start scraping simulation
            detectedLinks.forEach((link, index) => {
                setTimeout(() => {
                    setScrapingProgress(prev => ({
                        ...prev,
                        [link.url]: 'processing'
                    }));

                    // Simulate completion after a delay
                    setTimeout(() => {
                        setScrapingProgress(prev => ({
                            ...prev,
                            [link.url]: 'success'
                        }));
                    }, 1000 + (index * 500));
                }, index * 200);
            });
        }
    }, [isProcessing, detectedLinks]);

    const getUrlType = (url: string): DetectedLink['type'] => {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('github.com')) return 'github';
        if (lowerUrl.includes('medium.com') || lowerUrl.includes('dev.to') || lowerUrl.includes('blog.')) return 'article';
        if (lowerUrl.includes('docs.') || lowerUrl.includes('documentation.')) return 'documentation';
        if (lowerUrl.includes('linkedin.com') || lowerUrl.includes('twitter.com')) return 'social';
        return 'website';
    };

    const getConfidence = (url: string, type: string): number => {
        const lowerUrl = url.toLowerCase();
        switch (type) {
            case 'github': return lowerUrl.includes('github.com') ? 0.95 : 0.5;
            case 'article': return 0.8;
            case 'documentation': return 0.9;
            case 'social': return 0.85;
            default: return 0.6;
        }
    };

    const getTypeIcon = (type: DetectedLink['type']) => {
        switch (type) {
            case 'github': return <GitHubIcon fontSize="small" />;
            case 'article': return <ArticleIcon fontSize="small" />;
            case 'documentation': return <DocsIcon fontSize="small" />;
            case 'social': return <SocialIcon fontSize="small" />;
            default: return <WebsiteIcon fontSize="small" />;
        }
    };

    const getTypeColor = (type: DetectedLink['type']) => {
        switch (type) {
            case 'github': return 'default';
            case 'article': return 'primary';
            case 'documentation': return 'secondary';
            case 'social': return 'info';
            default: return 'default';
        }
    };

    const getProgressColor = (status: string) => {
        switch (status) {
            case 'processing': return 'primary';
            case 'success': return 'success';
            case 'error': return 'error';
            default: return 'inherit';
        }
    };

    if (!showProgress || detectedLinks.length === 0) {
        return null;
    }

    const allCompleted = Object.values(scrapingProgress).every(status => status === 'success' || status === 'error');
    const successCount = Object.values(scrapingProgress).filter(status => status === 'success').length;

    return (
        <Card sx={{ mt: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" color="primary" fontWeight="medium">
                            {isProcessing ? 
                                `🔍 Finding best context for you... Scraping ${detectedLinks.length} link(s)` :
                                `🔗 ${detectedLinks.length} link(s) detected`
                            }
                        </Typography>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={() => setIsExpanded(!isExpanded)}
                        sx={{ ml: 1 }}
                    >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Box>

                {isProcessing && (
                    <Box sx={{ mb: 2 }}>
                        <LinearProgress 
                            variant="determinate" 
                            value={(successCount / detectedLinks.length) * 100}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {allCompleted ? 
                                `✅ Scraping complete! Will generate the best post for you.` :
                                `Scraping progress: ${successCount}/${detectedLinks.length} completed`
                            }
                        </Typography>
                    </Box>
                )}

                <Collapse in={isExpanded}>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        {detectedLinks.map((link, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Chip
                                    icon={getTypeIcon(link.type)}
                                    label={link.type}
                                    size="small"
                                    color={getTypeColor(link.type)}
                                    variant="outlined"
                                />
                                <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {link.url}
                                </Typography>
                                {isProcessing && (
                                    <Chip
                                        label={scrapingProgress[link.url] || 'pending'}
                                        size="small"
                                        color={getProgressColor(scrapingProgress[link.url]) as any}
                                        variant={scrapingProgress[link.url] === 'processing' ? 'filled' : 'outlined'}
                                    />
                                )}
                            </Box>
                        ))}
                    </Stack>
                </Collapse>

                {!isProcessing && detectedLinks.length > 0 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                            🚀 Ready to generate enhanced content with insights from these links!
                        </Typography>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default LinkScrapingIndicator;
