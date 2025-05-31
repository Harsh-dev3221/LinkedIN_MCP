import React from 'react';
import { TrendingUp, Sparkles, Image, Zap } from 'lucide-react';

const TokenUsageGuide: React.FC = () => {
    const usageItems = [
        {
            title: 'Basic Post Generation',
            description: 'Simple text-based LinkedIn posts',
            cost: 'FREE',
            icon: Sparkles,
            color: 'green',
            bgColor: 'from-green-50 to-green-100/50',
            borderColor: 'border-green-200',
            textColor: 'text-green-700'
        },
        {
            title: 'AI-Enhanced Single Post',
            description: 'Advanced AI optimization and formatting',
            cost: '5 tokens',
            icon: Zap,
            color: 'linkedin',
            bgColor: 'from-linkedin-50 to-linkedin-100/50',
            borderColor: 'border-linkedin-200',
            textColor: 'text-linkedin-700'
        },
        {
            title: 'Multi-Image Post Generation',
            description: 'Posts with multiple images and captions',
            cost: '10 tokens',
            icon: Image,
            color: 'orange',
            bgColor: 'from-orange-50 to-orange-100/50',
            borderColor: 'border-orange-200',
            textColor: 'text-orange-700'
        }
    ];

    return (
        <div className="bg-white/95 backdrop-blur-xl border-2 border-linkedin-200/60 rounded-3xl shadow-soft-lg hover:shadow-linkedin transition-all duration-300 hover:-translate-y-2">
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-8">
                    <div className="p-4 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-3xl shadow-linkedin">
                        <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            Token Usage Guide
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">
                            Understand how tokens are used
                        </p>
                    </div>
                </div>

                {/* Usage Items */}
                <div className="space-y-4">
                    {usageItems.map((item, index) => {
                        const IconComponent = item.icon;
                        return (
                            <div 
                                key={index}
                                className={`group p-6 bg-gradient-to-br ${item.bgColor} rounded-2xl border-2 ${item.borderColor} hover:scale-105 transition-all duration-300 cursor-pointer`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                            <IconComponent className={`w-6 h-6 ${item.textColor}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-1">
                                                {item.title}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 bg-white rounded-xl text-xs font-bold ${item.textColor} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                        {item.cost}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pro Tip */}
                <div className="mt-8 p-6 bg-gradient-to-br from-beige-50 to-beige-100/50 rounded-2xl border-2 border-beige-200/50">
                    <div className="flex items-start space-x-3">
                        <div className="p-2 bg-orange-500 rounded-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-2">💡 Pro Tip</h4>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Start with basic posts to get familiar with the platform, then upgrade to AI-enhanced posts for better engagement and reach.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TokenUsageGuide;
