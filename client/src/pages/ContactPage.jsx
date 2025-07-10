import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, Globe, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ContactPage = () => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contactMethods = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: 'Email Us',
      description: 'Send us an email and we\'ll respond within 24 hours',
      contact: 'contact@zepshare.com',
      action: 'mailto:contact@zepshare.com'
    },
    {
      icon: <Phone className="h-6 w-6" />,
      title: 'Call Us',
      description: 'Speak directly with our support team',
      contact: '+1 (555) 123-4567',
      action: 'tel:+15551234567'
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: 'Live Chat',
      description: 'Chat with us in real-time for instant support',
      contact: 'Available 24/7',
      action: '#'
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: 'Visit Us',
      description: 'Come visit our office for in-person meetings',
      contact: '123 Tech Street, San Francisco, CA',
      action: '#'
    }
  ];

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'business', label: 'Business Partnership' },
    { value: 'feedback', label: 'Feedback & Suggestions' },
    { value: 'bug', label: 'Bug Report' }
  ];

  const faqs = [
    {
      question: 'How secure is ZepShare?',
      answer: 'ZepShare uses end-to-end encryption and direct P2P connections to ensure your files are completely secure. We never store your files on our servers.'
    },
    {
      question: 'Is there a file size limit?',
      answer: 'No, ZepShare has no file size limits. Share files of any size without restrictions or compression.'
    },
    {
      question: 'Do you store my files?',
      answer: 'No, files are transferred directly between devices. We never store your files on our servers, ensuring complete privacy.'
    },
    {
      question: 'How fast are the transfers?',
      answer: 'Transfer speeds depend on your internet connection and the recipient\'s connection. P2P transfers are typically faster than traditional cloud uploads.'
    },
    {
      question: 'Can I share files with multiple people?',
      answer: 'Yes, you can create rooms and share files with multiple recipients simultaneously using our room-based sharing system.'
    }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '', category: 'general' });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    }, 1500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className={`min-h-screen ${theme.background} pt-24`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className={`text-5xl md:text-6xl font-bold ${theme.text} mb-6`}>
            Get in
            <span className={`block bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>
              Touch
            </span>
          </h1>
          <p className={`text-xl ${theme.textSecondary} max-w-3xl mx-auto leading-relaxed`}>
            Have questions about ZepShare? We'd love to hear from you. Our team is here to help 
            and we respond to all inquiries within 24 hours.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactMethods.map((method, index) => (
            <a
              key={index}
              href={method.action}
              className={`${theme.card} border rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105 block`}
            >
              <div className={`${theme.primary} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4`}>
                {method.icon}
              </div>
              <h3 className={`${theme.text} font-bold text-lg mb-2`}>{method.title}</h3>
              <p className={`${theme.textSecondary} text-sm mb-3`}>{method.description}</p>
              <p className={`${theme.accent} font-semibold text-sm`}>{method.contact}</p>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className={`${theme.card} border rounded-2xl p-8`}>
              <div className="flex items-center space-x-3 mb-6">
                <div className={`${theme.primary} rounded-lg p-2`}>
                  <Send className="h-6 w-6 text-white" />
                </div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>Send us a message</h2>
              </div>
              
              {submitted && (
                <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-800">
                    Thank you for your message! We'll get back to you within 24 hours.
                  </p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className={`block text-sm font-medium ${theme.text} mb-2`}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      } ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200`}
                      placeholder="Your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className={`block text-sm font-medium ${theme.text} mb-2`}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      } ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200`}
                      placeholder="your.email@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="category" className={`block text-sm font-medium ${theme.text} mb-2`}>
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border border-gray-300 ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200`}
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="subject" className={`block text-sm font-medium ${theme.text} mb-2`}>
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.subject ? 'border-red-500' : 'border-gray-300'
                      } ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200`}
                      placeholder="Brief subject of your message"
                    />
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-500">{errors.subject}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className={`block text-sm font-medium ${theme.text} mb-2`}>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="6"
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.message ? 'border-red-500' : 'border-gray-300'
                    } ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 resize-none`}
                    placeholder="Tell us how we can help you..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full ${theme.primary} ${theme.text} py-4 px-6 rounded-lg font-semibold ${theme.hover} transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Contact Information */}
            <div className={`${theme.card} border rounded-2xl p-8`}>
              <div className="flex items-center space-x-3 mb-6">
                <div className={`${theme.primary} rounded-lg p-2`}>
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h2 className={`text-xl font-bold ${theme.text}`}>Contact Information</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className={`${theme.secondary} rounded-lg p-3 flex-shrink-0`}>
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className={`${theme.text} font-semibold mb-1`}>Email</p>
                    <p className={`${theme.textSecondary} text-sm`}>contact@zepshare.com</p>
                    <p className={`${theme.textSecondary} text-sm`}>support@zepshare.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className={`${theme.secondary} rounded-lg p-3 flex-shrink-0`}>
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className={`${theme.text} font-semibold mb-1`}>Phone</p>
                    <p className={`${theme.textSecondary} text-sm`}>+1 (555) 123-4567</p>
                    <p className={`${theme.textSecondary} text-sm`}>+1 (555) 987-6543</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className={`${theme.secondary} rounded-lg p-3 flex-shrink-0`}>
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className={`${theme.text} font-semibold mb-1`}>Business Hours</p>
                    <p className={`${theme.textSecondary} text-sm`}>Mon - Fri: 9:00 AM - 6:00 PM</p>
                    <p className={`${theme.textSecondary} text-sm`}>Sat - Sun: 10:00 AM - 4:00 PM</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className={`${theme.secondary} rounded-lg p-3 flex-shrink-0`}>
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className={`${theme.text} font-semibold mb-1`}>Address</p>
                    <p className={`${theme.textSecondary} text-sm`}>
                      123 Tech Street<br />
                      San Francisco, CA 94105<br />
                      United States
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className={`${theme.card} border rounded-2xl p-8`}>
              <h3 className={`text-xl font-bold ${theme.text} mb-6`}>
                Frequently Asked Questions
              </h3>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <details key={index} className="group">
                    <summary className={`${theme.text} font-semibold cursor-pointer list-none flex items-center justify-between py-2 hover:${theme.textSecondary} transition-colors duration-200`}>
                      <span className="text-sm">{faq.question}</span>
                      <span className="ml-2 transform group-open:rotate-180 transition-transform duration-200">
                        ▼
                      </span>
                    </summary>
                    <p className={`${theme.textSecondary} text-sm mt-2 pl-4 border-l-2 ${theme.card}`}>
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;