import React, { useState, useEffect } from 'react';
import { fetchLocations, fetchProductTypes, fetchCategories, fetchGlobalAttributes } from '../services/api';
import { FaPen, FaDollarSign, FaImage, FaCog, FaInfoCircle, FaCreditCard, FaCamera, FaUpload, FaCheck, FaTimes, FaPlus, FaTrash, FaTag } from 'react-icons/fa';
import '../styles/ProductEditor.css';

const mergeValuesCaseInsensitive = (current = [], values = []) => {
  const merged = [...current];
  const lower = new Set(current.map((value) => value.toLowerCase()));

  values.forEach((value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return;
    }

    if (!lower.has(trimmed.toLowerCase())) {
      merged.push(trimmed);
      lower.add(trimmed.toLowerCase());
    }
  });

  return merged;
};

const normalizeCategoriesList = (current = [], extra = []) => {
  const base = current.length ? current : ['General'];
  const merged = mergeValuesCaseInsensitive(base, extra);

  if (!merged.some((value) => value.toLowerCase() === 'general')) {
    merged.push('General');
  }

  const cleaned = merged
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const generalIndex = cleaned.findIndex((value) => value.toLowerCase() === 'general');
  if (generalIndex > 0) {
    const [general] = cleaned.splice(generalIndex, 1);
    cleaned.unshift(general);
  }

  return cleaned;
};

const normalizeAttributesList = (current = [], extra = []) => {
  const merged = mergeValuesCaseInsensitive(current, extra);

  return merged
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

const findMatchingKey = (collection = {}, candidate = '') => {
  const lowerCandidate = candidate.toLowerCase();
  return Object.keys(collection).find((key) => key.toLowerCase() === lowerCandidate) || null;
};

const ProductEditor = ({ product, onSave, onCancel }) => {
  const [locations, setLocations] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(['General']);
  const [attributeSuggestions, setAttributeSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    productTypeId: '',
    price: '',
    attributes: {},
    supplierCode: '',
    categories: ['General'],
    unitOfMeasure: 'pcs',
    imageUrl: '',
    description: '',
    isActive: true,
    // Initial inventory fields
    initialLocation: '',
    initialQuantity: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [attributeDraft, setAttributeDraft] = useState({ key: '', value: '' });
  const [renamingAttribute, setRenamingAttribute] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          locationsData,
          productTypesData,
          categoriesData,
          globalAttributesData
        ] = await Promise.all([
          fetchLocations(),
          fetchProductTypes().catch(() => ({ productTypes: [] })),
          fetchCategories().catch(() => ({ categories: [] })),
          fetchGlobalAttributes().catch(() => ({ attributes: [] }))
        ]);

        setLocations(locationsData.locations || []);
        setProductTypes(productTypesData.productTypes || []);

        const normalizedCategories = Array.isArray(categoriesData.categories)
          ? categoriesData.categories.map((category) =>
              typeof category === 'string'
                ? category.trim()
                : typeof category?.name === 'string'
                  ? category.name.trim()
                  : ''
            ).filter(Boolean)
          : [];

        setCategoryOptions((prev) => normalizeCategoriesList(prev, normalizedCategories));

        const normalizedAttributes = Array.isArray(globalAttributesData.attributes)
          ? globalAttributesData.attributes.map((attribute) =>
              typeof attribute === 'string'
                ? attribute.trim()
                : typeof attribute?.name === 'string'
                  ? attribute.name.trim()
                  : ''
            ).filter(Boolean)
          : [];

        setAttributeSuggestions((prev) => normalizeAttributesList(prev, normalizedAttributes));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        productTypeId: product.productTypeId || '',
        price: product.price || '',
        attributes: product.attributes || {},
        supplierCode: product.supplierCode || '',
        categories: Array.isArray(product.categories) ? product.categories : ['General'],
        unitOfMeasure: product.unitOfMeasure || 'pcs',
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        isActive: product.isActive !== undefined ? product.isActive : true
      });

      const productCategories = Array.isArray(product.categories) ? product.categories : [];
      if (productCategories.length) {
        setCategoryOptions((prev) => normalizeCategoriesList(prev, productCategories));
      }

      const attributeKeys = Object.keys(product.attributes || {});
      if (attributeKeys.length) {
        setAttributeSuggestions((prev) => normalizeAttributesList(prev, attributeKeys));
      }
    }
  }, [product]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('attribute_')) {
      const attributeName = name.replace('attribute_', '');
      setFormData(prev => ({
        ...prev,
        attributes: {
          ...(prev.attributes || {}),
          [attributeName]: value
        }
      }));
    } else if (name === 'imageUrl') {
      const processedUrl = extractDirectImageUrl(value);
      setFormData(prev => ({
        ...prev,
        imageUrl: processedUrl
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAttributeValueChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [key]: value
      }
    }));
  };

  const handleAttributeRename = (oldKey, newKey) => {
    const trimmed = (newKey || '').trim();
    if (!trimmed || trimmed === oldKey) {
      return;
    }

    setFormData(prev => {
      const attributes = { ...(prev.attributes || {}) };
      if (!Object.prototype.hasOwnProperty.call(attributes, oldKey)) {
        return prev;
      }

      const existingValue = attributes[oldKey];
      delete attributes[oldKey];

      const duplicateKey = findMatchingKey(attributes, trimmed);
      if (duplicateKey) {
        delete attributes[duplicateKey];
      }

      attributes[trimmed] = existingValue;

      return {
        ...prev,
        attributes
      };
    });

    setAttributeSuggestions(prev => normalizeAttributesList(prev, [trimmed]));
  };

  const startAttributeRename = (key) => {
    setRenamingAttribute(key);
    setRenameValue(key);
  };

  const cancelAttributeRename = () => {
    setRenamingAttribute(null);
    setRenameValue('');
  };

  const confirmAttributeRename = () => {
    if (!renamingAttribute) return;
    handleAttributeRename(renamingAttribute, renameValue);
    cancelAttributeRename();
  };

  const removeAttribute = (key) => {
    setFormData(prev => {
      const attributes = { ...(prev.attributes || {}) };
      delete attributes[key];
      return {
        ...prev,
        attributes
      };
    });

    if (renamingAttribute === key) {
      cancelAttributeRename();
    }
  };

  const addCategoryByValue = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return;
    }

    setFormData(prev => {
      const categories = Array.isArray(prev.categories) ? [...prev.categories] : [];
      const exists = categories.some(category => category.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return prev;
      }

      const updated = [...categories, trimmed];

      return {
        ...prev,
        categories: updated
      };
    });

    setCategoryOptions(prev => normalizeCategoriesList(prev, [trimmed]));
    setCategoryInput('');
  };

  const handleCategoryInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' ) {
      event.preventDefault();
      addCategoryByValue(categoryInput);
    } else if (event.key === 'Tab' && categoryInput.trim()) {
      addCategoryByValue(categoryInput);
    }
  };

  const handleCategoryInputBlur = () => {
    addCategoryByValue(categoryInput);
  };

  const handleRemoveCategory = (category) => {
    setFormData(prev => {
      const filtered = (prev.categories || []).filter(current => current !== category);
      return {
        ...prev,
        categories: filtered.length ? filtered : ['General']
      };
    });
  };

  const handleCategorySuggestionClick = (suggestion) => {
    addCategoryByValue(suggestion);
  };

  const commitAttributeDraft = () => {
    const trimmedKey = (attributeDraft.key || '').trim();
    if (!trimmedKey) {
      return;
    }

    const normalizedKey = findMatchingKey(formData.attributes || {}, trimmedKey) || trimmedKey;

    setFormData(prev => {
      const attributes = { ...(prev.attributes || {}) };
      const existingKey = findMatchingKey(attributes, trimmedKey);

      if (existingKey) {
        attributes[existingKey] = attributeDraft.value;
      } else {
        attributes[trimmedKey] = attributeDraft.value;
      }

      return {
        ...prev,
        attributes
      };
    });

    setAttributeSuggestions(prev => normalizeAttributesList(prev, [normalizedKey]));
    setAttributeDraft({ key: '', value: '' });
  };

  const handleAttributeDraftKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitAttributeDraft();
    }
  };

  const handleAttributeSuggestionClick = (suggestion) => {
    const existingKey = findMatchingKey(formData.attributes, suggestion);
    setAttributeDraft(prev => ({
      ...prev,
      key: suggestion,
      value: existingKey ? formData.attributes[existingKey] : prev.value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    // Only validate initial inventory for new products
    if (!product) {
      if (!formData.initialLocation) {
        newErrors.initialLocation = 'Initial location is required';
      }

      if (!formData.initialQuantity || parseFloat(formData.initialQuantity) <= 0) {
        newErrors.initialQuantity = 'Initial quantity must be greater than 0';
      }
    }

    if (formData.imageUrl && !isValidImageUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please enter a valid direct image URL. For Google Images, right-click the image and select "Copy image address".';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidImageUrl = (string) => {
    try {
      const url = new URL(string);
      // Check if it's a direct image URL
      return url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
             url.pathname.endsWith('/image') ||
             url.hostname.includes('images') ||
             string.startsWith('data:image/');
    } catch (_) {
      return false;
    }
  };

  const extractDirectImageUrl = (url) => {
    try {
      // If it's already a valid image URL or base64, return as is
      if (url.startsWith('data:image/') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return url;
      }

      // Handle Google Images URLs by showing an error
      if (url.includes('google.com/imgres')) {
        alert('Please right-click on the image in Google Images and select "Copy image address" instead.');
        return '';
      }

      return url;
    } catch (err) {
      console.error('Error processing image URL:', err);
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (Array.isArray(productData.categories)) {
        const cleanedCategories = Array.from(
          new Set(
            productData.categories
              .map((category) => (category || '').trim())
              .filter(Boolean)
          )
        );
        productData.categories = cleanedCategories.length ? cleanedCategories : ['General'];
      } else {
        productData.categories = ['General'];
      }

      if (productData.attributes && typeof productData.attributes === 'object') {
        const sanitizedAttributes = {};
        Object.entries(productData.attributes).forEach(([key, value]) => {
          const trimmedKey = (key || '').trim();
          if (trimmedKey) {
            sanitizedAttributes[trimmedKey] = value;
          }
        });
        productData.attributes = sanitizedAttributes;
      }

      // If this is a new product and we have initial inventory data
      if (!product && formData.initialLocation && formData.initialQuantity) {
        productData.initialLocation = parseInt(formData.initialLocation);
        productData.initialQuantity = parseFloat(formData.initialQuantity);
      }

      await onSave(productData);
    } catch (error) {
      console.error('Save error:', error);
      setError(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('');
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const startCamera = async () => {
    try {
      setCameraStatus('Checking camera support...');
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      setCameraStatus('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStatus('Camera connected, preparing preview...');

      // 1) Render the camera UI first so the <video> element exists
      setIsCapturing(true);
      // Wait one animation frame to ensure the video element mounts
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));

      let videoEl = videoRef.current;
      if (!videoEl) {
        // In rare cases, allow an extra microtask
        await new Promise((resolve) => setTimeout(resolve, 30));
        videoEl = videoRef.current;
      }

      if (!videoEl) {
        setCameraStatus('Could not prepare camera preview. Please try again.');
        return;
      }

      // Ensure autoplay works across browsers
      videoEl.muted = true;
      try { videoEl.setAttribute('muted', ''); } catch (_) {}
      videoEl.playsInline = true;
      try { videoEl.setAttribute('playsinline', ''); } catch (_) {}

      // Attach stream and start playback
      videoEl.srcObject = stream;
      
      // Handle video events like the working test
      videoEl.onloadedmetadata = () => {
        const playPromise = videoEl.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => setCameraStatus('Camera is ready!'))
            .catch(() => setCameraStatus('Camera ready (click video if paused)'));
        } else {
          setCameraStatus('Camera is ready!');
        }
      };
    } catch (err) {
      console.error('Camera error:', err);
      setCameraStatus(`Camera error: ${err.message}`);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      try { videoRef.current.pause(); } catch (_) {}
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setCameraStatus('');
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      try {
        // Scale image to a reasonable max dimension to keep payload small
        const srcW = video.videoWidth || 1280;
        const srcH = video.videoHeight || 720;
        const MAX = 1024;
        const scale = Math.min(MAX / srcW, MAX / srcH, 1);
        canvas.width = Math.round(srcW * scale);
        canvas.height = Math.round(srcH * scale);

        // Draw video frame to canvas with smoothing
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 (slightly higher quality for clarity)
        const imageUrl = canvas.toDataURL('image/jpeg', 0.85);

        setFormData(prev => ({
          ...prev,
          imageUrl: imageUrl
        }));

        stopCamera();
        setCameraStatus('Photo captured successfully!');
      } catch (err) {
        console.error('Error capturing image:', err);
        alert('Failed to capture image. Please try again.');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const vid = videoRef.current;
      if (vid?.srcObject) {
        try { vid.pause(); } catch (_) {}
        const tracks = vid.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        vid.srcObject = null;
      }
      setIsCapturing(false);
      setCameraStatus('');
    };
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current || document.createElement('canvas');
          const MAX = 1024;
          const scale = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image processing error:', err);
      alert('Could not process image. Please try a smaller image.');
    }
  };

  const attributeEntries = Object.entries(formData.attributes || {});
  const selectedCategories = Array.isArray(formData.categories) ? formData.categories : [];

  const categorySuggestionList = categoryOptions
    .filter(option => !selectedCategories.some(category => category.toLowerCase() === option.toLowerCase()))
    .slice(0, 8);

  const attributeSuggestionList = attributeSuggestions
    .filter(option => !attributeEntries.some(([key]) => key.toLowerCase() === option.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="product-editor-overlay">
      <div className="product-editor">
        <div className="editor-header">
          <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          {error && <div className="form-error-message">{error}</div>}
          <div className="form-content">
            <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section basic-info">
              <h3><span className="section-icon"><FaPen /></span> Basic Information</h3>

              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Enter a descriptive product name (e.g., Premium White Marble Tiles)"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit of Measure</label>
                  <select
                    name="unitOfMeasure"
                    value={formData.unitOfMeasure}
                    onChange={handleInputChange}
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="sqm">Square Meters (sqm)</option>
                    <option value="m">Meters (m)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="l">Liters (l)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Supplier Code</label>
                  <input
                    type="text"
                    name="supplierCode"
                    value={formData.supplierCode}
                    onChange={handleInputChange}
                    placeholder="Enter supplier product code"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Product Type (Optional)</label>
                <select
                  name="productTypeId"
                  value={formData.productTypeId}
                  onChange={handleInputChange}
                >
                  <option value="">Select Product Type (Optional)</option>
                  {productTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.unitOfMeasure})
                    </option>
                  ))}
                </select>
                <small className="form-help">Product types help organize similar products for reporting</small>
              </div>

            </div>

            {/* Custom Attributes */}
            <div className="form-section full-width product-attributes-card">
              <h3><span className="section-icon"><FaCog /></span> Custom Attributes</h3>
              <div className="attributes-section">
                <div className="attributes-list">
                  {attributeEntries.length === 0 ? (
                    <p className="empty-state">No custom attributes yet. Add your first attribute below.</p>
                  ) : (
                    attributeEntries.map(([key, value]) => (
                      <div className="attribute-row" key={key}>
                        <div className="attribute-key-wrapper">
                          {renamingAttribute === key ? (
                            <div className="attribute-rename">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    confirmAttributeRename();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelAttributeRename();
                                  }
                                }}
                                list="global-attribute-suggestions"
                                className="attribute-rename-input"
                                placeholder="Attribute name"
                                autoFocus
                              />
                              <div className="attribute-rename-actions">
                                <button type="button" className="small-button" onClick={confirmAttributeRename}>Save</button>
                                <button type="button" className="small-button secondary" onClick={cancelAttributeRename}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="attribute-key-display">
                              <span className="attribute-key-label">{key}</span>
                              <button type="button" className="rename-attribute-btn" onClick={() => startAttributeRename(key)}>
                                <FaPen size={12} /> Rename
                              </button>
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Attribute value"
                          value={value}
                          onChange={(e) => handleAttributeValueChange(key, e.target.value)}
                          className="attribute-value"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttribute(key)}
                          className="remove-attribute-btn"
                          aria-label={`Remove ${key}`}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {attributeSuggestionList.length > 0 && (
                  <div className="suggestion-chip-row">
                    <span className="chip-label">Try:</span>
                    {attributeSuggestionList.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="chip-button"
                        onClick={() => handleAttributeSuggestionClick(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                <div className="attribute-draft-row">
                  <input
                    type="text"
                    placeholder="Attribute name (e.g., Material)"
                    value={attributeDraft.key}
                    onChange={(e) => setAttributeDraft(prev => ({ ...prev, key: e.target.value }))}
                    onKeyDown={handleAttributeDraftKeyDown}
                    list="global-attribute-suggestions"
                  />
                  <input
                    type="text"
                    placeholder="Attribute value (e.g., Porcelain)"
                    value={attributeDraft.value}
                    onChange={(e) => setAttributeDraft(prev => ({ ...prev, value: e.target.value }))}
                    onKeyDown={handleAttributeDraftKeyDown}
                  />
                  <button type="button" className="add-attribute-btn" onClick={commitAttributeDraft} disabled={!attributeDraft.key.trim()}>
                    <FaPlus /> Add Attribute
                  </button>
                </div>

                <datalist id="global-attribute-suggestions">
                  {attributeSuggestions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Categories */}
            <div className="form-section categories-section">
              <h3><span className="section-icon"><FaInfoCircle /></span> Categories</h3>
              <div className="categories-selected">
                {selectedCategories.length === 0 && (
                  <span className="empty-state">No categories yet. Add one below.</span>
                )}
                {selectedCategories.map((category) => (
                  <span key={category} className="category-chip">
                    {category}
                    <button type="button" className="chip-remove" onClick={() => handleRemoveCategory(category)} aria-label={`Remove ${category}`}>
                      <FaTimes size={10} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="category-input-row">
                <input
                  type="text"
                  placeholder="Type a category and press Enter"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={handleCategoryInputKeyDown}
                  onBlur={handleCategoryInputBlur}
                  list="category-suggestions"
                />
                <button type="button" className="add-category-btn" onClick={() => addCategoryByValue(categoryInput)} disabled={!categoryInput.trim()}>
                  <FaPlus /> Add
                </button>
              </div>

              <datalist id="category-suggestions">
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              {categorySuggestionList.length > 0 && (
                <div className="suggestion-chip-row">
                  <span className="chip-label">Popular:</span>
                  {categorySuggestionList.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="chip-button"
                      onClick={() => handleCategorySuggestionClick(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="form-section">
              <h3><span className="section-icon"><FaDollarSign /></span> Pricing</h3>

              <div className="form-group">
                <label>Price (per {formData.unitOfMeasure}) (₦) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className={errors.price ? 'error' : ''}
                  placeholder={`Enter price in Naira (e.g., 2500 per ${formData.unitOfMeasure})`}
                  min="0"
                  step="0.01"
                />
                {errors.price && <span className="error-text">{errors.price}</span>}
              </div>

              {!product && ( // Only show for new products
                <div className="initial-inventory">
                  <h4>Initial Inventory</h4>
                  <div className="form-group">
                    <label>Location *</label>
                    <select
                      name="initialLocation"
                      value={formData.initialLocation}
                      onChange={handleInputChange}
                      className={errors.initialLocation ? 'error' : ''}
                    >
                      <option value="">Select Location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    {errors.initialLocation && <span className="error-text">{errors.initialLocation}</span>}
                  </div>

                  <div className="form-group">
                    <label>Initial Quantity ({formData.unitOfMeasure}) *</label>
                    <input
                      type="number"
                      name="initialQuantity"
                      value={formData.initialQuantity}
                      onChange={handleInputChange}
                      className={errors.initialQuantity ? 'error' : ''}
                      placeholder={`Enter initial stock quantity (e.g., 100 ${formData.unitOfMeasure})`}
                      min="0"
                      step="0.01"
                    />
                    {errors.initialQuantity && <span className="error-text">{errors.initialQuantity}</span>}
                  </div>
                </div>
              )}
            </div>


            {/* Image & Description */}
            <div className="form-section full-width">
              <h3><span className="section-icon"><FaImage /></span> Image & Description</h3>

              <div className="form-group">
                <label>Product Image</label>
                <div className="image-upload-area">
                  <div className="upload-buttons">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="file-input"
                      id="image-upload"
                    />
                    {!isCapturing ? (
                      <>
                        <button type="button" onClick={startCamera} className="camera-btn">
                          <FaCamera /> Take Photo
                        </button>
                        <label htmlFor="image-upload" className="file-label">
                          <FaUpload /> Choose Image
                        </label>
                      </>
                    ) : null}
                  </div>
                  
                  {isCapturing && (
                    <div className="camera-container">
                      {cameraStatus && (
                        <div className="camera-status">
                          {cameraStatus}
                        </div>
                      )}
                      <div className="video-container">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline
                          muted
                          onClick={() => {
                            try { videoRef.current && videoRef.current.play(); } catch (_) {}
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            maxWidth: '640px',
                            backgroundColor: '#000',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                      <div className="camera-controls">
                        <button type="button" onClick={captureImage} className="capture-btn">
                          <FaCheck /> Take Photo
                        </button>
                        <button type="button" onClick={stopCamera} className="cancel-camera-btn">
                          <FaTimes /> Close Camera
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <span className="file-info">Or enter image URL below</span>
                </div>
                
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className={errors.imageUrl ? 'error' : ''}
                  placeholder="Paste image URL here (e.g., https://example.com/product-image.jpg)"
                />
                {errors.imageUrl && <span className="error-text">{errors.imageUrl}</span>}
                
                {formData.imageUrl && (
                  <div className="image-preview">
                    <img src={formData.imageUrl} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the product features, specifications, installation notes, or any additional details that would help customers..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active Product
                </label>
              </div>
            </div>
            </div>
          </div>

          <div className="editor-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="save-btn">
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
);
};

export default ProductEditor;
