import React, { useState } from 'react';
import { useDrafts } from '../../hooks/useDrafts';
import {
    FileText,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    Edit3,
    Trash2,
    Eye,
    Plus
} from 'lucide-react';

interface DraftsCardProps {
    onViewAll?: () => void;
}

const DraftsCard: React.FC<DraftsCardProps> = ({ onViewAll }) => {
    const { drafts, loading, error, refresh } = useDrafts();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refresh(true); // Force refresh
        } finally {
            setIsRefreshing(false);
        }
    };

    const getPostTypeColor = (postType: string) => {
        switch (postType) {
            case 'basic':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'single':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'multiple':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPostTypeLabel = (postType: string) => {
        switch (postType) {
            case 'basic':
                return 'Basic';
            case 'single':
                return 'Enhanced';
            case 'multiple':
                return 'Premium';
            default:
                return 'Basic';
        }
    };

    return (
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl border-2 border-linkedin-200 p-4 sm:p-5 lg:p-6 shadow-soft hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-linkedin-50 rounded-xl">
                        <FileText className="w-5 h-5 text-linkedin-600" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Drafts</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Saved content</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing || loading}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh drafts"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {onViewAll && (
                        <button
                            type="button"
                            onClick={onViewAll}
                            className="flex items-center space-x-1 text-linkedin-600 hover:text-linkedin-700 text-sm font-medium transition-colors"
                        >
                            <span>View all</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading && !isRefreshing && (
                <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-3 text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading drafts...</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">Error loading drafts</p>
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
            {!loading && !error && drafts.length === 0 && (
                <div className="text-center py-8">
                    <div className="p-3 bg-gray-50 rounded-xl inline-block mb-3">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">No drafts yet</h4>
                    <p className="text-xs text-gray-600 mb-4">Save your content as drafts to continue later</p>
                    <button
                        type="button"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-linkedin-600 hover:bg-linkedin-700 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Draft</span>
                    </button>
                </div>
            )}

            {/* Drafts List */}
            {!loading && !error && drafts.length > 0 && (
                <div className="space-y-3">
                    {drafts.slice(0, 3).map((draft, index) => (
                        <div
                            key={draft.id || index}
                            className="p-4 bg-gradient-to-r from-linkedin-50 to-orange-50 rounded-xl border border-linkedin-200 hover:border-linkedin-300 transition-all duration-200 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getPostTypeColor(draft.post_type)}`}>
                                            {getPostTypeLabel(draft.post_type)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(draft.updated_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                        {draft.title || 'Untitled Draft'}
                                    </h4>
                                    <p className="text-xs text-gray-600 line-clamp-2">
                                        {draft.content.substring(0, 100)}
                                        {draft.content.length > 100 ? '...' : ''}
                                    </p>
                                    {draft.tags && draft.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {draft.tags.slice(0, 2).map((tag, tagIndex) => (
                                                <span
                                                    key={tagIndex}
                                                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {draft.tags.length > 2 && (
                                                <span className="text-xs text-gray-500">
                                                    +{draft.tags.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-1 ml-3">
                                    <button
                                        type="button"
                                        className="p-1.5 text-gray-400 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-lg transition-colors"
                                        title="View draft"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit draft"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete draft"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Show More Button */}
            {!loading && !error && drafts.length > 3 && (
                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={onViewAll}
                        className="text-sm text-linkedin-600 hover:text-linkedin-700 font-medium transition-colors"
                    >
                        View {drafts.length - 3} more drafts
                    </button>
                </div>
            )}
        </div>
    );
};

export default DraftsCard;
