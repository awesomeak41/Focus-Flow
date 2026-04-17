/* ============================================================
   BACKGROUND CUSTOMIZER ENGINE
   Solid • Gradient • Wallpaper • Blur • Shuffle
   Fill / Fit / Stretch / Center / Tile
   Gradient Style Grid • Apply / Cancel / Reset
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("bg-customizer-btn");
    const popup = document.getElementById("bg-customizer-popup");
    const overlay = document.getElementById("bg-overlay");

    if (!btn || !popup || !overlay) return;

    /* ============================================================
       PERSISTENT STATE (SAVED)
    ============================================================ */

    let state = {
        mode: "solid", // solid | gradient | wallpaper

        solidColor: "#ffffff",

        gradient: {
            type: "linear",          // linear | radial | conic | square | circular | striped
            direction: 135,
            colors: ["#180B10", "#1e3c72"], // min 2, max 5
            stops: [0, 100]
        },

        wallpapers: [],             // array of data URLs
        currentWallpaper: null,

        // Wallpaper display options
        wallpaperDisplay: "fill",   // fill | fit | stretch | center | tile
        wallpaperPosition: "center",// center | top | bottom | left | right
        wallpaperRepeat: "no-repeat", // no-repeat | repeat | repeat-x | repeat-y
        wallpaperAttachment: "fixed", // fixed | scroll

        shuffleEnabled: false,
        shuffleDelay: 3000,         // ms

        blur: 0
    };

    const saved = localStorage.getItem("bg_customizer_state");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            // Deep merge for nested objects
            if (parsed.gradient) {
                state.gradient = { ...state.gradient, ...parsed.gradient };
            }
        } catch {}
    }

    function saveState() {
        localStorage.setItem("bg_customizer_state", JSON.stringify(state));
    }

    /* ============================================================
       APPLY BACKGROUND TO OVERLAY
    ============================================================ */

    function computeWallpaperCSS() {
        let size = "cover";
        let repeat = state.wallpaperRepeat || "no-repeat";
        let position = "center center";

        // Display mode overrides some of these
        switch (state.wallpaperDisplay) {
            case "fill":
                size = "cover";
                repeat = "no-repeat";
                position = "center center";
                break;
            case "fit":
                size = "contain";
                repeat = "no-repeat";
                position = "center center";
                break;
            case "stretch":
                size = "100% 100%";
                repeat = "no-repeat";
                position = "center center";
                break;
            case "center":
                size = "auto";
                repeat = "no-repeat";
                position = "center center";
                break;
            case "tile":
                size = "auto";
                repeat = "repeat";
                position = "top left";
                break;
        }

        // Position override
        switch (state.wallpaperPosition) {
            case "top": position = "top center"; break;
            case "bottom": position = "bottom center"; break;
            case "left": position = "center left"; break;
            case "right": position = "center right"; break;
            case "center": default: position = "center center"; break;
        }

        const attachment = state.wallpaperAttachment === "scroll" ? "scroll" : "fixed";

        return { size, repeat, position, attachment };
    }

    function applyBackground() {
        let bg = "";

        if (state.mode === "solid") {
            bg = state.solidColor;
        }

        if (state.mode === "gradient") {
            const colors = state.gradient.colors
                .map((c, i) => `${c} ${state.gradient.stops[i]}%`)
                .join(", ");

            switch (state.gradient.type) {
                case "linear":
                    bg = `linear-gradient(${state.gradient.direction}deg, ${colors})`;
                    break;
                case "radial":
                    bg = `radial-gradient(circle, ${colors})`;
                    break;
                case "conic":
                    bg = `conic-gradient(${colors})`;
                    break;
                case "square":
                    bg = `repeating-linear-gradient(45deg, ${colors})`;
                    break;
                case "circular":
                    bg = `repeating-radial-gradient(circle, ${colors})`;
                    break;
                case "striped":
                    bg = `repeating-linear-gradient(
                        ${state.gradient.direction}deg,
                        ${colors}
                    )`;
                    break;
                default:
                    bg = `linear-gradient(${state.gradient.direction}deg, ${colors})`;
            }
        }

        if (state.mode === "wallpaper" && state.currentWallpaper) {
            bg = `url(${state.currentWallpaper})`;
        }

        overlay.style.background = bg;
        overlay.style.filter = `blur(${state.blur}px)`;

        if (state.mode === "wallpaper" && state.currentWallpaper) {
            const css = computeWallpaperCSS();
            overlay.style.backgroundSize = css.size;
            overlay.style.backgroundRepeat = css.repeat;
            overlay.style.backgroundPosition = css.position;
            overlay.style.backgroundAttachment = css.attachment;
        } else {
            overlay.style.backgroundSize = "cover";
            overlay.style.backgroundRepeat = "no-repeat";
            overlay.style.backgroundPosition = "center center";
            overlay.style.backgroundAttachment = "fixed";
        }
    }

    applyBackground();

    /* ============================================================
       SHUFFLE WALLPAPERS
    ============================================================ */

    let shuffleInterval = null;

    function startShuffle() {
        clearInterval(shuffleInterval);

        if (!state.shuffleEnabled || state.wallpapers.length === 0) return;

        shuffleInterval = setInterval(() => {
            const index = Math.floor(Math.random() * state.wallpapers.length);
            state.currentWallpaper = state.wallpapers[index];
            saveState();
            applyBackground();
        }, state.shuffleDelay);
    }

    startShuffle();

    /* ============================================================
       TEMP STATE FOR APPLY / CANCEL
    ============================================================ */

    let tempState = null;

    function cloneState(src) {
        return JSON.parse(JSON.stringify(src));
    }

    /* ============================================================
       PREVIEW TEMP STATE (LIVE PREVIEW)
    ============================================================ */

    function previewTemp() {
        const backup = state;
        state = tempState;
        applyBackground();
        state = backup;
    }

    /* ============================================================
       SMALL HELPERS
    ============================================================ */

    function createLabel(text) {
        const l = document.createElement("label");
        l.textContent = text;
        return l;
    }

    function createSectionTitle(text) {
        const h = document.createElement("h3");
        h.textContent = text;
        h.style.marginTop = "12px";
        h.style.marginBottom = "6px";
        h.style.fontSize = "13px";
        return h;
    }

    /* ============================================================
       GRADIENT STYLE GRID
    ============================================================ */

    function buildGradientStyleGrid(container) {
        const styles = [
            { key: "linear", label: "Linear" },
            { key: "radial", label: "Radial" },
            { key: "conic", label: "Conic" },
            { key: "square", label: "Square" },
            { key: "circular", label: "Circular" },
            { key: "striped", label: "Striped" }
        ];

        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(3, 1fr)";
        grid.style.gap = "6px";
        grid.style.marginBottom = "8px";

        styles.forEach(style => {
            const box = document.createElement("div");
            box.style.border = "1px solid #ccc";
            box.style.borderRadius = "4px";
            box.style.padding = "4px";
            box.style.cursor = "pointer";
            box.style.display = "flex";
            box.style.flexDirection = "column";
            box.style.alignItems = "center";
            box.style.fontSize = "11px";

            const preview = document.createElement("div");
            preview.style.width = "100%";
            preview.style.height = "24px";
            preview.style.borderRadius = "3px";

            const sampleColors = tempState.gradient.colors.length >= 2
                ? tempState.gradient.colors
                : ["#180B10", "#1e3c72"];

            const colorStr = sampleColors
                .map((c, i) => `${c} ${Math.round((i / (sampleColors.length - 1 || 1)) * 100)}%`)
                .join(", ");

            switch (style.key) {
                case "linear":
                    preview.style.background = `linear-gradient(90deg, ${colorStr})`;
                    break;
                case "radial":
                    preview.style.background = `radial-gradient(circle, ${colorStr})`;
                    break;
                case "conic":
                    preview.style.background = `conic-gradient(${colorStr})`;
                    break;
                case "square":
                    preview.style.background = `repeating-linear-gradient(45deg, ${colorStr})`;
                    break;
                case "circular":
                    preview.style.background = `repeating-radial-gradient(circle, ${colorStr})`;
                    break;
                case "striped":
                    preview.style.background = `repeating-linear-gradient(135deg, ${colorStr})`;
                    break;
            }

            const label = document.createElement("span");
            label.textContent = style.label;

            if (tempState.gradient.type === style.key) {
                box.style.borderColor = "#0078d4";
            }

            box.onclick = () => {
                tempState.gradient.type = style.key;
                buildUI();
                previewTemp();
            };

            box.appendChild(preview);
            box.appendChild(label);
            grid.appendChild(box);
        });

        container.appendChild(grid);
    }

    /* ============================================================
       WALLPAPER DISPLAY CONTROLS
    ============================================================ */

    function buildWallpaperDisplayControls(container) {
        container.appendChild(createSectionTitle("Wallpaper Display"));

        // Dropdown
        const dropdownLabel = createLabel("Mode:");
        container.appendChild(dropdownLabel);

        const modeSelect = document.createElement("select");
        modeSelect.innerHTML = `
            <option value="fill">Fill</option>
            <option value="fit">Fit</option>
            <option value="stretch">Stretch</option>
            <option value="center">Center</option>
            <option value="tile">Tile</option>
        `;
        modeSelect.value = tempState.wallpaperDisplay;
        modeSelect.onchange = () => {
            tempState.wallpaperDisplay = modeSelect.value;
            previewTemp();
        };
        container.appendChild(modeSelect);

        // Button row
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.flexWrap = "wrap";
        row.style.gap = "4px";
        row.style.marginTop = "6px";

        const modes = [
            { key: "fill", label: "Fill" },
            { key: "fit", label: "Fit" },
            { key: "stretch", label: "Stretch" },
            { key: "center", label: "Center" },
            { key: "tile", label: "Tile" }
        ];

        modes.forEach(m => {
            const b = document.createElement("button");
            b.textContent = m.label;
            b.style.padding = "2px 6px";
            if (tempState.wallpaperDisplay === m.key) {
                b.style.background = "#0078d4";
                b.style.color = "#fff";
            }
            b.onclick = () => {
                tempState.wallpaperDisplay = m.key;
                buildUI();
                previewTemp();
            };
            row.appendChild(b);
        });

        container.appendChild(row);

        // Minimal icon grid
        const iconTitle = createLabel("Quick icons:");
        container.appendChild(iconTitle);

        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(3, 1fr)";
        grid.style.gap = "6px";
        grid.style.marginTop = "4px";

        modes.forEach(m => {
            const box = document.createElement("div");
            box.style.border = "1px solid #ccc";
            box.style.borderRadius = "4px";
            box.style.padding = "4px";
            box.style.cursor = "pointer";
            box.style.display = "flex";
            box.style.flexDirection = "column";
            box.style.alignItems = "center";
            box.style.fontSize = "11px";

            const sq = document.createElement("div");
            sq.style.width = "100%";
            sq.style.height = "18px";
            sq.style.borderRadius = "3px";
            sq.style.background = "#ddd";

            // Simple visual hints
            if (m.key === "fill") {
                sq.style.background = "linear-gradient(135deg, #444, #aaa)";
            } else if (m.key === "fit") {
                sq.style.border = "2px solid #444";
                sq.style.background = "#eee";
            } else if (m.key === "stretch") {
                sq.style.background = "linear-gradient(90deg, #444, #aaa)";
            } else if (m.key === "center") {
                sq.style.background = "#eee";
                sq.style.boxShadow = "0 0 0 4px #ccc inset";
            } else if (m.key === "tile") {
                sq.style.backgroundImage =
                    "linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)";
                sq.style.backgroundSize = "4px 4px";
            }

            const label = document.createElement("span");
            label.textContent = m.label;

            if (tempState.wallpaperDisplay === m.key) {
                box.style.borderColor = "#0078d4";
            }

            box.onclick = () => {
                tempState.wallpaperDisplay = m.key;
                buildUI();
                previewTemp();
            };

            box.appendChild(sq);
            box.appendChild(label);
            grid.appendChild(box);
        });

        container.appendChild(grid);

        // Position
        container.appendChild(createSectionTitle("Position"));

        const posRow = document.createElement("div");
        posRow.style.display = "flex";
        posRow.style.flexWrap = "wrap";
        posRow.style.gap = "4px";

        const positions = [
            { key: "center", label: "Center" },
            { key: "top", label: "Top" },
            { key: "bottom", label: "Bottom" },
            { key: "left", label: "Left" },
            { key: "right", label: "Right" }
        ];

        positions.forEach(p => {
            const b = document.createElement("button");
            b.textContent = p.label;
            b.style.padding = "2px 6px";
            if (tempState.wallpaperPosition === p.key) {
                b.style.background = "#0078d4";
                b.style.color = "#fff";
            }
            b.onclick = () => {
                tempState.wallpaperPosition = p.key;
                buildUI();
                previewTemp();
            };
            posRow.appendChild(b);
        });

        container.appendChild(posRow);

        // Repeat
        container.appendChild(createSectionTitle("Repeat"));

        const repRow = document.createElement("div");
        repRow.style.display = "flex";
        repRow.style.flexWrap = "wrap";
        repRow.style.gap = "4px";

        const repeats = [
            { key: "no-repeat", label: "No Repeat" },
            { key: "repeat", label: "Repeat" },
            { key: "repeat-x", label: "Repeat-X" },
            { key: "repeat-y", label: "Repeat-Y" }
        ];

        repeats.forEach(r => {
            const b = document.createElement("button");
            b.textContent = r.label;
            b.style.padding = "2px 6px";
            if (tempState.wallpaperRepeat === r.key) {
                b.style.background = "#0078d4";
                b.style.color = "#fff";
            }
            b.onclick = () => {
                tempState.wallpaperRepeat = r.key;
                buildUI();
                previewTemp();
            };
            repRow.appendChild(b);
        });

        container.appendChild(repRow);

        // Attachment
        container.appendChild(createSectionTitle("Attachment"));

        const attRow = document.createElement("div");
        attRow.style.display = "flex";
        attRow.style.flexWrap = "wrap";
        attRow.style.gap = "4px";

        const attachments = [
            { key: "fixed", label: "Fixed" },
            { key: "scroll", label: "Scroll" }
        ];

        attachments.forEach(a => {
            const b = document.createElement("button");
            b.textContent = a.label;
            b.style.padding = "2px 6px";
            if (tempState.wallpaperAttachment === a.key) {
                b.style.background = "#0078d4";
                b.style.color = "#fff";
            }
            b.onclick = () => {
                tempState.wallpaperAttachment = a.key;
                buildUI();
                previewTemp();
            };
            attRow.appendChild(b);
        });

        container.appendChild(attRow);
    }

    /* ============================================================
       BUILD POPUP UI (DYNAMIC, USING tempState)
    ============================================================ */

    function buildUI() {
        popup.innerHTML = "";

        const title = document.createElement("h2");
        title.textContent = "Background Settings";
        popup.appendChild(title);

        /* Mode Selector */
        const modeLabel = createLabel("Mode:");
        popup.appendChild(modeLabel);

        const modeSelect = document.createElement("select");
        modeSelect.innerHTML = `
            <option value="solid">Solid Color</option>
            <option value="gradient">Gradient</option>
            <option value="wallpaper">Wallpaper</option>
        `;
        modeSelect.value = tempState.mode;
        modeSelect.onchange = () => {
            tempState.mode = modeSelect.value;
            buildUI();
            previewTemp();
        };
        popup.appendChild(modeSelect);

        /* ---------------- SOLID MODE ---------------- */
        if (tempState.mode === "solid") {
            const colorLabel = createLabel("Color:");
            popup.appendChild(colorLabel);

            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.value = tempState.solidColor;
            colorInput.oninput = () => {
                tempState.solidColor = colorInput.value;
                previewTemp();
            };
            popup.appendChild(colorInput);
        }

        /* ---------------- GRADIENT MODE ---------------- */
        if (tempState.mode === "gradient") {

            popup.appendChild(createSectionTitle("Gradient Style"));

            const styleContainer = document.createElement("div");
            buildGradientStyleGrid(styleContainer);
            popup.appendChild(styleContainer);

            if (tempState.gradient.type === "linear" || tempState.gradient.type === "striped") {
                const dirLabel = createLabel("Direction (0–360°):");
                popup.appendChild(dirLabel);

                const dirInput = document.createElement("input");
                dirInput.type = "number";
                dirInput.min = 0;
                dirInput.max = 360;
                dirInput.value = tempState.gradient.direction;
                dirInput.oninput = () => {
                    tempState.gradient.direction = Number(dirInput.value) || 0;
                    previewTemp();
                };
                popup.appendChild(dirInput);
            }

            const colorsLabel = createLabel("Colors & Stops (%):");
            popup.appendChild(colorsLabel);

            const colorList = document.createElement("div");
            colorList.style.marginTop = "6px";

            tempState.gradient.colors.forEach((color, i) => {
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.gap = "6px";
                row.style.marginBottom = "6px";
                row.style.alignItems = "center";

                const colorInput = document.createElement("input");
                colorInput.type = "color";
                colorInput.value = color;
                colorInput.oninput = () => {
                    tempState.gradient.colors[i] = colorInput.value;
                    previewTemp();
                };

                const stopInput = document.createElement("input");
                stopInput.type = "number";
                stopInput.min = 0;
                stopInput.max = 100;
                stopInput.value = tempState.gradient.stops[i];
                stopInput.style.width = "60px";
                stopInput.oninput = () => {
                    tempState.gradient.stops[i] = Number(stopInput.value) || 0;
                    previewTemp();
                };

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "✕";
                removeBtn.style.padding = "2px 6px";
                removeBtn.disabled = tempState.gradient.colors.length <= 2;
                removeBtn.onclick = () => {
                    if (tempState.gradient.colors.length > 2) {
                        tempState.gradient.colors.splice(i, 1);
                        tempState.gradient.stops.splice(i, 1);
                        buildUI();
                        previewTemp();
                    }
                };

                row.appendChild(colorInput);
                row.appendChild(stopInput);
                row.appendChild(removeBtn);
                colorList.appendChild(row);
            });

            popup.appendChild(colorList);

            const addColorBtn = document.createElement("button");
            addColorBtn.textContent = "Add Color";
            addColorBtn.style.marginTop = "4px";
            addColorBtn.disabled = tempState.gradient.colors.length >= 5;
            addColorBtn.onclick = () => {
                if (tempState.gradient.colors.length < 5) {
                    tempState.gradient.colors.push("#ffffff");
                    tempState.gradient.stops.push(100);
                    buildUI();
                    previewTemp();
                }
            };
            popup.appendChild(addColorBtn);
        }

        /* ---------------- WALLPAPER MODE ---------------- */
        if (tempState.mode === "wallpaper") {

            const uploadLabel = createLabel("Upload Wallpaper:");
            popup.appendChild(uploadLabel);

            const uploadInput = document.createElement("input");
            uploadInput.type = "file";
            uploadInput.accept = "image/*";
            uploadInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    tempState.wallpapers.push(reader.result);
                    tempState.currentWallpaper = reader.result;
                    buildUI();
                    previewTemp();
                };
                reader.readAsDataURL(file);
            };
            popup.appendChild(uploadInput);

            if (tempState.wallpapers.length > 0) {
                const listLabel = createLabel("Saved Wallpapers:");
                popup.appendChild(listLabel);

                tempState.wallpapers.forEach((wp, i) => {
                    const row = document.createElement("div");
                    row.style.display = "flex";
                    row.style.justifyContent = "space-between";
                    row.style.alignItems = "center";
                    row.style.marginTop = "6px";

                    const useBtn = document.createElement("button");
                    useBtn.textContent = "Use";
                    useBtn.onclick = () => {
                        tempState.currentWallpaper = wp;
                        previewTemp();
                    };

                    const delBtn = document.createElement("button");
                    delBtn.textContent = "Delete";
                    delBtn.onclick = () => {
                        tempState.wallpapers.splice(i, 1);
                        if (tempState.currentWallpaper === wp) {
                            tempState.currentWallpaper = tempState.wallpapers[0] || null;
                        }
                        buildUI();
                        previewTemp();
                    };

                    row.appendChild(useBtn);
                    row.appendChild(delBtn);
                    popup.appendChild(row);
                });

                const shuffleRow = document.createElement("div");
                shuffleRow.style.marginTop = "10px";

                const shuffleToggle = document.createElement("input");
                shuffleToggle.type = "checkbox";
                shuffleToggle.checked = tempState.shuffleEnabled;
                shuffleToggle.onchange = () => {
                    tempState.shuffleEnabled = shuffleToggle.checked;
                    previewTemp();
                };

                const shuffleLabel = document.createElement("span");
                shuffleLabel.textContent = " Shuffle wallpapers";

                shuffleRow.appendChild(shuffleToggle);
                shuffleRow.appendChild(shuffleLabel);
                popup.appendChild(shuffleRow);

                const delayLabel = createLabel("Shuffle delay (ms):");
                popup.appendChild(delayLabel);

                const delayInput = document.createElement("input");
                delayInput.type = "number";
                delayInput.min = 100;
                delayInput.value = tempState.shuffleDelay;
                delayInput.oninput = () => {
                    tempState.shuffleDelay = Number(delayInput.value) || 1000;
                    previewTemp();
                };
                popup.appendChild(delayInput);
            }

            // Wallpaper display controls (fill/fit/stretch/center/tile etc.)
            const displayContainer = document.createElement("div");
            displayContainer.style.marginTop = "10px";
            buildWallpaperDisplayControls(displayContainer);
            popup.appendChild(displayContainer);
        }

        /* ---------------- BLUR SLIDER ---------------- */

        const blurLabel = createLabel("Blur:");
        popup.appendChild(blurLabel);

        const blurSlider = document.createElement("input");
        blurSlider.type = "range";
        blurSlider.min = 0;
        blurSlider.max = 30;
        blurSlider.value = tempState.blur;
        blurSlider.oninput = () => {
            tempState.blur = Number(blurSlider.value) || 0;
            previewTemp();
        };
        popup.appendChild(blurSlider);

        /* ---------------- ACTION BUTTONS ---------------- */

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "space-between";
        actions.style.marginTop = "16px";

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.onclick = () => {
            applyBackground(); // restore real state
            popup.style.display = "none";
        };

        const resetBtn = document.createElement("button");
        resetBtn.textContent = "Reset";
        resetBtn.onclick = () => {
            tempState = cloneState({
                mode: "solid",
                solidColor: "#ffffff",
                gradient: {
                    type: "linear",
                    direction: 135,
                    colors: ["#180B10", "#1e3c72"],
                    stops: [0, 100]
                },
                wallpapers: [],
                currentWallpaper: null,
                wallpaperDisplay: "fill",
                wallpaperPosition: "center",
                wallpaperRepeat: "no-repeat",
                wallpaperAttachment: "fixed",
                shuffleEnabled: false,
                shuffleDelay: 3000,
                blur: 0
            });
            state = cloneState(tempState);
            saveState();
            applyBackground();
            startShuffle();
            popup.style.display = "none";
        };

        const applyBtn = document.createElement("button");
        applyBtn.textContent = "Apply";
        applyBtn.onclick = () => {
            state = cloneState(tempState);
            saveState();
            applyBackground();
            startShuffle();
            popup.style.display = "none";
        };

        actions.appendChild(cancelBtn);
        actions.appendChild(resetBtn);
        actions.appendChild(applyBtn);
        popup.appendChild(actions);
    }

    /* ============================================================
       BUTTON TOGGLE
    ============================================================ */

    btn.addEventListener("click", () => {
        if (popup.style.display === "block") {
            popup.style.display = "none";
            applyBackground(); // restore real state
            return;
        }

        tempState = cloneState(state);
        popup.style.display = "block";
        buildUI();
        previewTemp();
    });
});