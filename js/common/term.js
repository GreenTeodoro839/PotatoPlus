// Term code parsing + date-in-term logic.
// Shared by ehall/home.js, ehall/schedule.js, and background.js (via importScripts).

(function (root) {
  "use strict";

  function parseTermDate(value) {
    if (!value) return null;
    const s = String(value);
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  function getTermCode(row) {
    if (!row) return "";
    if (row.DM) return String(row.DM);
    if (row.XNXQDM) return String(row.XNXQDM);
    if (row.XNDM && row.XQDM) return String(row.XNDM) + "-" + String(row.XQDM);
    return "";
  }

  function toDateOnly(value) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function isInDateRange(date, range) {
    if (range.start && date < range.start) return false;
    if (range.end && date >= range.end) return false;
    return true;
  }

  function getExplicitTermRange(row) {
    const start = parseTermDate(row && row.QSSYRQ);
    const end = parseTermDate(row && row.ZZSYRQ);
    if (!start && !end) return null;
    return { start, end: end ? addDays(end, 1) : null };
  }

  // Maps a term code like "2024-2025-1" to a coarse calendar window using
  // fixed month boundaries. Returns null if the code can't be parsed.
  function getInferredTermRange(row) {
    const code = getTermCode(row);
    const match = code.match(/^(\d{4})-(\d{4})-([123])$/);
    let yearStart = match ? +match[1] : null;
    let yearEnd = match ? +match[2] : null;
    const termNo = match ? +match[3] : (row && row.XQDM ? parseInt(row.XQDM, 10) : null);

    if ((!yearStart || !yearEnd) && row && row.XNDM) {
      const ym = String(row.XNDM).match(/^(\d{4})-(\d{4})$/);
      if (ym) { yearStart = +ym[1]; yearEnd = +ym[2]; }
    }

    if (!yearStart || !yearEnd || !termNo) return null;
    if (termNo === 1) return { start: new Date(yearStart, 8, 1), end: new Date(yearEnd, 1, 1) };
    if (termNo === 2) return { start: new Date(yearEnd, 1, 1), end: new Date(yearEnd, 6, 1) };
    if (termNo === 3) return { start: new Date(yearEnd, 6, 1), end: new Date(yearEnd, 8, 1) };
    return null;
  }

  function selectCurrentTerm(rows, now) {
    const today = toDateOnly(now || new Date());
    const sortedRows = rows.slice().sort((a, b) => (a.PX || 0) - (b.PX || 0));

    for (const row of sortedRows) {
      const range = getExplicitTermRange(row);
      if (range && isInDateRange(today, range)) return row;
    }
    for (const row of sortedRows) {
      const range = getInferredTermRange(row);
      if (range && isInDateRange(today, range)) return row;
    }
    return sortedRows[0];
  }

  // Parse a term-name string ("2024-2025学年秋季学期" etc.) into a term code
  // like "2024-2025-1". Returns "" if it can't be inferred.
  function termCodeFromName(name) {
    const s = String(name || "");
    const yearMatch = s.match(/(\d{4})-(\d{4})/);
    if (!yearMatch) return "";
    const tail = s.slice(yearMatch.index + yearMatch[0].length);
    const termMatch = tail.match(/[123]/);
    const term = termMatch ? termMatch[0] : (/暑/.test(tail) ? "3" : "");
    return term ? yearMatch[1] + "-" + yearMatch[2] + "-" + term : "";
  }

  // Whether `date` falls inside the term identified by `code`.
  // Permissive on unparseable codes so unknown formats don't invalidate caches.
  function dateInTermCode(date, code) {
    const range = getInferredTermRange({ DM: code });
    if (!range) return true;
    return isInDateRange(toDateOnly(date), range);
  }

  root.pjwTerm = {
    parseTermDate,
    getTermCode,
    getExplicitTermRange,
    getInferredTermRange,
    selectCurrentTerm,
    termCodeFromName,
    dateInTermCode,
    isInDateRange,
    toDateOnly,
    addDays,
  };
})(typeof self !== "undefined" ? self : this);
