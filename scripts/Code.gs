function doGet(e) {
  var params = e.parameter || {};
  if (params.action !== "get") {
    return ContentService
      .createTextOutput(JSON.stringify({status: "error", message: 'unsupported action; use action="get"'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return handleGetAction(params);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  if (data.action === "get") {
    return handleGetAction(data);
  }

  var sheet = getTargetSheet(data.sheet);
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

function handleGetAction(data) {
  var row = Number(data.row);
  if (!row) {
    return ContentService
      .createTextOutput(JSON.stringify({status: "error", message: "row is required"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getTargetSheet(data.sheet);
  var lastRow = sheet.getLastRow();
  if (row < 2 || row > lastRow) {
    return ContentService
      .createTextOutput(JSON.stringify({status: "error", message: "row not found"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      row: row,
      paper: getPaperRowData(sheet, row)
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTargetSheet(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('sheet not found: ' + sheetName);
  }
  return sheet;
}

function getPaperRowData(sheet, row) {
  var values = sheet.getRange(row, 1, 1, 11).getDisplayValues()[0];
  var titleCell = sheet.getRange(row, 4);
  var richText = titleCell.getRichTextValue();

  return {
    no: values[0],
    year: values[1],
    author: values[2],
    title: values[3],
    url: richText ? richText.getLinkUrl() : null,
    venue: values[4],
    keywords: values[5],
    summary: values[6],
    prediction: values[7],
    reflection: values[8],
    created_at: values[9],
    updated_at: values[10]
  };
}
