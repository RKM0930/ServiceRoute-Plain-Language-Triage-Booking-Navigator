import test from "node:test";
import assert from "node:assert/strict";
import { createReceiver, inquiry, HEADERS } from "./support/receiver.mjs";

// Exact owner-provided A1:F2 expressions, independent of the implementation.
const SIX_HEADERS = ["Date & Time (PHT)", "Preferred Name", "Contact", "Recommended Service", "Status", "Staff Notes"];
const SIX_FORMULAS = [
  '=ARRAYFORMULA(IF(Intake!A2:A="","",IFERROR(IF(ISNUMBER(Intake!A2:A),TEXT(Intake!A2:A,"dd mmm yyyy, h:mm AM/PM"),TEXT(DATEVALUE(LEFT(Intake!A2:A,10))+TIMEVALUE(MID(Intake!A2:A,12,8))+TIME(8,0,0),"dd mmm yyyy, h:mm AM/PM")),Intake!A2:A)))',
  '=ARRAYFORMULA(IF(Intake!A2:A="","",IF(Intake!B2:B="","",PROPER(Intake!B2:B))))',
  '=ARRAYFORMULA(IF(Intake!A2:A="","",IF(REGEXMATCH(TO_TEXT(Intake!I2:I),"^[0-9+(). -]+$"),IF(REGEXMATCH(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^09[0-9]{9}$"),REGEXREPLACE(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^([0-9]{4})([0-9]{3})([0-9]{4})$","$1-$2-$3"),IF(REGEXMATCH(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^[0-9]{10}$"),REGEXREPLACE(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^([0-9]{3})([0-9]{3})([0-9]{4})$","$1-$2-$3"),IF(REGEXMATCH(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^639[0-9]{9}$"),REGEXREPLACE(REGEXREPLACE(TO_TEXT(Intake!I2:I),"[^0-9]",""),"^63([0-9]{3})([0-9]{3})([0-9]{4})$","+63-$1-$2-$3"),TO_TEXT(Intake!I2:I)))),TO_TEXT(Intake!I2:I))))',
  '=ARRAYFORMULA(IF(Intake!A2:A="","",Intake!H2:H))',
  '=ARRAYFORMULA(IF(Intake!A2:A="","",Intake!K2:K))',
  '=ARRAYFORMULA(IF(Intake!A2:A="","",Intake!L2:L))'
];
const NAME_FORMULA = '=ARRAYFORMULA(IF(Intake!A2:A="","",IF(Intake!B2:B="","",Intake!B2:B)))';

const cases = [
  ["2026-11-15T01:48:00.000Z", "15 Nov 2026, 9:48 AM"],
  ["2026-11-15T16:00:00.000Z", "16 Nov 2026, 12:00 AM"],
  ["2026-11-15T04:09:59.999Z", "15 Nov 2026, 12:09 PM"],
  ["2026-01-31T23:05:00Z", "1 Feb 2026, 7:05 AM"],
  ["2026-12-31T20:01:00.000Z", "1 Jan 2027, 4:01 AM"],
  ["2024-02-29T16:10:00.000Z", "1 Mar 2024, 12:10 AM"],
  ["2026-07-01T15:59:00.000Z", "1 Jul 2026, 11:59 PM"]
];
for (const [iso, expected] of cases) {
  test(`Manila presentation: ${iso}`, () => {
    assert.equal(createReceiver().context.formatManilaTimestamp(iso), expected);
  });
}
test("empty, invalid and ambiguous timestamps render blank rather than being guessed", () => {
  const { context } = createReceiver();
  for (const value of ["", null, "15/11/2026", "2026-02-30T00:00:00Z", "2026-01-01T24:00:00Z", "2026-11-15", "garbage"]) {
    assert.equal(context.formatManilaTimestamp(value), "");
  }
});

function viewFixture(options = {}) {
  const r = createReceiver();
  // Synthetic, explicit UTC text cells; no production data is loaded.
  r.rows[1][0] = options.unsupportedTimestamp ? new Date() : "2026-01-01T00:00:00.000Z";
  r.rows[2][0] = "2026-01-02T00:00:00.000Z";
  const formulas = [Array(18).fill(""), Array(18).fill("")];
  formulas[0][0] = options.formula || "=ARRAYFORMULA(Intake!A1:R)";
  let headers = [...HEADERS, "consent", "privacy_version", "consent_recorded_at", "Request fingerprint", "Receipt attempts"];
  if (options.six) {
    formulas[0] = Array(6).fill("");
    formulas[1] = [...SIX_FORMULAS];
    headers = [...SIX_HEADERS];
    if (options.badHeader) headers[0] = "Unknown";
    if (options.mutation) formulas[1][options.mutation[0]] = options.mutation[1];
  }
  if (options.columns) {
    formulas[0][0] = "";
    for (let index = 0; index < 18; index++) {
      const letter = String.fromCharCode(65 + index);
      formulas[1][index] = `=ARRAYFORMULA(Intake!${letter}2:${letter})`;
    }
  }
  const writes = [];
  const view = {
    getMaxRows: () => options.rows || 1000,
    getMaxColumns: () => options.six ? 6 : 18,
    getRange(...args) {
      if (options.six && typeof args[0] === "number") assert.ok(args[3] <= 6);
      const row = args[0] === "A1" ? 0 : 1;
      const col = typeof args[0] === "string" ? args[0].charCodeAt(0) - 65 : 0;
      return {
        getFormulas: () => formulas.map((row) => [...row]),
        getValues: () => [[...headers]],
        getDisplayValue: () => options.spillError ||
          (options.badFormula && formulas.flat().some((formula) => formula.includes("LAMBDA"))) ||
          (options.badName && args[0] === "B2" && formulas[1][1] === NAME_FORMULA) ? "#REF!" : "",
        getFormula: () => formulas[row][col],
        setFormula(formula) {
          assert.equal(r.locked(), true);
          assert.ok(["A1", "A2", ...(options.six ? ["B2"] : [])].includes(args[0]));
          formulas[row][col] = formula;
          writes.push([args[0], formula]);
        }
      };
    }
  };
  const open = r.context.SpreadsheetApp.openById;
  r.context.SpreadsheetApp.openById = (id) => {
    const original = open(id);
    return { getSheetByName: (name) => name === "Intake View" ? (options.missing ? null : view) : original.getSheetByName(name) };
  };
  return { ...r, formulas, writes };
}

test("owner setup inspects and replaces only a supported identity anchor; second run is a no-op", () => {
  const r = viewFixture();
  const before = structuredClone(r.rows);
  const inspection = r.context.inspectIntakeViewFormatting();
  assert.equal(inspection.target, "A1");
  assert.equal(r.writes.length, 0);
  assert.equal(r.context.ensureIntakeViewFormatting().changed, true);
  assert.equal(r.context.ensureIntakeViewFormatting().changed, false);
  assert.equal(r.writes.length, 1);
  assert.deepEqual(r.rows, before);
  assert.match(r.writes[0][1], /Intake!B2:R/);
  assert.match(r.writes[0][1], /Intake!A1:R1/);
  assert.equal(r.locked(), false);
});
test("actual six-column view preflight identifies A2/B2 without writing; setup preserves C:F exactly", () => {
  const r = viewFixture({ six: true });
  const before = structuredClone(r.rows);
  const inspection = r.context.inspectIntakeViewFormatting();
  assert.equal(inspection.layout, "six-column");
  assert.equal(inspection.target, "A2");
  assert.deepEqual(Array.from(inspection.planned_changes, (change) => change.target), ["A2", "B2"]);
  assert.equal(inspection.current_formula, SIX_FORMULAS[0]);
  assert.equal(r.writes.length, 0);
  r.context.ensureIntakeViewFormatting();
  assert.equal(r.formulas[1][0], "=" + r.context.intakeViewTimestampFormula());
  assert.equal(r.formulas[1][1], NAME_FORMULA);
  assert.deepEqual(r.formulas[1].slice(2), SIX_FORMULAS.slice(2));
  assert.deepEqual(r.rows, before);
  assert.equal(r.writes.length, 2);
  assert.equal(r.context.ensureIntakeViewFormatting().changed, false);
  assert.equal(r.context.inspectIntakeViewFormatting().planned_changes.length, 0);
  assert.equal(r.writes.length, 2);
});
test("six-column setup preserves raw name casing, fingerprints and A/P through receipt retries", () => {
  for (const name of ["McDonald", "de la Cruz", "Juan Dela Cruz"]) {
    const r = viewFixture({ six: true });
    const data = inquiry({ preferred_name: name, name_case: "preserve", privacy_version: "2026-11-15.1" });
    const first = r.send(data);
    assert.equal(first.status, "confirmed");
    const before = structuredClone(r.rows);
    r.context.ensureIntakeViewFormatting();
    r.advance(60000);
    assert.equal(r.send(data).received_at, first.received_at);
    assert.equal(r.lookup(data).received_at, first.received_at);
    assert.equal(r.rows[3][1], name);
    assert.equal(r.rows[3][0], r.rows[3][15]);
    assert.deepEqual(r.rows, before);
    assert.equal(r.formulas[1][1], NAME_FORMULA);
    assert.doesNotMatch(r.formulas[1][1], /PROPER/);
  }
});
test("six-column missing, custom and malformed formulas or headers fail before any writes", () => {
  const mutations = SIX_FORMULAS.flatMap((_, index) => [
    [index, ""], [index, "=BROKEN("], [index, '=QUERY(Intake!A:R,"select *")']
  ]);
  for (const options of [
    ...mutations.map((mutation) => ({ mutation })), { badHeader: true }, { missing: true },
    { rows: 20 }, { spillError: true }, { unsupportedTimestamp: true }
  ]) {
    const r = viewFixture({ six: true, ...options });
    const before = structuredClone(r.rows);
    assert.throws(() => r.context.ensureIntakeViewFormatting());
    assert.equal(r.writes.length, 0);
    assert.deepEqual(r.rows, before);
    assert.equal(r.locked(), false);
  }
});
test("six-column failure at either anchor restores all attempted formulas, leaving C:F intact", () => {
  for (const options of [{ badFormula: true }, { badName: true }]) {
    const r = viewFixture({ six: true, ...options });
    const before = structuredClone(r.rows);
    assert.throws(() => r.context.ensureIntakeViewFormatting(), /original view formula restored/);
    assert.deepEqual(r.formulas[1], SIX_FORMULAS);
    assert.deepEqual(r.rows, before);
    assert.equal(r.locked(), false);
  }
});
test("partially upgraded six-column view changes only its remaining legacy anchor", () => {
  for (const [index, formula] of [[0, "=" + createReceiver().context.intakeViewTimestampFormula()], [1, NAME_FORMULA]]) {
    const r = viewFixture({ six: true, mutation: [index, formula] });
    r.context.ensureIntakeViewFormatting();
    assert.deepEqual(r.writes.map(([anchor]) => anchor), [index === 0 ? "B2" : "A2"]);
    assert.deepEqual(r.formulas[1].slice(2), SIX_FORMULAS.slice(2));
  }
});
test("column-specific setup preserves every unrelated view formula", () => {
  const r = viewFixture({ columns: true });
  const original = [...r.formulas[1]];
  r.context.ensureIntakeViewFormatting();
  assert.equal(r.writes[0][0], "A2");
  assert.deepEqual(r.formulas[1].slice(1), original.slice(1));
});
test("a rejected/spilling presentation formula restores the original anchor", () => {
  const r = viewFixture({ badFormula: true });
  const original = r.formulas[0][0];
  const before = structuredClone(r.rows);
  assert.throws(() => r.context.ensureIntakeViewFormatting(), /original view formula restored/);
  assert.equal(r.formulas[0][0], original);
  assert.equal(r.writes.length, 2);
  assert.deepEqual(r.rows, before);
});
test("unknown sorted/query mappings, missing tabs and insufficient capacity cause no writes", () => {
  for (const options of [
    { formula: "=QUERY(Intake!A:R,\"select * order by A desc\")" }, { missing: true },
    { rows: 20 }, { unsupportedTimestamp: true }, { spillError: true }
  ]) {
    const r = viewFixture(options);
    const before = structuredClone(r.rows);
    assert.throws(() => r.context.ensureIntakeViewFormatting());
    assert.equal(r.writes.length, 0);
    assert.deepEqual(r.rows, before);
    assert.equal(r.locked(), false);
  }
});
test("view formula uses open-ended numeric UTC parsing, explicit English months and blank/error guards", () => {
  const formula = createReceiver().context.intakeViewTimestampFormula();
  assert.match(formula, /MAP\(Intake!A2:A/);
  assert.match(formula, /utc\+8\/24/);
  assert.match(formula, /DATE\(y,mo,d\)\+TIME\(h,mi,s\)/);
  assert.match(formula, /CHOOSE\(MONTH\(local\),"Jan","Feb"/);
  assert.match(formula, /IFERROR/);
  assert.match(formula, /Z\$/);
  assert.doesNotMatch(formula, /DATEVALUE|NOW\(|TODAY\(|setNumberFormat/i);
  let depth = 0;
  let quoted = false;
  for (const char of formula) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === "(") depth++;
    else if (!quoted && char === ")") depth--;
    assert.ok(depth >= 0, "unbalanced formula");
  }
  assert.equal(depth, 0);
});
test("new submissions and UUID retries keep raw A/P timestamps and original public receipt time", () => {
  const r = viewFixture();
  r.context.ensureIntakeViewFormatting();
  const data = inquiry();
  const first = r.send(data);
  r.advance(60000);
  assert.equal(r.send(data).received_at, first.received_at);
  assert.equal(r.rows[3][0], first.received_at);
  assert.equal(r.rows[3][15], first.received_at);
  assert.equal(r.lookup(data).received_at, first.received_at);
  assert.equal(typeof r.rows[3][0], "string");
  assert.equal(r.writes.length, 1, "POST must not repair formatting");
});
