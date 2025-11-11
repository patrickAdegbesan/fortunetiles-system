const fs = require('fs');
const path = require('path');

const TABLE_COLUMN_MAPPINGS = {
  locations: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};

function mapColumnNames(table, record) {
  const mapping = TABLE_COLUMN_MAPPINGS[table] || {};
  const mappedRecord = {};
  
  for (const [key, value] of Object.entries(record)) {
    const mappedKey = mapping[key] !== undefined ? mapping[key] : key;
    
    if (mappedKey && (mappedKey !== key || !mappedRecord[mappedKey])) {
      mappedRecord[mappedKey] = value;
    }
  }
  
  return mappedRecord;
}

const exportFile = path.join(__dirname, '../exports/heroku-data-export-2025-10-20T23-07-15-026Z.json');
const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));

const location = exportData.data.locations[0];
console.log('Original:', location);

const mapped = mapColumnNames('locations', location);
console.log('\nMapped:', mapped);

const columns = Object.keys(mapped).filter(key => mapped[key] !== undefined);
console.log('\nColumns:', columns);
console.log('Values:', columns.map(col => mapped[col]));
