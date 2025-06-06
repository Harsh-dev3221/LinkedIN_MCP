import React, { useState, useEffect, useMemo } from 'react';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import SchedulePostModal from './SchedulePostModal';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Plus,
    RefreshCw,
    Search,
    Filter,
    Edit3,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    MoreVertical
} from 'lucide-react';

interface ScheduledPostsPageProps {
    onBack: () => void;
}

const ScheduledPostsPage: React.FC<ScheduledPostsPageProps> = ({ onBack }) => {
    const { scheduledPosts, loading, error, fetchScheduledPosts, cancelScheduledPost, reschedulePost } = useScheduledPosts();
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'failed' | 'cancelled'>('all');
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

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
                return {
                    text: `Published ${publishedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}`,
                    isOverdue: false
                };
            }

            // For pending posts, show time until scheduled
            const date = new Date(post.scheduled_time);
            const now = new Date();
            const diffMs = date.getTime() - now.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffMs < 0) {
                return { text: 'Overdue', isOverdue: true };
            } else if (diffHours < 1) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return { text: `in ${diffMinutes}m`, isOverdue: false };
            } else if (diffHours < 24) {
                return { text: `in ${diffHours}h`, isOverdue: false };
            } else {
                const diffDays = Math.floor(diffHours / 24);
                return { text: `in ${diffDays}d`, isOverdue: false };
            }
        } catch (error) {
            return { text: post.scheduled_time, isOverdue: false };
        }
    };

    const handleCancelPost = async (postId: string) => {
        try {
            await cancelScheduledPost(postId);
            setShowActionMenu(null);
        } catch (error) {
            console.error('Failed to cancel post:', error);
        }
    };

    const handleReschedulePost = async (postId: string, newTime: string) => {
        try {
            await reschedulePost(postId, newTime);
            setShowActionMenu(null);
        } catch (error) {
            console.error('Failed to reschedule post:', error);
        }
    };

    // Filter posts based on search and status - memoized to prevent unnecessary re-calculations
    const filteredPosts = useMemo(() => {
        return scheduledPosts.filter(post => {
            const matchesSearch = post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [scheduledPosts, searchTerm, statusFilter]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                type="button"
                                onClick={onBack}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-linkedin-50 rounded-xl">
                                    <Calendar className="w-6 h-6 text-linkedin-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Scheduled Posts</h1>
                                    <p className="text-sm text-gray-600">Manage your content calendar</p>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowScheduleModal(true)}
                            className="bg-linkedin-600 hover:bg-linkedin-700 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center space-x-2"
                            title="Create new scheduled post"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Schedule Post</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Filters */}
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search posts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center space-x-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <select
                                aria-label="Filter posts by status"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="published">Published</option>
                                <option value="failed">Failed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Refresh */}
                        <button
                            type="button"
                            onClick={() => fetchScheduledPosts(undefined, true)} // Force refresh
                            disabled={loading}
                            className="p-2 text-gray-500 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-xl transition-colors disabled:opacity-50"
                            title="Refresh scheduled posts"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Posts Grid */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-3">
                            <RefreshCw className="w-6 h-6 text-linkedin-600 animate-spin" />
                            <span className="text-gray-600 font-medium">Loading scheduled posts...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <div>
                                <h3 className="font-semibold text-red-800">Error loading scheduled posts</h3>
                                <p className="text-sm text-red-600 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !error && filteredPosts.length === 0 && (
                    <div className="text-center py-12">
                        <div className="p-4 bg-gray-50 rounded-xl inline-block mb-4">
                            <Calendar className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled posts found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria'
                                : 'Schedule your first post to get started'
                            }
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowScheduleModal(true)}
                            className="bg-linkedin-600 hover:bg-linkedin-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                        >
                            Schedule Your First Post
                        </button>
                    </div>
                )}

                {!loading && !error && filteredPosts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.map((post) => {
                            const timeInfo = formatScheduledTime(post);
                            return (
                                <div
                                    key={post.id}
                                    className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(post.status)}
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(post.status)}`}>
                                                {post.status?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowActionMenu(showActionMenu === post.id ? null : post.id)}
                                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Post actions menu"
                                                aria-label="Toggle post actions menu"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {showActionMenu === post.id && (
                                                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-10 min-w-[120px]">
                                                    <button
                                                        type="button"
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        <span>View</span>
                                                    </button>
                                                    {post.status === 'pending' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                                <span>Reschedule</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelPost(post.id)}
                                                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                <span>Cancel</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-gray-900 font-medium line-clamp-3 mb-4">
                                        {post.content || 'No content available'}
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <Clock className="w-4 h-4" />
                                            <span className={timeInfo.isOverdue ? 'text-red-600 font-medium' : ''}>
                                                {timeInfo.text}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(post.scheduled_time).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Schedule Modal */}
            <SchedulePostModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
            />
        </div>
    );
};

export default ScheduledPostsPage;
