import React from 'react';
import {
    TrendingUp,
    Target,
    Clock,
    BarChart3,
    MessageSquare,
    Brain,
    Rocket,
    Shield,
    Zap
} from 'lucide-react';

const FeaturesSection: React.FC = () => {
    const features = [
        {
            icon: Brain,
            title: "Smart AI Enhancement",
            description: "Powered by Gemini 2.0 Flash & Gemma-3-27b-it for superior content generation. Automatically detects links and enhances posts with scraped insights.",
            color: "linkedin",
            isLive: true
        },
        {
            icon: Clock,
            title: "Link Scraping & Analysis",
            description: "Automatically detects GitHub repos, articles, and websites in your text. Scrapes content and integrates insights for richer posts.",
            color: "orange",
            isLive: true
        },
        {
            icon: MessageSquare,
            title: "Multi-Modal Content Creation",
            description: "Create text posts, single image posts, and multi-image carousels. Advanced image analysis with contextual content generation.",
            color: "linkedin",
            isLive: true
        },
        {
            icon: TrendingUp,
            title: "Draft Management System",
            description: "Save, edit, and organize your content drafts. Never lose your ideas with our comprehensive draft management system.",
            color: "orange",
            isLive: true
        },
        {
            icon: Target,
            title: "Post Scheduling & Analytics",
            description: "Schedule posts for future publishing and track token usage with detailed analytics. Monitor your content performance.",
            color: "linkedin",
            isLive: true
        },
        {
            icon: BarChart3,
            title: "Professional Content Moderation",
            description: "Advanced filtering system prevents inappropriate content. Ensures all posts meet LinkedIn's professional standards.",
            color: "orange",
            isLive: true
        }
    ];

    const benefits = [
        {
            icon: Rocket,
            title: "Smart Enhancement",
            description: "Automatically detects links and scrapes content for richer, more contextual LinkedIn posts."
        },
        {
            icon: Shield,
            title: "Production Ready",
            description: "All features are live and tested. Draft management, scheduling, and analytics included."
        },
        {
            icon: Brain,
            title: "Multi-Modal AI",
            description: "Gemini 2.0 Flash + Gemma-3-27b-it for superior text generation and image analysis."
        },
        {
            icon: Zap,
            title: "Complete Workflow",
            description: "From content creation to scheduling and analytics - everything you need in one platform."
        }
    ];

    return (
        <section id="features" className="relative py-20 overflow-hidden bg-gradient-to-br from-gray-50 to-beige-50">
            {/* Large Background Blob */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-orange-200/20 via-orange-100/10 to-transparent rounded-full blur-3xl"></div>

            <div className="relative z-10 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="mb-16 text-center">
                    <div className="inline-flex items-center px-4 py-2 mb-6 space-x-2 border rounded-full bg-gradient-to-r from-orange-50 to-linkedin-50 border-orange-200/50">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                        <span className="text-sm font-medium text-gray-700">🚀 Live in Production</span>
                    </div>
                    <h2 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">
                        Built for the Future of
                        <span className="font-bold text-transparent bg-clip-text" style={{
                            background: '#ff6900',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}> LinkedIn Content</span>
                    </h2>
                    <p className="max-w-3xl mx-auto text-xl leading-relaxed text-gray-600">
                        Create professional LinkedIn content with AI assistance. All core features are live and ready to use, with advanced link scraping and multi-modal content generation.
                    </p>
                </div>

                {/* Main Features Grid */}
                <div className="grid grid-cols-1 gap-8 mb-20 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => {
                        const IconComponent = feature.icon;
                        const colorClasses = feature.color === 'linkedin'
                            ? 'from-white to-gray-50 shadow-lg shadow-linkedin-500/25 border-2 border-linkedin-200'
                            : 'from-white to-gray-50 shadow-lg shadow-orange-500/25 border-2 border-orange-200';
                        const borderColor = feature.color === 'linkedin'
                            ? 'border-linkedin-200/60'
                            : 'border-orange-200/60';

                        return (
                            <div
                                key={index}
                                className={`bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300 border-2 ${borderColor} group hover:-translate-y-2 hover:border-gray-800/40`}
                            >
                                <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                                    <IconComponent className={`w-7 h-7 drop-shadow-sm ${feature.color === 'linkedin' ? 'text-linkedin-600' : 'text-orange-600'}`} />
                                </div>
                                <h3 className="mb-4 text-xl font-bold text-gray-900">{feature.title}</h3>
                                <p className="leading-relaxed text-gray-600">{feature.description}</p>
                                {feature.isLive ? (
                                    <div className="inline-flex items-center space-x-2 mt-4 bg-gradient-to-r from-orange-50 to-linkedin-50 border border-orange-200/50 rounded-full px-4 py-2">
                                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                        <span className="text-sm text-gray-700 font-medium">🚀 Live in Beta</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center space-x-2 mt-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200/50 rounded-full px-4 py-2">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                        <span className="text-sm text-gray-500 font-medium">Coming Soon</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Benefits Section */}
                <div className="p-8 border-2 bg-gradient-to-br from-white/90 to-beige-50/90 backdrop-blur-sm rounded-3xl lg:p-12 border-gray-200/60 shadow-soft-lg">
                    <div className="mb-12 text-center">
                        <h3 className="mb-4 text-3xl font-bold text-gray-900 lg:text-4xl">
                            Why Choose PostWizz?
                        </h3>
                        <p className="max-w-2xl mx-auto text-lg font-medium text-gray-700">
                            The only LinkedIn content creator with smart link scraping, multi-modal AI, and complete workflow management.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {benefits.map((benefit, index) => {
                            const IconComponent = benefit.icon;
                            const isLinkedIn = index % 2 === 0;
                            const gradientClass = isLinkedIn
                                ? 'from-linkedin-500 to-linkedin-600 shadow-lg shadow-linkedin-500/25'
                                : 'from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25';


                            return (
                                <div key={index} className="text-center group">
                                    <div
                                        className={`w-16 h-16 bg-gradient-to-br ${gradientClass} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 border-2 border-white/50 relative z-10`}
                                        style={{
                                            background: isLinkedIn
                                                ? 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)'
                                                : 'linear-gradient(135deg, #e09112 0%, #cc7a00 100%)'
                                        }}
                                    >
                                        <IconComponent className="w-8 h-8 text-white drop-shadow-sm" />
                                    </div>
                                    <h4 className="mb-2 text-lg font-bold text-gray-900">{benefit.title}</h4>
                                    <p className="text-sm font-medium leading-relaxed text-gray-700">{benefit.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Production Stats Section */}
                <div className="grid grid-cols-1 gap-8 mt-20 md:grid-cols-3">
                    <div className="p-6 text-center border-2 bg-white/80 backdrop-blur-sm rounded-2xl border-linkedin-200/60 shadow-soft">
                        <div className="mb-2 text-4xl font-bold lg:text-5xl" style={{
                            background: 'linear-gradient(135deg, #f5a623 0%, #e09112 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            Live
                        </div>
                        <p className="font-semibold text-gray-800">Production Ready</p>
                    </div>
                    <div className="p-6 text-center border-2 bg-white/80 backdrop-blur-sm rounded-2xl border-orange-200/60 shadow-soft">
                        <div className="mb-2 text-4xl font-bold text-transparent lg:text-5xl bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text">
                            2025
                        </div>
                        <p className="font-semibold text-gray-800">Live in Production</p>
                    </div>
                    <div className="p-6 text-center border-2 bg-white/80 backdrop-blur-sm rounded-2xl border-linkedin-200/60 shadow-soft">
                        <div className="mb-2 text-4xl font-bold lg:text-5xl" style={{
                            background: 'linear-gradient(135deg, #f5a623 0%, #e09112 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            AI
                        </div>
                        <p className="font-semibold text-gray-800">Powered Innovation</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
