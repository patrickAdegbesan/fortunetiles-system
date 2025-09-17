import React from 'react';
import '../styles/PageHeader.css';

const PageHeader = ({ icon, title, subtitle, actions, stats }) => {
  return (
    <div className="page-header">
      <div className="header-content">
        <div className="header-main">
          <div className="title-section">
            <h1>
              {icon && <span className="header-icon">{icon}</span>}
              {title}
            </h1>
            {subtitle && <p className="subtitle">{subtitle}</p>}
          </div>
          {stats && (
            <div className="header-stats">
              {stats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="header-actions">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;