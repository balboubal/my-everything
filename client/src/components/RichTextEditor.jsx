import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Link,
  Highlighter,
  Undo,
  Redo,
  Type
} from 'lucide-react';
import './RichTextEditor.css';

const EDITOR_SIZE_KEY = 'me_editor_size';

export default function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...',
  minHeight = 150,
  maxHeight = 600,
  autoSave = false,
  onAutoSave,
  className = '',
  resizable = true,
  editorId = 'default'
}) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef(null);
  const [editorHeight, setEditorHeight] = useState(() => {
    if (resizable) {
      const saved = localStorage.getItem(`${EDITOR_SIZE_KEY}_${editorId}`);
      return saved ? parseInt(saved) : minHeight;
    }
    return minHeight;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  // Save editor height to localStorage
  useEffect(() => {
    if (resizable && editorHeight !== minHeight) {
      localStorage.setItem(`${EDITOR_SIZE_KEY}_${editorId}`, editorHeight.toString());
    }
  }, [editorHeight, resizable, editorId, minHeight]);
  
  // Handle resize
  const handleResizeStart = useCallback((e) => {
    if (!resizable) return;
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = editorHeight;
    
    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
      setEditorHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [resizable, editorHeight, minHeight, maxHeight]);
  
  // Initialize content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && isDirty) {
      saveTimeoutRef.current = setTimeout(() => {
        if (onAutoSave) {
          onAutoSave(editorRef.current?.innerHTML || '');
        }
        setLastSaved(new Date());
        setIsDirty(false);
      }, 2000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, autoSave, onAutoSave]);

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    onChange?.(html);
    setIsDirty(true);
  }, [onChange]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      execCommand('bold');
    }
    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      execCommand('italic');
    }
    // Ctrl/Cmd + U for underline
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      execCommand('underline');
    }
    // Tab for indent
    if (e.key === 'Tab') {
      e.preventDefault();
      execCommand('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertHeading = (level) => {
    execCommand('formatBlock', level);
  };

  const toggleCode = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (selectedText) {
        const code = document.createElement('code');
        code.textContent = selectedText;
        range.deleteContents();
        range.insertNode(code);
        handleInput();
      }
    }
  };

  const applyHighlight = () => {
    execCommand('backColor', '#fef08a');
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const seconds = Math.floor((new Date() - lastSaved) / 1000);
    if (seconds < 5) return 'Saved just now';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    return `Saved ${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      <div className="rte-toolbar">
        <div className="rte-toolbar-group">
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCommand('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCommand('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCommand('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>
        </div>

        <div className="rte-divider" />

        <div className="rte-toolbar-group">
          <button
            type="button"
            className="rte-btn"
            onClick={() => insertHeading('h2')}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => insertHeading('h3')}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => insertHeading('p')}
            title="Normal text"
          >
            <Type size={16} />
          </button>
        </div>

        <div className="rte-divider" />

        <div className="rte-toolbar-group">
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCommand('insertUnorderedList')}
            title="Bullet list"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={() => execCommand('insertOrderedList')}
            title="Numbered list"
          >
            <ListOrdered size={16} />
          </button>
        </div>

        <div className="rte-divider" />

        <div className="rte-toolbar-group">
          <button
            type="button"
            className="rte-btn"
            onClick={toggleCode}
            title="Code"
          >
            <Code size={16} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={applyHighlight}
            title="Highlight"
          >
            <Highlighter size={16} />
          </button>
          <button
            type="button"
            className="rte-btn"
            onClick={insertLink}
            title="Insert link"
          >
            <Link size={16} />
          </button>
        </div>

        <div className="rte-spacer" />

        {autoSave && (
          <div className="rte-save-status">
            {isDirty ? (
              <span className="saving">Saving...</span>
            ) : lastSaved ? (
              <span className="saved">{formatLastSaved()}</span>
            ) : null}
          </div>
        )}
      </div>

      <div
        ref={editorRef}
        className="rte-content"
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{ 
          height: resizable ? `${editorHeight}px` : 'auto',
          minHeight: resizable ? undefined : `${minHeight}px`,
          maxHeight: resizable ? undefined : `${maxHeight}px`
        }}
      />
      
      {resizable && (
        <div 
          className={`rte-resize-handle ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        >
          <div className="resize-bar" />
        </div>
      )}
    </div>
  );
}

// Simple text editor for places that don't need rich text
export function SimpleTextEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  minHeight = 100,
  autoSave = false,
  onAutoSave,
  className = ''
}) {
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (autoSave && isDirty) {
      saveTimeoutRef.current = setTimeout(() => {
        if (onAutoSave) {
          onAutoSave(value);
        }
        setLastSaved(new Date());
        setIsDirty(false);
      }, 2000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, autoSave, onAutoSave, value]);

  const handleChange = (e) => {
    onChange?.(e.target.value);
    setIsDirty(true);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const seconds = Math.floor((new Date() - lastSaved) / 1000);
    if (seconds < 5) return 'Saved just now';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    return `Saved ${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className={`simple-text-editor ${className}`}>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{ minHeight: `${minHeight}px` }}
      />
      {autoSave && (
        <div className="ste-save-status">
          {isDirty ? (
            <span className="saving">Saving...</span>
          ) : lastSaved ? (
            <span className="saved">{formatLastSaved()}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
