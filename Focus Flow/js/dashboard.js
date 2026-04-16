// dashboard.js
document.addEventListener("DOMContentLoaded", () => {

    // ----------------------------------------------------
    // ELEMENTS
    // ----------------------------------------------------
    const hierarchyContainer = document.getElementById("balancesHierarchy");

    const btnRefresh        = document.getElementById("btnDashRefresh");
    const btnConsolidated   = document.getElementById("btnDashConsolidated");
    const btnDetailed       = document.getElementById("btnDashDetailed");

    const dateFromInput     = document.getElementById("dashDateFrom");
    const dateToInput       = document.getElementById("dashDateTo");
    const btnDateGo         = document.getElementById("btnDashDateGo");

    // ----------------------------------------------------
    // STATE
    // ----------------------------------------------------
    let transactions = [];
    let categories   = [];

    // mode: "normal" | "consolidated" | "detailed"
    let viewMode = "normal";

    // current hierarchy list (flat, for rendering + keyboard)
    let currentItems = [];

    // keyboard selection index
    let activeIndex = 0;

    // current drill level stack (for normal mode)
    // e.g. [] → groups, ["Expenses"] → categories under Expenses, etc.
    let drillStack = [];

    // current date filter
    let filterFrom = null; // Date or null
    let filterTo   = null; // Date or null


    // ----------------------------------------------------
    // HELPERS: DATE
    // ----------------------------------------------------
    function parseDDMMYYYY(str) {
        if (!str || !/^\d{2}-\d{2}-\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function parseYYYYMMDD(str) {
        if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
        const [y, m, d] = str.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function isWithinFilter(dateStr) {
        // transactions store date as dd-mm-yyyy
        const dt = parseDDMMYYYY(dateStr);
        if (!dt) return false;

        if (filterFrom && dt < filterFrom) return false;
        if (filterTo   && dt > filterTo)   return false;

        return true;
    }


    // ----------------------------------------------------
    // LOAD DATA
    // ----------------------------------------------------
    function loadData() {
        transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
        categories   = JSON.parse(localStorage.getItem("categories")   || "[]");
    }


    // ----------------------------------------------------
    // BUILD INDEXES
    // ----------------------------------------------------
    // Map: headName -> { category, subCategory, group }
    // group is one of: "Income", "Expenses", "Others"
    function buildHeadIndex() {
        const headIndex = {};

        categories.forEach(cat => {
            const group = mapCategoryToGroup(cat.category);
            headIndex[cat.name] = {
                group,
                category: cat.category,
                subCategory: cat.subCategory || ""
            };
        });

        return headIndex;
    }

    function mapCategoryToGroup(categoryName) {
        if (categoryName === "Income")   return "Income";
        if (categoryName === "Expenses") return "Expenses";
        // Everything else → Others (Credit, Saving, Reserve, etc.)
        return "Others";
    }


    // ----------------------------------------------------
    // AGGREGATION
    // ----------------------------------------------------
    function buildAggregates() {
        const headIndex = buildHeadIndex();

        // Structure:
        // groups[group].categories[category].subCategories[subCat].heads[head] = total
        const groups = {
            Income:   { total: 0, categories: {} },
            Expenses: { total: 0, categories: {} },
            Others:   { total: 0, categories: {} }
        };

        transactions.forEach(t => {
            const headName = t.head;
            const info = headIndex[headName];
            if (!info) return; // head not mapped in categories

            if (!isWithinFilter(t.date)) return;

            const amount = Number(t.amount) || 0;
            const groupName    = info.group;
            const categoryName = info.category;
            const subCatName   = info.subCategory || "";

            const group = groups[groupName];

            if (!group.categories[categoryName]) {
                group.categories[categoryName] = {
                    total: 0,
                    subCategories: {}
                };
            }

            const catObj = group.categories[categoryName];

            if (!catObj.subCategories[subCatName]) {
                catObj.subCategories[subCatName] = {
                    total: 0,
                    heads: {}
                };
            }

            const subObj = catObj.subCategories[subCatName];

            if (!subObj.heads[headName]) {
                subObj.heads[headName] = 0;
            }

            subObj.heads[headName] += amount;
            subObj.total           += amount;
            catObj.total           += amount;
            group.total            += amount;
        });

        return groups;
    }


    // ----------------------------------------------------
    // BUILD FLAT LIST FOR RENDERING
    // ----------------------------------------------------
    function buildFlatList(groups) {
        const items = [];

        if (viewMode === "consolidated") {
            // Only 3 groups
            ["Income", "Expenses", "Others"].forEach(groupName => {
                items.push({
                    type: "group",
                    level: 0,
                    name: groupName,
                    total: groups[groupName].total,
                    path: [groupName]
                });
            });
            return items;
        }

        if (viewMode === "detailed") {
            // Everything expanded
            ["Income", "Expenses", "Others"].forEach(groupName => {
                const group = groups[groupName];
                items.push({
                    type: "group",
                    level: 0,
                    name: groupName,
                    total: group.total,
                    path: [groupName]
                });

                Object.keys(group.categories).sort().forEach(catName => {
                    const cat = group.categories[catName];
                    items.push({
                        type: "category",
                        level: 1,
                        name: catName,
                        total: cat.total,
                        path: [groupName, catName]
                    });

                    Object.keys(cat.subCategories).sort().forEach(subName => {
                        const sub = cat.subCategories[subName];
                        // If subName is empty, skip label row
                        if (subName) {
                            items.push({
                                type: "subCategory",
                                level: 2,
                                name: subName,
                                total: sub.total,
                                path: [groupName, catName, subName]
                            });
                        }

                        Object.keys(sub.heads).sort().forEach(headName => {
                            const headTotal = sub.heads[headName];
                            items.push({
                                type: "head",
                                level: subName ? 3 : 2,
                                name: headName,
                                total: headTotal,
                                path: [groupName, catName, subName, headName]
                            });
                        });
                    });
                });
            });

            return items;
        }

        // NORMAL MODE (Tally-style, one level at a time)
        // drillStack:
        // [] → show groups
        // [group] → show categories
        // [group, category] → show subCategories / heads
        // [group, category, subCategory] → show heads

        if (drillStack.length === 0) {
            ["Income", "Expenses", "Others"].forEach(groupName => {
                const group = groups[groupName];
                items.push({
                    type: "group",
                    level: 0,
                    name: groupName,
                    total: group.total,
                    path: [groupName]
                });
            });
            return items;
        }

        if (drillStack.length === 1) {
            const groupName = drillStack[0];
            const group = groups[groupName];

            Object.keys(group.categories).sort().forEach(catName => {
                const cat = group.categories[catName];
                items.push({
                    type: "category",
                    level: 1,
                    name: catName,
                    total: cat.total,
                    path: [groupName, catName]
                });
            });
            return items;
        }

        if (drillStack.length === 2) {
            const [groupName, catName] = drillStack;
            const group = groups[groupName];
            const cat   = group.categories[catName];
            if (!cat) return items;

            Object.keys(cat.subCategories).sort().forEach(subName => {
                const sub = cat.subCategories[subName];

                if (subName) {
                    items.push({
                        type: "subCategory",
                        level: 2,
                        name: subName,
                        total: sub.total,
                        path: [groupName, catName, subName]
                    });
                }

                // Also allow heads directly if subName is empty
                if (!subName) {
                    Object.keys(sub.heads).sort().forEach(headName => {
                        const headTotal = sub.heads[headName];
                        items.push({
                            type: "head",
                            level: 2,
                            name: headName,
                            total: headTotal,
                            path: [groupName, catName, "", headName]
                        });
                    });
                }
            });

            return items;
        }

        if (drillStack.length === 3) {
            const [groupName, catName, subName] = drillStack;
            const group = groups[groupName];
            const cat   = group.categories[catName];
            if (!cat) return items;

            const sub = cat.subCategories[subName];
            if (!sub) return items;

            Object.keys(sub.heads).sort().forEach(headName => {
                const headTotal = sub.heads[headName];
                items.push({
                    type: "head",
                    level: 3,
                    name: headName,
                    total: headTotal,
                    path: [groupName, catName, subName, headName]
                });
            });

            return items;
        }

        return items;
    }


    // ----------------------------------------------------
    // RENDER
    // ----------------------------------------------------
    function renderHierarchy() {
        if (!hierarchyContainer) return;

        const groups = buildAggregates();
        currentItems = buildFlatList(groups);

        hierarchyContainer.innerHTML = "";

        currentItems.forEach((item, index) => {
            const row = document.createElement("div");
            row.classList.add("hierarchy-item", `level-${item.level}`);

            if (index === activeIndex) {
                row.classList.add("active");
            }

            const nameSpan = document.createElement("span");
            nameSpan.classList.add("hierarchy-name");
            nameSpan.textContent = item.name;

            const totalSpan = document.createElement("span");
            totalSpan.classList.add("hierarchy-total");
            totalSpan.textContent = item.total.toFixed(2);

            row.appendChild(nameSpan);
            row.appendChild(totalSpan);

            row.addEventListener("click", () => {
                activeIndex = index;
                handleEnterOnItem();
            });

            hierarchyContainer.appendChild(row);
        });
    }


    // ----------------------------------------------------
    // KEYBOARD NAVIGATION
    // ----------------------------------------------------
    function moveSelection(delta) {
        if (!currentItems.length) return;
        activeIndex += delta;
        if (activeIndex < 0) activeIndex = 0;
        if (activeIndex >= currentItems.length) activeIndex = currentItems.length - 1;
        renderHierarchy();
        scrollActiveIntoView();
    }

    function scrollActiveIntoView() {
        const activeEl = hierarchyContainer.querySelector(".hierarchy-item.active");
        if (!activeEl) return;
        const rect = activeEl.getBoundingClientRect();
        const parentRect = hierarchyContainer.getBoundingClientRect();

        if (rect.top < parentRect.top) {
            hierarchyContainer.scrollTop -= (parentRect.top - rect.top) + 8;
        } else if (rect.bottom > parentRect.bottom) {
            hierarchyContainer.scrollTop += (rect.bottom - parentRect.bottom) + 8;
        }
    }

    function handleEnterOnItem() {
        if (!currentItems.length) return;
        const item = currentItems[activeIndex];

        if (viewMode === "consolidated") {
            // In consolidated, Enter on group → drill into that group (normal mode)
            viewMode = "normal";
            drillStack = [item.name];
            activeIndex = 0;
            renderHierarchy();
            return;
        }

        if (viewMode === "detailed") {
            // In detailed mode, Enter on head → open statement
            if (item.type === "head") {
                openStatementForHead(item);
            }
            return;
        }

        // NORMAL MODE (Tally-style)
        if (item.type === "group") {
            // drill into group
            drillStack = [item.name];
            activeIndex = 0;
            renderHierarchy();
            return;
        }

        if (item.type === "category") {
            // drill into category
            const [groupName] = item.path;
            drillStack = [groupName, item.name];
            activeIndex = 0;
            renderHierarchy();
            return;
        }

        if (item.type === "subCategory") {
            // drill into subCategory
            const [groupName, catName] = item.path;
            drillStack = [groupName, catName, item.name];
            activeIndex = 0;
            renderHierarchy();
            return;
        }

        if (item.type === "head") {
            openStatementForHead(item);
        }
    }

    function handleEsc() {
        if (viewMode === "consolidated" || viewMode === "detailed") {
            // ESC does nothing in these modes
            return;
        }

        if (drillStack.length === 0) {
            // already at top
            return;
        }

        drillStack.pop();
        activeIndex = 0;
        renderHierarchy();
    }

    function openStatementForHead(item) {
        const headName = item.name;

        // Dispatch a custom event so Accounts page (or another module)
        // can listen and show the statement for this head + current date filter.
        const detail = {
            head: headName,
            from: filterFrom,
            to: filterTo
        };

        document.dispatchEvent(new CustomEvent("dashboardHeadSelected", { detail }));

        // You can also auto-switch to Accounts tab here if you want:
        // const accountsBtn = document.querySelector('.nav-btn[data-page="accounts"]');
        // if (accountsBtn) accountsBtn.click();
    }


    // ----------------------------------------------------
    // DATE FILTER
    // ----------------------------------------------------
    function applyDateFilter() {
        const fromVal = dateFromInput ? dateFromInput.value : "";
        const toVal   = dateToInput   ? dateToInput.value   : "";

        filterFrom = fromVal ? parseYYYYMMDD(fromVal) : null;
        filterTo   = toVal   ? parseYYYYMMDD(toVal)   : null;

        activeIndex = 0;
        renderHierarchy();
    }


    // ----------------------------------------------------
    // MODE TOGGLES
    // ----------------------------------------------------
    function setModeConsolidated() {
        if (viewMode === "consolidated") {
            // toggle back to normal
            viewMode = "normal";
        } else {
            viewMode = "consolidated";
        }
        drillStack = [];
        activeIndex = 0;
        updateModeButtons();
        renderHierarchy();
    }

    function setModeDetailed() {
        if (viewMode === "detailed") {
            // toggle back to normal
            viewMode = "normal";
        } else {
            viewMode = "detailed";
        }
        drillStack = [];
        activeIndex = 0;
        updateModeButtons();
        renderHierarchy();
    }

    function updateModeButtons() {
        if (!btnConsolidated || !btnDetailed) return;

        btnConsolidated.classList.toggle("active", viewMode === "consolidated");
        btnDetailed.classList.toggle("active", viewMode === "detailed");
    }


    // ----------------------------------------------------
    // SOFT REFRESH
    // ----------------------------------------------------
    function softRefresh() {
        // simplest + safest: reload the page
        location.reload();
    }


    // ----------------------------------------------------
    // EVENT WIRING
    // ----------------------------------------------------
    if (btnRefresh) {
        btnRefresh.addEventListener("click", softRefresh);
    }

    if (btnConsolidated) {
        btnConsolidated.addEventListener("click", setModeConsolidated);
    }

    if (btnDetailed) {
        btnDetailed.addEventListener("click", setModeDetailed);
    }

    if (btnDateGo) {
        btnDateGo.addEventListener("click", applyDateFilter);
    }

    // Keyboard navigation on the whole document (only when dashboard page is active)
    document.addEventListener("keydown", (e) => {
        const dashboardPage = document.getElementById("page-dashboard");
        if (!dashboardPage || !dashboardPage.classList.contains("active")) return;

        if (!currentItems.length) return;

        if (e.key === "ArrowUp") {
            e.preventDefault();
            moveSelection(-1);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            moveSelection(1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            handleEnterOnItem();
        } else if (e.key === "Escape") {
            e.preventDefault();
            handleEsc();
        }
    });


// ----------------------------------------------------
// INITIALIZE
// ----------------------------------------------------
function initDashboard() {
    loadData();
    drillStack = [];
    viewMode = "normal";
    activeIndex = 0;
    updateModeButtons();
    renderHierarchy();
}

// Refresh dashboard when transactions or categories change
document.addEventListener("transactionsUpdated", () => {
    loadData();
    renderHierarchy();
});

document.addEventListener("categoriesUpdated", () => {
    loadData();
    renderHierarchy();
});

initDashboard();


// ============================
// HANDLE PERIOD CHANGE
// ============================
document.addEventListener("periodChanged", (e) => {
    const ctx = e.detail;

    // Reset filter
    filterFrom = null;
    filterTo   = null;

    // ============================
    // MONTH MODE
    // ============================
    if (ctx.mode === "month") {
        const [year, month] = ctx.month.split("-").map(Number);

        filterFrom = new Date(year, month - 1, 1, 0, 0, 0, 0);
        filterTo   = new Date(year, month, 0, 23, 59, 59, 999);
    }

    // ============================
    // WEEK MODE
    // ============================
    if (ctx.mode === "week") {
        if (ctx.week) {
            // Normalize week start
            filterFrom = new Date(
                ctx.week.from.getFullYear(),
                ctx.week.from.getMonth(),
                ctx.week.from.getDate(),
                0, 0, 0, 0
            );

            // Normalize week end
            filterTo = new Date(
                ctx.week.to.getFullYear(),
                ctx.week.to.getMonth(),
                ctx.week.to.getDate(),
                23, 59, 59, 999
            );
        } else {
            // Full month fallback
            const [year, month] = ctx.month.split("-").map(Number);

            filterFrom = new Date(year, month - 1, 1, 0, 0, 0, 0);
            filterTo   = new Date(year, month, 0, 23, 59, 59, 999);
        }
    }

    // ============================
    // CUSTOM MODE
    // ============================
    if (ctx.mode === "custom") {

        if (ctx.from) {
            filterFrom = new Date(
                ctx.from.getFullYear(),
                ctx.from.getMonth(),
                ctx.from.getDate(),
                0, 0, 0, 0
            );
        }

        if (ctx.to) {
            filterTo = new Date(
                ctx.to.getFullYear(),
                ctx.to.getMonth(),
                ctx.to.getDate(),
                23, 59, 59, 999
            );
        }
    }

    // Reset drill + selection
    drillStack = [];
    activeIndex = 0;

// ============================
// BUILD WEEKLY TOTALS FROM BUDGET MATRIX
// ============================
(function buildWeeklyTotalsForBudgetCard() {
    const monthKey = `budget_${ctx.month}`;   // e.g. "budget_2026-03"
    const data = JSON.parse(localStorage.getItem(monthKey) || "{}");

    window.weeklyTotals = {};
    window.weekRanges = {};

    if (!data.weeks) return;

    for (let i = 1; i <= 4; i++) {
        const wk = data.weeks[`week${i}`];
        if (!wk) continue;

        const expected = parseFloat(wk.totExp) || 0;
        const acquired = parseFloat(wk.totAct) || 0;
        const diff = acquired - expected;

        window.weeklyTotals[i] = { expected, acquired, diff };

        // Build week ranges (simple 7‑day blocks)
        const [year, month] = ctx.month.split("-").map(Number);
        const start = new Date(year, month - 1, 1 + (i - 1) * 7);
        const end = new Date(year, month - 1, 1 + (i - 1) * 7 + 6);

        window.weekRanges[i] = {
            from: start.toLocaleDateString("en-GB"),
            to: end.toLocaleDateString("en-GB")
        };
    }
})();
// ============================
// UPDATE BUDGET CARD
// ============================
let label = "";

// MONTH MODE
if (ctx.mode === "month") {
    const [year, month] = ctx.month.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    label = d.toLocaleString("default", { month: "long", year: "numeric" });
}

// WEEK MODE
if (ctx.mode === "week") {
    const [year, month] = ctx.month.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    label = d.toLocaleString("default", { month: "long", year: "numeric" });
}

// CUSTOM MODE
if (ctx.mode === "custom") {
    label = "Custom Period";
}

// 🔥 Update the Budget Card
budgetCardUpdatePeriod({
    periodLabel: label
});
    // Re-render dashboard
    renderHierarchy();
});
document.addEventListener("dashboardHeadSelected", (e) => {
    const { head, from, to } = e.detail;

    // Load all transactions
    const all = JSON.parse(localStorage.getItem("transactions") || "[]");

    // Filter by head + date range
    const filtered = all.filter(t => {
        if (t.head !== head) return false;

        const dt = parseDDMMYYYY(t.date);
        if (!dt) return false;

        if (from && dt < from) return false;
        if (to && dt > to) return false;

        return true;
    });

    // Populate popup
    populateStatementPopup(head, filtered);

    // Show popup
    document.getElementById("statementOverlay").style.display = "flex";
});
function populateStatementPopup(head, rows) {
    document.getElementById("statementTitle").textContent = head;

    const body = document.getElementById("statementBody");
    body.innerHTML = "";

    if (rows.length === 0) {
        body.innerHTML = `<div class="statement-row">No transactions found.</div>`;
        return;
    }

    rows.forEach(t => {
        const div = document.createElement("div");
        div.className = "statement-row";
        const amount = Number(t.amount) || 0;

div.textContent = `${t.date}   |   ${amount.toFixed(2)}      ${t.note || ""}`;
        body.appendChild(div);
    });
}

document.getElementById("statementClose").onclick = () => {
    document.getElementById("statementOverlay").style.display = "none";
};

document.getElementById("statementOverlay").onclick = (e) => {
    if (e.target.id === "statementOverlay") {
        document.getElementById("statementOverlay").style.display = "none";
    }
};
}); // <-- FINAL CLOSING OF DOMContentLoaded