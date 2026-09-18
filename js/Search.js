// js/search.js
import { fetchAllProducts, searchProducts, buildSuggestionItem } from "./search-shared.js";

const MIN_CHARS = 1;
const MAX_SUGGESTIONS = 6;
const RECENT_SEARCHES_KEY = "recent_searches";

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function buildSearchUrl(term) {
  return `/search.html?q=${encodeURIComponent(term)}`;
}

// === إدارة عمليات البحث الأخيرة ===
function getRecentSearches() {
  return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
}

function saveRecentSearch(term) {
  if (!term || !term.trim()) return;
  let searches = getRecentSearches();
  // إزالة التكرار وإضافة البحث في البداية
  searches = searches.filter((item) => item.toLowerCase() !== term.toLowerCase());
  searches.unshift(term.trim());
  // الاحتفاظ بأخر 5 عمليات بحث فقط
  if (searches.length > 5) searches.pop();
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

function removeRecentSearch(term) {
  let searches = getRecentSearches();
  searches = searches.filter((item) => item !== term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

function ensureSuggestionsBox(searchBox) {
  let box = searchBox.querySelector(".search_suggestions");
  if (box) return box;

  box = document.createElement("div");
  box.className = "search_suggestions";
  box.setAttribute("role", "listbox");
  searchBox.appendChild(box);
  return box;
}

// === عرض عمليات البحث الأخيرة ===
function renderRecentSearches(box, input) {
  const searches = getRecentSearches();
  if (searches.length === 0) {
    box.classList.remove("open");
    return;
  }

  let html = `<div class="recent-searches-header" style="padding: 8px 12px; font-weight: bold; font-size: 12px; color: #777; background: #f9f9f9;">البحث مؤخراً</div>`;
  searches.forEach((term) => {
    html += `
      <div class="search-suggestion-item recent-item" style="justify-content: space-between; cursor: pointer;">
        <span class="recent-text" data-term="${term}"><i class="fa-solid fa-clock-rotate-left" style="margin-left:8px; color:#888;"></i>${term}</span>
        <i class="fa-solid fa-xmark remove-recent" data-term="${term}" style="color: #999; padding: 4px;"></i>
      </div>
    `;
  });

  box.innerHTML = html;
  box.classList.add("open");

  // إضافة التفاعل عند الضغط على كلمة أوفور حذفها
  box.querySelectorAll(".recent-text").forEach((el) => {
    el.addEventListener("click", () => {
      const term = el.dataset.term;
      input.value = term;
      window.location.href = buildSearchUrl(term);
    });
  });

  box.querySelectorAll(".remove-recent").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentSearch(el.dataset.term);
      renderRecentSearches(box, input);
    });
  });
}

function renderSuggestions(box, products, term) {
  if (products.length === 0) {
    box.innerHTML = `<div class="search-suggestion-empty">مفيش نتايج لـ "${term}"</div>`;
    box.classList.add("open");
    return;
  }

  const items = products.slice(0, MAX_SUGGESTIONS).map(buildSuggestionItem).join("");
  const seeAllLink = `<a href="${buildSearchUrl(term)}" class="search-suggestion-seeall">اعرض كل النتائج (${products.length}) <i class="fa-solid fa-arrow-left"></i></a>`;

  box.innerHTML = items + seeAllLink;
  box.classList.add("open");
}

function closeSuggestions(box) {
  box.classList.remove("open");
}

function initSearchBox(searchBox) {
  const input = searchBox.querySelector("input#search, input[name='search']");
  const form = searchBox.tagName === "FORM" ? searchBox : searchBox.querySelector("form");
  if (!input) return;

  const box = ensureSuggestionsBox(searchBox);

  // حل مشكلة بقاء القائمة مفتوحة عند الرجوع للوراء (Back button)
  closeSuggestions(box);
  window.addEventListener("pageshow", () => closeSuggestions(box));

  const runSearch = debounce(async (term) => {
    if (term.trim().length < MIN_CHARS) {
      renderRecentSearches(box, input);
      return;
    }
    try {
      const all = await fetchAllProducts();
      const results = searchProducts(all, term);
      renderSuggestions(box, results, term.trim());
    } catch (err) {
      console.error("حصل خطأ في البحث:", err);
    }
  }, 250);

  input.addEventListener("input", () => {
    if (input.value.trim() === "") {
      renderRecentSearches(box, input);
    } else {
      runSearch(input.value);
    }
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= MIN_CHARS) {
      runSearch(input.value);
    } else {
      renderRecentSearches(box, input);
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchBox.contains(e.target)) closeSuggestions(box);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSuggestions(box);
  });

  const goToResults = () => {
    const term = input.value.trim();
    if (!term) return;
    saveRecentSearch(term); // حفظ البحث قبل الانتقال
    closeSuggestions(box);
    window.location.href = buildSearchUrl(term);
  };

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      goToResults();
    });
  }
}

function init() {
  document.querySelectorAll(".search_box").forEach(initSearchBox);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}