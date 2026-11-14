/** ServiceRoute Intake Receiver — Kahilom Psychological Services
 *  Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 *  Set SHARED_SECRET to a long random string and keep it in sync with app.js.
 */
const SHARED_SECRET = "YOUR_SHARED_SECRET_HERE"; // Change this before deploying

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Basic shared-secret check to reduce spam
    if (!data.secret || data.secret !== SHARED_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const columns = [
      "server_timestamp",
      "client_timestamp",
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

    const rowValues = [
      new Date(), // Server timestamp (authoritative)
      sanitize(data.timestamp),
      sanitize(data.preferred_name),
      sanitize(data.client_type),
      sanitize(data.goal),
      sanitize(data.format),
      sanitize(data.schedule),
      sanitize(data.schedule_notes),
      sanitize(data.recommended_service),
      `'${String(data.contact ?? "")}`, // Force text for phone numbers
      sanitize(data.referral)
    ];

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
