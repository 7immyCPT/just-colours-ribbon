/* Just Colours - our own supplier ribbon for the Ecwid storefront.
 *
 * Ecwid's native ribbon is locked (409 since 2026-10-17), so state lives in the
 * SupplyFlag attribute and we draw the tag ourselves.
 *
 *  - id in the status list   -> hide Ecwid's native ribbon, draw ours
 *  - not in the list, but the native ribbon says "supplier" -> STALE: hide it
 *  - anything else (FIRE SALE, Ecwid's own "Pre-order", ...)  -> left alone
 *
 * Config: set window.JC_RIBBON = {url: "...ribbon_status.json"} before this loads,
 * or window.JC_RIBBON_ITEMS = {id: [state, label]} to supply the list inline (tests).
 */
(function () {
  var CFG = window.JC_RIBBON || {};
  /* Default list address: status.json next to this script. */
  var SELF = document.currentScript && document.currentScript.src;
  if (!CFG.url && SELF) CFG.url = SELF.replace(/[^\/]*(\?.*)?$/, "status.json");
  var COLORS = { supplier: "#F5A623", preorder: "#2F6FDB" };
  var items = window.JC_RIBBON_ITEMS || null;
  var STALE = /supplier|drop\s?ship/i;

  var css = document.createElement("style");
  css.textContent =
    ".jc-hide-native{display:none!important}" +
    ".jc-ribbon{display:inline-block;padding:3px 9px;border-radius:3px;font:600 12px/1.3 sans-serif;" +
    "color:#fff;letter-spacing:.2px;pointer-events:none}" +
    ".jc-ribbon-card{position:absolute;top:8px;left:8px;z-index:5}" +
    ".jc-ribbon-page{margin:0 0 8px}";
  document.head.appendChild(css);

  function tag(kind, label, extra) {
    var el = document.createElement("div");
    el.className = "jc-ribbon " + extra;
    el.setAttribute("data-jc-ribbon", kind);
    el.style.background = COLORS[kind] || "#444";
    el.textContent = label;
    return el;
  }

  function apply(root, id, nativeSel, host, extra) {
    var native = root.querySelector(nativeSel);
    var hit = items && items[id];
    var old = root.querySelector("[data-jc-ribbon]");
    if (hit) {
      if (native) native.classList.add("jc-hide-native");
      if (old && old.textContent === hit[1]) return;
      if (old) old.remove();
      host.appendChild(tag(hit[0], hit[1], extra));
    } else if (native && STALE.test(native.textContent || "")) {
      native.classList.add("jc-hide-native");
      if (old) old.remove();
    }
  }

  function run() {
    if (!items) return;
    var cards = document.querySelectorAll(".grid-product__wrap[data-product-id]");
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var host = c.querySelector(".grid-product__image-wrap");
      /* Ecwid's image wrap is already a positioned box - leave its layout alone. */
      if (host) apply(c, c.getAttribute("data-product-id"), ".grid-product__label", host, "jc-ribbon-card");
    }
    var pd = document.querySelector(".product-details");
    if (pd) {
      var cls = (pd.className.match(/product-details--id-(\d+)/) || [])[1] ||
        (document.querySelector("[class*='product-details--id-']") || {className: ""}).className.match(/id-(\d+)/);
      var id = Array.isArray(cls) ? cls[1] : cls;
      var host2 = pd.querySelector(".product-details__product-title") || pd.querySelector(".product-details__top");
      if (id && host2) apply(pd, id, ".product-details__label-container", host2.parentNode, "jc-ribbon-page");
    }
  }

  function start() {
    run();
    var t;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 120); })
      .observe(document.body, { childList: true, subtree: true });
    if (window.Ecwid && Ecwid.OnPageLoaded) Ecwid.OnPageLoaded.add(run);
  }

  function load() {
    if (items || !CFG.url) return start();
    fetch(CFG.url, { cache: "no-cache" }).then(function (r) { return r.json(); })
      .then(function (j) { items = j.items || {}; start(); })
      .catch(function () { /* no list -> do nothing, never break the shop */ });
  }
  if (document.body) load(); else document.addEventListener("DOMContentLoaded", load);
})();
