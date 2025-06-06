import React, { useState, useEffect } from 'react';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import {
    X,
    Calendar,
    Clock,
    Send,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';

interface SchedulePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialContent?: string;
    initialPostType?: 'basic' | 'single' | 'multiple';
}

const SchedulePostModal: React.FC<SchedulePostModalProps> = ({
    isOpen,
    onClose,
    initialContent = '',
    initialPostType = 'basic'
}) => {

    const { schedulePost } = useScheduledPosts();

    const [content, setContent] = useState(initialContent);
    const [postType, setPostType] = useState<'basic' | 'single' | 'multiple'>(initialPostType);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setContent(initialContent);
            setPostType(initialPostType);
            setError(null);
            setSuccess(null);

            // Set default date to today if it's before 11 PM, otherwise tomorrow
            const now = new Date();
            const defaultDate = new Date();

            // If it's after 11 PM, default to tomorrow
            if (now.getHours() >= 23) {
                defaultDate.setDate(defaultDate.getDate() + 1);
            }

            setScheduledDate(defaultDate.toISOString().split('T')[0]);

            // Set default time to current time + 1 hour (rounded to next hour)
            const defaultTime = new Date();
            defaultTime.setHours(defaultTime.getHours() + 1, 0, 0, 0); // Add 1 hour and round to hour

            // Format time as HH:MM for the input
            const timeString = defaultTime.toTimeString().slice(0, 5);
            setScheduledTime(timeString);
        }
    }, [isOpen, initialContent, initialPostType]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            setError('Post content is required');
            return;
        }

        if (!scheduledDate || !scheduledTime) {
            setError('Please select a date and time');
            return;
        }

        // Combine date and time into ISO string
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();

        if (scheduledDateTime <= now) {
            setError('Scheduled time must be in the future');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await schedulePost(content, scheduledDateTime.toISOString(), postType);
            setSuccess('Post scheduled successfully!');

            // Close modal after success
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to schedule post');
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col ">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-linkedin-50 rounded-xl">
                            <Calendar className="w-6 h-6 text-linkedin-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Schedule Post</h2>
                            <p className="text-sm text-gray-600">Plan your content for later</p>
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
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-6 space-y-6">
                        <form id="schedule-post-form" onSubmit={handleSubmit} className="space-y-6">
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

                            {/* Post Content */}
                            <div>
                                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                                    Post Content
                                </label>
                                <textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="What would you like to share?"
                                    rows={6}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500 resize-none"
                                    disabled={isSubmitting}
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-xs text-gray-500">
                                        {content.length} / 3000 characters
                                    </p>
                                    {content.length > 3000 && (
                                        <p className="text-xs text-red-600">Content exceeds LinkedIn limit</p>
                                    )}
                                </div>
                            </div>

                            {/* Post Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Post Type
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'basic', label: 'Basic', description: 'Text only', cost: 'FREE' },
                                        { value: 'single', label: 'Enhanced', description: 'AI optimized', cost: '5 tokens' },
                                        { value: 'multiple', label: 'Premium', description: 'Multi-image', cost: '10 tokens' }
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
                                            <div className="text-xs font-medium text-linkedin-600 mt-1">{type.cost}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date and Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                                        Date
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="date"
                                            id="date"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                                        Time
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="time"
                                            id="time"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-linkedin-500 focus:border-linkedin-500"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            {scheduledDate && scheduledTime && (
                                <div className="bg-linkedin-50 border border-linkedin-200 rounded-xl p-4">
                                    <p className="text-sm font-medium text-linkedin-800 mb-1">Scheduled for:</p>
                                    <p className="text-sm text-linkedin-700">
                                        {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true // This ensures AM/PM is shown
                                        })}
                                    </p>
                                </div>
                            )}

                        </form>
                    </div>
                </div>

                {/* Fixed Footer with Actions */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6 rounded-b-2xl">
                    <div className="flex justify-end space-x-3">
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
                            form="schedule-post-form"
                            disabled={isSubmitting || !content.trim() || !scheduledDate || !scheduledTime || content.length > 3000}
                            className="btn-linkedin px-6 py-2 rounded-xl font-medium flex items-center space-x-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Scheduling...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Schedule Post</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulePostModal;
