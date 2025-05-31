import React from 'react';
import { Sparkles, Mail, MapPin, Phone, Linkedin, Twitter, Github, Youtube } from 'lucide-react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        product: [
            { name: 'Features', href: '#features' },
            { name: 'Pricing', href: '#pricing' },
            { name: 'API', href: '#api' },
            { name: 'Integrations', href: '#integrations' },
            { name: 'Changelog', href: '#changelog' }
        ],
        company: [
            { name: 'About Us', href: '#about' },
            { name: 'Careers', href: '#careers' },
            { name: 'Blog', href: '#blog' },
            { name: 'Press Kit', href: '#press' },
            { name: 'Contact', href: '#contact' }
        ],
        resources: [
            { name: 'Documentation', href: '#docs' },
            { name: 'Help Center', href: '#help' },
            { name: 'LinkedIn Guide', href: '#guide' },
            { name: 'Content Templates', href: '#templates' },
            { name: 'Best Practices', href: '#practices' }
        ],
        legal: [
            { name: 'Privacy Policy', href: '#privacy' },
            { name: 'Terms of Service', href: '#terms' },
            { name: 'Cookie Policy', href: '#cookies' },
            { name: 'GDPR', href: '#gdpr' },
            { name: 'Security', href: '#security' }
        ]
    };

    const socialLinks = [
        { name: 'LinkedIn', icon: Linkedin, href: '#', color: 'hover:text-linkedin-600' },
        { name: 'Twitter', icon: Twitter, href: '#', color: 'hover:text-blue-400' },
        { name: 'GitHub', icon: Github, href: '#', color: 'hover:text-gray-900' },
        { name: 'YouTube', icon: Youtube, href: '#', color: 'hover:text-red-600' }
    ];

    return (
        <footer className="bg-gray-900 text-white">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 lg:gap-12">
                    {/* Brand Section */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-linkedin-500 to-linkedin-600 rounded-xl flex items-center justify-center shadow-linkedin">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold">Post AI</span>
                                <span className="text-xs text-gray-400 -mt-1">LinkedIn Content Creator</span>
                            </div>
                        </div>
                        <p className="text-gray-300 mb-6 leading-relaxed">
                            Transform your LinkedIn presence with AI-powered content creation. 
                            Generate engaging posts, build your personal brand, and grow your professional network effortlessly.
                        </p>
                        
                        {/* Contact Info */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3 text-gray-300">
                                <Mail className="w-4 h-4 text-linkedin-400" />
                                <span className="text-sm">hello@postai.com</span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-300">
                                <Phone className="w-4 h-4 text-linkedin-400" />
                                <span className="text-sm">+1 (555) 123-4567</span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-300">
                                <MapPin className="w-4 h-4 text-linkedin-400" />
                                <span className="text-sm">San Francisco, CA</span>
                            </div>
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Product</h3>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link, index) => (
                                <li key={index}>
                                    <a 
                                        href={link.href} 
                                        className="text-gray-300 hover:text-linkedin-400 transition-colors text-sm"
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link, index) => (
                                <li key={index}>
                                    <a 
                                        href={link.href} 
                                        className="text-gray-300 hover:text-linkedin-400 transition-colors text-sm"
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Resources</h3>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link, index) => (
                                <li key={index}>
                                    <a 
                                        href={link.href} 
                                        className="text-gray-300 hover:text-linkedin-400 transition-colors text-sm"
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Legal</h3>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link, index) => (
                                <li key={index}>
                                    <a 
                                        href={link.href} 
                                        className="text-gray-300 hover:text-linkedin-400 transition-colors text-sm"
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Newsletter Signup */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="max-w-md">
                        <h3 className="text-lg font-semibold mb-4 text-white">Stay Updated</h3>
                        <p className="text-gray-300 text-sm mb-4">
                            Get the latest LinkedIn content tips and AI updates delivered to your inbox.
                        </p>
                        <div className="flex space-x-3">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-linkedin-500 focus:ring-1 focus:ring-linkedin-500"
                            />
                            <button className="bg-gradient-to-r from-linkedin-500 to-linkedin-600 text-white px-6 py-2 rounded-lg font-medium hover:from-linkedin-600 hover:to-linkedin-700 transition-all duration-300 shadow-linkedin">
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="text-gray-400 text-sm">
                            © {currentYear} Post AI. All rights reserved. Made with ❤️ for LinkedIn creators.
                        </div>
                        
                        {/* Social Links */}
                        <div className="flex items-center space-x-6">
                            {socialLinks.map((social, index) => {
                                const IconComponent = social.icon;
                                return (
                                    <a
                                        key={index}
                                        href={social.href}
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
