// budgetCard.js
// Expects global:
//   window.weeklyTotals = { 1: { expected, acquired, diff }, ... }
//   window.weekRanges   = { 1: { from, to }, ... }

try {
  (function () {
    const WEEKS_PER_MONTH = 4;
    const MONTH_SLOTS = 3;

    function formatMoney(value) {
      const num = Number(value || 0);
      const sign = num >= 0 ? "+" : "-";
      const abs = Math.abs(num).toFixed(2);
      return `${sign}${abs}`;
    }

    function normalizeMonthLabel(label) {
      if (!label || typeof label !== "string") return null;
      const m = label.match(/([A-Za-z]+)\s+(\d{4})/);
      if (m) return `${m[1]} ${m[2]}`;
      const cleaned = label.replace(/^\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*/g, "").trim();
      const m2 = cleaned.match(/([A-Za-z]+)\s+(\d{4})/);
      if (m2) return `${m2[1]} ${m2[2]}`;
      return cleaned || null;
    }

    function formatDateRange(range) {
      if (!range || (!range.from && !range.to)) return "—";
      const from = range.from ? String(range.from).trim() : "";
      const to = range.to ? String(range.to).trim() : "";
      if (!from && !to) return "—";
      if (from && !to) return from;
      if (!from && to) return to;
      if (from === to) return from;
      return `${from} – ${to}`;
    }

    function getRunningTotals(weeklyTotals) {
      const running = {};
      let acc = 0;
      for (let i = 1; i <= 4; i++) {
        const w = weeklyTotals && weeklyTotals[i];
        if (!w) {
          running[i] = null;
          continue;
        }
        acc += Number(w.diff || 0);
        running[i] = acc;
      }
      return running;
    }

    function getMonthlyTotals(weeklyTotals, weekRanges) {
      const months = [];
      for (let m = 0; m < MONTH_SLOTS; m++) {
        const startWeek = m * WEEKS_PER_MONTH + 1;
        const endWeek = startWeek + WEEKS_PER_MONTH - 1;

        let sum = 0;
        let hasData = false;

        for (let w = startWeek; w <= endWeek; w++) {
          if (weeklyTotals && weeklyTotals[w]) {
            sum += Number(weeklyTotals[w].diff || 0);
            hasData = true;
          }
        }

        const firstRange = weekRanges && weekRanges[startWeek];
        const lastRange = weekRanges && weekRanges[endWeek];

        months.push({
          index: m + 1,
          hasData,
          total: sum,
          from: firstRange ? firstRange.from : null,
          to: lastRange ? lastRange.to : null
        });
      }
      return months;
    }

    function renderWeeklySection(runningTotals) {
      for (let i = 1; i <= 4; i++) {
        const row = document.getElementById(`budget-week-${i}`);
        if (!row) continue;

        row.innerHTML = "";

        const weekly = window.weeklyTotals ? window.weeklyTotals[i] : null;
        const range = window.weekRanges ? window.weekRanges[i] : null;
        const rangeText = formatDateRange(range);

        const label = document.createElement("span");
        label.className = "budget-card-week-label";
        label.textContent = rangeText === "—" ? `Week ${i} —` : `Week ${i} (${rangeText})`;

        const right = document.createElement("span");
        right.className = "budget-card-week-right";

        const runningSpan = document.createElement("span");
        runningSpan.className = "budget-card-week-running";

        const diffSpan = document.createElement("span");
        diffSpan.className = "budget-card-week-diff";

        if (!weekly || rangeText === "—") {
          runningSpan.textContent = "—";
          runningSpan.classList.add("budget-neutral");
          diffSpan.textContent = "—";
          diffSpan.classList.add("budget-neutral");
        } else {
          const running = runningTotals && runningTotals[i] != null ? runningTotals[i] : 0;
          const diffVal = Number(weekly.diff || 0);
          runningSpan.textContent = formatMoney(running);
          diffSpan.textContent = formatMoney(diffVal);
          diffSpan.classList.add(diffVal >= 0 ? "budget-positive" : "budget-negative");
        }

        right.appendChild(runningSpan);
        right.appendChild(diffSpan);

        row.appendChild(label);
        row.appendChild(right);
      }
    }

    function renderMonthlySection(months, activeMonthLabel) {
      const normalized = normalizeMonthLabel(activeMonthLabel);
      let baseDate = null;
      if (normalized) {
        const parts = normalized.split(" ");
        const year = Number(parts[parts.length - 1]);
        const monthName = parts.slice(0, parts.length - 1).join(" ");
        const parsed = Date.parse(`${monthName} 1, ${year}`);
        if (!isNaN(parsed)) baseDate = new Date(parsed);
      }

      months.forEach((m, idx) => {
        const row = document.getElementById(`budget-month-${idx + 1}`);
        if (!row) return;

        row.innerHTML = "";

        const label = document.createElement("span");
        label.className = "budget-card-month-label";

        if (idx === 0 && normalized) {
          label.textContent = normalized;
        } else if (baseDate) {
          const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + idx, 1);
          const monthLabel = d.toLocaleString("default", { month: "long", year: "numeric" });
          label.textContent = monthLabel;
        } else {
          const ord = m.index === 1 ? "1st" : m.index === 2 ? "2nd" : m.index === 3 ? "3rd" : `${m.index}th`;
          label.textContent = `${ord} month`;
        }

        const totalSpan = document.createElement("span");
        totalSpan.className = "budget-card-month-total";

        if (!m.hasData) {
          totalSpan.textContent = formatMoney(0);
          totalSpan.classList.add("budget-neutral");
        } else {
          totalSpan.textContent = formatMoney(m.total);
          totalSpan.classList.add(m.total >= 0 ? "budget-positive" : "budget-negative");
        }

        row.appendChild(label);
        row.appendChild(totalSpan);
      });
    }

    function renderChart() {
      const canvas = document.getElementById("budget-weekly-chart");
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext("2d");

      const diffs = [];
      for (let i = 1; i <= 4; i++) {
        const w = window.weeklyTotals ? window.weeklyTotals[i] : null;
        diffs.push(w ? Number(w.diff || 0) : 0);
      }

      const DPR = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || canvas.width || 360;
      const cssH = canvas.clientHeight || canvas.height || 140;
      canvas.width = Math.round(cssW * DPR);
      canvas.height = Math.round(cssH * DPR);
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const paddingLeft = 44;
      const paddingRight = 12;
      const paddingTop = 28;
      const paddingBottom = 40;
      const w = cssW;
      const h = cssH;

      ctx.clearRect(0, 0, w, h);

      const maxVal = Math.max(...diffs, 0);
      const minVal = Math.min(...diffs, 0);
      const span = (maxVal - minVal) || 1;
      const top = maxVal + span * 0.15;
      const bottom = minVal - span * 0.15;
      const range = top - bottom;

      ctx.font = "12px system-ui, -apple-system, 'Segoe UI', Roboto, Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#6b7280";
      const ticks = 3;
      for (let t = 0; t <= ticks; t++) {
        const frac = t / ticks;
        const value = top - frac * range;
        const y = paddingTop + frac * (h - paddingTop - paddingBottom);
        ctx.fillText(value.toFixed(2), paddingLeft - 8, y);
        ctx.strokeStyle = "#eef2f7";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(w - paddingRight, y);
        ctx.stroke();
      }

      const plotWidth = w - paddingLeft - paddingRight;
      const stepX = plotWidth / (diffs.length - 1);
      const points = diffs.map((v, idx) => {
        const x = paddingLeft + idx * stepX;
        const norm = (v - bottom) / range;
        const y = paddingTop + (1 - norm) * (h - paddingTop - paddingBottom);
        return { x, y, v };
      });

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#374151";
      ctx.font = "12px system-ui, -apple-system, 'Segoe UI', Roboto, Arial";
      points.forEach((p, i) => {
        ctx.fillText(`W${i + 1}`, p.x, h - paddingBottom + 8);
      });

      if (bottom <= 0 && top >= 0) {
        const zeroFrac = (top - 0) / range;
        const zeroY = paddingTop + zeroFrac * (h - paddingTop - paddingBottom);
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, zeroY);
        ctx.lineTo(w - paddingRight, zeroY);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(points[points.length - 1].x, h - paddingBottom);
      ctx.lineTo(points[0].x, h - paddingBottom);
      ctx.closePath();
      ctx.fillStyle = "rgba(249,115,22,0.18)";
      ctx.fill();

      ctx.fillStyle = "#f97316";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.font = "11px system-ui, -apple-system, 'Segoe UI', Roboto, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      let lastLabelTop = -Infinity;

      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        const txt = formatMoney(p.v);
        const metrics = ctx.measureText(txt);
        const txtW = metrics.width;
        const txtH = 12;

        let labelX = p.x;
        let labelY = p.y - 8;

        const minLabelY = paddingTop + txtH / 2;
        if (labelY - txtH < minLabelY) labelY = minLabelY + txtH;

        if (labelY + txtH > lastLabelTop - 4) {
          labelY = lastLabelTop - txtH - 8;
          if (labelY - txtH < minLabelY) labelY = minLabelY + txtH;
        }

        const pad = 6;
        const rectX = labelX - txtW / 2 - pad / 2;
        const rectY = labelY - txtH - pad / 2;
        const rectW = txtW + pad;
        const rectH = txtH + pad / 2;

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        roundRect(ctx, rectX, rectY, rectW, rectH, 4);
        ctx.fill();

        ctx.fillStyle = "#111827";
        ctx.fillText(txt, labelX, labelY - 4);

        lastLabelTop = rectY;
        ctx.fillStyle = "#f97316";
      });

      function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
      }
    }

    function setPeriodLabel(label) {
      const el = document.getElementById("budget-card-period");
      const normalized = normalizeMonthLabel(label);
      if (!el) return;
      el.textContent = normalized || "";
    }

    window.budgetCardUpdatePeriod = function (options) {
      const periodLabel = options && options.periodLabel ? options.periodLabel : null;
      const running = getRunningTotals(window.weeklyTotals || {});
      const months = getMonthlyTotals(window.weeklyTotals || {}, window.weekRanges || {});
      setPeriodLabel(periodLabel);
      renderWeeklySection(running);
      renderMonthlySection(months, periodLabel);
      renderChart();
    };

    document.addEventListener("DOMContentLoaded", function () {
      if (window.weeklyTotals && window.weekRanges) {
        window.budgetCardUpdatePeriod({ periodLabel: "March 2026" });
      }
    });

    // --- Budget History controller (runs after DOM ready) ---
    document.addEventListener("DOMContentLoaded", function () {
      const btnMore = document.getElementById("btnBudgetMore");
      const overlay = document.getElementById("budgetHistoryOverlay");
      const body = document.getElementById("budgetHistoryBody");
      const btnClose = document.getElementById("budgetHistoryClose");
      const btnLoadMore = document.getElementById("budgetHistoryLoadMore");

      if (!btnMore || !overlay || !body || !btnClose || !btnLoadMore) {
        // Required elements missing — do nothing silently
        return;
      }

      let monthsToShow = 12; // initial
      const cached = {}; // { "2026-03": { monthTotal, weeks: [...] } }

      // Helper: normalize transaction date "dd-mm-yyyy" -> { y,m,d } or null
      function parseTxnDateParts(dateStr) {
        if (!dateStr || !/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return null;
        const [d, m, y] = dateStr.split("-").map(Number);
        return { y, m, d };
      }

      // Build a transaction index: txIndex[YYYY-MM][weekN] = { total: number, byHead: { head: sum } }
      function buildTransactionIndex() {
        const txns = JSON.parse(localStorage.getItem("transactions") || "[]");
        const idx = {}; // month -> week -> { total, byHead }
        txns.forEach(t => {
          const parts = parseTxnDateParts(t.date);
          if (!parts) return;
          const monthKey = `${parts.y}-${String(parts.m).padStart(2, "0")}`;
          const day = parts.d;
          const weekNum = Math.min(Math.ceil(day / 7), 4); // 1..4
          const wkKey = `week${weekNum}`;
          idx[monthKey] = idx[monthKey] || {};
          idx[monthKey][wkKey] = idx[monthKey][wkKey] || { total: 0, byHead: {} };
          const amt = Number(t.amount) || 0;
          idx[monthKey][wkKey].total += amt;
          const head = t.head || "";
          idx[monthKey][wkKey].byHead[head] = (idx[monthKey][wkKey].byHead[head] || 0) + amt;
        });
        return idx;
      }

      function getAllMonthKeys() {
        const keys = new Set();
        // budget_YYYY-MM keys
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith("budget_")) keys.add(k.replace("budget_", ""));
        }
        // infer months from transactions
        const txns = JSON.parse(localStorage.getItem("transactions") || "[]");
        txns.forEach(t => {
          const p = parseTxnDateParts(t.date);
          if (!p) return;
          keys.add(`${p.y}-${String(p.m).padStart(2, "0")}`);
        });
        return Array.from(keys).sort((a, b) => b.localeCompare(a)); // newest first
      }

      function buildWeekRangesForMonth(monthKey) {
        const [year, month] = monthKey.split("-").map(Number);
        const first = new Date(year, month - 1, 1);
        const last = new Date(year, month, 0);
        const ranges = [];
        let start = new Date(first);
        let weekNum = 1;
        while (start <= last && weekNum <= 4) {
          let end = new Date(start);
          end.setDate(start.getDate() + 6);
          if (end > last) end = last;
          ranges.push({
            week: `week${weekNum}`,
            from: new Date(start),
            to: new Date(end)
          });
          start.setDate(start.getDate() + 7);
          weekNum++;
        }
        while (ranges.length < 4) ranges.push(null);
        return ranges;
      }

      function computeMonthSummary(monthKey, txIndex) {
        if (cached[monthKey]) return cached[monthKey];

        const budgetData = JSON.parse(localStorage.getItem(`budget_${monthKey}`) || "{}");
        const ranges = buildWeekRangesForMonth(monthKey);
        const weeks = [];
        let running = 0;

        for (let i = 0; i < 4; i++) {
          const wk = ranges[i];
          if (!wk) {
            weeks.push({ expected: null, acquired: null, diff: null, running: null, range: null });
            continue;
          }

          const wkKey = `week${i + 1}`;

          // expected: prefer stored totExp; fallback to sum(rows monthly/4) or 0
          let expected = 0;
          if (budgetData.weeks && budgetData.weeks[wkKey]) {
            expected = parseFloat(budgetData.weeks[wkKey].totExp || 0);
          } else if (budgetData.weeks && budgetData.weeks[wkKey] && Array.isArray(budgetData.weeks[wkKey].rows)) {
            // sum monthly/4 for rows if present
            expected = budgetData.weeks[wkKey].rows.reduce((s, r) => s + (parseFloat(r.monthly || 0) / 4), 0);
          } else {
            expected = 0;
          }

          // acquired: prefer getAcquiredFor per-row if available; otherwise use txIndex
          let acquired = 0;
          if (budgetData.weeks && budgetData.weeks[wkKey] && Array.isArray(budgetData.weeks[wkKey].rows) && typeof getAcquiredFor === "function") {
            budgetData.weeks[wkKey].rows.forEach(r => {
              acquired += Number(getAcquiredFor(r.category, monthKey, wkKey) || 0);
            });
          } else {
            // use txIndex month/week totals (fast)
            acquired = (txIndex[monthKey] && txIndex[monthKey][wkKey] && txIndex[monthKey][wkKey].total) || 0;
          }

          const diff = acquired - expected;
          running += diff;

          const rangeLabel = wk && wk.from && wk.to ? `${wk.from.getDate()}–${wk.to.getDate()}` : null;

          weeks.push({
            expected,
            acquired,
            diff,
            running,
            range: rangeLabel
          });
        }

        const monthTotal = weeks.reduce((s, w) => s + (w.diff || 0), 0);
        cached[monthKey] = { monthTotal, weeks };
        return cached[monthKey];
      }

      function renderMonths(limit) {
        body.innerHTML = "";
        const allKeys = getAllMonthKeys();
        if (!allKeys.length) {
          body.innerHTML = `<div style="opacity:0.7; color:#666; padding:12px;">No budget history available</div>`;
          btnLoadMore.style.display = "none";
          return;
        }
        btnLoadMore.style.display = allKeys.length > limit ? "" : "none";

        const txIndex = buildTransactionIndex();
        const keys = allKeys.slice(0, limit);
        keys.forEach(k => {
          const summary = computeMonthSummary(k, txIndex);
          const monthHeader = document.createElement("div");
          monthHeader.className = "budget-history-month";
          const d = new Date(k.split("-")[0], Number(k.split("-")[1]) - 1, 1);
          const monthLabel = d.toLocaleString("default", { month: "long", year: "numeric" });

          const headerRow = document.createElement("div");
          headerRow.style.display = "flex";
          headerRow.style.justifyContent = "space-between";
          headerRow.style.alignItems = "center";
          headerRow.style.marginBottom = "6px";
          headerRow.innerHTML = `<div><strong>${monthLabel}</strong></div><div><strong>${summary.monthTotal >= 0 ? '+' : ''}${summary.monthTotal.toFixed(2)}</strong></div>`;

          const table = document.createElement("table");
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.marginBottom = "10px";
          table.innerHTML = `
            <thead><tr style="font-weight:600; color:#666;"><th style="text-align:left">Week</th><th style="text-align:right">Expected</th><th style="text-align:right">Acquired</th><th style="text-align:right">Diff</th><th style="text-align:right">Running</th></tr></thead>
            <tbody></tbody>
          `;
          const tbody = table.querySelector("tbody");
          summary.weeks.forEach((w, idx) => {
            const tr = document.createElement("tr");
            tr.style.borderTop = "1px solid rgba(0,0,0,0.06)";
            tr.innerHTML = `
              <td style="text-align:left; padding:6px 8px">Week ${idx+1}${w.range ? ` (${w.range})` : ""}</td>
              <td style="text-align:right; padding:6px 8px">${w.expected == null ? '—' : w.expected.toFixed(2)}</td>
              <td style="text-align:right; padding:6px 8px">${w.acquired == null ? '—' : w.acquired.toFixed(2)}</td>
              <td style="text-align:right; padding:6px 8px">${w.diff == null ? '—' : (w.diff >= 0 ? '+' : '') + w.diff.toFixed(2)}</td>
              <td style="text-align:right; padding:6px 8px">${w.running == null ? '—' : (w.running >= 0 ? '+' : '') + w.running.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
          });

          monthHeader.appendChild(headerRow);
          monthHeader.appendChild(table);
          body.appendChild(monthHeader);
          body.appendChild(document.createElement("hr"));
        });
      }

      // Open overlay and render
      btnMore.addEventListener("click", () => {
        overlay.style.display = "flex";
        renderMonths(monthsToShow);
        btnClose.focus();
      });

      // Close overlay
      function closeOverlay() {
        overlay.style.display = "none";
        btnMore.focus();
      }
      btnClose.addEventListener("click", closeOverlay);

      // Load more months
      btnLoadMore.addEventListener("click", () => {
        monthsToShow += 12;
        renderMonths(monthsToShow);
      });

      // Close on Escape
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.style.display === "flex") closeOverlay();
      });
    });
  })();
} catch (err) {
  console.error("budgetCard.js failed to initialize:", err);
}