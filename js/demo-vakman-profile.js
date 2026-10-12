/**
 * ELYAN — public demo vakman profile (fictional data).
 * Shows production profile layout without touching marketplace API.
 */
(function () {
  'use strict';

  var EV = window.ElyanVakmannen || {};
  var root = document.getElementById('vk-app');
  if (!root) return;

  var VISIT_LABELS = {
    '1w': 'Binnen 1 week',
    '2w': 'Binnen 2 weken',
    '3w': 'Binnen 3 weken',
    '1m': 'Binnen 1 maand'
  };
  var CAPACITY_LABELS = {
    available: 'Nieuwe projecten mogelijk',
    limited: 'Beperkt beschikbaar',
    full: 'Tijdelijk volzet'
  };

  var galleryImages = [];
  var galleryIndex = 0;
  var lbScrollY = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function assetUrl(raw) {
    var v = String(raw || '').trim();
    if (!v) return '';
    if (/^https:\/\//i.test(v)) return v;
    if (v.charAt(0) === '/') return v;
    return '';
  }

  function categoryLabel(id) {
    if (EV.getCategory) {
      var c = EV.getCategory(id);
      if (c && c.label) return c.label;
    }
    return id || 'Renovatie';
  }

  function pickPartner() {
    if (EV.partnerBySlug) {
      return EV.partnerBySlug('atelier-dak-antwerpen') ||
        (EV.publishedPartners && EV.publishedPartners()[0]) ||
        null;
    }
    return null;
  }

  function toProfile(seed) {
    var capacityId = seed.capacity || 'limited';
    var visitId = seed.visitSpeed || '2w';
    var assets = (seed.gallery || []).map(function (url) {
      return { url: assetUrl(url) };
    }).filter(function (a) { return a.url; });

    return {
      displayName: seed.name,
      specialtyLine: seed.specialtyLine,
      primaryCategoryId: seed.category,
      coverUrl: assetUrl(seed.image),
      location: { gemeente: seed.city, provincieLabel: seed.province },
      serviceArea: { publicText: seed.radius || (seed.city + ' e.o.') },
      availability: {
        capacityId: capacityId,
        capacityLabel: CAPACITY_LABELS[capacityId] || CAPACITY_LABELS.limited,
        startMonthLabel: seed.startMonth || 'Op aanvraag',
        visitLabel: VISIT_LABELS[visitId] || 'Op afspraak'
      },
      story: {
        whyChoose: seed.about,
        strength: seed.strength,
        prefer: seed.prefer,
        yearsActive: seed.publicFields && seed.publicFields.years ? seed.years : null,
        teamSize: seed.publicFields && seed.publicFields.teamSize ? seed.teamSize : null
      },
      pricing: (seed.services || []).map(function (s) {
        return {
          serviceLabel: s.label,
          displayString: s.display,
          priceSource: 'partner',
          priceSourceLabel: 'Door het vakbedrijf aangeleverde prijsindicatie · geen offerte'
        };
      }),
      services: (seed.services || []).map(function (s) {
        return { id: s.subtype, label: s.label };
      }),
      assets: assets,
      google: seed.google ? {
        show: true,
        status: 'live',
        rating: seed.google.rating,
        count: seed.google.count,
        url: seed.google.url,
        reviews: seed.google.reviews || [],
        attribution: 'Beoordelingen via Google (demo)'
      } : null
    };
  }

  function gallerySources(p) {
    var out = [];
    var seen = {};
    function push(url) {
      var safe = assetUrl(url);
      if (!safe || seen[safe]) return;
      seen[safe] = true;
      out.push(safe);
    }
    push(p.coverUrl);
    (p.assets || []).forEach(function (a) { push(a && a.url); });
    return out.slice(0, 5);
  }

  function galleryHtml(p) {
    var imgs = gallerySources(p);
    if (!imgs.length) return '';
    var desktop = '<div class="lab-gallery vk-gallery-desktop">' +
      imgs.slice(0, 3).map(function (src, i) {
        return '<button type="button" data-gallery-open="' + i + '"><img src="' + esc(src) + '" alt="Projectfoto ' + (i + 1) + '" loading="lazy"></button>';
      }).join('') +
      '</div>';
    var mobile = '<div class="vk-gallery-mobile" data-gallery-root>' +
      '<div class="vk-gallery-scroller" id="vkGalleryScroll">' +
        imgs.map(function (src, i) {
          return '<button type="button" data-gallery-open="' + i + '"><img src="' + esc(src) + '" alt="Projectfoto ' + (i + 1) + '" loading="lazy"></button>';
        }).join('') +
      '</div>' +
      '<div class="vk-gallery-bar">' +
        '<span class="vk-gallery-count" id="vkGalleryCount">1 / ' + imgs.length + '</span>' +
        '<button type="button" class="lab-link" id="vkGalleryAll">Bekijk alle foto’s</button>' +
      '</div></div>';
    return desktop + mobile;
  }

  function starsHtml(g) {
    if (!(g && g.rating != null && g.count != null)) return '';
    return '<div class="lab-stars lab-stars-live" data-review-state="demo">' +
      '<svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg> ' +
      esc(String(g.rating).replace('.', ',')) +
      ' <span>• ' + esc(String(g.count)) + ' Google-beoordelingen</span></div>';
  }

  function googleSection(g) {
    if (!(g && g.rating != null && g.count != null)) return '';
    return (
      '<section class="lab-section"><h2>Google-beoordelingen</h2><div class="lab-google">' +
        '<div class="lab-google-head"><div><div class="lab-google-score">' + esc(String(g.rating).replace('.', ',')) + ' / 5</div>' +
        '<div class="lab-hint">' + esc(String(g.count)) + ' beoordelingen · demo</div></div></div>' +
        (g.reviews || []).map(function (r) {
          return '<div class="lab-review"><strong>' + esc(r.author || '') + '</strong>' + esc(r.text || '') + '</div>';
        }).join('') +
        (g.attribution ? '<p class="lab-attr">' + esc(g.attribution) + '</p>' : '') +
      '</div></section>'
    );
  }

  function renderProfile(p) {
    var cover = assetUrl(p.coverUrl);
    var place = (p.location && (p.location.gemeente || p.location.provincieLabel)) || '';
    var area = (p.serviceArea && p.serviceArea.publicText) || '—';
    var start = (p.availability && p.availability.startMonthLabel) || 'Op aanvraag';
    var visit = (p.availability && p.availability.visitLabel) || 'Op afspraak';
    var capacity = (p.availability && p.availability.capacityLabel) || '';
    var story = p.story || {};
    var strengths = [story.strength, story.prefer].filter(Boolean);
    var pricedRows = (p.pricing || []).filter(function (row) {
      return row.displayString;
    });
    var priceRows = pricedRows.map(function (row) {
      return '<div class="lab-price-row"><span>' + esc(row.serviceLabel || 'Dienst') +
        '</span><strong>' + esc(row.displayString) + '</strong></div>';
    }).join('');
    var priceIntro = pricedRows.length
      ? '<p class="lab-hint vk-price-source">Indicatieve prijs van ' + esc(p.displayName) +
        ' · Door het vakbedrijf aangeleverde prijsindicatie · geen offerte</p>'
      : '<p class="lab-hint">Geen publieke prijsindicatie beschikbaar voor dit profiel.</p>';
    var optionalFacts = '';
    if (story.yearsActive) {
      optionalFacts += '<div class="lab-fact"><span>Jaren actief</span><strong>' + esc(String(story.yearsActive)) + '</strong></div>';
    }
    if (story.teamSize) {
      optionalFacts += '<div class="lab-fact"><span>Team</span><strong>' + esc(String(story.teamSize)) + '</strong></div>';
    }
    var media = cover
      ? '<img src="' + esc(cover) + '" alt="">'
      : '<span class="lab-row-placeholder" aria-hidden="true">ELYAN</span>';
    var services = (p.services || []).map(function (s) {
      return '<span class="lab-strength">' + esc(s.label || s.id) + '</span>';
    }).join('');
    var priceGlance = pricedRows.length ? pricedRows[0].displayString : 'Prijs op aanvraag';

    return (
      '<div class="lab-wrap lab-profile">' +
        '<p class="lab-link vk-back" style="margin:0 0 8px;">Demoprofiel · geen echt bedrijf</p>' +
        '<header class="lab-identity">' +
          '<div class="lab-identity-visual">' + media + '</div>' +
          '<div class="lab-identity-copy">' +
            '<p class="lab-kicker">' + esc(categoryLabel(p.primaryCategoryId)) + '</p>' +
            '<h1>' + esc(p.displayName) + '</h1>' +
            (p.specialtyLine ? '<p class="lab-identity-place">' + esc(p.specialtyLine) + '</p>' : '') +
            (place ? '<p class="lab-identity-place">' + esc(place) + '</p>' : '') +
            (capacity ? '<p class="vk-availability-pill" role="status">' + esc(capacity) + '</p>' : '') +
            starsHtml(p.google) +
          '</div>' +
          '<div class="lab-identity-actions">' +
            '<button type="button" class="btn btn-primary" id="demoCta">Vraag via ELYAN aan <span aria-hidden="true">→</span></button>' +
            '<p class="lab-hint" id="demoCtaNote" hidden>Dit is een demoprofiel — er wordt geen echte aanvraag verstuurd.</p>' +
          '</div>' +
        '</header>' +
        '<div class="lab-glance">' +
          '<div><span>Werkgebied</span><strong>' + esc(area) + '</strong></div>' +
          '<div><span>Eerste mogelijke start</span><strong>' + esc(start) + '</strong></div>' +
          '<div class="is-price"><span>Prijsindicatie</span><strong>' + esc(priceGlance) + '</strong></div>' +
          '<div><span>Plaatsbezoek</span><strong>' + esc(visit) + '</strong></div>' +
        '</div>' +
        galleryHtml(p) +
        '<div class="lab-profile-grid"><div>' +
          '<section class="lab-section"><h2>Over ' + esc(p.displayName) + '</h2><p>' + esc(story.whyChoose || '') + '</p></section>' +
          (strengths.length
            ? '<section class="lab-section"><h2>Waar ze sterk in zijn</h2><div class="lab-strengths">' +
              strengths.map(function (s) { return '<span class="lab-strength">' + esc(s) + '</span>'; }).join('') +
              '</div></section>'
            : '') +
          (services
            ? '<section class="lab-section"><h2>Diensten & specialisaties</h2><div class="lab-strengths">' + services + '</div></section>'
            : '') +
          '<section class="lab-section"><h2>Werkgebied</h2><p>' + esc(area) + '</p></section>' +
          '<section class="lab-section"><h2>Prijzen</h2>' + priceIntro + '<div class="lab-price-table">' + priceRows + '</div></section>' +
          '<section class="lab-section"><h2>Beschikbaarheid</h2><div class="lab-facts">' +
            '<div class="lab-fact"><span>Eerste mogelijkheid</span><strong>' + esc(start) + '</strong></div>' +
            (capacity ? '<div class="lab-fact"><span>Beschikbaarheid</span><strong>' + esc(capacity) + '</strong></div>' : '') +
            '<div class="lab-fact"><span>Plaatsbezoek</span><strong>' + esc(visit) + '</strong></div>' +
          '</div></section>' +
          googleSection(p.google) +
          (optionalFacts ? '<section class="lab-section"><h2>Extra</h2><div class="lab-facts">' + optionalFacts + '</div></section>' : '') +
        '</div>' +
        '<aside class="lab-side-sticky">' +
          '<h3>Volgende stap</h3>' +
          '<p>Vertel wat je wilt laten uitvoeren. ELYAN begeleidt je aanvraag — zonder rechtstreeks contact met het vakbedrijf.</p>' +
          '<button type="button" class="btn btn-primary btn-block" id="demoCtaSide">Vraag via ELYAN aan <span aria-hidden="true">→</span></button>' +
          '<p class="lab-hint">Demopagina · geen echte aanvraag.</p>' +
        '</aside></div></div>'
    );
  }

  function openLightbox(index) {
    var lb = document.getElementById('labLightbox');
    var img = document.getElementById('labLightboxImg');
    var counter = document.getElementById('vkLbCounter');
    var prev = document.getElementById('vkLbPrev');
    var next = document.getElementById('vkLbNext');
    if (!lb || !img || !galleryImages.length) return;
    galleryIndex = Math.max(0, Math.min(index || 0, galleryImages.length - 1));
    img.src = galleryImages[galleryIndex];
    img.alt = 'Projectfoto ' + (galleryIndex + 1) + ' van ' + galleryImages.length;
    if (counter) {
      counter.hidden = galleryImages.length < 2;
      counter.textContent = (galleryIndex + 1) + ' / ' + galleryImages.length;
    }
    if (prev) prev.hidden = galleryImages.length < 2;
    if (next) next.hidden = galleryImages.length < 2;
    lb.hidden = false;
    lb.setAttribute('aria-hidden', 'false');
    lbScrollY = window.scrollY || 0;
    document.body.classList.add('lock-scroll', 'vk-lb-open');
  }

  function closeLightbox() {
    var lb = document.getElementById('labLightbox');
    if (!lb) return;
    lb.hidden = true;
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock-scroll', 'vk-lb-open');
    window.scrollTo(0, lbScrollY);
  }

  function stepLightbox(delta) {
    if (!galleryImages.length) return;
    galleryIndex = (galleryIndex + delta + galleryImages.length) % galleryImages.length;
    openLightbox(galleryIndex);
  }

  function bind() {
    root.querySelectorAll('[data-gallery-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openLightbox(Number(btn.getAttribute('data-gallery-open')) || 0);
      });
    });
    var all = document.getElementById('vkGalleryAll');
    if (all) all.addEventListener('click', function () { openLightbox(0); });

    document.querySelectorAll('[data-close-lightbox]').forEach(function (el) {
      el.addEventListener('click', closeLightbox);
    });
    var prev = document.getElementById('vkLbPrev');
    var next = document.getElementById('vkLbNext');
    if (prev) prev.addEventListener('click', function () { stepLightbox(-1); });
    if (next) next.addEventListener('click', function () { stepLightbox(1); });
    document.addEventListener('keydown', function (e) {
      var lb = document.getElementById('labLightbox');
      if (!lb || lb.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });

    function showDemoNote() {
      var note = document.getElementById('demoCtaNote');
      if (note) note.hidden = false;
      alert('Dit is een demoprofiel. Er wordt geen echte aanvraag verstuurd.');
    }
    var cta = document.getElementById('demoCta');
    var ctaSide = document.getElementById('demoCtaSide');
    if (cta) cta.addEventListener('click', showDemoNote);
    if (ctaSide) ctaSide.addEventListener('click', showDemoNote);
  }

  var seed = pickPartner();
  if (!seed) {
    root.innerHTML = '<div class="lab-wrap" style="padding:48px 20px;"><div class="vk-empty"><h2>Demo niet beschikbaar</h2><p>Seeddata ontbreekt.</p></div></div>';
    return;
  }

  var profile = toProfile(seed);
  galleryImages = gallerySources(profile);
  document.title = (profile.displayName || 'Demoprofiel') + ' · Demo | ELYAN';
  root.innerHTML = renderProfile(profile);
  bind();
})();
