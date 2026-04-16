document.addEventListener("DOMContentLoaded", () => {

    // ============================
    // ELEMENTS
    // ============================
    const btnPeriod      = document.getElementById("dashPeriod");
    const periodOverlay  = document.getElementById("periodOverlay");
    const periodCancel   = document.getElementById("periodCancel");

    const modeButtons    = document.querySelectorAll(".period-mode-btn");
    const sectionMonth   = document.getElementById("sectionMonth");
    const sectionWeek    = document.getElementById("sectionWeek");
    const sectionCustom  = document.getElementById("sectionCustom");

    const monthSelect    = document.getElementById("periodMonth");
    const weekSelect     = document.getElementById("periodWeek");

    // ============================
    // POPUP OPEN / CLOSE
    // ============================
    if (btnPeriod) {
        btnPeriod.addEventListener("click", () => {

            fillMonthDropdown();
            generateWeeks();

            modeButtons.forEach(b => b.classList.remove("active"));
            document.getElementById("modeMonth")?.classList.add("active");

            if (sectionMonth) sectionMonth.style.display  = "block";
            if (sectionWeek)  sectionWeek.style.display   = "none";
            if (sectionCustom) sectionCustom.style.display = "none";

            if (periodOverlay) periodOverlay.style.display = "flex";
        });
    }

    if (periodCancel) {
        periodCancel.addEventListener("click", () => {
            if (periodOverlay) periodOverlay.style.display = "none";
        });
    }

    if (periodOverlay) {
        periodOverlay.addEventListener("click", (e) => {
            if (e.target === periodOverlay) {
                periodOverlay.style.display = "none";
            }
        });
    }

    // ============================
    // MODE SWITCHING
    // ============================
    modeButtons.forEach(btn => {
        btn.addEventListener("click", () => {

            modeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const mode = btn.dataset.mode;

            if (sectionMonth) sectionMonth.style.display  = (mode === "month" || mode === "week") ? "block" : "none";
            if (sectionWeek)  sectionWeek.style.display   = (mode === "week") ? "block" : "none";
            if (sectionCustom) sectionCustom.style.display = (mode === "custom") ? "block" : "none";
        });
    });

    document.getElementById("modeMonth")?.classList.add("active");

    // ============================
    // FILL MONTH DROPDOWN
    // ============================
    function fillMonthDropdown() {
        if (!monthSelect) return;

        monthSelect.innerHTML = "";

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 12, 1);

        for (let i = 0; i < 24; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

            const opt = document.createElement("option");
            opt.value = ym;
            opt.textContent = d.toLocaleString("default", { month: "long", year: "numeric" });

            if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
                opt.selected = true;
            }

            monthSelect.appendChild(opt);
        }
    }

    // ============================
    // GENERATE WEEKS
    // ============================
    function generateWeeks() {
        if (!weekSelect || !monthSelect) return;

        const [year, month] = monthSelect.value.split("-").map(Number);
        const first = new Date(year, month - 1, 1);
        const last  = new Date(year, month, 0);

        weekSelect.innerHTML = "";
        weekSelect.appendChild(new Option("Full Month", ""));

        let start = new Date(first);

        while (start <= last) {
            let end = new Date(start);
            end.setDate(start.getDate() + 6);

            if (end > last) end = last;

            const label = `${start.getDate()}–${end.getDate()}`;
            const value = `${start.toISOString().slice(0,10)}|${end.toISOString().slice(0,10)}`;

            weekSelect.appendChild(new Option(label, value));

            start.setDate(start.getDate() + 7);
        }
    }

    // ============================
    // APPLY PERIOD SELECTION
    // ============================
    const btnApply = document.getElementById("periodApply");

    if (btnApply) {
        btnApply.addEventListener("click", () => {

            const activeModeBtn = document.querySelector(".period-mode-btn.active");
            const mode = activeModeBtn ? activeModeBtn.dataset.mode : "month";

            let detail = { mode };

            if (mode === "month") {
                detail.month = monthSelect ? monthSelect.value : null;
            }

            if (mode === "week") {
                detail.month = monthSelect ? monthSelect.value : null;

                const weekVal = weekSelect ? weekSelect.value : "";
                if (weekVal) {
                    const [fromStr, toStr] = weekVal.split("|");
                    detail.week = {
                        from: new Date(fromStr),
                        to: new Date(toStr)
                    };
                } else {
                    detail.week = null;
                }
            }

            if (mode === "custom") {
                const from = document.getElementById("periodFrom").value;
                const to   = document.getElementById("periodTo").value;

                detail.from = from
                    ? new Date(Number(from.slice(0,4)), Number(from.slice(5,7)) - 1, Number(from.slice(8,10)), 0, 0, 0, 0)
                    : null;

                detail.to = to
                    ? new Date(Number(to.slice(0,4)), Number(to.slice(5,7)) - 1, Number(to.slice(8,10)), 23, 59, 59, 999)
                    : null;
            }

            document.dispatchEvent(new CustomEvent("periodChanged", { detail }));
            if (periodOverlay) periodOverlay.style.display = "none";
        });
    }

    monthSelect?.addEventListener("change", generateWeeks);

    // ============================
    // FIRST RUN: AUTO-APPLY MONTH
    // ============================
    (function openPeriodOnFirstRun() {
        try {
            const FIRST_RUN_KEY = "pf_period_seen_v1";
            if (!periodOverlay) return;
            if (localStorage.getItem(FIRST_RUN_KEY)) return;

            fillMonthDropdown();
            generateWeeks();

            modeButtons.forEach(b => b.classList.remove("active"));
            document.getElementById("modeMonth")?.classList.add("active");

            if (sectionMonth) sectionMonth.style.display  = "block";
            if (sectionWeek)  sectionWeek.style.display   = "none";
            if (sectionCustom) sectionCustom.style.display = "none";

            // Auto-apply current month
            document.dispatchEvent(new CustomEvent("periodChanged", {
                detail: {
                    mode: "month",
                    month: monthSelect.value
                }
            }));

            // Optional: show popup
            periodOverlay.style.display = "flex";

            localStorage.setItem(FIRST_RUN_KEY, "1");
        } catch (err) {
            console.warn("Auto-open period popup failed:", err);
        }
    })();

    // ============================
    // ALWAYS AUTO-APPLY ON APP LOAD
    // ============================
    fillMonthDropdown();
    generateWeeks();

    document.dispatchEvent(new CustomEvent("periodChanged", {
        detail: {
            mode: "month",
            month: monthSelect.value
        }
    }));

});