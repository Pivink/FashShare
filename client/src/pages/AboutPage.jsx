import React from 'react';
import { Github, Twitter, Mail, Code, Palette, Award, Users, Target, Lightbulb, Linkedin } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const AboutPage = () => {
  const { theme } = useTheme();

  const developers = [
    {
      name: 'Praduman',
      role: 'Frontend Developer',
      description: 'Passionate about creating beautiful and intuitive user interfaces. Specializes in React, JavaScript, and modern web technologies with a keen eye for design and user experience.',
      image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
      social: {
        github: '#',
        linkedin: '#',
        email: 'praduman@zepshare.com'
      }
    },
    {
      name: 'Pivink',
      role: 'Backend Developer',
      description: 'Expert in server-side development and system architecture. Focuses on building scalable and efficient backend solutions with expertise in real-time communications and P2P technologies.',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
      social: {
        github: '#',
        linkedin: '#',
        email: 'pivink@zepshare.com'
      }
    }
  ];

  const stats = [
    { icon: <Users className="h-8 w-8" />, value: '10K+', label: 'Active Users' },
    { icon: <Award className="h-8 w-8" />, value: '99.9%', label: 'Uptime' },
    { icon: <Target className="h-8 w-8" />, value: '1M+', label: 'Files Shared' },
    { icon: <Lightbulb className="h-8 w-8" />, value: '24/7', label: 'Support' }
  ];

  const values = [
    {
      title: 'Privacy First',
      description: 'We believe your data belongs to you. Our P2P architecture ensures your files never touch our servers.',
      icon: '🔒'
    },
    {
      title: 'Innovation',
      description: 'Constantly pushing the boundaries of what\'s possible in file sharing technology.',
      icon: '🚀'
    },
    {
      title: 'Simplicity',
      description: 'Complex technology made simple. Beautiful interfaces that anyone can use.',
      icon: '✨'
    },
    {
      title: 'Community',
      description: 'Building tools that bring people together and make collaboration effortless.',
      icon: '🤝'
    }
  ];

  return (
    <div className={`min-h-screen ${theme.background} pt-24`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className={`text-5xl md:text-6xl font-bold ${theme.text} mb-6`}>
            Meet Our
            <span className={`block bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>
              Amazing Team
            </span>
          </h1>
          <p className={`text-xl ${theme.textSecondary} max-w-3xl mx-auto leading-relaxed`}>
            ZepShare is built by a passionate team of developers who believe in making file sharing 
            simple, secure, and accessible to everyone. We're on a mission to revolutionize how people share files.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className={`${theme.card} border rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
              <div className={`${theme.primary} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4`}>
                {stat.icon}
              </div>
              <div className={`text-3xl font-bold ${theme.text} mb-2`}>{stat.value}</div>
              <div className={`${theme.textSecondary} text-sm`}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Developer Cards - Clean Layout */}
        <div className="mb-20">
          <h2 className={`text-3xl md:text-4xl font-bold ${theme.text} text-center mb-12`}>
            Our Developers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {developers.map((developer, index) => (
              <div
                key={index}
                className={`${theme.card} border rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
              >
                {/* Profile Image */}
                <div className="mb-6">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <img 
                      src={developer.image} 
                      alt={developer.name}
                      className="w-full h-full object-cover rounded-full border-4 border-gray-200"
                    />
                  </div>
                  <h3 className={`text-2xl font-bold ${theme.text} mb-2`}>
                    {developer.name}
                  </h3>
                  <p className={`${theme.accent} font-semibold text-lg mb-4`}>
                    {developer.role}
                  </p>
                </div>

                {/* Description */}
                <p className={`${theme.textSecondary} leading-relaxed mb-6 text-sm`}>
                  {developer.description}
                </p>
                
                {/* Social Links */}
                <div className="flex justify-center space-x-4">
                  <a
                    href={developer.social.github}
                    className={`${theme.textSecondary} hover:${theme.text} p-2 rounded-full transition-all duration-200 hover:scale-110`}
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href={developer.social.linkedin}
                    className={`${theme.textSecondary} hover:${theme.text} p-2 rounded-full transition-all duration-200 hover:scale-110`}
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href={`mailto:${developer.social.email}`}
                    className={`${theme.textSecondary} hover:${theme.text} p-2 rounded-full transition-all duration-200 hover:scale-110`}
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h2 className={`text-3xl md:text-4xl font-bold ${theme.text} text-center mb-12`}>
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className={`${theme.card} border rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className={`text-xl font-bold ${theme.text} mb-3`}>{value.title}</h3>
                <p className={`${theme.textSecondary} text-sm leading-relaxed`}>{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mission Statement */}
        <div className={`${theme.card} border rounded-2xl p-12 text-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
          <div className="relative z-10">
            <h2 className={`text-3xl md:text-4xl font-bold ${theme.text} mb-6`}>
              Our Mission
            </h2>
            <p className={`text-lg ${theme.textSecondary} max-w-4xl mx-auto leading-relaxed`}>
              We believe that file sharing should be simple, secure, and accessible to everyone. 
              That's why we built ZepShare - a platform that puts privacy and user experience first. 
              Our goal is to eliminate the friction in file sharing while maintaining the highest 
              standards of security and performance. We're not just building software; we're creating 
              the future of digital collaboration.
            </p>
            <div className="mt-8">
              <div className={`inline-flex items-center space-x-2 ${theme.primary} text-white px-6 py-3 rounded-full font-semibold`}>
                <span>Join us on this journey</span>
                <span className="animate-pulse">🚀</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;