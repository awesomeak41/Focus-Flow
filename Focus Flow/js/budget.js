document.addEventListener("DOMContentLoaded", () => {

    /* ============================================================
       GLOBAL STATE
    ============================================================ */
    let editMode = false;
    let currentMonth = "";
    const maxRows = 10;
    const WEEK_COUNT = 4;

    /* ============================================================
       ELEMENTS
    ============================================================ */
    const overlay = document.getElementById("budgetMatrixOverlay");
    const btnOpen = document.getElementById("btnBudgetMatrix");
    const btnCancel = document.getElementById("bmCancel");
    const btnEditSave = document.getElementById("bmEditSave");

    const monthSelector = document.getElementById("bmMonthSelector");

    const fixedBody = document.getElementById("bmFixedBody");
    const fixedTotalCell = document.getElementById("bmFixedTotal");

const remainingFundRow = document.createElement("tr");
remainingFundRow.innerHTML = `
    <td><strong>Remaining Fund</strong></td>
    <td id="bmRemainingFund">0.00</td>
    <td></td>
`;
fixedBody.parentElement.querySelector("tfoot").appendChild(remainingFundRow);

    // OLD weekly single-table elements removed
    // New weekly tables are accessed by ID per week:
    // bmWeeklyBodyW1..W4, bmW1TotExp..Diff, etc. (from HTML)

    const btnAddFixed = document.getElementById("bmAddFixed");
    // No global btnAddWeekly anymore – add buttons live in each table footer

    /* ============================================================
       INCOME DETAILS
    ============================================================ */
    const incExp = document.getElementById("incExp");
    const incAct = document.getElementById("incAct");
    const incDiff = document.getElementById("incDiff");

    // Assuming these are defined globally in HTML as before
    const w1Exp = document.getElementById("w1Exp");
    const w1Act = document.getElementById("w1Act");
    const w1Diff = document.getElementById("w1Diff");

    const w2Exp = document.getElementById("w2Exp");
    const w2Act = document.getElementById("w2Act");
    const w2Diff = document.getElementById("w2Diff");

    const w3Exp = document.getElementById("w3Exp");
    const w3Act = document.getElementById("w3Act");
    const w3Diff = document.getElementById("w3Diff");

    const w4Exp = document.getElementById("w4Exp");
    const w4Act = document.getElementById("w4Act");
    const w4Diff = document.getElementById("w4Diff");

    const othExp = document.getElementById("othExp");
    const othAct = document.getElementById("othAct");
    const othDiff = document.getElementById("othDiff");

    const incomeRows = {
        income: { exp: incExp, act: incAct, diff: incDiff },
        w1: { exp: w1Exp, act: w1Act, diff: w1Diff },
        w2: { exp: w2Exp, act: w2Act, diff: w2Diff },
        w3: { exp: w3Exp, act: w3Act, diff: w3Diff },
        w4: { exp: w4Exp, act: w4Act, diff: w4Diff },
        oth: { exp: othExp, act: othAct, diff: othDiff }
    };

    function calcIncomeDiff(row) {
        const expVal = row.exp.tagName === "INPUT" ? parseFloat(row.exp.value) || 0 : parseFloat(row.exp.textContent) || 0;
        const actVal = row.act.tagName === "INPUT" ? parseFloat(row.act.value) || 0 : parseFloat(row.act.textContent) || 0;
        const diff = actVal - expVal;

        row.diff.textContent = diff.toFixed(2);
        row.diff.classList.remove("positive", "negative");
        if (diff > 0) row.diff.classList.add("positive");
        if (diff < 0) row.diff.classList.add("negative");
    }

    function updateIncomeTotals() {
        let totalExp = 0, totalAct = 0;

        ["w1", "w2", "w3", "w4", "oth"].forEach(key => {
            const row = incomeRows[key];
            const expVal = parseFloat(row.exp.value) || 0;
            const actVal = parseFloat(row.act.value) || 0;

            totalExp += expVal;
            totalAct += actVal;

            calcIncomeDiff(row);
        });

        incExp.textContent = totalExp.toFixed(2);
        incAct.textContent = totalAct.toFixed(2);

        const diff = totalAct - totalExp;
        incDiff.textContent = diff.toFixed(2);
        incDiff.classList.remove("positive", "negative");
        if (diff > 0) incDiff.classList.add("positive");
        if (diff < 0) incDiff.classList.add("negative");

        updateRemainingFund();
    }

    ["w1", "w2", "w3", "w4", "oth"].forEach(key => {
        incomeRows[key].exp.addEventListener("input", updateIncomeTotals);
        incomeRows[key].act.addEventListener("input", updateIncomeTotals);
    });

    /* ============================================================
       POPUP OPEN/CLOSE
    ============================================================ */
    btnOpen.addEventListener("click", () => overlay.style.display = "flex");
    btnCancel.addEventListener("click", () => overlay.style.display = "none");

    /* ============================================================
       EDIT / SAVE MODE
    ============================================================ */
    function setEditMode(on) {
        editMode = on;

        overlay.querySelectorAll("input, select").forEach(el => el.disabled = !on);

        monthSelector.disabled = false;

        btnAddFixed.disabled = !on;

        // Weekly delete buttons + add buttons
        overlay.querySelectorAll(".bm-delete-weekly").forEach(btn => {
            btn.style.display = on ? "" : "none";
        });
        overlay.querySelectorAll(".bm-add-btn").forEach(btn => {
            btn.disabled = !on;
        });

        overlay.querySelectorAll(".bm-delete-fixed")
            .forEach(btn => btn.style.display = on ? "" : "none");

        btnEditSave.textContent = on ? "Save" : "Edit";
    }

    btnEditSave.addEventListener("click", () => {
        if (!editMode) {
            if (!currentMonth) return;
            setEditMode(true);
        } else {
            saveMonthData();
            setEditMode(false);
        }
    });

    /* ============================================================
       MONTH SELECTION
    ============================================================ */
    monthSelector.addEventListener("change", () => {
        currentMonth = monthSelector.value;
        if (!currentMonth) return;

        loadMonthData();

        const data = JSON.parse(localStorage.getItem(monthKey()) || "{}");
        loadAllWeeks(data, currentMonth);

        setEditMode(editMode);
    });

    /* ============================================================
       CATEGORY DROPDOWN (CATEGORY ENGINE)
    ============================================================ */
    function getCategoryList() {
        const raw = JSON.parse(localStorage.getItem("categories") || "[]");

        const categories = new Set();
        const subcategories = new Set();
        const heads = [];

        raw.forEach(item => {
            const cat = item.category?.trim();
            const sub = item.subCategory?.trim();
            const head = item.name?.trim();

            if (cat) categories.add(cat);
            if (cat && sub) subcategories.add(`${cat} → ${sub}`);
            if (cat && sub && head) heads.push(`${cat} → ${sub} → ${head}`);
        });

        return [
            ...Array.from(categories).sort(),
            ...Array.from(subcategories).sort(),
            ...heads.sort(),
            "Manual Entry"
        ];
    }

    function populateDropdown(sel) {
        const list = getCategoryList();
        sel.innerHTML = "";
        list.forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            sel.appendChild(opt);
        });
    }

    /* ============================================================
       MANUAL ENTRY
    ============================================================ */
    function handleManualEntry(selectEl) {
        if (selectEl.value === "Manual Entry") {
            const custom = prompt("Enter custom label:");
            if (custom && custom.trim() !== "") {
                const label = custom.trim();
                const opt = document.createElement("option");
                opt.value = label;
                opt.textContent = label;
                selectEl.appendChild(opt);
                selectEl.value = label;
            } else {
                selectEl.value = "";
            }
        }
    }

    /* ============================================================
       FIXED EXPENSES
    ============================================================ */
    btnAddFixed.addEventListener("click", () => {
        if (!editMode) return;
        if (fixedBody.children.length >= maxRows) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><select class="bm-input bm-expense-dropdown"></select></td>
            <td><input type="number" class="bm-input bm-no-arrows bm-fixed-amount"></td>
            <td><button type="button" class="bm-delete-fixed">❌</button></td>
        `;
        fixedBody.appendChild(row);

        const sel = row.querySelector("select");
        populateDropdown(sel);
        attachFixedListeners();

        setEditMode(editMode);
    });

    function attachFixedListeners() {
        fixedBody.querySelectorAll(".bm-fixed-amount").forEach(inp => {
            inp.oninput = () => {
                updateFixedTotal();
                updateRemainingFund();
            };
        });

        fixedBody.querySelectorAll(".bm-expense-dropdown").forEach(sel => {
            sel.onchange = () => handleManualEntry(sel);
        });

        attachDeleteFixedButtons();
    }

    function attachDeleteFixedButtons() {
        fixedBody.querySelectorAll(".bm-delete-fixed").forEach(btn => {
            btn.onclick = () => {
                if (!editMode) return;
                if (confirm("Are you sure you want to delete this fixed expense?")) {
                    btn.closest("tr").remove();
                    updateFixedTotal();
                    updateRemainingFund();
                }
            };
        });
    }

    function updateFixedTotal() {
        let total = 0;
        fixedBody.querySelectorAll("tr").forEach(row => {
            const inp = row.querySelector(".bm-fixed-amount");
            if (!inp) return;
            total += parseFloat(inp.value) || 0;
        });
        fixedTotalCell.textContent = total.toFixed(2);
    }

    function updateRemainingFund() {
      const income = parseFloat(incAct.textContent) || 0;
        const fixed = parseFloat(fixedTotalCell.textContent) || 0;
        document.getElementById("bmRemainingFund").textContent = (income - fixed).toFixed(2);
    }

    /* ============================================================
       WEEKLY EXPENSES — 4 TABLES (Week 1–4)
       (New system, replaces old single-week logic)
    ============================================================ */

    function loadAllWeeks(data, currentMonth) {
        if (!data.weeks) data.weeks = {};

        for (let w = 1; w <= WEEK_COUNT; w++) {
            if (!data.weeks[`week${w}`]) {
                data.weeks[`week${w}`] = { rows: [] };
            }

            renderWeek(w, data, currentMonth);
            attachWeekListeners(w, data, currentMonth);
            updateWeekTotals(w, data, currentMonth);
        }
    }

    function saveAllWeeks(data) {
        if (!data.weeks) data.weeks = {};

        for (let w = 1; w <= WEEK_COUNT; w++) {
            const tbody = document.getElementById(`bmWeeklyBodyW${w}`);
            const rows = [...tbody.querySelectorAll("tr")];

            const weekKey = `week${w}`;
            data.weeks[weekKey] = {
                rows: [],
                totExp: document.getElementById(`bmW${w}TotExp`).textContent || "0.00",
                totAct: document.getElementById(`bmW${w}TotAct`).textContent || "0.00",
                totMon: document.getElementById(`bmW${w}TotMon`).textContent || "0.00",
                totDiff: document.getElementById(`bmW${w}TotDiff`).textContent || "0.00"
            };

            rows.forEach(row => {
                const sel = row.querySelector(".bm-expense-dropdown");
                const mon = row.querySelector(".bm-week-month");
                if (!sel || !mon) return;
                data.weeks[weekKey].rows.push({
                    category: sel.value,
                    monthly: mon.value
                });
            });
        }
    }

    function renderWeek(week, data, currentMonth) {
        const tbody = document.getElementById(`bmWeeklyBodyW${week}`);
        tbody.innerHTML = "";

        const savedWeek = data.weeks[`week${week}`];
        const savedRows = savedWeek && savedWeek.rows ? savedWeek.rows : [];

        if (savedRows.length === 0) {
            addWeeklyRow(week);
            return;
        }

        savedRows.forEach(item => {
            addWeeklyRow(week, item.category, item.monthly);
        });
    }

    function addWeeklyRow(week, type = "", monthly = "") {
        const tbody = document.getElementById(`bmWeeklyBodyW${week}`);
        if (tbody.children.length >= maxRows) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <select class="bm-input bm-expense-dropdown"></select>
            </td>
            <td class="bm-week-exp"></td>
            <td class="bm-week-act"></td>
            <td>
                <input type="number" class="bm-input bm-no-arrows bm-week-month" value="${monthly}">
            </td>
            <td class="bm-diff bm-week-diff"></td>
            <td class="bm-action">
                <button type="button" class="bm-delete-weekly">❌</button>
            </td>
        `;

        tbody.appendChild(tr);

        const sel = tr.querySelector(".bm-expense-dropdown");
        populateDropdown(sel);
        if (type) sel.value = type;

        // Manual entry + recalc handled in attachWeekListeners
    }

    function attachWeekListeners(week, data, currentMonth) {
        const tbody = document.getElementById(`bmWeeklyBodyW${week}`);
        const footerCell = document.querySelector(`#bmWeeklyTableW${week} tfoot td:last-child`);

        // Insert ➕ button inside footer
        footerCell.innerHTML = `<button type="button" class="bm-add-btn">➕</button>`;

        const addBtn = footerCell.querySelector(".bm-add-btn");
        addBtn.onclick = () => {
            if (!editMode) return;
            addWeeklyRow(week);
            attachWeekListeners(week, data, currentMonth);
            updateWeekTotals(week, data, currentMonth);
            setEditMode(editMode);
        };

        tbody.querySelectorAll("tr").forEach(row => {
            const dropdown = row.querySelector(".bm-expense-dropdown");
            const monthlyInput = row.querySelector(".bm-week-month");
            const deleteBtn = row.querySelector(".bm-delete-weekly");

            dropdown.onchange = () => {
                handleManualEntry(dropdown);
                updateWeekTotals(week, data, currentMonth);
            };

            monthlyInput.oninput = () => {
                updateWeekTotals(week, data, currentMonth);
            };

            deleteBtn.onclick = () => {
                if (!editMode) return;
                if (confirm("Are you sure you want to delete this weekly row?")) {
                    row.remove();
                    updateWeekTotals(week, data, currentMonth);
                }
            };
        });
    }

    function updateWeekTotals(week, data, currentMonth) {
        const tbody = document.getElementById(`bmWeeklyBodyW${week}`);
        const rows = [...tbody.querySelectorAll("tr")];

        let totalExpected = 0;
        let totalAcquired = 0;
        let totalMonthly = 0;
        let totalDiff = 0;

        rows.forEach(row => {
            const sel = row.querySelector(".bm-expense-dropdown");
            const expCell = row.querySelector(".bm-week-exp");
            const actCell = row.querySelector(".bm-week-act");
            const monInput = row.querySelector(".bm-week-month");
            const diffCell = row.querySelector(".bm-week-diff");

            if (!sel || !expCell || !actCell || !monInput || !diffCell) return;

            const monthly = parseFloat(monInput.value) || 0;
            const expected = monthly / 4;
            expCell.textContent = expected.toFixed(2);

            const acquired = currentMonth
                ? getAcquiredFor(sel.value, currentMonth, `week${week}`)
                : 0;
            actCell.textContent = acquired.toFixed(2);

            const diff = expected - acquired;
            diffCell.textContent = diff.toFixed(2);
            diffCell.classList.toggle("positive", diff > 0);
            diffCell.classList.toggle("negative", diff < 0);

            totalExpected += expected;
            totalAcquired += acquired;
            totalMonthly += monthly;
            totalDiff += diff;
        });

        document.getElementById(`bmW${week}TotExp`).textContent = totalExpected.toFixed(2);
        document.getElementById(`bmW${week}TotAct`).textContent = totalAcquired.toFixed(2);
        document.getElementById(`bmW${week}TotMon`).textContent = totalMonthly.toFixed(2);
        document.getElementById(`bmW${week}TotDiff`).textContent = totalDiff.toFixed(2);
    }

    /* ============================================================
       SAVE / LOAD MONTH DATA
    ============================================================ */
    function monthKey() {
        return `budget_${currentMonth}`;
    }

    function saveMonthData() {
        const data = { fixed: [], weeks: {}, income: {} };

        // Fixed
        fixedBody.querySelectorAll("tr").forEach(row => {
            const sel = row.querySelector("select");
            const amt = row.querySelector(".bm-fixed-amount");
            if (!sel || !amt) return;
            data.fixed.push({
                category: sel.value,
                amount: amt.value
            });
        });

        // Weekly (all 4 weeks)
        saveAllWeeks(data);

        // Income
        data.income = {
            w1: { exp: w1Exp.value, act: w1Act.value },
            w2: { exp: w2Exp.value, act: w2Act.value },
            w3: { exp: w3Exp.value, act: w3Act.value },
            w4: { exp: w4Exp.value, act: w4Act.value },
            oth: { exp: othExp.value, act: othAct.value }
        };

        localStorage.setItem(monthKey(), JSON.stringify(data));
    }

    function loadMonthData() {
        const data = JSON.parse(localStorage.getItem(monthKey()) || "{}");

        // Fixed
        fixedBody.innerHTML = "";
        if (data.fixed && data.fixed.length > 0) {
            data.fixed.forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><select class="bm-input bm-expense-dropdown"></select></td>
                    <td><input type="number" class="bm-input bm-no-arrows bm-fixed-amount" value="${item.amount}"></td>
                    <td><button type="button" class="bm-delete-fixed">❌</button></td>
                `;
                fixedBody.appendChild(row);
                const sel = row.querySelector("select");
                populateDropdown(sel);
                sel.value = item.category;
            });
        } else {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><select class="bm-input bm-expense-dropdown"></select></td>
                <td><input type="number" class="bm-input bm-no-arrows bm-fixed-amount"></td>
                <td><button type="button" class="bm-delete-fixed">❌</button></td>
            `;
            fixedBody.appendChild(row);
            const sel = row.querySelector("select");
            populateDropdown(sel);
        }

        // Income
        if (data.income) {
            w1Exp.value = data.income.w1?.exp || "";
            w1Act.value = data.income.w1?.act || "";

            w2Exp.value = data.income.w2?.exp || "";
            w2Act.value = data.income.w2?.act || "";

            w3Exp.value = data.income.w3?.exp || "";
            w3Act.value = data.income.w3?.act || "";

            w4Exp.value = data.income.w4?.exp || "";
            w4Act.value = data.income.w4?.act || "";

            othExp.value = data.income.oth?.exp || "";
            othAct.value = data.income.oth?.act || "";
        }

        updateIncomeTotals();
        attachFixedListeners();
        updateFixedTotal();
        updateRemainingFund();
        setEditMode(editMode);

        // Weekly tables are loaded in monthSelector change via loadAllWeeks()
        if (currentMonth) {
            loadAllWeeks(data, currentMonth);
        }
    }

    /* ============================================================
       INITIAL CALC + INITIAL MODE
    ============================================================ */
    updateIncomeTotals();
    // loadMonthData will be meaningful once a month is selected
    loadMonthData();
    updateFixedTotal();
    updateRemainingFund();
    setEditMode(false);

});