function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.sheet);
  var now = new Date();
  
  // Update action: modify specific fields in an existing row
  if (data.action === "update") {
    var row = data.row;
    if (!row) {
      return ContentService
        .createTextOutput(JSON.stringify({status: "error", message: "row is required"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.year !== undefined) {
      sheet.getRange(row, 2).setValue(data.year);       // Column B: Year
    }
    if (data.author !== undefined) {
      sheet.getRange(row, 3).setValue(data.author);     // Column C: Author
    }
    if (data.title !== undefined || data.url !== undefined) {
      // Column D: Title (with optional hyperlink)
      var currentTitle = data.title || sheet.getRange(row, 4).getDisplayValue();
      if (data.url) {
        sheet.getRange(row, 4).setFormula(
          '=HYPERLINK("' + data.url.replace(/"/g, '""') + '","' + currentTitle.replace(/"/g, '""') + '")'
        );
      } else if (data.title) {
        sheet.getRange(row, 4).setValue(data.title);
      }
    }
    if (data.venue !== undefined) {
      sheet.getRange(row, 5).setValue(data.venue);      // Column E: Venue
    }
    if (data.keywords !== undefined) {
      sheet.getRange(row, 6).setValue(data.keywords);   // Column F: Keywords
    }
    if (data.summary !== undefined) {
      sheet.getRange(row, 7).setValue(data.summary);    // Column G: Summary
    }
    if (data.prediction !== undefined) {
      sheet.getRange(row, 8).setValue(data.prediction); // Column H: Prediction
    }
    if (data.reflection !== undefined) {
      sheet.getRange(row, 9).setValue(data.reflection); // Column I: Reflection
    }
    sheet.getRange(row, 11).setValue(now);              // Column K: Updated At
    return ContentService
      .createTextOutput(JSON.stringify({status: "success", updated_row: row}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Default action: append a new row
  var lastRow = sheet.getLastRow();
  var newNo = lastRow;
  
  sheet.appendRow([
    newNo,                 // Column A: No. (auto-increment)
    data.year || "",       // Column B: Year
    data.author || "",     // Column C: Author (1st + et al.)
    "",                    // Column D: Title (set below as hyperlink)
    data.venue || "",      // Column E: Venue
    data.keywords || "",   // Column F: Keywords
    data.summary || "",    // Column G: Summary
    data.prediction || "", // Column H: Prediction
    data.reflection || "", // Column I: Reflection
    now,                   // Column J: Created At
    now                    // Column K: Updated At
  ]);
  
  var newRow = lastRow + 1;
  
  // Column D: clickable hyperlink if URL is provided, plain text otherwise
  if (data.url && data.title) {
    sheet.getRange(newRow, 4).setFormula(
      '=HYPERLINK("' + data.url.replace(/"/g, '""') + '","' + data.title.replace(/"/g, '""') + '")'
    );
  } else {
    sheet.getRange(newRow, 4).setValue(data.title || "");
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({status: "success", row: newRow}))
    .setMimeType(ContentService.MimeType.JSON);
}
