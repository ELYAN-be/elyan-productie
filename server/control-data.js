/**
 * ELYAN Control — Customers · Data · Reporting V1 (staff-only).
 * Aggregation over customer_requests (+ status events). No customers table.
 * No marketplace event store → CTR / zero-result / intake conversion omitted.
 *
 * Customer identity: normalized email only (already lowercased on insert).
 * Region/province: not structured on requests → unavailable in filters/supply.
 */
'use strict';

var { createAdminClient } = require('./supabase');
var cr = require('./customer-requests');

var ACTIVE_STATUSES = ['new', 'contacted', 'qualified'];
var FUNNEL_ORDER = ['received', 'contacted', 'qualified', 'successful_introduction'];

/** Max rows fetched for aggregation (bounded). */
var CUSTOMERS_FETCH_LIMIT = 3000;
var REPORTING_FETCH_LIMIT = 5000;
var OPS_FETCH_LIMIT = 200;
var CUSTOMER_DETAIL_LIMIT = 200;

/** Approaching NEW SLA: still `new`, not overdue, within this window of deadline. */
var SLA_APPROACHING_MS = 24 * 60 * 60 * 1000;

var NA = 'Niet beschikbaar';

var METRIC_DEFINITIONS = {
  received:
    'Aantal customer_requests met created_at in de periode (filter). Bron: customer_requests.',
  contacted:
    'Aantal requests in de periode die status contacted, qualified, closed_won of closed_lost hebben bereikt via lifecycle (huidige status ≥ contacted, of status_events to_status=contacted). Denominator voor rate: received.',
  qualified:
    'Aantal requests in de periode met huidige status qualified of closed_won (of ooit qualified via events). Praktisch: status ∈ {qualified, closed_won}. Denominator: received.',
  successful_introduction:
    'closed_won = succesvolle introductie/match. Geen omzet/contract. Denominator: received.',
  open:
    'Actieve requests (status new|contacted|qualified), ongeacht periode — momentopname.',
  new_count: 'Requests met status=new (momentopname).',
  attention:
    'Requests met attention (NEW SLA overdue of follow-up overdue). Zelfde regels als Requests Automation V1.',
  overdue_follow_ups:
    'Actieve requests met next_follow_up_at in het verleden.',
  unassigned_active:
    'Actieve requests zonder owner_user_id.',
  avg_time_to_first_contact_ms:
    'Gemiddelde (contact_at − created_at) voor requests in de periode met betrouwbaar first-contact tijdstip (eerste status_event to_status=contacted). Alleen als n≥1.',
  pct_first_contact_within_sla:
    'Van requests in de periode mét first-contact event: aandeel waar contact_at ≤ NEW SLA deadline (created_at + 2 business days UTC). Denominator = contacted_with_event_count.',
  loss_share:
    'Aantal per frozen closed_lost_reason / totaal closed_lost in periode. “other” detail wordt niet als aparte categorie geaggregeerd.',
  by_category:
    'Requests in periode gegroepeerd op category_id (null → onbekend).',
  by_professional:
    'Requests in periode gegroepeerd op partner_id/slug.',
  by_region: 'Niet beschikbaar — location_text is vrij tekstveld, geen province/region FK.',
  marketplace_analytics:
    'Niet beschikbaar — geen betrouwbare marketplace event store (zero-result, CTR, intake conversion).'
};

function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /customer_requests|customer_request_status_events/i.test(msg) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    console.error('control_data_migration_needed');
    return 'missing_env';
  }
  return null;
}

function normalizeEmail(email) {
  if (email == null) return '';
  return String(email).trim().toLowerCase();
}

function isActiveStatus(status) {
  return ACTIVE_STATUSES.indexOf(status) >= 0;
}

function isNewSlaApproaching(row, now) {
  if (!row || row.status !== 'new') return false;
  if (cr.isNewSlaOverdue(row, now)) return false;
  var deadline = cr.newSlaDeadline(row.created_at);
  if (!deadline) return false;
  var t = now instanceof Date ? now : new Date(now || Date.now());
  var msLeft = deadline.getTime() - t.getTime();
  return msLeft >= 0 && msLeft <= SLA_APPROACHING_MS;
}

function parsePeriod(opts) {
  opts = opts || {};
  var now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
  var period = opts.period ? String(opts.period).trim() : '30';
  var from = null;
  var to = null;

  if (period === 'custom') {
    if (opts.createdFrom) from = new Date(opts.createdFrom);
    if (opts.createdTo) to = new Date(opts.createdTo);
    if (from && isNaN(from.getTime())) from = null;
    if (to && isNaN(to.getTime())) to = null;
    if (to) {
      // Inclusive end-of-day if date-only
      var toIso = String(opts.createdTo);
      if (/^\d{4}-\d{2}-\d{2}$/.test(toIso)) {
        to = new Date(toIso + 'T23:59:59.999Z');
      }
    }
  } else {
    var days = period === '7' ? 7 : period === '90' ? 90 : 30;
    to = now;
    from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  return {
    period: period === '7' || period === '90' || period === 'custom' ? period : '30',
    from: from,
    to: to,
    fromIso: from ? from.toISOString() : null,
    toIso: to ? to.toISOString() : null,
    now: now
  };
}

function rate(numerator, denominator) {
  if (denominator == null || denominator <= 0) {
    return { value: null, label: NA, numerator: numerator || 0, denominator: denominator || 0 };
  }
  var v = numerator / denominator;
  return {
    value: v,
    label: Math.round(v * 1000) / 10 + '%',
    numerator: numerator,
    denominator: denominator
  };
}

function passesDimensionFilters(row, opts) {
  if (opts.categoryId) {
    if (String(row.category_id || '') !== String(opts.categoryId)) return false;
  }
  if (opts.partnerId) {
    if (String(row.partner_id || '') !== String(opts.partnerId)) return false;
  }
  if (opts.partnerSlug) {
    if (String(row.partner_slug || '').toLowerCase() !== String(opts.partnerSlug).toLowerCase()) {
      return false;
    }
  }
  return true;
}

function inPeriod(row, period) {
  if (!period.from && !period.to) return true;
  var created = new Date(row.created_at);
  if (isNaN(created.getTime())) return false;
  if (period.from && created < period.from) return false;
  if (period.to && created > period.to) return false;
  return true;
}

function classifyOpsBucket(row, now) {
  var buckets = [];
  if (row.status === 'new') buckets.push('new_needing_first_contact');
  if (cr.isNewSlaOverdue(row, now)) buckets.push('sla_overdue');
  else if (isNewSlaApproaching(row, now)) buckets.push('sla_approaching');
  if (cr.isFollowUpOverdue(row, now)) buckets.push('follow_up_overdue');
  if (isActiveStatus(row.status) && !row.owner_user_id) buckets.push('unassigned_active');
  return buckets;
}

function mapOpsItem(row, now) {
  var mapped = cr.mapRequestRow(row, { now: now });
  return {
    id: mapped.id,
    customerName: mapped.customerName,
    customerEmail: mapped.customerEmail,
    partnerSlug: mapped.partnerSlug,
    categoryId: mapped.categoryId,
    status: mapped.status,
    statusLabel: mapped.statusLabel,
    createdAt: mapped.createdAt,
    ageLabel: mapped.ageLabel,
    ownerUserId: mapped.ownerUserId,
    nextFollowUpAt: mapped.nextFollowUpAt,
    newSlaDeadlineAt: mapped.newSlaDeadlineAt,
    newSlaOverdue: mapped.newSlaOverdue,
    followUpOverdue: mapped.followUpOverdue,
    attention: mapped.attention,
    attentionReasons: mapped.attentionReasons,
    slaApproaching: isNewSlaApproaching(row, now),
    buckets: classifyOpsBucket(row, now)
  };
}

/**
 * Compact operations attention for Control Home.
 */
async function getOperationsAttention(opts) {
  opts = opts || {};
  var now = opts.now || new Date();
  var admin = createAdminClient();

  var { data, error } = await admin
    .from('customer_requests')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(OPS_FETCH_LIMIT);

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('control_ops_attention_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  var buckets = {
    new_needing_first_contact: [],
    sla_approaching: [],
    sla_overdue: [],
    follow_up_overdue: [],
    unassigned_active: []
  };

  (data || []).forEach(function (row) {
    var item = mapOpsItem(row, now);
    item.buckets.forEach(function (b) {
      if (buckets[b] && buckets[b].length < 25) buckets[b].push(item);
    });
  });

  var counts = {};
  Object.keys(buckets).forEach(function (k) {
    counts[k] = buckets[k].length;
  });

  // True totals among fetched active set (not capped display lists)
  var totals = {
    new_needing_first_contact: 0,
    sla_approaching: 0,
    sla_overdue: 0,
    follow_up_overdue: 0,
    unassigned_active: 0,
    scanned: (data || []).length,
    capped: (data || []).length >= OPS_FETCH_LIMIT
  };
  (data || []).forEach(function (row) {
    classifyOpsBucket(row, now).forEach(function (b) {
      if (totals[b] != null) totals[b] += 1;
    });
  });

  return {
    ok: true,
    generatedAt: now.toISOString(),
    definitions: {
      new_needing_first_contact: 'status=new — nog geen first contact.',
      sla_approaching:
        'status=new, niet overdue, deadline binnen 24u (NEW SLA = created + 2 business days UTC).',
      sla_overdue: 'status=new en nu > NEW SLA deadline (Automation V1).',
      follow_up_overdue: 'Actief + next_follow_up_at in verleden (Automation V1).',
      unassigned_active: 'status new|contacted|qualified zonder owner_user_id.'
    },
    totals: totals,
    buckets: buckets
  };
}

function aggregateCustomers(rows) {
  var byEmail = Object.create(null);
  (rows || []).forEach(function (row) {
    var email = normalizeEmail(row.customer_email);
    if (!email) return;
    var entry = byEmail[email];
    if (!entry) {
      entry = {
        email: email,
        name: row.customer_name || null,
        phone: row.customer_phone || null,
        locationText: row.location_text || null,
        firstRequestAt: row.created_at,
        lastActivityAt: row.updated_at || row.created_at,
        totalRequests: 0,
        activeRequests: 0,
        namesSeen: Object.create(null)
      };
      byEmail[email] = entry;
    }
    entry.totalRequests += 1;
    if (isActiveStatus(row.status)) entry.activeRequests += 1;
    if (row.customer_name) entry.namesSeen[row.customer_name] = true;
    if (row.created_at && (!entry.firstRequestAt || row.created_at < entry.firstRequestAt)) {
      entry.firstRequestAt = row.created_at;
    }
    var act = row.updated_at || row.created_at;
    if (act && (!entry.lastActivityAt || act > entry.lastActivityAt)) {
      entry.lastActivityAt = act;
      entry.name = row.customer_name || entry.name;
      entry.phone = row.customer_phone != null ? row.customer_phone : entry.phone;
      entry.locationText = row.location_text || entry.locationText;
    }
  });

  return Object.keys(byEmail)
    .map(function (email) {
      var e = byEmail[email];
      var nameKeys = Object.keys(e.namesSeen);
      return {
        customerKey: email,
        name: e.name || NA,
        email: e.email,
        phone: e.phone || null,
        locationText: e.locationText || null,
        firstRequestAt: e.firstRequestAt,
        lastActivityAt: e.lastActivityAt,
        totalRequests: e.totalRequests,
        activeRequests: e.activeRequests,
        nameAmbiguous: nameKeys.length > 1
      };
    })
    .sort(function (a, b) {
      if (a.lastActivityAt === b.lastActivityAt) return 0;
      return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
    });
}

async function listCustomers(opts) {
  opts = opts || {};
  var admin = createAdminClient();
  var limit = Math.min(
    CUSTOMERS_FETCH_LIMIT,
    Math.max(1, Number(opts.limit) || CUSTOMERS_FETCH_LIMIT)
  );

  var { data, error } = await admin
    .from('customer_requests')
    .select(
      'id, customer_name, customer_email, customer_phone, location_text, status, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('control_customers_list_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  var items = aggregateCustomers(data || []);
  return {
    ok: true,
    items: items,
    count: items.length,
    scannedRequests: (data || []).length,
    capped: (data || []).length >= limit,
    identityRule: 'normalized_email',
    note: 'Geen customers-tabel — aggregatie over customer_requests op e-mail.'
  };
}

async function getCustomer(opts) {
  opts = opts || {};
  var email = normalizeEmail(opts.customerKey || opts.email);
  if (!email) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var { data, error } = await admin
    .from('customer_requests')
    .select('*')
    .eq('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(CUSTOMER_DETAIL_LIMIT);

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('control_customer_get_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  if (!data || !data.length) return { ok: false, code: 'not_found' };

  var now = opts.now || new Date();
  var summary = aggregateCustomers(data)[0];
  var requests = data.map(function (row) {
    var m = cr.mapRequestRow(row, { now: now });
    return {
      id: m.id,
      partnerSlug: m.partnerSlug,
      partnerId: m.partnerId,
      categoryId: m.categoryId,
      status: m.status,
      statusLabel: m.statusLabel,
      closedLostReason: m.closedLostReason,
      closedLostReasonLabel: m.closedLostReasonLabel,
      closedLostDetail: m.closedLostDetail,
      closedAt: m.closedAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      locationText: m.locationText,
      attention: m.attention,
      ownerUserId: m.ownerUserId
    };
  });

  var history = requests
    .slice()
    .sort(function (a, b) {
      if (a.createdAt === b.createdAt) return 0;
      return a.createdAt < b.createdAt ? -1 : 1;
    })
    .map(function (r) {
      return {
        at: r.createdAt,
        type: 'request',
        requestId: r.id,
        status: r.status,
        statusLabel: r.statusLabel,
        partnerSlug: r.partnerSlug,
        outcome:
          r.status === 'closed_won'
            ? 'Succesvolle introductie'
            : r.status === 'closed_lost'
              ? r.closedLostReasonLabel || 'Afgesloten — niet gelukt'
              : null
      };
    });

  return {
    ok: true,
    customer: summary,
    requests: requests,
    activeRequests: requests.filter(function (r) {
      return isActiveStatus(r.status);
    }),
    historicalRequests: requests.filter(function (r) {
      return !isActiveStatus(r.status);
    }),
    history: history,
    capped: data.length >= CUSTOMER_DETAIL_LIMIT
  };
}

function firstContactMapFromEvents(events) {
  var map = Object.create(null);
  (events || []).forEach(function (ev) {
    if (ev.to_status !== 'contacted') return;
    var id = ev.request_id;
    if (!id) return;
    if (!map[id] || ev.created_at < map[id]) map[id] = ev.created_at;
  });
  return map;
}

function buildReporting(rows, firstContactByRequestId, period, opts) {
  opts = opts || {};
  var now = period.now;
  var dimOpts = {
    categoryId: opts.categoryId || null,
    partnerId: opts.partnerId || null,
    partnerSlug: opts.partnerSlug || null
  };

  var filtered = (rows || []).filter(function (row) {
    return passesDimensionFilters(row, dimOpts) && inPeriod(row, period);
  });

  var received = filtered.length;
  var contactedCount = 0;
  var qualifiedCount = 0;
  var wonCount = 0;
  var lostCount = 0;
  var contactDurations = [];
  var withinSla = 0;
  var contactedWithEvent = 0;

  var lossByReason = Object.create(null);
  cr.CLOSED_LOST_REASONS.forEach(function (k) {
    lossByReason[k] = 0;
  });

  var byCategory = Object.create(null);
  var byPartner = Object.create(null);

  // Snapshot ops (among filtered period rows that are still active — plus global open below)
  filtered.forEach(function (row) {
    var status = row.status;
    if (status === 'contacted' || status === 'qualified' || status === 'closed_won' || status === 'closed_lost') {
      contactedCount += 1;
    }
    if (status === 'qualified' || status === 'closed_won') qualifiedCount += 1;
    if (status === 'closed_won') wonCount += 1;
    if (status === 'closed_lost') {
      lostCount += 1;
      var reason = row.closed_lost_reason;
      if (reason && lossByReason[reason] != null) lossByReason[reason] += 1;
      else if (reason) lossByReason[reason] = (lossByReason[reason] || 0) + 1;
    }

    var cat = row.category_id || 'onbekend';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    var pKey = row.partner_id || row.partner_slug || 'onbekend';
    if (!byPartner[pKey]) {
      byPartner[pKey] = {
        partnerId: row.partner_id || null,
        partnerSlug: row.partner_slug || null,
        received: 0,
        qualified: 0,
        successfulIntroduction: 0,
        closedLost: 0
      };
    }
    byPartner[pKey].received += 1;
    if (status === 'qualified' || status === 'closed_won') byPartner[pKey].qualified += 1;
    if (status === 'closed_won') byPartner[pKey].successfulIntroduction += 1;
    if (status === 'closed_lost') byPartner[pKey].closedLost += 1;

    var fc = firstContactByRequestId[row.id];
    if (fc) {
      contactedWithEvent += 1;
      var created = new Date(row.created_at);
      var contactAt = new Date(fc);
      if (!isNaN(created.getTime()) && !isNaN(contactAt.getTime())) {
        var dur = Math.max(0, contactAt.getTime() - created.getTime());
        contactDurations.push(dur);
        var deadline = cr.newSlaDeadline(row.created_at);
        if (deadline && contactAt.getTime() <= deadline.getTime()) withinSla += 1;
      }
    }
  });

  // Funnel: contacted count for funnel stage uses status-reached heuristic above.
  // Prefer max(contactedCount, contactedWithEvent) only if events undercount current status —
  // status-based is primary (reliable without events for current state).
  var funnelContacted = contactedCount;
  var funnelQualified = qualifiedCount;
  var funnelWon = wonCount;

  var avgMs = null;
  if (contactDurations.length > 0) {
    var sum = 0;
    contactDurations.forEach(function (d) {
      sum += d;
    });
    avgMs = Math.round(sum / contactDurations.length);
  }

  var lossItems = cr.CLOSED_LOST_REASONS.map(function (k) {
    var n = lossByReason[k] || 0;
    return {
      reason: k,
      label: cr.CLOSED_LOST_REASON_LABELS_NL[k] || k,
      count: n,
      share: rate(n, lostCount)
    };
  });

  var categoryItems = Object.keys(byCategory)
    .map(function (k) {
      return { categoryId: k, count: byCategory[k] };
    })
    .sort(function (a, b) {
      return b.count - a.count;
    });

  var professionalItems = Object.keys(byPartner)
    .map(function (k) {
      return byPartner[k];
    })
    .sort(function (a, b) {
      return b.received - a.received;
    });

  return {
    period: {
      key: period.period,
      from: period.fromIso,
      to: period.toIso
    },
    filters: {
      categoryId: dimOpts.categoryId,
      partnerId: dimOpts.partnerId,
      partnerSlug: dimOpts.partnerSlug,
      region: { available: false, reason: METRIC_DEFINITIONS.by_region }
    },
    funnel: {
      stages: [
        {
          key: 'received',
          label: 'Ontvangen',
          count: received,
          rate: rate(received, received)
        },
        {
          key: 'contacted',
          label: 'Contact opgenomen',
          count: funnelContacted,
          rate: rate(funnelContacted, received)
        },
        {
          key: 'qualified',
          label: 'Gekwalificeerd',
          count: funnelQualified,
          rate: rate(funnelQualified, received)
        },
        {
          key: 'successful_introduction',
          label: 'Succesvolle introductie',
          count: funnelWon,
          rate: rate(funnelWon, received),
          note: 'Geen omzet of contract — alleen introductie/match.'
        }
      ],
      denominator: 'received',
      empty: received === 0
    },
    operations: null, // filled by caller with snapshot
    loss: {
      closedLostTotal: lostCount,
      items: lossItems,
      otherDetailNote:
        'closed_lost_detail bij reason=other wordt niet als aparte categorie getoond.'
    },
    supply: {
      byCategory: categoryItems,
      byProfessional: professionalItems,
      byRegion: { available: false, reason: METRIC_DEFINITIONS.by_region }
    },
    marketplaceAnalytics: {
      available: false,
      reason: METRIC_DEFINITIONS.marketplace_analytics,
      metrics: {
        zeroResult: NA,
        searchToProfileCtr: NA,
        profileToIntakeCtr: NA,
        intakeConversion: NA
      }
    },
    professionalIntelligence: {
      items: professionalItems,
      note: 'Intern alleen. Geen publieke score/leaderboard. Lage volumes niet overinterpreteren.'
    },
    firstContact: {
      contactedWithEventCount: contactedWithEvent,
      avgTimeToFirstContactMs: avgMs,
      avgTimeToFirstContactLabel:
        avgMs == null ? NA : formatDurationLabel(avgMs),
      pctFirstContactWithinSla: rate(withinSla, contactedWithEvent),
      definition: METRIC_DEFINITIONS.avg_time_to_first_contact_ms
    },
    definitions: METRIC_DEFINITIONS,
    scanned: filtered.length,
    rawFetched: (rows || []).length
  };
}

function formatDurationLabel(ms) {
  if (ms == null) return NA;
  var hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 48) return hours <= 1 ? '≤1 u' : hours + ' u';
  var days = Math.floor(hours / 24);
  return days + ' d';
}

async function getReporting(opts) {
  opts = opts || {};
  var period = parsePeriod(opts);
  var now = period.now;
  var admin = createAdminClient();

  var q = admin
    .from('customer_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(REPORTING_FETCH_LIMIT);

  if (period.fromIso) q = q.gte('created_at', period.fromIso);
  if (period.toIso) q = q.lte('created_at', period.toIso);
  if (opts.categoryId) q = q.eq('category_id', String(opts.categoryId).trim());
  if (opts.partnerId) q = q.eq('partner_id', String(opts.partnerId).trim());
  if (opts.partnerSlug) {
    q = q.eq('partner_slug', String(opts.partnerSlug).trim().toLowerCase());
  }

  var { data, error } = await q;
  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('control_reporting_fetch_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  var rows = data || [];
  var ids = rows.map(function (r) {
    return r.id;
  });

  var firstContactByRequestId = Object.create(null);
  if (ids.length) {
    // Chunk to keep query bounded
    var chunkSize = 200;
    for (var i = 0; i < ids.length; i += chunkSize) {
      var chunk = ids.slice(i, i + chunkSize);
      var evRes = await admin
        .from('customer_request_status_events')
        .select('request_id, to_status, created_at')
        .in('request_id', chunk)
        .eq('to_status', 'contacted')
        .order('created_at', { ascending: true })
        .limit(chunkSize * 5);
      if (evRes.error) {
        var sc2 = schemaFailureCode(evRes.error);
        if (sc2) return { ok: false, code: sc2 };
        console.error('control_reporting_events_failed', evRes.error.message);
        return { ok: false, code: 'server_error' };
      }
      var partial = firstContactMapFromEvents(evRes.data);
      Object.keys(partial).forEach(function (k) {
        if (!firstContactByRequestId[k] || partial[k] < firstContactByRequestId[k]) {
          firstContactByRequestId[k] = partial[k];
        }
      });
    }
  }

  var report = buildReporting(rows, firstContactByRequestId, period, opts);

  // Operations snapshot (current active set, Automation source of truth) — not period-sliced
  var activeRes = await admin
    .from('customer_requests')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(OPS_FETCH_LIMIT);

  if (activeRes.error) {
    var sc3 = schemaFailureCode(activeRes.error);
    if (sc3) return { ok: false, code: sc3 };
    console.error('control_reporting_ops_failed', activeRes.error.message);
    return { ok: false, code: 'server_error' };
  }

  var activeRows = activeRes.data || [];
  var open = activeRows.length;
  var newCount = 0;
  var attention = 0;
  var overdueFu = 0;
  var unassigned = 0;
  activeRows.forEach(function (row) {
    if (row.status === 'new') newCount += 1;
    if (cr.computeAttention(row, now).attention) attention += 1;
    if (cr.isFollowUpOverdue(row, now)) overdueFu += 1;
    if (!row.owner_user_id) unassigned += 1;
  });

  report.operations = {
    open: open,
    new: newCount,
    attention: attention,
    overdueFollowUps: overdueFu,
    unassignedActive: unassigned,
    avgTimeToFirstContactMs: report.firstContact.avgTimeToFirstContactMs,
    avgTimeToFirstContactLabel: report.firstContact.avgTimeToFirstContactLabel,
    pctFirstContactWithinSla: report.firstContact.pctFirstContactWithinSla,
    snapshotCapped: activeRows.length >= OPS_FETCH_LIMIT,
    definitions: {
      open: METRIC_DEFINITIONS.open,
      new: METRIC_DEFINITIONS.new_count,
      attention: METRIC_DEFINITIONS.attention,
      overdueFollowUps: METRIC_DEFINITIONS.overdue_follow_ups,
      unassignedActive: METRIC_DEFINITIONS.unassigned_active,
      avgTimeToFirstContactMs: METRIC_DEFINITIONS.avg_time_to_first_contact_ms,
      pctFirstContactWithinSla: METRIC_DEFINITIONS.pct_first_contact_within_sla
    }
  };

  report.capped = rows.length >= REPORTING_FETCH_LIMIT;
  report.generatedAt = now.toISOString();

  return { ok: true, report: report };
}

module.exports = {
  ACTIVE_STATUSES: ACTIVE_STATUSES,
  FUNNEL_ORDER: FUNNEL_ORDER,
  CUSTOMERS_FETCH_LIMIT: CUSTOMERS_FETCH_LIMIT,
  REPORTING_FETCH_LIMIT: REPORTING_FETCH_LIMIT,
  OPS_FETCH_LIMIT: OPS_FETCH_LIMIT,
  SLA_APPROACHING_MS: SLA_APPROACHING_MS,
  METRIC_DEFINITIONS: METRIC_DEFINITIONS,
  NA: NA,
  normalizeEmail: normalizeEmail,
  isActiveStatus: isActiveStatus,
  isNewSlaApproaching: isNewSlaApproaching,
  parsePeriod: parsePeriod,
  rate: rate,
  classifyOpsBucket: classifyOpsBucket,
  aggregateCustomers: aggregateCustomers,
  firstContactMapFromEvents: firstContactMapFromEvents,
  buildReporting: buildReporting,
  getOperationsAttention: getOperationsAttention,
  listCustomers: listCustomers,
  getCustomer: getCustomer,
  getReporting: getReporting
};
