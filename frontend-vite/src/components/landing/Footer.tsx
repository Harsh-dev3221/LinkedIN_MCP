import React from 'react';
import { Sparkles, Mail, Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
    const currentYear = 2025;



    const socialLinks = [
        { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/in/harsh-patel-40b043319/', color: 'hover:text-linkedin-600' },
        { name: 'GitHub', icon: Github, href: 'https://github.com/Harsh-dev3221', color: 'hover:text-gray-900' }
    ];

    return (
        <footer className="bg-gray-900 text-white">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                    {/* Brand Section */}
                    <div className="lg:max-w-md">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-xl flex items-center justify-center shadow-linkedin">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold">PostWizz</span>
                                <span className="text-xs text-gray-400 -mt-1">LinkedIn Content Creator</span>
                            </div>
                        </div>
                        <p className="text-gray-300 mb-6 leading-relaxed">
                            Transform your LinkedIn presence with AI-powered content creation.
                            Generate engaging posts, build your personal brand, and grow your professional network effortlessly.
                        </p>
                    </div>

                    {/* Developer Info */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white mb-3">Developer</h4>
                        <div className="flex items-center space-x-3 text-gray-300">
                            <Mail className="w-4 h-4 text-linkedin-400" />
                            <a href="mailto:harshpatel25800@gmail.com" className="text-sm hover:text-linkedin-400 transition-colors">
                                harshpatel25800@gmail.com
                            </a>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-300">
                            <Github className="w-4 h-4 text-linkedin-400" />
                            <a href="https://github.com/Harsh-dev3221" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-linkedin-400 transition-colors">
                                GitHub Profile
                            </a>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-300">
                            <Linkedin className="w-4 h-4 text-linkedin-400" />
                            <a href="https://www.linkedin.com/in/harsh-patel-40b043319/" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-linkedin-400 transition-colors">
                                LinkedIn Profile
                            </a>
                        </div>
                    </div>
                </div>


            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="text-gray-400 text-sm">
                            © {currentYear} PostWizz. All rights reserved. Made with ❤️ for LinkedIn creators.
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center space-x-6">
                            {socialLinks.map((social, index) => {
                                const IconComponent = social.icon;
                                return (
                                    <a
                                        key={index}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`text-gray-400 ${social.color} transition-colors`}
                                        aria-label={social.name}
                                    >
                                        <IconComponent className="w-5 h-5" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
