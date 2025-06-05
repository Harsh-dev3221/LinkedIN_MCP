import React, { useState } from 'react';
import {
    ArrowLeft,
    TrendingUp,
    BarChart3,
    PieChart,
    Activity,
    Download,
    RefreshCw
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

interface AnalyticsPageProps {
    onBack: () => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
    const { postHistory, loading, refreshAllData } = useDashboardData();
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshAllData();
        setIsRefreshing(false);
    };

    // Calculate extended analytics
    const extendedStats = React.useMemo(() => {
        if (!postHistory.length) return null;

        const now = new Date();
        const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

        const filteredPosts = postHistory.filter(post =>
            new Date(post.created_at) >= startDate
        );

        // Post type distribution
        const postTypes = filteredPosts.reduce((acc, post) => {
            acc[post.post_type] = (acc[post.post_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Daily activity for extended period
        const dailyActivity = [];
        for (let i = daysBack - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayPosts = filteredPosts.filter(post => {
                const postDate = new Date(post.created_at);
                return postDate.toDateString() === date.toDateString();
            });

            dailyActivity.push({
                date: date.toISOString().split('T')[0],
                posts: dayPosts.length,
                tokens: dayPosts.reduce((sum, post) => sum + post.tokens_used, 0)
            });
        }

        // Hourly distribution
        const hourlyDistribution = Array(24).fill(0);
        filteredPosts.forEach(post => {
            const hour = new Date(post.created_at).getHours();
            hourlyDistribution[hour]++;
        });

        return {
            totalPosts: filteredPosts.length,
            totalTokens: filteredPosts.reduce((sum, post) => sum + post.tokens_used, 0),
            postTypes,
            dailyActivity,
            hourlyDistribution,
            avgPostsPerDay: filteredPosts.length / daysBack
        };
    }, [postHistory, timeRange]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30 flex items-center justify-center">
                <div className="flex items-center space-x-3">
                    <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
                    <span className="text-xl font-medium text-gray-700">Loading analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between lg:hidden">
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                aria-label="Go back to dashboard"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
                                <p className="text-xs text-gray-600">LinkedIn insights</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
                                aria-label={isRefreshing ? "Refreshing analytics data" : "Refresh analytics data"}
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Time Range Filter */}
                    <div className="mt-3 lg:hidden">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            aria-label="Select time range for analytics"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                type="button"
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                aria-label="Go back to dashboard"
                            >
                                <ArrowLeft className="w-6 h-6 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                                <p className="text-gray-600">Detailed insights into your LinkedIn activity</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {/* Time Range Filter */}
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                aria-label="Select time range for analytics"
                            >
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="90d">Last 90 days</option>
                            </select>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>

                            <button
                                type="button"
                                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
                            >
                                <Download className="w-4 h-4" />
                                <span>Export</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-2xl border-2 border-orange-200 p-3 sm:p-4 lg:p-6 shadow-soft">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-orange-600 text-xs sm:text-sm font-medium">Total Posts</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-700 mt-1">
                                    {extendedStats?.totalPosts || 0}
                                </p>
                            </div>
                            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-orange-600 flex-shrink-0" />
                        </div>
                    </div>

                    <div className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-2xl border-2 border-linkedin-200 p-3 sm:p-4 lg:p-6 shadow-soft">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-linkedin-600 text-xs sm:text-sm font-medium">Tokens Used</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-linkedin-700 mt-1">
                                    {extendedStats?.totalTokens || 0}
                                </p>
                            </div>
                            <Activity className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-linkedin-600 flex-shrink-0" />
                        </div>
                    </div>

                    <div className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-2xl border-2 border-green-200 p-3 sm:p-4 lg:p-6 shadow-soft">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-green-600 text-xs sm:text-sm font-medium">Avg/Day</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700 mt-1">
                                    {extendedStats?.avgPostsPerDay.toFixed(1) || '0.0'}
                                </p>
                            </div>
                            <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
                        </div>
                    </div>

                    <div className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-2xl border-2 border-purple-200 p-3 sm:p-4 lg:p-6 shadow-soft">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-purple-600 text-xs sm:text-sm font-medium">Efficiency</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-700 mt-1">
                                    {extendedStats?.totalPosts ?
                                        `${(extendedStats.totalTokens / extendedStats.totalPosts).toFixed(1)}` : '0'
                                    }
                                </p>
                                <p className="text-xs text-gray-500">tokens/post</p>
                            </div>
                            <PieChart className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-purple-600 flex-shrink-0" />
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    {/* Daily Activity Chart */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-2xl border-2 border-gray-200 p-4 sm:p-5 lg:p-6 shadow-soft">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Daily Activity Trend</h3>
                        <div className="h-48 sm:h-56 lg:h-64 flex items-end justify-between space-x-1">
                            {extendedStats?.dailyActivity.slice(-14).map((day, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center">
                                    <div className="w-full bg-gray-100 rounded-t-lg flex flex-col justify-end" style={{ height: '160px' }}>
                                        <div
                                            className="w-full bg-gradient-to-t from-orange-600 to-orange-500 rounded-t-lg"
                                            style={{
                                                height: `${Math.max(8, (day.posts / Math.max(...(extendedStats?.dailyActivity.map(d => d.posts) || [1]))) * 140)}px`
                                            }}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 sm:mt-2 font-medium">
                                        {new Date(day.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="text-xs font-bold text-gray-900">{day.posts}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Post Type Distribution */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-2xl border-2 border-gray-200 p-4 sm:p-5 lg:p-6 shadow-soft">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Post Type Distribution</h3>
                        <div className="space-y-3 sm:space-y-4">
                            {Object.entries(extendedStats?.postTypes || {}).map(([type, count]) => {
                                const total = Object.values(extendedStats?.postTypes || {}).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? (count / total) * 100 : 0;

                                return (
                                    <div key={type} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs sm:text-sm font-medium text-gray-700 capitalize">{type} Posts</span>
                                            <span className="text-xs sm:text-sm text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                                            <div
                                                className={`h-2 sm:h-3 rounded-full ${type === 'basic' ? 'bg-green-500' :
                                                    type === 'single' ? 'bg-linkedin-500' : 'bg-orange-500'
                                                    }`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hourly Activity Heatmap */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl lg:rounded-2xl border-2 border-gray-200 p-4 sm:p-5 lg:p-6 shadow-soft lg:col-span-2">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Optimal Posting Times</h3>

                        {/* Mobile: 6 columns layout */}
                        <div className="grid grid-cols-6 sm:hidden gap-1">
                            {extendedStats?.hourlyDistribution.map((count, hour) => {
                                const maxCount = Math.max(...(extendedStats?.hourlyDistribution || [1]));
                                const intensity = maxCount > 0 ? count / maxCount : 0;

                                return (
                                    <div key={hour} className="text-center">
                                        <div
                                            className={`w-full h-8 rounded border border-gray-200 flex items-center justify-center text-xs font-bold ${intensity > 0.7 ? 'bg-orange-500 text-white' :
                                                intensity > 0.4 ? 'bg-orange-300 text-orange-900' :
                                                    intensity > 0.1 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            {count}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {hour.toString().padStart(2, '0')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Tablet: 8 columns layout */}
                        <div className="hidden sm:grid lg:hidden grid-cols-8 gap-2">
                            {extendedStats?.hourlyDistribution.map((count, hour) => {
                                const maxCount = Math.max(...(extendedStats?.hourlyDistribution || [1]));
                                const intensity = maxCount > 0 ? count / maxCount : 0;

                                return (
                                    <div key={hour} className="text-center">
                                        <div
                                            className={`w-full h-10 rounded-lg border-2 border-gray-200 flex items-center justify-center text-xs font-bold ${intensity > 0.7 ? 'bg-orange-500 text-white' :
                                                intensity > 0.4 ? 'bg-orange-300 text-orange-900' :
                                                    intensity > 0.1 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            {count}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: 12 columns layout */}
                        <div className="hidden lg:grid grid-cols-12 gap-2">
                            {extendedStats?.hourlyDistribution.map((count, hour) => {
                                const maxCount = Math.max(...(extendedStats?.hourlyDistribution || [1]));
                                const intensity = maxCount > 0 ? count / maxCount : 0;

                                return (
                                    <div key={hour} className="text-center">
                                        <div
                                            className={`w-full h-12 rounded-lg border-2 border-gray-200 flex items-center justify-center text-xs font-bold ${intensity > 0.7 ? 'bg-orange-500 text-white' :
                                                intensity > 0.4 ? 'bg-orange-300 text-orange-900' :
                                                    intensity > 0.1 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            {count}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 text-center">
                            <span className="font-medium">Best posting times:</span> Higher intensity indicates more posts created at that hour
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
