# ServiceRoute

**Administrative Intake & Service Matching Navigator** for Kahilom Psychological Services.

A zero-dependency, mobile-first static web app built with vanilla HTML, CSS, and JavaScript. It guides clients through four administrative questions, recommends a service, intercepts urgent scheduling with crisis resources, and sends a consented contact inquiry to a Google Sheets endpoint.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Semantic app shell, emergency banner, progress, crisis dialog |
| `style.css` | Responsive design system and motion |
| `app.js` | Deterministic state engine, matching rules, form delivery |
| `Code.gs` | Google Apps Script receiver for Google Sheets |
| `netlify.toml` | Optional Netlify configuration |

## Run locally

No build step is required. Open `index.html` directly, or serve the directory:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Connect the Google Sheet (recommended security setup)

1. Open the target Google Sheet, then choose **Extensions → Apps Script**.
2. Paste the contents of `Code.gs` into the editor.
3. **Important:** Change `SHARED_SECRET` in `Code.gs` to a long random string (e.g. generate one with `openssl rand -hex 24`).
4. Choose **Deploy → New deployment → Web app**.
5. Set **Execute as** to *Me* and **Who has access** to *Anyone*, then deploy.
6. Copy the Web App `/exec` URL.
7. In `app.js` (top of the file):
   - Replace `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with the `/exec` URL.
   - Replace `YOUR_SHARED_SECRET_HERE` with the **same** secret you set in `Code.gs`.
8. Submit a test inquiry and confirm a new row appears in the active sheet (with a server timestamp).

The app posts with `mode: "no-cors"`, so the browser cannot read the Apps Script response. A resolved request is treated as sent; a rejected request enters the offline fallback.

## Demo and offline behavior

- While `SCRIPT_URL` contains the placeholder, submissions show the demo confirmation and are **not transmitted**.
- If a configured endpoint cannot be reached, the app shows the same confirmation with a transparent connection fallback notice and a copy-details action.
- No contact data is written to `localStorage`, cookies, or analytics. State lives in memory for the current page session only.

## Matching rules

1. `goal = clearance` → Psychological Evaluation for Official Clearance
2. `goal = assessment` → Full Psychological Assessment & Testing Battery
3. `client = couple_family` and `goal = counseling` → Couples / Family Counseling
4. All other combinations → Individual Counseling / Talk Therapy

## Privacy and safety

- The intake asks only for administrative routing choices and a contact method.
- No diagnosis, medical history, or trauma description is requested or sent.
- Consent under the Data Privacy Act of 2012 (RA 10173) is required before submission.
- The emergency notice remains pinned at the top of the app.
- Selecting the urgent/ASAP schedule opens a crisis-intercept dialog before the result is shown.

## Deployment

The folder is ready for any static host (Netlify, Vercel, GitHub Pages, etc.).
For Netlify, the included `netlify.toml` sets basic security headers. After deploying, remember to update the Open Graph image URL in `index.html` if desired.
