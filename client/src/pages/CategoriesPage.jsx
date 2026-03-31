import { useState } from 'react';
import { useData } from '../context/DataContext';
import { 
  FolderTree, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  Folder,
  Clock,
  Hash,
  Check
} from 'lucide-react';
import './CategoriesPage.css';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1'
];

export default function CategoriesPage() {
  const { categories, createCategory, updateCategory, deleteCategory } = useData();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
    icon: 'folder',
    parentId: null
  });

  // Build category tree
  const categoryTree = categories.filter(c => !c.parent_id).map(parent => ({
    ...parent,
    children: categories.filter(c => c.parent_id === parent.id)
  }));

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const openCreate = (parentId = null) => {
    setFormData({
      name: '',
      color: '#6366f1',
      icon: 'folder',
      parentId
    });
    setEditingCategory(null);
    setShowCreateModal(true);
  };

  const openEdit = (category) => {
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon || 'folder',
      parentId: category.parent_id
    });
    setEditingCategory(category);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingCategory) {
      await updateCategory(editingCategory.id, formData);
    } else {
      await createCategory(formData);
    }
    
    setShowCreateModal(false);
    setEditingCategory(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Sessions will become uncategorized.')) return;
    await deleteCategory(id);
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const renderCategory = (category, depth = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="category-item-wrapper">
        <div 
          className="category-item"
          style={{ paddingLeft: `${20 + depth * 24}px` }}
        >
          {hasChildren ? (
            <button 
              className="expand-btn"
              onClick={() => toggleExpand(category.id)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="expand-placeholder" />
          )}
          
          <span 
            className="category-color"
            style={{ background: category.color }}
          />
          
          <div className="category-info">
            <span className="category-name">{category.name}</span>
            <div className="category-stats">
              <span><Clock size={12} /> {formatDuration(category.total_time || 0)}</span>
              <span><Hash size={12} /> {category.session_count || 0} sessions</span>
            </div>
          </div>

          <div className="category-actions">
            <button 
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => openCreate(category.id)}
              title="Add subcategory"
            >
              <Plus size={16} />
            </button>
            <button 
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => openEdit(category)}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button 
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => handleDelete(category.id)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="category-children">
            {category.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="categories-page">
      <div className="categories-header">
        <h1>
          <FolderTree size={28} />
          Categories
        </h1>
        <button className="btn btn-primary" onClick={() => openCreate()}>
          <Plus size={18} />
          New Category
        </button>
      </div>

      <div className="categories-list">
        {categoryTree.length === 0 ? (
          <div className="empty-state">
            <Folder size={48} />
            <p>No categories yet</p>
            <span>Create categories to organize your time tracking</span>
            <button className="btn btn-primary" onClick={() => openCreate()}>
              <Plus size={18} />
              Create Category
            </button>
          </div>
        ) : (
          categoryTree.map(category => renderCategory(category))
        )}
      </div>

      {/* Create/Edit Modal */}
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
                <label>Parent Category (optional)</label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({...formData, parentId: e.target.value || null})}
                >
                  <option value="">None (top-level)</option>
                  {categories
                    .filter(c => !c.parent_id && c.id !== editingCategory?.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
