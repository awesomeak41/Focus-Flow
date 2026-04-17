document.addEventListener("DOMContentLoaded", () => {

    // ----------------------------------------------------
    // ELEMENT REFERENCES
    // ----------------------------------------------------
    const txtAmount = document.getElementById("txtAmount");
    const cmbUnder = document.getElementById("cmbUnder");
    const txtNotes = document.getElementById("txtNotes");

    const btnToday = document.getElementById("btnToday");
    const btnSave = document.getElementById("btnSave");
    const btnClear = document.getElementById("btnClear");
    const btnCancel = document.getElementById("btnCancel");

    const txtDate = document.getElementById("txtDate");
    const realDatePicker = document.getElementById("realDatePicker");
    const btnCalendar = document.getElementById("btnCalendar");

    // ----------------------------------------------------
    // CALENDAR HANDLING
    // ----------------------------------------------------
    btnCalendar.addEventListener("click", () => {
        realDatePicker.showPicker();
    });

    realDatePicker.addEventListener("change", () => {
        const val = realDatePicker.value;
        if (!val) return;

        const [y, m, d] = val.split("-");
        txtDate.value = `${d}-${m}-${y}`;
    });

    // ----------------------------------------------------
    // LOAD HEADS FROM CATEGORIES
    // ----------------------------------------------------
    function loadHeads() {
        let data = JSON.parse(localStorage.getItem("categories") || "[]");

        data.sort((a, b) => a.name.localeCompare(b.name));

        cmbUnder.innerHTML = `<option value="" disabled selected hidden>Select Head</option>`;

        data.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.name;
            opt.textContent = item.name;
            cmbUnder.appendChild(opt);
        });
    }

    // ----------------------------------------------------
    // HELPERS
    // ----------------------------------------------------
    function formatDateToDDMMYYYY(dateObj) {
        const d = dateObj.getDate().toString().padStart(2, "0");
        const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
        const y = dateObj.getFullYear();
        return `${d}-${m}-${y}`;
    }

    function isValidDateFormat(str) {
        return /^\d{2}-\d{2}-\d{4}$/.test(str);
    }

    function clearForm() {
        txtDate.value = "";
        realDatePicker.value = "";
        txtAmount.value = "";
        cmbUnder.value = "";
        txtNotes.value = "";

        txtDate.classList.remove("invalid");
        txtAmount.classList.remove("invalid");
        cmbUnder.classList.remove("invalid");
    }

    // ----------------------------------------------------
    // TODAY BUTTON
    // ----------------------------------------------------
    btnToday.addEventListener("click", () => {
        const today = new Date();
        txtDate.value = formatDateToDDMMYYYY(today);

        const d = today.getDate().toString().padStart(2, "0");
        const m = (today.getMonth() + 1).toString().padStart(2, "0");
        const y = today.getFullYear();
        realDatePicker.value = `${y}-${m}-${d}`;

        txtDate.classList.remove("invalid");
    });

    // ----------------------------------------------------
    // LAST 5 TRANSACTIONS (MINIMAL STRAIGHT LINES)
    // ----------------------------------------------------
    function refreshLastFive() {
        const box = document.getElementById("lastFiveList");
        if (!box) return;

        let data = JSON.parse(localStorage.getItem("transactions") || "[]");

        data.sort((a, b) => {
            const [d1, m1, y1] = (a.date || "01-01-1970").split("-").map(Number);
            const [d2, m2, y2] = (b.date || "01-01-1970").split("-").map(Number);
            return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
        });

        const lastFive = data.slice(0, 5);

        if (lastFive.length === 0) {
            box.innerHTML = `<div style="opacity:0.6; color:#ccc;">No transactions yet</div>`;
            return;
        }

        box.innerHTML = lastFive
            .map(t => `
                <div style="margin-bottom:4px; color:white;">
                    ${t.date} — ${t.head} — ${Number(t.amount).toFixed(2)}
                    ${t.notes ? `<div style="font-size:0.8rem; opacity:0.6; margin-left:10px;">${t.notes}</div>` : ""}
                </div>
            `)
            .join("");
    }

    // ----------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------
    function validateForm() {
        let valid = true;

        if (!isValidDateFormat(txtDate.value)) {
            txtDate.classList.add("invalid");
            valid = false;
        } else {
            txtDate.classList.remove("invalid");
        }

        if (txtAmount.value.trim() === "" || isNaN(txtAmount.value)) {
            txtAmount.classList.add("invalid");
            valid = false;
        } else {
            txtAmount.classList.remove("invalid");
        }

        if (cmbUnder.value === "") {
            cmbUnder.classList.add("invalid");
            valid = false;
        } else {
            cmbUnder.classList.remove("invalid");
        }

        return valid;
    }

    // ----------------------------------------------------
    // SAVE BUTTON
    // ----------------------------------------------------
    btnSave.addEventListener("click", () => {
        if (!validateForm()) return;

        const t = {
            date: txtDate.value,
            amount: parseFloat(txtAmount.value),
            head: cmbUnder.value,
            notes: txtNotes.value
        };

        let data = JSON.parse(localStorage.getItem("transactions") || "[]");
        data.push(t);
        localStorage.setItem("transactions", JSON.stringify(data));
        document.dispatchEvent(new Event("transactionsUpdated"));

        const lastDate = txtDate.value;
        if (lastDate && /^\d{2}-\d{2}-\d{4}$/.test(lastDate)) {
            const [d, m, y] = lastDate.split("-");
            realDatePicker.value = `${y}-${m}-${d}`;
        }

        txtAmount.value = "";
        cmbUnder.value = "";
        txtNotes.value = "";

        refreshLastFive();
    });

    // ----------------------------------------------------
    // CLEAR & CANCEL
    // ----------------------------------------------------
    btnClear.addEventListener("click", () => {
        clearForm();
        refreshLastFive();
    });

    btnCancel.addEventListener("click", () => {
        clearForm();
        refreshLastFive();
    });

    // ----------------------------------------------------
    // INITIAL LOAD
    // ----------------------------------------------------
    loadHeads();
    refreshLastFive();

    document.addEventListener("categoriesUpdated", loadHeads);
    document.addEventListener("transactionsUpdated", refreshLastFive);
});