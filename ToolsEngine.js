/* ============================================================
   TOOLS ENGINE (JS2)
   Calculator • History Drawer • Clock • Calendar
   ============================================================ */


/* ============================================================
   CALCULATOR MODULE (FULLY FIXED)
   ============================================================ */

let calcEnabled = true;

const calc = (() => {

    let displayEl = null;
    let miniHistoryEl = null;
    let fullHistoryEl = null;

    let history = [];
    let justCalculated = false; // track if last action was "="

    function init() {
        displayEl = document.getElementById("display");
        miniHistoryEl = document.getElementById("mini-history");
        fullHistoryEl = document.getElementById("full-history");

        loadHistory();
        renderMiniHistory();
        renderFullHistory();

        if (displayEl) displayEl.removeAttribute("disabled");

        document.addEventListener("keydown", handleKey);
    }

    /* -----------------------------
       BUTTON + KEYBOARD INPUT
    ----------------------------- */

    function press(value) {
        if (!calcEnabled) return;

        // If last action was "=", start fresh on next number
        if (justCalculated && !isNaN(value)) {
            displayEl.value = "";
            justCalculated = false;
        }

        displayEl.value += value;
    }

    function clearDisplay() {
        if (!calcEnabled) return;
        displayEl.value = "";
        justCalculated = false;
    }

    function backspace() {
        if (!calcEnabled) return;
        displayEl.value = displayEl.value.slice(0, -1);
    }

    function calculate() {
        if (!calcEnabled) return;
        if (!displayEl.value.trim()) return;

        try {
            const expression = displayEl.value;
            const result = eval(expression);

            displayEl.value = result;

            addToHistory(expression, result);

            // mark that a calculation just happened
            justCalculated = true;

        } catch {
            displayEl.value = "Error";
        }
    }

    /* -----------------------------
       KEYBOARD HANDLER
    ----------------------------- */

    function handleKey(e) {
        if (!calcEnabled) return;

        const key = e.key;

        // If last action was "=", and user types a number, clear first
        if (justCalculated && !isNaN(key)) {
            displayEl.value = "";
            justCalculated = false;
        }

        if (!isNaN(key)) {
            press(key);
        } else if (["+", "-", "*", "/"].includes(key)) {
            press(key);
        } else if (key === "Enter") {
            e.preventDefault();
            calculate();
        } else if (key === "Backspace") {
            backspace();
        } else if (key === "Escape") {
            clearDisplay();
        } else if (key === ".") {
            press(".");
        }
    }

    /* -----------------------------
       HISTORY SYSTEM
    ----------------------------- */

    function addToHistory(expr, result) {
        history.push({ expr, result });

        if (history.length > 50) history.shift();

        saveHistory();
        renderMiniHistory();
        renderFullHistory();
    }

    // MINI HISTORY → last 3 calculations on screen
    function renderMiniHistory() {
        if (!miniHistoryEl) return;

        miniHistoryEl.innerHTML = "";

        const lastThree = history.slice(-3);

        lastThree.forEach(item => {
            const div = document.createElement("div");
            div.textContent = `${item.expr} = ${item.result}`;
            miniHistoryEl.appendChild(div);
        });
    }

    // FULL HISTORY → all calculations in drawer
    function renderFullHistory() {
        if (!fullHistoryEl) return;

        fullHistoryEl.innerHTML = "";

        history.forEach(item => {
            const div = document.createElement("div");
            div.textContent = `${item.expr} = ${item.result}`;
            fullHistoryEl.appendChild(div);
        });
    }

    function saveHistory() {
        localStorage.setItem("calc_history", JSON.stringify(history));
    }

    function loadHistory() {
        const raw = localStorage.getItem("calc_history");
        if (!raw) return;

        try {
            history = JSON.parse(raw);
        } catch {
            history = [];
        }
    }

    function deleteHistory() {
        history = [];
        saveHistory();
        renderMiniHistory();
        renderFullHistory();
    }

    return {
        init,
        press,
        clearDisplay,
        backspace,
        calculate,
        deleteHistory,

        enableCalc() {
            calcEnabled = true;
            if (displayEl) displayEl.removeAttribute("disabled");
        },

        disableCalc() {
            calcEnabled = false;
            if (displayEl) displayEl.setAttribute("disabled", "disabled");
        }
    };

})();

window.calc = calc;


/* ============================================================
   HISTORY DRAWER MODULE
   ============================================================ */

const historyDrawer = (() => {

    let drawerEl = null;
    let openBtn = null;
    let closeBtn = null;
    let deleteBtn = null;

    function init() {
        drawerEl = document.getElementById("history-drawer");
        openBtn = document.getElementById("history-icon");
        closeBtn = document.getElementById("close-history");
        deleteBtn = document.getElementById("delete-history");

        if (openBtn) openBtn.addEventListener("click", open);
        if (closeBtn) closeBtn.addEventListener("click", close);
        if (deleteBtn) deleteBtn.addEventListener("click", () => calc.deleteHistory());
    }

    function open() {
        if (drawerEl) drawerEl.style.right = "0";
    }

    function close() {
        if (drawerEl) drawerEl.style.right = "-260px";
    }

    return { init };

})();

window.historyDrawer = historyDrawer;


/* ============================================================
   CLOCK MODULE
   ============================================================ */

const clock = (() => {

    let timeEl = null;
    let dateEl = null;

    function init() {
        timeEl = document.getElementById("time");
        dateEl = document.getElementById("date");

        if (!timeEl || !dateEl) return;

        update();
        setInterval(update, 1000);
    }

    function update() {
        const now = new Date();

        timeEl.textContent = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

        dateEl.textContent = now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    return { init };

})();

window.clock = clock;


/* ============================================================
   CALENDAR MODULE
   ============================================================ */

const calendar = (() => {

    let monthYearEl = null;
    let gridEl = null;

    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    function init() {
        monthYearEl = document.getElementById("month-year");
        gridEl = document.getElementById("calendar");

        if (!monthYearEl || !gridEl) return;

        render();

        const prevBtn = document.getElementById("prev-month");
        const nextBtn = document.getElementById("next-month");

        if (prevBtn) prevBtn.addEventListener("click", prevMonth);
        if (nextBtn) nextBtn.addEventListener("click", nextMonth);
    }

    function render() {
        gridEl.innerHTML = "";

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        monthYearEl.textContent = new Date(currentYear, currentMonth)
            .toLocaleDateString("en-US", { month: "long", year: "numeric" });

        for (let i = 0; i < firstDay; i++) {
            gridEl.appendChild(document.createElement("div"));
        }

        const today = new Date();

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement("div");
            cell.textContent = day;

            if (
                day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear()
            ) {
                cell.classList.add("today");
            }

            gridEl.appendChild(cell);
        }
    }

    function nextMonth() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        render();
    }

    function prevMonth() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        render();
    }

    return { init, nextMonth, prevMonth };

})();

window.calendar = calendar;


/* ============================================================
   GLOBAL INIT
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
    calc.init();
    historyDrawer.init();
    clock.init();
    calendar.init();
});