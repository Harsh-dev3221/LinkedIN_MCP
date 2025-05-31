import React, { useState, useEffect } from 'react';
import {
    LogOut,
    RefreshCw,
    Coins,
    Linkedin,
    TrendingUp,
    Sparkles,
    CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserDashboardProps {
    onCreatePost: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ onCreatePost }) => {
    const { user, tokenStatus, linkedinConnected, linkedinStatusLoading, connectLinkedIn, signOut, refreshTokenStatus, refreshLinkedInStatus } = useAuth();
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
        <div className="min-h-screen py-8 bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30 relative">
            {/* Background Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-linkedin-100/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Welcome Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{
                        background: 'linear-gradient(135deg, #0A66C2 0%, #F5A623 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Welcome back, {user?.name?.split(' ')[0] || 'Creator'}
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed">
                        Ready to create engaging LinkedIn content?
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* User Profile Card */}
                    <div className="lg:col-span-4">
                        <div className="h-fit bg-white/95 backdrop-blur-xl border-2 border-white/60 rounded-3xl shadow-soft-lg hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-4">
                                        {user?.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.name || 'User'}
                                                className="w-16 h-16 rounded-2xl border-3 border-linkedin-500 object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl border-3 border-linkedin-500 bg-gradient-to-br from-linkedin-500 to-linkedin-600 flex items-center justify-center text-white font-bold text-xl">
                                                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                {user?.name || 'User'}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {user?.email}
                                            </p>
                                            <span
                                                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-white capitalize"
                                                style={{ backgroundColor: getProviderColor(user?.provider || '') }}
                                            >
                                                {user?.provider}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSignOut}
                                        className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all duration-300 group"
                                        title="Sign out"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Token Status Card */}
                    <div className="lg:col-span-8">
                        <div className="bg-white/95 backdrop-blur-xl border-2 border-white/60 rounded-3xl shadow-soft-lg hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-2xl shadow-linkedin">
                                            <Coins className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            Daily Tokens
                                        </h3>
                                    </div>
                                    <button
                                        onClick={handleRefreshTokens}
                                        className="p-2 text-gray-500 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-xl transition-all duration-300"
                                        title="Refresh token status"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                </div>

                                {tokenStatus ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="p-4 text-center bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="text-3xl font-bold text-green-600 mb-1">
                                                    {tokenStatus.tokens_remaining}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Remaining
                                                </div>
                                            </div>
                                            <div className="p-4 text-center bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="text-3xl font-bold text-orange-500 mb-1">
                                                    {tokenStatus.tokens_used_today}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Used Today
                                                </div>
                                            </div>
                                            <div className="p-4 text-center bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="text-3xl font-bold text-linkedin-600 mb-1">
                                                    {tokenStatus.daily_tokens}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Daily Limit
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${(tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100 > 50
                                                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                                                        : (tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100 > 20
                                                            ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                                            : 'bg-gradient-to-r from-red-500 to-red-600'
                                                        }`}
                                                    style={{
                                                        width: `${(tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 text-center">
                                            Tokens refresh daily at midnight UTC
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-gray-600">
                                        Loading token status...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Token Usage Guide */}
                    <div className="lg:col-span-6">
                        <div className="bg-white/95 backdrop-blur-xl border-2 border-white/60 rounded-3xl shadow-soft-lg hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1">
                            <div className="p-6">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-orange">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Token Usage Guide
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <span className="font-medium text-gray-700">Basic Post Generation</span>
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                                            FREE
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <span className="font-medium text-gray-700">AI-Enhanced Single Post</span>
                                        <span className="px-3 py-1 bg-linkedin-100 text-linkedin-700 text-xs font-semibold rounded-lg">
                                            5 tokens
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <span className="font-medium text-gray-700">Multi-Image Post Generation</span>
                                        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg">
                                            10 tokens
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LinkedIn Connection Card */}
                    <div className="lg:col-span-6">
                        <div className="bg-white/95 backdrop-blur-xl border-2 border-white/60 rounded-3xl shadow-soft-lg hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-linkedin-600 rounded-2xl shadow-linkedin">
                                            <Linkedin className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            LinkedIn Connection
                                        </h3>
                                    </div>
                                    <button
                                        onClick={handleRefreshLinkedIn}
                                        disabled={isRefreshingLinkedIn}
                                        className="p-2 text-gray-500 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-xl transition-all duration-300 disabled:opacity-50"
                                        title="Refresh LinkedIn connection status"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${isRefreshingLinkedIn ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {linkedinStatusLoading ? (
                                    <div className="text-center py-4">
                                        <div className="inline-flex items-center space-x-2 p-3 bg-blue-100 border-2 border-blue-200 rounded-2xl mb-4">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="font-semibold text-blue-700">
                                                Checking Connection...
                                            </span>
                                        </div>
                                        <p className="text-gray-600">
                                            Please wait while we verify your LinkedIn connection status
                                        </p>
                                    </div>
                                ) : linkedinConnected ? (
                                    <div className="text-center py-4">
                                        <div className="inline-flex items-center space-x-2 p-3 bg-green-100 border-2 border-green-200 rounded-2xl mb-4">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="font-semibold text-green-700">
                                                Connected & Ready
                                            </span>
                                        </div>
                                        <p className="text-gray-600">
                                            Your LinkedIn account is connected and ready for posting
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-600 mb-6">
                                            Connect your LinkedIn account to start creating and publishing posts
                                        </p>
                                        <button
                                            onClick={connectLinkedIn}
                                            className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-linkedin-600 text-linkedin-600 font-semibold rounded-xl hover:bg-linkedin-600 hover:text-white transition-all duration-300 transform hover:-translate-y-1"
                                        >
                                            <Linkedin className="w-5 h-5" />
                                            <span>Connect LinkedIn</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Create Post Button */}
                    <div className="lg:col-span-12">
                        <div className={`text-center text-white rounded-3xl shadow-soft-lg transition-all duration-300 hover:-translate-y-1 ${linkedinConnected
                            ? 'bg-gradient-to-br from-linkedin-600 to-linkedin-700'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                            <div className="p-8">
                                <div className="flex items-center justify-center space-x-3 mb-4">
                                    <Sparkles className="w-8 h-8" />
                                    <h2 className="text-2xl font-bold">
                                        {linkedinConnected ? 'Ready to Create Amazing Content?' : 'Connect LinkedIn to Get Started'}
                                    </h2>
                                </div>
                                <p className="text-lg mb-6 opacity-90">
                                    {linkedinConnected
                                        ? 'Transform your ideas into engaging LinkedIn posts with AI-powered assistance'
                                        : 'Connect your LinkedIn account to unlock the full potential of AI-powered content creation'
                                    }
                                </p>
                                <button
                                    onClick={onCreatePost}
                                    disabled={!linkedinConnected}
                                    className={`px-8 py-4 bg-white font-semibold text-lg rounded-2xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed ${linkedinConnected
                                        ? 'text-linkedin-600 hover:bg-gray-50 shadow-lg'
                                        : 'text-gray-500'
                                        }`}
                                >
                                    {linkedinConnected ? 'Create LinkedIn Post' : 'Connect LinkedIn First'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
