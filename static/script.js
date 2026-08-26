function toggleCategory(id) {
  var block = document.querySelector('[data-id="' + id + '"]');
  var btn = block ? block.querySelector('.structure-toggle') : null;
  var list = document.getElementById('sub-' + id);
  if (!list) return;
  var open = list.classList.toggle('open');
  if (btn) btn.classList.toggle('open', open);
}

function toggleCorps(btn) {
  var units = btn.parentElement.querySelector('.corps-units');
  if (!units) return;
  var open = units.classList.toggle('open');
  btn.classList.toggle('open', open);
  var label = btn.querySelector('.corps-expand');
  if (label) label.textContent = open ? 'Згорнути склад ▴' : 'Розгорнути склад ▾';
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function alignSearchUnderNav() {
  var tabs = document.querySelectorAll('#topNav .nav-tab');
  var track = document.getElementById('searchRowTrack');
  var row = document.getElementById('searchRow');
  if (!tabs.length || !track || !row) return;
  if (window.innerWidth <= 1280) {
    track.style.marginLeft = '0';
    track.style.width = '100%';
    track.style.maxWidth = '100%';
    return;
  }
  var first = tabs[0].getBoundingClientRect();
  var last = tabs[tabs.length - 1].getBoundingClientRect();
  var rowRect = row.getBoundingClientRect();
  var left = Math.max(0, Math.round(first.left - rowRect.left));
  var width = Math.max(180, Math.round(last.right - first.left));
  track.style.marginLeft = left + 'px';
  track.style.width = width + 'px';
  track.style.maxWidth = width + 'px';
}

document.addEventListener('DOMContentLoaded', function () {
  window.addEventListener('resize', alignSearchUnderNav);
  window.addEventListener('orientationchange', alignSearchUnderNav);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', alignSearchUnderNav);
  }
  alignSearchUnderNav();

  var header = document.querySelector('.header');
  var menuToggle = document.getElementById('menuToggle');
  var logoLink = document.getElementById('logoLink');

  function isMobileNav() {
    return window.innerWidth <= 1280;
  }
  function setMenu(open) {
    if (!header) return;
    header.classList.toggle('menu-open', open);
    if (menuToggle) menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = !(header && header.classList.contains('menu-open'));
      setMenu(open);
      if (header) header.classList.remove('search-open');
    });
  }
  if (logoLink) {
    logoLink.addEventListener('click', function () {
      setMenu(false);
    });
  }
  window.addEventListener('resize', function () {
    if (!isMobileNav()) setMenu(false);
  });

  document.querySelectorAll('.nav-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var id = tab.getAttribute('data-panel');
      var panel = document.getElementById('panel-' + id);
      var already = tab.classList.contains('active');
      document.querySelectorAll('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.nav-panel').forEach(function (p) { p.classList.remove('open'); });
      if (!already && panel) {
        tab.classList.add('active');
        panel.classList.add('open');
        if (isMobileNav()) setMenu(false);
      } else if (isMobileNav()) {
        setMenu(false);
      }
    });
  });

  var toggle = document.getElementById('searchToggle');
  var closeBtn = document.getElementById('searchClose');
  var form = document.getElementById('searchForm');
  var input = document.getElementById('searchInput');
  var box = document.getElementById('searchResults');

  function openSearch() {
    if (header) {
      header.classList.add('search-open');
      header.classList.remove('menu-open');
    }
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    alignSearchUnderNav();
    setTimeout(function () { if (input) input.focus(); }, 50);
  }
  function closeSearch() {
    if (header) header.classList.remove('search-open');
    if (box) {
      box.innerHTML = '';
      box.hidden = true;
    }
    if (input) input.value = '';
  }

  if (toggle) {
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (header && header.classList.contains('search-open')) closeSearch();
      else openSearch();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeSearch();
    });
  }

  function doSearch() {
    if (!input || !box) return;
    var q = input.value.trim();
    if (!q) {
      box.innerHTML = '';
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.innerHTML = '<div class="search-status">Пошук…</div>';
    fetch('/search?q=' + encodeURIComponent(q))
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.results) ? data.results : [];
        if (!list.length) {
          box.innerHTML = '<div class="search-status">Нічого не знайдено</div>';
          return;
        }
        box.innerHTML = list.map(function (i) {
          var url = esc(i.url || '#');
          var typ = esc(i.type || '');
          var name = esc(i.name || '');
          return (
            '<a class="search-hit" href="' + url + '">' +
              '<span class="search-type">' + typ + '</span>' +
              '<span class="search-name">' + name + '</span>' +
            '</a>'
          );
        }).join('');
      })
      .catch(function () {
        box.innerHTML = '<div class="search-status">Помилка пошуку. Спробуйте ще раз.</div>';
      });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      doSearch();
    });
  }
  var timer = null;
  if (input) {
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 1) {
        box.innerHTML = '';
        box.hidden = true;
        return;
      }
      timer = setTimeout(doSearch, 200);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
  });
});
