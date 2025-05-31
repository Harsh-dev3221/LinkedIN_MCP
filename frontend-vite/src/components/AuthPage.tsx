import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { signInWithGoogle, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [signingInWith, setSigningInWith] = useState<'google' | null>(null);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            setSigningInWith('google');
            await signInWithGoogle();
        } catch (error: any) {
            console.error('Google sign in failed:', error);
            setError(error.message || 'Failed to sign in with Google');
            setSigningInWith(null);
        }
    };

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-lg border-2 border-white/60 overflow-hidden">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-xl hover:bg-gray-100/50"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-2xl shadow-linkedin mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Sign in with Google to access your LinkedIn post creator with AI-powered content generation
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <p className="text-red-700 font-medium text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-soft hover:shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3"
                    >
                        {signingInWith === 'google' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>

                    {/* Terms */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        By signing in, you agree to our terms of service and privacy policy.
                    </p>

                    {/* Features Box */}
                    <div className="mt-6 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-200/60 rounded-2xl">
                        <div className="text-center">
                            <p className="font-bold text-linkedin-600 mb-2">🎉 Get 50 free tokens daily!</p>
                            <div className="text-sm text-gray-700 space-y-1">
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>Basic posts: Free</span>
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>AI-enhanced posts: 5 tokens</span>
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>Multi-image posts: 10 tokens</span>
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>Connect LinkedIn after sign-in to start posting</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Keep the original AuthPage for backward compatibility
const AuthPage: React.FC = () => {
    const { signInWithGoogle, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [signingInWith, setSigningInWith] = useState<'google' | null>(null);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            setSigningInWith('google');
            await signInWithGoogle();
        } catch (error: any) {
            console.error('Google sign in failed:', error);
            setError(error.message || 'Failed to sign in with Google');
            setSigningInWith(null);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30 relative">
            {/* Background Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-linkedin-100/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl"></div>

            <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-lg border-2 border-white/60 overflow-hidden">
                {/* Content */}
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-2xl shadow-linkedin mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                        <p className="text-gray-600 leading-relaxed">
                            Sign in with Google to access your LinkedIn post creator with AI-powered content generation
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <p className="text-red-700 font-medium text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-soft hover:shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3"
                    >
                        {signingInWith === 'google' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>

                    {/* Terms */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        By signing in, you agree to our terms of service and privacy policy.
                    </p>

                    {/* Features Box */}
                    <div className="mt-6 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-200/60 rounded-2xl">
                        <div className="text-center">
                            <p className="font-bold text-linkedin-600 mb-2">🎉 Get 50 free tokens daily!</p>
                            <div className="text-sm text-gray-700 space-y-1">
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>Basic posts: Free</span>
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>AI-enhanced posts: 5 tokens</span>
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>Multi-image posts: 10 tokens</span>
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                    <span>Connect LinkedIn after sign-in to start posting</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
export { AuthModal };
