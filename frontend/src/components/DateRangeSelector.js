import React from 'react';
import '../styles/DateRangeSelector.css';

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const handleStartDateChange = (e) => {
    onChange({
      startDate: e.target.value,
      endDate: endDate
    });
  };

  const handleEndDateChange = (e) => {
    onChange({
      startDate: startDate,
      endDate: e.target.value
    });
  };

  const handleQuickSelect = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    onChange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  return (
    <div className="date-range-selector">
      <div className="date-inputs">
        <div className="date-input-group">
          <label>From:</label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="date-input"
          />
        </div>
        <div className="date-input-group">
          <label>To:</label>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="date-input"
          />
        </div>
      </div>
      
      <div className="quick-select">
        <button 
          type="button"
          onClick={() => handleQuickSelect(7)}
          className="quick-btn"
        >
          Last 7 Days
        </button>
        <button 
          type="button"
          onClick={() => handleQuickSelect(30)}
          className="quick-btn"
        >
          Last 30 Days
        </button>
        <button 
          type="button"
          onClick={() => handleQuickSelect(90)}
          className="quick-btn"
        >
          Last 3 Months
        </button>
        <button 
          type="button"
          onClick={() => handleQuickSelect(365)}
          className="quick-btn"
        >
          Last Year
        </button>
      </div>
    </div>
  );
};

export default DateRangeSelector;
