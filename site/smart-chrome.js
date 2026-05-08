// Shared SMART Health Check-in page chrome.
// Renders the spectrum stripe, sticky topbar (mark + grouped nav + utilities),
// and footer. Single source of truth — every page includes this script.

(function () {
  var MARK_SVG = ''
    + '<svg width="32" height="32" viewBox="59 -1 91 75" aria-hidden="true" focusable="false">'
    + '<polygon fill="#722772" points="83.91 0 93.42 0 104.56 18.47 116.03 0 125.28 0 104.58 33.96"/>'
    + '<polygon fill="#e24a31" points="60.61 35.72 65.37 28.16 87.76 28.16 76.67 9.49 81.3 1.87 101.89 35.72"/>'
    + '<polygon fill="#e77d26" points="128 1.73 132.76 9.55 121.5 28.16 144.06 28.16 148.69 35.72 107.4 35.72"/>'
    + '<polygon fill="#89bf44" points="148.72 38.78 143.97 46.33 121.57 46.33 132.66 65.16 128.03 72.78 107.44 38.78"/>'
    + '<polygon fill="#f1b42a" points="81.28 72.77 76.53 64.94 87.78 46.33 65.23 46.33 60.6 38.78 101.89 38.78"/>'
    + '<polygon fill="#64aed0" points="125.46 73.22 115.89 73.22 104.68 54.63 93.14 73.22 83.82 73.22 104.66 39.04"/>'
    + '</svg>';

  // Top-level nav — single items have `href`; groups have `items` (a dropdown).
  // Items whose href contains "#" are treated as in-page jump anchors and never
  // light up as aria-current. Items marked `auxiliary: true` do not activate
  // their parent group.
  var NAV = [
    { href: 'index.html',         label: 'Overview' },
    { href: 'index.html#demos',   label: 'Demos' },
    {
      label: 'Explainers',
      items: [
        { href: 'smart-model-explainer.html',   label: 'Model',             note: 'Application-level request/response' },
        { href: 'wire-protocol-explainer.html', label: 'Wire protocol',     note: 'CBOR/COSE/HPKE walkthrough' },
        { href: 'wire-protocol-inspector.html', label: 'Capture inspector', note: 'Byte-level fixture viewer' },
        { href: 'kiosk-flow-explainer.html',    label: 'Kiosk flow',        note: 'Front-desk handoff' }
      ]
    },
    {
      label: 'Spec',
      items: [
        { href: 'spec.html',                label: 'Draft spec 1.0',     note: 'Normative reference' },
        { href: 'web-wallet-protocol.html', label: 'Web wallet protocol', note: 'Experimental sketch', auxiliary: true }
      ]
    }
  ];

  var GITHUB_URL = 'https://github.com/jmandel/smart-health-checkin-mdoc';
  var LLMS_HREF  = 'llms.txt';

  function basename(path) {
    var clean = path.replace(/[?#].*$/, '').replace(/\/$/, '/index.html');
    var parts = clean.split('/');
    return parts[parts.length - 1] || 'index.html';
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function buildSpectrum() {
    return '<div class="smart-spectrum" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  }

  function isCurrent(href, currentBase) {
    if (!href) return false;
    if (href.indexOf('#') >= 0) return false; // in-page anchors never light up
    return href === currentBase;
  }

  function buildNavItem(item, currentBase) {
    if (item.href) {
      var current = isCurrent(item.href, currentBase) ? ' aria-current="page"' : '';
      return '<a href="./' + escapeAttr(item.href) + '"' + current + '>' + item.label + '</a>';
    }
    // Group: dropdown — parent active only when a non-auxiliary child matches.
    var activeChild = item.items.some(function (c) {
      return !c.auxiliary && isCurrent(c.href, currentBase);
    });
    var menuItems = item.items.map(function (c) {
      var cur = isCurrent(c.href, currentBase) ? ' aria-current="page"' : '';
      return ''
        + '<a role="menuitem" href="./' + escapeAttr(c.href) + '"' + cur + '>'
          + '<span class="dd-label">' + c.label + '</span>'
          + (c.note ? '<span class="dd-note">' + c.note + '</span>' : '')
        + '</a>';
    }).join('');
    return ''
      + '<div class="dropdown" data-active="' + (activeChild ? 'true' : 'false') + '">'
        + '<button type="button" class="dropdown-trigger" aria-haspopup="true" aria-expanded="false">'
          + item.label
          + '<svg class="dd-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">'
            + '<path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
          + '</svg>'
        + '</button>'
        + '<div class="dropdown-menu" role="menu">'
          + menuItems
        + '</div>'
      + '</div>';
  }

  function buildTopbar(currentBase) {
    var navHtml = NAV.map(function (it) { return buildNavItem(it, currentBase); }).join('');

    var copyIcon = ''
      + '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<rect x="4" y="4" width="9" height="11" rx="1.5"></rect>'
        + '<path d="M3 12V2.5A1.5 1.5 0 0 1 4.5 1h7"></path>'
      + '</svg>';
    var caretIcon = ''
      + '<svg class="dd-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">'
        + '<path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
    var llmsWidget = ''
      + '<span class="llm-widget" role="group" aria-label="LLM-friendly docs bundle">'
        + '<button id="copy-llms" type="button" class="llm-primary" title="Copy concatenated docs (llms.txt) to clipboard for an LLM session">'
          + copyIcon
          + '<span id="copy-llms-label">Copy llms.txt</span>'
        + '</button>'
        + '<div class="dropdown llm-secondary">'
          + '<button type="button" class="dropdown-trigger" aria-haspopup="true" aria-expanded="false" aria-label="More llms.txt options">'
            + caretIcon
          + '</button>'
          + '<div class="dropdown-menu" role="menu">'
            + '<a role="menuitem" href="./' + escapeAttr(LLMS_HREF) + '" target="_blank" rel="noopener">'
              + '<span class="dd-label">Open llms.txt ↗</span>'
              + '<span class="dd-note">View the bundle in a new tab</span>'
            + '</a>'
          + '</div>'
        + '</div>'
      + '</span>';

    return ''
      + buildSpectrum()
      + '<header class="smart-topbar">'
        + '<div class="smart-topbar-inner">'
          + '<a class="smart-mark-link" href="./index.html" aria-label="SMART Health Check-in — home">'
            + MARK_SVG
            + '<span class="smart-mark-text"><span class="smart-mark-title">SMART Health Check-in</span></span>'
          + '</a>'
          + '<nav class="smart-topbar-nav" aria-label="Primary">'
            + navHtml
            + '<span class="sep" aria-hidden="true"></span>'
            + '<a href="' + escapeAttr(GITHUB_URL) + '" target="_blank" rel="noopener">GitHub</a>'
            + llmsWidget
          + '</nav>'
        + '</div>'
      + '</header>';
  }

  function buildFooter() {
    return ''
      + '<footer class="smart-footer">'
        + buildSpectrum()
        + '<div class="smart-footer-fine">'
          + '<span>SMART Health Check-in is an open prototype.</span>'
          + '<span class="spacer"></span>'
          + '<a href="' + escapeAttr(GITHUB_URL) + '" target="_blank" rel="noopener">github.com/jmandel/smart-health-checkin-mdoc</a>'
        + '</div>'
      + '</footer>';
  }

  function wireDropdowns() {
    var triggers = document.querySelectorAll('.dropdown-trigger');
    function closeAll(except) {
      document.querySelectorAll('.dropdown[data-open="true"]').forEach(function (d) {
        if (d !== except) {
          d.setAttribute('data-open', 'false');
          var t = d.querySelector('.dropdown-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });
    }
    triggers.forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.stopPropagation();
        var dd = t.closest('.dropdown');
        var isOpen = dd.getAttribute('data-open') === 'true';
        closeAll(dd);
        dd.setAttribute('data-open', isOpen ? 'false' : 'true');
        t.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.dropdown')) closeAll(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  function wireCopyLlms() {
    var btn = document.getElementById('copy-llms');
    var label = document.getElementById('copy-llms-label');
    if (!btn || !label) return;
    var defaultText = label.textContent;
    var resetTimer = 0;

    btn.addEventListener('click', async function () {
      try {
        var res = await fetch('./' + LLMS_HREF, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var text = await res.text();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        var kb = (new Blob([text]).size / 1024).toFixed(0);
        label.textContent = 'Copied (' + kb + ' KB)';
        btn.style.color = 'var(--success)';
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(function () {
          label.textContent = defaultText;
          btn.style.color = '';
        }, 2400);
      } catch (e) {
        label.textContent = 'Copy failed';
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(function () {
          label.textContent = defaultText;
        }, 2400);
      }
    });
  }

  function mount() {
    var currentBase = basename(location.pathname);
    var topMount = document.querySelector('[data-smart-topbar]');
    var footMount = document.querySelector('[data-smart-footer]');

    if (topMount) topMount.outerHTML = buildTopbar(currentBase);
    if (footMount) footMount.outerHTML = buildFooter();

    wireDropdowns();
    wireCopyLlms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
