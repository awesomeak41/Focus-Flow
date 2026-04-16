document.addEventListener("DOMContentLoaded", () => {

    // ELEMENTS
    const btnViewAccounts    = document.getElementById("btnViewAccounts");
    const btnVARefresh       = document.getElementById("btnVARefresh");
    const viewAccountOverlay = document.getElementById("viewAccountOverlay");

    const vaDateFrom  = document.getElementById("vaDateFrom");
    const vaDateTo    = document.getElementById("vaDateTo");
    const vaName      = document.getElementById("vaName");

    const btnVAApply  = document.getElementById("btnVAApply");
    const btnVACancel = document.getElementById("btnVACancel");

    const vaTable      = document.getElementById("vaTable");
    const vaTbody      = vaTable.querySelector("tbody");
    const vaHeadTotals = document.getElementById("vaHeadTotals");
    const vaMessage    = document.getElementById("vaMessage");

    // NEW — Opening Balance Top Bar
    const openingBalanceBar     = document.getElementById("openingBalanceBar");
    const vaOpeningBalanceTop   = document.getElementById("vaOpeningBalanceTop");
    const btnApplyOpeningBalance = document.getElementById("btnApplyOpeningBalance");

    // INIT STATE
    hideStatement();

    let allTxns = [];
    let enrichedTxns = [];
    let categories = [];

    // Stores last used filter for Refresh + Apply Opening Balance
    let lastVAFilter = null;


    // HELPERS
    function parseDDMMYYYY(str) {
        if (!str || !/^\d{2}-\d{2}-\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function dateKeyFromInput(val) {
        if (!val) return null;
        const [y, m, d] = val.split("-").map(Number);
        return y * 10000 + m * 100 + d;
    }

    function dateKeyFromTxn(str) {
        if (!str || !/^\d{2}-\d{2}-\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split("-").map(Number);
        return y * 10000 + m * 100 + d;
    }


    // LOAD DATA
    function loadData() {
        allTxns = JSON.parse(localStorage.getItem("transactions") || "[]");
        categories = JSON.parse(localStorage.getItem("categories") || "[]");

        enrichedTxns = allTxns.map(t => {
            const match = categories.find(c => c.name === t.head) || {};
            return {
                date: t.date,
                amount: Number(t.amount) || 0,
                head: t.head || "",
                notes: t.notes || "",
                category: match.category || "",
                subCategory: match.subCategory || ""
            };
        });

        enrichedTxns.sort((a, b) => {
            const da = parseDDMMYYYY(a.date) || new Date(0);
            const db = parseDDMMYYYY(b.date) || new Date(0);
            return db - da;
        });
    }


    // NAME DROPDOWN
    function populateNameDropdown() {
        const nameSet = new Set();

        enrichedTxns.forEach(row => {
            if (row.category)    nameSet.add(row.category);
            if (row.subCategory) nameSet.add(row.subCategory);
            if (row.head)        nameSet.add(row.head);
        });

        vaName.innerHTML = `<option value="">Select name</option>`;
        Array.from(nameSet).sort().forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            vaName.appendChild(opt);
        });
    }


    // POPUP CONTROL
    function openViewAccountModal() {
        populateNameDropdown();
        vaMessage.textContent = "";
        viewAccountOverlay.style.display = "flex";
    }

    function closeViewAccountModal() {
        viewAccountOverlay.style.display = "none";
    }


    // SHOW/HIDE STATEMENT
    function hideStatement() {
        vaTable.style.display = "none";
        vaHeadTotals.style.display = "none";
        openingBalanceBar.style.display = "none"; // NEW
    }

    function showStatement() {
        vaTable.style.display = "table";
        vaHeadTotals.style.display = "block";
        openingBalanceBar.style.display = "block"; // NEW
    }


    // RENDER STATEMENT
    function renderStatement(rows, nameFilter, openingBalance) {

        vaTbody.innerHTML = "";
        vaHeadTotals.innerHTML = "";
        vaMessage.textContent = "";

        if (!rows.length) {
            hideStatement();
            vaMessage.textContent = "No results found";
            return;
        }

        showStatement();

        let running = Number(openingBalance) || 0;

        let tableTotal = 0;
        let categoryTotal = 0;
        let subCategoryTotal = 0;
        const headTotalsMap = {};

        const firstRow = rows[0];
        const categoryName = firstRow.category || "Category Total";
        const subCategoryName = firstRow.subCategory || "Sub Category Total";

        rows.forEach(row => {
            const tr = document.createElement("tr");

            running += row.amount;
            tableTotal += row.amount;

            if (row.category === categoryName) categoryTotal += row.amount;
            if (row.subCategory === subCategoryName) subCategoryTotal += row.amount;

            if (!headTotalsMap[row.head]) headTotalsMap[row.head] = 0;
            headTotalsMap[row.head] += row.amount;

            tr.innerHTML = `
                <td>${row.date}</td>
                <td>${row.category}</td>
                <td>${row.subCategory}</td>
                <td>${row.head}</td>
                <td>${row.amount.toFixed(2)}</td>
                <td>${running.toFixed(2)}</td>
            `;
            vaTbody.appendChild(tr);
        });

        vaHeadTotals.innerHTML = `
            <div class="total-line"><strong>Table Total:</strong> ${tableTotal.toFixed(2)}</div>
            <div class="total-line"><strong>${categoryName} Total:</strong> ${categoryTotal.toFixed(2)}</div>
            <div class="total-line"><strong>${subCategoryName} Total:</strong> ${subCategoryTotal.toFixed(2)}</div>
            ${Object.keys(headTotalsMap)
                .sort()
                .map(h => `<div class="total-line"><strong>${h} Total:</strong> ${headTotalsMap[h].toFixed(2)}</div>`)
                .join("")}
        `;
    }


    // APPLY FILTER (popup)
    function applyViewAccount() {
        const nameVal = vaName.value.trim();
        const fromVal = vaDateFrom.value;
        const toVal   = vaDateTo.value;
        const opening = Number(vaOpeningBalanceTop.value) || 0;

        if (!nameVal) {
            vaMessage.textContent = "Please select a name.";
            return;
        }

        const fromKey = fromVal ? dateKeyFromInput(fromVal) : null;
        const toKey   = toVal   ? dateKeyFromInput(toVal)   : null;

        const filtered = enrichedTxns.filter(row => {
            const txnKey = dateKeyFromTxn(row.date);
            if ((fromKey || toKey) && !txnKey) return false;
            if (fromKey && txnKey < fromKey) return false;
            if (toKey   && txnKey > toKey)   return false;

            return (
                row.category === nameVal ||
                row.subCategory === nameVal ||
                row.head === nameVal
            );
        });

        lastVAFilter = {
            name: nameVal,
            dateFrom: fromVal,
            dateTo: toVal,
            openingBalance: opening
        };

        renderStatement(filtered, nameVal, opening);

        if (filtered.length > 0) closeViewAccountModal();
    }


    // RUN STORED FILTER
    function runStoredViewAccountFilter() {
        if (!lastVAFilter) return;

        const { name, dateFrom, dateTo, openingBalance } = lastVAFilter;

        const nameExists = categories.some(c =>
            c.category === name ||
            c.subCategory === name ||
            c.name === name
        );

        if (!nameExists) {
            alert("Cannot refresh. The referenced category/head was deleted: " + name);
            return;
        }

        const fromKey = dateFrom ? dateKeyFromInput(dateFrom) : null;
        const toKey   = dateTo   ? dateKeyFromInput(dateTo)   : null;

        const filtered = enrichedTxns.filter(row => {
            const txnKey = dateKeyFromTxn(row.date);
            if ((fromKey || toKey) && !txnKey) return false;
            if (fromKey && txnKey < fromKey) return false;
            if (toKey   && txnKey > toKey)   return false;

            return (
                row.category === name ||
                row.subCategory === name ||
                row.head === name
            );
        });

        renderStatement(filtered, name, openingBalance);
    }


    // APPLY OPENING BALANCE (TOP BAR)
    btnApplyOpeningBalance.addEventListener("click", () => {
        if (!lastVAFilter) return;

        lastVAFilter.openingBalance = Number(vaOpeningBalanceTop.value) || 0;
        runStoredViewAccountFilter();
    });


    // REFRESH BUTTON
    function refreshStatement() {
        if (!lastVAFilter) return;
        runStoredViewAccountFilter();
    }


    // EVENTS
    btnViewAccounts.addEventListener("click", openViewAccountModal);
    btnVAApply.addEventListener("click", applyViewAccount);
    btnVACancel.addEventListener("click", closeViewAccountModal);

    btnVARefresh.addEventListener("click", refreshStatement);

    // INITIAL LOAD
    loadData();
    document.addEventListener("transactionsUpdated", loadData);
});