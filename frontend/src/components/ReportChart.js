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
    const maxValue = Math.max(...data.map(item => item[yKey] || 0));
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="bar-chart">
          {data.map((item, index) => (
            <div key={index} className="bar-item">
              <div className="bar-label">{item[xKey]}</div>
              <div className="bar-wrapper">
                <div 
                  className="bar"
                  style={{ 
                    height: `${(item[yKey] / maxValue) * 200}px`,
                    backgroundColor: `hsl(${(index * 360) / data.length}, 70%, 60%)`
                  }}
                  title={`${item[xKey]}: ${formatValue(item[yKey])}`}
                />
              </div>
              <div className="bar-value">{formatValue(item[yKey])}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Simple line chart implementation
  if (type === 'line') {
    const maxValue = Math.max(...data.map(item => item[yKey] || 0));
    const minValue = Math.min(...data.map(item => item[yKey] || 0));
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
                points={data.map((item, index) => {
                  const x = 50 + (index * (700 / (data.length - 1)));
                  const y = 250 - ((item[yKey] - minValue) / range) * 200;
                  return `${x},${y}`;
                }).join(' ')}
              />
              
              {/* Data points */}
              {data.map((item, index) => {
                const x = 50 + (index * (700 / (data.length - 1)));
                const y = 250 - ((item[yKey] - minValue) / range) * 200;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#667eea"
                    title={`${item[xKey]}: ${formatCurrency(item[yKey])}`}
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
            {data.map((item, index) => (
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
    const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
    let currentAngle = 0;
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="pie-chart">
          <svg width="300" height="300" viewBox="0 0 300 300">
            {data.map((item, index) => {
              const value = item[valueKey] || 0;
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
                  fill={`hsl(${(index * 360) / data.length}, 70%, 60%)`}
                  stroke="white"
                  strokeWidth="2"
                  title={`${item[labelKey]}: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`}
                />
              );
            })}
          </svg>
          
          <div className="pie-legend">
            {data.map((item, index) => (
              <div key={index} className="legend-item">
                <div 
                  className="legend-color"
                  style={{ backgroundColor: `hsl(${(index * 360) / data.length}, 70%, 60%)` }}
                />
                <span className="legend-label">{item[labelKey]}</span>
                <span className="legend-value">{formatCurrency(item[valueKey])}</span>
              </div>
            ))}
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
