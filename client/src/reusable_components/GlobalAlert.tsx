import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import './GlobalAlert.css';

type GlobalAlertVariant = 'success' | 'error' | 'warning' | 'info';

type GlobalAlertItem = {
  id: number;
  title: string;
  message: string;
  variant: GlobalAlertVariant;
};

const normalizeAlertText = (value: unknown) => {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
};

const inferVariant = (text: string): GlobalAlertVariant => {
  const normalized = text.replace(/^[^A-Za-z0-9]+/, '').trim().toLowerCase();

  if (
    normalized.startsWith('error') ||
    normalized.startsWith('invalid') ||
    normalized.includes(' failed') ||
    normalized.includes('failed ') ||
    normalized.includes('not found') ||
    normalized.includes('unavailable') ||
    normalized.includes('overlap error')
  ) {
    return 'error';
  }

  if (
    normalized.startsWith('warning') ||
    normalized.startsWith('success with note') ||
    normalized.includes('could not be sent') ||
    normalized.includes('please select') ||
    normalized.includes('please enter')
  ) {
    return 'warning';
  }

  if (normalized.startsWith('success') || normalized.includes('successfully')) {
    return 'success';
  }

  return 'info';
};

const formatTitle = (value: string, fallback: string) => {
  const cleaned = value.replace(/^[^A-Za-z0-9]+/, '').trim();
  if (!cleaned) return fallback;
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const buildAlertItem = (rawValue: unknown): GlobalAlertItem => {
  const rawText = normalizeAlertText(rawValue).trim() || 'Action completed.';
  const normalizedText = rawText.replace(/^[^A-Za-z0-9]+/, '').trim();
  const variant = inferVariant(rawText);
  const defaultTitle =
    variant === 'success'
      ? 'Success'
      : variant === 'error'
        ? 'Action Failed'
        : variant === 'warning'
          ? 'Needs Attention'
          : 'Notice';

  const firstLine = normalizedText.split(/\r?\n/, 1)[0] || '';
  const colonIndex = firstLine.indexOf(':');
  const hasCompactPrefix = colonIndex > 0 && colonIndex <= 40;

  const title = hasCompactPrefix
    ? formatTitle(firstLine.slice(0, colonIndex), defaultTitle)
    : defaultTitle;
  const message = hasCompactPrefix
    ? normalizedText.slice(colonIndex + 1).trim() || normalizedText
    : normalizedText;

  return {
    id: Date.now() + Math.random(),
    title,
    message,
    variant,
  };
};

const iconByVariant = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const GlobalAlert = () => {
  const [alerts, setAlerts] = useState<GlobalAlertItem[]>([]);
  const activeAlert = alerts[0];

  const closeActiveAlert = useCallback(() => {
    setAlerts((currentAlerts) => currentAlerts.slice(1));
  }, []);

  useEffect(() => {
    const originalAlert = window.alert.bind(window);

    window.alert = (message?: unknown) => {
      setAlerts((currentAlerts) => [...currentAlerts, buildAlertItem(message)]);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    if (!activeAlert) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        closeActiveAlert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAlert, closeActiveAlert]);

  const AlertIcon = useMemo(() => {
    return activeAlert ? iconByVariant[activeAlert.variant] : Info;
  }, [activeAlert]);

  if (!activeAlert) return null;

  return (
    <div
      className="globalAlertOverlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeActiveAlert();
      }}
    >
      <section
        className={`globalAlertDialog globalAlertDialog--${activeAlert.variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="global-alert-title"
        aria-describedby="global-alert-message"
      >
        <div className="globalAlertHeader">
          <div className="globalAlertTitleGroup">
            <span className="globalAlertIcon" aria-hidden="true">
              <AlertIcon size={22} strokeWidth={2.25} />
            </span>
            <h2 id="global-alert-title">{activeAlert.title}</h2>
          </div>
          <button
            type="button"
            className="globalAlertClose"
            onClick={closeActiveAlert}
            aria-label="Close alert"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>
        <p id="global-alert-message" className="globalAlertMessage">
          {activeAlert.message}
        </p>
        <div className="globalAlertActions">
          <button type="button" className="globalAlertPrimaryButton" onClick={closeActiveAlert}>
            OK
          </button>
        </div>
      </section>
    </div>
  );
};

export default GlobalAlert;
