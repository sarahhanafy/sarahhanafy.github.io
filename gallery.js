/* Sarah Hanafy — design gallery
   One horizontally scrolling row per section, oldest section first,
   with a lightbox that steps through every image in order. */

(function () {
  "use strict";

  var gallery = document.getElementById("gallery");
  var empty = document.getElementById("empty");

  var flat = [];   // every item, in render order — the lightbox walks this
  var index = 0;

  var box = document.getElementById("lightbox");
  var boxImg = document.getElementById("lightbox-img");
  var boxCaption = document.getElementById("lightbox-caption");
  var lastFocused = null;

  fetch("data/graphics.json?_=" + Date.now())
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(render)
    .catch(function () { render([]); });

  function render(data) {
    var items = Array.isArray(data)
      ? data.filter(function (d) { return d && d.file; })
      : [];

    if (!items.length) {
      if (empty) empty.hidden = false;
      return;
    }

    // Group into sections, preserving the order the entries arrive in.
    var order = [];
    var groups = {};

    var labels = {};

    items.forEach(function (item) {
      var key = item.section || "";
      if (!(key in groups)) {
        groups[key] = [];
        order.push(key);
        labels[key] = {
          title: item.section_title || item.section || "More",
          dates: item.section_dates || "",
        };
      }
      groups[key].push(item);
    });

    var frag = document.createDocumentFragment();

    order.forEach(function (key) {
      frag.appendChild(buildSection(labels[key], groups[key]));
    });

    gallery.appendChild(frag);
  }

  function buildSection(label, items) {
    var section = document.createElement("section");
    section.className = "shelf";

    var head = document.createElement("div");
    head.className = "shelf-head";

    var titleWrap = document.createElement("div");
    titleWrap.className = "shelf-title";

    var heading = document.createElement("h2");
    heading.textContent = label.title;
    titleWrap.appendChild(heading);

    if (label.dates) {
      var dates = document.createElement("span");
      dates.className = "shelf-dates";
      dates.textContent = label.dates;
      titleWrap.appendChild(dates);
    }

    head.appendChild(titleWrap);

    var controls = document.createElement("div");
    controls.className = "shelf-controls";

    var prev = arrowButton("‹", "Scroll left");
    var next = arrowButton("›", "Scroll right");
    controls.appendChild(prev);
    controls.appendChild(next);
    head.appendChild(controls);

    section.appendChild(head);

    var rail = document.createElement("div");
    rail.className = "rail";

    items.forEach(function (item) {
      var position = flat.length;
      flat.push(item);

      var button = document.createElement("button");
      button.className = "tile";
      button.type = "button";
      button.setAttribute("aria-label", "Open " + (item.title || item.file));

      var img = document.createElement("img");
      img.src = "graphics/" + item.file;
      img.alt = item.title || item.file;
      img.loading = "lazy";

      var cap = document.createElement("span");
      cap.className = "tile-title";
      cap.textContent = item.title || item.file;

      button.appendChild(img);
      button.appendChild(cap);

      if (item.note) {
        var note = document.createElement("span");
        note.className = "tile-note";
        note.textContent = item.note;
        button.appendChild(note);
      }

      button.addEventListener("click", function () { open(position, button); });
      rail.appendChild(button);
    });

    section.appendChild(rail);

    function scrollBy(direction) {
      rail.scrollBy({
        left: direction * Math.max(240, rail.clientWidth * 0.8),
        behavior: "smooth",
      });
    }

    prev.addEventListener("click", function () { scrollBy(-1); });
    next.addEventListener("click", function () { scrollBy(1); });

    // Hide the arrows when there's nothing to scroll to.
    function syncArrows() {
      var overflow = rail.scrollWidth - rail.clientWidth;
      controls.hidden = overflow < 8;
      prev.disabled = rail.scrollLeft < 8;
      next.disabled = rail.scrollLeft > overflow - 8;
    }

    rail.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows);
    // Images load late and change scrollWidth, so re-check after they land.
    setTimeout(syncArrows, 0);
    setTimeout(syncArrows, 600);
    window.addEventListener("load", syncArrows);

    return section;
  }

  function arrowButton(glyph, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "shelf-arrow";
    b.textContent = glyph;
    b.setAttribute("aria-label", label);
    return b;
  }

  /* ---------- lightbox ---------- */

  function open(i, trigger) {
    if (!box || !flat.length) return;
    lastFocused = trigger || null;
    index = i;
    show();
    box.hidden = false;
    document.body.style.overflow = "hidden";
    var close = document.getElementById("lightbox-close");
    if (close) close.focus();
  }

  function show() {
    var item = flat[index];
    if (!item) return;
    boxImg.src = "graphics/" + item.file;
    boxImg.alt = item.title || item.file;

    var name = item.title || item.file;
    var bits = [];
    if (item.section_title) bits.push(item.section_title);
    bits.push(name);
    if (item.note) bits.push(item.note);
    boxCaption.textContent = bits.join(" — ");
  }

  function close() {
    if (!box) return;
    box.hidden = true;
    document.body.style.overflow = "";
    boxImg.src = "";
    if (lastFocused) lastFocused.focus();
  }

  function step(delta) {
    if (!flat.length) return;
    index = (index + delta + flat.length) % flat.length;
    show();
  }

  var closeBtn = document.getElementById("lightbox-close");
  var prevBtn = document.getElementById("lightbox-prev");
  var nextBtn = document.getElementById("lightbox-next");

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (prevBtn) prevBtn.addEventListener("click", function () { step(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { step(1); });

  if (box) {
    // Clicking the backdrop closes; clicking the image itself does not.
    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!box || box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
})();
