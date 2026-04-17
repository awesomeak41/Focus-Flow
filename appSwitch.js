/* ============================================================
   APP SWITCHING ENGINE
   Notes App ↔ PocketFlow App ↔ Calculator
   ============================================================ */

function activateNotesApp() {

    // Enable Notes
    if (window.notes && typeof notes.enableNotes === "function") {
        notes.enableNotes();
    }

    // Disable PocketFlow content
    document.querySelector(".app-content")?.style.setProperty("pointer-events", "none");

    // Enable Notes content
    document.getElementById("document")?.style.setProperty("pointer-events", "auto");

    // Disable Calculator content
    document.querySelector(".calculator")?.style.setProperty("pointer-events", "none");

    // Disable calculator logic
    if (window.calc && typeof calc.disableCalc === "function") {
        calc.disableCalc();
    }

    // Visual highlight
    document.querySelector(".writingpro-card")?.classList.add("active-notes");
    document.querySelector(".app-card")?.classList.remove("active-pocketflow");
    document.querySelector(".calculator")?.classList.remove("active-calc");
}



function activatePocketFlow() {

    // Disable Notes
    if (window.notes && typeof notes.disableNotes === "function") {
        notes.disableNotes();
    }

    // Enable PocketFlow content
    document.querySelector(".app-content")?.style.setProperty("pointer-events", "auto");

    // Disable Notes content
    document.getElementById("document")?.style.setProperty("pointer-events", "none");

    // Disable Calculator content
    document.querySelector(".calculator")?.style.setProperty("pointer-events", "none");

    // Disable calculator logic
    if (window.calc && typeof calc.disableCalc === "function") {
        calc.disableCalc();
    }

    // Visual highlight
    document.querySelector(".app-card")?.classList.add("active-pocketflow");
    document.querySelector(".writingpro-card")?.classList.remove("active-notes");
    document.querySelector(".calculator")?.classList.remove("active-calc");
}



function activateCalculatorApp() {

    // Disable Notes
    if (window.notes && typeof notes.disableNotes === "function") {
        notes.disableNotes();
    }

    // Disable PocketFlow content
    document.querySelector(".app-content")?.style.setProperty("pointer-events", "none");

    // Disable Notes content
    document.getElementById("document")?.style.setProperty("pointer-events", "none");

    // Enable Calculator content
    const calcCard = document.querySelector(".calculator");
    if (calcCard) {
        calcCard.style.pointerEvents = "auto";

        // Ensure parent container also allows click
        const parent = calcCard.closest(".RIGHT, .app-card, .calculator-wrapper");
        if (parent) parent.style.pointerEvents = "auto";
    }

    // Enable calculator logic
    if (window.calc && typeof calc.enableCalc === "function") {
        calc.enableCalc();
    }

    // Visual highlight
    document.querySelector(".calculator")?.classList.add("active-calc");
    document.querySelector(".writingpro-card")?.classList.remove("active-notes");
    document.querySelector(".app-card")?.classList.remove("active-pocketflow");
}



/* ============================================================
   CLICK + KEYBOARD ACTIVATION
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {

    const notesCard = document.querySelector(".writingpro-card");
    const pocketCard = document.querySelector(".app-card");
    const calculatorCard = document.querySelector(".calculator");

    /* -----------------------------
       Notes click
    ----------------------------- */
    notesCard?.addEventListener("click", (e) => {
        e.stopImmediatePropagation();
        activateNotesApp();
    });

    /* -----------------------------
       PocketFlow click
    ----------------------------- */
    pocketCard?.addEventListener("click", (e) => {
        e.stopImmediatePropagation();
        activatePocketFlow();
    });

    /* -----------------------------
       Calculator click (FINAL FIX)
    ----------------------------- */
    calculatorCard?.addEventListener("click", (e) => {
        e.stopImmediatePropagation();   // ← THE REAL FIX
        e.preventDefault();

        // Ensure calculator is clickable
        calculatorCard.style.pointerEvents = "auto";

        // Ensure parent is clickable
        const parent = calculatorCard.closest(".RIGHT, .app-card, .calculator-wrapper");
        if (parent) parent.style.pointerEvents = "auto";

        activateCalculatorApp();
    });

    // Default mode
    activatePocketFlow();

    /* ============================================================
       KEYBOARD SHORTCUTS
       ALT + X → Notes
       ALT + P → PocketFlow
       ALT + C → Calculator
       ============================================================ */
    document.addEventListener("keydown", (e) => {
        if (!e.altKey) return;

        const key = e.key.toLowerCase();

        if (key === "x") activateNotesApp();
        if (key === "p") activatePocketFlow();
        if (key === "c") activateCalculatorApp();
    });
});