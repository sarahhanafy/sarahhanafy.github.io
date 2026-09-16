/* Sarah Hanafy — personal site
   Renders the notes grid and list from data/entries.json. */

(function () {
  "use strict";

  var MIN_WEEKS = 10;
  var MAX_WEEKS = 26;
  var COLLAPSED = 5;

  // Parse "YYYY-MM-DD" as a local date; new Date(str) would read it as UTC
  // and land on the previous day in western timezones.
  function parseDate(str) {
    var p = str.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function keyOf(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function addDays(d, n) {
    var c = new Date(d.getTime());
    c.setDate(c.getDate() + n);
    return c;
  }

  var MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

  function prettyDate(d) {
    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
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
    setTimeout(function () { tooltip.hidden = true; }, 150);
  }

  /* ---------- data ---------- */

  fetch("data/entries.json?_=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (entries) {
      entries.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      showStreak(entries);
      buildGrid(entries);
      buildNotes(entries);
    })
    .catch(function () {
      var list = document.getElementById("timeline");
      if (list) list.innerHTML = "<li class='muted'>Notes are unavailable right now.</li>";
    });

  function currentStreak(entries) {
    var byDate = {};
    entries.forEach(function (e) { byDate[e.date] = e; });

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count back from today; if today's note hasn't been generated yet,
    // the streak still runs through yesterday rather than reading as zero.
    var streak = 0;
    var cursor = byDate[keyOf(today)] ? new Date(today.getTime()) : addDays(today, -1);
    while (byDate[keyOf(cursor)]) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  // Runs on every page -- the home page shows the streak in a stat band
  // even though the grid and the notes themselves live on notes.html.
  function showStreak(entries) {
    var streak = currentStreak(entries);

    var statNum = document.getElementById("streak-num");
    if (statNum) statNum.textContent = streak > 0 ? streak : entries.length;

    var caption = document.getElementById("streak-count");
    if (caption) {
      caption.textContent = streak > 1
        ? streak + " days in a row \u2014 " + entries.length + " notes total"
        : entries.length + " notes so far";
    }
  }

  function buildGrid(entries) {
    var grid = document.getElementById("heatmap");
    if (!grid) return;

    var byDate = {};
    entries.forEach(function (e) { byDate[e.date] = e; });

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start at the week the notes began so the grid reads full from day one,
    // then let it grow until it hits the cap and starts sliding.
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

      frag.appendChild(cell);
    }

    grid.appendChild(frag);

    function handleEnter(e) {
      var cell = e.target.closest(".cell.filled");
      if (!cell) return;
      showTip(cell, prettyDate(parseDate(cell.dataset.date)), cell.dataset.entry);
    }

    grid.addEventListener("mouseover", handleEnter);
    grid.addEventListener("focusin", handleEnter);
    grid.addEventListener("mouseout", hideTip);
    grid.addEventListener("focusout", hideTip);

    if (grid.scrollWidth > grid.clientWidth) grid.scrollLeft = grid.scrollWidth;
  }

  function buildNotes(entries) {
    var list = document.getElementById("timeline");
    var button = document.getElementById("show-more");
    if (!list) return;

    var recent = entries.slice().reverse();
    var expanded = false;

    function render() {
      var show = expanded ? recent : recent.slice(0, COLLAPSED);
      list.innerHTML = "";

      show.forEach(function (e) {
        var li = document.createElement("li");

        var date = document.createElement("span");
        date.className = "note-date";
        date.textContent = prettyDate(parseDate(e.date));

        var text = document.createElement("p");
        text.className = "note-text";
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
        button.textContent = expanded ? "SHOW FEWER NOTES" : "SHOW ALL NOTES";
        render();
      });
    }
  }
  /* ---------- scroll reveal ---------- */

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = [].slice.call(document.querySelectorAll(".band .inner, .stat"));

  targets.forEach(function (el) { el.classList.add("reveal"); });

  function revealPass() {
    var limit = window.innerHeight - 60;
    targets = targets.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) {
        el.classList.add("in");
        return false;
      }
      return true;
    });
    if (!targets.length) window.removeEventListener("scroll", onScroll);
  }

  var queued = false;
  function onScroll() {
    if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; revealPass(); }); }
  }

  if (reduced) {
    targets.forEach(function (el) { el.classList.add("in"); });
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    revealPass();
    setTimeout(revealPass, 400);
    // Never let a missed frame leave a section invisible.
    setTimeout(function () { targets.forEach(function (el) { el.classList.add("in"); }); }, 3000);
  }
})();
