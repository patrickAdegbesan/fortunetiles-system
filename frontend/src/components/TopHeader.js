import React from 'react';
import '../styles/TopHeader.css';

const TopHeader = ({ title, children }) => {
  return (
    <div className="top-header">
      <div className="header-content">
        <div className="header-left">
          <div className="title-container">
            <h1 className="page-title">{title}</h1>
            <div className="breadcrumb">Home / {title}</div>
          </div>
        </div>
        <div className="header-actions">
          {children}
        </div>
      </div>
    </div>
  );
};

export default TopHeader;
