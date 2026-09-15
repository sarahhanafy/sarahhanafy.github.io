/* ---------------------------------------------------------------
   Sarah Hanafy — personal site
   scroll reveals, cursor glow, sparkles, streak heatmap, journal
   --------------------------------------------------------------- */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- helpers ---------- */

  // Parse "YYYY-MM-DD" as a LOCAL date (new Date(str) would treat it as UTC
  // and shift by a day in western timezones).
  function parseDate(str) {
    var p = str.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function keyOf(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function addDays(d, n) {
    var c = new Date(d.getTime());
    c.setDate(c.getDate() + n);
    return c;
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function prettyDate(d) {
    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  /* ---------- scroll reveal ----------
     Position-checked rather than IntersectionObserver-only: a fast flick
     can outrun batched observer callbacks and leave a section stuck at
     opacity 0 forever. This checks real positions, and a failsafe timer
     reveals anything still hidden no matter what. */

  var pending = [].slice.call(document.querySelectorAll(".reveal"));

  function revealAll() {
    pending.forEach(function (el) { el.classList.add("in"); });
    pending = [];
  }

  if (reduced) {
    revealAll();
  } else {
    pending.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i * 70, 350) + "ms";
    });

    var queued = false;

    function checkReveals() {
      queued = false;
      var limit = window.innerHeight - 60;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add("in");
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    }

    function onScroll() {
      if (!queued) { queued = true; requestAnimationFrame(checkReveals); }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    checkReveals();

    // Content loads async (journal, heatmap) and can shift layout; re-check.
    setTimeout(checkReveals, 400);
    setTimeout(revealAll, 3000);
  }

  /* ---------- cursor glow ---------- */

  var glow = document.querySelector(".cursor-glow");

  if (glow && finePointer && !reduced) {
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty, running = false;

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      document.body.classList.add("has-cursor");
      if (!running) { running = true; requestAnimationFrame(tick); }
    }, { passive: true });

    function tick() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = "translate(" + cx + "px," + cy + "px)";
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        requestAnimationFrame(tick);
      } else {
        running = false;
      }
    }
  }

  /* ---------- sparkles on avatar click ---------- */

  var avatar = document.getElementById("avatar");
  var SPARKLE_COLORS = ["#f9a8d4", "#a5b4fc", "#99e9d2", "#fde68a", "#f0abfc"];

  if (avatar) {
    avatar.addEventListener("click", function () {
      if (reduced) return;
      var box = avatar.getBoundingClientRect();
      var ox = box.left + box.width / 2;
      var oy = box.top + box.height / 2;

      for (var i = 0; i < 14; i++) {
        (function (i) {
          var s = document.createElement("span");
          var angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
          var dist = 55 + Math.random() * 60;
          s.className = "sparkle";
          s.style.left = ox + "px";
          s.style.top = oy + "px";
          s.style.background = SPARKLE_COLORS[i % SPARKLE_COLORS.length];
          s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
          s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
          document.body.appendChild(s);
          setTimeout(function () { s.remove(); }, 900);
        })(i);
      }
    });
  }

  /* ---------- tooltip ---------- */

  var tooltip = document.getElementById("tooltip");

  function showTip(target, title, body) {
    if (!tooltip) return;
    tooltip.innerHTML = "";
    var b = document.createElement("b");
    b.textContent = title;
    tooltip.appendChild(b);
    tooltip.appendChild(document.createTextNode(body));

    var box = target.getBoundingClientRect();
    tooltip.hidden = false;
    tooltip.style.left = (box.left + box.width / 2) + "px";
    tooltip.style.top = box.top + "px";
    requestAnimationFrame(function () { tooltip.classList.add("show"); });
  }

  function hideTip() {
    if (!tooltip) return;
    tooltip.classList.remove("show");
    setTimeout(function () { tooltip.hidden = true; }, 200);
  }

  /* ---------- today card ---------- */

  fetch("data/today.json?_=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var d = parseDate(data.date);
      document.getElementById("today-date").textContent = prettyDate(d);
      document.getElementById("today-entry").textContent = data.entry;
      document.getElementById("day-number").textContent = data.day_number;
    })
    .catch(function () {
      document.getElementById("today-entry").textContent =
        "couldn't load today's note.";
    });

  /* ---------- heatmap + journal ---------- */

  var MIN_WEEKS = 8;
  var MAX_WEEKS = 26;

  fetch("data/entries.json?_=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (entries) {
      entries.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      buildHeatmap(entries);
      buildTimeline(entries);
    })
    .catch(function () {
      var tl = document.getElementById("timeline");
      if (tl) tl.innerHTML = "<li class='muted'>couldn't load the journal.</li>";
    });

  function buildHeatmap(entries) {
    var grid = document.getElementById("heatmap");
    if (!grid) return;

    var byDate = {};
    entries.forEach(function (e) { byDate[e.date] = e; });

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // End on the Saturday of this week. Start at the week the journal began
    // so the grid looks full from day one, then grows until it hits the cap
    // and starts sliding.
    var end = addDays(today, 6 - today.getDay());
    var first = entries.length ? parseDate(entries[0].date) : today;
    var start = addDays(first, -first.getDay());

    var weeks = Math.round((end - start) / (7 * 86400000)) + 1;
    if (weeks < MIN_WEEKS) start = addDays(end, -(MIN_WEEKS * 7 - 1));
    if (weeks > MAX_WEEKS) start = addDays(end, -(MAX_WEEKS * 7 - 1));

    var frag = document.createDocumentFragment();

    for (var d = start; d <= end; d = addDays(d, 1)) {
      var key = keyOf(d);
      var cell = document.createElement("span");
      cell.className = "cell";

      var entry = byDate[key];
      if (entry) {
        cell.classList.add("filled");
        cell.tabIndex = 0;
        cell.dataset.date = key;
        cell.dataset.entry = entry.entry;
        cell.setAttribute("aria-label", prettyDate(parseDate(key)) + ": " + entry.entry);
      } else if (d > today) {
        cell.classList.add("future");
      }

      if (key === keyOf(today)) cell.classList.add("today");

      frag.appendChild(cell);
    }

    grid.appendChild(frag);

    // streak count
    var streak = 0;
    var cursor = new Date(today.getTime());
    while (byDate[keyOf(cursor)]) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    var label = document.getElementById("streak-count");
    if (label) {
      label.textContent = streak > 0
        ? streak + " day" + (streak === 1 ? "" : "s") + " in a row"
        : entries.length + " days logged";
    }

    // tooltips
    function handleEnter(e) {
      var cell = e.target.closest(".cell.filled");
      if (!cell) return;
      showTip(cell, prettyDate(parseDate(cell.dataset.date)), cell.dataset.entry);
    }

    grid.addEventListener("mouseover", handleEnter);
    grid.addEventListener("focusin", handleEnter);
    grid.addEventListener("mouseout", hideTip);
    grid.addEventListener("focusout", hideTip);

    // keep the most recent weeks in view when the grid overflows
    var scroller = grid.parentElement;
    if (scroller && scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollLeft = scroller.scrollWidth;
    }
  }

  var COLLAPSED = 5;

  function buildTimeline(entries) {
    var list = document.getElementById("timeline");
    var button = document.getElementById("show-more");
    if (!list) return;

    var recent = entries.slice().reverse();
    var expanded = false;

    var count = document.getElementById("journal-count");
    if (count) {
      count.textContent = recent.length + " entr" + (recent.length === 1 ? "y" : "ies");
    }

    function render() {
      var show = expanded ? recent : recent.slice(0, COLLAPSED);
      list.innerHTML = "";

      show.forEach(function (e, i) {
        var li = document.createElement("li");
        li.className = "entry";
        li.style.animationDelay = Math.min(i * 45, 400) + "ms";

        var date = document.createElement("span");
        date.className = "entry-date";
        date.textContent = prettyDate(parseDate(e.date)).toLowerCase() +
          " · day " + e.day;

        var text = document.createElement("p");
        text.className = "entry-text";
        text.textContent = e.entry;

        li.appendChild(date);
        li.appendChild(text);
        list.appendChild(li);
      });
    }

    render();

    if (button && recent.length > COLLAPSED) {
      button.hidden = false;
      button.addEventListener("click", function () {
        expanded = !expanded;
        button.textContent = expanded ? "show less" : "show all entries";
        render();
        if (!expanded) {
          button.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        }
      });
    }
  }
})();
