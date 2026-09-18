// ============================================================
//  modal-init.js — يتحمل قبل script.js عشان openModal تكون جاهزة فوراً
//  مش type="module" عشان الدوال تبقى global متاحة للـ onclick في HTML
// ============================================================

window.openModal = function () {
    var modal = document.getElementById("authModal");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
};

window.closeModal = function () {
    var modal = document.getElementById("authModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
};

window.handleOverlayClick = function (event) {
    if (event.target === document.getElementById("authModal")) {
        window.closeModal();
    }
};