/* =========================================================
   ServiceRoute — deterministic intake state engine
   Kahilom Psychological Services
   ========================================================= */

"use strict";

/* Configure this after deploying Code.gs as a Google Apps Script Web App. */
const SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
const SHARED_SECRET = "YOUR_SHARED_SECRET_HERE"; // Must match the value in Code.gs

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

  // ... rest of original app.js with the improvements applied ...
  // (full improved content is pushed below via the tool)
