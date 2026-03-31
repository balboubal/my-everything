import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useTimer } from '../context/TimerContext';
import RichTextEditor from '../components/RichTextEditor';
import { 
  FolderTree, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Clock,
  Hash,
  Check,
  X,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  Settings,
  Undo2,
  Redo2,
  FileText,
  Calendar,
  GripVertical,
  MoreVertical,
  Copy,
  Move
} from 'lucide-react';
import './MyEverythingPage.css';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6'
];

// Action-based undo/redo system
function useUndoRedo(maxHistory = 50) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  
  const pushAction = useCallback((action) => {
    // action = { type, undo: fn, redo: fn, description }
    setUndoStack(prev => [...prev.slice(-maxHistory + 1), action]);
    setRedoStack([]); // Clear redo stack on new action
  }, [maxHistory]);
  
  const undo = useCallback(async () => {
    if (!canUndo) return null;
    
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
    
    if (action.undo) {
      await action.undo();
    }
    return action;
  }, [canUndo, undoStack]);
  
  const redo = useCallback(async () => {
    if (!canRedo) return null;
    
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    
    if (action.redo) {
      await action.redo();
    }
    return action;
  }, [canRedo, redoStack]);
  
  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);
  
  return { 
    pushAction, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    clear,
    undoDescription: undoStack[undoStack.length - 1]?.description,
    redoDescription: redoStack[redoStack.length - 1]?.description
  };
}

export default function MyEverythingPage() {
  const { 
    categories, 
    sessions, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    updateSession,
    deleteSession 
  } = useData();
  const { formatTime } = useTimer();
  
  // Undo/Redo system
  const { 
    pushAction, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    undoDescription, 
    redoDescription 
  } = useUndoRedo();
  
  // Toast notifications for undo/redo
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  
  const showToast = useCallback((message, type = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);
  
  // UI State
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'category' | 'session', data: ... }
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'time', 'date', 'sessions'
  const [sortOrder, setSortOrder] = useState('asc');
  const [hiddenCategories, setHiddenCategories] = useState(new Set());
  const [showSessions, setShowSessions] = useState(true);
  const [filterDateRange, setFilterDateRange] = useState(null);
  
  // Settings
  const [confirmOnMove, setConfirmOnMove] = useState(true);
  const [confirmOnDelete, setConfirmOnDelete] = useState(true);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    parentId: null
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chronos_myeverything_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setConfirmOnMove(settings.confirmOnMove ?? true);
      setConfirmOnDelete(settings.confirmOnDelete ?? true);
      setHiddenCategories(new Set(settings.hiddenCategories || []));
      setExpandedCategories(new Set(settings.expandedCategories || []));
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('chronos_myeverything_settings', JSON.stringify({
      confirmOnMove,
      confirmOnDelete,
      hiddenCategories: Array.from(hiddenCategories),
      expandedCategories: Array.from(expandedCategories)
    }));
  }, [confirmOnMove, confirmOnDelete, hiddenCategories, expandedCategories]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo
          e.preventDefault();
          if (canRedo) {
            const action = await redo();
            if (action) {
              showToast(`Redo: ${action.description}`, 'success');
            }
          }
        } else {
          // Undo
          e.preventDefault();
          if (canUndo) {
            const action = await undo();
            if (action) {
              showToast(`Undo: ${action.description}`, 'info');
            }
          }
        }
      }
      // Also support Ctrl+Y for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) {
          const action = await redo();
          if (action) {
            showToast(`Redo: ${action.description}`, 'success');
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, showToast]);

  // Build category tree with sessions
  const categoryTree = useMemo(() => {
    const buildTree = (parentId = null, depth = 0) => {
      return categories
        .filter(c => c.parent_id === parentId)
        .filter(c => !hiddenCategories.has(c.id))
        .filter(c => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          // Check if category matches or any of its sessions match
          if (c.name.toLowerCase().includes(query)) return true;
          const catSessions = sessions.filter(s => s.category_id === c.id);
          return catSessions.some(s => 
            s.title?.toLowerCase().includes(query) ||
            s.notes?.toLowerCase().includes(query)
          );
        })
        .sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'time':
              comparison = (a.total_time || 0) - (b.total_time || 0);
              break;
            case 'sessions':
              comparison = (a.session_count || 0) - (b.session_count || 0);
              break;
            default:
              comparison = a.name.localeCompare(b.name);
          }
          return sortOrder === 'asc' ? comparison : -comparison;
        })
        .map(cat => ({
          ...cat,
          depth,
          children: buildTree(cat.id, depth + 1),
          sessions: showSessions ? sessions
            .filter(s => s.category_id === cat.id)
            .filter(s => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return s.title?.toLowerCase().includes(query) ||
                     s.notes?.toLowerCase().includes(query);
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            : []
        }));
    };
    
    return buildTree();
  }, [categories, sessions, hiddenCategories, searchQuery, sortBy, sortOrder, showSessions]);

  // Uncategorized sessions
  const uncategorizedSessions = useMemo(() => {
    return sessions
      .filter(s => !s.category_id)
      .filter(s => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return s.title?.toLowerCase().includes(query) ||
               s.notes?.toLowerCase().includes(query);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sessions, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleHidden = (id) => {
    setHiddenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categories.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const openCreate = (parentId = null) => {
    setFormData({
      name: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      parentId
    });
    setEditingCategory(null);
    setShowCreateModal(true);
  };

  const openEdit = (category) => {
    setFormData({
      name: category.name,
      color: category.color,
      parentId: category.parent_id
    });
    setEditingCategory(category);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingCategory) {
      const oldData = { ...editingCategory };
      await updateCategory(editingCategory.id, formData);
      
      // Push undo action for edit
      pushAction({
        type: 'edit_category',
        description: `Edit category "${formData.name}"`,
        undo: async () => {
          await updateCategory(editingCategory.id, { 
            name: oldData.name, 
            color: oldData.color, 
            parent_id: oldData.parent_id 
          });
        },
        redo: async () => {
          await updateCategory(editingCategory.id, formData);
        }
      });
    } else {
      const newCat = await createCategory(formData);
      if (newCat) {
        pushAction({
          type: 'create_category',
          description: `Create category "${formData.name}"`,
          undo: async () => {
            await deleteCategory(newCat.id);
          },
          redo: async () => {
            await createCategory(formData);
          }
        });
      }
    }
    
    setShowCreateModal(false);
    setEditingCategory(null);
  };

  const handleDelete = async (type, id) => {
    // Find the item before deleting for undo
    let deletedItem;
    if (type === 'category') {
      deletedItem = categories.find(c => c.id === id);
    } else {
      deletedItem = sessions.find(s => s.id === id);
    }
    
    if (!deletedItem) return;
    
    if (confirmOnDelete) {
      const message = type === 'category' 
        ? 'Delete this category? Sessions will become uncategorized.'
        : 'Delete this session?';
      if (!confirm(message)) return;
    }
    
    if (type === 'category') {
      await deleteCategory(id);
      
      // Push undo action
      pushAction({
        type: 'delete_category',
        description: `Delete category "${deletedItem.name}"`,
        undo: async () => {
          await createCategory({
            id: deletedItem.id, // Try to preserve ID if possible
            name: deletedItem.name,
            color: deletedItem.color,
            parentId: deletedItem.parent_id
          });
        },
        redo: async () => {
          await deleteCategory(id);
        }
      });
    } else {
      await deleteSession(id);
      
      // Push undo action  
      pushAction({
        type: 'delete_session',
        description: `Delete session "${deletedItem.title || 'Untitled'}"`,
        undo: async () => {
          // Re-create the session (would need createSession in DataContext)
          // For now, just show toast that undo isn't fully supported for sessions
          showToast('Session restore not yet implemented', 'warning');
        },
        redo: async () => {
          await deleteSession(id);
        }
      });
    }
    
    if (selectedItem?.data?.id === id) {
      setSelectedItem(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, item, type) => {
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, type }));
  };

  const handleDragOver = (e, target) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e, targetCategoryId) => {
    e.preventDefault();
    setDragOverTarget(null);
    
    if (!draggedItem) return;
    
    // Store original values for undo
    const originalParentId = draggedItem.type === 'category' 
      ? draggedItem.parent_id 
      : draggedItem.category_id;
    const originalCategoryName = draggedItem.category_name;
    const originalCategoryColor = draggedItem.category_color;
    const itemName = draggedItem.name || draggedItem.title;
    
    if (confirmOnMove) {
      const targetName = targetCategoryId 
        ? categories.find(c => c.id === targetCategoryId)?.name || 'Unknown'
        : 'Uncategorized';
      if (!confirm(`Move "${itemName}" to "${targetName}"?`)) {
        setDraggedItem(null);
        return;
      }
    }
    
    const targetCategory = categories.find(c => c.id === targetCategoryId);
    const targetName = targetCategory?.name || 'Uncategorized';
    
    if (draggedItem.type === 'category') {
      // Prevent moving category into itself or its children
      if (draggedItem.id === targetCategoryId) return;
      await updateCategory(draggedItem.id, { parent_id: targetCategoryId });
      
      // Push undo action
      pushAction({
        type: 'move_category',
        description: `Move "${itemName}" to "${targetName}"`,
        undo: async () => {
          await updateCategory(draggedItem.id, { parent_id: originalParentId });
        },
        redo: async () => {
          await updateCategory(draggedItem.id, { parent_id: targetCategoryId });
        }
      });
    } else if (draggedItem.type === 'session') {
      await updateSession(draggedItem.id, { 
        category_id: targetCategoryId,
        category_name: targetCategory?.name || null,
        category_color: targetCategory?.color || null
      });
      
      // Push undo action
      pushAction({
        type: 'move_session',
        description: `Move "${itemName}" to "${targetName}"`,
        undo: async () => {
          await updateSession(draggedItem.id, { 
            category_id: originalParentId,
            category_name: originalCategoryName,
            category_color: originalCategoryColor
          });
        },
        redo: async () => {
          await updateSession(draggedItem.id, { 
            category_id: targetCategoryId,
            category_name: targetCategory?.name || null,
            category_color: targetCategory?.color || null
          });
        }
      });
    }
    
    setDraggedItem(null);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m}m`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const renderCategory = (category) => {
    const hasChildren = category.children && category.children.length > 0;
    const hasSessions = category.sessions && category.sessions.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedItem?.type === 'category' && selectedItem?.data?.id === category.id;
    const isDragOver = dragOverTarget?.id === category.id && dragOverTarget?.type === 'category';

    return (
      <div key={category.id} className="tree-item-wrapper">
        <div 
          className={`tree-item category-item ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
          style={{ paddingLeft: `${12 + category.depth * 20}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, category, 'category')}
          onDragOver={(e) => handleDragOver(e, { id: category.id, type: 'category' })}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, category.id)}
          onClick={() => setSelectedItem({ type: 'category', data: category })}
        >
          <div className="tree-item-left">
            <span className="drag-handle">
              <GripVertical size={14} />
            </span>
            
            {(hasChildren || hasSessions) ? (
              <button 
                className="expand-btn"
                onClick={(e) => { e.stopPropagation(); toggleExpand(category.id); }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="expand-placeholder" />
            )}
            
            <span className="folder-icon" style={{ color: category.color }}>
              {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
            </span>
            
            <span className="tree-item-name">{category.name}</span>
          </div>
          
          <div className="tree-item-right">
            <span className="tree-item-stats">
              {formatDuration(category.total_time || 0)}
            </span>
            <span className="tree-item-count">
              {category.session_count || 0}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="tree-children">
            {category.children.map(child => renderCategory(child))}
            {category.sessions.map(session => renderSession(session, category.depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSession = (session, depth = 0) => {
    const isSelected = selectedItem?.type === 'session' && selectedItem?.data?.id === session.id;

    return (
      <div 
        key={session.id}
        className={`tree-item session-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 20 + 24}px` }}
        draggable
        onDragStart={(e) => handleDragStart(e, session, 'session')}
        onClick={() => setSelectedItem({ type: 'session', data: session })}
      >
        <div className="tree-item-left">
          <span className="drag-handle">
            <GripVertical size={14} />
          </span>
          <span className="session-icon">
            <FileText size={16} />
          </span>
          <span className="tree-item-name">{session.title || 'Untitled'}</span>
        </div>
        
        <div className="tree-item-right">
          <span className="tree-item-stats">
            {formatDuration(session.duration)}
          </span>
          <span className="tree-item-date">
            {formatDate(session.date)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="my-everything-page">
      {/* Toolbar */}
      <div className="me-toolbar">
        <div className="me-toolbar-left">
          <h1>
            <FolderTree size={24} />
            My Everything
          </h1>
        </div>
        
        <div className="me-toolbar-center">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search categories & sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="me-toolbar-right">
          <div className="toolbar-group">
            <button 
              className="btn btn-ghost btn-sm"
              onClick={expandAll}
              title="Expand all"
            >
              <ChevronDown size={18} />
            </button>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={collapseAll}
              title="Collapse all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <div className="toolbar-group undo-redo-group">
            <button 
              className={`btn btn-ghost btn-sm ${!canUndo ? 'disabled' : ''}`}
              onClick={async () => {
                if (canUndo) {
                  const action = await undo();
                  if (action) showToast(`Undo: ${action.description}`, 'info');
                }
              }}
              disabled={!canUndo}
              title={canUndo ? `Undo: ${undoDescription} (Ctrl+Z)` : 'Nothing to undo'}
            >
              <Undo2 size={18} />
            </button>
            <button 
              className={`btn btn-ghost btn-sm ${!canRedo ? 'disabled' : ''}`}
              onClick={async () => {
                if (canRedo) {
                  const action = await redo();
                  if (action) showToast(`Redo: ${action.description}`, 'success');
                }
              }}
              disabled={!canRedo}
              title={canRedo ? `Redo: ${redoDescription} (Ctrl+Shift+Z)` : 'Nothing to redo'}
            >
              <Redo2 size={18} />
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <div className="toolbar-group">
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Sort by Name</option>
              <option value="time">Sort by Time</option>
              <option value="sessions">Sort by Sessions</option>
            </select>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <button 
            className={`btn btn-ghost btn-sm ${showSessions ? 'active' : ''}`}
            onClick={() => setShowSessions(!showSessions)}
            title={showSessions ? 'Hide sessions' : 'Show sessions'}
          >
            {showSessions ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={18} />
          </button>
          
          <div className="toolbar-divider" />
          
          <button className="btn btn-primary btn-sm" onClick={() => openCreate()}>
            <Plus size={18} />
            New Category
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="me-content">
        {/* Tree view */}
        <div className="me-tree-panel">
          <div 
            className={`tree-root ${dragOverTarget?.id === 'root' ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, { id: 'root', type: 'root' })}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            {categoryTree.length === 0 && uncategorizedSessions.length === 0 ? (
              <div className="empty-tree">
                <Folder size={48} />
                <p>No categories yet</p>
                <span>Create categories to organize your time</span>
                <button className="btn btn-primary" onClick={() => openCreate()}>
                  <Plus size={18} />
                  Create Category
                </button>
              </div>
            ) : (
              <>
                {categoryTree.map(category => renderCategory(category))}
                
                {uncategorizedSessions.length > 0 && (
                  <div className="uncategorized-section">
                    <div 
                      className="tree-item uncategorized-header"
                      onClick={() => toggleExpand('uncategorized')}
                    >
                      <div className="tree-item-left">
                        <button className="expand-btn">
                          {expandedCategories.has('uncategorized') ? 
                            <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <span className="folder-icon uncategorized">
                          <Folder size={18} />
                        </span>
                        <span className="tree-item-name">Uncategorized</span>
                      </div>
                      <div className="tree-item-right">
                        <span className="tree-item-count">
                          {uncategorizedSessions.length}
                        </span>
                      </div>
                    </div>
                    
                    {expandedCategories.has('uncategorized') && (
                      <div className="tree-children">
                        {uncategorizedSessions.map(session => renderSession(session, 0))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Details panel */}
        <div className="me-details-panel">
          {selectedItem ? (
            selectedItem.type === 'category' ? (
              <CategoryDetails 
                category={selectedItem.data}
                sessions={sessions.filter(s => s.category_id === selectedItem.data.id)}
                onEdit={() => openEdit(selectedItem.data)}
                onDelete={() => handleDelete('category', selectedItem.data.id)}
                onAddSubcategory={() => openCreate(selectedItem.data.id)}
                formatDuration={formatDuration}
              />
            ) : (
              <SessionDetails 
                session={selectedItem.data}
                category={categories.find(c => c.id === selectedItem.data.category_id)}
                onUpdate={(updates) => updateSession(selectedItem.data.id, updates)}
                onDelete={() => handleDelete('session', selectedItem.data.id)}
                formatDuration={formatDuration}
              />
            )
          ) : (
            <div className="no-selection">
              <FolderTree size={48} />
              <p>Select an item to view details</p>
              <span>Click on a category or session in the tree</span>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Category Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Category name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setFormData({...formData, color})}
                    >
                      {formData.color === color && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Parent Category</label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({...formData, parentId: e.target.value || null})}
                >
                  <option value="">None (top-level)</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {'—'.repeat(categories.filter(p => p.id === cat.parent_id).length)} {cat.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2><Settings size={20} /> Settings</h2>
            
            <div className="settings-section">
              <h3>Confirmations</h3>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={confirmOnMove}
                  onChange={(e) => setConfirmOnMove(e.target.checked)}
                />
                <span>Confirm when moving items</span>
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={confirmOnDelete}
                  onChange={(e) => setConfirmOnDelete(e.target.checked)}
                />
                <span>Confirm when deleting items</span>
              </label>
            </div>

            <div className="settings-section">
              <h3>Hidden Categories</h3>
              {hiddenCategories.size === 0 ? (
                <p className="settings-note">No hidden categories</p>
              ) : (
                <div className="hidden-list">
                  {Array.from(hiddenCategories).map(id => {
                    const cat = categories.find(c => c.id === id);
                    if (!cat) return null;
                    return (
                      <div key={id} className="hidden-item">
                        <span className="category-dot" style={{ background: cat.color }} />
                        <span>{cat.name}</span>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleHidden(id)}
                        >
                          Show
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// Category Details Component
function CategoryDetails({ category, sessions, onEdit, onDelete, onAddSubcategory, formatDuration }) {
  const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const avgSessionTime = sessions.length > 0 ? totalTime / sessions.length : 0;
  
  return (
    <div className="details-content">
      <div className="details-header">
        <div className="details-title">
          <span className="category-color-large" style={{ background: category.color }} />
          <h2>{category.name}</h2>
        </div>
        <div className="details-actions">
          <button className="btn btn-ghost btn-sm" onClick={onAddSubcategory}>
            <Plus size={16} /> Subcategory
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Edit2 size={16} /> Edit
          </button>
          <button className="btn btn-ghost btn-sm danger" onClick={onDelete}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
      
      <div className="details-stats">
        <div className="stat-card">
          <Clock size={20} />
          <div>
            <span className="stat-value">{formatDuration(totalTime)}</span>
            <span className="stat-label">Total Time</span>
          </div>
        </div>
        <div className="stat-card">
          <Hash size={20} />
          <div>
            <span className="stat-value">{sessions.length}</span>
            <span className="stat-label">Sessions</span>
          </div>
        </div>
        <div className="stat-card">
          <Clock size={20} />
          <div>
            <span className="stat-value">{formatDuration(avgSessionTime)}</span>
            <span className="stat-label">Avg Session</span>
          </div>
        </div>
      </div>
      
      {sessions.length > 0 && (
        <div className="details-section">
          <h3>Recent Sessions</h3>
          <div className="recent-sessions">
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} className="recent-session-item">
                <div className="session-info">
                  <span className="session-title">{session.title || 'Untitled'}</span>
                  <span className="session-date">
                    {new Date(session.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <span className="session-duration">{formatDuration(session.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Session Details Component
function SessionDetails({ session, category, onUpdate, onDelete, formatDuration }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: session.title || '',
    notes: session.notes || '',
    date: session.date
  });

  useEffect(() => {
    setEditData({
      title: session.title || '',
      notes: session.notes || '',
      date: session.date
    });
    setIsEditing(false);
  }, [session]);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: session.title || '',
      notes: session.notes || '',
      date: session.date
    });
    setIsEditing(false);
  };

  const handleAutoSave = (notes) => {
    onUpdate({ notes });
  };

  return (
    <div className="details-content">
      <div className="details-header">
        <div className="details-title">
          <FileText size={24} />
          {isEditing ? (
            <input
              type="text"
              className="title-input"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              placeholder="Session title"
            />
          ) : (
            <h2>{session.title || 'Untitled Session'}</h2>
          )}
        </div>
        <div className="details-actions">
          {isEditing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
                <X size={16} /> Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                <Check size={16} /> Save
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Edit
              </button>
              <button className="btn btn-ghost btn-sm danger" onClick={onDelete}>
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="details-meta">
        {category && (
          <div className="meta-item">
            <span className="category-dot" style={{ background: category.color }} />
            <span>{category.name}</span>
          </div>
        )}
        <div className="meta-item">
          <Calendar size={16} />
          {isEditing ? (
            <input
              type="date"
              value={editData.date}
              onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            />
          ) : (
            <span>{new Date(session.date).toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}</span>
          )}
        </div>
        <div className="meta-item">
          <Clock size={16} />
          <span>{formatDuration(session.duration)}</span>
        </div>
      </div>
      
      <div className="details-section">
        <h3>Notes</h3>
        {isEditing ? (
          <RichTextEditor
            value={editData.notes}
            onChange={(notes) => setEditData({ ...editData, notes })}
            placeholder="Add notes about this session..."
            minHeight={150}
            maxHeight={300}
            autoSave
            onAutoSave={handleAutoSave}
          />
        ) : (
          <div className="notes-content">
            {session.notes ? (
              <div dangerouslySetInnerHTML={{ __html: session.notes }} />
            ) : (
              <p className="no-notes">No notes for this session</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
