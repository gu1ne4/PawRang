import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Lock, Stethoscope, User } from 'lucide-react';
import './UserAuthStylesheet.css';
import API_URL from '../API';

interface MedicalServiceOption {
  id: number | string;
  service_id?: number | string;
  name?: string;
  service_name?: string;
  appointmentDurationMinutes?: number;
  appointment_duration_minutes?: number;
}

interface DoctorSetupOptions {
  weekdays?: Array<{ key?: string; label?: string } | string>;
  availableDays?: Array<{ key?: string; label?: string } | string>;
  available_days?: Array<{ key?: string; label?: string } | string>;
  medicalServices?: MedicalServiceOption[];
  medical_services?: MedicalServiceOption[];
  services?: MedicalServiceOption[];
  slotMinutes?: number;
  slot_minutes?: number;
}

interface EmployeeSetupResponse {
  employee?: {
    id?: string;
    email?: string;
    username?: string;
    role?: string;
  };
  doctorSetup?: DoctorSetupOptions | null;
  doctor_setup?: DoctorSetupOptions | null;
  error?: string;
}

type ButtonState = 'default' | 'loading' | 'success' | 'error';

export default function EmployeeSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [doctorSetup, setDoctorSetup] = useState<DoctorSetupOptions | null>(null);
  const [selectedServiceCapabilityIds, setSelectedServiceCapabilityIds] = useState<Array<number | string>>([]);
  const [selectedAvailableWeekdays, setSelectedAvailableWeekdays] = useState<string[]>([]);
  const [serviceCapabilityError, setServiceCapabilityError] = useState('');
  const [weekdayError, setWeekdayError] = useState('');
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [buttonState, setButtonState] = useState<ButtonState>('default');

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    setUsername(cleaned);

    if (!cleaned.trim()) {
      setUsernameError('Username is required.');
    } else if (cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
    } else {
      setUsernameError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    if (!value.trim()) {
      setPasswordError('Password is required.');
    } else if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
    } else {
      setPasswordError('');
    }

    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
    } else if (confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);

    if (!value.trim()) {
      setConfirmPasswordError('Please confirm your password.');
    } else if (value !== password) {
      setConfirmPasswordError('Passwords do not match.');
    } else {
      setConfirmPasswordError('');
    }
  };

  const medicalServices = doctorSetup?.medicalServices ?? doctorSetup?.medical_services ?? doctorSetup?.services ?? [];
  const weekdayOptions = doctorSetup?.weekdays ?? doctorSetup?.availableDays ?? doctorSetup?.available_days ?? [];
  const hasDoctorSetup = Boolean(doctorSetup);

  const getServiceId = (service: MedicalServiceOption) => service.id ?? service.service_id ?? '';
  const getServiceName = (service: MedicalServiceOption) => service.name ?? service.service_name ?? 'Medical service';
  const getServiceDuration = (service: MedicalServiceOption) => service.appointmentDurationMinutes ?? service.appointment_duration_minutes;

  const normalizeWeekdayOption = (weekday: { key?: string; label?: string } | string) => {
    if (typeof weekday === 'string') {
      return { key: weekday.toLowerCase(), label: weekday };
    }

    return {
      key: String(weekday.key || weekday.label || '').toLowerCase(),
      label: weekday.label || weekday.key || '',
    };
  };

  const toggleServiceCapability = (serviceId: number | string) => {
    setSelectedServiceCapabilityIds(prev => {
      const exists = prev.some(id => String(id) === String(serviceId));
      return exists ? prev.filter(id => String(id) !== String(serviceId)) : [...prev, serviceId];
    });
    setServiceCapabilityError('');
  };

  const toggleWeekday = (weekdayKey: string) => {
    setSelectedAvailableWeekdays(prev => {
      const exists = prev.includes(weekdayKey);
      return exists ? prev.filter(day => day !== weekdayKey) : [...prev, weekdayKey];
    });
    setWeekdayError('');
  };

  const validateAll = () => {
    handleUsernameChange(username);
    handlePasswordChange(password);
    handleConfirmPasswordChange(confirmPassword);

    let doctorFieldsValid = true;
    if (hasDoctorSetup) {
      if (selectedServiceCapabilityIds.length === 0) {
        setServiceCapabilityError('Select at least one service capability.');
        doctorFieldsValid = false;
      } else {
        setServiceCapabilityError('');
      }

      if (selectedAvailableWeekdays.length === 0) {
        setWeekdayError('Select at least one available day.');
        doctorFieldsValid = false;
      } else {
        setWeekdayError('');
      }
    }

    return (
      username.trim().length >= 3 &&
      password.length >= 6 &&
      confirmPassword === password &&
      doctorFieldsValid
    );
  };

  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      setIsInitializing(true);
      setServerError('');

      try {
        if (!token) {
          throw new Error('This setup link is invalid or has expired. Please request a new employee setup link.');
        }

        const response = await fetch(`${API_URL}/api/employee-setup/validate?token=${encodeURIComponent(token)}`);
        const data: EmployeeSetupResponse = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Failed to validate employee setup link.');
        }

        if (!isMounted) return;

        setEmail(data.employee?.email || '');
        setUsername(data.employee?.username || '');
        const setupOptions = data.doctorSetup ?? data.doctor_setup ?? null;
        setDoctorSetup(setupOptions);
        if (setupOptions) {
          const services = setupOptions.medicalServices ?? setupOptions.medical_services ?? [];
          setSelectedServiceCapabilityIds(services.map(service => getServiceId(service)).filter(Boolean));
          setSelectedAvailableWeekdays([]);
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        setServerError(error instanceof Error ? error.message : 'Failed to prepare the account setup page.');
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializePage();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async () => {
    setServerError('');
    setServerSuccess('');

    if (!token) {
      setServerError('This setup link is invalid or has expired. Please request a new employee setup link.');
      setButtonState('error');
      setTimeout(() => setButtonState('default'), 600);
      return;
    }

    if (!validateAll()) {
      setButtonState('error');
      setTimeout(() => setButtonState('default'), 600);
      return;
    }

    setIsLoading(true);
    setButtonState('loading');

    try {
      const response = await fetch(`${API_URL}/api/employee-setup/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          username: username.trim(),
          password,
          ...(hasDoctorSetup
            ? {
                serviceCapabilityIds: selectedServiceCapabilityIds,
                availableWeekdays: selectedAvailableWeekdays,
                reservedForWalkins: false,
              }
            : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete account setup.');
      }

      setServerSuccess('Account setup complete. You can now log in with your new username and password.');
      setButtonState('success');

      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : 'Failed to complete account setup.');
      setButtonState('error');
      setTimeout(() => setButtonState('default'), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || buttonState === 'success';

  const renderButtonContent = () => {
    if (buttonState === 'loading') return <span className="loginSpinner" />;
    if (buttonState === 'success') {
      return (
        <svg className="loginCheckIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }

    return 'Complete Setup';
  };

  return (
    <div className="main">
      <div className="divisionContainers" id="divisionContainer1">
        <div className="imageBackground">
          <div className="placeholders">
            <h2>Welcome to PawRang!</h2>
            <p>Finish setting up your employee account so you can log in with your own username and password and start using the clinic system.</p>
          </div>
        </div>
      </div>

      <div className="divisionContainers">
        <div className="inputBox">
          <div className="headerContent">
            <h2>Set Up Employee Account</h2>
            <p>Choose your username and password to finish activating this employee account.</p>
          </div>

          {isInitializing ? (
            <div className="serverSuccessMessage">
              <p>Preparing your account setup...</p>
            </div>
          ) : (
            <div className="form">
              {email && (
                <div className="serverSuccessMessage" style={{ backgroundColor: '#eef2ff', borderColor: '#c7caff', color: '#3730a3' }}>
                  <p>Setting up account for <strong>{email}</strong></p>
                </div>
              )}

              {serverError && (
                <div className="serverErrorMessage">
                  <p>{serverError}</p>
                </div>
              )}

              {serverSuccess && (
                <div className="serverSuccessMessage">
                  <p>{serverSuccess}</p>
                </div>
              )}

              <div className="inputContainer">
                <p className={usernameError ? 'inputLabel errorLabel' : 'inputLabel'}>
                  Username {usernameError && <span className="errorAsterisk">*</span>}
                </p>
                <div className="inputFieldContainer">
                  <User className="inputIcons" />
                  <input
                    className={usernameError ? 'inputFields errorField' : 'inputFields'}
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                  />
                </div>
                {usernameError && <p className="errorMessage">{usernameError}</p>}
              </div>

              <div className="inputContainer">
                <p className={passwordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                  New Password {passwordError && <span className="errorAsterisk">*</span>}
                </p>
                <div className="inputFieldContainer">
                  <Lock className="inputIcons" />
                  <input
                    className={passwordError ? 'inputFields errorField' : 'inputFields'}
                    type="password"
                    placeholder="Create a new password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                  />
                </div>
                {passwordError && <p className="errorMessage">{passwordError}</p>}
              </div>

              <div className="inputContainer">
                <p className={confirmPasswordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                  Confirm Password {confirmPasswordError && <span className="errorAsterisk">*</span>}
                </p>
                <div className="inputFieldContainer">
                  <Lock className="inputIcons" />
                  <input
                    className={confirmPasswordError ? 'inputFields errorField' : 'inputFields'}
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  />
                </div>
                {confirmPasswordError && <p className="errorMessage">{confirmPasswordError}</p>}
              </div>

              {hasDoctorSetup && (
                <div className="inputContainer" style={{ gap: 12 }}>
                  <p className="inputLabel">Veterinarian Appointment Setup</p>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3730a3', fontWeight: 700 }}>
                      <Stethoscope size={18} />
                      <span>Services this veterinarian can handle</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                      {medicalServices.map(service => {
                        const serviceId = getServiceId(service);
                        const isChecked = selectedServiceCapabilityIds.some(id => String(id) === String(serviceId));
                        return (
                          <label
                            key={String(serviceId)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              padding: '10px 12px',
                              border: `1px solid ${isChecked ? '#3730a3' : '#d9def7'}`,
                              borderRadius: 8,
                              background: isChecked ? '#eef2ff' : '#fff',
                              cursor: 'pointer',
                              fontSize: 14,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleServiceCapability(serviceId)}
                              style={{ marginTop: 2 }}
                            />
                            <span>
                              <strong>{getServiceName(service)}</strong>
                              {getServiceDuration(service) ? <span style={{ display: 'block', color: '#64748b', fontSize: 12 }}>{getServiceDuration(service)} min</span> : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {serviceCapabilityError && <p className="errorMessage">{serviceCapabilityError}</p>}
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3730a3', fontWeight: 700 }}>
                      <CalendarDays size={18} />
                      <span>Available days</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                      {weekdayOptions.map(rawWeekday => {
                        const weekday = normalizeWeekdayOption(rawWeekday);
                        const isChecked = selectedAvailableWeekdays.includes(weekday.key);
                        return (
                          <label
                            key={weekday.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '9px 10px',
                              border: `1px solid ${isChecked ? '#3730a3' : '#d9def7'}`,
                              borderRadius: 8,
                              background: isChecked ? '#eef2ff' : '#fff',
                              cursor: 'pointer',
                              fontSize: 14,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleWeekday(weekday.key)}
                            />
                            <span>{weekday.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {weekdayError && <p className="errorMessage">{weekdayError}</p>}
                  </div>
                </div>
              )}

              <button
                className={`button loginButton--${buttonState}`}
                onClick={handleSubmit}
                disabled={isDisabled}
              >
                {renderButtonContent()}
              </button>

              <button className="pageNavigator" onClick={() => navigate('/login')}>
                <p style={{ fontSize: 18 }}>Back to <strong style={{ color: '#2619e2' }}>Login</strong></p>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
