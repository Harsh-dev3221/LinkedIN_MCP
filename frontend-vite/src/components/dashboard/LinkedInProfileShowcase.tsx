import React, { useState, useEffect } from 'react';
import {
    Briefcase,
    Mail,
    Sparkles,
    RefreshCw,
    Users,
    MapPin,
    Calendar,
    ExternalLink,
    CheckCircle,
    Building,
    Heart,
    GraduationCap,
    Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface LinkedInProfile {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl: string | null;
    locale: string;
    displayName: string;
    initials: string;
    isVerified: boolean;
    lastUpdated: string;
    // Enhanced LinkedIn profile fields
    headline: string | null;
    vanityName: string | null;
    publicProfileUrl: string | null;
    industry: string | null;
    location: string | null;
    summary: string | null;
    // Additional LinkedIn profile fields (scraping functionality removed)
    currentPosition?: string;
    about?: string;
    linkedinLocation?: string;
    linkedinSkills?: string[];
    linkedinExperiences?: Array<{
        title: string;
        company?: string;
        duration?: string;
    }>;
    education?: Array<{
        school: string;
        degree?: string;
        field?: string;
        duration?: string;
    }>;
    skills?: string[];
    connectionsCount?: string;
    followersCount?: string;
    currentCompany?: string;
    previousCompanies?: string[];
    professionalContext: {
        hasLinkedInProfile: boolean;
        authenticatedVia: string;
        canGenerateIndustryContent: boolean;
        hasDetailedProfile: boolean;
        availableScopes: string[];
        enhancedWithScraper?: boolean;
        enhancedAt?: string;
    };
}

interface LinkedInProfileShowcaseProps {
    onConnect?: () => void;
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
                    },
                    timeout: 30000 // 30 second timeout
                });

                if (response.data.isError) {
                    throw new Error(response.data.content[0].text);
                }

                return response.data;
            } catch (error: any) {
                // Handle authentication errors
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new Error('LinkedIn connection expired. Please reconnect your LinkedIn account.');
                }

                // Handle network errors
                if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    throw new Error('Network error. Please check your connection and try again.');
                }

                // Handle server errors
                if (error.response?.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                }

                throw error;
            }
        }
    };
};

const LinkedInProfileShowcase: React.FC<LinkedInProfileShowcaseProps> = ({ onConnect }) => {
    const { mcpToken, linkedinConnected, connectLinkedIn } = useAuth();
    const [profile, setProfile] = useState<LinkedInProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch LinkedIn profile data
    const fetchProfile = async () => {
        if (!mcpToken) {
            setError('MCP token required');
            return;
        }

        // Temporarily bypass linkedinConnected check for debugging
        console.log('🔍 Frontend: Attempting to fetch profile with token:', !!mcpToken);

        setLoading(true);
        setError(null);

        try {
            const mcpClient = createMcpClient(mcpToken);
            // Use enhanced profile to get LinkedIn data (scraping functionality removed)
            const result = await mcpClient.callTool('get-enhanced-profile-info', {});

            console.log('🔍 Frontend: Enhanced MCP result received:', result);

            if (result?.content?.[0]?.text) {
                console.log('🔍 Frontend: Raw text content:', result.content[0].text);
                const profileData = JSON.parse(result.content[0].text);
                console.log('🔍 Frontend: Parsed profile data:', profileData);

                if (profileData.success && profileData.profile) {
                    console.log('✅ Frontend: Setting profile data:', profileData.profile);
                    setProfile(profileData.profile);
                } else {
                    console.error('❌ Frontend: Profile data validation failed:', profileData);
                    setError('Failed to load LinkedIn profile data');
                }
            } else {
                console.error('❌ Frontend: No content in result:', result);
                setError('No profile data received from LinkedIn');
            }
        } catch (err: any) {
            console.error('❌ Frontend: Error fetching LinkedIn profile:', err);
            setError(err.message || 'Failed to load LinkedIn profile');
        } finally {
            setLoading(false);
        }
    };

    // Load profile data when LinkedIn is connected
    useEffect(() => {
        console.log('🔍 LinkedInProfileShowcase: State check', {
            linkedinConnected,
            mcpToken: !!mcpToken,
            willFetchProfile: mcpToken // Temporarily bypass linkedinConnected check
        });

        // Temporarily bypass linkedinConnected check for debugging
        if (mcpToken) {
            fetchProfile();
        }
    }, [linkedinConnected, mcpToken]);

    // If LinkedIn is not connected AND we don't have profile data, show connection prompt
    if (!linkedinConnected && !profile) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300">
                <div className="text-center">
                    <div className="w-16 h-16 bg-linkedin-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-linkedin-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Your LinkedIn</h3>
                    <p className="text-gray-600 mb-6">
                        Unlock personalized content suggestions and enhanced profile features by connecting your LinkedIn account.
                    </p>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            Personalized content suggestions
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            Professional profile showcase
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            Industry-specific AI content
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onConnect || connectLinkedIn}
                        className="w-full bg-linkedin-500 hover:bg-linkedin-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                        <Briefcase className="w-5 h-5" />
                        <span>Connect LinkedIn Account</span>
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300">
                <div className="animate-pulse">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-gray-200 rounded-2xl"></div>
                        <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Connection Error</h3>
                    <p className="text-red-600 mb-4 text-sm">{error}</p>
                    <button
                        type="button"
                        onClick={fetchProfile}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 mx-auto"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry</span>
                    </button>
                </div>
            </div>
        );
    }

    // Profile showcase
    if (profile) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-linkedin-500 rounded-xl">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">LinkedIn Profile</h3>
                            <p className="text-sm text-gray-600">Connected & Verified</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={fetchProfile}
                        disabled={loading}
                        className="p-2 text-linkedin-600 hover:bg-linkedin-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Refresh profile data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Profile Info */}
                <div className="flex items-center space-x-4 mb-6">
                    {profile.profilePictureUrl ? (
                        <img
                            src={profile.profilePictureUrl}
                            alt={profile.fullName}
                            className="w-16 h-16 rounded-2xl border-2 border-linkedin-200 object-cover"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl border-2 border-linkedin-200 bg-gradient-to-br from-linkedin-500 to-linkedin-600 flex items-center justify-center text-white font-bold text-xl">
                            {profile.initials}
                        </div>
                    )}

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold text-gray-900">{profile.fullName}</h4>
                            {profile.isVerified && (
                                <Sparkles className="w-4 h-4 text-linkedin-500" />
                            )}
                        </div>

                        {/* LinkedIn Headline */}
                        {profile.headline && (
                            <p className="text-sm text-gray-700 font-medium mb-1">
                                {profile.headline}
                            </p>
                        )}

                        {/* Location and Industry */}
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
                            {(profile.location || profile.linkedinLocation) && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {profile.linkedinLocation || profile.location}
                                </span>
                            )}
                            {profile.industry && (
                                <span className="flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    {profile.industry}
                                </span>
                            )}
                        </div>

                        {/* Current Company */}
                        {profile.currentCompany && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                                <Building className="w-3 h-3" />
                                {profile.currentCompany}
                            </p>
                        )}

                        {/* Social Metrics */}
                        {(profile.connectionsCount || profile.followersCount) && (
                            <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
                                {profile.connectionsCount && (
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {profile.connectionsCount}
                                    </span>
                                )}
                                {profile.followersCount && (
                                    <span className="flex items-center gap-1">
                                        <Heart className="w-3 h-3" />
                                        {profile.followersCount}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Email */}
                        {profile.email && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                                <Mail className="w-3 h-3" />
                                {profile.email}
                            </p>
                        )}

                        {/* Public Profile URL */}
                        {profile.publicProfileUrl && (
                            <a
                                href={profile.publicProfileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-linkedin-600 hover:text-linkedin-700 flex items-center gap-1 mb-1"
                            >
                                <ExternalLink className="w-3 h-3" />
                                View LinkedIn Profile
                            </a>
                        )}

                        <p className="text-xs text-gray-500 mt-1">
                            Connected via {profile.professionalContext.authenticatedVia}
                            {profile.professionalContext.enhancedWithScraper && (
                                <span className="ml-1 text-green-600">• Enhanced</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Profile Summary */}
                {(profile.summary || profile.about) && (
                    <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">About</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {((profile.about || profile.summary) || '').length > 200
                                ? `${(profile.about || profile.summary || '').substring(0, 200)}...`
                                : (profile.about || profile.summary)
                            }
                        </p>
                    </div>
                )}

                {/* Enhanced LinkedIn Data Sections */}
                {(profile.linkedinExperiences || profile.education || profile.linkedinSkills) && (
                    <div className="mb-6 space-y-4">
                        {/* Experience Section */}
                        {profile.linkedinExperiences && profile.linkedinExperiences.length > 0 && (
                            <div>
                                <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-linkedin-600" />
                                    Experience
                                </h5>
                                <div className="space-y-2">
                                    {profile.linkedinExperiences.slice(0, 3).map((exp, index) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-sm font-medium text-gray-900">{exp.title}</p>
                                            {exp.company && (
                                                <p className="text-xs text-gray-600">{exp.company}</p>
                                            )}
                                            {exp.duration && (
                                                <p className="text-xs text-gray-500">{exp.duration}</p>
                                            )}
                                        </div>
                                    ))}
                                    {profile.linkedinExperiences.length > 3 && (
                                        <p className="text-xs text-gray-500 text-center">
                                            +{profile.linkedinExperiences.length - 3} more experiences
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Education Section */}
                        {profile.education && profile.education.length > 0 && (
                            <div>
                                <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-linkedin-600" />
                                    Education
                                </h5>
                                <div className="space-y-2">
                                    {profile.education.slice(0, 2).map((edu, index) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-sm font-medium text-gray-900">{edu.school}</p>
                                            {edu.degree && (
                                                <p className="text-xs text-gray-600">{edu.degree}</p>
                                            )}
                                            {edu.field && (
                                                <p className="text-xs text-gray-500">{edu.field}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Skills Section */}
                        {profile.linkedinSkills && profile.linkedinSkills.length > 0 && (
                            <div>
                                <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Star className="w-4 h-4 text-linkedin-600" />
                                    Skills
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {profile.linkedinSkills.slice(0, 8).map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 bg-linkedin-50 text-linkedin-700 text-xs rounded-full border border-linkedin-200"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {profile.linkedinSkills.length > 8 && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                            +{profile.linkedinSkills.length - 8} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Profile Information Notice */}
                <div className="mb-6 p-4 bg-gradient-to-r from-linkedin-50 to-blue-50 border border-linkedin-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-linkedin-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h5 className="text-sm font-semibold text-linkedin-900 mb-1">
                                LinkedIn Profile Connected
                            </h5>
                            <p className="text-sm text-linkedin-700 mb-2">
                                Your LinkedIn account is connected and verified. Profile information is retrieved via LinkedIn OAuth API.
                            </p>
                            <p className="text-xs text-linkedin-600">
                                Profile data from LinkedIn OAuth API. Includes basic profile information and professional context.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-linkedin-50 rounded-xl">
                        <span className="text-sm font-medium text-linkedin-700">AI Content Generation</span>
                        <span className="text-sm font-bold text-linkedin-600">
                            {profile.professionalContext.hasDetailedProfile ? 'Enhanced' : 'Basic'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                        <span className="text-sm font-medium text-green-700">Profile Status</span>
                        <span className="text-sm font-bold text-green-600">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                        <span className="text-sm font-medium text-purple-700">Content Suggestions</span>
                        <span className="text-sm font-bold text-purple-600">
                            {profile.headline ? 'Industry-Specific' : 'Personalized'}
                        </span>
                    </div>
                    {profile.professionalContext.hasDetailedProfile && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                            <span className="text-sm font-medium text-blue-700">Profile Data</span>
                            <span className="text-sm font-bold text-blue-600">Complete</span>
                        </div>
                    )}
                </div>

                {/* Last Updated */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <Calendar className="w-3 h-3" />
                        Last updated: {new Date(profile.lastUpdated).toLocaleDateString()}
                    </p>

                    {/* Debug Info - Show current scopes in development */}
                    {import.meta.env.DEV && (
                        <details className="text-xs text-gray-400">
                            <summary className="cursor-pointer hover:text-gray-600">
                                Debug: OAuth Scopes
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <p><strong>Current:</strong> {profile.professionalContext.availableScopes.join(', ')}</p>
                                <p><strong>Auth Method:</strong> {profile.professionalContext.authenticatedVia}</p>
                                <p><strong>Enhanced Profile:</strong> {profile.professionalContext.hasDetailedProfile ? 'Yes' : 'No'}</p>
                            </div>
                        </details>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default LinkedInProfileShowcase;
