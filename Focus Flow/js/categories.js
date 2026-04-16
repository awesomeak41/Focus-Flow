document.addEventListener("DOMContentLoaded", () => {

    // BUTTONS
    const btnAddCategory = document.getElementById("btnAddCategory");
    const btnCancelCategory = document.getElementById("btnCatCancel");
    const btnSaveCategory = document.getElementById("btnCatSave");

    // POPUP OVERLAY
    const categoryForm = document.getElementById("addCategoryOverlay");

    // INPUT FIELDS
    const catCategory = document.getElementById("catCategoryPopup");
    const catSubCategory = document.getElementById("catSubCategoryPopup");
    const catSubCategoryNew = document.getElementById("catSubCategoryNew");
    const catHead = document.getElementById("catHeadPopup");
    const catNotes = document.getElementById("catNotesPopup");

    // TABLE
    const categoryTable = document.getElementById("categoryTable").querySelector("tbody");

    let editIndex = null;


    // ----------------------------------------------------
    // OPEN POPUP
    // ----------------------------------------------------
    btnAddCategory.onclick = () => {
        categoryForm.style.display = "flex";
        clearForm();
    };

    // CLOSE POPUP
    btnCancelCategory.onclick = () => {
        categoryForm.style.display = "none";
        clearForm();
    };


    // ----------------------------------------------------
    // LOAD SUB‑CATEGORIES BASED ON CATEGORY
    // ----------------------------------------------------
    function loadSubCategoriesFor(categoryName) {
        let data = JSON.parse(localStorage.getItem("categories") || "[]");

        const subSet = new Set();

        data.forEach(c => {
            if (c.category === categoryName && c.subCategory.trim() !== "") {
                subSet.add(c.subCategory.trim());
            }
        });

        catSubCategory.innerHTML = `
            <option value="" disabled selected>Select Sub‑Category</option>
            ${Array.from(subSet).sort().map(s => `<option value="${s}">${s}</option>`).join("")}
            <option value="__new__">+ Add New Sub‑Category</option>
        `;

        catSubCategoryNew.style.display = "none";
    }

    catCategory.addEventListener("change", () => {
        loadSubCategoriesFor(catCategory.value);
    });

    catSubCategory.addEventListener("change", () => {
        if (catSubCategory.value === "__new__") {
            catSubCategoryNew.style.display = "block";
            catSubCategoryNew.value = "";
            catSubCategoryNew.focus();
        } else {
            catSubCategoryNew.style.display = "none";
        }
    });


    // ----------------------------------------------------
    // LOAD CATEGORIES
    // ----------------------------------------------------
    function loadCategories() {
        let data = JSON.parse(localStorage.getItem("categories") || "[]");

        // Assign IDs to old categories
        let changed = false;
        data.forEach(cat => {
            if (!cat.id) {
                cat.id = Date.now() + Math.floor(Math.random() * 100000);
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem("categories", JSON.stringify(data));
        }

        // Sort
        data.sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            if (a.subCategory !== b.subCategory) return a.subCategory.localeCompare(b.subCategory);
            return a.name.localeCompare(b.name);
        });

        categoryTable.innerHTML = "";

        data.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${item.category}</td>
                <td>${item.subCategory || ""}</td>
                <td>${item.name || ""}</td>
                <td>${item.notes || ""}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" data-edit="${item.id}">✏️</button>
                    <button class="btn btn-outline btn-sm" data-delete="${item.id}">❌</button>
                </td>
            `;

            categoryTable.appendChild(row);
        });
    }


    // ----------------------------------------------------
    // CLEAR FORM
    // ----------------------------------------------------
    function clearForm() {
        catCategory.value = "";
        catSubCategory.innerHTML = `<option value="" disabled selected>Select Sub‑Category</option>`;
        catSubCategoryNew.style.display = "none";
        catHead.value = "";
        catNotes.value = "";
        editIndex = null;
    }


    // ----------------------------------------------------
    // SAVE CATEGORY (HEAD OPTIONAL)
    // ----------------------------------------------------
    btnSaveCategory.onclick = () => {

        // Category required
        if (!catCategory.value) {
            alert("Category is required.");
            return;
        }

        // Sub‑Category required
        let subCatValue =
            catSubCategory.value === "__new__"
                ? catSubCategoryNew.value.trim()
                : catSubCategory.value.trim();

        if (!subCatValue) {
            alert("Sub‑Category is required.");
            return;
        }

        // Head is optional
        let headValue = catHead.value.trim();

        let data = JSON.parse(localStorage.getItem("categories") || "[]");

        const item = {
            id: editIndex || Date.now(),
            category: catCategory.value,
            subCategory: subCatValue,
            name: headValue, // optional
            notes: catNotes.value.trim()
        };

        if (editIndex === null) {
            data.push(item);
        } else {
            const idx = data.findIndex(c => c.id === editIndex);
            if (idx !== -1) data[idx] = item;
        }

        localStorage.setItem("categories", JSON.stringify(data));

        document.dispatchEvent(new Event("categoriesUpdated"));

        loadCategories();
        categoryForm.style.display = "none";
        clearForm();
    };


    // ----------------------------------------------------
    // EDIT + DELETE HANDLER
    // ----------------------------------------------------
    categoryTable.addEventListener("click", (e) => {

        // EDIT
        if (e.target.dataset.edit !== undefined) {
            const id = Number(e.target.dataset.edit);

            let data = JSON.parse(localStorage.getItem("categories") || "[]");
            const item = data.find(c => c.id === id);
            if (!item) return;

            catCategory.value = item.category;
            loadSubCategoriesFor(item.category);

            if ([...catSubCategory.options].some(o => o.value === item.subCategory)) {
                catSubCategory.value = item.subCategory;
                catSubCategoryNew.style.display = "none";
            } else {
                catSubCategory.value = "__new__";
                catSubCategoryNew.style.display = "block";
                catSubCategoryNew.value = item.subCategory;
            }

            catHead.value = item.name || "";
            catNotes.value = item.notes || "";

            editIndex = id;
            categoryForm.style.display = "flex";
        }

        // DELETE
        // DELETE
if (e.target.dataset.delete !== undefined) {
    const id = Number(e.target.dataset.delete);

    let data = JSON.parse(localStorage.getItem("categories") || "[]");
    let txns = JSON.parse(localStorage.getItem("transactions") || "[]");

    const item = data.find(c => c.id === id);
    if (!item) return;

    // 🚫 CHECK IF CATEGORY IS USED ANYWHERE
    const isUsed = txns.some(t =>
        t.head === item.name ||
        t.category === item.category ||
        t.subCategory === item.subCategory
    );

    if (isUsed) {
        alert(
            `❌ Cannot delete this item.\n\n` +
            `It is used in existing transactions.\n\n` +
            `Category: ${item.category}\n` +
            `Sub‑Category: ${item.subCategory}\n` +
            `Head: ${item.name || "(none)"}\n\n` +
            `Please delete or update those transactions first.`
        );
        return; // ⛔ STOP — DO NOT DELETE
    }

    // SAFE TO DELETE
    if (confirm("Delete this category?")) {
        data = data.filter(c => c.id !== id);
        localStorage.setItem("categories", JSON.stringify(data));

        document.dispatchEvent(new Event("categoriesUpdated"));
        loadCategories();
    }
} {
            const id = Number(e.target.dataset.delete);

            let data = JSON.parse(localStorage.getItem("categories") || "[]");
            let txns = JSON.parse(localStorage.getItem("transactions") || "[]");

            const item = data.find(c => c.id === id);
            if (!item) return;

            const isUsed = txns.some(t =>
                t.head === item.name ||
                t.category === item.category ||
                t.subCategory === item.subCategory
            );

            if (isUsed) {
                alert(
                    `Cannot delete this category.\n\n` +
                    `It is used in existing transactions:\n\n` +
                    `Category: ${item.category}\n` +
                    `Sub‑Category: ${item.subCategory}\n` +
                    `Head: ${item.name || "(none)"}\n\n` +
                    `Please remove or update those transactions first.`
                );
                return;
            }

            if (confirm("Delete this category?")) {
                data = data.filter(c => c.id !== id);
                localStorage.setItem("categories", JSON.stringify(data));

                document.dispatchEvent(new Event("categoriesUpdated"));
                loadCategories();
            }
        }
    });


    // ----------------------------------------------------
    // AUTO REFRESH
    // ----------------------------------------------------
    document.addEventListener("categoriesUpdated", loadCategories);

    loadCategories();
});