import React from 'react';
import { Github, Twitter, Mail, Heart, Code, Zap, Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Footer = () => {
  const { theme } = useTheme();

  const features = [
    { icon: <Shield className="h-5 w-5" />, text: 'Secure P2P Transfer' },
    { icon: <Zap className="h-5 w-5" />, text: 'Lightning Fast' },
    { icon: <Code className="h-5 w-5" />, text: 'Open Source' }
  ];

  const links = {
    product: [
      { name: 'Features', href: '#' },
      { name: 'Security', href: '#' },
      { name: 'Pricing', href: '#' },
      { name: 'API', href: '#' }
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Blog', href: '#' },
      { name: 'Careers', href: '#' }
    ],
    support: [
      { name: 'Help Center', href: '#' },
      { name: 'Documentation', href: '#' },
      { name: 'Status', href: '#' },
      { name: 'Community', href: '#' }
    ]
  };

  return (
    <footer className={`${theme.secondary} ${theme.text} mt-auto border-t ${theme.card}`}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-10 h-10 ${theme.primary} rounded-xl flex items-center justify-center`}>
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <span className="text-2xl font-bold">ZepShare</span>
            </div>
            <p className={`${theme.textSecondary} mb-6 max-w-md`}>
              The future of file sharing. Secure, fast, and completely peer-to-peer. 
              Share files of any size without limits or intermediaries.
            </p>
            
            {/* Features */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`${theme.accent} text-white p-1 rounded`}>
                    {feature.icon}
                  </div>
                  <span className={`${theme.textSecondary} text-sm`}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h3 className={`${theme.text} font-semibold mb-4`}>Product</h3>
            <ul className="space-y-2">
              {links.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200 text-sm`}>
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={`${theme.text} font-semibold mb-4`}>Company</h3>
            <ul className="space-y-2">
              {links.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200 text-sm`}>
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={`${theme.text} font-semibold mb-4`}>Support</h3>
            <ul className="space-y-2">
              {links.support.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200 text-sm`}>
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className={`mt-12 pt-8 border-t ${theme.card}`}>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className={`${theme.text} font-semibold mb-2`}>Stay updated</h3>
              <p className={`${theme.textSecondary} text-sm`}>Get the latest news and updates about ZepShare</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className={`px-4 py-2 rounded-lg border ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64`}
              />
              <button className={`${theme.primary} ${theme.text} px-6 py-2 rounded-lg font-semibold ${theme.hover} transition-all duration-300 whitespace-nowrap`}>
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t ${theme.card} py-6`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <p className={`${theme.textSecondary} text-sm`}>
                &copy; 2024 ZepShare. All rights reserved.
              </p>
              <span className="flex items-center space-x-1 text-sm">
                <span className={`${theme.textSecondary}`}>Made with</span>
                <Heart className="h-4 w-4 text-red-500 fill-current" />
                <span className={`${theme.textSecondary}`}>by the ZepShare team</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <a href="#" className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200`}>
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200`}>
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200`}>
                  <Mail className="h-5 w-5" />
                </a>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <a href="#" className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200`}>
                  Privacy Policy
                </a>
                <a href="#" className={`${theme.textSecondary} ${theme.hover} transition-colors duration-200`}>
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;