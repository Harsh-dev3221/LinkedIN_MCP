import React from 'react';
import { Sparkles } from 'lucide-react';
import { User } from '../../lib/supabase';

interface DashboardHeaderProps {
    user: User | null;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user }) => {
    return (
        <div className="relative py-12 lg:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Welcome Header */}
                <div className="text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-linkedin-50 to-orange-50 border border-linkedin-200/50 rounded-full px-4 py-2 mb-8">
                        <Sparkles className="w-4 h-4 text-linkedin-600" />
                        <span className="text-sm font-medium text-linkedin-700">AI-Powered Content Dashboard</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                        Welcome back,{' '}
                        <span 
                            className="font-bold text-transparent bg-clip-text"
                            style={{
                                background: 'linear-gradient(135deg, #0A66C2 0%, #F5A623 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            {user?.name?.split(' ')[0] || 'Creator'}
                        </span>
                    </h1>
                    
                    <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                        Ready to create engaging LinkedIn content that drives results?
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
