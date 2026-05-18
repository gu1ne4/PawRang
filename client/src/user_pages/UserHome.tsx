import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './UserStyles.css';
import './UserHomeStyles.css';
import { apiService } from '../apiService';
import Login from '../global_pages/Login';
import Registration from '../global_pages/Registration';
import ClientNavBar from '../reusable_components/ClientNavBar';
import { getDefaultRouteForUser } from '../auth/roles';
import redHeader from '../assets/redHeader.svg';
import blueHeader from '../assets/blueHeader.svg';
import catModel from '../assets/catModel.svg';
import dogModel from '../assets/dogModel.svg';
import catPeeking from '../assets/catPeeking.svg';
import dogPeeking from '../assets/dogPeeking.svg';
import petshieldLogo from '../assets/PetshieldLogo.png';
import pawRangLogo from '../assets/PawRang Logomark White.png';
import branchLP from '../assets/branchLP.jpg';
import branchTaguig from '../assets/branchTaguig.jpg';
import samplePet from '../assets/samplePet.jpg';
import sampleDoc from '../assets/sampleDoc.jpg';
import phoneMockup from '../assets/phoneMockup.svg';
import lpGroomingCert from '../assets/LPGroomingCert.jpg';
import lpSurgeryCert from '../assets/LPSurgeryCert.jpg';
import taguigBoardingCert from '../assets/TaguigBoardingCert.jpg';
import taguigGroomingCert from '../assets/TaguigGroomingCert.jpg';
import taguigSurgeryCert from '../assets/TaguigSurgeryCert.jpg';
import groomingImage from '../assets/GroomingImage.jpg';
import diagnosticsImage from '../assets/DiagnosticsImage.jpg';
import confinementImage from '../assets/ConfinementImage.jpg';
import titleCertLP from '../assets/TitleCertLP.jpg';
import titleCertTaguig from '../assets/TitleCertTaguig.jpg';
import consultationImage from '../assets/ConsultationImage.jpg';
import sampleMedia from '../assets/socialMedia Image.jpg';
import sampleMedia2 from '../assets/socialMedia Image2.jpg';
import sampleMedia3 from '../assets/socialMedia Image3.jpg';
import sampleAnnouncement from '../assets/sampleAnnouncement.jpg';
import sampleAnnouncement2 from '../assets/sampleAnnouncement2.jpg';
import sampleAnnouncement3 from '../assets/sampleAnnouncement3.jpg';
import sampleAnnouncement4 from '../assets/sampleAnnouncement4.jpg';

import {
  IoAlertCircleOutline,
  IoCalendarOutline,
  IoChevronBackOutline,
  IoChevronDownOutline,
  IoChevronForwardOutline,
  IoCheckmarkCircleOutline,
  IoChatbubbleOutline,
  IoCloseCircleOutline,
  IoHeartOutline,
  IoLocationOutline,
  IoLogoApple,
  IoLogoFacebook,
  IoLogoGooglePlaystore,
  IoLogoTiktok,
  IoMedalOutline,
  IoMedicalOutline,
  IoPawOutline,
  IoPhonePortraitOutline,
  IoReaderOutline,
  IoRibbonOutline,
  IoShareSocialOutline,
  IoShieldCheckmarkOutline,
  IoInformationCircle,
  IoMapOutline,
  IoMailOutline,
  IoCallOutline,
} from 'react-icons/io5';

interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  fullName?: string;
  profileImage?: string | null;
  userImage?: string;
  userimage?: string;
  user_image?: string;
  role?: string;
  email?: string;
  contact_number?: string;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm?: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

const UserHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const normalizeHomeUser = (raw: any): User | null => {
    if (!raw) return null;
    const profileImage =
      raw.profileImage ||
      raw.userImage ||
      raw.userimage ||
      raw.user_image ||
      null;

    return {
      ...raw,
      profileImage,
      userImage: profileImage || undefined,
      userimage: profileImage || undefined,
      user_image: profileImage || undefined,
    };
  };

  const getStoredUser = (): User | null => {
    try {
      const raw = localStorage.getItem('userSession');
      return normalizeHomeUser(raw ? JSON.parse(raw) : null);
    } catch {
      return null;
    }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getStoredUser();
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false,
    confirmText: 'OK',
  });
  const [aboutSlideIndex, setAboutSlideIndex] = useState(0);
  const [announcementSlideIndex, setAnnouncementSlideIndex] = useState(0);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number | null>(null);
  const welcomeSectionRef = useRef<HTMLElement | null>(null);
  const [welcomePetsVisible, setWelcomePetsVisible] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    let isCancelled = false;

    apiService
      .getProfile(currentUser.id)
      .then(res => {
        if (isCancelled) return;
        const profilePayload = res?.user || res || {};
        const updated = normalizeHomeUser({
          ...currentUser,
          ...profilePayload,
          profileImage:
            profilePayload.profileImage ||
            profilePayload.userImage ||
            profilePayload.userimage ||
            profilePayload.user_image ||
            currentUser.profileImage ||
            currentUser.userImage ||
            currentUser.userimage ||
            currentUser.user_image ||
            null,
        });
        if (!updated) return;
        setCurrentUser(updated);
        localStorage.setItem('userSession', JSON.stringify(updated));
      })
      .catch(err => console.error('Failed to refresh profile:', err));

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const authState = location.state as { authMode?: 'login' | 'register' } | null;

    if (authState?.authMode === 'login' || authState?.authMode === 'register') {
      setAuthModalMode(authState.authMode);
      navigate('/user/home', { replace: true, state: null });
      return;
    }

    const refreshFromStorage = () => {
      const storedUser = getStoredUser();
      if (storedUser) setCurrentUser(storedUser);
    };

    window.addEventListener('focus', refreshFromStorage);
    document.addEventListener('visibilitychange', refreshFromStorage);

    return () => {
      window.removeEventListener('focus', refreshFromStorage);
      document.removeEventListener('visibilitychange', refreshFromStorage);
    };
  }, [location.state, navigate]);

  useEffect(() => {
    const homePage = document.querySelector('.user-home-page');

    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      if (homePage instanceof HTMLElement) {
        homePage.scrollTo({ top: 0, behavior: 'smooth' });
      }

      return;
    }

    const targetId = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [location.hash, location.state, navigate]);

  const showAlert = (
    type: ModalConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm?: (() => void) | null,
    showCancel = false,
    confirmText = 'OK',
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setModalVisible(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    localStorage.removeItem('access_token');
    setCurrentUser(null);
    setAuthModalMode('login');
  };

  const heroReviews = [
    {
      name: 'Mika R.',
      pet: 'Mochi',
      quote: 'Booking a check-up took less than a minute, and I knew exactly what to bring.',
    },
    {
      name: 'Dane C.',
      pet: 'Bingo',
      quote: 'The reminders and appointment updates made the whole visit feel organized.',
    },
    {
      name: 'Sofia L.',
      pet: 'Luna',
      quote: 'I love having my pet profiles ready before scheduling grooming and vaccines.',
    },
    {
      name: 'Carlo M.',
      pet: 'Pepper',
      quote: 'Clean, simple, and easy to use even when I am booking for multiple pets.',
    },
  ];

  const serviceCards = [
    {
      name: 'Wellness Consultation',
      details: 'Routine exams, preventive care advice, and follow-up planning for everyday health needs.',
      accent: 'Medical',
      icon: <IoMedicalOutline size={34} />,
      image: consultationImage,
      subServices: ['General check-up', 'Preventive wellness planning', 'Follow-up consultation'],
    },
    {
      name: 'Pet Grooming',
      details: 'Grooming packages with style preferences, branch selection, and medical reminders.',
      accent: 'Grooming',
      icon: <IoPawOutline size={34} />,
      image: groomingImage,
      subServices: ['Bath and blow dry', 'Haircut and styling', 'Nail trimming', 'Ear cleaning'],
    },
    {
      name: 'Diagnostics',
      details: 'Laboratory tests, x-ray, and ultrasound scheduling for supported branches.',
      accent: 'Lab support',
      icon: <IoHeartOutline size={34} />,
      image: diagnosticsImage,
      subServices: ['Laboratory tests', 'X-ray', 'Ultrasound'],
    },
    {
      name: 'Boarding and Recovery',
      details: 'Support for confinement, boarding, and other care services handled by Petshield.',
      accent: 'Recovery',
      icon: <IoCalendarOutline size={34} />,
      image: confinementImage,
      subServices: ['Confinement care', 'Boarding support', 'Recovery monitoring'],
    },
    {
      name: 'Vaccination',
      details: 'Core and routine vaccine visit planning with reminders for your pet profile.',
      accent: 'Protection',
      icon: <IoShieldCheckmarkOutline size={34} />,
      image: consultationImage,
      subServices: ['Core vaccines', 'Booster reminders', 'Vaccine schedule review'],
    },
    {
      name: 'Dental Care',
      details: 'Oral health checks and cleaning recommendations to help prevent dental problems.',
      accent: 'Oral care',
      icon: <IoMedicalOutline size={34} />,
      image: samplePet,
      subServices: ['Dental check', 'Cleaning assessment', 'Oral care advice'],
    },
    {
      name: 'Surgery Support',
      details: 'Pre-surgical coordination, post-care notes, and recovery guidance for qualified cases.',
      accent: 'Procedure',
      icon: <IoHeartOutline size={34} />,
      image: consultationImage,
      subServices: ['Pre-surgery consultation', 'Post-operative care', 'Recovery instructions'],
    },
    {
      name: 'Pharmacy',
      details: 'Clinic medication guidance and product recommendations connected to your pet visit.',
      accent: 'Medication',
      icon: <IoPawOutline size={34} />,
      image: branchLP,
      subServices: ['Prescription guidance', 'Pet care products', 'Medication reminders'],
    },
  ];

  const selectedService = selectedServiceIndex !== null ? serviceCards[selectedServiceIndex] : null;

  const branches = [
    {
      name: 'Petshield Las Piñas',
      address: 'Las Pinas City, Metro Manila',
      image: branchLP,
      mapQuery: 'Petshield Veterinary Clinic Las Piñas',
      weekdayHours: '9:00 AM - 7:00 PM',
      weekendHours: '10:00 AM - 5:00 PM',
      email: 'petshieldlaspinas@gmail.com',
      contact: '+63 995 859 0382',
    },
    {
      name: 'Petshield Taguig',
      address: 'Taguig City, Metro Manila',
      image: branchTaguig,
      mapQuery: 'Petshield Veterinary Clinic Taguig',
      weekdayHours: '9:00 AM - 7:00 PM',
      weekendHours: '10:00 AM - 5:00 PM',
      email: 'petshieldtaguig@gmail.com',
      contact: '+63 905 457 0190',
    },
  ];

  const [selectedBranchName, setSelectedBranchName] = useState('Petshield Taguig');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [selectedCertBranchName, setSelectedCertBranchName] = useState<string | null>(null);
  const selectedBranch = branches.find(branch => branch.name === selectedBranchName) || branches[1];

  const branchCertifications = [
    {
      branchName: 'Petshield Las Piñas',
      titleImage: titleCertLP,
      summary: 'Clinic credentials and care standards maintained by the Las Pinas team.',
      certificates: [
        { title: 'Grooming Certificate', image: lpGroomingCert },
        { title: 'Surgery Certificate', image: lpSurgeryCert },
      ],
    },
    {
      branchName: 'Petshield Taguig',
      titleImage: titleCertTaguig,
      summary: 'Branch-specific certifications supporting diagnostics, treatment, and grooming workflows.',
      certificates: [
        { title: 'Boarding Certificate', image: taguigBoardingCert },
        { title: 'Grooming Certificate', image: taguigGroomingCert },
        { title: 'Surgery Certificate', image: taguigSurgeryCert },
      ],
    },
  ];
  const selectedCertBranch = branchCertifications.find(branch => branch.branchName === selectedCertBranchName) || null;

  const clinicAnnouncements = [
    {
      title: 'Petshield announcement 1',
      schedule: 'Clinic update',
      image: sampleAnnouncement,
    },
    {
      title: 'Petshield announcement 2',
      schedule: 'Clinic update',
      image: sampleAnnouncement2,
    },
    {
      title: 'Petshield announcement 3',
      schedule: 'Clinic update',
      image: sampleAnnouncement3,
    },
    {
      title: 'Petshield announcement 4',
      schedule: 'Clinic update',
      image: sampleAnnouncement4,
    },
  ];

  const goToPreviousAnnouncement = () => {
    setAnnouncementSlideIndex(index => (index - 1 + clinicAnnouncements.length) % clinicAnnouncements.length);
  };

  const goToNextAnnouncement = () => {
    setAnnouncementSlideIndex(index => (index + 1) % clinicAnnouncements.length);
  };

  const aboutMedia = [
    {
      type: 'image',
      title: 'A cutie spotted at Petshield!',
      caption: 'Cuteness overload right at the heart of our clinic. 🐾',
      image: sampleMedia3,
    },
    {
      type: 'image',
      title: 'Wow!',
      caption: 'Congratulations doggy for your successful recovery! 🎉',
      image: sampleMedia2,
    },
    {
      type: 'image',
      title: 'Dog-shaped cotton candy 🍬',
      caption: 'Such a sweet treat for our furry friends! (And their humans too) 😄',
      image: sampleMedia,
    },
  ];
  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnnouncementSlideIndex(index => (index + 1) % clinicAnnouncements.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [clinicAnnouncements.length]);

  useEffect(() => {
    const section = welcomeSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setWelcomePetsVisible(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`user-container user-home-page ${authModalMode ? 'auth-modal-open' : ''}`}>
      <ClientNavBar
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewProfile={() => navigate('/user/profile')}
        onMyPets={() => navigate('/user/pet-profile')}
        onAuthRequested={() => setAuthModalMode('login')}
        showAlert={showAlert}
      />

      <div className={`user-content home-landing ${authModalMode ? 'home-landing-blurred' : ''}`}>
        <section className="home-hero" aria-label="Petshield client portal">
          <div className="home-hero-slide home-hero-slide-red" aria-hidden="true">
            <img src={redHeader} alt="" className="home-hero-bg" />
            <img src={catModel} alt="" className="home-hero-pet home-hero-pet-cat" />
          </div>

          <div className="home-hero-slide home-hero-slide-blue" aria-hidden="true">
            <img src={blueHeader} alt="" className="home-hero-bg" />
            <img src={dogModel} alt="" className="home-hero-pet home-hero-pet-dog" />
          </div>

          <div className="home-hero-content">
            <img src={petshieldLogo} alt="Petshield" className="home-hero-logo" />
            <h1 className="home-hero-title">
              <span>Petshield</span>
              <span>Veterinary Clinic & Grooming Center</span>
            </h1>
            <p className="home-hero-description">
              Book appointments, manage pet profiles, and review Petshield services in one place. 🐾
            </p>

            <div className="home-hero-actions">
              <button
                type="button"
                className="home-cta-btn home-cta-btn-primary"
                onClick={() => navigate('/user/book-appointment')}
              >
                <IoCalendarOutline size={18} />
                Book an Appointment
              </button>
            </div>
          </div>

          <aside className="home-review-rail" aria-label="Client reviews">
            <div className="home-review-track">
              {[...heroReviews, ...heroReviews].map((review, index) => (
                <article
                  key={`${review.name}-${index}`}
                  className="home-review-card"
                  aria-hidden={index >= heroReviews.length}
                >
                  <div className="home-review-stars" aria-label="5 out of 5 stars">
                    <span>&#9733;</span>
                    <span>&#9733;</span>
                    <span>&#9733;</span>
                    <span>&#9733;</span>
                    <span>&#9733;</span>
                  </div>
                  <p>{review.quote}</p>
                  <div className="home-review-author">
                    <strong>{review.name}</strong>
                    <span>{review.pet}'s pet parent</span>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section
          id="about"
          ref={welcomeSectionRef}
          className={`home-welcome-section ${welcomePetsVisible ? 'is-pets-visible' : ''}`}
          aria-label="Welcome to Petshield"
        >
          <img src={catPeeking} alt="" className="home-welcome-peeker home-welcome-peeker-cat" aria-hidden="true" />
          <img src={dogPeeking} alt="" className="home-welcome-peeker home-welcome-peeker-dog" aria-hidden="true" />
          <div className="home-welcome-confetti" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, index) => (
              <span key={`welcome-confetti-${index}`} />
            ))}
          </div>
          <div className="home-welcome-inner">
            <div className="home-welcome-heading">
              <h2>
                Welcome to{' '}
                <span>
                  Petshield
                  <img src={petshieldLogo} alt="Petshield" className="home-welcome-inline-logo" />
                </span>
              </h2>
            </div>
            <div className="home-welcome-description">
              <p>
                Petshield provides professional veterinary and grooming services focused on prevention, treatment, and comfort to ensure your pets receive the care they deserve.
                At Petshield Veterinary Clinic and Grooming Center, every pet is treated with the same love, attention, and dedication we would give our own.
              </p>
              <p>
                From routine checkups and vaccinations to grooming, diagnostics, and personalized care guidance, our team is committed to making every visit calm, clear, and helpful for both pets and their families. 🩺
              </p>
            </div>
          </div>
        </section>

        <section className="home-announcement-section" aria-label="Clinic promotions and announcements">
          <div className="home-announcement-confetti" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={`promo-confetti-${index}`} />
            ))}
          </div>

          <div className="home-announcement-copy">
            <span className="home-services-kicker">
              <IoAlertCircleOutline size={16} />
              Promos and announcements
            </span>
            <h2>Special Offers & Clinic Updates</h2>
            <p>
              From grooming discounts to clinic announcements, stay connected with everything happening at Petshield. ✨
              Explore current promotions, service advisories, and important news from Petshield Veterinary Clinic and Grooming Center.
            </p>
          </div>

          <div className="home-announcement-carousel" aria-label="Clinic promo carousel">
            <button
              type="button"
              className="home-announcement-arrow home-announcement-arrow-prev"
              onClick={goToPreviousAnnouncement}
              aria-label="Previous announcement"
            >
              <IoChevronBackOutline size={42} />
            </button>

            <div className="home-announcement-stage">
              {clinicAnnouncements.map((announcement, index) => {
                const totalSlides = clinicAnnouncements.length;
                const offset = (index - announcementSlideIndex + totalSlides) % totalSlides;
                const positionClass =
                  offset === 0
                    ? 'is-active'
                    : offset === 1
                      ? 'is-next'
                      : offset === totalSlides - 1
                        ? 'is-prev'
                        : 'is-hidden';

                return (
                  <article key={announcement.title} className={`home-announcement-card ${positionClass}`}>
                    <img src={announcement.image} alt={announcement.title} />
                    <div className="home-announcement-card-copy">
                      <span>{announcement.schedule}</span>
                      <h3>{announcement.title}</h3>
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="home-announcement-arrow home-announcement-arrow-next"
              onClick={goToNextAnnouncement}
              aria-label="Next announcement"
            >
              <IoChevronForwardOutline size={42} />
            </button>
          </div>
        </section>

        <section className="home-social-section" aria-label="Petshield stories carousel">
          <div className="home-social-top-copy">
            <div className="home-social-copy">
              <h2>Stay Connected with Petshield!</h2>
              <p>
                Get the latest updates, promotions, pet health tips, grooming transformations, branch announcements,
                and everyday clinic moments straight from our social media pages. 📱
              </p>
              <div className="home-social-links" aria-label="Petshield social media links">
                <a href="https://www.facebook.com/108760537621932" target="_blank" rel="noreferrer">
                  <IoLogoFacebook size={20} />
                  Facebook
                </a>
                <a
                  href="https://www.tiktok.com/search?q=Petshield%20Veterinary%20Clinic"
                  target="_blank"
                  rel="noreferrer"
                >
                  <IoLogoTiktok size={20} />
                  TikTok
                </a>
              </div>
            </div>
          </div>

          <div className="home-social-carousel-panel">
            <div className="home-about-carousel" aria-label="Petshield media carousel">
              <div className="home-about-carousel-stage">
                {aboutMedia.map((media, index) => {
                  const totalSlides = aboutMedia.length;
                  const offset = (index - aboutSlideIndex + totalSlides) % totalSlides;
                  const positionClass =
                    offset === 0
                      ? 'is-active'
                      : offset === 1
                        ? 'is-next'
                        : offset === totalSlides - 1
                          ? 'is-prev'
                          : 'is-hidden';

                  return (
                    <article key={media.title} className={`home-about-phone ${positionClass}`}>
                      <div className="home-about-media-frame">
                        <img src={media.image} alt={media.title} />
                        <div className="home-about-phone-top">
                          <span>Petshield</span>
                        </div>
                        <div className="home-about-phone-actions" aria-label="Social actions">
                          <button type="button" aria-label="Like this story">
                            <IoHeartOutline size={24} />
                            <span>
                              {index === 0 ? '12.8K' : index === 1 ? '8,421' : index === 2 ? '9,305' : '6,773'}
                            </span>
                          </button>
                          <button type="button" aria-label="View comments">
                            <IoChatbubbleOutline size={23} />
                            <span>{index === 0 ? '246' : index === 1 ? '119' : index === 2 ? '184' : '97'}</span>
                          </button>
                          <button type="button" aria-label="Share this story">
                            <IoShareSocialOutline size={22} />
                            <span>Share</span>
                          </button>
                        </div>
                        <div className="home-about-media-overlay">
                          <h3>{media.title}</h3>
                          <p>{media.caption}</p>
                          <div className="home-about-hashtags">
                            <span>#PetshieldCare</span>
                            <span>#HealthyPets</span>
                            <span>#VetVisitReady</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="home-section home-services-section" id="services">
          <div className="home-services-showcase">
            <div className="home-services-layout">
              <div className="home-services-side home-services-side-left" aria-label="Featured service cards">
                {serviceCards.slice(0, 2).map((service, index) => (
                  <button
                    key={service.name}
                    type="button"
                    className="home-service-preview"
                    onClick={() => setSelectedServiceIndex(index)}
                    aria-label={`View ${service.name} details`}
                  >
                    <img src={service.image} alt="" />
                    <span className="home-service-preview-label">
                      <strong>{service.accent}</strong>
                      <span>{service.name}</span>
                      <em>{service.details}</em>
                      <small>{service.subServices.slice(0, 2).join(' • ')}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="home-services-heading">
                <span className="home-services-kicker">
                  <IoMedalOutline size={16} />
                  Top services
                </span>
                <h2>Curious what Petshield offers?</h2>
                <p>
                  Explore common clinic, grooming, diagnostic, and recovery services before booking your pet's visit.
                  Hover a card to view the description and included care options. 🩺
                </p>
                <button type="button" onClick={() => navigate('/user/book-appointment')}>
                  View other services
                  <IoPawOutline size={16} />
                </button>
              </div>

              <div className="home-services-side home-services-side-right" aria-label="More service cards">
                {serviceCards.slice(2, 4).map((service, index) => {
                  const serviceIndex = index + 2;

                  return (
                    <button
                      key={service.name}
                      type="button"
                      className="home-service-preview"
                      onClick={() => setSelectedServiceIndex(serviceIndex)}
                      aria-label={`View ${service.name} details`}
                    >
                      <img src={service.image} alt="" />
                      <span className="home-service-preview-label">
                        <strong>{service.accent}</strong>
                        <span>{service.name}</span>
                        <em>{service.details}</em>
                        <small>{service.subServices.slice(0, 2).join(' • ')}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {selectedService && (
          <div className="home-service-modal-overlay" onClick={() => setSelectedServiceIndex(null)}>
            <article className="home-service-modal" onClick={event => event.stopPropagation()}>
              <button
                type="button"
                className="home-service-modal-close"
                onClick={() => setSelectedServiceIndex(null)}
                aria-label="Close service details"
              >
                <IoCloseCircleOutline size={26} />
              </button>
              <div className="home-service-modal-image">
                <img src={selectedService.image} alt={selectedService.name} />
              </div>
              <div className="home-service-modal-copy">
                <h2>{selectedService.name}</h2>
                <p>{selectedService.details}</p>
                <table className="home-service-modal-subservices">
                  <thead>
                    <tr>
                      <th>Services</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedService.subServices.map(subService => (
                      <tr key={subService}>
                        <td>{subService}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => navigate('/user/book-appointment')}>
                  <IoReaderOutline size={18} />
                  Book this service
                </button>
              </div>
            </article>
          </div>
        )}

        <section className="home-mobile-app-section" aria-label="Petshield mobile app">
          <div className="home-mobile-app-visual" aria-hidden="true">
            <div className="home-mobile-phone-track">
              <img src={phoneMockup} alt="" className="home-mobile-phone home-mobile-phone-main" />
              <img src={phoneMockup} alt="" className="home-mobile-phone home-mobile-phone-shadow" />
            </div>
          </div>

          <div className="home-mobile-app-copy">
            <h2>Pet care, ready wherever you are</h2>
            <p>
              Download the Petshield mobile app to keep pet profiles, appointments, clinic updates, and care reminders
              close at hand. It is available for download and compatible with both iOS and Android devices. 📲
            </p>
            <div className="home-mobile-app-platforms" aria-label="Compatible platforms">
              <span>
                <IoLogoApple size={21} />
                iOS compatible
              </span>
              <span>
                <IoLogoGooglePlaystore size={21} />
                Android compatible
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                showAlert(
                  'info',
                  'Petshield mobile app',
                  'The Petshield mobile app is available for download and compatible with both iOS and Android devices.',
                )
              }
            >
              Download the app now!
              <IoPhonePortraitOutline size={17} />
            </button>
          </div>
        </section>

        <section className="home-branch-section" aria-label="Branch locations">
          <div className="home-section-heading">
               <span className="home-services-kicker" style={{marginBottom: '20px'}}>
                  <IoMapOutline size={16} />
                  Branch Locations
              </span>
            <h2>Find a Petshield branch near you</h2>
            <p>Petshield has two branches ready to welcome pets and their families, with convenient map access for planning clinic visits, grooming appointments, and follow-up care. 📍</p>
          </div>

          <div className="home-branch-grid">
              <article key={selectedBranch.name} className="home-branch-card">
                <div className="home-branch-image">
                  <img src={selectedBranch.image} alt={selectedBranch.name} />
                  <span className="home-branch-hover-hint">
                    <IoCalendarOutline size={15} />
                    Hover to view branch hours
                  </span>
                  <div className="home-branch-hours">
                    <div>
                      <span>Weekday</span>
                      <strong>Monday to Saturday, {selectedBranch.weekdayHours}</strong>
                    </div>
                    <div>
                      <span>Weekend</span>
                      <strong>Sunday, {selectedBranch.weekendHours}</strong>
                    </div>
                  </div>
                </div>
                <div className={`home-branch-copy ${branchDropdownOpen ? 'is-open' : ''}`}>
                  <IoLocationOutline size={22} />
                  <div className="home-branch-copy-content">
                    <button
                      type="button"
                      className="home-branch-selector-trigger"
                      onClick={() => setBranchDropdownOpen(open => !open)}
                      aria-expanded={branchDropdownOpen}
                      aria-controls="home-branch-options"
                    >
                      <span className="home-branch-selector-label">Branch Location</span>
                      <strong>{selectedBranch.name}</strong>
                      <small>{selectedBranch.address}</small>
                      <IoChevronDownOutline className="home-branch-selector-icon" size={20} aria-hidden="true" />
                    </button>
                    {branchDropdownOpen && (
                      <div className="home-branch-options" id="home-branch-options">
                        {branches.map(branch => (
                          <button
                            key={branch.name}
                            type="button"
                            className={branch.name === selectedBranchName ? 'is-selected' : ''}
                            onClick={() => {
                              setSelectedBranchName(branch.name);
                              setBranchDropdownOpen(false);
                            }}
                          >
                            <span>{branch.name}</span>
                            <small>{branch.address}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <iframe
                  title={`${selectedBranch.name} map`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedBranch.mapQuery)}&z=17&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </article>
          </div>
        </section>

        <section className="home-cert-section" id="certifications" aria-label="Veterinary certifications">
          <div className="home-section-heading">
            <span className="home-services-kicker">
              <IoRibbonOutline size={16} />
              Certifications
            </span>
            <h2>Branch credentials you can review before your visit</h2>
            <p>Each Petshield branch keeps its own certification set, so pet parents can quickly check the training, care standards, and clinic credentials behind every appointment. 🏅</p>
          </div>

          <div className="home-cert-grid">
            {branchCertifications.map(branchCert => (
              <button
                key={branchCert.branchName}
                type="button"
                className="home-cert-branch-button"
                style={{ '--cert-title-image': `url(${branchCert.titleImage})` } as React.CSSProperties}
                onClick={() => setSelectedCertBranchName(branchCert.branchName)}
              >
                <div>
                  <strong>{branchCert.branchName}</strong>
                </div>
                <IoRibbonOutline size={26} />
              </button>
            ))}
          </div>
        </section>

        <footer className="home-footer" aria-label="Petshield footer">
          <div className="home-footer-main">
            <div className="home-footer-brand">
              <img src={petshieldLogo} alt="Petshield" />
              <div>
                <h2>Petshield</h2>
                <p>Veterinary Clinic & Grooming Center</p>
              </div>
            </div>

            <div className="home-footer-branches">
              {branches.map(branch => (
                <div key={`footer-${branch.name}`} className="home-footer-branch">
                  <h3>{branch.name}</h3>
                <p>{branch.address}</p>
                <div className="home-footer-contact-actions">
                  <a href={`mailto:${branch.email}`}>
                    <IoMailOutline size={17} />
                    Email 
                  </a>
                  <a href={`tel:${branch.contact.replace(/\s/g, '')}`}>
                    <IoCallOutline size={17} />
                    Call 
                  </a>
                </div>
              </div>
              ))}
            </div>
          </div>

          <div className="home-footer-powered">
            <span>Powered by</span>
            <img src={pawRangLogo} alt="PawRang" />
          </div>
        </footer>

      </div>

      <button
        type="button"
        className="home-booking-toast"
        onClick={() => navigate('/user/book-appointment')}
        aria-label="Book an appointment"
      >
        <span className="home-booking-toast-icon">
          <IoCalendarOutline size={22} />
        </span>
        <span className="home-booking-toast-copy">Book an Appointment now!</span>
      </button>

      {selectedCertBranch && (
        <div className="home-cert-modal-overlay" onClick={() => setSelectedCertBranchName(null)}>
          <div className="home-cert-modal" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className="home-cert-modal-close"
              onClick={() => setSelectedCertBranchName(null)}
              aria-label="Close certifications"
            >
              <IoCloseCircleOutline size={28} />
            </button>
            <div className="home-cert-modal-heading">
              <span>
                <IoRibbonOutline size={16} />
                {selectedCertBranch.certificates.length} Certifications
              </span>
              <h3>{selectedCertBranch.branchName}</h3>
              <p>{selectedCertBranch.summary}</p>
            </div>
            <div className="home-cert-modal-grid">
              {selectedCertBranch.certificates.map(cert => (
                <figure key={`${selectedCertBranch.branchName}-${cert.title}`} className="home-cert-modal-card">
                  <a href={cert.image} target="_blank" rel="noreferrer" className="home-cert-full-view">
                    Full view
                  </a>
                  <img src={cert.image} alt={`${selectedCertBranch.branchName} ${cert.title}`} />
                  <figcaption>{cert.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}

      {authModalMode && (
        <div className="home-auth-modal-backdrop" role="dialog" aria-modal="true" aria-label="Petshield account access">
          <button
            type="button"
            className="home-auth-modal-scrim"
            onClick={() => setAuthModalMode(null)}
            aria-label="Close account modal"
          />
          <div className="home-auth-modal-panel">
            <button
              type="button"
              className="home-auth-modal-close"
              onClick={() => setAuthModalMode(null)}
              aria-label="Close account modal"
            >
              &times;
            </button>
            {authModalMode === 'login' ? (
              <Login
                modalMode
                onRegisterClick={() => setAuthModalMode('register')}
                onLoginSuccess={(user) => {
                  const defaultRoute = getDefaultRouteForUser(user);

                  if (defaultRoute !== '/user/home') {
                    setAuthModalMode(null);
                    navigate(defaultRoute, { replace: true });
                    return;
                  }

                  setCurrentUser(user);
                  setAuthModalMode(null);
                }}
              />
            ) : (
              <Registration
                modalMode
                onLoginClick={() => setAuthModalMode('login')}
              />
            )}
          </div>
        </div>
      )}

      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              {modalConfig.type === 'success' && <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />}
              {modalConfig.type === 'error' && <IoCloseCircleOutline size={55} color="#d93025" />}
              {!['success', 'error'].includes(modalConfig.type) && (
                <IoAlertCircleOutline size={55} color="#3d67ee" />
              )}
            </div>
            <h3 className="modal-title">{modalConfig.title}</h3>
            <div className="modal-message">
              {typeof modalConfig.message === 'string' ? <p>{modalConfig.message}</p> : modalConfig.message}
            </div>
            <div className="modal-actions">
              {modalConfig.showCancel && (
                <button className="modal-btn modal-btn-cancel" onClick={() => setModalVisible(false)}>
                  Cancel
                </button>
              )}
              <button
                className={`modal-btn modal-btn-confirm ${modalConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => {
                  setModalVisible(false);
                  modalConfig.onConfirm?.();
                }}
              >
                {modalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHome;

