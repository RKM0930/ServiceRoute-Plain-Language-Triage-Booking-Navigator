/* Local gettext-style presentation dictionary. Never translates inputs or payloads. */
"use strict";
(() => {
  const en = {
    "Pumili (opsyonal)": "Choose (optional)",
    "Mga detalye ng inquiry": "Inquiry details",
    "Natanggap ang inquiry": "Inquiry Confirmed",
    "Hindi tinanggap ang inquiry": "Submission Failed",
    "Hindi pa beripikado ang inquiry": "Submission Unverified",
    "Natanggap ang inquiry | ServiceRoute": "Inquiry Confirmed | ServiceRoute",
    "Hindi tinanggap ang inquiry | ServiceRoute": "Submission Failed | ServiceRoute",
    "Hindi pa beripikado ang inquiry | ServiceRoute": "Submission Unverified | ServiceRoute",
    "Natanggap": "Confirmed",
    "Hindi tinanggap": "Failed",
    "Natanggap:": "Confirmed:",
    "Hindi tinanggap:": "Failed:",
    "Hindi pa beripikado:": "Unverified:",
    "Psychological evaluation para sa opisyal na clearance": "Psychological Evaluation for Official Clearance",
    "Komprehensibong psychological assessment at testing": "Full Psychological Assessment & Testing Battery",
    "Counseling para sa mag-asawa o pamilya": "Couples / Family Counseling",
    "Indibidwal na counseling / talk therapy": "Individual Counseling / Talk Therapy",
    "Komprehensibong psychological assessment / testing": "Comprehensive Psychological Assessment / Testing",
    "Wika": "Language",
    "Pumunta sa mga tanong": "Skip to the questions",
    "Paalala para sa emergency": "Emergency notice",
    "Paalala:": "Notice:",
    "By appointment ang Kahilom, hindi emergency facility. Para sa agarang suporta, tumawag sa 24/7 NCMH Crisis Hotline:": "Kahilom is an appointment-based clinic, not an emergency facility. For immediate support, call the 24/7 NCMH Crisis Hotline:",
    "(toll-free) o": "(toll-free) or",
    "Tapos na ang apat na tanong": "All four questions completed",
    "Mga hakbang sa intake": "Intake steps",
    "Bumalik sa naunang tanong": "Go back to the previous question",
    "Bumalik": "Back",
    "Magpatuloy": "Continue",
    "Tingnan ang mungkahing serbisyo": "See suggested service",
    "Sino ang gagamit ng serbisyo?": "Who will use the service?",
    "Pumili kung para kanino ang appointment. Walang hinihinging diagnosis o medical history.": "Choose who the appointment is for. No diagnosis or medical history is requested.",
    "Para sa sarili ko (Adult, 18+)": "For myself (Adult, 18+)",
    "Personal na session para sa iyong sarili.": "An individual session for yourself.",
    "Para sa anak o menor de edad (Minor)": "For my child or a minor",
    "Magulang o guardian ang magpapasa ng inquiry.": "A parent or guardian will submit the inquiry.",
    "Para sa mag-asawa o pamilya (Couples / Family)": "For a couple or family",
    "Para sa relasyon o pamilyang gustong mag-usap nang sabay.": "For partners or family members who want to attend together.",
    "Ano ang pangunahing layunin ng appointment?": "What is the main purpose of your appointment?",
    "Tutulong ito sa pagpili ng serbisyong itatanong sa clinic. Hindi ito clinical assessment.": "This helps identify a service to ask the clinic about. It is not a clinical assessment.",
    "Counseling para sa stress, lungkot, o burnout": "Counseling for stress, sadness, or burnout",
    "Suporta sa stress, lungkot, burnout, at coping.": "Support with stress, sadness, burnout, and coping.",
    "Fit-to-Work, School, o Legal na Clearance": "Fit-to-work, school, or legal clearance",
    "Para sa trabaho, paaralan, o legal na pangangailangan.": "For employment, school, or legal requirements.",
    "Magtanong tungkol sa testing at posibleng written report.": "Ask about testing and a possible written report.",
    "Saan mo nais isagawa ang session?": "How would you prefer to attend your session?",
    "Piliin ang pinaka-komportableng paraan para sa iyo. Kokumpirmahin ng clinic ang availability.": "Choose the format you prefer. The clinic will confirm availability.",
    "Video call; kukumpirmahin ng clinic ang platform at mga kailangan.": "Video call; the clinic will confirm the platform and requirements.",
    "Face-to-Face sa Kahilom Clinic": "Face-to-face at Kahilom Clinic",
    "Sa Kahilom clinic para sa personal na session.": "An in-person session at Kahilom Clinic.",
    "Kailan mo gustong magpa-appointment?": "When would you prefer to schedule your appointment?",
    "Kailan ang iyong target na schedule?": "When would you prefer to schedule your appointment?",
    "Preference pa lamang ito. Kukumpirmahin ng clinic ang available na araw at oras.": "This is a preference only. The clinic will confirm available dates and times.",
    "Sa lalong madaling panahon": "As soon as possible",
    "Walang garantisadong agarang slot o priority. May paalala para sa agarang suporta.": "No immediate slot or priority is guaranteed. An immediate-support reminder will appear.",
    "Sabado o Linggo (Weekends)": "Saturday or Sunday (Weekends)",
    "Para sa Sabado o Linggo na available slot.": "An available Saturday or Sunday slot.",
    "Flexible / Kahit kailan may bakanteng slot": "Flexible / Any available slot",
    "Bukas sa kahit anong araw na may bakanteng oras.": "Open to any day with an available time.",
    "Para sa inquiry tungkol sa psychological evaluation para sa clearance. Kumpirmahin sa clinic ang mga dokumento at testing na kailangan.": "For inquiries about psychological evaluation for clearance. Confirm required documents and testing with the clinic.",
    "Para sa inquiry tungkol sa psychological assessment at testing. Kumpirmahin sa clinic ang saklaw, tagal, at posibleng written report.": "For inquiries about psychological assessment and testing. Confirm the scope, duration, and possible written report with the clinic.",
    "Para sa counseling na may kinalaman sa relasyon o pamilya. Kumpirmahin sa clinic ang mga kalahok, format, at tagal ng session.": "For counseling related to relationships or family. Confirm participants, format, and session duration with the clinic.",
    "Para sa individual counseling tungkol sa coping at mga pinagdaraanan. Hindi ito emergency care o awtomatikong clearance.": "For individual counseling about coping and personal concerns. This is not emergency care or automatic clearance.",
    "Mungkahing serbisyo batay sa sagot mo, hindi clinical diagnosis.": "A suggested service based on your answers, not a clinical diagnosis.",
    "Mga pinili mo": "Your preferences",
    "Online ang pinili mo. Kumpirmahin sa clinic kung may testing na kailangang gawin nang personal bago magpa-appointment.": "You selected online. Before booking, ask the clinic whether any testing must be completed in person.",
    "Baguhin ang mga sagot": "Edit answers",
    "Ipadala ang inquiry": "Submit inquiry",
    "Inquiry pa lamang ito. Hindi pa naka-book ang appointment.": "This is an inquiry only. Your appointment is not yet booked.",
    "Palayaw o Preferred Name": "Nickname or preferred name",
    "Puwedeng walang pangalan. Aayusin ang maliliit na titik sa unang pag-alis sa field; maaari mo itong baguhin.": "You may leave this blank. Simple lowercase names are capitalized on first blur; you can edit the result.",
    "Philippine mobile number o email address": "Philippine mobile number or email address",
    "0917-123-4567 o email": "0917-123-4567 or email",
    "Hal. 0917-123-4567 o +63 917 123 4567. Tinitingnan lang ang format, hindi kung aktibo o pag-aari mo ang numero.": "Examples: 0917-123-4567 or +63 917 123 4567. Only the format is checked, not whether the number is active or yours.",
    "Maglagay ng wastong 11-digit Philippine mobile number (hal. 0917-123-4567) o email address.": "Enter a valid 11-digit Philippine mobile number (e.g., 0917-123-4567) or email address.",
    "May gustong araw o oras? (Opsyonal)": "Preferred day or time? (Optional)",
    "Hal. Biyernes pagkalipas ng 5 PM": "e.g., Fridays after 5 PM",
    "Araw at oras lang. Huwag ilagay ang sintomas, diagnosis, o medical history.": "Days and times only. Do not include symptoms, diagnoses, or medical history.",
    "Saan mo nalaman ang Kahilom? (Opsyonal)": "How did you hear about Kahilom? (Optional)",
    "Rekomendasyon": "Referral",
    "Iba pa": "Other",
    "Nabasa ko ang": "I have read the",
    "privacy notice (bagong tab)": "privacy notice (new tab)",
    "at pumapayag akong gamitin ng Kahilom Psychological Services ang mga detalye ko para sa pag-aayos ng appointment, alinsunod sa Data Privacy Act of 2012 (RA 10173).": "and consent to Kahilom Psychological Services processing my details for appointment coordination under the Data Privacy Act of 2012 (RA 10173).",
    "Maaaring natanggap na ang naunang inquiry. Ang pagbago ng mga sagot ay gagawa ng bagong inquiry. Magpatuloy?": "The previous inquiry may already have been received. Editing your answers will create a new inquiry. Continue?",
    "Ipinapadala at kinukumpirma…": "Sending and checking receipt…",
    "Ipinapadala ang inquiry at tinitingnan kung natanggap ito. Sandali lang.": "Sending your inquiry and checking whether it was received. Please wait.",
    "Natanggap ang inquiry. Hindi pa naka-book ang appointment.": "Confirmed: the inquiry was received. Your appointment is not yet booked.",
    "Hindi tinanggap ng server ang pagtatangkang ito.": "Failed: the server rejected this attempt.",
    "Hindi makumpirma kung natanggap ang inquiry.": "Unverified: we could not confirm receipt of the inquiry.",
    "hindi tinanggap ng server ang pagtatangkang ito. Suriin ang mga detalye o subukan muli mamaya gamit ang parehong inquiry. Hindi pa naka-book ang appointment.": "the server rejected this attempt. Check your details or retry the same inquiry later. Your appointment is not booked.",
    "hindi makumpirma kung na-save ang inquiry. Maaaring natanggap na ito. Kopyahin ang detalye o subukan muli ang parehong inquiry. Huwag umasa rito para sa agarang suporta.": "we could not verify storage. Your inquiry may already have been received. Copy your details or retry the same inquiry. Do not rely on this for urgent support.",
    "natiyak ng server na naka-save ang inquiry. Pagtanggap lang ito ng inquiry, hindi kumpirmasyon ng appointment. Hintayin ang clinic na magkumpirma ng available na schedule.": "the server verified that your inquiry was saved. This confirms receipt only, not an appointment. Wait for the clinic to confirm an available schedule.",
    "Salamat. Natanggap ang inquiry mo para sa pag-aayos ng appointment.": "Thank you. Your inquiry was received for appointment coordination.",
    "Walang garantisadong follow-up hangga’t hindi kinukumpirma ng clinic ang pagtanggap.": "Follow-up is not guaranteed until the clinic confirms receipt.",
    "Ipadala muli ang parehong inquiry": "Retry the same inquiry",
    "Kopyahin ang detalye": "Copy inquiry details",
    "Magsimula ulit": "Start over",
    "Kopyahin ang detalye ng inquiry:": "Copy your inquiry details:",
    "Nakopya ang detalye ng inquiry sa clipboard.": "Inquiry details copied to your clipboard.",
    "ServiceRoute — Detalye ng inquiry": "ServiceRoute — Inquiry details",
    "Katayuan": "Status",
    "Inihanda (oras ng browser, Asia/Manila)": "Prepared (browser time, Asia/Manila)",
    "Natanggap ng server": "Server received at",
    "Hindi pa beripikado": "Unverified",
    "Pangalan": "Name",
    "Para kanino": "Client",
    "Layunin": "Goal",
    "Gustong schedule": "Preferred schedule",
    "Dagdag na araw o oras": "Additional days or times",
    "Mungkahing serbisyo": "Suggested service",
    "Walang tinukoy": "Not specified",
    "Pahintulot": "Consent",
    "bersiyon ng privacy notice": "privacy notice version",
    "Kailangan ng JavaScript para sa mga tanong": "JavaScript is needed for these questions",
    "I-enable ang JavaScript, o direktang makipag-ugnayan sa Kahilom Psychological Services sa kanilang beripikadong contact channel.": "Enable JavaScript, or contact Kahilom Psychological Services through its verified contact channel.",
    "Para sa pag-aayos ng inquiry lamang. Walang diagnosis o emergency care dito.": "Administrative inquiries only. This tool does not provide a diagnosis or emergency care.",
    "Gabay sa RA 10173": "RA 10173 principles",
    "· Gabay sa RA 10173": "· RA 10173 principles",
    "Isara at bumalik sa pagpili ng schedule": "Close and return to schedule preferences",
    "Paalala para sa agarang suporta": "Immediate-support reminder",
    "Kailangan ng agarang tulong?": "Need immediate support?",
    "Walang garantisadong same-day slot sa Kahilom. Ang inquiry na ito ay hindi emergency service. Kung kailangan mo ng agarang suporta, tumawag sa NCMH Crisis Hotline.": "Kahilom cannot guarantee a same-day slot. This inquiry is not an emergency service. For immediate support, call the NCMH Crisis Hotline.",
    "Tumawag sa NCMH (1553)": "Call NCMH (1553)",
    "Magpatuloy sa inquiry": "Continue to inquiry",
    "Kung nasa agarang panganib, tumawag sa lokal na emergency services.": "If you are in immediate danger, call local emergency services.",
    "Gabay sa pagpili ng serbisyong itatanong at pagpapadala ng appointment inquiry sa Kahilom Psychological Services.": "A guide to suggested services and appointment inquiries at Kahilom Psychological Services.",
    "Kahilom ServiceRoute — Gabay sa serbisyo": "Kahilom ServiceRoute — Service guide",
    "Alamin ang mungkahing serbisyo at magpadala ng inquiry sa Kahilom. Hindi ito clinical assessment o kumpirmadong appointment.": "Find a suggested service and send an inquiry to Kahilom. This is not a clinical assessment or confirmed appointment.",
    "Mungkahing Serbisyo | ServiceRoute": "Suggested Service | ServiceRoute",
    "Bumalik sa ServiceRoute": "Back to ServiceRoute",
    "Privacy notice ng ServiceRoute": "ServiceRoute privacy notice",
    "Bersiyon: 2026-11-15.1 · Na-update noong": "Version: 2026-11-15.1 · Updated on",
    "15 Nobyembre 2026": "15 November 2026",
    "Layunin at mga detalye": "Purpose and information collected",
    "Ginagamit ng Kahilom Psychological Services ang form para magmungkahi ng serbisyong itatanong at mag-ayos ng appointment inquiry. Hindi ito diagnosis, emergency support, o kumpirmadong booking.": "Kahilom Psychological Services uses this form to suggest services to ask about and coordinate appointment inquiries. It does not provide a diagnosis, emergency support, or confirmed booking.",
    "Kinokolekta ang mga piniling serbisyo at schedule, contact, opsyonal na palayaw, scheduling notes, referral source, at pahintulot sa notice na ito. Huwag maglagay ng sintomas, diagnosis, medical history, o detalye ng trauma. Maaari pa ring maging sensitibo ang impormasyong naghahanap ka ng psychological services.": "It collects service and schedule preferences, contact details, optional nickname, scheduling notes, referral source, and consent to this notice. Do not include symptoms, diagnoses, medical history, or trauma details. Seeking psychological services may itself reveal sensitive information.",
    "Pag-aayos ng format at magkaparehong inquiry": "Formatting and potentially identical inquiries",
    "Sa bagong inquiry, inaayos ang sobrang espasyo sa pangalan at naglalagay ng paunang capitalization sa simpleng lowercase na pangalan. Maaari mong baguhin ang capitalization bago ipadala. Hindi binabago ang mga pangalan sa lumang records.": "For new inquiries, excess name spacing is cleaned and simple lowercase names receive initial capitalization. You may edit capitalization before submitting. Historical names are not changed.",
    "Ang Philippine mobile number ay sine-save sa format na 0917-123-4567. Sa email, inaalis ang espasyo sa magkabilang dulo at ginagawang lowercase ang domain; pinapanatili ang capitalization bago ang @. Format lang ang sinusuri—hindi nito napapatunayang aktibo o pag-aari mo ang contact.": "Philippine mobile numbers are saved as 0917-123-4567. Emails are trimmed and their domain is lowercased; capitalization before @ is preserved. Only format is checked, not contact activity or ownership.",
    "Para sa pansamantalang cooldown at staff review, inihahambing ang magkakatumbas na contact nang hindi isinasaalang-alang ang letter case. Maaaring suriin ng awtorisadong staff ang magkaparehong contact at preferences sa loob ng 24 oras. Hindi ibig sabihin nito na iisang tao o duplicate agad ang inquiry. Walang awtomatikong pag-delete o pag-merge, at walang pampublikong abiso kung may kaparehong contact.": "Equivalent contacts are compared without letter case for temporary cooldowns and staff review. Authorized staff may review matching contacts and preferences within 24 hours. These do not establish client identity or duplication. No records are automatically deleted or merged, and no public matching-contact warning is shown.",
    "Saan napupunta ang impormasyon": "Where information goes",
    "Nasa memory ng pahina ang mga sagot hanggang umalis o mag-reload ka. Hindi inilalagay ng app ang contact sa local storage, cookies, o analytics. Maaaring may sariling autofill ang browser mo.": "Answers remain in page memory until you leave or reload. This app does not store contacts in local storage, cookies, or analytics. Your browser may retain its own autofill information.",
    "Direktang ipinapadala ng browser ang form sa Google Apps Script at sa clinic-controlled Google Sheet. Walang hiwalay na application server. Maaaring iproseso ng Google at ng website host ang teknikal na request information ayon sa kanilang terms, kabilang ang posibleng pagproseso sa labas ng Pilipinas.": "The browser sends the form directly to Google Apps Script and a clinic-controlled Google Sheet. No separate application server is required. Google and the website host may process technical request information under their terms, potentially outside the Philippines.",
    "Sa Intake worksheet naka-save ang inquiry ID, oras ng pagtanggap ng server, mungkahing serbisyo, consent at notice version, coordination status, internal request fingerprint para sa duplicate checking, at hanggang 64 accepted attempt IDs para sa receipt verification. Hindi nilalagyan ng imbentong consent ang lumang records.": "The Intake worksheet stores the inquiry ID, server receipt time, suggested service, consent and notice version, coordination status, an internal duplicate-checking fingerprint, and up to 64 accepted attempt IDs for receipt verification. Consent is not fabricated for historical records.",
    "Pagkumpirma ng pagtanggap": "Receipt confirmation",
    "Submission ID at attempt ID lang ang ipinapadala sa hiwalay na read-only receipt check. Status, protocol version, submission ID, at server timestamp lang ang ibinabalik. Walang pangalan, contact, service preferences, internal fingerprint, o credentials sa response.": "Only submission and attempt IDs are sent to the separate read-only receipt check. It returns only status, protocol version, submission ID, and server timestamp. It returns no names, contacts, service preferences, internal fingerprints, or credentials.",
    "Pampubliko ang receipt endpoint; maaaring tingnan ang status ng sinumang may parehong IDs. Huwag ipaskil ang mga ID. Maaaring kasama ang mga ID sa technical request logs. Ang retry ay gumagamit ng parehong inquiry ID para maiwasan ang dagdag na row sa updated receiver.": "The receipt endpoint is public; anyone who knows both IDs can check their status. Do not publish the IDs. Technical request logs may contain them. Retries use the same inquiry ID to avoid another row in the updated receiver.",
    ": natiyak ang naka-save na inquiry.": ": the saved inquiry was verified.",
    ": hindi makumpirma ang storage, hindi ibig sabihing nawala ang inquiry.": ": storage could not be verified; this does not mean the inquiry was lost.",
    ": hindi tinanggap ng server ang pagtatangkang iyon. Wala sa mga ito ang nagkukumpirma ng appointment. Mawawala ang in-memory retry details kapag umalis o nag-reload ka.": ": the server rejected that attempt. None of these confirms an appointment. In-memory retry details are cleared when you leave or reload.",
    "Access at retention": "Access and retention",
    "Para lamang sa awtorisadong clinic staff na nag-aayos ng inquiry at appointment, at sa providers na nagpapatakbo ng serbisyo, ang mga detalye. Huwag gumamit ng contact ng ibang tao nang walang pahintulot. Magulang o awtorisadong guardian ang dapat mag-ayos ng inquiry para sa menor de edad.": "Details are intended only for authorized clinic staff coordinating inquiries and appointments, and providers operating the service. Do not use another person's contact without permission. A parent or authorized guardian should coordinate inquiries for minors.",
    "Walang awtomatikong pag-delete ng spreadsheet records. Kailangang aprubahan ng clinic ang retention period, limitahan ang staff access, at ipatupad ang deletion process. Hindi sinasabi ng notice na ito na naipatupad na ang mga iyon.": "Spreadsheet records are not automatically deleted. The clinic must approve its retention period, restrict staff access, and implement deletion procedures. This notice does not claim these safeguards are already implemented.",
    "Mga pagpipilian at karapatan": "Your choices and rights",
    "Opsyonal ang pagpapadala. Kailangan ng contact at pahintulot para magpadala sa form. Maaari kang direktang makipag-ugnayan sa beripikadong official channel ng clinic. Ang emergency hotline ay hindi booking o privacy contact ng clinic.": "Submission is optional. Contact details and consent are required to send this form. You may contact the clinic through its verified official channels instead. The emergency hotline is not a clinic booking or privacy contact.",
    "Para humiling ng access, correction, deletion kung naaangkop, o withdrawal ng pahintulot para sa susunod na processing, makipag-ugnayan sa Kahilom sa kanilang beripikadong official channel. Isama ang inquiry ID, hindi medical details. Hindi binabawi ng withdrawal ang processing na legal nang nagawa. Maaari ring magsangguni sa Philippine National Privacy Commission.": "For access, correction, deletion where applicable, or withdrawal of consent for future processing, contact Kahilom through its verified official channel. Include your inquiry ID, not medical details. Withdrawal does not undo processing already lawfully completed. You may also contact the Philippine National Privacy Commission.",
    "Kailangang kumpirmahin ng clinic bago live use": "Clinic requirements before live use",
    "Kailangan pang ilathala rito ang beripikadong privacy contact at aprubadong retention period. Hindi sapat ang pagbanggit sa RA 10173 o consent checkbox para masabing legal na compliant ang app.": "A verified privacy contact and approved retention period must still be published here. References to RA 10173 or a consent checkbox alone do not establish legal compliance.",
    "Kailangan ding kumpirmahin ng owner ang staff access controls, deletion ng expired records at exports, provider/log retention, privacy-request process, at guardian authorization. Hindi pa nabeberipika ang mga operasyong ito; hindi iniimbento ng repository ang patakaran ng clinic.": "The owner must also confirm staff access controls, deletion of expired records and exports, provider/log retention, privacy-request procedures, and guardian authorization. These operations remain unverified; the repository does not invent clinic policy."
  };
  for (let step = 1; step <= 4; step++) {
    en[`Hakbang ${step} sa 4`] = `Step ${step} of 4`;
    en[`Hakbang ${step} sa 4 | ServiceRoute`] = `Step ${step} of 4 | ServiceRoute`;
  }
  for (const price of ["₱3,500 – ₱5,000", "₱2,000 – ₱2,800", "₱1,200 – ₱1,800"]) {
    en[`Tinatayang singil: ${price} / session. Kumpirmahin ang kasalukuyang presyo sa clinic.`] =
      `Estimated fee: ${price} / session. Confirm current prices with the clinic.`;
  }
  en["Tinatayang singil: Custom assessment rates. Kumpirmahin ang kasalukuyang presyo sa clinic."] =
    "Estimated fee: Custom assessment rates. Confirm current prices with the clinic.";
  for (const question of Object.keys(en).filter((key) => key.endsWith("?"))) {
    en[question + " — pumili ng isang sagot"] = en[question] + " — choose one answer";
  }
  const reverse = new Map(Object.entries(en).map(([fil, english]) => [english, fil]));
  const textNodes = new WeakMap();
  const attributes = new WeakMap();
  let language = new URLSearchParams(globalThis.location?.search || "").get("lang") === "en" ? "en" : "fil";
  const text = (source) => {
    const key = reverse.get(source) || source;
    return language === "en" ? (en[key] ?? key) : key;
  };
  function apply(root = document) {
    const walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest("script,style,input,textarea,noscript,[data-no-i18n]")) continue;
      const previous = textNodes.get(node);
      const raw = node.nodeValue;
      const source = previous?.last === raw ? previous.source : (reverse.get(raw.trim()) || raw.trim().replace(/\s+/g, " "));
      const translated = raw.replace(raw.trim(), text(source));
      // Preserve original surrounding whitespace, not translated markup.
      if (node.nodeValue !== translated) node.nodeValue = translated;
      textNodes.set(node, { source, last: translated });
    }
    for (const element of root.querySelectorAll("[aria-label],[aria-valuetext],[placeholder],meta[content]")) {
      let cache = attributes.get(element);
      if (!cache) { cache = {}; attributes.set(element, cache); }
      for (const name of ["aria-label", "aria-valuetext", "placeholder", "content"]) {
        if (!element.hasAttribute(name)) continue;
        const raw = element.getAttribute(name);
        const old = cache[name];
        const source = old?.last === raw ? old.source : (reverse.get(raw) || raw);
        const translated = text(source);
        if (raw !== translated) element.setAttribute(name, translated);
        cache[name] = { source, last: translated };
      }
    }
    for (const link of root.querySelectorAll('a[href^="privacy.html"],a[href^="index.html"]')) {
      const page = link.getAttribute("href").split("?")[0];
      link.setAttribute("href", page + "?lang=" + language);
    }
    document.documentElement.lang = language;
    for (const button of document.querySelectorAll("[data-language]")) {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    }
  }
  function setLanguage(value) {
    if (!["fil", "en"].includes(value)) return;
    language = value;
    apply();
  }
  globalThis.ServiceRouteI18n = {
    text, apply, setLanguage, get language() { return language; },
    translations: { fil: Object.fromEntries(Object.keys(en).map((key) => [key, key])), en }
  };
  for (const button of document.querySelectorAll("[data-language]")) {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  }
  for (const control of document.querySelectorAll(".language-selector")) control.hidden = false;
  apply();
})();
