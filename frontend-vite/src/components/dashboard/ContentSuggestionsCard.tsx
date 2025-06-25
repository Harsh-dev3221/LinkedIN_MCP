import React, { useState } from 'react';
import { Lightbulb, RefreshCw, Sparkles, TrendingUp, Users, BookOpen, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface ContentSuggestion {
    title: string;
    description: string;
    category: string;
    estimatedEngagement: string;
}

interface ContentSuggestionsResponse {
    success: boolean;
    suggestions: ContentSuggestion[];
    fallbackSuggestions?: ContentSuggestion[];
    profile: {
        name: string;
        initials: string;
    };
    metadata: {
        contentType: string;
        generatedAt: string;
        basedOnProfile: boolean;
    };
}

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

                if (response.data.error) {
                    throw new Error(response.data.error.message || 'MCP tool call failed');
                }

                return response.data.result;
            } catch (error: any) {
                if (error.response?.status === 401) {
                    throw new Error('Authentication failed - please reconnect LinkedIn');
                }
                throw error;
            }
        }
    };
};

const ContentSuggestionsCard: React.FC = () => {
    const { mcpToken, linkedinConnected } = useAuth();
    const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string>('general');
    const [profileName, setProfileName] = useState<string>('');
    const [hasGenerated, setHasGenerated] = useState(false); // Track if user has generated content

    const contentTypes = [
        { value: 'general', label: 'General', icon: Lightbulb },
        { value: 'motivational', label: 'Motivational', icon: Sparkles },
        { value: 'industry', label: 'Industry', icon: TrendingUp },
        { value: 'leadership', label: 'Leadership', icon: Users },
        { value: 'learning', label: 'Learning', icon: BookOpen },
        { value: 'achievement', label: 'Achievement', icon: Target }
    ];

    const fetchContentSuggestions = async (contentType: string = 'general') => {
        // If LinkedIn is not connected, show fallback suggestions immediately
        if (!linkedinConnected || !mcpToken) {
            setError('Connect LinkedIn for personalized suggestions');
            setSuggestions(getFallbackSuggestions(contentType));
            setHasGenerated(true);
            return;
        }

        setLoading(true);
        setError(null);
        setHasGenerated(true);

        try {
            const mcpClient = createMcpClient(mcpToken);
            const result = await mcpClient.callTool('generate-profile-content-suggestions', {
                contentType,
                count: 5
            });

            if (result?.content?.[0]?.text) {
                const data: ContentSuggestionsResponse = JSON.parse(result.content[0].text);

                if (data.success) {
                    setSuggestions(data.suggestions);
                    setProfileName(data.profile?.name || '');
                } else {
                    // Handle fallback suggestions
                    if (data.fallbackSuggestions) {
                        setSuggestions(data.fallbackSuggestions);
                        setError('Using fallback suggestions - LinkedIn profile data unavailable');
                    } else {
                        setSuggestions(getFallbackSuggestions(contentType));
                        setError('Failed to generate content suggestions');
                    }
                }
            } else {
                setSuggestions(getFallbackSuggestions(contentType));
                setError('No content received from LinkedIn API');
            }
        } catch (err: any) {
            console.error('Error fetching content suggestions:', err);
            setError(err.message || 'Failed to load content suggestions');
            setSuggestions(getFallbackSuggestions(contentType));
        } finally {
            setLoading(false);
        }
    };

    // Get fallback suggestions based on content type
    const getFallbackSuggestions = (contentType: string): ContentSuggestion[] => {
        const baseSuggestions = {
            general: [
                {
                    title: "Share Your Journey",
                    description: "Tell your professional story and inspire others",
                    category: "Personal",
                    estimatedEngagement: "High"
                },
                {
                    title: "Industry Insights",
                    description: "Share your thoughts on current industry trends",
                    category: "Professional",
                    estimatedEngagement: "Medium"
                },
                {
                    title: "Weekly Reflection",
                    description: "Reflect on lessons learned this week",
                    category: "Growth",
                    estimatedEngagement: "Medium"
                }
            ],
            motivational: [
                {
                    title: "Monday Motivation",
                    description: "Start the week with an inspiring message",
                    category: "Motivational",
                    estimatedEngagement: "High"
                },
                {
                    title: "Overcoming Challenges",
                    description: "Share how you overcame a recent obstacle",
                    category: "Inspirational",
                    estimatedEngagement: "High"
                }
            ],
            industry: [
                {
                    title: "Tech Trends 2024",
                    description: "Discuss emerging technologies in your field",
                    category: "Industry",
                    estimatedEngagement: "Medium"
                },
                {
                    title: "Market Analysis",
                    description: "Share insights about market changes",
                    category: "Business",
                    estimatedEngagement: "Medium"
                }
            ],
            leadership: [
                {
                    title: "Team Building Tips",
                    description: "Share effective team management strategies",
                    category: "Leadership",
                    estimatedEngagement: "High"
                },
                {
                    title: "Decision Making",
                    description: "Discuss your approach to tough decisions",
                    category: "Management",
                    estimatedEngagement: "Medium"
                }
            ]
        };

        return baseSuggestions[contentType as keyof typeof baseSuggestions] || baseSuggestions.general;
    };

    // Removed automatic content generation - now only manual via refresh button
    // useEffect(() => {
    //     fetchContentSuggestions(selectedType);
    // }, [selectedType]);

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'motivational': return <Sparkles className="w-4 h-4" />;
            case 'leadership': return <Users className="w-4 h-4" />;
            case 'professional': return <TrendingUp className="w-4 h-4" />;
            case 'learning': return <BookOpen className="w-4 h-4" />;
            case 'achievement': return <Target className="w-4 h-4" />;
            default: return <Lightbulb className="w-4 h-4" />;
        }
    };

    const getEngagementColor = (engagement: string) => {
        switch (engagement.toLowerCase()) {
            case 'high': return 'text-green-600 bg-green-50';
            case 'medium': return 'text-orange-600 bg-orange-50';
            case 'low': return 'text-gray-600 bg-gray-50';
            default: return 'text-blue-600 bg-blue-50';
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Content Ideas</h3>
                        <p className="text-sm text-gray-600">
                            {profileName ? `Personalized for ${profileName}` : 'AI-powered suggestions'}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => fetchContentSuggestions(selectedType)}
                    disabled={loading}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Refresh content suggestions"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content Type Selector */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                    {contentTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <button
                                key={type.value}
                                onClick={() => setSelectedType(type.value)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedType === type.value
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {type.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-700">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Suggestions List */}
            {!loading && suggestions.length > 0 && (
                <div className="space-y-4">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="p-4 border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer group"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {getCategoryIcon(suggestion.category)}
                                    <h4 className="font-semibold text-gray-900 group-hover:text-purple-700">
                                        {suggestion.title}
                                    </h4>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getEngagementColor(suggestion.estimatedEngagement)}`}>
                                    {suggestion.estimatedEngagement}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {suggestion.description}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                    {suggestion.category}
                                </span>
                                <button className="text-xs text-purple-600 hover:text-purple-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Use This Idea →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && suggestions.length === 0 && !error && (
                <div className="text-center py-8">
                    <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                        {hasGenerated ? 'No suggestions available' : 'Click the refresh button to generate content ideas'}
                    </p>
                    <button
                        type="button"
                        onClick={() => fetchContentSuggestions(selectedType)}
                        className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                        {hasGenerated ? 'Try Again' : 'Generate Ideas'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContentSuggestionsCard;
