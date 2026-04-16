document.addEventListener("DOMContentLoaded", () => {

    // ELEMENTS
    const btnOpenFilter = document.getElementById("btnOpenFilter");
    const filterOverlay = document.getElementById("findOverlay");

    const fltDateFrom = document.getElementById("fltDateFrom");
    const fltDateTo = document.getElementById("fltDateTo");
    const fltAmount = document.getElementById("fltAmount");
    const fltCategory = document.getElementById("fltCategory");
    const fltSubCategory = document.getElementById("fltSubCategory");
    const fltHead = document.getElementById("fltHead");

    const btnFilterApply = document.getElementById("btnFilterApply");
    const btnFilterCancel = document.getElementById("btnFilterCancel");
    const btnFilterClear = document.getElementById("btnFilterClear");

    const alterTableBody = document.getElementById("alterTable").querySelector("tbody");
    const alterLabel = document.getElementById("alterLabel");

    let allTxns = [];
    let enrichedTxns = [];
    let isFiltered = false;


    // HELPERS

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

    function parseDDMMYYYY(str) {
        if (!str || !/^\d{2}-\d{2}-\d{4}$/.test(str)) return null;
        const [d, m, y] = str.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function formatDateToDDMMYYYY(dateObj) {
        const d = String(dateObj.getDate()).padStart(2, "0");
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const y = dateObj.getFullYear();
        return `${d}-${m}-${y}`;
    }

    function loadData() {
        allTxns = JSON.parse(localStorage.getItem("transactions") || "[]");
        const categories = JSON.parse(localStorage.getItem("categories") || "[]");

        enrichedTxns = allTxns.map((t, index) => {
            const match = categories.find(c => c.name === t.head) || {};
            return {
                index,
                date: t.date,
                amount: t.amount,
                head: t.head,
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

    function renderTable(rows) {
        alterTableBody.innerHTML = "";

        rows.forEach(row => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${row.date}</td>
                <td>${row.amount}</td>
                <td>${row.category}</td>
                <td>${row.subCategory}</td>
                <td>${row.head}</td>
                <td>${row.notes}</td>
                <td><button class="btn btn-secondary btn-sm" data-edit="${row.index}">✏️</button></td>
                <td><button class="btn btn-outline btn-sm" data-delete="${row.index}">❌</button></td>
            `;

            alterTableBody.appendChild(tr);
        });
    }

    function showLast50() {
        isFiltered = false;
        alterLabel.textContent = "Last 50 Transactions";

        const last50 = enrichedTxns.slice(0, 50);
        renderTable(last50);
    }

    // ⭐ UPDATED LISTENER (ONLY NEW FEATURE ADDED)
    document.addEventListener("transactionsUpdated", () => {
        loadData();
        if (isFiltered) {
            applyFilters();
        } else {
            showLast50();
        }
    });

    function openModal() {
        filterOverlay.style.display = "flex";
    }

    function closeModal() {
        filterOverlay.style.display = "none";
    }

    function clearFilters() {
        fltDateFrom.value = "";
        fltDateTo.value = "";
        fltAmount.value = "";
        fltCategory.value = "";
        fltSubCategory.value = "";
        fltHead.value = "";
    }

    function populateFilterDropdowns() {
        const categories = JSON.parse(localStorage.getItem("categories") || "[]");

        const catSet = new Set();
        categories.forEach(c => {
            if (c.category) catSet.add(c.category);
        });
        fltCategory.innerHTML = `<option value="">All</option>`;
        Array.from(catSet).sort().forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            fltCategory.appendChild(opt);
        });

        const headSet = new Set();
        categories.forEach(c => {
            if (c.name) headSet.add(c.name);
        });
        fltHead.innerHTML = `<option value="">All</option>`;
        Array.from(headSet).sort().forEach(h => {
            const opt = document.createElement("option");
            opt.value = h;
            opt.textContent = h;
            fltHead.appendChild(opt);
        });
    }

    function applyFilters() {
        const hasDateFrom = !!fltDateFrom.value;
        const hasDateTo = !!fltDateTo.value;
        const hasAmount = !!fltAmount.value.trim();
        const hasCategory = !!fltCategory.value;
        const hasSubCategory = !!fltSubCategory.value.trim();
        const hasHead = !!fltHead.value;

        if (!hasDateFrom && !hasDateTo && !hasAmount && !hasCategory && !hasSubCategory && !hasHead) {
            isFiltered = false;
            showLast50();
            closeModal();
            return;
        }

        isFiltered = true;

        const amountVal = hasAmount ? parseFloat(fltAmount.value) : null;
        const catVal = fltCategory.value;
        const subCatVal = fltSubCategory.value.trim().toLowerCase();
        const headVal = fltHead.value;

        const results = enrichedTxns.filter(row => {
            const txnKey = dateKeyFromTxn(row.date);
            if ((hasDateFrom || hasDateTo) && !txnKey) return false;

            const fromKey = hasDateFrom ? dateKeyFromInput(fltDateFrom.value) : null;
            const toKey = hasDateTo ? dateKeyFromInput(fltDateTo.value) : null;

            if (fromKey && txnKey < fromKey) return false;
            if (toKey && txnKey > toKey) return false;

            if (amountVal !== null && Number(row.amount) !== amountVal) return false;

            if (catVal && row.category !== catVal) return false;

            if (subCatVal && (!row.subCategory || !row.subCategory.toLowerCase().includes(subCatVal))) return false;

            if (headVal && row.head !== headVal) return false;

            return true;
        });

        alterLabel.textContent = `Search Results (${results.length} found)`;
        renderTable(results);
        closeModal();
    }

    // EVENTS
    btnOpenFilter.addEventListener("click", () => {
        populateFilterDropdowns();
        openModal();
    });

    btnFilterCancel.addEventListener("click", () => {
        closeModal();
        if (!isFiltered) {
            showLast50();
        }
    });

    btnFilterClear.addEventListener("click", () => {
        clearFilters();
        closeModal();
        showLast50();
    });

    btnFilterApply.addEventListener("click", () => {
        applyFilters();
    });

    filterOverlay.addEventListener("click", (e) => {
        if (e.target === filterOverlay) {
            closeModal();
            if (!isFiltered) {
                showLast50();
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && filterOverlay.style.display === "flex") {
            closeModal();
            if (!isFiltered) {
                showLast50();
            }
        }
    });

    // Edit / Delete
    alterTableBody.addEventListener("click", (e) => {
        const editIndex = e.target.dataset.edit;
        const deleteIndex = e.target.dataset.delete;

        if (editIndex !== undefined) {
            const idx = Number(editIndex);
            const txns = JSON.parse(localStorage.getItem("transactions") || "[]");
            const t = txns[idx];
            if (!t) return;

            const newDate = prompt("Edit Date (dd-mm-yyyy):", t.date);
            if (!newDate) return;

            const newAmount = prompt("Edit Amount:", t.amount);
            if (!newAmount || isNaN(newAmount)) return;

            const newHead = prompt("Edit Head:", t.head);
            if (!newHead) return;

            const newNotes = prompt("Edit Notes:", t.notes || "");

            t.date = newDate;
            t.amount = parseFloat(newAmount);
            t.head = newHead;
            t.notes = newNotes || "";

            localStorage.setItem("transactions", JSON.stringify(txns));

            // ⭐ NEW: Notify all pages
            document.dispatchEvent(new Event("transactionsUpdated"));
        }

        if (deleteIndex !== undefined) {
            const idx = Number(deleteIndex);
            const txns = JSON.parse(localStorage.getItem("transactions") || "[]");
            if (!txns[idx]) return;

            if (confirm("Delete this transaction?")) {
                txns.splice(idx, 1);
                localStorage.setItem("transactions", JSON.stringify(txns));

                // ⭐ NEW: Notify all pages
                document.dispatchEvent(new Event("transactionsUpdated"));
            }
        }
    });

    // INITIAL LOAD
    loadData();
    showLast50();
});