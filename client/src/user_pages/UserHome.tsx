import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './UserStyles.css';
import { apiService } from '../apiService';
import ClientNavBar from '../reusable_components/ClientNavBar';

import {
  IoAlertCircleOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoMedicalOutline,
  IoPawOutline,
  IoShieldCheckmarkOutline,
  IoStorefrontOutline,
} from 'react-icons/io5';

interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  fullName?: string;
  userImage?: string;
  userimage?: string;
  role?: string;
  email?: string;
  contact_number?: string;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

const UserHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('userSession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false,
    confirmText: 'OK',
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    let isCancelled = false;

    apiService
      .getProfile(currentUser.id)
      .then(res => {
        if (isCancelled) return;
        const updated = { ...currentUser, ...res.user };
        setCurrentUser(updated);
        localStorage.setItem('userSession', JSON.stringify(updated));
      })
      .catch(err => console.error('Failed to refresh profile:', err));

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id]);

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
  }, [location.hash]);

  const showAlert = (
    type: ModalConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm?: () => void,
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
    navigate('/login');
  };

  const displayName = currentUser
    ? (
        currentUser.fullname
        ?? currentUser.fullName
        ?? (`${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() || currentUser.username)
      )
    : 'Pet Parent';

  const serviceHighlights = [
    {
      title: 'Book Veterinary Visits',
      description:
        'Schedule consultations, check-ups, vaccinations, diagnostics, and grooming in one booking flow.',
      icon: <IoCalendarOutline size={26} />,
    },
    {
      title: 'Manage Pet Profiles',
      description:
        'Keep each pet profile organized so appointments are tied to the correct pet details every time.',
      icon: <IoPawOutline size={26} />,
    },
    {
      title: 'Review Care Services',
      description:
        'Browse the available PetShield services before booking, including pet grooming and medical care.',
      icon: <IoMedicalOutline size={26} />,
    },
  ];

  const serviceCards = [
    {
      name: 'Consultation and Check-Up',
      details: 'General wellness assessments and follow-up care for routine visits.',
    },
    {
      name: 'Pet Grooming',
      details: 'Grooming packages with style preferences, branch selection, and medical reminders.',
    },
    {
      name: 'Diagnostics',
      details: 'Laboratory tests, x-ray, and ultrasound scheduling for supported branches.',
    },
    {
      name: 'Boarding and Recovery',
      details: 'Support for confinement, boarding, and other care services handled by PetShield.',
    },
  ];

  const aboutCards = [
    {
      title: 'About the Website',
      copy:
        'This client portal helps pet owners manage appointments, review services, and keep pet information ready before every visit.',
      icon: <IoShieldCheckmarkOutline size={24} />,
    },
    {
      title: 'About PetShield',
      copy:
        'PetShield is the client-facing brand behind this experience, focused on making veterinary and grooming coordination simpler for pet owners.',
      icon: <IoStorefrontOutline size={24} />,
    },
  ];

  return (
    <div className="user-container user-home-page">
      <ClientNavBar
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewProfile={() => navigate('/user/profile')}
        onMyPets={() => navigate('/user/pet-profile')}
        showAlert={showAlert}
      />

      <div className="user-content home-landing">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-eyebrow">Welcome to PetShield</span>
            <h1 className="home-hero-title">Pet care bookings, profiles, and clinic services in one place.</h1>
            <p className="home-hero-description">
              {displayName}, this portal is built to make it easier to prepare for every visit,
              choose the right service, and keep your pet information organized from booking to check-in.
            </p>

            <div className="home-hero-actions">
              <button
                type="button"
                className="home-cta-btn home-cta-btn-primary"
                onClick={() => navigate('/user/book-appointment')}
              >
                Book an Appointment
              </button>
              <button
                type="button"
                className="home-cta-btn home-cta-btn-secondary"
                onClick={() => navigate('/user/pet-profile')}
              >
                View Pet Profiles
              </button>
            </div>
          </div>

          <div className="home-hero-panel">
            <h2 className="home-panel-title">What you can do here</h2>
            <div className="home-highlight-list">
              {serviceHighlights.map(item => (
                <div key={item.title} className="home-highlight-card">
                  <div className="home-highlight-icon">{item.icon}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section" id="services">
          <div className="home-section-heading">
            <span className="home-section-kicker">Services</span>
            <h2>Services available through the PetShield client portal</h2>
            <p>
              Browse supported services before you book so you can choose the right appointment for your pet.
            </p>
          </div>

          <div className="home-services-grid">
            {serviceCards.map(service => (
              <article key={service.name} className="home-service-card">
                <h3>{service.name}</h3>
                <p>{service.details}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section home-about-section" id="about">
          <div className="home-section-heading">
            <span className="home-section-kicker">About Us</span>
            <h2>Built to give PetShield clients a clearer, simpler booking experience</h2>
            <p>
              The goal of this website is straightforward: reduce friction for pet owners by organizing service
              selection, pet records, and appointment details in one consistent place.
            </p>
          </div>

          <div className="home-about-grid">
            {aboutCards.map(card => (
              <article key={card.title} className="home-about-card">
                <div className="home-about-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

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
