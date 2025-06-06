import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import AnalyticsPage from '../analytics/AnalyticsPage';
import ScheduledPostsCard from './ScheduledPostsCard';
import SchedulePostModal from './SchedulePostModal';
import ScheduledPostsPage from './ScheduledPostsPage';
import DraftsCard from './DraftsCard';
import { logger } from '../../utils/logger';
import {
    Sparkles,
    BarChart3,
    Zap,
    Users,
    TrendingUp,
    Calendar,
    Settings,
    LogOut,
    Menu,
    X,
    Plus,
    Activity,
    Target,
    RefreshCw,
    ChevronRight,
    Lock,
    PanelLeftClose,
    PanelLeftOpen,
    FileText
} from 'lucide-react';

interface DashboardLayoutProps {
    onCreatePost: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onCreatePost }) => {
    const {
        user,
        tokenStatus,
        linkedinConnected,
        linkedinStatusLoading,
        mcpToken,
        connectLinkedIn,
        signOut,
        refreshTokenStatus,
        refreshLinkedInStatus
    } = useAuth();

    const {
        weeklyStats,
        analytics,
        postHistory,
        loading: dashboardLoading,
        error: dashboardError,
        refreshAllData
    } = useDashboardData();

    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop sidebar collapse
    const [isRefreshingLinkedIn, setIsRefreshingLinkedIn] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showScheduledPosts, setShowScheduledPosts] = useState(false);

    // Force refresh LinkedIn status when component mounts
    useEffect(() => {
        logger.debug('DashboardLayout mounted, refreshing LinkedIn status');
        refreshLinkedInStatus();
    }, [refreshLinkedInStatus]);

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            logger.error('Error signing out:', error);
        }
    };

    const handleRefreshTokens = async () => {
        try {
            logger.debug('Refreshing token status');
            await refreshTokenStatus();
            logger.debug('Token status after refresh');

            // If still no token status, try to initialize tokens manually
            if (!tokenStatus && user && mcpToken) {
                logger.debug('No token status found, attempting manual initialization');
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/tokens/init`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${mcpToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        await response.json();
                        logger.debug('Manual token initialization successful');
                        await refreshTokenStatus();
                    } else {
                        logger.debug('Manual token initialization failed');
                    }
                } catch (initError) {
                    logger.error('Error during manual token initialization:', initError);
                }
            }
        } catch (error) {
            logger.error('Error refreshing tokens:', error);
        }
    };

    const handleRefreshLinkedIn = async () => {
        try {
            setIsRefreshingLinkedIn(true);
            await refreshLinkedInStatus();
        } catch (error) {
            logger.error('Error refreshing LinkedIn status:', error);
        } finally {
            setIsRefreshingLinkedIn(false);
        }
    };

    const handleComingSoonFeature = () => {
        setShowToast(true);
    };

    // Calculate usage statistics
    const tokensUsed = tokenStatus ? tokenStatus.daily_tokens - tokenStatus.tokens_remaining : 0;
    const usagePercentage = tokenStatus ? (tokensUsed / tokenStatus.daily_tokens) * 100 : 0;

    // Use real data from API or fallback to empty arrays
    const displayWeeklyStats = weeklyStats.length > 0 ? weeklyStats : [
        { day: 'Mon', posts: 0, engagement: 0 },
        { day: 'Tue', posts: 0, engagement: 0 },
        { day: 'Wed', posts: 0, engagement: 0 },
        { day: 'Thu', posts: 0, engagement: 0 },
        { day: 'Fri', posts: 0, engagement: 0 },
        { day: 'Sat', posts: 0, engagement: 0 },
        { day: 'Sun', posts: 0, engagement: 0 }
    ];

    // Convert post history to recent activity format
    const recentActivity = postHistory.slice(0, 4).map((post) => ({
        id: post.id,
        action: `Published ${post.post_type} post`,
        time: new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        status: 'success' as const,
        tokens: post.tokens_used
    }));

    // Add fallback activity if no posts
    const displayActivity = recentActivity.length > 0 ? recentActivity : [
        { id: 1, action: 'Account created', time: 'Today', status: 'success' as const },
        { id: 2, action: 'Welcome bonus received', time: 'Today', status: 'info' as const }
    ];

    const sidebarItems = [
        { icon: BarChart3, label: 'Dashboard', active: true, locked: false, action: null },
        { icon: Calendar, label: 'Schedule', active: false, locked: false, action: () => setShowScheduleModal(true) },
        { icon: FileText, label: 'Drafts', active: false, locked: true, action: null },
        { icon: Users, label: 'Audience', active: false, locked: true, action: null },
        { icon: Activity, label: 'Analytics', active: false, locked: true, action: null },
        { icon: Target, label: 'Goals', active: false, locked: true, action: null },
        { icon: Settings, label: 'Settings', active: false, locked: true, action: null }
    ];

    // Show analytics page if requested
    if (showAnalytics) {
        return <AnalyticsPage onBack={() => setShowAnalytics(false)} />;
    }

    if (showScheduledPosts) {
        return <ScheduledPostsPage onBack={() => setShowScheduledPosts(false)} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30 relative">
            {/* Background Elements - Matching Landing Page Design */}
            <div className="absolute inset-0 bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30"></div>
            <div className="absolute top-20 left-10 w-72 h-72 bg-orange-100/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-linkedin-100/20 rounded-full blur-3xl animate-float [animation-delay:2s]"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-orange-200/10 via-orange-100/5 to-transparent rounded-full blur-3xl"></div>

            {/* Sidebar - Always fixed positioning */}
            <div className={`fixed inset-y-0 left-0 z-50 bg-white/95 backdrop-blur-xl border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
                } w-64`}>
                {/* Sidebar Header */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                    <div className={`flex items-center transition-all duration-300 ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : 'space-x-3'}`}>
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-xl shadow-linkedin flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <div className="hidden lg:flex lg:flex-col">
                                <span className="text-xl font-bold text-gray-900">PostWizz</span>
                                <span className="-mt-1 text-xs text-gray-500">LinkedIn Content Creator</span>
                            </div>
                        )}
                        <div className="flex flex-col lg:hidden">
                            <span className="text-xl font-bold text-gray-900">PostWizz</span>
                            <span className="-mt-1 text-xs text-gray-500">LinkedIn Content Creator</span>
                        </div>
                    </div>

                    {/* Mobile close button */}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Desktop collapse button */}
                    <button
                        type="button"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:block text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>

                {/* User Profile in Sidebar */}
                <div className={`border-b border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'p-3' : 'p-6'}`}>
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.name || 'User'}
                                className={`rounded-xl object-cover border-2 border-linkedin-200 transition-all duration-300 ${sidebarCollapsed ? 'w-10 h-10' : 'w-12 h-12'
                                    }`}
                                title={sidebarCollapsed ? user?.name || 'User' : undefined}
                            />
                        ) : (
                            <div
                                className={`rounded-xl bg-gradient-to-br from-linkedin-500 to-linkedin-600 flex items-center justify-center text-white font-bold shadow-linkedin transition-all duration-300 ${sidebarCollapsed ? 'w-10 h-10 text-base' : 'w-12 h-12 text-lg'
                                    }`}
                                title={sidebarCollapsed ? user?.name || 'User' : undefined}
                            >
                                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </div>
                        )}
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-900 font-semibold truncate">
                                    {user?.name || 'User'}
                                </p>
                                <p className="text-gray-600 text-sm truncate">
                                    {user?.email}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation - Scrollable Content with proper flex layout */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <nav className="flex-1 overflow-y-auto mt-6 px-3 pb-4 custom-scrollbar">
                        <div className="space-y-1">
                            {sidebarItems.map((item, index) => (
                                <button
                                    type="button"
                                    key={index}
                                    onClick={item.locked ? handleComingSoonFeature : item.action || undefined}
                                    className={`w-full flex items-center rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'justify-between px-3 py-3'
                                        } text-sm font-medium ${item.active
                                            ? 'bg-gradient-to-r from-linkedin-500 to-linkedin-600 text-white shadow-linkedin'
                                            : item.locked
                                                ? 'text-gray-400 hover:bg-gray-50 cursor-pointer'
                                                : 'text-gray-600 hover:bg-linkedin-50 hover:text-linkedin-700'
                                        }`}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    <div className={`flex items-center ${sidebarCollapsed ? '' : 'mr-3'}`}>
                                        <item.icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                                        {!sidebarCollapsed && item.label}
                                    </div>
                                    {!sidebarCollapsed && item.locked && (
                                        <Lock className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </nav>
                </div>

                {/* Sign Out Button - Sticky at bottom of viewport */}
                <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white/95 backdrop-blur-xl mt-auto">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className={`w-full flex items-center text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-3'
                            }`}
                        title={sidebarCollapsed ? "Sign Out" : undefined}
                    >
                        <LogOut className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && 'Sign Out'}
                    </button>
                </div>
            </div>

            {/* Main Content - Account for fixed sidebar */}
            <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Top Header - Mobile Optimized */}
                <header className="sticky top-0 z-50 border-b border-gray-100 shadow-sm bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4">
                    {/* Mobile Layout */}
                    <div className="flex items-center justify-between lg:hidden">
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Open sidebar"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                                    Good morning, <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Creator'}</span>!
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {/* Mobile Create Post Button */}
                            <button
                                type="button"
                                onClick={onCreatePost}
                                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold shadow-orange hover:shadow-orange-lg hover:-translate-y-1 transition-all duration-300 flex items-center space-x-1 sm:space-x-2"
                            >
                                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="text-sm sm:text-base">Create</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Subtitle */}
                    <div className="lg:hidden mt-2">
                        <p className="text-sm sm:text-base text-gray-600">
                            Ready to create engaging content?
                        </p>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Good morning, <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Creator'}</span>!
                                </h1>
                                <p className="text-lg text-gray-600">
                                    Ready to create engaging content that drives results?
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Desktop Create Post Button */}
                            <button
                                type="button"
                                onClick={onCreatePost}
                                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold shadow-orange hover:shadow-orange-lg hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2"
                            >
                                <Sparkles className="w-5 h-5" />
                                <span>Create Post</span>
                            </button>

                            <div className="text-right">
                                <p className="text-sm text-gray-500">Today's date</p>
                                <p className="font-semibold text-gray-900">
                                    {new Date().toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 relative">
                    {/* Loading State */}
                    {dashboardLoading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center space-x-3">
                                <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
                                <span className="text-gray-600 font-medium">Loading dashboard data...</span>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {dashboardError && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                    <X className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-red-800">Error loading dashboard data</h4>
                                    <p className="text-sm text-red-600">{dashboardError}</p>
                                </div>
                                <button
                                    onClick={refreshAllData}
                                    className="ml-auto px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Quick Stats Cards - Mobile Optimized */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
                        {/* Tokens Remaining */}
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border-2 border-orange-200 p-4 sm:p-5 lg:p-6 hover:shadow-orange hover:-translate-y-1 transition-all duration-300 shadow-soft">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-orange-600 text-xs sm:text-sm font-medium">Tokens Remaining</p>
                                    <p className="text-2xl sm:text-3xl font-bold mt-1 text-orange-700">
                                        {tokenStatus?.tokens_remaining || 0}
                                    </p>
                                    <p className="text-gray-600 text-xs sm:text-sm">
                                        of {tokenStatus?.daily_tokens || 50} daily
                                    </p>
                                </div>
                                <div className="p-2 sm:p-3 bg-orange-50 rounded-xl shadow-soft flex-shrink-0">
                                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 drop-shadow-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Posts Created */}
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border-2 border-linkedin-200 p-4 sm:p-5 lg:p-6 hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300 shadow-soft">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-linkedin-600 text-xs sm:text-sm font-medium">Posts Created</p>
                                    <p className="text-2xl sm:text-3xl font-bold mt-1 text-linkedin-700">
                                        {analytics?.thisWeekPosts || 0}
                                    </p>
                                    <p className="text-gray-600 text-xs sm:text-sm">this week</p>
                                </div>
                                <div className="p-2 sm:p-3 bg-linkedin-50 rounded-xl shadow-soft flex-shrink-0">
                                    <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-linkedin-600 drop-shadow-sm" />
                                </div>
                            </div>
                        </div>

                        {/* LinkedIn Status */}
                        <div className={`bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border-2 p-4 sm:p-5 lg:p-6 hover:-translate-y-1 transition-all duration-300 shadow-soft ${linkedinConnected
                            ? 'border-orange-200 hover:shadow-orange'
                            : 'border-gray-200 hover:shadow-soft-lg'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs sm:text-sm font-medium ${linkedinConnected ? 'text-orange-600' : 'text-gray-600'
                                        }`}>
                                        LinkedIn Status
                                    </p>
                                    <p className={`text-lg sm:text-xl font-bold mt-1 ${linkedinConnected ? 'text-orange-700' : 'text-gray-700'
                                        }`}>
                                        {linkedinConnected ? 'Connected' : 'Disconnected'}
                                    </p>
                                    <p className="text-gray-600 text-xs sm:text-sm">
                                        {linkedinConnected ? 'Ready to post' : 'Connect to continue'}
                                    </p>
                                </div>
                                <div className={`p-2 sm:p-3 rounded-xl shadow-soft flex-shrink-0 ${linkedinConnected ? 'bg-orange-50' : 'bg-gray-50'
                                    }`}>
                                    <Users className={`w-6 h-6 sm:w-8 sm:h-8 drop-shadow-sm ${linkedinConnected ? 'text-orange-600' : 'text-gray-600'
                                        }`} />
                                </div>
                            </div>
                        </div>

                        {/* Engagement Rate */}
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border-2 border-linkedin-200 p-4 sm:p-5 lg:p-6 hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300 shadow-soft">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-linkedin-600 text-xs sm:text-sm font-medium">Avg. Engagement</p>
                                    <p className="text-2xl sm:text-3xl font-bold mt-1 text-linkedin-700">
                                        {analytics?.avgEngagement ? `${analytics.avgEngagement}%` : '--'}
                                    </p>
                                    <p className="text-gray-600 text-xs sm:text-sm">last 7 days</p>
                                </div>
                                <div className="p-2 sm:p-3 bg-linkedin-50 rounded-xl shadow-soft flex-shrink-0">
                                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-linkedin-600 drop-shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Dashboard Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                            {/* Weekly Activity Chart */}
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border-2 border-linkedin-200 p-4 sm:p-5 lg:p-6 shadow-soft hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Weekly Activity</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowAnalytics(true)}
                                        className="text-xs sm:text-sm text-linkedin-600 hover:text-linkedin-700 font-medium px-2 sm:px-3 py-1 rounded-lg hover:bg-linkedin-50 transition-colors flex items-center space-x-1"
                                    >
                                        <span>View all</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
                                    {displayWeeklyStats.map((stat, index) => (
                                        <div key={index} className="text-center">
                                            <div className="text-xs text-gray-600 mb-1 sm:mb-2 font-medium">{stat.day}</div>
                                            <div className="h-16 sm:h-20 bg-gray-100 rounded-lg sm:rounded-xl flex flex-col justify-end p-1 sm:p-2 border-2 border-gray-200">
                                                <div
                                                    className="bg-gradient-to-t from-orange-600 to-orange-500 rounded-md sm:rounded-lg shadow-lg border border-orange-700"
                                                    style={{ height: `${(stat.posts / 3) * 100}%`, minHeight: stat.posts > 0 ? '8px' : '0px' }}
                                                ></div>
                                            </div>
                                            <div className="text-xs sm:text-sm font-bold text-gray-900 mt-1 sm:mt-2">{stat.posts}</div>
                                            <div className="text-xs text-gray-600 font-medium">posts</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Token Usage Details */}
                            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-orange-200 p-6 shadow-soft hover:shadow-orange hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-gray-900">Token Usage</h3>
                                    <button
                                        type="button"
                                        onClick={handleRefreshTokens}
                                        className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                                        title="Refresh token status"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Daily Usage</span>
                                        <span className="text-sm text-gray-500">
                                            {tokenStatus?.tokens_used_today || 0} / {tokenStatus?.daily_tokens || 50} tokens
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-4 border-2 border-gray-300 shadow-inner">
                                        <div
                                            className="bg-gradient-to-r from-orange-600 to-orange-700 h-4 rounded-full transition-all duration-500 shadow-lg border border-orange-800"
                                            style={{ width: `${Math.min(100, usagePercentage)}%` }}
                                        ></div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-6">
                                        <div className="text-center p-4 bg-beige-50 rounded-2xl border-2 border-beige-200 hover:scale-105 transition-transform duration-300">
                                            <div className="text-2xl font-bold text-orange-600">FREE</div>
                                            <div className="text-sm text-orange-700 font-medium">Basic Posts</div>
                                            <div className="text-xs text-gray-600 mt-1">Simple text content</div>
                                        </div>
                                        <div className="text-center p-4 bg-linkedin-50 rounded-2xl border-2 border-linkedin-200 hover:scale-105 transition-transform duration-300">
                                            <div className="text-2xl font-bold text-linkedin-600">5</div>
                                            <div className="text-sm text-linkedin-700 font-medium">Enhanced</div>
                                            <div className="text-xs text-gray-600 mt-1">AI optimization</div>
                                        </div>
                                        <div className="text-center p-4 bg-orange-50 rounded-2xl border-2 border-orange-200 hover:scale-105 transition-transform duration-300">
                                            <div className="text-2xl font-bold text-orange-600">10</div>
                                            <div className="text-sm text-orange-700 font-medium">Multi-Image</div>
                                            <div className="text-xs text-gray-600 mt-1">Carousel posts</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-linkedin-200 p-6 shadow-soft hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
                                <div className="space-y-4">
                                    {displayActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-center space-x-4 p-4 hover:bg-linkedin-50 rounded-xl transition-colors border-2 border-transparent hover:border-linkedin-200 shadow-sm hover:shadow-md">
                                            <div className={`w-4 h-4 rounded-full border-2 shadow-lg ${activity.status === 'success'
                                                ? 'bg-orange-500 border-orange-600 shadow-orange-500/50'
                                                : 'bg-linkedin-500 border-linkedin-600 shadow-linkedin-500/50'
                                                }`}></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900">{activity.action}</p>
                                                <p className="text-xs text-gray-600 font-medium">{activity.time}</p>
                                                {'tokens' in activity && (
                                                    <p className="text-xs text-orange-600 font-medium">{activity.tokens} tokens used</p>
                                                )}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scheduled Posts */}
                            <ScheduledPostsCard onViewAll={() => setShowScheduledPosts(true)} />

                            {/* Drafts */}
                            <DraftsCard onViewAll={() => {/* TODO: Add drafts page */ }} />
                        </div>

                        {/* Right Column - Quick Actions & Status */}
                        <div className="space-y-4 sm:space-y-6">
                            {/* Create Post CTA */}
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-6 text-white shadow-orange hover:shadow-orange-lg hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base sm:text-lg">Create Content</h3>
                                        <p className="text-orange-100 text-xs sm:text-sm">AI-powered LinkedIn posts</p>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl mb-4 backdrop-blur-sm ${linkedinConnected
                                    ? 'bg-white/20 border-2 border-white/40'
                                    : 'bg-white/10 border-2 border-white/30'
                                    }`}>
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full border-2 shadow-lg ${linkedinConnected
                                            ? 'bg-white border-white shadow-white/50'
                                            : 'bg-orange-200 border-orange-300 shadow-orange-200/50'
                                            }`}></div>
                                        <span className="text-sm font-semibold">
                                            {linkedinConnected ? 'Ready to create content' : 'LinkedIn connection required'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={linkedinConnected ? onCreatePost : connectLinkedIn}
                                    className="w-full bg-white text-orange-600 font-semibold py-3 px-4 rounded-xl hover:bg-orange-50 hover:text-orange-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-soft"
                                >
                                    <span>
                                        {linkedinConnected ? 'Create Post' : 'Connect LinkedIn'}
                                    </span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* LinkedIn Connection Status */}
                            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-linkedin-200 p-6 shadow-soft hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900">LinkedIn Connection</h3>
                                    <button
                                        type="button"
                                        onClick={handleRefreshLinkedIn}
                                        disabled={isRefreshingLinkedIn || linkedinStatusLoading}
                                        className="p-2 text-gray-500 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-xl transition-colors disabled:opacity-50"
                                        title="Refresh LinkedIn connection status"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${(isRefreshingLinkedIn || linkedinStatusLoading) ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                <div className={`p-4 rounded-2xl border-2 ${linkedinConnected
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-gray-50 border-gray-200'
                                    }`}>
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-xl shadow-soft ${linkedinConnected ? 'bg-orange-500' : 'bg-gray-500'
                                            }`}>
                                            <Users className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className={`font-semibold ${linkedinConnected ? 'text-orange-700' : 'text-gray-700'
                                                }`}>
                                                {linkedinConnected ? 'Connected & Ready' : 'Not Connected'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {linkedinConnected
                                                    ? 'Your LinkedIn account is connected and ready for posting'
                                                    : 'Connect your LinkedIn account to start creating content'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Tips */}
                            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-orange-200 p-6 shadow-soft hover:shadow-orange hover:-translate-y-1 transition-all duration-300">
                                <h3 className="font-bold text-gray-900 mb-4">💡 Pro Tips</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-linkedin-50 rounded-2xl border border-linkedin-200 hover:scale-105 transition-transform duration-300">
                                        <p className="text-sm font-medium text-linkedin-700">Start with basic posts</p>
                                        <p className="text-xs text-gray-600">Get familiar with the platform using free basic posts</p>
                                    </div>
                                    <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200 hover:scale-105 transition-transform duration-300">
                                        <p className="text-sm font-medium text-orange-700">Use AI enhancement</p>
                                        <p className="text-xs text-gray-600">Upgrade posts for better engagement and reach</p>
                                    </div>
                                    <div className="p-3 bg-beige-50 rounded-2xl border border-beige-200 hover:scale-105 transition-transform duration-300">
                                        <p className="text-sm font-medium text-orange-700">Post consistently</p>
                                        <p className="text-xs text-gray-600">Regular posting builds audience and engagement</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Coming Soon Toast */}
            {showToast && (
                <div className="fixed top-4 left-4 right-4 sm:top-4 sm:right-4 sm:left-auto z-50 animate-in slide-in-from-right duration-300">
                    <div className="bg-white/95 backdrop-blur-xl border-2 border-orange-200 rounded-2xl p-4 shadow-orange max-w-sm mx-auto sm:mx-0">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-50 rounded-xl flex-shrink-0">
                                <Lock className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900">Coming Soon!</h4>
                                <p className="text-sm text-gray-600">This feature is currently in development</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowToast(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                                title="Close notification"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Post Modal */}
            <SchedulePostModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
            />
        </div>
    );
};

export default DashboardLayout;
