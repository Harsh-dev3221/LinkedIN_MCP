import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDrafts } from '../../hooks/useDrafts';
import { createMcpClient } from '../../services/mcpService';
import NewUnifiedPostCreator from '../NewUnifiedPostCreator';
import {
    X,
    Save,
    Send,
    FileText,
    Tag,
    AlertCircle,
    CheckCircle,
    Loader2,
    Edit3,
    Calendar,
    Eye,
    Sparkles
} from 'lucide-react';

interface DraftViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    draft: any;
    onDraftUpdated: () => void;
}

const DraftViewModal: React.FC<DraftViewModalProps> = ({
    isOpen,
    onClose,
    draft,
    onDraftUpdated
}) => {
    const navigate = useNavigate();
    const { user, mcpToken } = useAuth();
    const { updateDraft } = useDrafts();

    const [isEditing, setIsEditing] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Clear messages when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setSuccess(null);
            setIsEditing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (isPosting) return;
        setIsEditing(false);
        setError(null);
        setSuccess(null);
        onClose();
    };

    const handleEditWithPostCreator = () => {
        // Close modal and navigate to post creator with draft content as initial input
        onClose();
        navigate('/create', {
            state: {
                initialContent: draft?.content || '',
                draftId: draft?.id,
                editMode: true
            }
        });
    };

    const handlePostDraft = async () => {
        if (!mcpToken || !user?.id) {
            setError('LinkedIn connection required. Please connect your LinkedIn account.');
            return;
        }

        if (!content.trim()) {
            setError('Draft content is required');
            return;
        }

        setIsPosting(true);
        setError(null);

        try {
            const mcpClient = createMcpClient(mcpToken, () => {
                setError('LinkedIn connection expired. Please reconnect your account.');
            });

            // Determine which tool to use based on post type
            let result;
            switch (postType) {
                case 'basic':
                    result = await mcpClient.callTool('create-post', {
                        content: content,
                        userId: user.id
                    });
                    break;

                case 'single':
                    // Note: For single image posts, we would need image data
                    // Since drafts don't store images, we'll treat as basic for now
                    setError('Single image posts require image upload. Please use the post creator for image posts.');
                    return;

                case 'multiple':
                    // Note: For multiple image posts, we would need image data
                    // Since drafts don't store images, we'll treat as basic for now
                    setError('Multiple image posts require image upload. Please use the post creator for image posts.');
                    return;

                default:
                    result = await mcpClient.callTool('create-post', {
                        content: content,
                        userId: user.id
                    });
            }

            setSuccess('Successfully posted to LinkedIn!');

            // Close modal after successful post
            setTimeout(() => {
                handleClose();
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to post to LinkedIn');
        } finally {
            setIsPosting(false);
        }
    };

    const getPostTypeColor = (type: string) => {
        switch (type) {
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

    const getPostTypeLabel = (type: string) => {
        switch (type) {
            case 'basic':
                return 'Basic Post';
            case 'single':
                return 'Single Image';
            case 'multiple':
                return 'Multiple Images';
            default:
                return 'Basic Post';
        }
    };

    if (!isOpen || !draft) return null;

    return (
        <div className="modal-overlay bg-black/50 backdrop-blur-sm">
            <div className="modal-content bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                                View Draft
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-600">
                                Created {new Date(draft.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="modal-header-buttons ml-4">
                        <button
                            type="button"
                            onClick={handleEditWithPostCreator}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-colors border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md"
                        >
                            <Sparkles className="w-4 h-4 flex-shrink-0" />
                            <span className="hidden sm:inline">Edit with AI</span>
                            <span className="sm:hidden">Edit</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePostDraft}
                            disabled={isPosting}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 shadow-orange hover:shadow-orange-lg hover:-translate-y-0.5"
                        >
                            {isPosting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                    <span className="hidden sm:inline">Posting...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 flex-shrink-0" />
                                    <span className="hidden sm:inline">Post Now</span>
                                    <span className="sm:hidden">Post</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isPosting}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-gradient-to-br from-beige-50 via-white to-blue-50/30">
                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl shadow-soft">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-green-800 font-medium">{success}</span>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-soft">
                            <div className="flex items-center space-x-3">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="text-red-800 font-medium">{error}</span>
                            </div>
                        </div>
                    )}

                    {/* View Mode */}
                    <div className="space-y-6">
                        {/* Draft Info Card */}
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-blue-200 p-4 sm:p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className={`text-sm font-medium px-3 py-1 rounded-full border-2 shadow-sm ${getPostTypeColor(draft.post_type)}`}>
                                    {getPostTypeLabel(draft.post_type)}
                                </span>
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    Last updated {new Date(draft.updated_at).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Title */}
                            {draft.title && (
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        {draft.title}
                                    </h3>
                                </div>
                            )}

                            {/* Content */}
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                    Content
                                </h4>
                                <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-200 shadow-inner">
                                    <p className="draft-content text-gray-900 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                                        {draft.content}
                                    </p>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                                    <span>{draft.content.length} characters</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${draft.content.length > 3000
                                        ? 'bg-red-100 text-red-700'
                                        : draft.content.length > 2000
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                        {draft.content.length > 3000 ? 'Too long' : 'Good length'}
                                    </span>
                                </div>
                            </div>

                            {/* Tags */}
                            {draft.tags && draft.tags.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                        <Tag className="w-4 h-4 mr-2 text-blue-600" />
                                        Tags
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {draft.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-300 shadow-sm"
                                            >
                                                <Tag className="w-3 h-3" />
                                                <span>{tag}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Edit Instructions Card */}
                        <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-2xl p-4 sm:p-6 border-2 border-blue-200 shadow-soft">
                            <div className="flex items-start space-x-3">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-orange-500 rounded-xl shadow-sm flex-shrink-0">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 mb-2 text-lg">✨ Edit with AI</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        Click <strong>"Edit with AI"</strong> to open the post creator with this content as your starting point.
                                        You can regenerate, modify, or enhance the content using our AI tools.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="bg-white/70 px-2 py-1 rounded-full text-gray-600 border">🔄 Regenerate</span>
                                        <span className="bg-white/70 px-2 py-1 rounded-full text-gray-600 border">✏️ Modify</span>
                                        <span className="bg-white/70 px-2 py-1 rounded-full text-gray-600 border">🚀 Enhance</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DraftViewModal;
