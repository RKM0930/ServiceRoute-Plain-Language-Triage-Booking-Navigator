/* =========================================================
   ServiceRoute — deterministic intake state engine
   Kahilom Psychological Services
   ========================================================= */

"use strict";

/* Public Google Apps Script Web App URL. No server or hosting provider required. */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCx0FCf-1i4HyBMHZ3WHiyhpQW_8LxbEAsMnNwgUQIXw6le92YVlCXis6dZMGUjY8tjg/exec";

(() => {
  const FETCH_TIMEOUT_MS = 20000;
  const RECEIPT_TIMEOUT_MS = 5000;
  const PRIVACY_VERSION = "2026-11-15.1";

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
      helper: "Tutulong ito sa pagpili ng serbisyong itatanong sa clinic. Hindi ito clinical assessment.",
      options: [
        {
          value: "counseling",
          title: "Counseling para sa stress, lungkot, o burnout",
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
          detail: "Magtanong tungkol sa testing at posibleng written report.",
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
          detail: "Video call; kukumpirmahin ng clinic ang platform at mga kailangan.",
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
      title: "Kailan mo gustong magpa-appointment?",
      helper: "Preference pa lamang ito. Kukumpirmahin ng clinic ang available na araw at oras.",
      options: [
        {
          value: "asap",
          title: "Sa lalong madaling panahon",
          detail: "Walang garantisadong agarang slot o priority. May paalala para sa agarang suporta.",
          short: "Sa lalong madaling panahon",
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
        "Para sa inquiry tungkol sa psychological evaluation para sa clearance. Kumpirmahin sa clinic ang mga dokumento at testing na kailangan.",
      fee: "₱3,500 – ₱5,000",
      customFee: false
    },
    assessment: {
      icon: "clipboard",
      title: "Full Psychological Assessment & Testing Battery",
      description:
        "Para sa inquiry tungkol sa psychological assessment at testing. Kumpirmahin sa clinic ang saklaw, tagal, at posibleng written report.",
      fee: "Custom assessment rates",
      customFee: true
    },
    couples: {
      icon: "family",
      title: "Couples / Family Counseling",
      description:
        "Para sa counseling na may kinalaman sa relasyon o pamilya. Kumpirmahin sa clinic ang mga kalahok, format, at tagal ng session.",
      fee: "₱2,000 – ₱2,800",
      customFee: false
    },
    individual: {
      icon: "chat",
      title: "Individual Counseling / Talk Therapy",
      description:
        "Para sa individual counseling tungkol sa coping at mga pinagdaraanan. Hindi ito emergency care o awtomatikong clearance.",
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
    nameDefaultApplied: false,
    referral: null,
    scheduleNotes: "",
    consent: false,
    submitting: false,
    submitted: false,
    crisisAcknowledged: false,
    deliveryMode: null,
    receivedAt: null,
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

  // Keep these pure rules identical to Code.gs; parity is regression-tested.
  function normalizeContact(value) {
    if (typeof value !== "string") return null;
    const contact = value.trim();
    if (!contact || contact.length > 254) return null;
    if (contact.includes("@")) {
      const parts = contact.split("@");
      if (parts.length !== 2) return null;
      const [local, domain] = parts;
      if (!local || local.length > 64 || !/^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~.-]+$/u.test(local) ||
          local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
      const labels = domain.split(".");
      if (labels.length < 2 || labels.some((label) =>
        !/^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u.test(label)) ||
        labels[labels.length - 1].length < 2 || !/\p{L}/u.test(labels[labels.length - 1])) return null;
      return local + "@" + domain.toLowerCase();
    }
    let digits;
    if (/^09\d{9}$/.test(contact)) digits = contact;
    else if (/^(?:\+63|63)9\d{9}$/.test(contact)) digits = "0" + contact.replace(/^\+?63/, "");
    else if (/^09\d{2}([ -])\d{3}\1\d{4}$/.test(contact)) digits = contact.replace(/[ -]/g, "");
    else if (/^(?:\+63|63)([ -])9\d{2}\1\d{3}\1\d{4}$/.test(contact)) {
      digits = "0" + contact.replace(/^\+?63/, "").replace(/[ -]/g, "");
    } else return null;
    return digits.slice(0, 4) + "-" + digits.slice(4, 7) + "-" + digits.slice(7);
  }

  function normalizePreferredName(value, preserveCase = false) {
    const name = String(value ?? "").trim().replace(/\s+/gu, " ");
    if (preserveCase || name !== name.toLowerCase()) return name;
    const formatted = name.replace(/(^|[\s'’\-‐‑])(\p{L})/gu, (_, boundary, letter) => boundary + letter.toUpperCase());
    return formatted.length <= 80 ? formatted : name;
  }

  function isValidContact(value) {
    return normalizeContact(value) !== null;
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
        ? "Tapos na ang apat na tanong"
        : `Hakbang ${state.step} sa 4`
    );
    const label = document.getElementById("progress-label");
    if (label) label.textContent = isResult ? "Tapos na ang apat na tanong" : `Hakbang ${state.step} sa 4`;
  }

  function buildActionDock() {
    actionDock = document.createElement("nav");
    actionDock.className = "action-dock";
    actionDock.setAttribute("aria-label", "Mga hakbang sa intake");
    actionDock.innerHTML = `
      <div class="action-dock-inner">
        <button type="button" class="button button-back" id="back-button" aria-label="Bumalik sa naunang tanong">
          <span>Bumalik</span>
        </button>
        <button type="button" class="button button-primary" id="continue-button" disabled>
          <span id="continue-label">Magpatuloy</span>
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
    continueLabel.textContent = state.step === 4 ? "Tingnan ang mungkahing serbisyo" : "Magpatuloy";
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
        : `Hakbang ${state.step} sa 4 | ServiceRoute`;

    if (focus) focusElement(document.getElementById("step-title"));
  }

  function renderResult(options = {}) {
    const { focus = true, scroll = true } = options;
    const recommendation = getRecommendation();

    dom.stepRoot.dataset.direction = "none";
    dom.stepRoot.innerHTML = `
      <section class="result-panel" aria-labelledby="result-heading">
        <article class="service-card">
          <h2 class="result-title" id="result-heading" tabindex="-1" lang="en">${escapeHTML(recommendation.title)}</h2>
          <p class="result-intro">${escapeHTML(recommendation.description)}</p>
          <div class="rate-line">Tinatayang singil: ${escapeHTML(recommendation.fee)}${recommendation.customFee ? "" : " / session"}. Kumpirmahin ang kasalukuyang presyo sa clinic.</div>
          <p class="service-description">Mungkahing serbisyo batay sa sagot mo, hindi clinical diagnosis.</p>
          <h3>Mga pinili mo</h3>
          <ul class="preference-summary">
            ${Object.entries(state.answers).map(([key, value]) => `<li>${escapeHTML(getAnswerLabel(key, value))}</li>`).join("")}
          </ul>
          ${["clearance", "assessment"].includes(state.answers.goal) && state.answers.format === "online" ? '<p class="compatibility-note">Online ang pinili mo. Kumpirmahin sa clinic kung may testing na kailangang gawin nang personal bago magpa-appointment.</p>' : ""}
          <button type="button" class="button button-secondary" data-action="edit-answers">Baguhin ang mga sagot</button>
        </article>

        <div id="inquiry-mount">
          ${inquiryFormMarkup()}
        </div>
      </section>
    `;

    updateActionDock();
    updateProgress();
    document.title = "Mungkahing Serbisyo | ServiceRoute";

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
        <h3 class="inquiry-title" id="inquiry-title">Ipadala ang inquiry</h3>
        <p>Inquiry pa lamang ito. Hindi pa naka-book ang appointment.</p>

        <form id="inquiry-form" novalidate>
          <div class="honeypot" aria-hidden="true">
            <label for="website-input">Leave this field empty</label>
            <input id="website-input" name="website" type="text" tabindex="-1" autocomplete="off">
          </div>
          <div class="field-group">
            <label class="field-label" for="preferred-name-input">Palayaw o Preferred Name</label>
            <input
              class="contact-input"
              id="preferred-name-input"
              name="preferred_name"
              type="text"
              maxlength="80"
              value="${escapeHTML(state.preferredName)}"
              placeholder="Hal. Kielle"
              autocomplete="nickname"
              autocapitalize="words"
              spellcheck="false"
              aria-describedby="preferred-name-hint"
            >
            <p class="field-hint" id="preferred-name-hint">Puwedeng walang pangalan. Aayusin ang maliliit na titik sa unang pag-alis sa field; maaari mo itong baguhin.</p>
          </div>

          <div class="field-group" id="contact-field">
            <label class="field-label" for="contact-input">Philippine mobile number o email address</label>
            <input
              class="contact-input"
              id="contact-input"
              name="contact"
              type="text"
              maxlength="254"
              value="${escapeHTML(state.contact)}"
              placeholder="0917-123-4567 o email"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              aria-required="true"
              aria-describedby="contact-hint contact-error"
              required
            >
            <p class="field-hint" id="contact-hint">Hal. 0917-123-4567 o +63 917 123 4567. Tinitingnan lang ang format, hindi kung aktibo o pag-aari mo ang numero.</p>
            <p class="field-error" id="contact-error" role="alert" hidden>
              <span>Maglagay ng wastong 11-digit Philippine mobile number (hal. 0917-123-4567) o email address.</span>
            </p>
          </div>

          <div class="field-group">
            <label class="field-label" for="schedule-notes-input">May gustong araw o oras? (Opsyonal)</label>
            <input
              class="contact-input"
              id="schedule-notes-input"
              name="schedule_notes"
              type="text"
              maxlength="300"
              value="${escapeHTML(state.scheduleNotes)}"
              placeholder="Hal. Biyernes pagkalipas ng 5 PM"
              autocomplete="off"
              spellcheck="true"
              aria-describedby="schedule-notes-hint"
            >
            <p class="field-hint" id="schedule-notes-hint">Araw at oras lang. Huwag ilagay ang sintomas, diagnosis, o medical history.</p>
          </div>

          <div class="field-group">
            <fieldset class="referral-row" id="referral-row">
              <legend class="field-label">Saan mo nalaman ang Kahilom? (Opsyonal)</legend>
              ${referralOptions
                .map((option) => {
                  const selected = state.referral === option.value;
                  return `
                    <label class="referral-pill">
                      <input type="radio" name="referral" value="${option.value}" ${selected ? "checked" : ""}>
                      ${escapeHTML(option.title)}
                    </label>
                  `;
                })
                .join("")}
            </fieldset>
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
              Nabasa ko ang <a href="privacy.html" target="_blank" rel="noopener">privacy notice (bagong tab)</a> at pumapayag akong gamitin ng Kahilom Psychological Services ang mga detalye ko para sa pag-aayos ng appointment, alinsunod sa Data Privacy Act of 2012 (RA 10173).
            </span>
          </label>

          <button
            type="submit"
            class="button button-primary submit-button"
            id="submit-inquiry"
            ${state.consent ? "" : "disabled"}
          >
            Ipadala ang inquiry
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
    if (state.payload && !state.submitted &&
        !window.confirm("Maaaring natanggap na ang naunang inquiry. Ang pagbago ng mga sagot ay gagawa ng bagong inquiry. Magpatuloy?")) return;
    state.payload = null;
    state.deliveryMode = null;
    state.receivedAt = null;
    state.phase = "intake";
    showSubmissionStatus("");
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
    state.nameDefaultApplied = false;
    state.referral = null;
    state.scheduleNotes = "";
    state.consent = false;
    state.submitting = false;
    state.submitted = false;
    state.crisisAcknowledged = false;
    state.deliveryMode = null;
    state.receivedAt = null;
    state.payload = null;

    hideToast();
    showSubmissionStatus("");
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
    form?.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    if (input) input.readOnly = true;
    if (consent) consent.disabled = true;

    const editButton = document.querySelector('[data-action="edit-answers"]');
    if (editButton) editButton.disabled = true;

    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>Ipinapadala at kinukumpirma…</span>`;
    }
    showSubmissionStatus("Ipinapadala ang inquiry at tinitingnan kung natanggap ito. Sandali lang.");
  }

  function showSubmissionStatus(message) {
    const status = document.getElementById("submission-status");
    if (status) status.textContent = message;
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
      setContactError(!isValidContact(state.contact));
    }
  }

  function handlePreferredNameInput(event) {
    if (!event.target.matches("#preferred-name-input")) return;
    state.preferredName = event.target.value;
  }

  function handleFieldBlur(event) {
    if (state.payload || state.submitting) return;
    if (event.target.matches("#preferred-name-input")) {
      const name = normalizePreferredName(event.target.value, state.nameDefaultApplied);
      event.target.value = state.preferredName = name;
      if (name) state.nameDefaultApplied = true;
    }
    if (event.target.matches("#contact-input")) {
      const contact = normalizeContact(event.target.value);
      if (contact) event.target.value = state.contact = contact;
      const previouslyInvalid = event.target.getAttribute("aria-invalid") === "true";
      // A new blur error can move the submit button during pointer-down, swallowing
      // the first click. Reveal new errors on submit; update existing errors here.
      if (previouslyInvalid || contact) setContactError(!contact);
    }
  }

  function handleScheduleNotesInput(event) {
    if (!event.target.matches("#schedule-notes-input")) return;
    state.scheduleNotes = event.target.value;
  }

  async function handleInquirySubmit(event) {
    if (!event.target.matches("#inquiry-form")) return;
    event.preventDefault();
    if (state.submitting || state.submitted) return;

    const input = document.getElementById("contact-input");
    const checkbox = document.getElementById("consent-checkbox");
    if (!input || !checkbox) return;

    const contact = state.payload ? state.payload.contact : normalizeContact(input.value);
    state.contact = contact || input.value;
    state.consent = checkbox.checked;

    if (!contact) {
      setContactError(true);
      window.requestAnimationFrame(() => input.focus());
      return;
    }

    if (!state.consent) {
      syncSubmitAvailability();
      return;
    }

    setContactError(false);
    input.value = contact;
    const nameInput = document.getElementById("preferred-name-input");
    if (!state.payload && nameInput) handleFieldBlur({ target: nameInput });
    const recommendation = getRecommendation();
    const payload = state.payload || {
      inquiry_id: crypto.randomUUID(),
      // Retained for compatibility with the original receiver.
      timestamp: new Date().toISOString(),
      preferred_name: state.preferredName.trim() || "Anonymous",
      name_case: "preserve",
      client_type: state.answers.client,
      goal: state.answers.goal,
      format: state.answers.format,
      schedule: state.answers.schedule,
      schedule_notes: state.scheduleNotes.trim() || "None specified",
      recommended_service: recommendation.title,
      contact: state.contact.trim(),
      referral: state.referral || "unspecified",
      consent: true,
      privacy_version: PRIVACY_VERSION,
      website: document.getElementById("website-input")?.value || ""
    };
    state.payload = Object.freeze(payload);

    state.submitting = true;
    setSubmittingState();

    let result;
    try {
      result = await postInquiry(payload);
    } catch {
      // Unexpected browser restrictions must not leave the form stuck as busy.
      result = { status: "unverified" };
    }

    state.submitting = false;
    state.submitted = result.status === "confirmed";
    state.deliveryMode = result.status;
    state.receivedAt = result.received_at || null;
    state.payload = payload;
    const editButton = document.querySelector('[data-action="edit-answers"]');
    if (editButton) editButton.disabled = false;
    showSubmissionStatus(state.submitted ? "Confirmed: natanggap ang inquiry. Hindi pa naka-book ang appointment."
      : state.deliveryMode === "failed" ? "Failed: hindi tinanggap ng server ang pagtatangkang ito."
      : "Unverified: hindi makumpirma kung natanggap ang inquiry.");
    renderSuccess();
  }

  async function postInquiry(payload) {
    const attempt = crypto.randomUUID();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        credentials: "omit",
        redirect: "follow",
        body: JSON.stringify({ ...payload, attempt_id: attempt }),
        signal: controller.signal
      });
      // An opaque POST is never evidence of storage.
    } catch {
      // Even an aborted POST may have committed. Always check the ledger.
    } finally {
      window.clearTimeout(timeout);
    }
    for (let index = 0; index < 3; index++) {
      const result = await lookupReceipt(payload.inquiry_id, attempt);
      if (result.status !== "unverified") return result;
      if (index < 2) await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    return { status: "unverified" };
  }

  // Read-only JSONP works with Apps Script redirects without a proxy or CORS.
  // Only correlation UUIDs are sent, never contact data or server credentials.
  function lookupReceipt(id, attempt) {
    return new Promise((resolve) => {
      const callback = "__serviceRouteReceipt_" + crypto.randomUUID().replaceAll("-", "");
      const script = document.createElement("script");
      let settled = false;
      let timeout;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        script.remove();
        delete window[callback];
        resolve(result);
      };
      window[callback] = (result) => {
        if (!result || result.protocol !== "serviceroute-receipt-v1" ||
            result.inquiry_id !== id || !["confirmed", "unverified", "failed"].includes(result.status) ||
            (result.status === "confirmed" && (typeof result.received_at !== "string" ||
              !Number.isFinite(Date.parse(result.received_at))))) {
          finish({ status: "unverified" });
          return;
        }
        // Copy only the public receipt fields; never render arbitrary server data.
        finish({ status: result.status, received_at: result.status === "confirmed" ? result.received_at : undefined });
      };
      script.onerror = () => finish({ status: "unverified" });
      script.referrerPolicy = "no-referrer";
      const url = new URL(SCRIPT_URL);
      url.search = new URLSearchParams({ action: "receipt", id, attempt, callback, _: String(Date.now()) }).toString();
      script.src = url.href;
      timeout = window.setTimeout(() => finish({ status: "unverified" }), RECEIPT_TIMEOUT_MS);
      document.head.appendChild(script);
    });
  }

  function deliveryNoteMarkup() {
    if (state.deliveryMode === "failed") {
      return '<p class="delivery-note"><strong lang="en">Failed:</strong> hindi tinanggap ng server ang pagtatangkang ito. Suriin ang mga detalye o subukan muli mamaya gamit ang parehong inquiry. Hindi pa naka-book ang appointment.</p>';
    }
    if (state.deliveryMode !== "confirmed") {
      return `
        <p class="delivery-note">
          ${icon("wifiOff")}
          <span><strong lang="en">Unverified:</strong> hindi makumpirma kung na-save ang inquiry. Maaaring natanggap na ito. Kopyahin ang detalye o subukan muli ang parehong inquiry. Huwag umasa rito para sa agarang suporta.</span>
        </p>
      `;
    }

    return '<p class="delivery-note"><strong lang="en">Confirmed:</strong> natiyak ng server na naka-save ang inquiry. Pagtanggap lang ito ng inquiry, hindi kumpirmasyon ng appointment. Hintayin ang clinic na magkumpirma ng available na schedule.</p>';
  }

  function renderSuccess() {
    const mount = document.getElementById("inquiry-mount");
    if (!mount) return;

    mount.innerHTML = `
      <section class="success-card" aria-labelledby="success-title">
        <h2 class="success-title" id="success-title" tabindex="-1" lang="en">${state.submitted ? "Inquiry Confirmed" : state.deliveryMode === "failed" ? "Submission Failed" : "Submission Unverified"}</h2>
        <p class="success-message">${state.submitted ? "Salamat. Natanggap ang inquiry mo para sa pag-aayos ng appointment." : "Walang garantisadong follow-up hangga’t hindi kinukumpirma ng clinic ang pagtanggap."}</p>
        <p>Inquiry ID: <strong>${escapeHTML(state.payload.inquiry_id)}</strong></p>
        ${deliveryNoteMarkup()}
        <div class="success-actions">
          ${!state.submitted ? '<button type="button" class="button button-primary" data-action="retry-inquiry">Ipadala muli ang parehong inquiry</button>' : ""}
          <button type="button" class="button button-secondary" data-action="copy-inquiry">
            Kopyahin ang detalye
          </button>
          <button type="button" class="button success-start" data-action="start-over">
            Magsimula ulit
          </button>
        </div>
      </section>
    `;

    document.title = `${state.submitted ? "Inquiry Confirmed" : state.deliveryMode === "failed" ? "Submission Failed" : "Submission Unverified"} | ServiceRoute`;
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

    let submittedAt = "Not confirmed";
    if (payload.timestamp) {
      submittedAt = new Date(payload.timestamp).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila"
      });
    }

    return [
      "ServiceRoute — Detalye ng inquiry",
      `Inquiry ID: ${payload.inquiry_id}`,
      `Katayuan: ${state.deliveryMode || "unverified"}`,
      `Inihanda (oras ng browser, Asia/Manila): ${submittedAt}`,
      `Natanggap ng server: ${state.receivedAt || "Hindi pa beripikado"}`,
      "",
      `Pangalan: ${payload.preferred_name || "Anonymous"}`,
      `Para kanino: ${getAnswerLabel("client", payload.client_type)}`,
      `Layunin: ${getAnswerLabel("goal", payload.goal)}`,
      `Format: ${getAnswerLabel("format", payload.format)}`,
      `Gustong schedule: ${getAnswerLabel("schedule", payload.schedule)}`,
      `Dagdag na araw o oras: ${payload.schedule_notes || "Walang tinukoy"}`,
      `Mungkahing serbisyo: ${payload.recommended_service}`,
      `Contact: ${payload.contact}`,
      `Referral: ${payload.referral || "Direct / Unspecified"}`,
      "",
      `Pahintulot: ${payload.consent}; bersiyon ng privacy notice: ${payload.privacy_version}`
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
      window.prompt("Kopyahin ang detalye ng inquiry:", summary);
      return;
    }

    showToast("Nakopya ang detalye ng inquiry sa clipboard.");
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
      if (event.target.matches('input[name="referral"]')) {
        state.referral = event.target.value;
      }
      handleConsentChange(event);
    });

    dom.stepRoot.addEventListener("input", handleContactInput);
    dom.stepRoot.addEventListener("input", handlePreferredNameInput);
    dom.stepRoot.addEventListener("input", handleScheduleNotesInput);
    dom.stepRoot.addEventListener("blur", handleFieldBlur, true);
    dom.stepRoot.addEventListener("submit", handleInquirySubmit);

    dom.stepRoot.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        const action = actionButton.dataset.action;
        if (action === "edit-answers") editAnswers();
        if (action === "copy-inquiry") copyInquiryDetails();
        if (action === "start-over") resetIntake();
        if (action === "retry-inquiry" && !state.submitting) {
          renderResult({ focus: false, scroll: false });
          handleInquirySubmit({
            target: document.getElementById("inquiry-form"),
            preventDefault() {}
          });
        }
        return;
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
