/* =========================================================
   ServiceRoute — deterministic intake state engine
   Kahilom Psychological Services
   ========================================================= */

"use strict";

/* Configure this after deploying Code.gs as a Google Apps Script Web App. */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzHTsRIcRAG9VcoV1x-oh_7TCKvhTWElvY7e-e3cmeDN18S5m_mdDqKXp5TB9ml_KZGGw/exec";

(() => {
  const SCRIPT_PLACEHOLDER = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
  const DEMO_DELAY_MS = 650;
  const FETCH_TIMEOUT_MS = 12000;

  const STEPS = [
    null,
    {
      id: "client",
      kicker: "About the client",
      title: "Sino ang gagamit ng serbisyo?",
      helper: "Pumili kung para kanino ang appointment. Walang hinihinging diagnosis o medical history.",
      options: [
        {
          value: "adult",
          title: "Para sa sarili ko (Adult, 18+)",
          detail: "Personal na session para sa iyong sarili.",
          short: "Sarili ko (18+)",
          icon: "user"
        },
        {
          value: "minor",
          title: "Para sa anak o menor de edad (Minor)",
          detail: "Magulang o guardian ang magpapasa ng inquiry.",
          short: "Anak / menor",
          icon: "minor"
        },
        {
          value: "couple_family",
          title: "Para sa mag-asawa o pamilya (Couples / Family)",
          detail: "Para sa relasyon o pamilyang gustong mag-usap nang sabay.",
          short: "Mag-asawa / pamilya",
          icon: "family"
        }
      ]
    },
    {
      id: "goal",
      kicker: "Your goal",
      title: "Ano ang pangunahing layunin ng appointment?",
      helper: "Ito ay para sa administrative na pagtutugma ng serbisyo — hindi ito isang clinical assessment.",
      options: [
        {
          value: "counseling",
          title: "Usap at Coping sa stress, lungkot, o burnout",
          detail: "Suporta sa stress, lungkot, burnout, at coping.",
          short: "Usap / coping",
          icon: "chat"
        },
        {
          value: "clearance",
          title: "Fit-to-Work, School, o Legal na Clearance",
          detail: "Para sa trabaho, paaralan, o legal na pangangailangan.",
          short: "Clearance",
          icon: "document"
        },
        {
          value: "assessment",
          title: "Comprehensive Psychological Assessment / Testing",
          detail: "Formal testing at komprehensibong written report.",
          short: "Assessment",
          icon: "clipboard"
        }
      ]
    },
    {
      id: "format",
      kicker: "Session format",
      title: "Saan mo nais isagawa ang session?",
      helper: "Piliin ang pinaka-komportableng paraan para sa iyo. Kokumpirmahin ng clinic ang availability.",
      options: [
        {
          value: "online",
          title: "Online Video Call (Zoom / Google Meet)",
          detail: "Secure na video call mula sa iyong tahanan.",
          short: "Online",
          icon: "video"
        },
        {
          value: "f2f",
          title: "Face-to-Face sa Kahilom Clinic",
          detail: "Sa Kahilom clinic para sa personal na session.",
          short: "Face-to-face",
          icon: "clinic"
        }
      ]
    },
    {
      id: "schedule",
      kicker: "Preferred timing",
      title: "Kailan ang iyong target na schedule?",
      helper: "Pumili ng target na panahon. Kokumpirmahin pa rin ng clinical associate ang aktwal na slot.",
      options: [
        {
          value: "asap",
          title: "Ngayong linggo na (Urgent / ASAP)",
          detail: "Priority request — may safety check bago magpatuloy.",
          short: "Ngayong linggo",
          icon: "clock"
        },
        {
          value: "weekend",
          title: "Sabado o Linggo (Weekends)",
          detail: "Para sa Sabado o Linggo na available slot.",
          short: "Weekend",
          icon: "weekend"
        },
        {
          value: "flexible",
          title: "Flexible / Kahit kailan may bakanteng slot",
          detail: "Bukas sa kahit anong araw na may bakanteng oras.",
          short: "Flexible",
          icon: "sparkles"
        }
      ]
    }
  ];

  const SERVICES = {
    clearance: {
      icon: "document",
      title: "Psychological Evaluation for Official Clearance",
      description:
        "Requires standardized clinical interview and in-person testing battery. Produces a signed clinical document.",
      fee: "₱3,500 – ₱5,000",
      customFee: false
    },
    assessment: {
      icon: "clipboard",
      title: "Full Psychological Assessment & Testing Battery",
      description:
        "Multi-hour formal psychometric battery with written comprehensive psychological report.",
      fee: "Custom assessment rates",
      customFee: true
    },
    couples: {
      icon: "family",
      title: "Couples / Family Counseling",
      description:
        "Joint 75-to-90-minute structured facilitation with a licensed relationship counselor.",
      fee: "₱2,000 – ₱2,800",
      customFee: false
    },
    individual: {
      icon: "chat",
      title: "Individual Counseling / Talk Therapy",
      description:
        "Confidential 50-minute 1-on-1 session focused on coping, stress management, and emotional grounding. Does not issue official legal clearance certificates.",
      fee: "₱1,200 – ₱1,800",
      customFee: false
    }
  };

  const ICON_PATHS = {
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.4-3.6 3.1-5.7 7-5.7s6.6 2.1 7 5.7"/>',
    minor:
      '<circle cx="9" cy="8" r="3"/><path d="M3.5 19.5c.3-3.1 2.4-5.1 5.5-5.1s5.2 2 5.5 5.1"/><path d="M16 5.4a2.8 2.8 0 0 1 0 5.4M17.2 14.4c2.1.4 3.3 2.1 3.5 4.4"/>',
    family:
      '<circle cx="8.5" cy="8.3" r="3"/><path d="M3 19.2c.3-3.3 2.5-5.4 5.5-5.4 1.2 0 2.3.3 3.1 1"/><circle cx="16.8" cy="10" r="2.4"/><path d="M14.2 18.8c.3-2.7 1.9-4.2 4.2-4.2 1.8 0 3 1.1 3.5 3"/>',
    chat:
      '<path d="M20.2 11.3a7.5 7.5 0 0 1-7.7 7.3 8.5 8.5 0 0 1-3.2-.6l-4.6 1.5 1.4-4.2a7.1 7.1 0 0 1-1-3.7A7.5 7.5 0 0 1 12.8 4a7.5 7.5 0 0 1 7.4 7.3Z"/><path d="M12 14.6s-2.8-1.6-2.8-3.4c0-.9.7-1.6 1.6-1.6.6 0 1 .3 1.2.8.2-.5.6-.8 1.2-.8.9 0 1.6.7 1.6 1.6 0 1.8-2.8 3.4-2.8 3.4Z"/>',
    document:
      '<path d="M6.5 3.5h7L18 8v12.5H6.5z"/><path d="M13 3.5V8h4.5"/><path d="m9.2 14 1.7 1.7 3.6-3.6"/>',
    clipboard:
      '<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3h6v1.5M9 9h6M9 12h6M9 15h3"/>',
    video:
      '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 4-2.5v9L16 14"/>',
    clinic:
      '<path d="M4 20V5.5L12 3l8 2.5V20"/><path d="M2.5 20h19M9 20v-4h6v4M8 8h.01M12 8h.01M16 8h.01M8 11.5h.01M12 11.5h.01M16 11.5h.01"/>',
    clock:
      '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2M18.5 5.5l1.5-1.5"/>',
    weekend:
      '<rect x="3.5" y="5.5" width="17" height="15" rx="2.2"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
    sparkles:
      '<path d="M11 3.5c.4 4.4 2.1 6.1 6.5 6.5-4.4.4-6.1 2.1-6.5 6.5-.4-4.4-2.1-6.1-6.5-6.5 4.4-.4 6.1-2.1 6.5-6.5Z"/><path d="M18.5 15.5c.2 2.1.9 2.8 3 3-2.1.2-2.8.9-3 3-.2-2.1-.9-2.8-3-3 2.1-.2 2.8-.9 3-3Z"/>',
    shield:
      '<path d="M12 3.25 5 6v5.15c0 4.4 2.94 8.2 7 9.6 4.06-1.4 7-5.2 7-9.6V6l-7-2.75Z"/><path d="m9.25 12 1.8 1.8 3.7-3.7"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7.3"/>',
    arrowRight: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    arrowLeft: '<path d="M19 12H5m5-5-5 5 5 5"/>',
    lock:
      '<rect x="5.5" y="10.5" width="13" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2.5"/>',
    copy:
      '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2.5"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.6-2.1L20 9M4 15l2.3 2.1A7 7 0 0 0 17.9 15"/>',
    send: '<path d="m21 3-7.5 18-3.5-7.5L2.5 10 21 3Z"/><path d="M10 14 21 3"/>',
    alert:
      '<path d="M12 8.25v4.5M12 16.5h.01M10.3 4.4 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.4a2 2 0 0 0-3.4 0Z"/>',
    edit: '<path d="m4 20 4.3-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.3 16 4 20Z"/><path d="m14.8 6.4 3 3"/>',
    wifiOff:
      '<path d="m3 3 18 18M8.8 12.2a6.5 6.5 0 0 1 6.4 0M5.2 8.9a11 11 0 0 1 4.3-2.2M14.7 6.8a11 11 0 0 1 4.1 2.1M11.5 16.2a1.5 1.5 0 0 1 1 0M12 20h.01"/>',
    instagram:
      '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="16.5" cy="6.5" r="1"/>',
    facebook:
      '<path d="M13.5 3.5H8.5a5 5 0 0 0-5 5v7a5 5 0 0 0 5 5h2.5v-6h-2.5v-3h2.5V8.5a2.5 2.5 0 0 1 2.5-2.5H16v3h-2.5a.5.5 0 0 0-.5.5v2.5H16v3h-2.5v6h-5"/>',
    tiktok:
      '<path d="M13.5 3.5c.9 2.6 1.5 5.3 1.7 8 .1 2.6-.9 5.1-2.7 6.8-1.6 1.5-3.9 2.2-6.2 1.9v-3.1c1.3.4 2.7.1 3.8-.8 1-.8 1.5-2 1.6-3.2-.6-.2-1.2-.4-1.8-.6V8.5c.6.4 1.2.7 1.8.9-.2-1.6-.5-3.2-1-4.7Z"/>',
    referral:
      '<path d="M12 3.5 5 7v5.5c0 4.4 2.94 8.2 7 9.6 4.06-1.4 7-5.2 7-9.6V7l-7-3.5Z"/><path d="m9.25 12 1.8 1.8 3.7-3.7"/>',
    other:
      '<circle cx="8.5" cy="8.5" r="2.5"/><circle cx="15.5" cy="8.5" r="2.5"/><circle cx="12" cy="16.5" r="2.5"/>'
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return entities[character];
    });

  const icon = (name, className = "") =>
    `<svg${className ? ` class="${className}"` : ""} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ICON_PATHS.chat}</svg>`;

  const state = {
    step: 1,
    phase: "intake",
    answers: {
      client: null,
      goal: null,
      format: null,
      schedule: null
    },
    contact: "",
    preferredName: "",
    referral: null,
    scheduleNotes: "",
    consent: false,
    submitting: false,
    submitted: false,
    crisisAcknowledged: false,
    deliveryMode: null,
    payload: null
  };

  const dom = {
    stepRoot: document.getElementById("step-root"),
    progressTrack: document.getElementById("progress-track"),
    progressFill: document.getElementById("progress-fill"),
    crisisModal: document.getElementById("crisis-modal"),
    crisisProceed: document.querySelector("[data-crisis-proceed]"),
    crisisClose: document.querySelector("[data-close-modal]"),
    toast: document.getElementById("toast")
  };

  let actionDock = null;
  let backButton = null;
  let continueButton = null;
  let continueLabel = null;
  let toastTimer = null;
  let toastCleanupTimer = null;

  /* ---------- Data helpers ---------- */

  function getStep(stepNumber = state.step) {
    return STEPS[stepNumber];
  }

  function getOption(stepId, value) {
    const step = STEPS.find((candidate) => candidate && candidate.id === stepId);
    return step ? step.options.find((option) => option.value === value) : null;
  }

  function getAnswerLabel(stepId, value) {
    return getOption(stepId, value)?.title || value || "—";
  }

  function getRecommendation(answers = state.answers) {
    if (answers.goal === "clearance") return SERVICES.clearance;
    if (answers.goal === "assessment") return SERVICES.assessment;
    if (answers.client === "couple_family" && answers.goal === "counseling") return SERVICES.couples;
    return SERVICES.individual;
  }

  function isScriptConfigured() {
    return (
      typeof SCRIPT_URL === "string" &&
      /^https?:\/\//i.test(SCRIPT_URL.trim()) &&
      !SCRIPT_URL.includes(SCRIPT_PLACEHOLDER)
    );
  }

  function isValidContact(value) {
    const contact = value.trim();
    if (!contact) return false;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (emailPattern.test(contact)) return true;

    const phoneLike = /^\+?[\d\s().-]+$/.test(contact);
    const digitCount = contact.replace(/\D/g, "").length;
    return phoneLike && digitCount >= 7 && digitCount <= 15;
  }

  /**
   * Protects Philippine mobile numbers (leading zeroes) and neutralizes
   * spreadsheet formula injection prefixes (`=`, `+`, `-`, `@`).
   * The leading apostrophe forces Google Sheets to treat the value as text.
   */
  function sanitizeForSheets(value) {
    const str = String(value ?? "");
    return /^[=+\-@]/.test(str) ? `'${str}` : str;
  }

  function preferredScrollBehavior() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function focusElement(element) {
    if (!element) return;
    window.requestAnimationFrame(() => {
      element.focus({ preventScroll: true });
    });
  }

  /* ---------- Progress + action dock ---------- */

  function updateProgress() {
    const isResult = state.phase === "result";
    const percent = isResult ? 100 : state.step * 25;

    dom.progressFill.style.width = `${percent}%`;
    dom.progressTrack.setAttribute("aria-valuenow", String(percent));
    dom.progressTrack.setAttribute(
      "aria-valuetext",
      isResult
        ? "Intake complete, 100 percent"
        : `Step ${state.step} of 4, ${percent} percent complete`
    );
  }

  function buildActionDock() {
    actionDock = document.createElement("nav");
    actionDock.className = "action-dock";
    actionDock.setAttribute("aria-label", "Intake actions");
    actionDock.innerHTML = `
      <div class="action-dock-inner">
        <button type="button" class="button button-back" id="back-button" aria-label="Go back to the previous step">
          <span>Back</span>
        </button>
        <button type="button" class="button button-primary" id="continue-button" disabled>
          <span id="continue-label">Continue</span>
        </button>
      </div>
    `;

    document.querySelector(".app-frame").insertAdjacentElement("afterend", actionDock);
    backButton = document.getElementById("back-button");
    continueButton = document.getElementById("continue-button");
    continueLabel = document.getElementById("continue-label");
  }

  function updateActionDock() {
    if (!actionDock) return;

    const showDock = state.phase === "intake";
    actionDock.hidden = !showDock;
    document.body.classList.toggle("has-dock", showDock);

    if (!showDock) return;

    const step = getStep();
    const hasAnswer = Boolean(state.answers[step.id]);
    backButton.hidden = state.step === 1;
    continueButton.disabled = !hasAnswer || state.submitting;
    continueLabel.textContent = state.step === 4 ? "See My Recommendation" : "Continue";
  }

  /* ---------- Intake rendering ---------- */

  function optionMarkup(step, option) {
    const inputId = `option-${step.id}-${option.value}`;
    const selected = state.answers[step.id] === option.value;

    return `
      <label class="option-card${selected ? " is-selected" : ""}" for="${inputId}">
        <input
          class="option-input"
          type="radio"
          id="${inputId}"
          name="${step.id}"
          value="${option.value}"
          ${selected ? "checked" : ""}
          required
        >
        <div>
          <span class="option-title" lang="tl">${escapeHTML(option.title)}</span>
          <span class="option-detail" lang="tl">${escapeHTML(option.detail)}</span>
        </div>
      </label>
    `;
  }

  function renderStep(direction = "forward", options = {}) {
    const { focus = true } = options;
    const step = getStep();

    dom.stepRoot.dataset.direction = direction;
    dom.stepRoot.innerHTML = `
      <section class="step-panel" aria-labelledby="step-title">
        <h2 class="step-title" id="step-title" tabindex="-1" lang="tl">${escapeHTML(step.title)}</h2>
        <p class="step-helper" id="step-helper" lang="tl">${escapeHTML(step.helper)}</p>

        <form class="step-form" aria-labelledby="step-title" novalidate>
          <fieldset class="service-options" aria-describedby="step-helper">
            <legend class="sr-only" lang="tl">${escapeHTML(step.title)} — pumili ng isang sagot</legend>
            ${step.options.map((option) => optionMarkup(step, option)).join("")}
          </fieldset>
        </form>
      </section>
    `;

    updateActionDock();
    updateProgress();
    document.title =
      state.step === 1
        ? "ServiceRoute | Kahilom Psychological Services"
        : `Step ${state.step} of 4 | ServiceRoute`;

    if (focus) focusElement(document.getElementById("step-title"));
  }

  function renderResult(options = {}) {
    const { focus = true, scroll = true } = options;
    const recommendation = getRecommendation();

    dom.stepRoot.dataset.direction = "none";
    dom.stepRoot.innerHTML = `
      <section class="result-panel" aria-labelledby="result-heading">
        <article class="service-card">
          <h2 class="result-title" id="result-heading" tabindex="-1">${escapeHTML(recommendation.title)}</h2>
          <p class="result-intro" lang="tl">${escapeHTML(recommendation.description)}</p>
          <div class="rate-line" lang="tl">Rate: ${escapeHTML(recommendation.fee)} / session</div>
          <p class="service-description" lang="tl">Batay sa iyong mga sagot, heto ang pinakaangkop na administrative service match. Hindi ito clinical diagnosis.</p>
        </article>

        <div id="inquiry-mount">
          ${inquiryFormMarkup()}
        </div>
      </section>
    `;

    updateActionDock();
    updateProgress();
    document.title = "Your Service Match | ServiceRoute";

    if (scroll) scrollToTop();
    if (focus) focusElement(document.getElementById("result-heading"));
  }

  function inquiryFormMarkup() {
    const referralOptions = [
      { value: "instagram", title: "Instagram" },
      { value: "facebook", title: "Facebook" },
      { value: "tiktok", title: "TikTok" },
      { value: "referral", title: "Rekomendasyon" },
      { value: "other", title: "Iba pa" }
    ];

    return `
      <section class="inquiry-card" aria-labelledby="inquiry-title">
        <h3 class="inquiry-title" id="inquiry-title">Send your inquiry</h3>

        <form id="inquiry-form" novalidate>
          <div class="field-group">
            <label class="field-label" for="preferred-name-input">Palayaw o Preferred Name</label>
            <input
              class="contact-input"
              id="preferred-name-input"
              name="preferred_name"
              type="text"
              value="${escapeHTML(state.preferredName)}"
              placeholder="e.g., Kielle"
              autocomplete="nickname"
              spellcheck="true"
              aria-describedby="preferred-name-hint"
            >
            <p class="field-hint" id="preferred-name-hint">Hindi kailangan — maaari kang magpasa nang walang pangalan.</p>
          </div>

          <div class="field-group" id="contact-field">
            <label class="field-label" for="contact-input">Mobile Number o Email Address</label>
            <input
              class="contact-input"
              id="contact-input"
              name="contact"
              type="text"
              value="${escapeHTML(state.contact)}"
              placeholder="0917-XXX-XXXX o email"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              aria-required="true"
              aria-describedby="contact-hint contact-error"
              required
            >
            <p class="field-hint" id="contact-hint">Gamitin ang numero o email kung saan ka maaaring makontak ng clinic.</p>
            <p class="field-error" id="contact-error" role="alert" hidden>
              <span>Pakilagay ang wastong mobile number o email address.</span>
            </p>
          </div>

          <div class="field-group">
            <label class="field-label" for="schedule-notes-input">May partikular na araw o oras? (Optional)</label>
            <input
              class="contact-input"
              id="schedule-notes-input"
              name="schedule_notes"
              type="text"
              value="${escapeHTML(state.scheduleNotes)}"
              placeholder="e.g., Nov 6 ng hapon, o tuwing Biyernes after 5 PM"
              autocomplete="off"
              spellcheck="true"
              aria-describedby="schedule-notes-hint"
            >
            <p class="field-hint" id="schedule-notes-hint">Titingnan ng clinical associate ang availability ng slot na ito sa master calendar.</p>
          </div>

          <div class="field-group">
            <span class="field-label" id="referral-label">Saan mo nalaman ang Kahilom?</span>
            <div class="referral-row" id="referral-row" role="radiogroup" aria-labelledby="referral-label">
              ${referralOptions
                .map((option) => {
                  const selected = state.referral === option.value;
                  return `
                    <button
                      type="button"
                      class="referral-pill${selected ? " is-active" : ""}"
                      data-referral="${option.value}"
                      role="radio"
                      aria-checked="${selected}"
                    >
                      ${escapeHTML(option.title)}
                    </button>
                  `;
                })
                .join("")}
            </div>
          </div>

          <label class="consent-card" for="consent-checkbox">
            <input
              class="consent-checkbox"
              id="consent-checkbox"
              name="consent"
              type="checkbox"
              ${state.consent ? "checked" : ""}
              required
            >
            <span class="consent-copy">
              I consent to Kahilom Psychological Services processing my contact details for appointment coordination under the Data Privacy Act of 2012 (RA 10173).
            </span>
          </label>

          <button
            type="submit"
            class="button button-primary submit-button"
            id="submit-inquiry"
            ${state.consent ? "" : "disabled"}
          >
            Submit Inquiry
          </button>
        </form>
      </section>
    `;
  }

  /* ---------- Navigation ---------- */

  function goToStep(stepNumber, direction = "forward") {
    state.step = Math.min(4, Math.max(1, stepNumber));
    state.phase = "intake";
    state.submitted = false;
    scrollToTop();
    renderStep(direction);
  }

  function advanceFromStep() {
    const step = getStep();
    if (!state.answers[step.id] || state.submitting) return;

    if (state.step < 4) {
      state.step += 1;
      state.phase = "intake";
      scrollToTop();
      renderStep("forward");
      return;
    }

    if (state.answers.schedule === "asap" && !state.crisisAcknowledged) {
      openCrisisModal();
      return;
    }

    showResult();
  }

  function goBack() {
    if (state.step <= 1) return;
    state.step -= 1;
    state.phase = "intake";
    scrollToTop();
    renderStep("back");
  }

  function showResult() {
    const missingAnswer = ["client", "goal", "format", "schedule"].find(
      (key) => !state.answers[key]
    );
    if (missingAnswer) {
      state.step = ["client", "goal", "format", "schedule"].indexOf(missingAnswer) + 1;
      renderStep("back");
      return;
    }

    state.phase = "result";
    state.submitted = false;
    renderResult();
  }

  function editAnswers() {
    if (state.submitting) return;
    state.phase = "intake";
    state.submitted = false;
    state.step = 4;
    scrollToTop();
    renderStep("back");
  }

  function resetIntake() {
    state.step = 1;
    state.phase = "intake";
    state.answers = { client: null, goal: null, format: null, schedule: null };
    state.contact = "";
    state.preferredName = "";
    state.referral = null;
    state.consent = false;
    state.submitting = false;
    state.submitted = false;
    state.crisisAcknowledged = false;
    state.deliveryMode = null;
    state.payload = null;

    hideToast();
    scrollToTop();
    renderStep("back");
  }

  /* ---------- Crisis intercept ---------- */

  function openCrisisModal() {
    if (!dom.crisisModal || dom.crisisModal.open) return;

    document.body.classList.add("modal-open");
    if (typeof dom.crisisModal.showModal === "function") {
      dom.crisisModal.showModal();
    } else {
      dom.crisisModal.setAttribute("open", "");
    }
  }

  function closeCrisisModal() {
    if (!dom.crisisModal) return;

    if (dom.crisisModal.open && typeof dom.crisisModal.close === "function") {
      dom.crisisModal.close();
    } else {
      dom.crisisModal.removeAttribute("open");
    }
    document.body.classList.remove("modal-open");
  }

  /* ---------- Form interactions ---------- */

  function setContactError(hasError) {
    const field = document.getElementById("contact-field");
    const input = document.getElementById("contact-input");
    const error = document.getElementById("contact-error");
    if (!field || !input || !error) return;

    field.classList.toggle("has-error", hasError);
    error.hidden = !hasError;
    input.setAttribute("aria-invalid", hasError ? "true" : "false");
  }

  function syncSubmitAvailability() {
    const button = document.getElementById("submit-inquiry");
    const checkbox = document.getElementById("consent-checkbox");
    if (!button || !checkbox) return;
    button.disabled = !checkbox.checked || state.submitting;
  }

  function setSubmittingState() {
    const form = document.getElementById("inquiry-form");
    const button = document.getElementById("submit-inquiry");
    const input = document.getElementById("contact-input");
    const consent = document.getElementById("consent-checkbox");

    if (form) form.setAttribute("aria-busy", "true");
    if (input) input.readOnly = true;
    if (consent) consent.disabled = true;

    const editButton = document.querySelector('[data-action="edit-answers"]');
    if (editButton) editButton.disabled = true;

    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>Sending inquiry…</span>`;
    }
  }

  function handleOptionChange(event) {
    const input = event.target.closest(".option-input");
    if (!input) return;

    const step = getStep();
    if (!STEPS.some((candidate) => candidate && candidate.id === input.name)) return;

    state.answers[step.id] = input.value;

    dom.stepRoot.querySelectorAll(".option-card").forEach((card) => {
      const cardInput = card.querySelector(".option-input");
      card.classList.toggle("is-selected", Boolean(cardInput?.checked));
    });

    if (step.id === "schedule") {
      state.crisisAcknowledged = false;
      updateActionDock();
      if (input.value === "asap") {
        openCrisisModal();
      }
      return;
    }

    updateActionDock();
  }

  function handleConsentChange(event) {
    if (!event.target.matches("#consent-checkbox")) return;
    state.consent = event.target.checked;
    syncSubmitAvailability();
  }

  function handleContactInput(event) {
    if (!event.target.matches("#contact-input")) return;
    state.contact = event.target.value;
    if (event.target.getAttribute("aria-invalid") === "true") {
      setContactError(false);
    }
  }

  function handlePreferredNameInput(event) {
    if (!event.target.matches("#preferred-name-input")) return;
    state.preferredName = event.target.value;
  }

  function handleScheduleNotesInput(event) {
    if (!event.target.matches("#schedule-notes-input")) return;
    state.scheduleNotes = event.target.value;
  }

  function handleReferralSelect(value) {
    state.referral = value;
    const row = document.getElementById("referral-row");
    if (!row) return;
    row.querySelectorAll("[data-referral]").forEach((pill) => {
      const selected = pill.dataset.referral === value;
      pill.classList.toggle("is-active", selected);
      pill.setAttribute("aria-checked", selected ? "true" : "false");
    });
  }

  async function handleInquirySubmit(event) {
    if (!event.target.matches("#inquiry-form")) return;
    event.preventDefault();
    if (state.submitting) return;

    const input = document.getElementById("contact-input");
    const checkbox = document.getElementById("consent-checkbox");
    if (!input || !checkbox) return;

    const contact = input.value.trim();
    state.contact = contact;
    state.consent = checkbox.checked;

    if (!isValidContact(contact)) {
      setContactError(true);
      window.requestAnimationFrame(() => input.focus());
      return;
    }

    if (!state.consent) {
      syncSubmitAvailability();
      return;
    }

    setContactError(false);
    const recommendation = getRecommendation();
    const payload = {
      timestamp: new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
      preferred_name: state.preferredName.trim() || "Anonymous",
      client_type: state.answers.client,
      goal: state.answers.goal,
      format: state.answers.format,
      schedule: state.answers.schedule,
      schedule_notes: state.scheduleNotes.trim() || "None specified",
      recommended_service: recommendation.title,
      contact: state.contact.trim(),
      referral: state.referral || "Direct / Unspecified"
    };

    state.submitting = true;
    setSubmittingState();

    let deliveryMode = "demo";
    if (isScriptConfigured()) {
      try {
        await postInquiry(payload);
        deliveryMode = "live";
      } catch {
        deliveryMode = "offline";
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, DEMO_DELAY_MS));
    }

    state.submitting = false;
    state.submitted = true;
    state.deliveryMode = deliveryMode;
    state.payload = payload;
    renderSuccess();
  }

  async function postInquiry(payload) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function deliveryNoteMarkup() {
    if (state.deliveryMode === "demo") {
      return `
        <p class="delivery-note">
          ${icon("wifiOff")}
          <span><strong>Demo preview:</strong> no live clinic endpoint is connected yet, so this inquiry was not transmitted. Your details remain only in this browser session.</span>
        </p>
      `;
    }

    if (state.deliveryMode === "offline") {
      return `
        <p class="delivery-note">
          ${icon("wifiOff")}
          <span><strong>Connection fallback:</strong> we could not reach the clinic server, so this inquiry was not transmitted. Copy your details now and contact the clinic when you are online.</span>
        </p>
      `;
    }

    return "";
  }

  function renderSuccess() {
    const mount = document.getElementById("inquiry-mount");
    if (!mount) return;

    mount.innerHTML = `
      <section class="success-card" aria-labelledby="success-title">
        <h2 class="success-title" id="success-title" tabindex="-1">Inquiry Received!</h2>
        <p class="success-message">Our Clinical Associate will review available therapist schedules and message you within clinic operating hours to confirm your appointment slot.</p>
        ${deliveryNoteMarkup()}
        <div class="success-actions">
          <button type="button" class="button button-secondary" data-action="copy-inquiry">
            Copy Inquiry Details
          </button>
          <button type="button" class="button success-start" data-action="start-over">
            Start Over
          </button>
        </div>
      </section>
    `;

    document.title = "Inquiry Received | ServiceRoute";
    updateActionDock();

    const successTitle = document.getElementById("success-title");
    const successCard = successTitle?.closest(".success-card");
    if (successCard) {
      successCard.scrollIntoView({ behavior: preferredScrollBehavior(), block: "center" });
    }
    focusElement(successTitle);
  }

  /* ---------- Clipboard + toast ---------- */

  function buildCopySummary() {
    const payload = state.payload;
    if (!payload) return "";

    let submittedAt = payload.timestamp;
    try {
      submittedAt = new Date(payload.timestamp).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      /* Keep the ISO timestamp if locale formatting is unavailable. */
    }

    return [
      "ServiceRoute — Inquiry Details",
      `Submitted: ${submittedAt}`,
      "",
      `Preferred name: ${payload.preferred_name || "Anonymous"}`,
      `Client: ${getAnswerLabel("client", payload.client_type)}`,
      `Goal: ${getAnswerLabel("goal", payload.goal)}`,
      `Format: ${getAnswerLabel("format", payload.format)}`,
      `Schedule: ${getAnswerLabel("schedule", payload.schedule)}`,
      `Schedule notes: ${payload.schedule_notes || "None specified"}`,
      `Recommended service: ${payload.recommended_service}`,
      `Contact: ${payload.contact}`,
      `Referral: ${payload.referral || "Direct / Unspecified"}`,
      "",
      "Consent given under the Data Privacy Act of 2012 (RA 10173)."
    ].join("\n");
  }

  function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;";
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    textArea.remove();
    return copied;
  }

  async function copyInquiryDetails() {
    const summary = buildCopySummary();
    if (!summary) return;

    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(summary);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) copied = fallbackCopy(summary);
    if (!copied) {
      window.prompt("Copy your inquiry details:", summary);
      return;
    }

    showToast("Inquiry details copied to your clipboard.");
  }

  function showToast(message) {
    if (!dom.toast) return;

    window.clearTimeout(toastTimer);
    window.clearTimeout(toastCleanupTimer);
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    window.requestAnimationFrame(() => {
      dom.toast.classList.add("is-visible");
    });

    toastTimer = window.setTimeout(() => {
      hideToast();
    }, 3200);
  }

  function hideToast() {
    if (!dom.toast) return;
    window.clearTimeout(toastTimer);
    dom.toast.classList.remove("is-visible");
    toastCleanupTimer = window.setTimeout(() => {
      dom.toast.hidden = true;
    }, 220);
  }

  /* ---------- Event wiring ---------- */

  function wireEvents() {
    backButton.addEventListener("click", goBack);
    continueButton.addEventListener("click", advanceFromStep);

    dom.stepRoot.addEventListener("change", (event) => {
      if (event.target.matches(".option-input")) {
        handleOptionChange(event);
        return;
      }
      handleConsentChange(event);
    });

    dom.stepRoot.addEventListener("input", handleContactInput);
    dom.stepRoot.addEventListener("input", handlePreferredNameInput);
    dom.stepRoot.addEventListener("input", handleScheduleNotesInput);
    dom.stepRoot.addEventListener("submit", handleInquirySubmit);

    dom.stepRoot.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        const action = actionButton.dataset.action;
        if (action === "edit-answers") editAnswers();
        if (action === "copy-inquiry") copyInquiryDetails();
        if (action === "start-over") resetIntake();
        return;
      }

      const referralButton = event.target.closest("[data-referral]");
      if (referralButton) {
        handleReferralSelect(referralButton.dataset.referral);
      }
    });

    dom.crisisProceed.addEventListener("click", () => {
      state.crisisAcknowledged = true;
      closeCrisisModal();
      showResult();
    });

    dom.crisisClose?.addEventListener("click", closeCrisisModal);

    dom.crisisModal.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
    });

    dom.crisisModal.addEventListener("click", (event) => {
      if (event.target !== dom.crisisModal) return;
      const bounds = dom.crisisModal.getBoundingClientRect();
      const clickedOutside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;
      if (clickedOutside) closeCrisisModal();
    });
  }

  function init() {
    buildActionDock();
    wireEvents();
    renderStep("forward", { focus: false });
    updateActionDock();
  }

  init();
})();
