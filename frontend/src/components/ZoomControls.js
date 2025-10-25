import React, { useState } from 'react';
import { useZoom } from '../contexts/ZoomContext';
import { MdZoomIn, MdZoomOut, MdFitScreen } from 'react-icons/md';
import '../styles/ZoomControls.css';

const ZoomControls = () => {
  const { zoomLevel, increaseZoom, decreaseZoom, resetZoom, setCustomZoom } = useZoom();
  const [showDropdown, setShowDropdown] = useState(false);

  const zoomPercentage = Math.round(zoomLevel * 100);
  
  const presets = [
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '85%', value: 0.85 },
    { label: '100%', value: 1.0 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 }
  ];

  return (
    <div className="zoom-controls">
      <div className="zoom-control-group">
        <button
          className="zoom-button zoom-decrease"
          onClick={decreaseZoom}
          title="Zoom Out (Ctrl + -)"
          disabled={zoomLevel <= 0.5}
        >
          <MdZoomOut />
        </button>

        <div className="zoom-display">
          <button
            className="zoom-percentage-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Click to see zoom presets"
          >
            {zoomPercentage}%
          </button>
          
          {showDropdown && (
            <div className="zoom-dropdown">
              {presets.map(preset => (
                <button
                  key={preset.value}
                  className={`zoom-preset ${zoomLevel === preset.value ? 'active' : ''}`}
                  onClick={() => {
                    setCustomZoom(preset.value);
                    setShowDropdown(false);
                  }}
                >
                  {preset.label}
                </button>
              ))}
              <div className="zoom-dropdown-divider"></div>
              <button
                className="zoom-preset zoom-reset"
                onClick={() => {
                  resetZoom();
                  setShowDropdown(false);
                }}
              >
                Reset (85%)
              </button>
            </div>
          )}
        </div>

        <button
          className="zoom-button zoom-increase"
          onClick={increaseZoom}
          title="Zoom In (Ctrl + +)"
          disabled={zoomLevel >= 1.5}
        >
          <MdZoomIn />
        </button>

        <button
          className="zoom-button zoom-reset-btn"
          onClick={() => {
            resetZoom();
            setShowDropdown(false);
          }}
          title="Reset to Default (85%)"
        >
          <MdFitScreen />
        </button>
      </div>
    </div>
  );
};

export default ZoomControls;
