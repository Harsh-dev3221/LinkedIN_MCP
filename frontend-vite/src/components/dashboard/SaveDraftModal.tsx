import React, { useState, useEffect } from 'react';
import { useDrafts } from '../../hooks/useDrafts';
import {
    X,
    Save,
    FileText,
    Tag,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';

interface SaveDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialContent?: string;
    initialPostType?: 'basic' | 'single' | 'multiple';
    initialTitle?: string;
    draftId?: string; // For update mode
    isEditMode?: boolean; // Whether we're updating an existing draft
}

const SaveDraftModal: React.FC<SaveDraftModalProps> = ({
    isOpen,
    onClose,
    initialContent = '',
    initialPostType = 'basic',
    initialTitle = '',
    draftId,
    isEditMode = false
}) => {
    const { saveDraft, updateDraft } = useDrafts();

    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [postType, setPostType] = useState<'basic' | 'single' | 'multiple'>(initialPostType);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle || `Draft ${new Date().toLocaleDateString()}`);
            setContent(initialContent);
            setPostType(initialPostType);
            setTags([]);
            setTagInput('');
            setError(null);
            setSuccess(null);
        }
    }, [isOpen, initialContent, initialPostType, initialTitle]);

    // Clear messages after 5 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim().toLowerCase();
        if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
            setTags([...tags, trimmedTag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            setError('Draft content is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            if (isEditMode && draftId) {
                await updateDraft(draftId, {
                    title,
                    content,
                    postType,
                    tags
                });
                setSuccess('Draft updated successfully!');
            } else {
                await saveDraft(title, content, postType, tags);
                setSuccess('Draft saved successfully!');
            }

            // Close modal after success
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'save'} draft`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-linkedin-50 rounded-xl">
                            <FileText className="w-6 h-6 text-linkedin-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEditMode ? 'Update Draft' : 'Save Draft'}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {isEditMode ? 'Update your draft content' : 'Save your content for later'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        aria-label="Close modal"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <p className="text-sm font-medium text-green-800">{success}</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Draft Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Draft Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter a title for your draft"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Post Content */}
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                            Content
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Your post content..."
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500 resize-none"
                            disabled={isSubmitting}
                        />
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-gray-500">
                                {content.length} characters
                            </p>
                        </div>
                    </div>

                    {/* Post Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Post Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'basic', label: 'Basic', description: 'Text only' },
                                { value: 'single', label: 'Enhanced', description: 'AI optimized' },
                                { value: 'multiple', label: 'Premium', description: 'Multi-image' }
                            ].map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setPostType(type.value as any)}
                                    disabled={isSubmitting}
                                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${postType === type.value
                                        ? 'border-linkedin-500 bg-linkedin-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        } disabled:opacity-50`}
                                >
                                    <div className="font-medium text-sm">{type.label}</div>
                                    <div className="text-xs text-gray-600">{type.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tags (Optional)
                        </label>
                        <div className="space-y-3">
                            <div className="flex space-x-2">
                                <div className="flex-1 relative">
                                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={handleTagInputKeyPress}
                                        placeholder="Add a tag..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500"
                                        disabled={isSubmitting || tags.length >= 5}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    disabled={!tagInput.trim() || tags.length >= 5 || isSubmitting}
                                    className="px-4 py-2 bg-linkedin-600 text-white rounded-xl hover:bg-linkedin-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Add
                                </button>
                            </div>

                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-linkedin-100 text-linkedin-800"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                disabled={isSubmitting}
                                                aria-label={`Remove tag ${tag}`}
                                                className="ml-2 text-linkedin-600 hover:text-linkedin-800 disabled:opacity-50"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-gray-500">
                                {tags.length}/5 tags added
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !content.trim()}
                            className="px-6 py-2 bg-linkedin-600 hover:bg-linkedin-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{isEditMode ? 'Updating...' : 'Saving...'}</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{isEditMode ? 'Update Draft' : 'Save Draft'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveDraftModal;
