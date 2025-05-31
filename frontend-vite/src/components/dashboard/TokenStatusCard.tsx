import React from 'react';
import { Coins, RefreshCw, Zap, TrendingUp } from 'lucide-react';
import { TokenStatus } from '../../lib/supabase';

interface TokenStatusCardProps {
    tokenStatus: TokenStatus | null;
    onRefreshTokens: () => void;
}

const TokenStatusCard: React.FC<TokenStatusCardProps> = ({ tokenStatus, onRefreshTokens }) => {
    const getProgressColor = (percentage: number) => {
        if (percentage > 50) return 'from-green-500 to-green-600';
        if (percentage > 20) return 'from-orange-500 to-orange-600';
        return 'from-red-500 to-red-600';
    };

    const getProgressBgColor = (percentage: number) => {
        if (percentage > 50) return 'bg-green-50 border-green-200';
        if (percentage > 20) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    };

    return (
        <div className="bg-white/95 backdrop-blur-xl border-2 border-orange-200/60 rounded-3xl shadow-soft-lg hover:shadow-orange transition-all duration-300 hover:-translate-y-2">
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-orange">
                            <Coins className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">
                                Daily Tokens
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                                AI-powered content generation
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onRefreshTokens}
                        className="p-3 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all duration-300 hover:scale-110"
                        title="Refresh token status"
                    >
                        <RefreshCw className="w-6 h-6" />
                    </button>
                </div>

                {tokenStatus ? (
                    <>
                        {/* Token Stats Grid */}
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100/50 rounded-3xl border-2 border-green-200/50 hover:scale-105 transition-transform duration-300">
                                <div className="flex items-center justify-center mb-3">
                                    <Zap className="w-6 h-6 text-green-600 mr-2" />
                                    <div className="text-4xl font-bold text-green-600">
                                        {tokenStatus.tokens_remaining}
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-green-700">
                                    Remaining
                                </div>
                            </div>
                            
                            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-3xl border-2 border-orange-200/50 hover:scale-105 transition-transform duration-300">
                                <div className="flex items-center justify-center mb-3">
                                    <TrendingUp className="w-6 h-6 text-orange-600 mr-2" />
                                    <div className="text-4xl font-bold text-orange-600">
                                        {tokenStatus.tokens_used_today}
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-orange-700">
                                    Used Today
                                </div>
                            </div>
                            
                            <div className="text-center p-6 bg-gradient-to-br from-linkedin-50 to-linkedin-100/50 rounded-3xl border-2 border-linkedin-200/50 hover:scale-105 transition-transform duration-300">
                                <div className="flex items-center justify-center mb-3">
                                    <Coins className="w-6 h-6 text-linkedin-600 mr-2" />
                                    <div className="text-4xl font-bold text-linkedin-600">
                                        {tokenStatus.daily_tokens}
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-linkedin-700">
                                    Daily Limit
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-semibold text-gray-700">Token Usage</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {Math.round((tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100)}% remaining
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${getProgressColor((tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100)}`}
                                    style={{
                                        width: `${(tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100}%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Info Banner */}
                        <div className={`p-4 rounded-2xl border-2 ${getProgressBgColor((tokenStatus.tokens_remaining / tokenStatus.daily_tokens) * 100)}`}>
                            <p className="text-sm text-gray-700 text-center font-medium">
                                🔄 Tokens refresh daily at midnight UTC
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">
                            Loading token status...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TokenStatusCard;
