import React from 'react';
import { Linkedin, RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface LinkedInConnectionCardProps {
    linkedinConnected: boolean;
    linkedinStatusLoading: boolean;
    isRefreshingLinkedIn: boolean;
    onRefreshLinkedIn: () => void;
    onConnectLinkedIn: () => void;
}

const LinkedInConnectionCard: React.FC<LinkedInConnectionCardProps> = ({
    linkedinConnected,
    linkedinStatusLoading,
    isRefreshingLinkedIn,
    onRefreshLinkedIn,
    onConnectLinkedIn
}) => {
    const getStatusConfig = () => {
        if (linkedinStatusLoading) {
            return {
                icon: RefreshCw,
                iconClass: 'text-blue-600 animate-spin',
                bgClass: 'from-blue-50 to-blue-100/50',
                borderClass: 'border-blue-200',
                title: 'Checking Connection...',
                description: 'Please wait while we verify your LinkedIn connection status',
                buttonText: null
            };
        }
        
        if (linkedinConnected) {
            return {
                icon: CheckCircle,
                iconClass: 'text-green-600',
                bgClass: 'from-green-50 to-green-100/50',
                borderClass: 'border-green-200',
                title: 'Connected & Ready',
                description: 'Your LinkedIn account is connected and ready for posting',
                buttonText: null
            };
        }
        
        return {
            icon: AlertCircle,
            iconClass: 'text-orange-600',
            bgClass: 'from-orange-50 to-orange-100/50',
            borderClass: 'border-orange-200',
            title: 'Not Connected',
            description: 'Connect your LinkedIn account to start creating and publishing posts',
            buttonText: 'Connect LinkedIn'
        };
    };

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

    return (
        <div className="bg-white/95 backdrop-blur-xl border-2 border-linkedin-200/60 rounded-3xl shadow-soft-lg hover:shadow-linkedin transition-all duration-300 hover:-translate-y-2">
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="p-4 bg-linkedin-600 rounded-3xl shadow-linkedin">
                            <Linkedin className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">
                                LinkedIn Connection
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                                Manage your LinkedIn integration
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onRefreshLinkedIn}
                        disabled={isRefreshingLinkedIn || linkedinStatusLoading}
                        className="p-3 text-gray-500 hover:text-linkedin-600 hover:bg-linkedin-50 rounded-2xl transition-all duration-300 disabled:opacity-50 hover:scale-110"
                        title="Refresh LinkedIn connection status"
                    >
                        <RefreshCw className={`w-6 h-6 ${isRefreshingLinkedIn ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Status Display */}
                <div className="text-center py-8">
                    {/* Status Card */}
                    <div className={`inline-flex items-center space-x-3 p-6 bg-gradient-to-br ${statusConfig.bgClass} border-2 ${statusConfig.borderClass} rounded-3xl mb-6 shadow-sm`}>
                        <StatusIcon className={`w-8 h-8 ${statusConfig.iconClass}`} />
                        <div className="text-left">
                            <div className="font-bold text-gray-900 text-lg">
                                {statusConfig.title}
                            </div>
                            {linkedinConnected && (
                                <div className="flex items-center space-x-2 mt-1">
                                    <Wifi className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-700 font-medium">Live Connection</span>
                                </div>
                            )}
                            {!linkedinConnected && !linkedinStatusLoading && (
                                <div className="flex items-center space-x-2 mt-1">
                                    <WifiOff className="w-4 h-4 text-orange-600" />
                                    <span className="text-sm text-orange-700 font-medium">Disconnected</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                        {statusConfig.description}
                    </p>

                    {/* Action Button */}
                    {statusConfig.buttonText && (
                        <button
                            type="button"
                            onClick={onConnectLinkedIn}
                            className="inline-flex items-center space-x-3 px-8 py-4 border-2 border-linkedin-600 text-linkedin-600 font-bold text-lg rounded-2xl hover:bg-linkedin-600 hover:text-white transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 shadow-lg hover:shadow-linkedin"
                        >
                            <Linkedin className="w-6 h-6" />
                            <span>{statusConfig.buttonText}</span>
                        </button>
                    )}
                </div>

                {/* Connection Benefits */}
                {!linkedinConnected && !linkedinStatusLoading && (
                    <div className="mt-8 p-6 bg-gradient-to-br from-beige-50 to-beige-100/50 rounded-2xl border-2 border-beige-200/50">
                        <h4 className="font-bold text-gray-900 mb-4 text-center">🚀 What you'll get:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-gray-700">Direct post publishing</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-gray-700">AI content optimization</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-gray-700">Engagement analytics</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-gray-700">Content scheduling</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LinkedInConnectionCard;
