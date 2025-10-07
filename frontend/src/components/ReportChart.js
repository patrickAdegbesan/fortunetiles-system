import React from 'react';
import '../styles/ReportChart.css';

const ReportChart = ({ type, data, xKey, yKey, valueKey, labelKey, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="no-data">No data available for this chart</div>
      </div>
    );
  }

  const formatValue = (value) => {
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
    return value;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  // Simple bar chart implementation
  if (type === 'bar') {
    // Filter out invalid data points and ensure numeric values
    const validData = data.filter(item => {
      const value = item[yKey];
      return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
    });

    if (validData.length === 0) {
      return (
        <div className="chart-container">
          <h3>{title}</h3>
          <div className="no-data">No valid data available for this chart</div>
        </div>
      );
    }

    const values = validData.map(item => parseFloat(item[yKey]));
    const maxValue = Math.max(...values);

    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="bar-chart">
          {validData.map((item, index) => {
            const value = parseFloat(item[yKey]);
            return (
              <div key={index} className="bar-item">
                <div className="bar-label">{item[xKey]}</div>
                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{
                      height: maxValue > 0 ? `${(value / maxValue) * 200}px` : '0px',
                      backgroundColor: `hsl(${(index * 360) / validData.length}, 70%, 60%)`
                    }}
                    title={`${item[xKey]}: ${formatValue(value)}`}
                  />
                </div>
                <div className="bar-value">{formatValue(value)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Simple line chart implementation
  if (type === 'line') {
    // Filter out invalid data points and ensure numeric values
    const validData = data.filter(item => {
      const value = item[yKey];
      return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
    });

    if (validData.length === 0) {
      return (
        <div className="chart-container">
          <h3>{title}</h3>
          <div className="no-data">No valid data available for this chart</div>
        </div>
      );
    }

    const values = validData.map(item => parseFloat(item[yKey]));
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="line-chart">
          <div className="chart-area">
            <svg width="100%" height="300" viewBox="0 0 800 300">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="50"
                  y1={50 + (i * 50)}
                  x2="750"
                  y2={50 + (i * 50)}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
              ))}

              {/* Data line */}
              <polyline
                fill="none"
                stroke="#667eea"
                strokeWidth="3"
                points={validData.map((item, index) => {
                  // Handle single data point case
                  const x = validData.length === 1
                    ? 400 // Center position for single point
                    : 50 + (index * (700 / (validData.length - 1)));
                  const value = parseFloat(item[yKey]);
                  const y = 250 - ((value - minValue) / range) * 200;
                  return `${x},${y}`;
                }).join(' ')}
              />

              {/* Data points */}
              {validData.map((item, index) => {
                // Handle single data point case
                const x = validData.length === 1
                  ? 400 // Center position for single point
                  : 50 + (index * (700 / (validData.length - 1)));
                const value = parseFloat(item[yKey]);
                const y = 250 - ((value - minValue) / range) * 200;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#667eea"
                    title={`${item[xKey]}: ${formatCurrency(value)}`}
                  />
                );
              })}

              {/* Y-axis labels */}
              {[0, 1, 2, 3, 4].map(i => {
                const value = minValue + (range * i / 4);
                return (
                  <text
                    key={i}
                    x="45"
                    y={255 - (i * 50)}
                    textAnchor="end"
                    fontSize="12"
                    fill="#666"
                  >
                    {formatCurrency(value)}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="chart-labels">
            {validData.map((item, index) => (
              <div key={index} className="chart-label">
                {new Date(item[xKey]).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Simple pie chart implementation
  if (type === 'pie') {
    // Filter out invalid data points and ensure numeric values
    const validData = data.filter(item => {
      const value = item[valueKey];
      return value !== null && value !== undefined && !isNaN(value) && isFinite(value) && value > 0;
    });

    if (validData.length === 0) {
      return (
        <div className="chart-container">
          <h3>{title}</h3>
          <div className="no-data">No valid data available for this chart</div>
        </div>
      );
    }

    const total = validData.reduce((sum, item) => sum + parseFloat(item[valueKey]), 0);
    let currentAngle = 0;

    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="pie-chart">
          <svg width="300" height="300" viewBox="0 0 300 300">
            {validData.map((item, index) => {
              const value = parseFloat(item[valueKey]);
              const percentage = (value / total) * 100;
              const angle = (value / total) * 360;

              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;

              const startAngleRad = (startAngle * Math.PI) / 180;
              const endAngleRad = (endAngle * Math.PI) / 180;

              const largeArcFlag = angle > 180 ? 1 : 0;

              const x1 = 150 + 100 * Math.cos(startAngleRad);
              const y1 = 150 + 100 * Math.sin(startAngleRad);
              const x2 = 150 + 100 * Math.cos(endAngleRad);
              const y2 = 150 + 100 * Math.sin(endAngleRad);

              const pathData = [
                `M 150 150`,
                `L ${x1} ${y1}`,
                `A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={`hsl(${(index * 360) / validData.length}, 70%, 60%)`}
                  stroke="white"
                  strokeWidth="2"
                  title={`${item[labelKey]}: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`}
                />
              );
            })}
          </svg>

          <div className="pie-legend">
            {validData.map((item, index) => {
              const value = parseFloat(item[valueKey]);
              return (
                <div key={index} className="legend-item">
                  <div
                    className="legend-color"
                    style={{ backgroundColor: `hsl(${(index * 360) / validData.length}, 70%, 60%)` }}
                  />
                  <span className="legend-label">{item[labelKey]}</span>
                  <span className="legend-value">{formatCurrency(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <div className="chart-error">Unsupported chart type: {type}</div>
    </div>
  );
};

export default ReportChart;
