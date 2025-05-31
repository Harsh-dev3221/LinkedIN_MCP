import React from 'react';
import {
    Sparkles,
    TrendingUp,
    Users,
    Zap,
    Target,
    Clock,
    BarChart3,
    MessageSquare,
    Brain,
    Rocket,
    Shield,
    Globe
} from 'lucide-react';

const FeaturesSection: React.FC = () => {
    const features = [
        {
            icon: Brain,
            title: "AI-Powered Content Generation",
            description: "Transform your ideas into engaging LinkedIn posts with advanced AI that understands professional tone and industry best practices.",
            color: "linkedin"
        },
        {
            icon: TrendingUp,
            title: "Engagement Optimization",
            description: "Boost your post performance with AI-driven insights that maximize likes, comments, and shares for better reach.",
            color: "orange"
        },
        {
            icon: Target,
            title: "Audience Targeting",
            description: "Create content tailored to your specific audience with intelligent targeting that resonates with your professional network.",
            color: "linkedin"
        },
        {
            icon: Clock,
            title: "10x Faster Creation",
            description: "Generate professional LinkedIn content in seconds, not hours. Save time while maintaining quality and authenticity.",
            color: "orange"
        },
        {
            icon: BarChart3,
            title: "Performance Analytics",
            description: "Track your content performance with detailed analytics and insights to continuously improve your LinkedIn strategy.",
            color: "linkedin"
        },
        {
            icon: MessageSquare,
            title: "Multi-Format Support",
            description: "Create various content types including posts, articles, polls, and carousels - all optimized for LinkedIn's algorithm.",
            color: "orange"
        }
    ];

    const benefits = [
        {
            icon: Rocket,
            title: "Boost Your Personal Brand",
            description: "Establish thought leadership and build a strong professional presence on LinkedIn."
        },
        {
            icon: Users,
            title: "Grow Your Network",
            description: "Attract the right connections and expand your professional circle with engaging content."
        },
        {
            icon: Shield,
            title: "Maintain Authenticity",
            description: "AI-generated content that sounds like you, preserving your unique voice and style."
        },
        {
            icon: Globe,
            title: "Global Reach",
            description: "Create content that resonates across different markets and professional cultures."
        }
    ];

    return (
        <section id="features" className="relative py-20 overflow-hidden bg-gradient-to-br from-gray-50 to-beige-50">
            {/* Large Background Blob */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-orange-200/20 via-orange-100/10 to-transparent rounded-full blur-3xl"></div>

            <div className="relative z-10 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="mb-16 text-center">
                    <div className="inline-flex items-center px-4 py-2 mb-6 space-x-2 border rounded-full bg-gradient-to-r from-linkedin-50 to-orange-50 border-linkedin-200/50">
                        <Sparkles className="w-4 h-4 text-linkedin-600" />
                        <span className="text-sm font-medium text-linkedin-700">Coming Soon Features</span>
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
                        We're building the most advanced AI-powered LinkedIn content platform. Join our beta to get early access to these game-changing features.
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
                                <div className="inline-block px-3 py-1 mt-4 text-xs text-gray-500 rounded-full bg-gray-50">
                                    Coming in Beta
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Benefits Section */}
                <div className="p-8 border-2 bg-gradient-to-br from-white/90 to-beige-50/90 backdrop-blur-sm rounded-3xl lg:p-12 border-gray-200/60 shadow-soft-lg">
                    <div className="mb-12 text-center">
                        <h3 className="mb-4 text-3xl font-bold text-gray-900 lg:text-4xl">
                            Why Choose Post AI?
                        </h3>
                        <p className="max-w-2xl mx-auto text-lg font-medium text-gray-700">
                            Join our beta program and be among the first to experience the future of LinkedIn content creation.
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

                {/* Beta Stats Section */}
                <div className="grid grid-cols-1 gap-8 mt-20 md:grid-cols-3">
                    <div className="p-6 text-center border-2 bg-white/80 backdrop-blur-sm rounded-2xl border-linkedin-200/60 shadow-soft">
                        <div className="mb-2 text-4xl font-bold lg:text-5xl" style={{
                            background: 'linear-gradient(135deg, #f5a623 0%, #e09112 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            Beta
                        </div>
                        <p className="font-semibold text-gray-800">Early Access Program</p>
                    </div>
                    <div className="p-6 text-center border-2 bg-white/80 backdrop-blur-sm rounded-2xl border-orange-200/60 shadow-soft">
                        <div className="mb-2 text-4xl font-bold text-transparent lg:text-5xl bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text">
                            2024
                        </div>
                        <p className="font-semibold text-gray-800">Launch Year</p>
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
