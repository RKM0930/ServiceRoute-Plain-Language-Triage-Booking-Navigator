/** ServiceRoute Intake Receiver — Kahilom Psychological Services */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    const columns = [
      "timestamp",
      "preferred_name",
      "client_type",
      "goal",
      "format",
      "schedule",
      "schedule_notes",
      "recommended_service",
      "contact",
      "referral"
    ];

    // Initialize header row if sheet is fresh
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([...columns, "Status", "Handled By / Notes"]);
    }

    const sanitize = (value) => {
      const str = String(value ?? "");
      return /^[=+\-@]/.test(str) ? `'${str}` : str;
    };

    const rowValues = columns.map((col) => {
      if (col === "contact") return `'${String(data[col] ?? "")}`;
      return sanitize(data[col]);
    });

    // Auto-populate Status column as "Pending"
    rowValues.push("Pending");

    sheet.appendRow(rowValues);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}