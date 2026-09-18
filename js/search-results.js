import {
  fetchAllProducts,
  searchProducts,
  buildProductCard,
  collectColorValues,
  collectColorVariants,
  normalizeArabic,
  applyRealRatings,
  initRatingStatsModal,
} from "./search-shared.js";
import { trackAddToCart } from "./bestseller-tracker.js";

let allMatches = [];
let facets = { companies: [], colors: [], sizes: [], priceMin: 0, priceMax: 0 };
let filters = { companies: new Set(), colors: new Set(), sizes: new Set(), maxPrice: null, offersOnly: false };
let sortBy = "relevance";
let searchTerm = "";

const PAGE_SIZE = 10;
let currentPage = 1;

function getProductCompany(p) {
  return p.company || p.brand || p.manufacturer || p.maker || "";
}

function getQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("q") || params.get("search") || "").trim();
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function computeFacets(products) {
  const companyCounts = {};
  const colorCounts = {};
  const sizeCounts = {};
  let priceMin = Infinity;
  let priceMax = 0;

  products.forEach((p) => {
    const company = getProductCompany(p);
    if (company && String(company).trim() !== "") {
      const compKey = normalizeArabic(company);
      if (!companyCounts[compKey]) companyCounts[compKey] = { label: company, count: 0 };
      companyCounts[compKey].count += 1;
    }

    collectColorValues(p).forEach((color) => {
      const key = normalizeArabic(color);
      if (!key) return;
      if (!colorCounts[key]) colorCounts[key] = { label: color, count: 0 };
      colorCounts[key].count += 1;
    });

    if (p.size && String(p.size).trim() !== "") {
      const szKey = normalizeArabic(p.size);
      if (!sizeCounts[szKey]) sizeCounts[szKey] = { label: p.size, count: 0 };
      sizeCounts[szKey].count += 1;
    }

    const price = Number(p.price) || 0;
    if (price < priceMin) priceMin = price;
    if (price > priceMax) priceMax = price;
  });

  const companies = Object.keys(companyCounts)
    .map((key) => ({ key, label: companyCounts[key].label, count: companyCounts[key].count }))
    .sort((a, b) => b.count - a.count);

  const colors = Object.keys(colorCounts)
    .map((key) => ({ key, label: colorCounts[key].label, count: colorCounts[key].count }))
    .sort((a, b) => b.count - a.count);

  const sizes = Object.keys(sizeCounts)
    .map((key) => ({ key, label: sizeCounts[key].label, count: sizeCounts[key].count }))
    .sort((a, b) => b.count - a.count);

  return {
    companies,
    colors,
    sizes,
    priceMin: priceMin === Infinity ? 0 : priceMin,
    priceMax,
  };
}

function applyFilters(products) {
  // 1. تصفية الفئات والألوان والمقاسات والعروض أولاً
  let filtered = products.filter((p) => {
    if (filters.companies.size > 0) {
      const compKey = normalizeArabic(getProductCompany(p));
      if (!filters.companies.has(compKey)) return false;
    }

    if (filters.colors.size > 0) {
      const productColorKeys = collectColorValues(p).map(normalizeArabic);
      const hasColor = productColorKeys.some((k) => filters.colors.has(k));
      if (!hasColor) return false;
    }

    if (filters.sizes.size > 0) {
      const pSizeKey = normalizeArabic(p.size);
      if (!filters.sizes.has(pSizeKey)) return false;
    }

    if (filters.offersOnly) {
      const price = Number(p.price) || 0;
      const oldPrice = Number(p.old_price) || 0;
      if (!(oldPrice > price)) return false;
    }

    return true;
  });

  // 2. تصفية السعر بين أقل سعر ثابت حتى السعر الأقصى المدخل (أو إرجاع أقرب منتج عند عدم التوافق)
  if (filters.maxPrice !== null && filtered.length > 0) {
    const targetMaxPrice = filters.maxPrice;

    // البحث عن المنتجات التي تقع في النطاق من أقل سعر متاح إلى السعر الأقصى المدخل
    const exactOrLower = filtered.filter((p) => {
      const price = Number(p.price) || 0;
      return price >= facets.priceMin && price <= targetMaxPrice;
    });

    if (exactOrLower.length > 0) {
      filtered = exactOrLower;
    } else {
      // إرجاع أقرب منتج متوفر في حالة عدم وجود منتج ضمن النطاق
      const closestProduct = filtered.reduce((prev, curr) => {
        const prevDiff = Math.abs((Number(prev.price) || 0) - targetMaxPrice);
        const currDiff = Math.abs((Number(curr.price) || 0) - targetMaxPrice);
        return currDiff < prevDiff ? curr : prev;
      });
      filtered = [closestProduct];
    }
  }

  return filtered;
}

function getDiscountPercent(p) {
  const oldPrice = Number(p.old_price) || 0;
  if (oldPrice <= p.price) return 0;
  return ((oldPrice - p.price) / oldPrice) * 100;
}

function applySort(products) {
  const arr = [...products];
  if (sortBy === "price_asc") arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  else if (sortBy === "price_desc") arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  else if (sortBy === "discount_desc") arr.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
  return arr;
}

function isDesktopViewport() {
  return window.matchMedia("(min-width: 901px)").matches;
}

function renderFilters() {
  const container = document.getElementById("searchFilters");
  if (!container) return;

  const desktop = isDesktopViewport();
  const colorCollapsedClass = desktop ? "" : "collapsed";

  const sizesHtml = facets.sizes
    .map(
      (s) => `
      <label class="filter_option">
        <input type="checkbox" name="size" value="${s.key}" ${filters.sizes.has(s.key) ? "checked" : ""}>
        ${s.label} <span class="count">(${s.count})</span>
      </label>`
    )
    .join("");

  const colorsHtml = facets.colors
    .map(
      (c) => `
      <label class="filter_option">
        <input type="checkbox" name="color" value="${c.key}" data-label="${c.label}" ${filters.colors.has(c.key) ? "checked" : ""}>
        ${c.label} <span class="count">(${c.count})</span>
      </label>`
    )
    .join("");

  const companiesHtml = facets.companies
    .map(
      (co) => `
      <label class="filter_option">
        <input type="checkbox" name="company" value="${co.key}" ${filters.companies.has(co.key) ? "checked" : ""}>
        ${co.label} <span class="count">(${co.count})</span>
      </label>`
    )
    .join("");

  container.innerHTML = `
    <div class="filter_sheet_handle"></div>

    ${facets.sizes.length > 0 ? `
    <div class="filter_group collapsed" data-group="size">
      <div class="filter_group_header">
        <h4>المقاس</h4>
        <i class="fa-solid fa-chevron-down"></i>
      </div>
      <div class="filter_group_body">${sizesHtml}</div>
    </div>` : ""}

    <div class="filter_group" data-group="price">
      <div class="filter_group_header">
        <h4>السعر</h4>
        <i class="fa-solid fa-chevron-down"></i>
      </div>
      <div class="filter_group_body">
        <div class="filter_price_inputs">
          <input type="number" id="minPriceInput" value="${facets.priceMin}" readonly title="أقل سعر متاح لا يمكن تعديله">
          <span>-</span>
          <input type="number" id="maxPriceInput" placeholder="أقصى سعر" min="${facets.priceMin}" value="${filters.maxPrice ?? ""}">
        </div>
      </div>
    </div>

    <div class="filter_group filter_group_simple">
      <label class="filter_option">
        <input type="checkbox" id="offersOnlyInput" ${filters.offersOnly ? "checked" : ""}>
        عرض المنتجات المخصومة فقط
      </label>
    </div>

    ${facets.colors.length > 0 ? `
    <div class="filter_group ${colorCollapsedClass}" data-group="color">
      <div class="filter_group_header">
        <h4>اللون</h4>
        <i class="fa-solid fa-chevron-down"></i>
      </div>
      <div class="filter_group_body">
        <div class="filter_color_search">
          <input type="text" id="colorSearchInput" placeholder="ابحث عن لون...">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <div class="filter_color_list">${colorsHtml}</div>
      </div>
    </div>` : ""}

    ${facets.companies.length > 0 ? `
    <div class="filter_group collapsed" data-group="company">
      <div class="filter_group_header">
        <h4>الشركة المصنعة</h4>
        <i class="fa-solid fa-chevron-down"></i>
      </div>
      <div class="filter_group_body">${companiesHtml}</div>
    </div>` : ""}

    <button type="button" class="filter_clear_btn" id="clearFiltersBtn">مسح كل الفلاتر</button>
  `;

  // فتح/طي كل مجموعة فلتر عند الضغط على عنوانها
  container.querySelectorAll(".filter_group_header").forEach((header) => {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("collapsed");
    });
  });

  // بحث داخل قائمة الألوان
  const colorSearchInput = document.getElementById("colorSearchInput");
  if (colorSearchInput) {
    colorSearchInput.addEventListener("input", () => {
      const term = normalizeArabic(colorSearchInput.value.trim());
      container.querySelectorAll(".filter_color_list .filter_option").forEach((label) => {
        const text = normalizeArabic(label.textContent.trim());
        label.style.display = !term || text.includes(term) ? "flex" : "none";
      });
    });
  }

  container.querySelectorAll("input[name='size']").forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) filters.sizes.add(el.value);
      else filters.sizes.delete(el.value);
      currentPage = 1;
      renderResults();
    });
  });

  container.querySelectorAll("input[name='color']").forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) filters.colors.add(el.value);
      else filters.colors.delete(el.value);
      currentPage = 1;
      renderResults();
    });
  });

  container.querySelectorAll("input[name='company']").forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) filters.companies.add(el.value);
      else filters.companies.delete(el.value);
      currentPage = 1;
      renderResults();
    });
  });

  const applyMaxPrice = debounce(() => {
    const maxVal = document.getElementById("maxPriceInput").value;
    filters.maxPrice = maxVal !== "" && !isNaN(maxVal) ? Number(maxVal) : null;
    currentPage = 1;
    renderResults();
  }, 400);

  document.getElementById("maxPriceInput").addEventListener("input", applyMaxPrice);

  document.getElementById("offersOnlyInput").addEventListener("change", (e) => {
    filters.offersOnly = e.target.checked;
    currentPage = 1;
    renderResults();
  });

  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    filters = { companies: new Set(), colors: new Set(), sizes: new Set(), maxPrice: null, offersOnly: false };
    currentPage = 1;
    renderFilters();
    renderResults();
  });
}

function renderActiveChips() {
  const box = document.getElementById("activeFiltersChips");
  if (!box) return;

  const chips = [];

  filters.companies.forEach((key) => {
    const facetCompany = facets.companies.find((c) => c.key === key);
    chips.push({ label: facetCompany ? facetCompany.label : key, onRemove: () => filters.companies.delete(key) });
  });

  filters.sizes.forEach((key) => {
    const facetSize = facets.sizes.find((s) => s.key === key);
    chips.push({ label: facetSize ? facetSize.label : key, onRemove: () => filters.sizes.delete(key) });
  });

  filters.colors.forEach((key) => {
    const facetColor = facets.colors.find((c) => c.key === key);
    chips.push({ label: facetColor ? facetColor.label : key, onRemove: () => filters.colors.delete(key) });
  });

  if (filters.maxPrice !== null) {
    const label = `السعر: ${facets.priceMin} - ${filters.maxPrice} جنيه`;
    chips.push({
      label,
      onRemove: () => {
        filters.maxPrice = null;
      },
    });
  }

  if (filters.offersOnly) {
    chips.push({ label: "عروض فقط", onRemove: () => (filters.offersOnly = false) });
  }

  if (chips.length === 0) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = chips
    .map(
      (chip, i) => `<span class="active_chip" data-i="${i}">${chip.label} <button type="button" data-i="${i}">✕</button></span>`
    )
    .join("");

  box.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.i);
      chips[i].onRemove();
      renderFilters();
      renderResults();
    });
  });
}

function getPreferredColorKey(product) {
  if (filters.colors.size === 0) return null;
  const productColorKeys = collectColorVariants(product).map((v) => normalizeArabic(v.color));
  for (const key of productColorKeys) {
    if (filters.colors.has(key)) return key;
  }
  return null;
}

function renderState(container, html) {
  container.innerHTML = html;
}

function renderNoResults(container, term) {
  renderState(
    container,
    `<div class="search-empty-state">
      <i class="fa-solid fa-box-open"></i>
      <p>مفيش نتايج مطابقة${term ? ` لـ "<strong>${term}</strong>"` : ""}</p>
      <p class="search-empty-hint">جرب تشيل بعض الفلاتر، أو تصفح <a href="/index.html">أقسام المنتجات</a>.</p>
    </div>`
  );
}

function attachTracking(container, products) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn_add_cart");
    if (!btn) return;
    if (btn.classList.contains("active")) return;

    const product = products.find((p) => String(p.id) === String(btn.dataset.id));
    if (product) trackAddToCart(product.col, product.id);
  });
}

function renderResults() {
  const container = document.getElementById("searchResultsGrid");
  const titleEl = document.getElementById("searchResultsTitle");
  const countEl = document.getElementById("resultsCount");
  if (!container) return;

  const filtered = applySort(applyFilters(allMatches));
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (titleEl) {
    titleEl.innerHTML = searchTerm
      ? `<i class="fa-solid fa-magnifying-glass"></i> نتائج البحث عن "${searchTerm}"`
      : `<i class="fa-solid fa-magnifying-glass"></i> نتائج البحث`;
  }
  if (countEl) countEl.textContent = `${totalItems} منتج`;

  renderActiveChips();

  if (totalItems === 0) {
    renderNoResults(container, searchTerm);
    renderPagination(0, 0);
    return;
  }

  renderState(container, pageItems.map((p) => buildProductCard(p, getPreferredColorKey(p))).join(""));
  attachTracking(container, pageItems);
  applyRealRatings(container); // ⭐ نجيب تقييم النجوم الحقيقي بدل النجوم المليانة
  renderPagination(totalItems, totalPages);

  setTimeout(() => {
    if (typeof setupCartEvents === "function") setupCartEvents();
  }, 100);
}

function buildPageWindow(current, total) {
  if (total <= 7) {
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  const pages = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function goToPage(page) {
  currentPage = page;
  renderResults();
  const grid = document.getElementById("searchResultsGrid");
  if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPagination(totalItems, totalPages) {
  const box = document.getElementById("searchPagination");
  if (!box) return;

  if (totalItems === 0) {
    box.innerHTML = "";
    return;
  }

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalItems);

  const pagesHtml = buildPageWindow(currentPage, totalPages)
    .reverse()
    .map((p) =>
      p === "..."
        ? `<span class="page_ellipsis">...</span>`
        : `<button type="button" class="page_btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`
    )
    .join("");

  box.innerHTML = `
    <div class="pagination_controls">
      <button type="button" class="page_arrow" id="pagePrevBtn" ${currentPage <= 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i></button>
      ${pagesHtml}
      <button type="button" class="page_arrow" id="pageNextBtn" ${currentPage >= totalPages ? "disabled" : ""}><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="pagination_info">عرض ${startItem} - ${endItem} من إجمالي ${totalItems} منتج متوفر</div>
  `;

  box.querySelectorAll(".page_btn").forEach((btn) => {
    btn.addEventListener("click", () => goToPage(Number(btn.dataset.page)));
  });

  const prevBtn = document.getElementById("pagePrevBtn");
  const nextBtn = document.getElementById("pageNextBtn");
  if (prevBtn) prevBtn.addEventListener("click", () => { if (currentPage > 1) goToPage(currentPage - 1); });
  if (nextBtn) nextBtn.addEventListener("click", () => { if (currentPage < totalPages) goToPage(currentPage + 1); });
}

function closeAllMobileSheets() {
  const aside = document.getElementById("searchFilters");
  const sortSheet = document.getElementById("sortSheet");
  const overlay = document.getElementById("filtersOverlay");
  if (aside) aside.classList.remove("open");
  if (sortSheet) sortSheet.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}

function initMobileFiltersToggle() {
  const toggleBtn = document.getElementById("filtersToggleBtn");
  const aside = document.getElementById("searchFilters");
  const overlay = document.getElementById("filtersOverlay");
  if (!toggleBtn || !aside || !overlay) return;

  toggleBtn.addEventListener("click", () => {
    aside.classList.add("open");
    overlay.classList.add("open");
  });
  overlay.addEventListener("click", closeAllMobileSheets);
}

function initMobileSortSheet() {
  const trigger = document.querySelector(".search_sort");
  const select = document.getElementById("sortSelect");
  const sheet = document.getElementById("sortSheet");
  const optionsBox = document.getElementById("sortSheetOptions");
  const currentLabel = document.getElementById("sortCurrentLabel");
  const overlay = document.getElementById("filtersOverlay");
  if (!trigger || !select || !sheet || !optionsBox || !overlay) return;

  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

  const syncCurrentLabel = () => {
    const selected = select.options[select.selectedIndex];
    if (currentLabel && selected) currentLabel.textContent = selected.textContent;
  };

  const buildOptions = () => {
    optionsBox.innerHTML = Array.from(select.options)
      .map(
        (opt) =>
          `<div class="sort_sheet_option ${opt.value === select.value ? "active" : ""}" data-value="${opt.value}">${opt.textContent}</div>`
      )
      .join("");

    optionsBox.querySelectorAll(".sort_sheet_option").forEach((el) => {
      el.addEventListener("click", () => {
        select.value = el.dataset.value;
        select.dispatchEvent(new Event("change"));
        syncCurrentLabel();
        closeAllMobileSheets();
      });
    });
  };

  trigger.addEventListener("click", (e) => {
    if (!isMobile()) return;
    e.preventDefault();
    buildOptions();
    sheet.classList.add("open");
    overlay.classList.add("open");
  });

  syncCurrentLabel();
}

async function init() {
  const container = document.getElementById("searchResultsGrid");
  if (!container) return;

  initMobileFiltersToggle();
  initMobileSortSheet();
  initRatingStatsModal(); // 📊 البوكس المشترك لإحصائيات التقييم اللي بيفتح بالسهم جنب النجوم

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      sortBy = sortSelect.value;
      currentPage = 1;
      renderResults();
    });
  }

  searchTerm = getQueryFromUrl();

  document.querySelectorAll("input#search, input[name='search']").forEach((input) => {
    input.value = searchTerm;
  });

  if (!searchTerm) {
    renderState(
      container,
      `<div class="search-empty-state">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>اكتب اسم المنتج اللي بتدور عليه في خانة البحث فوق.</p>
      </div>`
    );
    return;
  }

  renderState(container, `<div class="search-loading">جاري البحث...</div>`);

  try {
    const all = await fetchAllProducts();
    allMatches = searchProducts(all, searchTerm);
    facets = computeFacets(allMatches);

    renderFilters();
    renderResults();
  } catch (err) {
    console.error("حصل خطأ في تحميل نتايج البحث:", err);
    renderState(
      container,
      `<div class="search-empty-state"><p>حصل خطأ أثناء تحميل النتايج، جرب تاني.</p></div>`
    );

  }

  
}

init();