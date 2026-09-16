/* Sarah Hanafy — design gallery
   Renders graphics/ from data/graphics.json, with a lightbox. */

(function () {
  "use strict";

  var gallery = document.getElementById("gallery");
  var empty = document.getElementById("empty");
  var items = [];
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
    items = Array.isArray(data) ? data.filter(function (d) { return d && d.file; }) : [];

    if (!items.length) {
      if (empty) empty.hidden = false;
      return;
    }

    var frag = document.createDocumentFragment();

    items.forEach(function (item, i) {
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

      button.addEventListener("click", function () { open(i, button); });
      frag.appendChild(button);
    });

    gallery.appendChild(frag);
  }

  /* ---------- lightbox ---------- */

  function open(i, trigger) {
    if (!box || !items.length) return;
    lastFocused = trigger || null;
    index = i;
    show();
    box.hidden = false;
    document.body.style.overflow = "hidden";
    var close = document.getElementById("lightbox-close");
    if (close) close.focus();
  }

  function show() {
    var item = items[index];
    if (!item) return;
    boxImg.src = "graphics/" + item.file;
    boxImg.alt = item.title || item.file;
    boxCaption.textContent = item.note
      ? (item.title || item.file) + " — " + item.note
      : (item.title || item.file);
  }

  function close() {
    if (!box) return;
    box.hidden = true;
    document.body.style.overflow = "";
    boxImg.src = "";
    if (lastFocused) lastFocused.focus();
  }

  function step(delta) {
    if (!items.length) return;
    index = (index + delta + items.length) % items.length;
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
