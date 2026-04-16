let notesEnabled = true;

const notes = (() => {
    let pages = [];
    let historyStack = [];
    let redoStack = [];

    let findTerm = "";
    let findMatches = [];
    let currentMatchIndex = -1;

    const documentEl = document.getElementById("document");
    const pageListEl = document.getElementById("pageList");
    const findBarEl = document.getElementById("findBar");
    const findInputEl = document.getElementById("findInput");
    const findCountLabelEl = document.getElementById("findCountLabel");
    const screenshotInputEl = document.getElementById("screenshotInput");

    window.addEventListener("load", () => {
        loadState();

        if (!pages || pages.length === 0) {
            addInitialPage();
            saveState();
        }

        renderAll();
        restoreScroll();
        setupInputListeners();

        setInterval(saveState, 2000);
    });

    function addInitialPage() {
        pages.push({
            id: generateId(),
            date: formatDate(new Date()),
            content: ""
        });
    }

    function generateId() {
        return "p_" + Math.random().toString(36).slice(2);
    }

    function formatDate(d) {
        const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
        const month = d.toLocaleDateString("en-GB", { month: "long" });
        const year = d.getFullYear();
        const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
        return `${day} ${month} ${year} ${weekday}`;
    }

    function pushHistory() {
        historyStack.push(JSON.stringify(pages));
        if (historyStack.length > 100) historyStack.shift();
        redoStack = [];
    }

    
    function renderAll(activeId) {
        documentEl.innerHTML = "";
        pageListEl.innerHTML = "";

        pages.forEach((page, index) => {

            /* PAGE CONTAINER */
            const pageEl = document.createElement("div");
            pageEl.className = "Writing-page";
            pageEl.dataset.pageId = page.id;

            /* HEADER */
            const header = document.createElement("div");
            header.className = "Writing-page-header";

            const headerLeft = document.createElement("div");
            headerLeft.className = "Writing-page-header-left";
            headerLeft.innerHTML = `
                <span>Page ${index + 1}</span>
                <span>${page.date}</span>
            `;

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "Writing-page-delete-btn";
            deleteBtn.textContent = "✕";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                toggleDeletePopup(deleteBtn, page.id);
            };

            header.appendChild(headerLeft);
            header.appendChild(deleteBtn);
            pageEl.appendChild(header);

            /* CONTENT */
            const content = document.createElement("div");
            content.className = "Writing-page-content";
            content.contentEditable = "true";
            content.innerHTML = page.content;

            content.addEventListener("input", () => {
                if (!notesEnabled) return;
                page.content = content.innerHTML;
            });

            pageEl.appendChild(content);
            documentEl.appendChild(pageEl);

            /* SIDEBAR ITEM */
            const item = document.createElement("div");
            item.className = "Writing-page-list-item";
            item.textContent = `Page ${index + 1} - ${page.date}`;
            item.dataset.pageId = page.id;

            if ((activeId && activeId === page.id) || (!activeId && index === 0)) {
                item.classList.add("active");
            }

            item.onclick = () => scrollToPage(page.id);
            pageListEl.appendChild(item);
        });
    }

    function scrollToPage(pageId) {
        const pageEl = document.querySelector(`.Writing-page[data-page-id="${pageId}"]`);
        if (pageEl) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
            highlightActiveSidebar(pageId);
        }
    }

    function highlightActiveSidebar(pageId) {
        document.querySelectorAll(".Writing-page-list-item").forEach(item => {
            item.classList.toggle("active", item.dataset.pageId === pageId);
        });
    }

    function toggleDeletePopup(deleteBtn, pageId) {
        const existing = deleteBtn.parentNode.querySelector(".delete-popup");
        if (existing) {
            existing.remove();
            return;
        }

        const popup = document.createElement("div");
        popup.className = "delete-popup";

        popup.innerHTML = `
            <div class="delete-popup-text">Delete this page?</div>
            <div class="delete-popup-buttons">
                <button class="delete-confirm">Delete</button>
                <button class="delete-cancel">Cancel</button>
            </div>
        `;

        deleteBtn.parentNode.appendChild(popup);

        popup.querySelector(".delete-confirm").onclick = (e) => {
            e.stopPropagation();
            confirmDeletePage(pageId);
        };

        popup.querySelector(".delete-cancel").onclick = (e) => {
            e.stopPropagation();
            popup.remove();
        };
    }

    function confirmDeletePage(pageId) {
        pushHistory();

        const index = pages.findIndex(p => p.id === pageId);
        if (index === -1) return;

        pages.splice(index, 1);

        if (pages.length === 0) addInitialPage();

        renderAll();
        saveState();
    }

    function setupInputListeners() {
        documentEl.addEventListener("click", (e) => {
            if (!notesEnabled) return;

            if (e.target.classList.contains("checklist-checkbox")) {
                toggleCheckboxState(e.target);
            }
        });
    }

    function getCurrentPageElement() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        let node = sel.anchorNode;
        if (!node) return null;
        if (node.nodeType === 3) node = node.parentNode;
        return node.closest(".Writing-page");
    }

    function getCurrentPageIndex() {
        const pageEl = getCurrentPageElement();
        if (!pageEl) return 0;
        const id = pageEl.dataset.pageId;
        return pages.findIndex(p => p.id === id);
    }

    function undoAction() {
        if (!notesEnabled) return;
        if (historyStack.length === 0) return;
        redoStack.push(JSON.stringify(pages));
        pages = JSON.parse(historyStack.pop());
        renderAll();
    }

    function redoAction() {
        if (!notesEnabled) return;
        if (redoStack.length === 0) return;
        historyStack.push(JSON.stringify(pages));
        pages = JSON.parse(redoStack.pop());
        renderAll();
    }

   function applyHighlight() {
        if (!notesEnabled) return;

        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        if (range.collapsed) return;

        pushHistory();

        const span = document.createElement("span");
        span.className = "highlight";
        range.surroundContents(span);

        updatePageFromDom();
    }

    function toggleChecklist() {
        if (!notesEnabled) return;

        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        let node = sel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;

        const line = node.closest("div, p, span");
        if (!line) return;

        pushHistory();

        const existing = line.querySelector(".checklist-checkbox");
        if (existing) {
            existing.remove();
            line.classList.remove("checklist-line");
            updatePageFromDom();
            return;
        }

        const checkbox = document.createElement("span");
        checkbox.className = "checklist-checkbox";
        checkbox.textContent = "☐ ";
        line.insertBefore(checkbox, line.firstChild);
        line.classList.add("checklist-line");

        updatePageFromDom();
    }

    function toggleCheckboxState(checkbox) {
        if (!notesEnabled) return;

        pushHistory();
        checkbox.textContent = checkbox.textContent.startsWith("☐") ? "☑ " : "☐ ";
        updatePageFromDom();
    }

    function addPageBreak() {
        if (!notesEnabled) return;

        const pageEl = getCurrentPageElement();
        if (!pageEl) return;

        const contentEl = pageEl.querySelector(".Writing-page-content");

        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        pushHistory();

        const marker = document.createElement("span");
        marker.id = "page-break-marker";
        range.insertNode(marker);

        const html = contentEl.innerHTML;
        const parts = html.split('<span id="page-break-marker"></span>');

        const markerNode = document.getElementById("page-break-marker");
        if (markerNode) markerNode.remove();

        const before = parts[0];
        const after = parts[1] || "";

        const pageIndex = getCurrentPageIndex();
        pages[pageIndex].content = before;

        const newPage = {
            id: generateId(),
            date: formatDate(new Date()),
            content: after
        };

        pages.splice(pageIndex + 1, 0, newPage);

        renderAll(newPage.id);
        scrollToPage(newPage.id);
        saveState();
    }

    function jumpToPage() {
        if (!notesEnabled) return;

        const num = prompt("Jump to page number:");
        if (!num) return;

        const index = parseInt(num, 10) - 1;
        if (isNaN(index) || index < 0 || index >= pages.length) return;

        scrollToPage(pages[index].id);
    }

    function triggerScreenshot() {
        if (!notesEnabled) return;
        screenshotInputEl.click();
    }

    function insertScreenshot(event) {
        if (!notesEnabled) return;

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;

            pushHistory();

            const range = sel.getRangeAt(0);
            const img = document.createElement("img");
            img.src = e.target.result;
            img.className = "screenshot";

            range.insertNode(img);
            range.setStartAfter(img);
            range.collapse(true);

            sel.removeAllRanges();
            sel.addRange(range);

            updatePageFromDom();
            screenshotInputEl.value = "";
        };

        reader.readAsDataURL(file);
    }

    screenshotInputEl.addEventListener("change", insertScreenshot);

    function toggleFindBar() {
        if (!notesEnabled) return;

        findBarEl.classList.toggle("hidden");
        if (!findBarEl.classList.contains("hidden")) {
            findInputEl.focus();
        } else {
            clearFindHighlights();
        }
    }

    function closeFindBar() {
        findBarEl.classList.add("hidden");
        clearFindHighlights();
    }

    function performFind() {
        if (!notesEnabled) return;

        findTerm = findInputEl.value.trim();

        clearFindHighlights(false);
        findMatches = [];
        currentMatchIndex = -1;

        if (!findTerm) {
            updateFindCount();
            return;
        }

        const escaped = findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "gi");

        const pageEls = document.querySelectorAll(".Writing-page");
        pageEls.forEach(pageEl => {
            const contentEl = pageEl.querySelector(".Writing-page-content");
            highlightMatchesInNode(contentEl, regex);
        });

        findMatches = Array.from(document.querySelectorAll(".highlight"));

        if (findMatches.length > 0) {
            currentMatchIndex = 0;
            markCurrentMatch();
            scrollToCurrentMatch();
        }

        updateFindCount();
    }

    function highlightMatchesInNode(root, regex) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (node.parentNode && node.parentNode.tagName === "IMG") {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach(node => {
            const text = node.nodeValue;

            regex.lastIndex = 0;
            if (!regex.test(text)) return;

            regex.lastIndex = 0;

            const frag = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                const before = text.slice(lastIndex, match.index);
                if (before) frag.appendChild(document.createTextNode(before));

                const span = document.createElement("span");
                span.className = "highlight";
                span.textContent = match[0];
                frag.appendChild(span);

                lastIndex = match.index + match[0].length;
            }

            const after = text.slice(lastIndex);
            if (after) frag.appendChild(document.createTextNode(after));

            node.parentNode.replaceChild(frag, node);
        });
    }

    function clearFindHighlights(resetTerm = true) {
        const pageEls = document.querySelectorAll(".Writing-page");

        pageEls.forEach((pageEl, index) => {
            const contentEl = pageEl.querySelector(".Writing-page-content");
            if (!contentEl) return;

            const spans = contentEl.querySelectorAll("span.highlight, span.highlight-current");
            spans.forEach(span => {
                const text = document.createTextNode(span.textContent);
                span.parentNode.replaceChild(text, span);
            });

            pages[index].content = contentEl.innerHTML;
        });

        if (resetTerm) {
            findTerm = "";
            findInputEl.value = "";
        }

        findMatches = [];
        currentMatchIndex = -1;
        updateFindCount();
    }

    function updateFindCount() {
        const count = findMatches.length;
        findCountLabelEl.textContent = `Found ${count} result${count === 1 ? "" : "s"}`;
    }

    function markCurrentMatch() {
        findMatches.forEach(el => el.classList.remove("highlight-current"));
        if (currentMatchIndex >= 0 && currentMatchIndex < findMatches.length) {
            findMatches[currentMatchIndex].classList.add("highlight-current");
        }
    }

    function scrollToCurrentMatch() {
        if (currentMatchIndex >= 0 && currentMatchIndex < findMatches.length) {
            findMatches[currentMatchIndex].scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function findNext() {
        if (!notesEnabled) return;
        if (!findMatches.length) return;
        currentMatchIndex = (currentMatchIndex + 1) % findMatches.length;
        markCurrentMatch();
        scrollToCurrentMatch();
    }

    function findPrev() {
        if (!notesEnabled) return;
        if (!findMatches.length) return;
        currentMatchIndex = (currentMatchIndex - 1 + findMatches.length) % findMatches.length;
        markCurrentMatch();
        scrollToCurrentMatch();
    }

   function saveState() {
        const data = {
            pages,
            scrollTop: documentEl.scrollTop
        };
        localStorage.setItem("writingpro_state", JSON.stringify(data));
    }

    function loadState() {
        const raw = localStorage.getItem("writingpro_state");
        if (!raw) return;

        try {
            const data = JSON.parse(raw);

            if (!data.pages || data.pages.length === 0) {
                pages = [];
                return;
            }

            pages = data.pages;

            if (typeof data.scrollTop === "number") {
                setTimeout(() => {
                    documentEl.scrollTop = data.scrollTop;
                }, 50);
            }
        } catch (e) {
            console.error("Failed to load state", e);
        }
    }

    function restoreScroll() {
        const raw = localStorage.getItem("writingpro_state");
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            if (typeof data.scrollTop === "number") {
                documentEl.scrollTop = data.scrollTop;
            }
        } catch (e) {}
    }

    function updatePageFromDom() {
        const pageEls = document.querySelectorAll(".Writing-page");
        pageEls.forEach((pageEl, index) => {
            const contentEl = pageEl.querySelector(".Writing-page-content");
            pages[index].content = contentEl.innerHTML;
        });
        saveState();
    }

   return {
        undoAction,
        redoAction,
        applyHighlight,
        toggleChecklist,
        addPageBreak,
        jumpToPage,
        triggerScreenshot,
        toggleFindBar,
        closeFindBar,
        performFind,
        findNext,
        findPrev,

        enableNotes() {
            notesEnabled = true;
            document.body.classList.remove("notes-disabled");
        },

        disableNotes() {
            notesEnabled = false;
            document.body.classList.add("notes-disabled");
        }
    };

})();