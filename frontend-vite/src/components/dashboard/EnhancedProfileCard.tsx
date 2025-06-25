import React, { useState, useEffect } from 'react';
import { Briefcase, Mail, Globe, Sparkles, RefreshCw } from 'lucide-react';
import { User } from '../../lib/supabase';
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
    professionalContext: {
        hasLinkedInProfile: boolean;
        authenticatedVia: string;
        canGenerateIndustryContent: boolean;
    };
}

interface EnhancedProfileCardProps {
    user: User | null;
    onSignOut: () => void;
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

const EnhancedProfileCard: React.FC<EnhancedProfileCardProps> = ({ user, onSignOut }) => {
    const { mcpToken, linkedinConnected, connectLinkedIn } = useAuth();
    const [linkedinProfile, setLinkedinProfile] = useState<LinkedInProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch LinkedIn profile data
    const fetchLinkedInProfile = async () => {
        if (!user || !mcpToken || !linkedinConnected) {
            setError('LinkedIn connection required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const mcpClient = createMcpClient(mcpToken);
            const result = await mcpClient.callTool('get-enhanced-profile-info', {});

            if (result?.content?.[0]?.text) {
                const profileData = JSON.parse(result.content[0].text);
                if (profileData.success && profileData.profile) {
                    setLinkedinProfile(profileData.profile);
                } else {
                    setError('Failed to load LinkedIn profile data');
                }
            } else {
                setError('No profile data received from LinkedIn');
            }
        } catch (err: any) {
            console.error('Error fetching LinkedIn profile:', err);
            setError(err.message || 'Failed to load LinkedIn profile');
        } finally {
            setLoading(false);
        }
    };

    // Load profile data on component mount
    useEffect(() => {
        fetchLinkedInProfile();
    }, [user]);

    // Determine which profile data to use
    const displayProfile = linkedinProfile || {
        fullName: user?.name || 'User',
        email: user?.email || '',
        profilePictureUrl: user?.avatar_url || null,
        initials: user?.name?.charAt(0) || user?.email?.charAt(0) || 'U',
        isVerified: false,
        professionalContext: {
            hasLinkedInProfile: false,
            authenticatedVia: user?.provider || 'Unknown',
            canGenerateIndustryContent: false
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300 sticky top-24">
            {/* Profile Header */}
            <div className="text-center mb-6">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                    {displayProfile.profilePictureUrl ? (
                        <img
                            src={displayProfile.profilePictureUrl}
                            alt={displayProfile.fullName}
                            className="w-20 h-20 rounded-2xl border-2 border-linkedin-200 object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl border-2 border-linkedin-200 bg-gradient-to-br from-linkedin-500 to-linkedin-600 flex items-center justify-center text-white font-bold text-xl">
                            {displayProfile.initials}
                        </div>
                    )}

                    {/* Verification badge */}
                    {displayProfile.isVerified && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-linkedin-500 border-2 border-white rounded-full flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                    )}

                    {/* Online indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>

                {/* User Info */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {displayProfile.fullName}
                    </h3>
                    {displayProfile.email && (
                        <p className="text-sm text-gray-600 mb-2 flex items-center justify-center gap-1">
                            <Mail className="w-3 h-3" />
                            {displayProfile.email}
                        </p>
                    )}

                    {/* LinkedIn Status */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-white capitalize ${displayProfile.professionalContext.hasLinkedInProfile
                                ? 'bg-linkedin-500'
                                : 'bg-gray-500'
                                }`}
                        >
                            <Briefcase className="w-3 h-3 mr-1" />
                            {displayProfile.professionalContext.hasLinkedInProfile ? 'LinkedIn Pro' : user?.provider + ' Account'}
                        </span>

                        {loading && (
                            <RefreshCw className="w-4 h-4 text-linkedin-500 animate-spin" />
                        )}
                    </div>
                </div>
            </div>

            {/* Professional Features */}
            {displayProfile.professionalContext.hasLinkedInProfile && (
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 bg-linkedin-50 rounded-xl">
                        <span className="text-sm font-medium text-linkedin-700">LinkedIn Status</span>
                        <span className="text-sm font-bold text-linkedin-600">Connected</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                        <span className="text-sm font-medium text-green-700">AI Content</span>
                        <span className="text-sm font-bold text-green-600">Enhanced</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                        <span className="text-sm font-medium text-purple-700">Profile Type</span>
                        <span className="text-sm font-bold text-purple-600">Professional</span>
                    </div>
                </div>
            )}

            {/* Standard Features for non-LinkedIn users */}
            {!displayProfile.professionalContext.hasLinkedInProfile && (
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                        <span className="text-sm font-medium text-orange-700">Status</span>
                        <span className="text-sm font-bold text-orange-600">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                        <span className="text-sm font-medium text-blue-700">Plan</span>
                        <span className="text-sm font-bold text-blue-600">Free</span>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                    <button
                        onClick={fetchLinkedInProfile}
                        className="text-xs text-red-500 hover:text-red-700 mt-1 flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                    </button>
                </div>
            )}

            {/* LinkedIn Connection Actions */}
            {linkedinConnected ? (
                <button
                    type="button"
                    onClick={fetchLinkedInProfile}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 mb-3 text-linkedin-600 hover:text-white hover:bg-linkedin-500 border border-linkedin-200 hover:border-linkedin-500 rounded-xl transition-all duration-300 font-medium text-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh LinkedIn Profile</span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={connectLinkedIn}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 mb-3 text-white bg-linkedin-500 hover:bg-linkedin-600 border border-linkedin-500 hover:border-linkedin-600 rounded-xl transition-all duration-300 font-medium text-sm"
                >
                    <Briefcase className="w-4 h-4" />
                    <span>Connect LinkedIn</span>
                </button>
            )}

            {/* Sign Out Button */}
            <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-xl transition-all duration-300 font-medium"
            >
                <Globe className="w-4 h-4" />
                <span>Sign Out</span>
            </button>
        </div>
    );
};

export default EnhancedProfileCard;
