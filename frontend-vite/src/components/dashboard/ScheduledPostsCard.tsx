import React, { useState } from 'react';
import { usePendingScheduledPosts } from '../../hooks/useScheduledPosts';
import {
    Clock,
    Calendar,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    XCircle,
    Edit3,
    Trash2,
    Eye
} from 'lucide-react';

interface ScheduledPostsCardProps {
    onViewAll?: () => void;
}

const ScheduledPostsCard: React.FC<ScheduledPostsCardProps> = ({ onViewAll }) => {
    const { pendingPosts, loading, error, refresh } = usePendingScheduledPosts();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refresh(true); // Force refresh
        } finally {
            setIsRefreshing(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return <Clock className="w-4 h-4 text-orange-600" />;
            case 'published':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-gray-600" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'published':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'failed':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'cancelled':
                return 'text-gray-600 bg-gray-50 border-gray-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatScheduledTime = (post: any) => {
        try {
            // For published posts, show the actual published time
            if (post.status === 'published') {
                // Use published_at if available, otherwise fall back to updated_at
                const publishedDate = new Date(post.published_at || post.updated_at);
                return `Published ${publishedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
            }

            // For pending posts, show time until scheduled
            const date = new Date(post.scheduled_time);
            const now = new Date();
            const diffMs = date.getTime() - now.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffMs < 0) {
                return 'Overdue';
            } else if (diffHours < 1) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return `in ${diffMinutes}m`;
            } else if (diffHours < 24) {
                return `in ${diffHours}h`;
            } else if (diffDays < 7) {
                return `in ${diffDays}d`;
            } else {
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (error) {
            return post.scheduled_time;
        }
    };

    return (
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border-2 border-linkedin-200 p-4 sm:p-5 lg:p-6 shadow-soft hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-linkedin-50 rounded-xl">
                        <Calendar className="w-5 h-5 text-linkedin-600" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Scheduled Posts</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Upcoming content</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing || loading}
                        className="p-2 text-gray-500 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Refresh scheduled posts"
                    >
                        <RefreshCw className={`w-4 h-4 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
                    </button>
                    {onViewAll && (
                        <button
                            type="button"
                            onClick={onViewAll}
                            className="text-xs sm:text-sm text-linkedin-600 hover:text-linkedin-700 font-medium px-2 sm:px-3 py-1 rounded-lg hover:bg-linkedin-50 transition-colors flex items-center space-x-1"
                        >
                            <span>View all</span>
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading && !isRefreshing && (
                <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-3">
                        <RefreshCw className="w-5 h-5 text-linkedin-600 animate-spin" />
                        <span className="text-gray-600 text-sm">Loading scheduled posts...</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">Error loading scheduled posts</p>
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && pendingPosts.length === 0 && (
                <div className="text-center py-8">
                    <div className="p-3 bg-gray-50 rounded-xl inline-block mb-3">
                        <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No scheduled posts</p>
                    <p className="text-sm text-gray-500 mt-1">Schedule posts to see them here</p>
                </div>
            )}

            {/* Scheduled Posts List */}
            {!loading && !error && pendingPosts.length > 0 && (
                <div className="space-y-3">
                    {pendingPosts.slice(0, 3).map((post, index) => (
                        <div
                            key={post.id || index}
                            className="p-4 bg-gradient-to-r from-linkedin-50 to-orange-50 rounded-xl border border-linkedin-200 hover:border-linkedin-300 transition-all duration-200 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        {getStatusIcon(post.status)}
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(post.status)}`}>
                                            {post.status?.toUpperCase() || 'PENDING'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatScheduledTime(post)}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-900 font-medium line-clamp-2 mb-2">
                                        {post.content_preview || 'Scheduled post content...'}
                                    </p>

                                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {post.scheduled_time ?
                                                new Date(post.scheduled_time).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) :
                                                'Time not set'
                                            }
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-1 ml-3">
                                    <button
                                        type="button"
                                        className="p-1.5 text-gray-400 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-lg transition-colors"
                                        title="View details"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                        title="Edit schedule"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Cancel post"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {pendingPosts.length > 3 && (
                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={onViewAll}
                                className="text-sm text-linkedin-600 hover:text-linkedin-700 font-medium hover:underline"
                            >
                                View {pendingPosts.length - 3} more scheduled posts
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScheduledPostsCard;
