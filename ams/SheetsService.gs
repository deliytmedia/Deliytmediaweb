// SheetsService.gs — AMS Mortgage Platform: Sheet I/O

var SheetsService = (function () {

  // ── Core sheet access ────────────────────────────────────────────────────────

  function getSheet(tabName) {
    try {
      var ss    = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(tabName);
      if (!sheet) throw new Error('Sheet not found: ' + tabName);
      return sheet;
    } catch (e) {
      throw new Error('SheetsService.getSheet failed [' + tabName + ']: ' + e.message);
    }
  }

  function getSheetData(tabName) {
    try {
      var sheet = getSheet(tabName);
      var data  = sheet.getDataRange().getValues();
      if (data.length < 1) return { headers: [], rows: [] };
      return {
        headers: data[0],
        rows:    data.slice(1)
      };
    } catch (e) {
      throw new Error('SheetsService.getSheetData failed [' + tabName + ']: ' + e.message);
    }
  }

  // ── Write operations ─────────────────────────────────────────────────────────

  function appendRow(tabName, rowData) {
    try {
      var sheet = getSheet(tabName);
      var data  = getSheetData(tabName);
      var row   = objectToRow(data.headers, rowData);
      sheet.appendRow(row);
      return true;
    } catch (e) {
      throw new Error('SheetsService.appendRow failed [' + tabName + ']: ' + e.message);
    }
  }

  function updateRow(tabName, rowIndex, rowData) {
    try {
      // rowIndex is 1-based among data rows (header excluded).
      // Sheet row = rowIndex + 1 to skip the header row.
      var sheet    = getSheet(tabName);
      var data     = getSheetData(tabName);
      var row      = objectToRow(data.headers, rowData);
      var sheetRow = rowIndex + 1;
      sheet.getRange(sheetRow, 1, 1, row.length).setValues([row]);
      return true;
    } catch (e) {
      throw new Error('SheetsService.updateRow failed [' + tabName + ']: ' + e.message);
    }
  }

  // ── Read / search operations ─────────────────────────────────────────────────

  function findRowById(tabName, id) {
    try {
      var data = getSheetData(tabName);
      if (data.headers.length === 0) return null;
      for (var i = 0; i < data.rows.length; i++) {
        if (String(data.rows[i][0]) === String(id)) {
          return {
            rowIndex: i + 1,
            data:     rowToObject(data.headers, data.rows[i])
          };
        }
      }
      return null;
    } catch (e) {
      throw new Error('SheetsService.findRowById failed [' + tabName + ']: ' + e.message);
    }
  }

  function findRowsByField(tabName, field, value) {
    try {
      var data    = getSheetData(tabName);
      var results = [];
      if (data.headers.length === 0) return results;
      var colIdx = data.headers.indexOf(field);
      if (colIdx === -1) throw new Error('Field not found in headers: ' + field);
      for (var i = 0; i < data.rows.length; i++) {
        if (String(data.rows[i][colIdx]) === String(value)) {
          results.push({
            rowIndex: i + 1,
            data:     rowToObject(data.headers, data.rows[i])
          });
        }
      }
      return results;
    } catch (e) {
      throw new Error('SheetsService.findRowsByField failed [' + tabName + ']: ' + e.message);
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  function generateId(prefix) {
    try {
      var ts   = new Date().getTime();
      var rand = Math.floor(Math.random() * 1e6);
      return (prefix || 'ID') + '_' + ts + '_' + rand;
    } catch (e) {
      throw new Error('SheetsService.generateId failed: ' + e.message);
    }
  }

  function rowToObject(headers, row) {
    try {
      var obj = {};
      for (var i = 0; i < headers.length; i++) {
        obj[headers[i]] = (row[i] !== undefined) ? row[i] : '';
      }
      return obj;
    } catch (e) {
      throw new Error('SheetsService.rowToObject failed: ' + e.message);
    }
  }

  function objectToRow(headers, obj) {
    try {
      var row = [];
      for (var i = 0; i < headers.length; i++) {
        var val = obj[headers[i]];
        row.push((val !== undefined && val !== null) ? val : '');
      }
      return row;
    } catch (e) {
      throw new Error('SheetsService.objectToRow failed: ' + e.message);
    }
  }

  return {
    getSheet:        getSheet,
    getSheetData:    getSheetData,
    appendRow:       appendRow,
    updateRow:       updateRow,
    findRowById:     findRowById,
    findRowsByField: findRowsByField,
    generateId:      generateId,
    rowToObject:     rowToObject,
    objectToRow:     objectToRow
  };

})();
