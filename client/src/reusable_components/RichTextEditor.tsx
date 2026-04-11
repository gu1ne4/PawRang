// src/reusable_components/RichTextEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FaBold, FaItalic } from "react-icons/fa";
import { MdFormatListBulleted, MdOutlineFormatClear } from "react-icons/md";
import {  
  IoColorPaletteOutline,
  IoCloseOutline
} from 'react-icons/io5';

import '../global_pages/GlobalEMR2.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter clinical notes...",
  rows = 4,
  className = "",
  label = "Doctor's Remarks"
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPlacement, setPickerPlacement] = useState<'top' | 'bottom'>('bottom');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#3d67ee');
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorPickerContainerRef = useRef<HTMLDivElement>(null);

  // Track active styles
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isBulletActive, setIsBulletActive] = useState(false);
  const [typingColor, setTypingColor] = useState<string | null>(null);

  const savedSelection = useRef<Range | null>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFA500', 
    '#800080', '#008080', '#FF69B4', '#808080', '#8B4513'
  ];

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerContainerRef.current &&
        !colorPickerContainerRef.current.contains(event.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  useEffect(() => {
    if (!showColorPicker) return;

    const updatePickerPlacement = () => {
      const containerRect = colorPickerContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const pickerHeight = colorPickerRef.current?.offsetHeight || 260;
      const gap = 8;
      const spaceBelow = window.innerHeight - containerRect.bottom;
      const spaceAbove = containerRect.top;

      setPickerPlacement(
        spaceBelow < pickerHeight + gap && spaceAbove > spaceBelow ? 'top' : 'bottom'
      );
    };

    const frameId = window.requestAnimationFrame(updatePickerPlacement);
    window.addEventListener('resize', updatePickerPlacement);
    window.addEventListener('scroll', updatePickerPlacement, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePickerPlacement);
      window.removeEventListener('scroll', updatePickerPlacement, true);
    };
  }, [showColorPicker]);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && value !== undefined) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Check active styles on selection change
  useEffect(() => {
    const checkActiveStyles = () => {
      if (editorRef.current && document.activeElement === editorRef.current) {
        setIsBoldActive(document.queryCommandState('bold'));
        setIsItalicActive(document.queryCommandState('italic'));
        setIsBulletActive(document.queryCommandState('insertUnorderedList'));
      }
    };

    document.addEventListener('selectionchange', checkActiveStyles);
    document.addEventListener('mouseup', checkActiveStyles);
    document.addEventListener('keyup', checkActiveStyles);

    return () => {
      document.removeEventListener('selectionchange', checkActiveStyles);
      document.removeEventListener('mouseup', checkActiveStyles);
      document.removeEventListener('keyup', checkActiveStyles);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
  if (!typingColor) return;

  // Only handle normal typing (ignore ctrl, arrows, etc.)
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();

    editorRef.current?.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Create colored text node
    const span = document.createElement('span');
    span.style.color = typingColor;
    span.textContent = e.key;

    range.insertNode(span);

    // Move cursor after inserted character
    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }
};

  const handleInput = () => {
  if (editorRef.current) {
    onChange(editorRef.current.innerHTML);
  }
};

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedSelection.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  };

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value || '');
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    
    // Update active states
    setIsBoldActive(document.queryCommandState('bold'));
    setIsItalicActive(document.queryCommandState('italic'));
    setIsBulletActive(document.queryCommandState('insertUnorderedList'));
  };

  const formatBold = () => {
    execCommand('bold');
  };

  const formatItalic = () => {
    execCommand('italic');
  };

  const formatBulletList = () => {
    execCommand('insertUnorderedList');
  };

  // Custom color formatting function that works with the color picker
  const applyColor = (color: string) => {
    editorRef.current?.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Check if there's selected text
    if (range.collapsed) {
      // No text selected, insert a span with color at cursor position
      const span = document.createElement('span');
      span.style.color = color;
      span.innerHTML = ' '; // Insert a space placeholder
      range.insertNode(span);
      range.collapse(false);
    } else {
      // Wrap selected text with colored span
      const selectedContent = range.extractContents();
      const span = document.createElement('span');
      span.style.color = color;
      span.appendChild(selectedContent);
      range.insertNode(span);
      
      // Collapse the range after the inserted content
      range.collapse(false);
    }
    
    // Update the content
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const formatColor = (color: string) => {
    setSelectedColor(color);
    setTypingColor(color); 
    applyColor(color);
    setShowColorPicker(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const color = e.target.value;

    setCustomColor(color);
    setSelectedColor(color);
    setTypingColor(color);
  };

  const applyCustomColor = () => {
    applyColor(customColor);
  };

  const clearFormatting = () => {
    editorRef.current?.focus();
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedContent = range.cloneContents();
      
      if (selectedContent.textContent && selectedContent.textContent.length > 0) {
        // Remove formatting from selection using execCommand
        document.execCommand('removeFormat', false);
      } else {
        // If nothing was selected, clear the entire content's formatting
        const content = editorRef.current?.innerHTML || '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        // Remove all inline styles and spans
        tempDiv.querySelectorAll('[style]').forEach(el => {
          el.removeAttribute('style');
        });
        // Replace spans without styles with their content
        tempDiv.querySelectorAll('span').forEach(span => {
          if (!span.hasAttribute('style') && span.children.length === 0) {
            const text = document.createTextNode(span.textContent || '');
            span.parentNode?.replaceChild(text, span);
          }
        });
        if (editorRef.current) {
          editorRef.current.innerHTML = tempDiv.innerHTML;
          onChange(editorRef.current.innerHTML);
        }
      }
    }
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const toggleColorPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowColorPicker(!showColorPicker);
  };

  const handleColorPickerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={`emrRichTextEditorWrapper ${className}`}>
      {label && <label className="emrEditorLabel">{label}</label>}
      
      <div className="emrRichTextEditorContainer">
        {/* Toolbar now inside the container, at the top */}
        <div className={`emrRichTextToolbar ${isFocused ? 'emrToolbarFocused' : ''}`}>
          <button
            type="button"
            className={`emrRichTextBtn ${isBoldActive ? 'emrBtnActive' : ''}`}
            onClick={formatBold}
            title="Bold (Ctrl+B)"
          >
            <FaBold size={16} />
          </button>
          <button
            type="button"
            className={`emrRichTextBtn ${isItalicActive ? 'emrBtnActive' : ''}`}
            onClick={formatItalic}
            title="Italic (Ctrl+I)"
          >
            <FaItalic size={16} />
          </button>
          <button
            type="button"
            className={`emrRichTextBtn ${isBulletActive ? 'emrBtnActive' : ''}`}
            onClick={formatBulletList}
            title="Bullet List"
          >
            <MdFormatListBulleted size={16} />
          </button>
          <div className="emrColorPickerContainer" ref={colorPickerContainerRef}>
            <button
              type="button"
              className="emrRichTextBtn"
              onClick={toggleColorPicker}
              title="Text Color"
              style={{ color: selectedColor }}
            >
              <IoColorPaletteOutline size={16} />
            </button>
            {showColorPicker && (
              <div 
                className={`emrColorPicker ${pickerPlacement === 'top' ? 'emrColorPickerTop' : 'emrColorPickerBottom'}`} 
                ref={colorPickerRef}
                onClick={handleColorPickerClick}
              >
                <div className="emrColorPickerHeader">
                  <span>Select Text Color</span>
                  <button onClick={() => setShowColorPicker(false)}>
                    <IoCloseOutline size={14} />
                  </button>
                </div>
                
                {/* Color Wheel / Custom Color Picker */}
                <div className="emrColorWheelSection">
                  <label className="emrColorWheelLabel">
                    <IoColorPaletteOutline size={14} />
                    <span>Custom Color</span>
                  </label>
                  <div className="emrColorWheelContainer">
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={customColor}
                      onChange={handleCustomColorChange}
                      onMouseUp={applyCustomColor}
                      onTouchEnd={applyCustomColor}
                      onClick={(e) => e.stopPropagation()}
                      className="emrColorWheel"
                      title="Choose any color"
                    />
                    <div 
                      className="emrColorPreview"
                      style={{ backgroundColor: customColor }}
                      onClick={(e) => {
                        e.stopPropagation();
                        colorInputRef.current?.click();
                      }}
                    />
                    <span className="emrColorValue">{customColor}</span>
                  </div>
                </div>
                
                <div className="emrColorPickerDivider" />
                
                {/* Preset Colors */}
                <div className="emrPresetColorsSection">
                  <label className="emrPresetColorsLabel">Preset Colors</label>
                  <div className="emrColorGrid">
                    {colors.map(color => (
                      <button
                        key={color}
                        className="emrColorOption"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          formatColor(color);
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="emrToolbarDivider" />
          <button
            type="button"
            className="emrRichTextBtn emrClearFormatBtn"
            onClick={clearFormatting}
            title="Clear Formatting"
          >
            <MdOutlineFormatClear size={14} />
            <span style={{ marginLeft: '4px' }}>Clear</span>
          </button>
        </div>
        
        {/* Editor content area */}
        <div
          ref={editorRef}
          className={`emrRichTextEditor ${className}`}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown} 
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPaste={handlePaste}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          data-placeholder={placeholder}
          style={{ minHeight: `${rows * 24}px` }}
          suppressContentEditableWarning
        />
      </div>
      
      <div className="emrEditorHelper">
        <small>Tip: Use Ctrl+B for bold, Ctrl+I for italic. Select text to format.</small>
      </div>
    </div>
  );
};

export default RichTextEditor;
