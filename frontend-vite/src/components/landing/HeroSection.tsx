import React from 'react';
import { Sparkles, TrendingUp, Users, Zap, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
    onGetStarted?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
    const handleGetStarted = () => {
        if (onGetStarted) {
            onGetStarted();
        }
    };

    return (
        <section className="relative py-12 lg:py-20 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-beige-50 via-white to-linkedin-50/30"></div>
            <div className="absolute top-20 left-10 w-72 h-72 bg-linkedin-100/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center min-h-[80vh]">
                    {/* Left Content - Larger Span (3/5) */}
                    <div className="lg:col-span-3 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-linkedin-50 to-orange-50 border border-linkedin-200/50 rounded-full px-4 py-2 mb-8">
                            <Sparkles className="w-4 h-4 text-linkedin-600" />
                            <span className="text-sm font-medium text-linkedin-700">AI-Powered LinkedIn Content Creation</span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent" style={{
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                Transform Your Ideas
                            </span>
                            <br />
                            <span className="text-gray-900">
                                Into Professional LinkedIn Posts
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg lg:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl lg:max-w-none">
                            Create professional LinkedIn content in seconds with AI assistance.
                            Save time while maintaining quality and authenticity in your posts.
                        </p>

                        {/* Key Benefits */}
                        <div className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start">
                            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-soft">
                                <TrendingUp className="w-4 h-4 text-linkedin-600" />
                                <span className="text-sm font-medium text-gray-700">Fast Content Creation</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-soft">
                                <Users className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-gray-700">Professional Quality</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-soft">
                                <Zap className="w-4 h-4 text-linkedin-600" />
                                <span className="text-sm font-medium text-gray-700">Easy to Use</span>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button
                                type="button"
                                onClick={handleGetStarted}
                                className="text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-[#FF6B35] hover:shadow-lg transform hover:-translate-y-1 inline-flex items-center justify-center space-x-3 group"
                                style={{
                                    background: '#ff6900',
                                    border: 'none',
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    const target = e.target as HTMLElement;
                                    target.style.background = 'white';
                                    target.style.color = '#ff6900';
                                    target.style.border = '2px solid #111827';
                                    target.style.transform = 'translateY(-4px)';
                                }}
                                onMouseLeave={(e) => {
                                    const target = e.target as HTMLElement;
                                    target.style.background = '#ff6900';
                                    target.style.color = 'white';
                                    target.style.border = 'none';
                                    target.style.transform = 'translateY(0)';
                                }}
                            >
                                <Sparkles className="w-5 h-5" />
                                <span className="text-lg">Start Creating for Free</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button type="button" className="text-gray-900  px-8 py-4 rounded-2xl font-semibold border-2 border-gray-800 hover:border-gray-700 hover:bg-orange-50 transition-all duration-300 shadow-soft hover:shadow-lg">
                                Watch Demo
                            </button>
                        </div>

                        {/* Startup Badge */}
                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-linkedin-50 border border-orange-200/50 rounded-full px-4 py-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                <p className="text-sm text-gray-700 font-medium">🚀 Early Access - Join the Beta</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">Be among the first to experience the future of LinkedIn content creation</p>
                        </div>
                    </div>

                    {/* Right Visual - Smaller Span (2/5) */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            {/* Large Orange Gradient Blob */}
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-orange-400/30 to-orange-600/20 rounded-full blur-3xl animate-pulse"></div>

                            {/* Main Card */}
                            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-soft-lg border-2 border-gray-200/80 transform rotate-2 hover:rotate-0 transition-transform duration-500 relative z-10">
                                <div className="space-y-6">
                                    {/* Post Preview Header */}
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-full flex items-center justify-center">
                                            <span className="text-white font-bold">AI</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">PostWizz Generator</h3>
                                            <p className="text-sm text-gray-500">Creating professional content...</p>
                                        </div>
                                        {/* Orange trending icon */}
                                        <div className="ml-auto bg-orange-500 text-white p-2 rounded-xl">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Generated Content Preview */}
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                                        <div className="h-3 bg-linkedin-200 rounded-full w-full animate-pulse"></div>
                                        <div className="h-3 bg-linkedin-200 rounded-full w-4/5 animate-pulse"></div>
                                        <div className="h-3 bg-linkedin-200 rounded-full w-3/5 animate-pulse"></div>
                                    </div>

                                    {/* Engagement Metrics */}
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                            <span className="flex items-center space-x-1">
                                                <span className="w-2 h-2 bg-linkedin-500 rounded-full"></span>
                                                <span>1.2k likes</span>
                                            </span>
                                            <span className="flex items-center space-x-1">
                                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                                <span>89 comments</span>
                                            </span>
                                        </div>
                                        <Sparkles className="w-5 h-5 text-linkedin-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* Floating Elements */}
                            <div className="absolute -top-4 -right-4 bg-orange-500 text-white p-3 rounded-2xl shadow-orange transform rotate-12 animate-float z-20">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div className="absolute -bottom-4 -left-4 bg-linkedin-500 text-white p-3 rounded-2xl shadow-linkedin transform -rotate-12 animate-float z-20" style={{ animationDelay: '1s' }}>
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
