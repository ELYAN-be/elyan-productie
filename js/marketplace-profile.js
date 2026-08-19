/**
 * Marketplace public profile — chrome + PublicSnapshot API only.
 * No quote wizard and no seed/demo Google ratings.
 */
(function () {
  'use strict';

  var UI = window.ElyanMarketplaceUi;
  if (!UI) return;

  var esc = UI.escapeHtml;
  var app = document.getElementById('mp-profile-app');
  var lbState = { images: [], index: 0, open: false };

  function go404() {
    window.location.replace('/404');
  }

  function setMeta(p) {
    var name = p.displayName || 'Vakbedrijf';
    var title = name + ' | ELYAN';
    var desc =
      'Bekijk ' +
      name +
      ' via ELYAN: specialisatie, prijsindicatie en beschikbaarheid. Aanvraag via ELYAN.';
    var canonical = UI.SITE_ORIGIN + '/vakmannen/' + encodeURIComponent(p.slug);
    document.title = title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', desc);
    var can = document.querySelector('link[rel="canonical"]');
    if (can) can.setAttribute('href', canonical);
    var ogt = document.querySelector('meta[property="og:title"]');
    if (ogt) ogt.setAttribute('content', title);
    var ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', desc);
    var ogu = document.querySelector('meta[property="og:url"]');
    if (ogu) ogu.setAttribute('content', canonical);
  }

  function liveGoogleHtml(g, opts) {
    opts = opts || {};
    if (!(g && g.show && g.status === 'live' && g.rating != null && g.count != null)) {
      return '';
    }
    if (opts.compact) {
      return (
        '<div class="mp-row-stars" data-review-state="live">' +
        '<svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg> ' +
        esc(String(g.rating).replace('.', ',')) +
        ' <span>· ' +
        esc(String(g.count)) +
        ' Google-beoordelingen</span></div>'
      );
    }
    var reviews = (g.reviews || [])
      .map(function (r) {
        return (
          '<div class="mp-review"><strong>' +
          esc(r.author || '') +
          '</strong>' +
          esc(r.text || '') +
          '</div>'
        );
      })
      .join('');
    return (
      '<section class="mp-prof-section"><h2>Google-beoordelingen</h2><div class="mp-google">' +
      '<div class="mp-google-head"><div><div class="mp-google-score">' +
      esc(String(g.rating).replace('.', ',')) +
      ' / 5</div>' +
      '<div class="mp-loc-hint">' +
      esc(String(g.count)) +
      ' beoordelingen</div></div>' +
      (UI.safeHttpsUrl(g.url)
        ? '<a class="btn btn-ghost btn-sm" href="' +
          esc(UI.safeHttpsUrl(g.url)) +
          '" target="_blank" rel="noopener noreferrer">Bekijk op Google</a>'
        : '') +
      '</div>' +
      reviews +
      (g.attribution ? '<p class="mp-attr">' + esc(g.attribution) + '</p>' : '') +
      '</div></section>'
    );
  }

  function gallerySources(p) {
    var out = [];
    var seen = {};
    function push(url) {
      var safe = UI.safeHttpsUrl(url);
      if (!safe || seen[safe]) return;
      seen[safe] = true;
      out.push(safe);
    }
    push(p.coverUrl);
    (p.assets || []).forEach(function (a) {
      push(a && a.url);
    });
    return out.slice(0, 8);
  }

  function galleryHtml(imgs) {
    if (!imgs.length) return '';
    return (
      '<div class="mp-gallery">' +
      imgs
        .slice(0, 3)
        .map(function (src, i) {
          return (
            '<button type="button" data-gallery-open="' +
            i +
            '"><img src="' +
            esc(src) +
            '" alt="Projectfoto ' +
            (i + 1) +
            '" loading="lazy"></button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function introText(p) {
    var story = p.story || {};
    if (story.whyChoose) return story.whyChoose;
    if (story.care) return story.care;
    if (p.specialtyLine) {
      return p.displayName + ' is gespecialiseerd in ' + p.specialtyLine + '.';
    }
    return p.displayName + ' is een nagekeken vakbedrijf op ELYAN.';
  }

  function priceLine(p) {
    if (p.pricing && p.pricing.length && p.pricing[0].displayString) {
      return p.pricing[0].displayString;
    }
    return 'Prijs op aanvraag';
  }

  function renderProfile(p) {
    var cover = UI.safeHttpsUrl(p.coverUrl);
    var place = (p.location && (p.location.gemeente || p.location.provincieLabel)) || '';
    var area = (p.serviceArea && p.serviceArea.publicText) || '—';
    var start = (p.availability && p.availability.startMonthLabel) || 'Op aanvraag';
    var visit = (p.availability && p.availability.visitLabel) || 'Op afspraak';
    var capacity = (p.availability && p.availability.capacityLabel) || '';
    var imgs = gallerySources(p);
    var story = p.story || {};
    var strengths = [story.strength, story.prefer].filter(Boolean);
    var googleInline = liveGoogleHtml(p.google, { compact: true });
    var googleBlock = liveGoogleHtml(p.google, { compact: false });

    var priceRows = (p.pricing || [])
      .map(function (row) {
        return (
          '<div class="mp-price-row"><span>' +
          esc(row.serviceLabel || row.serviceId || 'Dienst') +
          '</span><strong>' +
          esc(row.displayString || 'Op aanvraag') +
          '</strong></div>'
        );
      })
      .join('');
    if (p.projectMinimum) {
      priceRows +=
        '<div class="mp-price-row"><span>Minimum project</span><strong>' +
        esc(p.projectMinimum) +
        '</strong></div>';
    }

    var optionalFacts = '';
    if (story.yearsActive) {
      optionalFacts +=
        '<div class="mp-fact"><span>Jaren actief</span><strong>' +
        esc(story.yearsActive) +
        '</strong></div>';
    }
    if (story.teamSize) {
      optionalFacts +=
        '<div class="mp-fact"><span>Team</span><strong>' +
        esc(story.teamSize) +
        '</strong></div>';
    }

    var media = cover
      ? '<img src="' + esc(cover) + '" alt="">'
      : '<span class="mp-row-placeholder" aria-hidden="true">ELYAN</span>';

    return (
      '<div class="container mp-profile">' +
      '<a class="mp-profile-back" href="/vakmannen">← Terug naar vakmannen</a>' +
      '<header class="mp-identity">' +
      '<div class="mp-identity-visual">' +
      media +
      '</div>' +
      '<div class="mp-identity-copy">' +
      '<div class="mp-identity-trust">' +
      '<p class="mp-kicker">ELYAN vakman</p>' +
      '<div class="mp-row-badges"><span class="mp-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
      '</div>' +
      '<h1>' +
      esc(p.displayName) +
      '</h1>' +
      (place ? '<p class="mp-identity-place">' + esc(place) + '</p>' : '') +
      googleInline +
      '</div>' +
      '<div class="mp-identity-actions">' +
      '<button type="button" class="btn btn-primary" id="mp-start-aanvraag">Offerte aanvragen</button>' +
      '</div>' +
      '</header>' +
      '<div class="mp-glance">' +
      '<div><span>Werkgebied</span><strong>' +
      esc(area) +
      '</strong></div>' +
      '<div><span>Eerste mogelijke start</span><strong>' +
      esc(start) +
      '</strong></div>' +
      '<div class="is-price"><span>Prijsindicatie</span><strong>' +
      esc(priceLine(p)) +
      '</strong></div>' +
      '<div><span>Plaatsbezoek</span><strong>' +
      esc(visit) +
      '</strong></div>' +
      '</div>' +
      galleryHtml(imgs) +
      '<div class="mp-profile-grid"><div>' +
      '<section class="mp-prof-section"><h2>Over ' +
      esc(p.displayName) +
      '</h2><p>' +
      esc(introText(p)) +
      '</p></section>' +
      (strengths.length
        ? '<section class="mp-prof-section"><h2>Waar ze sterk in zijn</h2><div class="mp-strengths">' +
          strengths
            .map(function (s) {
              return '<span class="mp-strength">' + esc(s) + '</span>';
            })
            .join('') +
          '</div></section>'
        : '') +
      '<section class="mp-prof-section"><h2>Prijzen</h2><div class="mp-price-table">' +
      (priceRows ||
        '<div class="mp-price-row"><span>Richtprijs</span><strong>Prijs op aanvraag</strong></div>') +
      '</div><p class="mp-loc-hint" style="margin-top:10px;">Prijzen zijn indicaties van het vakbedrijf. De uiteindelijke prijs hangt af van het concrete project en de offerte.</p></section>' +
      '<section class="mp-prof-section"><h2>Beschikbaarheid</h2><div class="mp-facts">' +
      '<div class="mp-fact"><span>Eerste mogelijkheid</span><strong>' +
      esc(start) +
      '</strong></div>' +
      (capacity
        ? '<div class="mp-fact"><span>Capaciteit</span><strong>' + esc(capacity) + '</strong></div>'
        : '') +
      '<div class="mp-fact"><span>Plaatsbezoek</span><strong>' +
      esc(visit) +
      '</strong></div>' +
      '</div></section>' +
      googleBlock +
      (optionalFacts
        ? '<section class="mp-prof-section"><h2>Extra</h2><div class="mp-facts">' +
          optionalFacts +
          '</div></section>'
        : '') +
      '</div>' +
      '<aside class="mp-side-sticky" id="mp-next-step">' +
      '<h3>Volgende stap</h3>' +
      '<p>Vertel wat je wilt laten uitvoeren. ELYAN begeleidt je aanvraag — zonder rechtstreeks contact met het vakbedrijf.</p>' +
      '<button type="button" class="btn btn-primary btn-block" id="mp-start-aanvraag-side">Offerte aanvragen</button>' +
      '<p class="mp-aanvraag-note" id="mp-aanvraag-note" hidden>Je aanvraag loopt via ELYAN. De volledige aanvraagflow volgt; er wordt geen telefoon of e-mail van het vakbedrijf gedeeld.</p>' +
      '</aside></div></div>'
    );
  }

  function openLightbox(images, index) {
    lbState.images = images || [];
    lbState.index = index || 0;
    lbState.open = true;
    paintLightbox();
  }

  function closeLightbox() {
    lbState.open = false;
    var box = document.getElementById('mpLightbox');
    if (box) {
      box.hidden = true;
      box.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.style.overflow = '';
  }

  function paintLightbox() {
    var box = document.getElementById('mpLightbox');
    var img = document.getElementById('mpLightboxImg');
    var counter = document.getElementById('mpLbCounter');
    var prev = document.getElementById('mpLbPrev');
    var next = document.getElementById('mpLbNext');
    if (!box || !img || !lbState.images.length) return;
    box.hidden = false;
    box.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    img.src = lbState.images[lbState.index];
    if (counter) {
      counter.hidden = lbState.images.length < 2;
      counter.textContent = lbState.index + 1 + ' / ' + lbState.images.length;
    }
    if (prev) prev.hidden = lbState.images.length < 2;
    if (next) next.hidden = lbState.images.length < 2;
  }

  function stepLightbox(delta) {
    if (!lbState.images.length) return;
    lbState.index = (lbState.index + delta + lbState.images.length) % lbState.images.length;
    paintLightbox();
  }

  function bindLightbox() {
    var box = document.getElementById('mpLightbox');
    if (!box || box.dataset.bound) return;
    box.dataset.bound = '1';
    var prev = document.getElementById('mpLbPrev');
    var next = document.getElementById('mpLbNext');
    if (prev) prev.addEventListener('click', function () { stepLightbox(-1); });
    if (next) next.addEventListener('click', function () { stepLightbox(1); });
    box.querySelectorAll('[data-close-lightbox]').forEach(function (el) {
      el.addEventListener('click', closeLightbox);
    });
    document.addEventListener('keydown', function (e) {
      if (!lbState.open) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  }

  function focusAanvraag() {
    var panel = document.getElementById('mp-next-step');
    var note = document.getElementById('mp-aanvraag-note');
    if (note) note.hidden = false;
    if (panel && panel.scrollIntoView) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function bindProfile(p) {
    var imgs = gallerySources(p);
    document.querySelectorAll('[data-gallery-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-gallery-open'), 10) || 0;
        openLightbox(imgs, idx);
      });
    });
    var a = document.getElementById('mp-start-aanvraag');
    var b = document.getElementById('mp-start-aanvraag-side');
    if (a) a.addEventListener('click', focusAanvraag);
    if (b) b.addEventListener('click', focusAanvraag);
    bindLightbox();
  }

  function renderLoading() {
    if (!app) return;
    app.innerHTML =
      '<div class="container mp-profile"><p class="mp-loc-hint" role="status">Profiel laden…</p></div>';
  }

  function renderMissing() {
    if (!app) return;
    app.innerHTML =
      '<div class="container mp-profile"><div class="mp-empty"><h2>Vakman niet gevonden</h2>' +
      '<p>Dit profiel bestaat niet of is nog niet gepubliceerd.</p>' +
      '<a class="btn btn-primary" href="/vakmannen">Naar vakmannen</a></div></div>';
  }

  function init() {
    var route = UI.parseProfileSlug(window.location.pathname);
    if (!route.ok) {
      go404();
      return;
    }
    renderLoading();
    fetch('/api/public/v1/professionals/' + encodeURIComponent(route.slug), {
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (res.status === 404) return { ok: false, code: 'not_found' };
        if (!res.ok) throw new Error('http_' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok || !data.professional) {
          renderMissing();
          return;
        }
        var p = data.professional;
        setMeta(p);
        app.innerHTML = renderProfile(p);
        bindProfile(p);
      })
      .catch(function () {
        if (!app) return;
        app.innerHTML =
          '<div class="container mp-profile"><div class="mp-state" role="alert">' +
          '<p>Profiel kon niet geladen worden.</p>' +
          '<button type="button" class="btn btn-primary btn-sm" id="mp-profile-retry">Opnieuw proberen</button>' +
          '</div></div>';
        var retry = document.getElementById('mp-profile-retry');
        if (retry) retry.addEventListener('click', init);
      });
  }

  init();
})();
