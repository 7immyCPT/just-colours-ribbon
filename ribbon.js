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
  var allow = {};  /* countdown_allow.json: {"ids":["851492478", ...]} - products where a countdown IS wanted */

  var css = document.createElement("style");
  css.textContent =
    ".ec-size .ec-store .jc-hide-native{display:none!important}" +
    ".ec-size .ec-store .jc-ribbon{display:inline-block!important;padding:3px 9px!important;border-radius:3px!important;" +
    "font:600 12px/1.3 sans-serif!important;white-space:nowrap!important;width:auto!important;max-width:none!important;color:#fff!important;letter-spacing:.2px!important;pointer-events:none!important}" +
    ".ec-size .ec-store .jc-ribbon.jc-ribbon-card{position:absolute!important;top:8px!important;left:8px!important;z-index:30!important}" +
    ".ec-size .ec-store .jc-ribbon.jc-ribbon-page{position:static!important;margin:0 0 8px!important}" +
    /* Supplier / pre-order products get no discount ribbon or countdown unless allow-listed. */
    ".ec-size .ec-store .jc-supplier .jcr-ribbon,.ec-size .ec-store .jc-supplier .jcr-countdown{display:none!important}";
  document.head.appendChild(css);

  function tag(kind, label, extra) {
    var el = document.createElement("div");
    el.className = "jc-ribbon " + extra;
    el.setAttribute("data-jc-ribbon", kind);
    el.style.background = COLORS[kind] || "#444";
    el.textContent = label;
    return el;
  }

  /* With Ecwid's ribbon gone, supplier-stocked items fall back to Ecwid's stock "Pre-Order" wording.
   * Restore the old supplier wording (only for state "supplier"; true pre-orders keep "Pre-Order"). */
  var BTN_TEXT = "Shipped from Supplier";
  var NOTE_TEXT = "This product ships directly to you from our South African Supplier. Please allow 2-3 days for order processing and 3-7 days for delivery after processing.";
  function reword(root) {
    /* Decided by the product's SupplyFlag (via the status list), NOT by what the button currently says:
     * any "pre-order" wording Ecwid puts on a supplier-stocked product is rewritten, including
     * "Pre-Order more" and "Pre-ordered items in the bag: 1" once it is in the cart. */
    var els = root.querySelectorAll("button, button *, .details-product-purchase__place, .product-details-module__title, .grid-product__hover-wrap *");
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.children.length) continue;
      var t = (e.textContent || "").trim();
      if (!/pre-?order/i.test(t)) continue;
      var out;
      if (/^out of stock, available for pre-?order$/i.test(t)) out = NOTE_TEXT;
      else if (/pre-?ordered items/i.test(t)) out = t.replace(/pre-?ordered items/i, "Items");
      else out = t.replace(/pre-?order(ed)?/i, BTN_TEXT);
      if (out !== t) e.textContent = out;
    }
    /* Ecwid re-renders its own status line (and puts "pre-order" back), so rather than fight it we hide that
     * line and show our own: the supplier notice, plus "Items in the bag: N" once it is in the bag. */
    var place = root.querySelector(".details-product-purchase__place");
    var mine = root.querySelector("[data-jc-note]");
    var txt = place && !place.hasAttribute("data-jc-note") ? place.textContent : "";
    var inBag = /items in the bag/i.test(txt);
    var oos = /out of stock, available for pre-?order/i.test(txt);
    if (place && (inBag || oos)) {
      var cnt = inBag ? (txt.match(/(\d+)\s*$/) || [, ""])[1] : "";
      place.classList.add("jc-hide-native");
      if (!mine || mine.getAttribute("data-n") !== cnt) {
        if (mine) mine.remove();
        mine = document.createElement("div");
        mine.className = place.className.replace("jc-hide-native", "");
        mine.setAttribute("data-jc-note", "1"); mine.setAttribute("data-n", cnt);
        if (inBag) { mine.innerHTML = "<span></span><br><span></span>"; mine.firstChild.textContent = "Items in the bag: " + cnt; mine.lastChild.textContent = NOTE_TEXT; }
        else mine.textContent = NOTE_TEXT;
        place.parentNode.insertBefore(mine, place);
      }
    }
  }

  function apply(root, id, nativeSel, host, extra) {
    var native = root.querySelector(nativeSel);
    var hit = items && items[id];
    var old = root.querySelector("[data-jc-ribbon]");
    if (hit && !allow[id]) root.classList.add("jc-supplier"); else root.classList.remove("jc-supplier");
    if (hit && hit[0] === "supplier") reword(root);
    if (!(hit && hit[0] === "supplier")) {
      var stale = root.querySelector("[data-jc-note]");
      if (stale) { stale.remove(); var pl = root.querySelector(".details-product-purchase__place"); if (pl) pl.classList.remove("jc-hide-native"); }
    }
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
      /* Sits on the positioned image box, ABOVE Ecwid's hover overlay (hover-wrap), not inside the clipped image-wrap. */
      var host = c.querySelector(".grid-product__image");
      /* Ecwid's image wrap is already a positioned box - leave its layout alone. */
      if (host) apply(c, c.getAttribute("data-product-id"), ".grid-product__label", host, "jc-ribbon-card");
    }
    var pd = document.querySelector(".product-details");
    var page = document.querySelector("[class*='ec-store__product-page--']");
    if (pd && page) {
      var m = String(page.className).match(/ec-store__product-page--(\d+)/);
      var nat = pd.querySelector(".product-details__label-container");
      var title = pd.querySelector(".product-details__product-title");
      var host2 = nat ? nat.parentNode : title && title.parentNode;
      if (m && host2) apply(pd, m[1], ".product-details__label-container", host2, "jc-ribbon-page");
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
    var allowUrl = CFG.url.replace(/status\.json.*$/, "countdown_allow.json");
    fetch(allowUrl, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { (j.ids || []).forEach(function (i) { allow[String(i)] = 1; }); }).catch(function () {})
      .then(function () { return fetch(CFG.url, { cache: "no-cache" }); }).then(function (r) { return r.json(); })
      .then(function (j) { items = j.items || {}; start(); })
      .catch(function () { /* no list -> do nothing, never break the shop */ });
  }
  if (document.body) load(); else document.addEventListener("DOMContentLoaded", load);
})();
