import React from 'react';
import { Sparkles, ArrowRight, Zap, TrendingUp, Users } from 'lucide-react';

interface CreatePostSectionProps {
    linkedinConnected: boolean;
    onCreatePost: () => void;
}

const CreatePostSection: React.FC<CreatePostSectionProps> = ({ linkedinConnected, onCreatePost }) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300 h-full">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 rounded-xl ${linkedinConnected
                        ? 'bg-gradient-to-br from-linkedin-500 to-linkedin-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Create Content</h3>
                    <p className="text-sm text-gray-600">AI-powered LinkedIn posts</p>
                </div>
            </div>

            {/* Status */}
            <div className={`p-4 rounded-xl mb-6 ${linkedinConnected
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                <div className="flex items-center space-x-2">
                    {linkedinConnected ? (
                        <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-700">Ready to create content</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium text-orange-700">LinkedIn connection required</span>
                        </>
                    )}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                    {linkedinConnected
                        ? 'Transform your ideas into engaging posts that drive results'
                        : 'Connect your LinkedIn account to start creating AI-powered content'
                    }
                </p>
            </div>

            {/* Features (compact) */}
            {linkedinConnected && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="text-center p-3 bg-linkedin-50 rounded-xl">
                        <Zap className="w-5 h-5 mx-auto mb-1 text-linkedin-600" />
                        <p className="text-xs font-medium text-linkedin-700">AI-Powered</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
                        <p className="text-xs font-medium text-green-700">Optimized</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                        <Users className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                        <p className="text-xs font-medium text-orange-700">Targeted</p>
                    </div>
                </div>
            )}

            {/* CTA Button */}
            <button
                type="button"
                onClick={onCreatePost}
                disabled={!linkedinConnected}
                className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${linkedinConnected
                        ? 'bg-gradient-to-r from-linkedin-500 to-linkedin-600 text-white hover:from-linkedin-600 hover:to-linkedin-700 hover:shadow-linkedin transform hover:-translate-y-1'
                        : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    }`}
            >
                <span>
                    {linkedinConnected ? 'Create Post' : 'Connect LinkedIn'}
                </span>
                {linkedinConnected && (
                    <ArrowRight className="w-4 h-4" />
                )}
            </button>

            {/* Footer note */}
            <p className="text-xs text-gray-500 text-center mt-4">
                {linkedinConnected ? (
                    '✨ Professional content that stands out'
                ) : (
                    '🔒 Secure OAuth • No password required'
                )}
            </p>
        </div>
    );
};

export default CreatePostSection;
