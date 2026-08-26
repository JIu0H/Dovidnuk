/* Keep the brigade chapter plaque fixed. Hash links offset by bar height. */
(function () {
  function pin() {
    var bar = document.querySelector(".brigade-top");
    if (!bar) return 0;
    var h = Math.ceil(bar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--brigade-bar-h", h + "px");
    return h;
  }

  function go(hash) {
    if (!hash || hash === "#") return;
    var el = document.querySelector(hash);
    if (!el) return;
    var h = pin();
    var y = el.getBoundingClientRect().top + window.pageYOffset - h - 8;
    window.scrollTo(0, Math.max(0, y));
  }

  function markActive(hash) {
    document.querySelectorAll(".brigade-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === hash);
    });
  }

  function bind() {
    pin();
    document.querySelectorAll(".brigade-nav a[href^='#']").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href");
        var el = document.querySelector(href);
        if (!el) return;
        e.preventDefault();
        go(href);
        markActive(href);
        if (history.replaceState) history.replaceState(null, "", href);
      });
    });
    if (location.hash) {
      markActive(location.hash);
      setTimeout(function () {
        go(location.hash);
      }, 40);
    }
  }

  window.addEventListener("resize", pin);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
