import React, { useEffect, useMemo, useState } from 'react';
import {
  buildPayrexMockQrCells,
  buildPayrexMockQrPayload,
  formatCurrency,
  generatePayrexMockReference,
} from '../utils/payrexMockUtils';
import './PayrexMockPayment.css';

type PayrexMockPaymentProps = {
  amount: number;
  invoiceNumber?: string;
  compact?: boolean;
  showAmount?: boolean;
  onReferenceChange?: (reference: string) => void;
};

export const PayrexMockQrPreview: React.FC<{
  reference: string;
  amount: number;
  invoiceNumber?: string;
  compact?: boolean;
}> = ({ reference, amount, invoiceNumber, compact = false }) => {
  const qrPayload = buildPayrexMockQrPayload(reference, amount, invoiceNumber);
  const cells = useMemo(() => buildPayrexMockQrCells(qrPayload), [qrPayload]);

  return (
    <div
      className={`payrexMockQr ${compact ? 'payrexMockQrCompact' : ''}`}
      aria-label="PayRex mock QR preview"
    >
      {cells.map((filled, index) => (
        <span key={`${reference}-${index}`} className={filled ? 'filled' : ''} />
      ))}
    </div>
  );
};

const PayrexMockPayment: React.FC<PayrexMockPaymentProps> = ({
  amount,
  invoiceNumber,
  compact = false,
  showAmount = true,
  onReferenceChange,
}) => {
  const [reference, setReference] = useState(generatePayrexMockReference);

  useEffect(() => {
    onReferenceChange?.(reference);
  }, [onReferenceChange, reference]);

  const regenerateReference = () => {
    const nextReference = generatePayrexMockReference();
    setReference(nextReference);
    onReferenceChange?.(nextReference);
  };

  return (
    <div>
      {showAmount && (
        <p className="payrexMockAmount">
          Amount due: <strong>{formatCurrency(amount)}</strong>
        </p>
      )}
      <div className={`payrexMockPanel ${compact ? 'payrexMockPanelCompact' : ''}`}>
        <PayrexMockQrPreview
          reference={reference}
          amount={amount}
          invoiceNumber={invoiceNumber}
          compact={compact}
        />
        <div className="payrexMockDetails">
          <span>PayRex Mock QR</span>
          <strong>{reference}</strong>
          <p>Scan this mock QR locally to simulate payment. No real PayRex charge is made.</p>
          <button type="button" className="payrexMockRegenerateBtn" onClick={regenerateReference}>
            Regenerate reference
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrexMockPayment;
