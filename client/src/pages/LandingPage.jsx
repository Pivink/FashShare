import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Share2, QrCode, Globe, Download } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const LandingPage = () => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme.background}`}>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent z-10"></div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold ${theme.text} leading-tight`}>
              Share Files
              <br />
              <span className={`bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>
                Lightning Fast
              </span>
            </h1>
            
            <p className={`text-xl md:text-2xl ${theme.textSecondary} max-w-3xl mx-auto`}>
              Peer-to-peer file sharing without limits. Secure, fast, and completely free.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/share"
                className={`${theme.primary} ${theme.text} px-8 py-4 rounded-lg text-lg font-semibold ${theme.hover} transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg`}
              >
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              
              <button className={`${theme.card} border ${theme.textSecondary} px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-all duration-300`}>
                Learn More
              </button>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-32 h-32 ${theme.accent} rounded-full opacity-20 animate-pulse`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-24 h-24 ${theme.primary} rounded-full opacity-30 animate-bounce`}></div>
          <div className={`absolute top-1/2 left-1/2 w-16 h-16 ${theme.secondary} rounded-full opacity-25 animate-ping`}></div>
        </div>
      </section>

      {/* About Project Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold ${theme.text} mb-6`}>
              About ZepShare
            </h2>
            <p className={`text-lg ${theme.textSecondary} max-w-3xl mx-auto`}>
              ZepShare is a revolutionary peer-to-peer file sharing platform that enables users to share files directly 
              between devices without any intermediary servers. Built with modern web technologies, it ensures your 
              files remain private and secure while providing lightning-fast transfer speeds.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`${theme.card} border rounded-lg p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
              <Shield className={`h-12 w-12 ${theme.accent} mx-auto mb-4`} />
              <h3 className={`text-xl font-semibold ${theme.text} mb-4`}>Secure</h3>
              <p className={`${theme.textSecondary}`}>
                End-to-end encryption ensures your files are protected during transfer
              </p>
            </div>
            
            <div className={`${theme.card} border rounded-lg p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
              <Zap className={`h-12 w-12 ${theme.accent} mx-auto mb-4`} />
              <h3 className={`text-xl font-semibold ${theme.text} mb-4`}>Fast</h3>
              <p className={`${theme.textSecondary}`}>
                Direct peer-to-peer connections for maximum transfer speeds
              </p>
            </div>
            
            <div className={`${theme.card} border rounded-lg p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
              <Share2 className={`h-12 w-12 ${theme.accent} mx-auto mb-4`} />
              <h3 className={`text-xl font-semibold ${theme.text} mb-4`}>Easy</h3>
              <p className={`${theme.textSecondary}`}>
                Simple drag-and-drop interface for effortless file sharing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Use ZepShare Section */}
      <section className={`py-20 ${theme.secondary}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold ${theme.text} mb-6`}>
              Why Choose ZepShare?
            </h2>
            <p className={`text-lg ${theme.textSecondary} max-w-3xl mx-auto`}>
              Experience the future of file sharing with features designed for modern users
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <div className={`${theme.primary} rounded-lg p-3 flex-shrink-0`}>
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>No File Size Limit</h3>
                <p className={`${theme.textSecondary}`}>
                  Share files of any size without restrictions or compression
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className={`${theme.primary} rounded-lg p-3 flex-shrink-0`}>
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>QR Code Sharing</h3>
                <p className={`${theme.textSecondary}`}>
                  Generate QR codes for instant sharing between devices
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className={`${theme.primary} rounded-lg p-3 flex-shrink-0`}>
                <Download className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Link Sharing</h3>
                <p className={`${theme.textSecondary}`}>
                  Share downloadable links for easy access from anywhere
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className={`${theme.primary} rounded-lg p-3 flex-shrink-0`}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Secure P2P Transfer</h3>
                <p className={`${theme.textSecondary}`}>
                  Direct device-to-device transfer without server storage
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className={`${theme.primary} rounded-lg p-3 flex-shrink-0`}>
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Lightning Speed</h3>
                <p className={`${theme.textSecondary}`}>
                  Maximum transfer speeds with optimized connections
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className={`${theme.primary} rounded-lg p-3 flex-shrink-0`}>
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Cross Platform</h3>
                <p className={`${theme.textSecondary}`}>
                  Works seamlessly across all devices and platforms
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-3xl md:text-4xl font-bold ${theme.text} mb-6`}>
            Ready to Start Sharing?
          </h2>
          <p className={`text-lg ${theme.textSecondary} mb-8 max-w-2xl mx-auto`}>
            Join thousands of users who trust ZepShare for their file sharing needs
          </p>
          <Link
            to="/share"
            className={`${theme.primary} ${theme.text} px-8 py-4 rounded-lg text-lg font-semibold ${theme.hover} transition-all duration-300 transform hover:scale-105 inline-flex items-center space-x-2 shadow-lg`}
          >
            <span>Get Started Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;