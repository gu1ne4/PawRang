import type React from 'react';
import { IoCallOutline, IoMailOutline } from 'react-icons/io5';
import petshieldLogo from '../assets/PetshieldLogo.png';
import pawRangLogo from '../assets/PawRang Logomark.png';
import pawRangLogoWhite from '../assets/PawRang Logomark White.png';
import '../user_pages/UserSharedFooterStyles.css';

interface PetshieldFooterProps {
  className?: string;
  variant?: 'full' | 'compact';
}

const PetshieldFooter: React.FC<PetshieldFooterProps> = ({ className = '', variant = 'full' }) => {
  const footerClassName = [
    'user-page-footer',
    variant === 'compact' ? 'petshield-footer--compact' : '',
    className
  ].filter(Boolean).join(' ');

  if (variant === 'compact') {
    return (
      <footer className={footerClassName} aria-label="Petshield footer">
        <div className="petshield-footer-compact-content">
          <img src={petshieldLogo} alt="Petshield" className="petshield-footer-compact-logo" />
          <div className="home-footer-powered">
            <span>Powered by</span>
            <img src={pawRangLogo} alt="PawRang" />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={footerClassName} aria-label="Petshield footer">
      <div className="home-footer-main">
        <div className="home-footer-brand">
          <img src={petshieldLogo} alt="Petshield" />
          <div>
            <h2>Petshield</h2>
            <p>Veterinary Clinic &amp; Grooming Center</p>
          </div>
        </div>

        <div className="home-footer-branches">
          <div className="home-footer-branch">
            <h3>Petshield Las Pinas</h3>
            <p>Las Pinas City, Metro Manila</p>
            <div className="home-footer-contact-actions">
              <a href="mailto:petshield@gmail.com">
                <IoMailOutline size={17} />
                petshield@gmail.com
              </a>
              <a href="tel:+639123456789">
                <IoCallOutline size={17} />
                +63 912 345 6789
              </a>
            </div>
          </div>

          <div className="home-footer-branch">
            <h3>Petshield Taguig</h3>
            <p>Taguig City, Metro Manila</p>
            <div className="home-footer-contact-actions">
              <a href="mailto:petshieldtaguig@gmail.com">
                <IoMailOutline size={17} />
                petshieldtaguig@gmail.com
              </a>
              <a href="tel:+639987654321">
                <IoCallOutline size={17} />
                +63 998 765 4321
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="home-footer-powered">
          <span>Powered by</span>
          <img src={pawRangLogoWhite} alt="PawRang" />
        </div>
      </footer>
  );
};

export default PetshieldFooter;
