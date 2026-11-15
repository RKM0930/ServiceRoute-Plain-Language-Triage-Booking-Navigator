// Endpoint-free demo runtime. Only radio choices in page memory; no storage or transport.
const ui = globalThis.ServiceRouteI18n;
const root = document.getElementById("step-root");
const dialog = document.getElementById("crisis-modal");
const answers = {};
let step = 1;
let result = false;
let urgentAcknowledged = false;
let returnFocus;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const dock = document.createElement("nav");
dock.className = "action-dock";
dock.setAttribute("aria-label", "Mga hakbang sa intake");
document.body.classList.add("has-dock");
document.body.append(dock);

function render(focus = true) {
  const current = STEPS[step];
  if (!result) {
    root.innerHTML = `<section class="step-panel" aria-labelledby="step-title">
      <h2 class="step-title" id="step-title" tabindex="-1">${escapeHTML(current.title)}</h2>
      <p class="step-helper" id="step-helper">${escapeHTML(current.helper)}</p>
      <fieldset class="service-options" aria-describedby="step-helper">
        <legend class="sr-only">${escapeHTML(current.title)} — pumili ng isang sagot</legend>
        ${current.options.map((option) => `<label class="option-card${answers[current.id] === option.value ? " is-selected" : ""}">
          <input class="option-input" type="radio" name="${current.id}" value="${option.value}" ${answers[current.id] === option.value ? "checked" : ""}>
          <span><span class="option-title">${escapeHTML(option.title)}</span>
          <span class="option-detail">${escapeHTML(option.detail)}</span></span>
        </label>`).join("")}
      </fieldset></section>`;
  } else {
    const service = getRecommendation(answers);
    root.innerHTML = `<section class="result-panel" aria-labelledby="result-heading">
      <article class="service-card">
        <h2 class="result-title" id="result-heading" tabindex="-1">${escapeHTML(service.title)}</h2>
        <p class="result-intro">${escapeHTML(service.description)}</p>
        <p>Mungkahing serbisyo batay sa sagot mo, hindi clinical diagnosis.</p>
      </article>
      <section class="service-card" aria-labelledby="demo-result">
        <h3 id="demo-result">Demo Mode</h3>
        <p>Sinusubukan mo ang demonstrasyon ng ServiceRoute. Hindi ipinapadala o sine-save ang iyong mga sagot. Sa aktuwal na app, susuriin muna ng clinic ang inquiry bago kumpirmahin ang appointment.</p>
      </section></section>`;
  }
  dock.innerHTML = `<div class="action-dock-inner">
    <button type="button" class="button button-secondary" id="back-button" ${step === 1 && !result ? "hidden" : ""}>Bumalik</button>
    <button type="button" class="button button-primary" id="continue-button" ${!result && !answers[current.id] ? "disabled" : ""}>
      ${result ? "Magsimula muli" : step === 4 ? "Tingnan ang mungkahing serbisyo" : "Magpatuloy"}
    </button></div>`;
  const progress = result ? "Tapos na ang apat na tanong" : `Hakbang ${step} sa 4`;
  document.getElementById("progress-label").textContent = progress;
  const track = document.getElementById("progress-track");
  track.setAttribute("aria-valuenow", String(result ? 100 : step * 25));
  track.setAttribute("aria-valuetext", progress);
  document.getElementById("progress-fill").style.width = `${result ? 100 : step * 25}%`;
  ui.apply();
  if (focus) document.getElementById(result ? "result-heading" : "step-title").focus();
}
root.addEventListener("change", (event) => {
  const current = STEPS[step];
  if (!event.target.matches('input[type="radio"]') || !current.options.some((o) => o.value === event.target.value)) return;
  answers[current.id] = event.target.value;
  for (const card of root.querySelectorAll(".option-card")) {
    card.classList.toggle("is-selected", card.querySelector("input").checked);
  }
  if (current.id === "schedule") urgentAcknowledged = false;
  document.getElementById("continue-button").disabled = false;
});
dock.addEventListener("click", (event) => {
  if (event.target.closest("#back-button")) {
    if (result) result = false;
    else step = Math.max(1, step - 1);
    render();
  } else if (event.target.closest("#continue-button")) {
    if (result) {
      for (const key of Object.keys(answers)) delete answers[key];
      step = 1;
      result = false;
      urgentAcknowledged = false;
    } else if (!answers[STEPS[step].id]) return;
    else if (step < 4) step++;
    else if (answers.schedule === "asap" && !urgentAcknowledged) {
      returnFocus = document.getElementById("continue-button");
      dialog.showModal();
      return;
    } else result = true;
    render();
  }
});
document.querySelector("[data-close-modal]").addEventListener("click", () => dialog.close());
document.querySelector("[data-crisis-proceed]").addEventListener("click", () => {
  urgentAcknowledged = true;
  dialog.close();
  result = true;
  render();
});
dialog.addEventListener("close", () => {
  if (!result) returnFocus?.focus();
});
render(false);
