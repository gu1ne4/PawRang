import React, { useState, useRef } from 'react';
import { IoCloudUploadOutline, IoDownloadOutline, IoAlertCircleOutline, IoCloseOutline } from 'react-icons/io5';

interface ImportButtonProps {
  onImport: (file: File) => void;
  buttonClassName?: string;
  iconClassName?: string;
  accept?: string;
  templateColumns?: { label: string; required: boolean; description: string }[];
  onDownloadTemplate?: () => void;
}

const ImportButton: React.FC<ImportButtonProps> = ({ 
  onImport, 
  buttonClassName = '',
  iconClassName = '',
  accept = ".csv, .xlsx, .xls",
  templateColumns,
  onDownloadTemplate
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default template columns if none provided
  const defaultColumns = [
    { label: 'Item', required: true, description: 'Product name (required)' },
    { label: 'Category', required: true, description: 'Category (required)' },
    { label: 'Base Price', required: true, description: 'Base price (required)' },
    { label: 'Selling Price', required: true, description: 'Selling price (required)' },
    { label: 'Stock Count', required: false, description: 'Initial stock (optional)' },
    { label: 'Critical Stock Level', required: false, description: 'Low stock threshold (optional)' },
    { label: 'Expiration Date', required: false, description: 'MM/YYYY or "N/A" (optional)' }
  ];

  const columns = templateColumns || defaultColumns;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImportSubmit = () => {
    if (!selectedFile) {
      alert('Please select a file to import.');
      return;
    }
    onImport(selectedFile);
    setShowModal(false);
    setSelectedFile(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    if (onDownloadTemplate) {
      onDownloadTemplate();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <button 
        className={buttonClassName || "invImportBtn"}
        onClick={() => setShowModal(true)}
      >
        <IoCloudUploadOutline className={iconClassName} /> Import
      </button>

      {/* Import Modal */}
      {showModal && (
        <div className="invModalOverlay" onClick={() => setShowModal(false)}>
          <div className="invImportModal" onClick={e => e.stopPropagation()}>
            <div className="invModalHeader">
              <h2>Import Inventory</h2>
              <button className="invModalClose" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="invModalContent">
              <div className="invImportNote">
                <IoAlertCircleOutline size={20} color="#ff9800" />
                <div>
                  <p>Please make sure your file follows the required template format. The template includes the following columns:</p>
                  <ul>
                    {columns.map((col, index) => (
                      <li key={index}>
                        <strong>{col.label}</strong> - {col.description}
                        {col.required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="invFileUploadArea">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="fileUpload"
                  accept={accept}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fileUpload" className="invFileUploadLabel" onClick={triggerFileInput}>
                  <IoCloudUploadOutline size={32} />
                  <span>{selectedFile ? selectedFile.name : 'Click to select file'}</span>
                  <span className="invFileHint">Supported formats: .csv, .xlsx, .xls</span>
                </label>
              </div>
            </div>

            <div className="invImportActions">
              <div className="invTemplateNote">
                <span>Don't have the template?</span>
                <button className="invTemplateLink" onClick={handleDownloadTemplate}>
                  <IoDownloadOutline /> 
                  Click here to download it
                </button>
              </div>
            </div>
            
            <div className="invModalFooter">
              <button className="invCancelBtn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="invSubmitBtn" onClick={handleImportSubmit}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportButton;