import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrafts } from '../../hooks/useDrafts';
import { useAuth } from '../../contexts/AuthContext';
import DraftViewModal from './DraftViewModal';
import {
    ArrowLeft,
    FileText,
    Plus,
    RefreshCw,
    Search,
    Filter,
    Trash2,
    Eye,
    Tag,
    MoreVertical,
    AlertCircle,
    Loader2
} from 'lucide-react';

interface DraftsPageProps { }

const DraftsPage: React.FC<DraftsPageProps> = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { drafts, loading, error, refresh, deleteDraft } = useDrafts();

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'basic' | 'single' | 'multiple'>('all');
    const [selectedDraft, setSelectedDraft] = useState<any>(null);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Filter drafts based on search and type
    const filteredDrafts = useMemo(() => {
        if (!drafts) return [];

        return drafts.filter(draft => {
            const matchesSearch = !searchTerm ||
                draft.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                draft.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                draft.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesType = typeFilter === 'all' || draft.post_type === typeFilter;

            return matchesSearch && matchesType;
        });
    }, [drafts, searchTerm, typeFilter]);

    const handleBack = () => {
        navigate('/dashboard');
    };

    const handleViewDraft = (draft: any) => {
        setSelectedDraft(draft);
        setShowDraftModal(true);
        setShowActionMenu(null);
    };

    const handleDeleteDraft = async (draftId: string) => {
        if (!user?.id) return;

        setIsDeleting(draftId);
        try {
            await deleteDraft(draftId);
            setShowActionMenu(null);
        } catch (error) {
            console.error('Error deleting draft:', error);
        } finally {
            setIsDeleting(null);
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
                return 'Single Image';
            case 'multiple':
                return 'Multiple Images';
            default:
                return 'Basic';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-linkedin-50 via-orange-50 to-white">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur-xl border-b border-linkedin-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Back to Dashboard"
                                aria-label="Back to Dashboard"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-linkedin-100 rounded-xl">
                                    <FileText className="w-6 h-6 text-linkedin-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">Drafts</h1>
                                    <p className="text-sm text-gray-600">
                                        {filteredDrafts.length} {filteredDrafts.length === 1 ? 'draft' : 'drafts'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={() => refresh(true)}
                                disabled={loading}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Refresh Drafts"
                                aria-label="Refresh Drafts"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/create')}
                                className="flex items-center space-x-2 px-4 py-2 bg-linkedin-600 hover:bg-linkedin-700 text-white rounded-xl font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>New Post</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Filters */}
                <div className="mb-8 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search drafts by title, content, or tags..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="relative">
                            <label htmlFor="type-filter" className="sr-only">Filter drafts by post type</label>
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                id="type-filter"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as any)}
                                className="pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                title="Filter drafts by post type"
                                aria-label="Filter drafts by post type"
                            >
                                <option value="all">All Types</option>
                                <option value="basic">Basic Posts</option>
                                <option value="single">Single Image</option>
                                <option value="multiple">Multiple Images</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-3">
                            <Loader2 className="w-6 h-6 animate-spin text-linkedin-600" />
                            <span className="text-gray-600">Loading drafts...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <div>
                                <h3 className="font-semibold text-red-900">Error Loading Drafts</h3>
                                <p className="text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredDrafts.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {searchTerm || typeFilter !== 'all' ? 'No drafts found' : 'No drafts yet'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm || typeFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria'
                                : 'Create your first draft to get started'
                            }
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/create')}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-linkedin-600 hover:bg-linkedin-700 text-white rounded-xl font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Create First Draft</span>
                        </button>
                    </div>
                )}

                {/* Drafts Grid */}
                {!loading && !error && filteredDrafts.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredDrafts.map((draft) => (
                            <div
                                key={draft.id}
                                className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-linkedin-200 p-6 shadow-soft hover:shadow-linkedin hover:-translate-y-1 transition-all duration-300 relative"
                            >
                                {/* Action Menu Button */}
                                <div className="absolute top-4 right-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowActionMenu(showActionMenu === draft.id ? null : draft.id)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="More actions"
                                        aria-label="More actions"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {/* Action Menu Dropdown */}
                                    {showActionMenu === draft.id && (
                                        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                                            <button
                                                type="button"
                                                onClick={() => handleViewDraft(draft)}
                                                className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                                            >
                                                <Eye className="w-4 h-4 text-gray-500" />
                                                <span>View & Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDraft(draft.id)}
                                                disabled={isDeleting === draft.id}
                                                className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
                                            >
                                                {isDeleting === draft.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Draft Content */}
                                <div className="pr-8">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getPostTypeColor(draft.post_type)}`}>
                                            {getPostTypeLabel(draft.post_type)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(draft.updated_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>

                                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                        {draft.title || 'Untitled Draft'}
                                    </h3>

                                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                        {draft.content}
                                    </p>

                                    {/* Tags */}
                                    {draft.tags && draft.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {draft.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center space-x-1 text-xs bg-linkedin-50 text-linkedin-700 px-2 py-1 rounded-full"
                                                >
                                                    <Tag className="w-3 h-3" />
                                                    <span>{tag}</span>
                                                </span>
                                            ))}
                                            {draft.tags.length > 3 && (
                                                <span className="text-xs text-gray-500">
                                                    +{draft.tags.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => handleViewDraft(draft)}
                                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-linkedin-50 hover:bg-linkedin-100 text-linkedin-700 rounded-lg font-medium transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span>View</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Draft View Modal */}
            {showDraftModal && selectedDraft && (
                <DraftViewModal
                    isOpen={showDraftModal}
                    onClose={() => {
                        setShowDraftModal(false);
                        setSelectedDraft(null);
                    }}
                    draft={selectedDraft}
                    onDraftUpdated={() => refresh(true)}
                />
            )}
        </div>
    );
};

export default DraftsPage;
