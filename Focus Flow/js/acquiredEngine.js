/* ============================================================
   ACQUIRED ENGINE — SHARED BETWEEN DASHBOARD + BUDGET POPUP
============================================================ */

/* -----------------------------
   1. Get all transactions
----------------------------- */
function AE_getTransactions() {
    try {
        return JSON.parse(localStorage.getItem("transactions") || "[]");
    } catch {
        return [];
    }
}

/* -----------------------------
   2. Parse dd-mm-yyyy → Date
----------------------------- */
function AE_parseDMY(str) {
    if (!str || !/^\d{2}-\d{2}-\d{4}$/.test(str)) return null;
    const [d, m, y] = str.split("-");
    return new Date(`${y}-${m}-${d}`);
}

/* -----------------------------
   3. Detect week number (1–4)
----------------------------- */
function AE_getWeekNumber(dateObj) {
    if (!dateObj || isNaN(dateObj)) return null;
    const day = dateObj.getDate();
    if (day >= 1 && day <= 7) return 1;
    if (day >= 8 && day <= 14) return 2;
    if (day >= 15 && day <= 21) return 3;
    if (day >= 22 && day <= 28) return 4;
    return null;
}

/* -----------------------------
   4. Map selection → heads
   Supports:
   - Category
   - Category → Subcategory
   - Category → Subcategory → Head
----------------------------- */
function AE_getHeadsForSelection(selectionValue) {
    const raw = JSON.parse(localStorage.getItem("categories") || "[]");
    if (!selectionValue) return [];

    const parts = selectionValue.split("→").map(s => s.trim());

    // Category only
    if (parts.length === 1) {
        const cat = parts[0];
        return raw
            .filter(c => c.category === cat)
            .map(c => c.name);
    }

    // Category → Subcategory
    if (parts.length === 2) {
        const [cat, sub] = parts;
        return raw
            .filter(c => c.category === cat && c.subCategory === sub)
            .map(c => c.name);
    }

    // Category → Subcategory → Head
    return [parts[parts.length - 1]];
}

/* -----------------------------
   5. Get acquired for a selection
----------------------------- */
function getAcquiredFor(selectionValue, monthValue, weekValue) {
    if (!selectionValue || !monthValue || !weekValue) return 0;

    const weekNum = parseInt(weekValue.replace("week", ""), 10);
    const heads = AE_getHeadsForSelection(selectionValue);
    const txns = AE_getTransactions();

    return txns
        .filter(t => heads.includes(t.head))
        .filter(t => {
            const dt = AE_parseDMY(t.date);
            if (!dt) return false;
            return AE_getWeekNumber(dt) === weekNum;
        })
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
}