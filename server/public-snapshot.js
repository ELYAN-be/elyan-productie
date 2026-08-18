/**
 * Marketplace Phase 1 — PublicSnapshot v1 (Design Freeze V3).
 * Allowlist-first. Never include private Professionals fields.
 */
'use strict';

var Draft = require('../js/professionals/onboarding-draft');
var CI = require('../shared/vakmannen/intelligence');

var PUBLIC_SNAPSHOT_SCHEMA_VERSION = 1;

/** Keys that must never appear in public JSON (defense-in-depth asserts). */
var LEAK_BLOCKLIST = [
  'email',
  'phone',
  'adres',
  'address',
  'street',
  'huisnummer',
  'contact_name',
  'contact_role',
  'contactName',
  'contactRole',
  'internal_note',
  'internalNote',
  'btw_nummer',
  'btwNummer',
  'draft',
  'current_step',
  'currentStepId',
  'expectedVersion',
  'conditionals',
  'reviewItems',
  'review_items',
  'audit',
  'invite',
  'membership',
  'staff',
  'rankScore',
  'rankingScore',
  'storage_key',
  'storageKey',
  'partnerId',
  'partner_id',
  'userId',
  'user_id'
];

function engine() {
  return CI.PartnerOnboardingEngine || CI;
}

function labelForEnum(list, id) {
  if (!id || !list) return null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i].label;
  }
  return null;
}

function visitPublicLabel(id) {
  var opts = engine().visitOptions || [];
  for (var i = 0; i < opts.length; i++) {
    if (opts[i].id === id) return opts[i].public || opts[i].label;
  }
  return null;
}

function capacityPublicLabel(id) {
  if (id === 'full') return 'Momenteel volzet';
  var opts = engine().capacityOptions || [];
  for (var i = 0; i < opts.length; i++) {
    if (opts[i].id === id) return opts[i].public || opts[i].label;
  }
  return null;
}

function areaModePublicLabel(mode) {
  return labelForEnum(Draft.AREA_MODES, mode) || null;
}

function provinceLabel(id) {
  return labelForEnum(Draft.PROVINCES, id);
}

function gewestLabel(id) {
  return labelForEnum(Draft.GEWESTEN, id);
}

function vatBasisLabel(id) {
  if (id === 'exclusief') return 'excl. btw';
  if (id === 'inclusief') return 'incl. btw';
  return labelForEnum(Draft.VAT_BASIS_OPTIONS, id);
}

function clientTypeLabels(ids) {
  var out = [];
  (ids || []).forEach(function (id) {
    var lab = labelForEnum(Draft.CLIENT_TYPES, id);
    if (lab) out.push(lab);
  });
  return out;
}

function formatMoney(n) {
  if (n == null || !isFinite(Number(n))) return null;
  return Math.round(Number(n));
}

function priceDisplayString(sp, unitHint) {
  if (!sp || !sp.pricing_model) return 'Prijs op aanvraag';
  var model = sp.pricing_model;
  var unit = unitHint ? ' / ' + unitHint : '';
  if (model === 'on_request') return 'Prijs op aanvraag';
  var min = formatMoney(sp.min_price);
  var max = formatMoney(sp.max_price);
  if (model === 'price_range' && min != null && max != null) {
    return '€' + min + ' – €' + max + unit;
  }
  if (min != null) {
    if (model === 'project_price') return 'Richtprijs project €' + min;
    return 'Vanaf €' + min + unit;
  }
  return 'Prijs op aanvraag';
}

function unitHintFor(categoryId, serviceId) {
  var services = Draft.getServices(categoryId) || [];
  for (var i = 0; i < services.length; i++) {
    if (services[i].id === serviceId) return services[i].unitHint || null;
  }
  return null;
}

function serviceLabel(categoryId, serviceId) {
  var services = Draft.getServices(categoryId) || [];
  for (var i = 0; i < services.length; i++) {
    if (services[i].id === serviceId) return services[i].label || serviceId;
  }
  return serviceId;
}

function isValidWebsite(url) {
  if (!url || typeof url !== 'string') return false;
  var t = url.trim();
  if (!/^https:\/\//i.test(t)) return false;
  if (/^(https?:\/\/)?(wa\.me|api\.whatsapp|tel:|mailto:)/i.test(t)) return false;
  return t.length <= 300;
}

function provinceForGemeenteHint(gewestId, gemeente) {
  // Phase 1: derive province only when company.gewest maps; gemeente→province
  // full gazetteer is later. Prefer partner company gewest + optional provincie from area.
  return null;
}

/**
 * Build PublicSnapshot v1 from approved draft + public assets.
 * Fail closed: returns { ok:false } if required public fields missing.
 */
function buildPublicSnapshotV1(opts) {
  opts = opts || {};
  var draft = opts.draft && typeof opts.draft === 'object' ? opts.draft : {};
  var company = Draft.pickCompany(draft.company);
  var area = Draft.pickServiceArea(draft.service_area);
  var craft = Draft.pickCraft(draft.craft);
  var offer = Draft.pickOffer(draft.offer);
  var story = Draft.pickStory(draft.story);

  var categoryId = craft.primary_category_id || opts.primaryCategoryId || null;
  if (!categoryId || !engine().getCategory(categoryId)) {
    return { ok: false, code: 'invalid_category' };
  }

  var displayName =
    (company.display_name && String(company.display_name).trim()) ||
    (opts.displayName && String(opts.displayName).trim()) ||
    null;
  var legalName =
    (company.legal_name && String(company.legal_name).trim()) ||
    (opts.legalName && String(opts.legalName).trim()) ||
    null;
  var slug = opts.slug ? String(opts.slug).trim() : null;
  if (!displayName || !slug) {
    return { ok: false, code: 'missing_identity' };
  }

  var kbo = null;
  if (company.kbo) {
    var k = Draft.validateKbo(company.kbo);
    if (k.ok) kbo = k.display || Draft.formatKboDisplay(k.value);
  }

  var serviceIds = Array.isArray(craft.service_ids) ? craft.service_ids.slice() : [];
  if (!serviceIds.length) return { ok: false, code: 'missing_services' };

  var services = serviceIds.map(function (sid) {
    return { id: sid, label: serviceLabel(categoryId, sid) };
  });

  var prices = offer.service_prices || {};
  var pricing = serviceIds.map(function (sid) {
    var sp = prices[sid] || { pricing_model: 'on_request' };
    var unit = unitHintFor(categoryId, sid);
    return {
      serviceId: sid,
      serviceLabel: serviceLabel(categoryId, sid),
      model: sp.pricing_model || 'on_request',
      displayString: priceDisplayString(sp, unit),
      unitHint: unit || undefined
    };
  });

  var projectMinimum =
    offer.project_minimum != null && isFinite(Number(offer.project_minimum))
      ? formatMoney(offer.project_minimum)
      : null;

  var capacityLabel = capacityPublicLabel(offer.capacity);
  var startLabel = offer.start_month
    ? labelForEnum(Draft.listStartMonths(), offer.start_month)
    : null;
  var visitLabel = visitPublicLabel(offer.visit_speed);
  var urgencyLabel = null;
  if (offer.urgency_jobs === true || offer.urgency_jobs === 'ja') {
    urgencyLabel = 'Neemt spoedjobs aan';
  } else if (offer.urgency_jobs === false || offer.urgency_jobs === 'nee') {
    urgencyLabel = 'Geen spoedjobs';
  }

  var storyOut = {};
  if (story.show_years_public !== false && story.years_active) {
    storyOut.yearsActive = labelForEnum(Draft.YEARS_ACTIVE, story.years_active) || story.years_active;
  }
  if (story.show_team_public === true && story.team_size) {
    storyOut.teamSize = labelForEnum(Draft.TEAM_SIZES, story.team_size) || story.team_size;
  }
  ['strength', 'prefer', 'avoid', 'care', 'why_choose', 'materials', 'must_know', 'guarantee_line'].forEach(
    function (key) {
      var v = story[key];
      if (v && String(v).trim()) {
        var camel =
          key === 'why_choose'
            ? 'whyChoose'
            : key === 'must_know'
              ? 'mustKnow'
              : key === 'guarantee_line'
                ? 'guaranteeLine'
                : key;
        storyOut[camel] = String(v).trim();
      }
    }
  );

  var assetsIn = Array.isArray(opts.assets) ? opts.assets : [];
  var assets = assetsIn
    .map(function (a) {
      var url = a.public_url || a.publicUrl || null;
      if (!url) return null;
      return {
        id: a.id,
        url: url,
        title: a.title ? String(a.title).slice(0, 60) : null,
        sortOrder: a.sort_order != null ? a.sort_order : a.sortOrder != null ? a.sortOrder : 0,
        isCover: !!(a.is_cover || a.isCover)
      };
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return a.sortOrder - b.sortOrder;
    });

  var coverId = opts.coverAssetId || null;
  var cover =
    assets.filter(function (a) {
      return coverId ? a.id === coverId : a.isCover;
    })[0] || assets[0] || null;

  var website = null;
  if (company.website && isValidWebsite(company.website)) {
    website = company.website.trim();
  }

  var publicText = area.public_text ? String(area.public_text).trim() : '';
  if (!publicText) return { ok: false, code: 'missing_service_area' };

  var version =
    opts.publicSnapshotVersion != null && isFinite(Number(opts.publicSnapshotVersion))
      ? Number(opts.publicSnapshotVersion)
      : 1;

  var snap = {
    version: PUBLIC_SNAPSHOT_SCHEMA_VERSION,
    publicSnapshotVersion: version,
    slug: slug,
    displayName: displayName,
    legalName: legalName,
    kbo: kbo,
    primaryCategoryId: categoryId,
    specialtyLine: opts.specialtyLine ? String(opts.specialtyLine).trim() : null,
    website: website,
    location: {
      gemeente: company.gemeente ? String(company.gemeente).trim() : null,
      gewest: company.gewest || null,
      gewestLabel: gewestLabel(company.gewest),
      provincie: null,
      provincieLabel: null
    },
    serviceArea: {
      publicText: publicText,
      modePublicLabel: areaModePublicLabel(area.mode),
      exclusions: area.exclusions ? String(area.exclusions).trim() : null
    },
    services: services,
    pricing: pricing,
    vatBasisLabel: vatBasisLabel(offer.vat_basis || 'exclusief'),
    projectMinimum: projectMinimum,
    clientTypesPublic: clientTypeLabels(offer.client_types),
    availability: {
      capacityLabel: capacityLabel,
      startMonthLabel: startLabel,
      visitLabel: visitLabel,
      urgencyLabel: urgencyLabel
    },
    story: storyOut,
    assets: assets,
    coverUrl: cover ? cover.url : null,
    publishedAt: opts.publishedAt || null
  };

  // Strip undefined
  if (!snap.specialtyLine) delete snap.specialtyLine;
  if (!snap.website) delete snap.website;
  if (!snap.projectMinimum && snap.projectMinimum !== 0) delete snap.projectMinimum;
  if (!snap.kbo) delete snap.kbo;
  if (!snap.serviceArea.exclusions) delete snap.serviceArea.exclusions;
  if (!snap.availability.urgencyLabel) delete snap.availability.urgencyLabel;
  if (!snap.availability.startMonthLabel) delete snap.availability.startMonthLabel;
  if (!snap.availability.visitLabel) delete snap.availability.visitLabel;

  var leak = findLeakKeys(snap);
  if (leak.length) {
    return { ok: false, code: 'leak_detected', keys: leak };
  }

  return { ok: true, snapshot: snap };
}

function findLeakKeys(obj, prefix, found) {
  found = found || [];
  prefix = prefix || '';
  if (!obj || typeof obj !== 'object') return found;
  Object.keys(obj).forEach(function (k) {
    var path = prefix ? prefix + '.' + k : k;
    var lower = k.toLowerCase();
    for (var i = 0; i < LEAK_BLOCKLIST.length; i++) {
      if (lower === LEAK_BLOCKLIST[i].toLowerCase() || k === LEAK_BLOCKLIST[i]) {
        found.push(path);
      }
    }
    // nested private company-ish
    if (typeof obj[k] === 'object' && obj[k] && !Array.isArray(obj[k])) {
      findLeakKeys(obj[k], path, found);
    } else if (Array.isArray(obj[k])) {
      obj[k].forEach(function (item, idx) {
        if (item && typeof item === 'object') findLeakKeys(item, path + '[' + idx + ']', found);
      });
    }
  });
  return found;
}

function assertNoLeaks(snapshot) {
  var leaks = findLeakKeys(snapshot);
  // Allowlist structural check: must not contain company/email trees
  var raw = JSON.stringify(snapshot);
  var patterns = [
    /"email"\s*:/i,
    /"phone"\s*:/i,
    /"adres"\s*:/i,
    /"contact_name"\s*:/i,
    /"internal_note"\s*:/i,
    /"conditionals"\s*:/i,
    /"partnerId"\s*:/i,
    /"partner_id"\s*:/i,
    /"storage_key"\s*:/i,
    /"storageKey"\s*:/i
  ];
  patterns.forEach(function (re) {
    if (re.test(raw)) leaks.push(re.toString());
  });
  return leaks;
}

function toPublicCard(snapshot) {
  if (!snapshot) return null;
  var priceLine = 'Prijs op aanvraag';
  if (snapshot.pricing && snapshot.pricing.length) {
    var first = snapshot.pricing[0];
    priceLine = first.displayString || priceLine;
  }
  var chips = (snapshot.services || []).slice(0, 2).map(function (s) {
    return s.label;
  });
  return {
    slug: snapshot.slug,
    displayName: snapshot.displayName,
    primaryCategoryId: snapshot.primaryCategoryId,
    specialtyLine: snapshot.specialtyLine || null,
    coverUrl: snapshot.coverUrl || null,
    serviceChips: chips,
    serviceAreaText: snapshot.serviceArea && snapshot.serviceArea.publicText,
    priceLine: priceLine,
    availabilityLabel: snapshot.availability && snapshot.availability.capacityLabel,
    photoCount: (snapshot.assets || []).length,
    badge: 'Profiel nagekeken door ELYAN',
    publishedAt: snapshot.publishedAt || null
  };
}

module.exports = {
  PUBLIC_SNAPSHOT_SCHEMA_VERSION: PUBLIC_SNAPSHOT_SCHEMA_VERSION,
  LEAK_BLOCKLIST: LEAK_BLOCKLIST,
  buildPublicSnapshotV1: buildPublicSnapshotV1,
  assertNoLeaks: assertNoLeaks,
  findLeakKeys: findLeakKeys,
  toPublicCard: toPublicCard,
  priceDisplayString: priceDisplayString,
  capacityPublicLabel: capacityPublicLabel,
  visitPublicLabel: visitPublicLabel
};
