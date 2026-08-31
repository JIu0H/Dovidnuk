/* Keep the brigade chapter plaque fixed. Hash links offset by bar height.
   Active tab follows the section currently on screen. */
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

  function spy() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll(".brigade-nav a[href^='#']")
    );
    if (!links.length) return;
    var h = pin();
    var line = window.pageYOffset + h + 28;
    var current = links[0].getAttribute("href");
    links.forEach(function (a) {
      var el = document.querySelector(a.getAttribute("href"));
      if (!el) return;
      if (el.offsetTop <= line) current = a.getAttribute("href");
    });
    var last = document.querySelector(links[links.length - 1].getAttribute("href"));
    if (
      last &&
      window.innerHeight + window.pageYOffset >=
        document.documentElement.scrollHeight - 8
    ) {
      current = links[links.length - 1].getAttribute("href");
    }
    markActive(current);
  }

  var spyTick = 0;
  function onScroll() {
    if (spyTick) return;
    spyTick = requestAnimationFrame(function () {
      spyTick = 0;
      spy();
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
    } else {
      spy();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  window.addEventListener("resize", pin);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
