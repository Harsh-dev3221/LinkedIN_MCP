import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../../lib/supabase';

interface UserProfileCardProps {
    user: User | null;
    onSignOut: () => void;
    getProviderColor: (provider: string) => string;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ user, onSignOut }) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-soft transition-all duration-300 sticky top-24">
            {/* Profile Header */}
            <div className="text-center mb-6">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.name || 'User'}
                            className="w-20 h-20 rounded-2xl border-2 border-linkedin-200 object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl border-2 border-linkedin-200 bg-gradient-to-br from-linkedin-500 to-linkedin-600 flex items-center justify-center text-white font-bold text-xl">
                            {user?.name?.charAt(0) || user?.email?.charAt(0) || <UserIcon className="w-8 h-8" />}
                        </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>

                {/* User Info */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {user?.name || 'User'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        {user?.email}
                    </p>
                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-white capitalize ${user?.provider === 'google' ? 'bg-blue-500' :
                            user?.provider === 'linkedin' ? 'bg-linkedin-500' :
                                'bg-gray-500'
                            }`}
                    >
                        {user?.provider} Account
                    </span>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-linkedin-50 rounded-xl">
                    <span className="text-sm font-medium text-linkedin-700">Status</span>
                    <span className="text-sm font-bold text-linkedin-600">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                    <span className="text-sm font-medium text-orange-700">Plan</span>
                    <span className="text-sm font-bold text-orange-600">Pro</span>
                </div>
            </div>

            {/* Sign Out Button */}
            <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-xl transition-all duration-300 font-medium"
            >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
            </button>
        </div>
    );
};

export default UserProfileCard;
