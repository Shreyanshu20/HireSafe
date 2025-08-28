import { Link } from 'react-router-dom';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-6 lg:gap-8">
          {/* Company Info */}
          <div className="space-y-4 text-center sm:text-left">
            <h3 className="text-xl font-semibold text-white tracking-wide">HireSafe</h3>
            <p className="text-sm max-w-xs mx-auto sm:mx-0">
              Transforming the hiring process with secure and efficient video interviews.
            </p>
            <div className="flex justify-center sm:justify-start space-x-6">
              <a 
                href="https://twitter.com" 
                className="hover:text-blue-400 transition-colors duration-300 text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter
              </a>
              <a 
                href="https://linkedin.com" 
                className="hover:text-blue-400 transition-colors duration-300 text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              <a 
                href="https://github.com" 
                className="hover:text-blue-400 transition-colors duration-300 text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 text-center sm:text-left">
            <h3 className="text-xl font-semibold text-white tracking-wide">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="hover:text-blue-400 transition-colors duration-300 text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-400 transition-colors duration-300 text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors duration-300 text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition-colors duration-300 text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 text-center sm:text-left">
            <h3 className="text-xl font-semibold text-white tracking-wide">Contact Us</h3>
            <ul className="space-y-3">
              <li className="text-sm flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="font-medium">Email:</span>
                <a href="mailto:contact@hiresafe.com" className="hover:text-blue-400 transition-colors duration-300">
                  contact@hiresafe.com
                </a>
              </li>
              <li className="text-sm flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="font-medium">Phone:</span>
                <a href="tel:+15551234567" className="hover:text-blue-400 transition-colors duration-300">
                  +1 (555) 123-4567
                </a>
              </li>
              <li className="text-sm">
                <span className="font-medium">Address:</span><br />
                <address className="not-italic mt-1">
                  123 Innovation Street,<br />
                  Tech Valley, CA 94025
                </address>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-8 text-sm text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <span>© {currentYear} HireSafe. All rights reserved.</span>
            <div className="flex items-center space-x-2">
              <Link to="/privacy" className="hover:text-blue-400 transition-colors duration-300">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-blue-400 transition-colors duration-300">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
