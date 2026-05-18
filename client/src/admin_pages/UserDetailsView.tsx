import { useState } from 'react';
import './AdminStyles.css';
import {
  IoArrowBack,
  IoAlertCircleOutline,
  IoAlbumsOutline,
  IoCalendarClearOutline,
  IoCheckmarkCircleOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoCloseCircleOutline,
  IoCopyOutline,
  IoDocumentTextOutline,
  IoHelpCircleOutline,
  IoMedical,
  IoPaw,
  IoRefreshCircleOutline,
  IoReceipt,
  IoSparklesOutline,
  IoWarningOutline,
  IoRefreshOutline,
} from 'react-icons/io5';
import { apiService } from '../apiService';

// 🟢 FIX: We added all our new variable names to the blueprint so TypeScript stops complaining!
type AppointmentLike = {
  id?: string | number;
  dbId?: string | number;
  name?: string;
  patient_email?: string;
  patientEmail?: string;
  email?: string;
  walk_in_email?: string;
  patient_phone?: string;
  patientPhone?: string;
  phone?: string;
  contact_number?: string;
  walk_in_phone?: string;
  reasonForVisit?: string;
  patient_reason?: string;
  reason?: string;
  rescheduleReason?: string;
  reschedule_reason?: string;
  pet_name?: string;
  petName?: string;
  pet_type?: string;
  petType?: string;
  type?: string;
  walk_in_pet_type?: string;
  pet_breed?: string;
  petBreed?: string;
  breed?: string;
  walk_in_breed?: string;
  petGender?: string;
  pet_gender?: string;
  gender?: string;
  walk_in_gender?: string;
  service?: string;
  date_time?: string;
  doctor?: string;
  branch?: string;
  branchName?: string;
  branch_id?: number | string | null;
  status?: string;
  latestRescheduleRequest?: any;
  medicalInformation?: any;
  medical_information?: any;
  recordType?: string;
  is_walk_in?: boolean;
  linkedVisitId?: string | number | null;
  billingSourceType?: string | null;
  billingSourceId?: string | number | null;
  hasBillingInvoice?: boolean;
  billingInvoiceId?: string | number | null;
  billingInvoiceNumber?: string | null;
  canProceedToBilling?: boolean;
};

type AdminAiSummary = {
  summary: string;
  important_flags: string[];
  follow_up_questions: string[];
  missing_information: string[];
  model?: string;
};

type UserDetailsViewProps = {
  user: AppointmentLike | null;
  onBack: () => void;
  onAccept: (user: AppointmentLike) => void;
  onCancel: (user: AppointmentLike) => void;
  onComplete: (user: AppointmentLike) => void;
  onAssignDoctor: (user: AppointmentLike) => void;
  onReschedule: (user: AppointmentLike) => void;
  onProceedToBilling: (user: AppointmentLike) => void;
  onAcceptClientPreference: (user: AppointmentLike, request: any) => void;
  onDeclineClientPreference: (user: AppointmentLike, request: any) => void;
  onRefresh: () => void;
  refreshing: boolean;
  actionBusyType?: string | null;
  readOnly?: boolean;
  backLabel?: string;
  billingActionLoading?: boolean;
  hideBillingActions?: boolean;
  showMedicalRecordsAction?: boolean;
  onOpenMedicalRecords?: (user: AppointmentLike) => void;
  showInventoryAction?: boolean;
  onOpenInventory?: (user: AppointmentLike) => void;
};

const AI_BUSY_FALLBACK_MESSAGE = 'Server is busy. Please try again later.';

const InlineButtonSpinner = () => <span className="adminInlineButtonSpinner" aria-hidden="true" />;

const getAiFallbackMessage = (error: any, defaultMessage: string) => {
  const message = String(error?.message || '');
  const status = Number(error?.status || error?.response?.status || 0);
  const lowered = message.toLowerCase();

  if (
    status === 429 ||
    status === 503 ||
    lowered.includes('busy') ||
    lowered.includes('overload') ||
    lowered.includes('rate limit') ||
    lowered.includes('resource_exhausted') ||
    lowered.includes('unavailable') ||
    lowered.includes('quota') ||
    lowered.includes('high demand')
  ) {
    return AI_BUSY_FALLBACK_MESSAGE;
  }

  return message || defaultMessage;
};

export default function UserDetailsView({
  user,
  onBack,
  onAccept,
  onCancel,
  onComplete,
  onAssignDoctor,
  onReschedule,
  onProceedToBilling,
  onAcceptClientPreference,
  onDeclineClientPreference,
  onRefresh,
  refreshing,
  actionBusyType = null,
  readOnly = false,
  backLabel = 'Back to Appointments',
  billingActionLoading = false,
  hideBillingActions = false,
  showMedicalRecordsAction = false,
  onOpenMedicalRecords,
  showInventoryAction = false,
  onOpenInventory,
}: UserDetailsViewProps) {
  const [aiSummary, setAiSummary] = useState<AdminAiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!user) return null;

  const isAnyActionBusy = Boolean(actionBusyType) || aiLoading || refreshing || billingActionLoading;
  const isBusyAction = (type: string) => actionBusyType === type;
  const disabledActionStyle = {
    cursor: isAnyActionBusy ? 'not-allowed' : 'pointer',
    opacity: isAnyActionBusy ? 0.68 : 1,
  };

  const formatDate = (dateValue?: string | null) => {
    if (!dateValue) return 'Not provided';
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (timeValue?: string | null) => {
    if (!timeValue) return 'Not provided';
    const [hours, minutes] = String(timeValue).split(':');
    if (!hours || !minutes) return String(timeValue);
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return 'Not provided';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getRequestStatusMeta = (statusValue?: string, patientResponseTypeValue?: string | null) => {
    const normalized = (statusValue || '').toLowerCase();
    const patientResponseType = (patientResponseTypeValue || '').toLowerCase();
    switch (normalized) {
      case 'needs_new_schedule':
        return { label: 'CLIENT REQUESTED ANOTHER DATE', bg: '#fff3e0', color: '#f57c00' };
      case 'pending':
        return { label: 'WAITING FOR PATIENT RESPONSE', bg: '#e3f2fd', color: '#1565c0' };
      case 'confirmed':
        return { label: 'CONFIRMED', bg: '#e8f5e9', color: '#2e7d32' };
      case 'declined':
        return { label: 'DECLINED', bg: '#ffebee', color: '#c62828' };
      case 'cancelled':
        if (patientResponseType === 'withdraw') {
          return { label: 'WITHDRAWN BY PATIENT', bg: '#f3e5f5', color: '#7b1fa2' };
        }
        return { label: 'CANCELLED', bg: '#ffebee', color: '#c62828' };
      case 'expired':
        return { label: 'EXPIRED', bg: '#f5f5f5', color: '#616161' };
      default:
        return { label: normalized ? normalized.toUpperCase() : 'NO REQUEST', bg: '#f5f5f5', color: '#616161' };
    }
  };

  const formatBooleanAnswer = (value?: boolean | null, yesLabel = 'Yes', noLabel = 'No') => {
    if (value === true) return yesLabel;
    if (value === false) return noLabel;
    return 'Not provided';
  };

  const formatTextAnswer = (value?: string | null) => {
    const text = String(value || '').trim();
    return text || 'Not provided';
  };

  const formatSymptomList = (value?: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean);
  };

  const formatPatientResponseType = (value?: string | null) => {
    const normalized = (value || '').trim().toLowerCase();
    switch (normalized) {
      case 'choose_another_date':
        return 'Requested another date';
      case 'confirm':
        return 'Accepted clinic proposal';
      case 'cancel':
        return 'Cancelled appointment';
      case 'withdraw':
        return 'Withdrew request';
      default:
        return value || 'No response yet';
    }
  };

  const hasStructuredRescheduleMetadata = (value?: string | null) =>
    /(^|\|)\s*Preferred (date|time):/i.test(value || '');

  const extractStructuredPatientNote = (value?: string | null) => {
    const rawValue = (value || '').trim();
    if (!rawValue) return '';

    const noteMatch = rawValue.match(/(?:^|\|)\s*Patient note:\s*([^|]+)/i);
    if (noteMatch?.[1]) {
      return noteMatch[1].trim();
    }

    if (!hasStructuredRescheduleMetadata(rawValue)) {
      return rawValue;
    }

    return '';
  };

  const status = (user.status || '').toLowerCase();
  const assignedDoctor = user.doctor || 'Not Assigned';
  const assignedBranch = user.branch || user.branchName || 'Not specified';
  const latestRescheduleRequest = user.latestRescheduleRequest || null;
  const medicalInformation = user.medicalInformation || user.medical_information || null;
  const reportedSymptoms = formatSymptomList(medicalInformation?.reported_symptoms);
  const isDirectPatientRescheduleRequest =
    latestRescheduleRequest?.patient_response_type === 'choose_another_date' &&
    String(latestRescheduleRequest?.proposed_appointment_date || '') === String(latestRescheduleRequest?.current_appointment_date || '') &&
    String(latestRescheduleRequest?.proposed_appointment_time || '') === String(latestRescheduleRequest?.current_appointment_time || '');
  const extractedPatientNote = extractStructuredPatientNote(latestRescheduleRequest?.response_note);
  const hasLegacyGenericPatientNote =
    isDirectPatientRescheduleRequest &&
    (
      !latestRescheduleRequest?.response_note ||
      latestRescheduleRequest?.response_note === 'Patient requested a new preferred schedule from the appointment details page'
    );
  const clinicReasonDisplay = isDirectPatientRescheduleRequest
    ? (user.reschedule_reason || 'Not provided')
    : (latestRescheduleRequest?.reason || user.reschedule_reason || 'Not provided');
  const patientNoteDisplay = hasLegacyGenericPatientNote
    ? (latestRescheduleRequest?.reason || 'Not provided')
    : (
        extractedPatientNote ||
        (!hasStructuredRescheduleMetadata(latestRescheduleRequest?.response_note)
          ? (latestRescheduleRequest?.response_note || 'Not provided')
          : 'Not provided')
      );
  
  // Aggressively pull data from ANY possible field name
  const reasonForVisit = user.reasonForVisit || user.patient_reason || user.reason || 'Not provided';
  const rescheduleReason = clinicReasonDisplay === 'Not provided' ? '' : clinicReasonDisplay;
  const email = user.email || user.patientEmail || user.patient_email || user.walk_in_email || 'Not provided';
  const phone = user.phone || user.contact_number || user.patientPhone || user.patient_phone || user.walk_in_phone || 'Not provided';
  
  const petName = user.petName || user.pet_name || 'Unknown Pet';
  const petType = user.type || user.petType || user.pet_type || user.walk_in_pet_type || 'Unknown';
  const petBreed = user.breed || user.petBreed || user.pet_breed || user.walk_in_breed || 'Unknown';
  const petGender = user.gender || user.petGender || user.pet_gender || user.walk_in_gender || 'Unknown';

  const userDetails = {
    fullName: user.name || 'Unknown Patient',
    email: email,
    phone: phone,
    reasonForVisit: reasonForVisit,
    rescheduleReason: rescheduleReason,
    petName: petName,
    petType: petType,
    petBreed: petBreed,
    gender: petGender,
  };

  const requestStatusMeta = getRequestStatusMeta(
    latestRescheduleRequest?.status,
    latestRescheduleRequest?.patient_response_type
  );
  const hasBillingInvoice = Boolean(user.hasBillingInvoice && user.billingInvoiceId);
  const canShowBillingAction = !hideBillingActions && Boolean(hasBillingInvoice || user.canProceedToBilling);
  const billingStatusMeta = !hideBillingActions
    ? hasBillingInvoice
      ? { label: 'Invoiced', bg: '#eef2ff', color: '#3d67ee' }
      : user.canProceedToBilling
        ? { label: 'Ready for Billing', bg: '#fff7e6', color: '#b26a00' }
        : null
    : null;
  const canReviewClientPreference =
    !readOnly &&
    latestRescheduleRequest?.status === 'needs_new_schedule' &&
    (latestRescheduleRequest?.patient_preferred_date || latestRescheduleRequest?.patient_preferred_time);
  const rescheduleDetailItems = isDirectPatientRescheduleRequest
    ? [
        {
          label: 'Current Appointment Date',
          value: formatDate(latestRescheduleRequest?.current_appointment_date || latestRescheduleRequest?.proposed_appointment_date),
        },
        {
          label: 'Current Appointment Time',
          value: formatTime(latestRescheduleRequest?.current_appointment_time || latestRescheduleRequest?.proposed_appointment_time),
        },
        {
          label: 'Preferred Appointment Date',
          value: formatDate(latestRescheduleRequest?.patient_preferred_date),
        },
        {
          label: 'Preferred Appointment Time',
          value: formatTime(latestRescheduleRequest?.patient_preferred_time),
        },
        {
          label: 'Patient Reason',
          value: patientNoteDisplay,
        },
        {
          label: 'Patient Response',
          value: formatPatientResponseType(latestRescheduleRequest?.patient_response_type),
        },
      ]
    : [
        {
          label: 'Clinic Proposed Date',
          value: formatDate(latestRescheduleRequest?.proposed_appointment_date),
        },
        {
          label: 'Clinic Proposed Time',
          value: formatTime(latestRescheduleRequest?.proposed_appointment_time),
        },
        {
          label: 'Patient Preferred Date',
          value: formatDate(latestRescheduleRequest?.patient_preferred_date),
        },
        {
          label: 'Patient Preferred Time',
          value: formatTime(latestRescheduleRequest?.patient_preferred_time),
        },
        {
          label: 'Clinic Reason',
          value: clinicReasonDisplay,
        },
        {
          label: 'Patient Response',
          value: formatPatientResponseType(latestRescheduleRequest?.patient_response_type),
        },
      ];
  const canAcceptAppointment = status === 'pending';
  const showBottomLifecycleActions = !readOnly && (status === 'confirmed' || status === 'scheduled');
  const aiFlagCount = aiSummary?.important_flags?.length || 0;
  const aiQuestionCount = aiSummary?.follow_up_questions?.length || 0;
  const aiMissingCount = aiSummary?.missing_information?.length || 0;
  const aiSymptomSignalCount = reportedSymptoms.length + (medicalInformation?.owner_symptom_notes ? 1 : 0);

  const buildAdminAiPayload = () => ({
    ...user,
    name: user.name || userDetails.fullName,
    patient_email: email,
    patient_phone: phone,
    reasonForVisit,
    reschedule_reason: rescheduleReason,
    pet_name: petName,
    pet_type: petType,
    pet_breed: petBreed,
    pet_gender: petGender,
    service: user.service || 'Appointment',
    branch: assignedBranch,
    doctor: assignedDoctor,
    medicalInformation,
    medical_information: medicalInformation,
  });

  const buildAiClipboardText = () => {
    if (!aiSummary) return '';

    return [
      'AI Appointment Summary',
      '',
      `Case Summary: ${aiSummary.summary}`,
      '',
      'Important Flags:',
      ...(aiSummary.important_flags?.length
        ? aiSummary.important_flags.map(item => `- ${item}`)
        : ['- No major admin-facing flags were identified from the provided data.']),
      '',
      'Suggested Follow-Up Questions:',
      ...(aiSummary.follow_up_questions?.length
        ? aiSummary.follow_up_questions.map(item => `- ${item}`)
        : ['- No follow-up questions were suggested.']),
      '',
      'Missing Information:',
      ...(aiSummary.missing_information?.length
        ? aiSummary.missing_information.map(item => `- ${item}`)
        : ['- No major missing information was identified.']),
    ].join('\n');
  };

  const handleGenerateAiSummary = async () => {
    setAiLoading(true);
    setAiError('');
    setCopySuccess(false);

    try {
      const response = await apiService.generateAdminAppointmentSummary(buildAdminAiPayload());
      setAiSummary(response.summary || null);
      setAiCollapsed(false);
    } catch (error: any) {
      setAiSummary(null);
      setAiError(getAiFallbackMessage(error, 'Unable to generate the AI summary right now.'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAiSummary = async () => {
    if (!aiSummary) return;

    try {
      await navigator.clipboard.writeText(buildAiClipboardText());
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1800);
    } catch {
      setAiError('Unable to copy the AI summary right now.');
    }
  };

  return (
    <div className="appointmentDetailsPanel">
      <button
        onClick={onBack}
        className="appointmentDetailsBackBtn"
      >
        <IoArrowBack size={18} />
        <span>{backLabel}</span>
      </button>

      <div className="appointmentDetailsHeader">
        <div>
          <span className="appointmentPanelKicker">Appointment Dossier</span>
          <h2>{userDetails.fullName}</h2>
          <p>{userDetails.petName} - {user.service || 'Appointment'}</p>
        </div>
        {!readOnly && (
          <div className="appointmentDetailsHeaderActions">
            <button
              onClick={handleGenerateAiSummary}
              disabled={isAnyActionBusy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #d8dcff',
                backgroundColor: aiLoading ? '#eef2ff' : '#f4f7ff',
                color: '#3d67ee',
                cursor: isAnyActionBusy ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: isAnyActionBusy && !aiLoading ? 0.68 : 1,
              }}
            >
              {aiLoading ? <InlineButtonSpinner /> : <IoMedical size={18} />}
              <span>{aiLoading ? 'Generating Summary...' : 'Generate AI Summary'}</span>
            </button>

            {canAcceptAppointment && (
            <>
              <button
                onClick={() => onAccept(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #c8e6c9',
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  fontWeight: '600',
                  ...disabledActionStyle,
                }}
              >
                {isBusyAction('accept') ? <InlineButtonSpinner /> : <IoCheckmarkCircleOutline size={18} />}
                <span>{isBusyAction('accept') ? 'Accepting...' : 'Accept Appointment'}</span>
              </button>
              <button
                onClick={() => onCancel(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ffcdd2',
                  backgroundColor: '#ffebee',
                  color: '#d32f2f',
                  fontWeight: '600',
                  ...disabledActionStyle,
                }}
              >
                {isBusyAction('cancel') ? <InlineButtonSpinner /> : <IoCloseCircleOutline size={18} />}
                <span>{isBusyAction('cancel') ? 'Declining...' : 'Decline Appointment'}</span>
              </button>
            </>
            )}
            <button
              onClick={onRefresh}
              disabled={isAnyActionBusy}
              title={refreshing ? 'Refreshing appointments' : 'Refresh appointment details'}
              aria-label={refreshing ? 'Refreshing appointments' : 'Refresh appointment details'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #cdd8ff',
                backgroundColor: refreshing ? '#eef2ff' : '#f4f7ff',
                color: '#3d67ee',
                cursor: isAnyActionBusy ? 'not-allowed' : 'pointer',
                opacity: isAnyActionBusy && !refreshing ? 0.68 : 1,
                flexShrink: 0,
              }}
            >
              {refreshing ? <InlineButtonSpinner /> : <IoRefreshOutline size={18} />}
            </button>
          </div>
        )}
      </div>

      <div className="appointmentDetailsHero">
        <div className="appointmentDetailsHeroIcon">
          <IoPaw size={28} />
        </div>
        <div className="appointmentDetailsHeroCopy">
          <span>{status ? status.replace(/_/g, ' ') : 'scheduled'}</span>
          <h3>{user.service || 'Appointment'}</h3>
          <p>{user.date_time || 'Schedule not set'}</p>
        </div>
        <div className="appointmentDetailsHeroMeta">
          <div>
            <span>Doctor</span>
            <strong className={assignedDoctor === 'Not Assigned' ? 'appointmentWarnText' : ''}>{assignedDoctor}</strong>
          </div>
          <div className="appointmentDetailsHeroMetaBranch">
            <span>Branch</span>
            <strong>{assignedBranch}</strong>
          </div>
          {billingStatusMeta && (
            <div>
              <span>Billing</span>
              <strong>{billingStatusMeta.label}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="appointmentDetailsContent">
        {(aiSummary || aiError) && (
          <div className="adminAiPanelWrap">
            <div className="adminAiPanelHeadingRow">
              <h3 className="adminAiPanelHeading">AI Appointment Summary</h3>
              <div className="adminAiPanelToolbar">
                {aiSummary && (
                  <>
                    <button
                      type="button"
                      className="adminAiToolbarBtn"
                      onClick={handleCopyAiSummary}
                    >
                      <IoCopyOutline size={16} />
                      <span>{copySuccess ? 'Copied' : 'Copy Summary'}</span>
                    </button>
                    <button
                      type="button"
                      className="adminAiToolbarBtn"
                      onClick={handleGenerateAiSummary}
                      disabled={isAnyActionBusy}
                    >
                      {aiLoading ? <InlineButtonSpinner /> : <IoRefreshCircleOutline size={16} />}
                      <span>{aiLoading ? 'Refreshing...' : 'Regenerate'}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="adminAiToolbarBtn"
                  onClick={() => setAiCollapsed(prev => !prev)}
                >
                  {aiCollapsed ? <IoChevronDownOutline size={16} /> : <IoChevronUpOutline size={16} />}
                  <span>{aiCollapsed ? 'Expand' : 'Collapse'}</span>
                </button>
              </div>
            </div>

            <div className="adminAiPanelCard">
              {aiError ? (
                <div className="adminAiErrorBox">
                  <IoAlertCircleOutline size={18} className="adminAiErrorIcon" />
                  <div className="adminAiErrorText">{aiError}</div>
                </div>
              ) : aiSummary && (
                <div className="adminAiPanelContent">
                  <div className="adminAiHero">
                    <div className="adminAiHeroInfo">
                      <div className="adminAiHeroIcon">
                        <IoSparklesOutline size={20} />
                      </div>
                      <div className="adminAiHeroText">
                        <div className="adminAiHeroTitle">
                          Admin AI Brief
                        </div>
                        <div className="adminAiHeroSubtitle">
                          A quick, admin-facing overview of the appointment details, intake concerns, and follow-up prompts before vet endorsement.
                        </div>
                      </div>
                    </div>

                    <div className="adminAiStatRow">
                      <div className="adminAiStatChip adminAiStatChipFlag">
                        <div className="adminAiStatLabel">Flags</div>
                        <div className="adminAiStatValue">{aiFlagCount}</div>
                      </div>
                      <div className="adminAiStatChip adminAiStatChipQuestion">
                        <div className="adminAiStatLabel">Questions</div>
                        <div className="adminAiStatValue">{aiQuestionCount}</div>
                      </div>
                      <div className="adminAiStatChip adminAiStatChipMissing">
                        <div className="adminAiStatLabel">Missing</div>
                        <div className="adminAiStatValue">{aiMissingCount}</div>
                      </div>
                    </div>
                  </div>

                  {!aiCollapsed && (
                    <>
                      <div className="adminAiSummaryCard">
                        <div className="adminAiSectionTitleRow">
                          <IoDocumentTextOutline size={18} color="#3d67ee" />
                          <div className="adminAiSectionEyebrow">Case Summary</div>
                        </div>
                        <div className="adminAiSummaryText">{aiSummary.summary}</div>
                      </div>

                      <div className="adminAiGrid">
                        <div className="adminAiSectionCard adminAiSectionCardFlag">
                          <div className="adminAiSectionTitleRow">
                            <IoWarningOutline size={18} color="#dc2626" />
                            <div className="adminAiSectionEyebrow adminAiSectionEyebrowFlag">Important Flags</div>
                          </div>
                          <ul className="adminAiList adminAiListFlag">
                            {(aiSummary.important_flags || []).length > 0 ? aiSummary.important_flags.map((item, index) => (
                              <li key={`flag-${index}`} className="adminAiListItem">{item}</li>
                            )) : <li className="adminAiListItem">No major admin-facing flags were identified from the provided data.</li>}
                          </ul>
                        </div>

                        <div className="adminAiSectionCard adminAiSectionCardQuestion">
                          <div className="adminAiSectionTitleRow">
                            <IoHelpCircleOutline size={18} color="#2563eb" />
                            <div className="adminAiSectionEyebrow adminAiSectionEyebrowQuestion">Suggested Follow-Up Questions</div>
                          </div>
                          <ul className="adminAiList adminAiListQuestion">
                            {(aiSummary.follow_up_questions || []).length > 0 ? aiSummary.follow_up_questions.map((item, index) => (
                              <li key={`question-${index}`} className="adminAiListItem">{item}</li>
                            )) : <li className="adminAiListItem">No follow-up questions were suggested.</li>}
                          </ul>
                        </div>
                      </div>

                      <div className="adminAiSectionCard adminAiSectionCardMissing">
                        <div className="adminAiSectionTitleRow">
                          <IoAlertCircleOutline size={18} color="#6d4be4" />
                          <div className="adminAiSectionEyebrow adminAiSectionEyebrowMissing">Missing Information</div>
                        </div>
                        <ul className={`adminAiList adminAiListMissing ${aiMissingCount > 4 ? 'adminAiListColumns' : ''}`}>
                          {(aiSummary.missing_information || []).length > 0 ? aiSummary.missing_information.map((item, index) => (
                            <li key={`missing-${index}`} className="adminAiListItem adminAiMissingItem">{item}</li>
                          )) : <li className="adminAiListItem">No major missing information was identified.</li>}
                        </ul>
                      </div>
                    </>
                  )}

                  {aiSummary.model && (
                    <div className="adminAiFooterNote">
                      <div>
                        Generated by: <strong>{aiSummary.model}</strong>
                      </div>
                      <div>
                        AI-generated admin support summary only. Final review remains with clinic staff and the veterinarian.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="appointmentDetailCard">
          <div className="appointmentDetailCardHeader">
            <h3>Patient Information</h3>
          </div>
          <div className="appointmentDetailGrid">
            <div><span>Full Name</span><strong>{userDetails.fullName}</strong></div>
            <div><span>Email</span><strong>{userDetails.email}</strong></div>
            <div><span>Phone</span><strong>{userDetails.phone}</strong></div>
            <div className="appointmentDetailGridWide"><span>Reason for Visit</span><strong>{userDetails.reasonForVisit}</strong></div>
            <div className="appointmentDetailGridWide"><span>Reschedule Reason</span><strong>{userDetails.rescheduleReason || 'Not provided'}</strong></div>
          </div>
        </div>

        <div className="appointmentDetailCard">
          <div className="appointmentDetailCardHeader">
            <h3>Pet Information</h3>
          </div>
          <div className="appointmentDetailGrid">
            <div><span>Pet Name</span><strong>{userDetails.petName}</strong></div>
            <div><span>Type</span><strong>{userDetails.petType}</strong></div>
            <div><span>Breed</span><strong>{userDetails.petBreed}</strong></div>
            <div><span>Gender</span><strong>{userDetails.gender}</strong></div>
          </div>
        </div>

        <div className="appointmentDetailCard appointmentDetailCardWide">
          <div className="appointmentDetailCardHeader">
            <h3>Medical Information</h3>
          </div>
          <div className="appointmentDetailSubpanel">
            {medicalInformation ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Medication in Past 72 Hours</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.on_medication)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Flea/Tick Prevention</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.flea_tick_prevention)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Up-to-Date Vaccinations</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.is_vaccinated)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Pet is Pregnant</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.is_pregnant)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Has Allergies</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.has_allergies)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Has Skin Condition</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.has_skin_condition)}</div></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Medication Details</div><div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{medicalInformation?.medication_details || 'Not provided'}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Additional Notes</div><div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{medicalInformation?.additional_notes || 'Not provided'}</div></div>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #e6ebfb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#2948a8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Symptom Intake
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c7894' }}>
                      Booking-side AI assisted intake
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '8px' }}>Reported Symptoms</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {reportedSymptoms.length > 0 ? reportedSymptoms.map(symptom => (
                        <span
                          key={symptom}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '999px',
                            backgroundColor: '#eaf0ff',
                            color: '#2948a8',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {symptom}
                        </span>
                      )) : (
                        <span style={{ fontSize: '14px', color: '#8b96aa' }}>No symptoms selected during booking.</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
                    <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Symptom Duration</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatTextAnswer(medicalInformation?.symptom_duration)}</div></div>
                    <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Condition Getting Worse</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatTextAnswer(medicalInformation?.worsening_status)}</div></div>
                    <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Eating Status</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatTextAnswer(medicalInformation?.eating_status)}</div></div>
                    <div><div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Drinking Status</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatTextAnswer(medicalInformation?.drinking_status)}</div></div>
                  </div>

                  <div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Owner Symptom Notes</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{formatTextAnswer(medicalInformation?.owner_symptom_notes)}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px', color: '#8b96aa' }}>
                No medical information recorded for this appointment yet.
              </div>
            )}
          </div>
        </div>

        <div className="appointmentDetailCard appointmentDetailCardWide">
          <div className="appointmentDetailCardHeader">
            <h3>Appointment Details</h3>
          </div>
          <div className="appointmentDetailSubpanel appointmentDetailsScheduleCard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '16px', fontWeight: '600' }}>{user.service || 'Appointment'}</span>
              <span style={{ color: '#3d67ee', fontWeight: '600' }}>{user.date_time || 'Schedule not set'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '14px', color: '#8b96aa' }}>Reserved Doctor: </span>
                  <strong style={{ color: assignedDoctor === 'Not Assigned' ? '#f57c00' : '#333' }}>{assignedDoctor}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#8b96aa' }}>Branch: </span>
                  <strong style={{ color: assignedBranch === 'Not specified' ? '#888' : '#333' }}>{assignedBranch}</strong>
                </div>
                {billingStatusMeta && (
                  <div>
                    <span style={{ fontSize: '14px', color: '#8b96aa', marginRight: '8px' }}>Billing:</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: billingStatusMeta.bg,
                        color: billingStatusMeta.color,
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      {billingStatusMeta.label}
                    </span>
                  </div>
                )}
              </div>
              {!readOnly && (
                <button
                  onClick={() => onAssignDoctor(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    backgroundColor: assignedDoctor === 'Not Assigned' ? '#fff3e0' : '#e8f5e9',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: assignedDoctor === 'Not Assigned' ? '#ffcc80' : '#c8e6c9',
                    color: assignedDoctor === 'Not Assigned' ? '#f57c00' : '#2e7d32',
                    fontWeight: '600',
                    fontSize: '12px',
                  }}
                >
                  <IoMedical size={14} />
                  <span>{assignedDoctor === 'Not Assigned' ? 'Assign Doctor' : 'Override Doctor'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {latestRescheduleRequest && (
          <div className="appointmentDetailCard appointmentDetailCardWide">
            <div className="appointmentDetailCardHeader">
            <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>
              Reschedule Details
            </h3>
            </div>
            <div className="appointmentDetailSubpanel" style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>Latest Reschedule Request</div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: '999px',
                      backgroundColor: requestStatusMeta.bg,
                      color: requestStatusMeta.color,
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                  >
                    {requestStatusMeta.label}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#8b96aa' }}>
                  Created: <strong style={{ color: '#333' }}>{formatTimestamp(latestRescheduleRequest?.created_at)}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: isDirectPatientRescheduleRequest ? '0' : '18px' }}>
                {rescheduleDetailItems.map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {!isDirectPatientRescheduleRequest && (
                <div style={{ marginBottom: canReviewClientPreference ? '18px' : '0' }}>
                  <div style={{ fontSize: '12px', color: '#8b96aa', marginBottom: '4px' }}>Patient Note</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', whiteSpace: 'pre-wrap' }}>
                    {patientNoteDisplay}
                  </div>
                </div>
              )}

              {canReviewClientPreference && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={() => onDeclineClientPreference(user, latestRescheduleRequest)}
                    disabled={isAnyActionBusy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      backgroundColor: '#ffebee',
                      color: '#d32f2f',
                      border: '1px solid #ffcdd2',
                      borderRadius: '8px',
                      fontWeight: '600',
                      ...disabledActionStyle,
                    }}
                  >
                    {isBusyAction('declinePreference') ? <InlineButtonSpinner /> : <IoCloseCircleOutline size={18} />}
                    <span>{isBusyAction('declinePreference') ? 'Declining...' : 'Decline Preference'}</span>
                  </button>
                  <button
                    onClick={() => onAcceptClientPreference(user, latestRescheduleRequest)}
                    disabled={isAnyActionBusy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      border: '1px solid #c8e6c9',
                      borderRadius: '8px',
                      fontWeight: '600',
                      ...disabledActionStyle,
                    }}
                  >
                    {isBusyAction('acceptPreference') ? <InlineButtonSpinner /> : <IoCheckmarkCircleOutline size={18} />}
                    <span>{isBusyAction('acceptPreference') ? 'Accepting...' : 'Accept Preferred Date'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(!readOnly || canShowBillingAction || showMedicalRecordsAction || showInventoryAction) && (
          <div style={{ display: 'flex', justifyContent: showBottomLifecycleActions ? 'space-around' : 'center', padding: '20px 0', borderTop: '1px solid #eee', gap: '20px', flexWrap: 'wrap' }}>
            {showMedicalRecordsAction && (
              <button
                onClick={() => onOpenMedicalRecords?.(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#f4f7ff',
                  color: '#3d67ee',
                  border: '1px solid #cdd8ff',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: isAnyActionBusy ? 'not-allowed' : 'pointer',
                  opacity: isAnyActionBusy ? 0.68 : 1,
                }}
              >
                <IoDocumentTextOutline size={18} />
                <span>Open Medical Records</span>
              </button>
            )}

            {showInventoryAction && (
              <button
                onClick={() => onOpenInventory?.(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#f8fbff',
                  color: '#315f9f',
                  border: '1px solid #cfe0f5',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: isAnyActionBusy ? 'not-allowed' : 'pointer',
                  opacity: isAnyActionBusy ? 0.68 : 1,
                }}
              >
                <IoAlbumsOutline size={18} />
                <span>Check Inventory</span>
              </button>
            )}

            {!readOnly && (
              <button
                onClick={() => onReschedule(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#3d67ee',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  ...disabledActionStyle,
                }}
              >
                {isBusyAction('reschedule') ? <InlineButtonSpinner /> : <IoCalendarClearOutline size={18} />}
                <span>{isBusyAction('reschedule') ? 'Rescheduling...' : 'Reschedule'}</span>
              </button>
            )}

            {!readOnly && showBottomLifecycleActions && (
              <button
                onClick={() => onCancel(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#ffebee',
                  color: '#d32f2f',
                  border: '1px solid',
                  borderColor: '#ffcdd2',
                  borderRadius: '8px',
                  fontWeight: '600',
                  ...disabledActionStyle,
                }}
              >
                {isBusyAction('cancel') ? <InlineButtonSpinner /> : <IoCloseCircleOutline size={18} />}
                <span>{isBusyAction('cancel') ? 'Cancelling...' : 'Cancel'}</span>
              </button>
            )}

            {!readOnly && showBottomLifecycleActions && (
              <button
                onClick={() => onComplete(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  border: '1px solid',
                  borderColor: '#c8e6c9',
                  borderRadius: '8px',
                  fontWeight: '600',
                  ...disabledActionStyle,
                }}
              >
                {isBusyAction('complete') ? <InlineButtonSpinner /> : <IoCheckmarkCircleOutline size={18} />}
                <span>{isBusyAction('complete') ? 'Completing...' : 'Complete'}</span>
              </button>
            )}

            {canShowBillingAction && (
              <button
                onClick={() => onProceedToBilling(user)}
                disabled={isAnyActionBusy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  minWidth: '178px',
                  backgroundColor: hasBillingInvoice ? '#eef2ff' : '#fff7e6',
                  color: hasBillingInvoice ? '#3d67ee' : '#b26a00',
                  border: '1px solid',
                  borderColor: hasBillingInvoice ? '#cdd8ff' : '#ffe0a3',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: isAnyActionBusy ? 'not-allowed' : 'pointer',
                  opacity: isAnyActionBusy && !billingActionLoading ? 0.68 : 1,
                }}
              >
                {billingActionLoading ? (
                  <>
                    <span className="adminInlineButtonSpinner" aria-hidden="true" />
                    <span>Opening Billing...</span>
                  </>
                ) : (
                  <>
                    <IoReceipt size={18} />
                    <span>{hasBillingInvoice ? 'View Invoice' : 'Proceed to Billing'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

