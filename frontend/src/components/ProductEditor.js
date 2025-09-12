import React, { useState, useEffect } from 'react';
import { fetchProductTypes, fetchLocations, fetchCategories } from '../services/api';
import '../styles/ProductEditor.css';

const ProductEditor = ({ product, onSave, onCancel }) => {
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    productTypeId: '',
    price: '',
    customAttributes: {},
    supplierCode: '',
    category: 'General',
    imageUrl: '',
    description: '',
    isActive: true,
    // Initial inventory fields
    initialLocation: '',
    initialQuantity: ''
  });
  const [productTypes, setProductTypes] = useState([]);
  const [categories, setCategories] = useState(['General']);
  const [selectedType, setSelectedType] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ensure attributes is a parsed object
  const normalizeType = (type) => {
    if (!type) return null;
    const normalized = { ...type };
    if (typeof normalized.attributes === 'string') {
      try {
        normalized.attributes = JSON.parse(normalized.attributes);
      } catch (_) {
        // Fallback to empty structure if parse fails
        normalized.attributes = { requiredFields: [], optionalFields: [] };
      }
    }
    // Ensure shape
    normalized.attributes = normalized.attributes || {};
    normalized.attributes.requiredFields = normalized.attributes.requiredFields || [];
    normalized.attributes.optionalFields = normalized.attributes.optionalFields || [];
    return normalized;
  };

  useEffect(() => {
    // Fetch product types, locations, and categories
    const loadData = async () => {
      try {
        const [typesData, locationsData, categoriesData] = await Promise.all([
          fetchProductTypes(),
          fetchLocations(),
          fetchCategories()
        ]);
        
        const types = (typesData.types || []).map(normalizeType);
        setProductTypes(types);
        setLocations(locationsData.locations || []);
        // Build unique category list with 'General' ensured once
        const rawCategories = (categoriesData.categories || []).map(cat => (typeof cat === 'string' ? cat : cat?.name)).filter(Boolean);
        const uniqueCategories = Array.from(new Set(['General', ...rawCategories]));
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load required data');
      }
    };
    
    loadData();
  }, []);


  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        productTypeId: product.productTypeId || '',
        customAttributes: product.customAttributes || {},
        category: product.category || 'General',
        price: product.price || '',
        supplierCode: product.supplierCode || '',
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        isActive: product.isActive !== undefined ? product.isActive : true
      });

      const type = productTypes.find(t => t.id === product.productTypeId);
      setSelectedType(type || null);
    }
  }, [product, productTypes]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('attribute_')) {
      const attributeName = name.replace('attribute_', '');
      console.log('Attribute change:', attributeName, value); // Debug log
      setFormData(prev => ({
        ...prev,
        customAttributes: {
          ...(prev.customAttributes || {}),
          [attributeName]: value
        }
      }));
    } else if (name === 'productTypeId') {
      const found = productTypes.find(t => t.id === parseInt(value));
      const type = normalizeType(found);
      setSelectedType(type || null);
      setFormData(prev => ({
        ...prev,
        productTypeId: value,
        customAttributes: {} // Reset attributes when type changes
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.productTypeId) {
      newErrors.productTypeId = 'Product type is required';
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

    // Validate required attributes for the selected product type
    if (selectedType && selectedType.attributes.requiredFields) {
      selectedType.attributes.requiredFields.forEach(field => {
        if (!formData.customAttributes[field]) {
          newErrors[`attribute_${field}`] = `${field} is required`;
        }
      });
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

  return (
    <div className="product-editor-overlay">
      <div className="product-editor">
        <div className="editor-header">
          <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          {error && <div className="form-error-message">{error}</div>}
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section basic-info">
              <h3>Basic Information</h3>
              
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
                  <label>Product Type *</label>
                  <select
                    name="productTypeId"
                    value={formData.productTypeId}
                    onChange={handleInputChange}
                    className={errors.productTypeId ? 'error' : ''}
                  >
                    <option value="">Select Product Type</option>
                    {productTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                  {errors.productTypeId && <span className="error-text">{errors.productTypeId}</span>}
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {categories.map((category, index) => (
                      <option key={`${category}-${index}`} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Product Type Attributes - Separate Card */}
            {selectedType && selectedType.attributes && 
             (selectedType.attributes.requiredFields?.length || selectedType.attributes.optionalFields?.length) ? (
              <div className="form-section full-width product-attributes-card">
                <h3>{selectedType.name} Attributes</h3>
                <div className="product-attributes-grid">
                  {selectedType.attributes.requiredFields?.map(field => (
                    <div className="form-group" key={`req_${field}`}>
                      <label>{field} *</label>
                      <input
                        type="text"
                        name={`attribute_${field}`}
                        value={formData.customAttributes?.[field] || ''}
                        onChange={handleInputChange}
                        className={errors[`attribute_${field}`] ? 'error' : ''}
                        placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                      />
                      {errors[`attribute_${field}`] && (
                        <span className="error-text">{errors[`attribute_${field}`]}</span>
                      )}
                    </div>
                  ))}
                  {selectedType.attributes.optionalFields?.map(field => (
                    <div className="form-group" key={`opt_${field}`}>
                      <label>{field}</label>
                      <input
                        type="text"
                        name={`attribute_${field}`}
                        value={formData.customAttributes?.[field] || ''}
                        onChange={handleInputChange}
                        placeholder={`Enter ${field.replace(/_/g, ' ')} (optional)`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Pricing & Supplier */}
            <div className="form-section">
              <h3>Pricing & Supplier</h3>
              
              <div className="form-group">
                <label>Price ({selectedType ? `per ${selectedType.unitOfMeasure}` : ''}) (₦) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className={errors.price ? 'error' : ''}
                  placeholder={`Enter price in Naira (e.g., 2500 per ${selectedType ? selectedType.unitOfMeasure : 'unit'})`}
                  min="0"
                  step="0.01"
                />
                {errors.price && <span className="error-text">{errors.price}</span>}
              </div>

              <div className="form-group">
                <label>Supplier Code</label>
                <input
                  type="text"
                  name="supplierCode"
                  value={formData.supplierCode}
                  onChange={handleInputChange}
                  placeholder="Enter supplier product code (e.g., MWC-001, SUP-2024-001)"
                />
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
                    <label>Initial Quantity ({selectedType ? selectedType.unitOfMeasure : 'sqm'}) *</label>
                    <input
                      type="number"
                      name="initialQuantity"
                      value={formData.initialQuantity}
                      onChange={handleInputChange}
                      className={errors.initialQuantity ? 'error' : ''}
                      placeholder={`Enter initial stock quantity (e.g., 100 ${selectedType ? selectedType.unitOfMeasure : 'units'})`}
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
              <h3>Image & Description</h3>

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
                          📷 Take Photo
                        </button>
                        <label htmlFor="image-upload" className="file-label">
                          Choose Image
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
                          📸 Take Photo
                        </button>
                        <button type="button" onClick={stopCamera} className="cancel-camera-btn">
                          ❌ Close Camera
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
