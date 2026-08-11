/* ============================================================
   ELYAN Calculator 2 — Answer adapters → Calc1 calcEstimate
   Phase 3.5: higher-accuracy inputs, multi-bathroom instances
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2Adapters = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PACKAGE_TO_TYPE = {
    dak: 'dak',
    ramen: 'ramen',
    isolatie: 'isolatie',
    verwarming: 'verwarming',
    elektriciteit: 'elektriciteit',
    ventilatie: 'ventilatie',
    keuken: 'keuken',
    badkamer: 'badkamer',
    vloeren: 'vloeren',
    schilderwerken: 'schilderwerken',
    gevel: 'gevel'
  };

  function meta(field, source, explanation, confidence) {
    return {
      field: field,
      source: source,
      explanation: explanation,
      confidence: confidence || 'medium'
    };
  }

  function finishToLevel(finishProfile) {
    if (finishProfile === 'functioneel') return 'basis';
    if (finishProfile === 'premium') return 'premium';
    if (finishProfile === 'comfort') return 'standaard';
    return null;
  }

  function yearToHousingAge(yearBuilt) {
    if (!yearBuilt || yearBuilt === 'weet_niet') return null;
    if (yearBuilt === 'na_2015') return 'jong';
    if (yearBuilt === '2006_2015' || yearBuilt === '1991_2005') return 'middel';
    return 'oud';
  }

  function mapFloors(floors) {
    if (!floors || floors === 'weet_niet') return null;
    if (floors === '4plus') return '3plus';
    return floors;
  }

  function numOrNull(v) {
    if (v == null || v === '' || v === 'weet_niet') return null;
    var n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function parseCount(v, plusDefault) {
    if (v == null || v === '' || v === 'weet_niet') return null;
    if (v === '10plus') return plusDefault || 10;
    if (v === '4plus') return plusDefault || 4;
    if (v === '3plus') return plusDefault || 3;
    if (v === '2plus') return plusDefault || 2;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function estimateRoofArea(areaM2, roofType) {
    var a = numOrNull(areaM2);
    if (!a) return null;
    var factor = roofType === 'plat' ? 1.05 : roofType === 'gemengd' ? 1.2 : 1.15;
    return Math.round(a * factor);
  }

  function mapRoofMaterial(d, roofType, mapping, unknowns) {
    var raw = d.roofMaterial;
    if (!raw || raw === 'weet_niet') {
      if (roofType === 'plat') {
        mapping.push(meta('material', 'derived', 'Plat dak zonder materiaalantwoord → EPDM als Calc1-platdefault, onzekerheid bewaard.', 'low'));
        unknowns.push('roofMaterial');
        return { material: 'epdm', uncertain: true };
      }
      mapping.push(meta('material', 'unknown', 'Dakmateriaal onbekend — niet stilzwijgend op pannen gezet.', 'low'));
      unknowns.push('roofMaterial');
      return { material: 'onbekend', uncertain: true };
    }
    if (raw === 'betonpannen') {
      mapping.push(meta('material', 'direct', 'Betonpannen → Calc1 material=pannen (betonband).', 'high'));
      return { material: 'pannen', uncertain: false };
    }
    if (raw === 'keramisch') {
      mapping.push(meta('material', 'direct', 'Keramische pannen → Calc1 material=pannen; keramiekprijs actief bij level=premium.', 'medium'));
      return { material: 'pannen', preferCeramic: true, uncertain: false };
    }
    if (raw === 'leien') {
      mapping.push(meta('material', 'direct', 'Leien → Calc1 material=leien.', 'high'));
      return { material: 'leien', uncertain: false };
    }
    if (raw === 'epdm') {
      mapping.push(meta('material', 'direct', 'EPDM/roofing → Calc1 material=epdm.', 'high'));
      return { material: 'epdm', uncertain: false };
    }
    mapping.push(meta('material', 'unknown', 'Onbekend dakmateriaal.', 'low'));
    unknowns.push('roofMaterial');
    return { material: 'onbekend', uncertain: true };
  }

  function deriveWindowSize(d, areaM2, mapping, unknowns) {
    var method = d.windowQtyMethod;
    if (method === 'm2') {
      var direct = numOrNull(d.windowAreaM2);
      if (direct) {
        mapping.push(meta('size', 'direct', 'Raam-m² door gebruiker opgegeven.', 'high'));
        return { size: direct, ok: true };
      }
      unknowns.push('windowAreaM2');
      mapping.push(meta('size', 'unknown', 'Methode m² gekozen maar geen waarde.', 'low'));
      return { size: null, ok: false };
    }
    if (method === 'count') {
      var std = parseCount(d.windowCountStd, 10);
      var large = parseCount(d.windowCountLarge, 4);
      var sliding = parseCount(d.slidingCount, 2);
      if (std == null && large == null && sliding == null) {
        unknowns.push('windowCounts');
        mapping.push(meta('size', 'unknown', 'Aantallen onbekend.', 'low'));
        return { size: null, ok: false, sliding: 'nee' };
      }
      std = std || 0;
      large = large || 0;
      sliding = sliding || 0;
      // Transparent factors documented as DERIVED
      var size = Math.round(std * 1.5 + large * 3.2 + sliding * 6.0);
      size = Math.max(4, size);
      mapping.push(meta('size', 'derived',
        'Raam-m² = standaard×1,5 + groot×3,2 + schuif×6,0 (transparante aannames).', 'medium'));
      var slidingAns = sliding >= 2 ? 'groot' : sliding === 1 ? 'ja' : 'nee';
      mapping.push(meta('sliding', sliding || d.slidingCount === '0' ? 'direct' : 'assumed',
        'Schuif uit aanteltelling.', 'medium'));
      return { size: size, ok: true, sliding: slidingAns };
    }
    // weet_niet or missing method
    unknowns.push('windowQtyMethod');
    mapping.push(meta('size', 'unknown', 'Raamomvang onbekend — geen stille %-proxy meer als autoritatief.', 'low'));
    var soft = numOrNull(areaM2);
    if (soft) {
      return { size: Math.max(6, Math.round(soft * 0.12)), ok: false, provisional: true, sliding: 'nee' };
    }
    return { size: 15, ok: false, provisional: true, sliding: 'nee' };
  }

  function storeyCount(floors) {
    var fl = mapFloors(floors) || '2';
    return fl === '1' ? 1 : fl === '2' ? 2 : 3;
  }

  function defaultFrontage(propertyType) {
    if (propertyType === 'rijwoning') return 5.5;
    if (propertyType === 'appartement') return 8;
    if (propertyType === 'open') return 10;
    return 7; // halfopen
  }

  function estimateFacadeArea(property, elevations, frontageM) {
    var a = numOrNull(property && property.areaM2);
    var storeys = storeyCount(property && property.floors);
    var elevN = elevations === '3plus' ? 3 : elevations === '2' ? 2 : 1;
    var height = storeys * 2.7;
    var width = numOrNull(frontageM) || defaultFrontage(property && property.propertyType);
    if (!a && !numOrNull(frontageM)) return null;

    // Approximate footprint depth from living area / frontage
    var depth = a ? Math.max(6, a / Math.max(width, 4) / Math.max(storeys * 0.85, 1)) : width * 1.2;
    var perimeterShare;
    if (elevN === 1) perimeterShare = width;
    else if (elevN === 2) perimeterShare = width + depth;
    else perimeterShare = 2 * width + 2 * depth * 0.85;

    return Math.max(25, Math.round(perimeterShare * height));
  }

  function estimatePaintArea(areaM2, paintScope, surfaces) {
    var a = numOrNull(areaM2);
    if (!a) return null;
    var interior = 0;
    if (paintScope === 'buiten') {
      return Math.round(a * 1.1);
    }
    if (surfaces === 'walls') interior = a * 2.5;
    else if (surfaces === 'ceilings') interior = a * 1.0;
    else if (surfaces === 'walls_ceilings') interior = a * 3.5;
    else if (surfaces === 'whole_interior') interior = a * 3.8;
    else if (surfaces === 'selected_rooms') interior = a * 1.4;
    else interior = a * 2.8; // unknown surfaces — soft
    if (paintScope === 'beide') interior += a * 1.1;
    return Math.round(interior);
  }

  function mapWetRooms(d, system, mapping, unknowns) {
    var baths = parseCount(d.ventBathCount, 3);
    var toilets = parseCount(d.ventToiletCount, 2);
    var laundry = d.ventLaundry === 'ja' ? 1 : d.ventLaundry === 'nee' ? 0 : null;
    var kitchen;
    if (system === 'systeem_c' || system === 'systeem_d') {
      kitchen = 1;
      mapping.push(meta('kitchenWet', 'derived', 'Keuken meegerekend als natte ruimte voor systeem C/D.', 'medium'));
    } else if (d.ventKitchen === 'ja') {
      kitchen = 1;
      mapping.push(meta('kitchenWet', 'direct', 'Keuken expliciet meegerekend.', 'high'));
    } else if (d.ventKitchen === 'nee') {
      kitchen = 0;
      mapping.push(meta('kitchenWet', 'direct', 'Keuken niet meegerekend.', 'high'));
    } else {
      kitchen = system === 'decentraal' ? 0 : 1;
      if (!d.ventKitchen || d.ventKitchen === 'weet_niet') unknowns.push('ventKitchen');
      mapping.push(meta('kitchenWet', 'assumed', 'Keuken soft aangenomen voor natte-ruimtetelling.', 'low'));
    }

    if (baths == null) { unknowns.push('ventBathCount'); baths = 0; }
    else mapping.push(meta('ventBathCount', 'direct', 'Badkamers voor ventilatie.', 'high'));
    if (toilets == null) { unknowns.push('ventToiletCount'); toilets = 0; }
    else mapping.push(meta('ventToiletCount', 'direct', 'Toiletten voor ventilatie.', 'high'));
    if (laundry == null) { unknowns.push('ventLaundry'); laundry = 0; }
    else mapping.push(meta('ventLaundry', 'direct', 'Wasplaats.', 'high'));

    var total = baths + toilets + laundry + kitchen;
    var wetRooms = total <= 1 ? '1' : total === 2 ? '2' : '3plus';
    mapping.push(meta('wetRooms', 'derived',
      'Calc1 wetRooms=' + wetRooms + ' uit badkamers(' + baths + ')+toiletten(' + toilets +
      ')+laundry(' + laundry + ')+keuken(' + kitchen + ').', 'medium'));
    return wetRooms;
  }

  function baseContext(state) {
    var p = (state && state.propertyProfile) || {};
    var mapping = [];
    var unknowns = [];
    var province = p.province || null;
    if (province) {
      mapping.push(meta('province', 'direct', 'Bevestigde provincie uit woningprofiel.', 'high'));
    } else {
      unknowns.push('province');
      mapping.push(meta('province', 'unknown', 'Geen bevestigde provincie.', 'low'));
    }

    var housingAge = yearToHousingAge(p.yearBuilt);
    if (housingAge) {
      mapping.push(meta('housingAge', 'derived', 'Afgeleid uit bouwjaar-bucket ' + p.yearBuilt + '.', 'medium'));
    } else {
      housingAge = 'middel';
      mapping.push(meta('housingAge', 'assumed', 'Bouwjaar onbekend → housingAge=middel (btw-scenario).', 'low'));
      unknowns.push('yearBuilt');
    }

    var level = finishToLevel(state && state.finishProfile);
    if (level) {
      mapping.push(meta('level', 'direct', 'Finishprofiel → Calc1 level ' + level + '.', 'high'));
    } else {
      level = 'standaard';
      mapping.push(meta('level', 'assumed', 'Geen finishprofiel → level=standaard.', 'low'));
      unknowns.push('finishProfile');
    }

    return {
      province: province,
      housingAge: housingAge,
      level: level,
      urgency: 'binnen6',
      areaM2: numOrNull(p.areaM2),
      floors: mapFloors(p.floors),
      condition: p.condition,
      epc: p.epc,
      mapping: mapping,
      unknowns: unknowns,
      property: p
    };
  }

  function wrap(packageType, type, province, answers, mapping, extras) {
    extras = extras || {};
    return {
      packageType: packageType,
      instanceId: extras.instanceId || null,
      instanceLabel: extras.instanceLabel || null,
      type: type,
      province: province,
      answers: answers,
      mappingMetadata: mapping,
      statusHint: extras.statusHint || null,
      unknowns: extras.unknowns || [],
      assumptions: extras.assumptions || []
    };
  }

  /* ---------- bathroom instances ---------- */

  function listBathroomInstances(state) {
    var d = (state.packageDetails && state.packageDetails.badkamer) || {};
    var count = d.bathCount;
    var list = [{
      instanceId: 'main',
      instanceLabel: 'Hoofdbadkamer',
      sizeKey: 'bathMainSize',
      intensityKey: 'bathMainIntensity',
      legacySizeKey: 'bathSize',
      legacyIntensityKey: 'bathIntensity'
    }];
    if (count === '2' || count === '3plus') {
      list.push({
        instanceId: 'secondary',
        instanceLabel: 'Tweede badkamer',
        sizeKey: 'bathSecondarySize',
        intensityKey: 'bathSecondaryIntensity'
      });
    }
    if (count === '3plus') {
      var extraN = parseCount(d.bathExtraCount, 1);
      if (extraN == null || extraN < 1) extraN = 1;
      for (var i = 0; i < extraN; i++) {
        list.push({
          instanceId: 'extra_' + (i + 1),
          instanceLabel: 'Extra badkamer ' + (i + 1),
          sizeKey: 'bathExtraSize',
          intensityKey: 'bathExtraIntensity'
        });
      }
    }
    if (count === 'weet_niet' || !count) {
      list[0].uncertainCount = true;
    }
    return list;
  }

  function listInsulationInstances(state) {
    var d = (state.packageDetails && state.packageDetails.isolatie) || {};
    var focus = d.isoFocus;
    if (focus === 'combi') {
      return [
        { instanceId: 'dak', instanceLabel: 'Isolatie dak (combi)', subtype: 'dak_binnen' },
        /* BE renovation: "muren" without gevel-ETICS intent = spouw (not buitenmuur/ETICS) */
        { instanceId: 'muren', instanceLabel: 'Isolatie muren (combi)', subtype: 'spouw' },
        { instanceId: 'vloer', instanceLabel: 'Isolatie vloer (combi)', subtype: 'vloer' }
      ];
    }
    return [{
      instanceId: 'main',
      instanceLabel: null,
      subtype: focus === 'dak' ? 'dak_binnen'
        : focus === 'muren' ? 'spouw'
        : focus === 'vloer' ? 'vloer'
        : null
    }];
  }

  function listPricingJobs(state) {
    var scope = (state && state.scope) || {};
    var jobs = [];
    Object.keys(PACKAGE_TO_TYPE).forEach(function (pkg) {
      var intensity = scope[pkg];
      if (!intensity || intensity === 'niet_nodig') return;
      if (pkg === 'badkamer') {
        listBathroomInstances(state).forEach(function (inst) {
          jobs.push({
            packageType: 'badkamer',
            resultKey: 'badkamer:' + inst.instanceId,
            instance: inst
          });
        });
      } else if (pkg === 'isolatie') {
        var isoInst = listInsulationInstances(state);
        var isCombi = isoInst.length > 1;
        isoInst.forEach(function (inst) {
          jobs.push({
            packageType: 'isolatie',
            resultKey: isCombi ? ('isolatie:' + inst.instanceId) : 'isolatie',
            instance: inst
          });
        });
      } else {
        jobs.push({ packageType: pkg, resultKey: pkg, instance: null });
      }
    });
    return jobs;
  }

  /* ---------- per-package adapters ---------- */

  function adaptDak(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.dak) || {};
    var intensity = state.scope.dak;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var assumptions = [];
    var statusHint = null;

    var workType = 'vernieuwen';
    if (intensity === 'beperkt') workType = 'herstelling';
    else if (intensity === 'grondig') workType = 'vernieuwen';
    else if (intensity === 'volledig') workType = 'volledig';
    else if (intensity === 'weet_niet') {
      workType = 'vernieuwen';
      statusHint = 'NEEDS_MORE_INFORMATION';
      unknowns.push('scope.dak');
      mapping.push(meta('workType', 'assumed', 'Scope weet_niet → workType=vernieuwen (niet autoritatief).', 'low'));
    } else {
      mapping.push(meta('workType', 'direct', 'Scope → workType=' + workType, 'high'));
    }

    var insulation = d.roofInsulation === 'ja' || d.roofInsulation === 'deels' ? 'ja'
      : d.roofInsulation === 'nee' ? 'nee' : 'onbekend';
    /* Calc1 forces dakisolatie whenever workType=volledig — honor explicit "nee" by mapping to vernieuwen */
    if (workType === 'volledig' && insulation === 'nee') {
      workType = 'vernieuwen';
      assumptions.push('dak volledig + roofInsulation=nee → workType=vernieuwen (Calc1 volledig forceert isolatie; gebruiker weigerde isolatie).');
      mapping.push(meta('workType', 'derived',
        'Volledig dak zonder isolatie → vernieuwen (geen stille Calc1-isolatie).', 'high'));
    } else if (intensity !== 'weet_niet') {
      mapping.push(meta('workType', 'direct', 'Scope-intensiteit ' + intensity + ' → workType=' + workType, 'high'));
    }

    var roofType = d.roofType === 'hellend' || d.roofType === 'plat' ? d.roofType
      : d.roofType === 'gemengd' ? 'hellend' : null;
    if (d.roofType === 'gemengd') {
      mapping.push(meta('roofType', 'assumed', 'Gemengd → hellend proxy in Calc1.', 'low'));
    } else if (roofType) {
      mapping.push(meta('roofType', 'direct', 'Daktype uit details.', 'high'));
    } else {
      roofType = 'hellend';
      unknowns.push('roofType');
      mapping.push(meta('roofType', 'unknown', 'Daktype onbekend.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var mat = mapRoofMaterial(d, roofType, mapping, unknowns);
    if (mat.uncertain && (workType === 'vernieuwen' || workType === 'volledig')) {
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var size = numOrNull(d.roofArea);
    if (size) {
      mapping.push(meta('size', 'direct', 'Dakoppervlakte uit details.', 'high'));
    } else {
      size = estimateRoofArea(ctx.areaM2, roofType);
      if (size) {
        mapping.push(meta('size', 'derived', 'Geschat uit bewoonbare opp. × dakfactor.', 'medium'));
      } else {
        size = 90;
        unknowns.push('roofArea');
        mapping.push(meta('size', 'assumed', 'Geen dak- of woningopp. → 90 m² fallback.', 'low'));
        statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      }
    }

    if (d.roofInsulation && d.roofInsulation !== 'weet_niet') {
      mapping.push(meta('insulation', 'direct', 'Isolatiekeuze uit details.', 'high'));
    } else {
      mapping.push(meta('insulation', 'unknown', 'Isolatie onbekend → onbekend (geen stille ja).', 'low'));
      unknowns.push('roofInsulation');
    }

    var access = d.roofAccess === 'moeilijk' ? 'moeilijk' : d.roofAccess === 'normaal' ? 'normaal' : null;
    if (access) {
      mapping.push(meta('access', 'direct', 'Daktoegang.', 'high'));
    } else {
      access = 'normaal';
      unknowns.push('roofAccess');
      mapping.push(meta('access', 'assumed', 'Toegang onbekend → normaal.', 'low'));
    }

    if (!d.roofStructure || d.roofStructure === 'weet_niet') unknowns.push('roofStructure');

    var gutters = 'nee';
    if (d.roofGutters === 'ja') {
      gutters = 'ja';
      mapping.push(meta('gutters', 'direct', 'Goten mee vernieuwen.', 'high'));
    } else if (d.roofGutters === 'nee') {
      gutters = 'nee';
      mapping.push(meta('gutters', 'direct', 'Goten niet meegenomen.', 'high'));
    } else {
      gutters = intensity === 'volledig' ? 'ja' : 'nee';
      mapping.push(meta('gutters', d.roofGutters === 'weet_niet' ? 'unknown' : 'assumed',
        'Goten soft: ja bij volledig, anders nee.', 'low'));
      if (!d.roofGutters || d.roofGutters === 'weet_niet') unknowns.push('roofGutters');
    }

    var asbestos = 'mogelijk';
    if (d.roofAsbestos === 'nee' || d.roofAsbestos === 'ja' || d.roofAsbestos === 'mogelijk') {
      asbestos = d.roofAsbestos;
      mapping.push(meta('asbestos', 'direct', 'Asbestantwoord gebruiker.', 'high'));
    } else if (ctx.housingAge === 'jong') {
      asbestos = 'nee';
      mapping.push(meta('asbestos', 'derived', 'Recente woning → asbest onwaarschijnlijk.', 'medium'));
    } else {
      asbestos = 'mogelijk';
      unknowns.push('roofAsbestos');
      mapping.push(meta('asbestos', 'unknown', 'Asbest onbeantwoord — geen autoritatieve asbestlijn zonder antwoord.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var level = ctx.level;
    if (mat.preferCeramic && level !== 'premium') {
      mapping.push(meta('level', 'derived',
        'Keramische pannen gevraagd; Calc1 ceramic band actief enkel bij premium — level blijft finishprofiel.', 'medium'));
    }

    var answers = {
      size: size,
      level: level,
      roofType: roofType,
      workType: workType,
      material: mat.material,
      insulation: insulation,
      gutters: gutters,
      access: access,
      asbestos: asbestos,
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };

    return wrap('dak', 'dak', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: assumptions
    });
  }

  function adaptRamen(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.ramen) || {};
    var intensity = state.scope.ramen;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.ramen');

    var win = deriveWindowSize(d, ctx.areaM2, mapping, unknowns);
    if (!win.ok) statusHint = statusHint || 'NEEDS_MORE_INFORMATION';

    var frame = d.windowFrame && d.windowFrame !== 'weet_niet' ? d.windowFrame : null;
    if (frame) {
      mapping.push(meta('frame', 'direct', 'Kadermateriaal.', 'high'));
    } else {
      frame = 'pvc';
      unknowns.push('windowFrame');
      mapping.push(meta('frame', 'assumed', 'Kader onbekend → pvc (provisioneel, niet autoritatief).', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var glazing = ctx.level === 'premium' ? 'hr+++' : ctx.level === 'basis' ? 'hr' : 'hr++';
    mapping.push(meta('glazing', 'derived', 'Beglazing gekoppeld aan finishprofiel/level.', 'medium'));

    var doors = '0';
    if (d.exteriorDoorCount === '1') doors = '1';
    else if (d.exteriorDoorCount === '2plus') doors = '2plus';
    else if (d.exteriorDoorCount === '0') doors = '0';
    else if (d.includeDoors === 'ja') doors = intensity === 'volledig' ? '2plus' : '1';
    else if (d.includeDoors === 'nee') doors = '0';
    else {
      unknowns.push('exteriorDoorCount');
      mapping.push(meta('doors', 'unknown', 'Buitendeuren onbekend → 0.', 'low'));
      doors = '0';
    }
    if (d.exteriorDoorCount && d.exteriorDoorCount !== 'weet_niet') {
      mapping.push(meta('doors', 'direct', 'Buitendeuren uit telling.', 'high'));
    }

    var answers = {
      size: win.size || 15,
      level: ctx.level,
      frame: frame,
      glazing: glazing,
      sliding: win.sliding || 'nee',
      doors: doors,
      removal: intensity === 'beperkt' ? 'nee' : 'ja',
      access: 'normaal',
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    mapping.push(meta('removal', 'derived', 'Uithalen: nee bij beperkt, anders ja.', 'medium'));
    mapping.push(meta('access', 'assumed', 'Raamtoegang → normaal (zelden prijsdrivers >5% zonder steigercontext).', 'low'));

    return wrap('ramen', 'ramen', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: []
    });
  }

  function adaptIsolatie(state, ctx, instance) {
    var d = (state.packageDetails && state.packageDetails.isolatie) || {};
    var intensity = state.scope.isolatie;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.isolatie');

    instance = instance || listInsulationInstances(state)[0];
    var assumptions = [];
    var subtype = null;

    if (instance && instance.subtype) {
      subtype = instance.subtype;
      if (d.isoFocus === 'combi') {
        assumptions.push('isoFocus=combi → separate Calc1 isolatie instance ' + instance.instanceId + ' (' + subtype + ') — no fake multiplier.');
        mapping.push(meta('subtype', 'direct', 'Combi-instantie → ' + subtype + '.', 'high'));
      } else if (d.isoFocus && d.isoFocus !== 'weet_niet') {
        mapping.push(meta('subtype', 'direct', 'Isolatiefocus → subtype.', 'high'));
      }
    }     else if (d.isoFocus === 'dak') subtype = 'dak_binnen';
    else if (d.isoFocus === 'muren') subtype = 'spouw';
    else if (d.isoFocus === 'vloer') subtype = 'vloer';
    else {
      unknowns.push('isoFocus');
      subtype = 'spouw';
      mapping.push(meta('subtype', 'unknown', 'Focus onbekend — geen autoritatieve subtype.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }
    if (d.isoFocus === 'muren' || (instance && instance.instanceId === 'muren')) {
      assumptions.push('isoFocus=muren → Calc1 spouw (typische BE renovatie). Buitenmuur/ETICS via gevel-pakket, niet via muren.');
      mapping.push(meta('subtype', 'derived', 'Muren → spouw (niet ETICS).', 'high'));
    }

    var size = ctx.areaM2;
    if (size) {
      // Combi instances share dwelling area proxy per surface — Calc1 prices per subtype m²
      var sizeFactor = d.isoFocus === 'combi' ? 1 : 1;
      if (subtype === 'vloer') sizeFactor = 1;
      else if (subtype === 'dak_binnen') sizeFactor = 0.85;
      else if (subtype === 'buitenmuur') sizeFactor = 1;
      else if (subtype === 'spouw') sizeFactor = 1;
      size = Math.round(size * sizeFactor);
      mapping.push(meta('size', 'derived', 'Isolatie-opp. proxy vanaf woningopp. (instantie ' + (instance.instanceId || 'main') + ').', 'medium'));
    } else {
      size = intensity === 'beperkt' ? 40 : 80;
      unknowns.push('areaM2');
      mapping.push(meta('size', 'assumed', 'Geen woningopp. → fallback.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var performance = 'standaard';
    if (d.isoPerformance === 'hoog') performance = 'hoog';
    else if (d.isoPerformance === 'standaard') performance = 'standaard';
    else if (ctx.level === 'premium' || intensity === 'volledig') performance = 'hoog';
    mapping.push(meta('performance', d.isoPerformance && d.isoPerformance !== 'weet_niet' ? 'direct' : 'derived',
      'Performantie.', 'medium'));

    var finish = 'nee';
    if (subtype === 'binnenmuur' || subtype === 'dak_binnen' || subtype === 'buitenmuur') {
      finish = intensity === 'beperkt' ? 'beperkt' : ctx.level === 'premium' ? 'hoog' : 'standaard';
    }

    var answers = {
      size: size,
      level: ctx.level,
      subtype: subtype,
      performance: performance,
      access: 'normaal',
      prep: intensity === 'beperkt' ? 'beperkt' : 'uitgebreid',
      finish: finish,
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    return wrap('isolatie', 'isolatie', ctx.province, answers, mapping, {
      statusHint: statusHint,
      unknowns: unknowns,
      assumptions: assumptions,
      instanceId: instance.instanceId || null,
      instanceLabel: instance.instanceLabel || null
    });
  }

  function adaptVerwarming(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.verwarming) || {};
    var intensity = state.scope.verwarming;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.verwarming');

    var projectType = null;
    if (d.heatDesired === 'lucht_water') projectType = 'lucht_water';
    else if (d.heatDesired === 'hybride') projectType = 'hybride';
    else if (d.heatDesired === 'ketel') projectType = 'ketel_vervangen';
    else {
      unknowns.push('heatDesired');
      if (intensity === 'volledig') projectType = 'lucht_water';
      else if (intensity === 'grondig') projectType = 'hybride';
      else projectType = 'ketel_vervangen';
      mapping.push(meta('projectType', 'assumed', 'Gewenst systeem ontbreekt → intensiteit-proxy.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }
    if (d.heatDesired && d.heatDesired !== 'weet_niet') {
      mapping.push(meta('projectType', 'direct', 'Gewenst systeem.', 'high'));
    }

    var distribution = 'radiatoren';
    if (d.underfloor === 'ja') distribution = 'vloer';
    else if (d.underfloor === 'deels') distribution = 'gemengd';
    else if (d.underfloor === 'nee') distribution = 'radiatoren';
    else {
      unknowns.push('underfloor');
      /* Warmtepomp zonder afgifte-info: geen vals precieze basisinstallatie */
      if (projectType === 'lucht_water' || projectType === 'hybride') {
        statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
        mapping.push(meta('distribution', 'unknown',
          'Warmtepomp zonder vloerverwarmingsantwoord — afgifte/hydrauliek onzeker.', 'low'));
      }
    }
    if (!(projectType === 'lucht_water' || projectType === 'hybride') ||
        (d.underfloor && d.underfloor !== 'weet_niet')) {
      mapping.push(meta('distribution', d.underfloor && d.underfloor !== 'weet_niet' ? 'direct' : 'assumed',
        'Verdeling.', 'medium'));
    }

    var insulationLevel = 'matig';
    if (ctx.epc === 'A' || ctx.epc === 'B') insulationLevel = 'goed';
    else if (ctx.epc === 'F' || ctx.epc === 'G' || ctx.condition === 'zwaar' || ctx.condition === 'verouderd') {
      insulationLevel = 'slecht';
    }
    mapping.push(meta('insulationLevel', 'derived', 'Afgeleid uit EPC/staat.', 'low'));

    var size = ctx.areaM2 || 120;
    mapping.push(meta('size', ctx.areaM2 ? 'derived' : 'assumed', 'Verwarmde opp.', ctx.areaM2 ? 'high' : 'low'));

    var dhw = 'nieuw';
    if (d.heatDhw === 'behouden' || d.heatDhw === 'nieuw') {
      dhw = d.heatDhw;
      mapping.push(meta('dhw', 'direct', 'SWW-keuze gebruiker.', 'high'));
    } else {
      dhw = intensity === 'beperkt' ? 'behouden' : 'nieuw';
      unknowns.push('heatDhw');
      mapping.push(meta('dhw', 'assumed', 'SWW soft: behouden bij beperkt, anders nieuw.', 'low'));
      if (projectType === 'lucht_water') {
        statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      }
    }

    var assumptions = [];
    if (projectType === 'lucht_water' && distribution === 'radiatoren') {
      assumptions.push('Lucht-water WP + radiatoren: raming = toestel + basisplaatsing/SWW — geen volledige LT-afgiftevernieuwing of 3-fasige versterking tenzij elders in scope.');
    }

    var answers = {
      size: size,
      level: ctx.level,
      projectType: projectType,
      insulationLevel: insulationLevel,
      distribution: distribution,
      dhw: dhw,
      replaceVsNew: 'vervangen',
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    return wrap('verwarming', 'verwarming', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: assumptions
    });
  }

  function adaptElektriciteit(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.elektriciteit) || {};
    var intensity = state.scope.elektriciteit;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.elektriciteit');

    var scope = 'partieel';
    if (d.elecScope === 'volledig') scope = 'volledig';
    else if (d.elecScope === 'partieel') scope = 'partieel';
    else if (d.elecScope === 'weet_niet') {
      unknowns.push('elecScope');
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      scope = (intensity === 'volledig' || intensity === 'grondig') ? 'volledig' : 'partieel';
      mapping.push(meta('scope', 'unknown', 'Elektra-omvang weet_niet — provisioneel uit intensiteit, niet autoritatief.', 'low'));
    }
    /* Align derived intensity with explicit elecScope answers (no silent renovatie_volledig uplift) */
    else if (intensity === 'volledig') scope = 'volledig';
    else if (intensity === 'grondig') scope = 'volledig';
    else unknowns.push('elecScope');
    if (!(d.elecScope === 'weet_niet')) {
      mapping.push(meta('scope', d.elecScope && d.elecScope !== 'weet_niet' ? 'direct' : 'derived',
        'Elektra-omvang.', 'medium'));
    }

    var fitOut = 'standaard';
    if (d.elecFitOut && d.elecFitOut !== 'weet_niet') fitOut = d.elecFitOut;
    else if (intensity === 'beperkt') fitOut = 'basis';
    else if (intensity === 'volledig') fitOut = 'uitgebreid';
    mapping.push(meta('fitOut', d.elecFitOut && d.elecFitOut !== 'weet_niet' ? 'direct' : 'derived',
      'Fit-out.', 'medium'));

    var board = d.elecBoard === 'ja' ? 'nieuw' : d.elecBoard === 'nee' ? 'behouden'
      : (scope === 'partieel' ? 'behouden' : 'nieuw');
    mapping.push(meta('board', d.elecBoard && d.elecBoard !== 'weet_niet' ? 'direct' : 'derived',
      'Verdeelbord.', 'medium'));

    var floors = ctx.floors || '1';
    mapping.push(meta('floors', ctx.floors ? 'direct' : 'assumed', 'Verdiepingen.', ctx.floors ? 'high' : 'low'));

    var size = ctx.areaM2 || 100;
    mapping.push(meta('size', ctx.areaM2 ? 'direct' : 'assumed', 'Woningopp. elektra.', ctx.areaM2 ? 'high' : 'low'));

    var answers = {
      size: size,
      level: ctx.level,
      scope: scope,
      floors: floors,
      board: board,
      fitOut: fitOut,
      inspection: 'ja',
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    mapping.push(meta('inspection', 'assumed', 'Keuring standaard meegenomen (ja).', 'low'));
    return wrap('elektriciteit', 'elektriciteit', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: []
    });
  }

  function adaptVentilatie(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.ventilatie) || {};
    var intensity = state.scope.ventilatie;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var assumptions = [];
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.ventilatie');

    var system = null;
    if (d.ventSystem && d.ventSystem !== 'weet_niet') {
      /* Normalize shorthand C/D → Calc1 keys (prevents silent fallback to C-band pricing) */
      if (d.ventSystem === 'C' || d.ventSystem === 'c' || d.ventSystem === 'systeem_c') system = 'systeem_c';
      else if (d.ventSystem === 'D' || d.ventSystem === 'd' || d.ventSystem === 'systeem_d') system = 'systeem_d';
      else if (d.ventSystem === 'decentraal') system = 'decentraal';
      else system = d.ventSystem;
    } else {
      unknowns.push('ventSystem');
      system = intensity === 'beperkt' ? 'decentraal' : intensity === 'volledig' ? 'systeem_d' : 'systeem_c';
      mapping.push(meta('system', 'assumed', 'Systeem ontbreekt → intensiteit-proxy.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }
    if (d.ventSystem && d.ventSystem !== 'weet_niet') {
      mapping.push(meta('system', 'direct', 'Ventilatiesysteem → ' + system + '.', 'high'));
    }

    var wetRooms = mapWetRooms(d, system, mapping, unknowns);
    if (unknowns.indexOf('ventBathCount') !== -1 && unknowns.indexOf('ventToiletCount') !== -1) {
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    /* Existing dwellings: kanalen/renovatie-routing, not nieuwbouw eenvoudig */
    var routing = intensity === 'beperkt' ? 'eenvoudig' : intensity === 'volledig' ? 'complex' : 'renovatie';
    if (system === 'systeem_d' && (ctx.housingAge === 'oud' || ctx.housingAge === 'middel' || ctx.condition === 'zwaar' || ctx.condition === 'verouderd')) {
      if (routing === 'eenvoudig') routing = 'renovatie';
      assumptions.push('Systeem D in bestaande woning → routing minstens renovatie (kanalen/afwerking).');
    }

    var answers = {
      size: ctx.areaM2 || 120,
      level: ctx.level,
      system: system,
      wetRooms: wetRooms,
      floors: ctx.floors || '1',
      routing: routing,
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    mapping.push(meta('routing', 'derived', 'Routing uit intensiteit/woningleeftijd.', 'medium'));
    return wrap('ventilatie', 'ventilatie', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: assumptions || []
    });
  }

  function adaptKeuken(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.keuken) || {};
    var intensity = state.scope.keuken;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.keuken');

    var scope = 'vervangen';
    if (intensity === 'beperkt') scope = 'fronten';
    else if (d.kitchenLayout === 'ja' || intensity === 'volledig') scope = 'herindelen';
    mapping.push(meta('scope', 'derived', 'Keukenscope uit intensiteit/layout.', 'medium'));

    var size = numOrNull(d.kitchenSize);
    if (size) mapping.push(meta('size', 'direct', 'Keukenopp.', 'high'));
    else {
      size = intensity === 'beperkt' ? 8 : 12;
      unknowns.push('kitchenSize');
      mapping.push(meta('size', 'assumed', 'Keukenopp. fallback — niet autoritatief zonder input.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var cabinets = ctx.level === 'premium' ? 'hoog' : ctx.level === 'basis' ? 'budget' : 'midden';
    var worktop = ctx.level === 'premium' ? 'natuursteen' : ctx.level === 'basis' ? 'laminaat' : 'composiet';
    var appliances = d.kitchenAppliances === 'ja' ? (ctx.level === 'premium' ? 'uitgebreid' : 'basis')
      : d.kitchenAppliances === 'nee' ? 'nee' : (intensity === 'beperkt' ? 'nee' : 'basis');
    mapping.push(meta('cabinets', 'derived', 'Kasten ← finishprofiel.', 'medium'));
    mapping.push(meta('worktop', 'derived', 'Werkblad ← finishprofiel.', 'medium'));
    mapping.push(meta('appliances', d.kitchenAppliances && d.kitchenAppliances !== 'weet_niet' ? 'direct' : 'assumed',
      'Toestellen.', 'medium'));
    if (!d.kitchenAppliances || d.kitchenAppliances === 'weet_niet' || d.kitchenAppliances === 'deels') {
      unknowns.push('kitchenAppliances');
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var answers = {
      size: size,
      level: ctx.level,
      scope: scope,
      cabinets: cabinets,
      worktop: worktop,
      appliances: appliances,
      connections: intensity === 'volledig' || d.kitchenLayout === 'ja' ? 'ja' : 'beperkt',
      splashback: 'ja',
      flooring: intensity === 'volledig' ? 'ja' : 'nee',
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    return wrap('keuken', 'keuken', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: []
    });
  }

  function adaptBadkamerInstance(state, ctx, instance) {
    var d = (state.packageDetails && state.packageDetails.badkamer) || {};
    var intensity = state.scope.badkamer;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.badkamer');
    if (instance && instance.uncertainCount) {
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      unknowns.push('bathCount');
    }

    var detailInt = d[instance.intensityKey];
    if ((!detailInt || detailInt === 'weet_niet') && instance.legacyIntensityKey) {
      detailInt = d[instance.legacyIntensityKey];
    }
    if (!detailInt || detailInt === 'weet_niet') detailInt = intensity;

    var scope = 'gedeeltelijk';
    if (detailInt === 'beperkt') scope = 'opfrissing';
    else if (detailInt === 'volledig') scope = 'volledig';
    else if (detailInt === 'grondig') scope = 'gedeeltelijk';
    mapping.push(meta('scope', d[instance.intensityKey] && d[instance.intensityKey] !== 'weet_niet' ? 'direct' : 'derived',
      'Scope voor ' + instance.instanceLabel + '.', 'medium'));

    var size = numOrNull(d[instance.sizeKey]);
    if (!size && instance.legacySizeKey) size = numOrNull(d[instance.legacySizeKey]);
    if (size) {
      mapping.push(meta('size', 'direct', 'Opp. ' + instance.instanceLabel + '.', 'high'));
    } else {
      size = scope === 'opfrissing' ? 4 : instance.instanceId === 'main' ? 6 : 4;
      unknowns.push(instance.sizeKey);
      mapping.push(meta('size', 'assumed', 'Opp. fallback voor ' + instance.instanceLabel + '.', 'low'));
    }

    var tiling = ctx.level === 'basis' ? 'gedeeltelijk' : 'volledig';
    var sanitary = ctx.level === 'premium' ? 'beide' : 'douche';
    mapping.push(meta('tiling', 'derived', 'Tegels ← finish.', 'medium'));
    mapping.push(meta('sanitary', 'derived', 'Sanitair ← finish.', 'medium'));

    var answers = {
      size: size,
      level: ctx.level,
      scope: scope,
      sanitary: sanitary,
      tiling: tiling,
      plumbingMove: scope === 'volledig' ? 'beperkt' : 'nee',
      ventilation: 'goed',
      ufh: 'nee',
      demolition: scope === 'opfrissing' ? 'geen' : scope === 'volledig' ? 'volledig' : 'beperkt',
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };

    return wrap('badkamer', 'badkamer', ctx.province, answers, mapping, {
      statusHint: statusHint,
      unknowns: unknowns,
      assumptions: [],
      instanceId: instance.instanceId,
      instanceLabel: instance.instanceLabel
    });
  }

  function adaptVloeren(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.vloeren) || {};
    var intensity = state.scope.vloeren;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.vloeren');

    var share = d.floorShare;
    var size = ctx.areaM2;
    if (!size) {
      size = 50;
      unknowns.push('areaM2');
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }
    if (share === 'deel') size = Math.round(size * 0.35);
    else if (share === 'meeste') size = Math.round(size * 0.7);
    else if (share === 'alle') { /* full */ }
    else {
      size = Math.round(size * 0.55);
      unknowns.push('floorShare');
    }
    mapping.push(meta('size', ctx.areaM2 && share && share !== 'weet_niet' ? 'derived' : 'assumed',
      'Vloeropp. uit woning × aandeel.', 'medium'));

    var floorMaterial = null;
    if (d.floorMaterial && d.floorMaterial !== 'weet_niet') {
      floorMaterial = d.floorMaterial;
      mapping.push(meta('floorMaterial', 'direct', 'Vloermateriaal.', 'high'));
    } else {
      floorMaterial = ctx.level === 'premium' ? 'parket' : 'laminaat';
      unknowns.push('floorMaterial');
      mapping.push(meta('floorMaterial', 'assumed', 'Vloermateriaal onbekend → provisioneel ' + floorMaterial + '.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var answers = {
      size: Math.max(15, size),
      level: ctx.level,
      floorMaterial: floorMaterial,
      rooms: share === 'alle' ? 'meer' : share === 'deel' ? '1' : '2-3',
      removal: intensity === 'beperkt' ? 'nee' : 'ja',
      substrate: ctx.condition === 'goed' ? 'goed' : ctx.condition === 'zwaar' ? 'slecht' : 'matig',
      leveling: intensity === 'volledig' ? 'volledig' : 'beperkt',
      ufh: 'nee',
      wetRooms: 'nee',
      skirting: 'ja',
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    return wrap('vloeren', 'vloeren', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: []
    });
  }

  function adaptSchilderwerken(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.schilderwerken) || {};
    var intensity = state.scope.schilderwerken;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.schilderwerken');

    var paintScope = d.paintScope && d.paintScope !== 'weet_niet' ? d.paintScope : null;
    if (paintScope) {
      mapping.push(meta('paintScope', 'direct', 'Schilderzone.', 'high'));
    } else {
      paintScope = 'binnen';
      unknowns.push('paintScope');
      mapping.push(meta('paintScope', 'unknown', 'Zone onbekend.', 'low'));
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var surfaces = d.paintInteriorSurfaces;
    if ((paintScope === 'binnen' || paintScope === 'beide') && (!surfaces || surfaces === 'weet_niet')) {
      unknowns.push('paintInteriorSurfaces');
    } else if (surfaces && surfaces !== 'weet_niet') {
      mapping.push(meta('paintInteriorSurfaces', 'direct', 'Binnenoppervlakken: ' + surfaces, 'high'));
    }

    var size = null;
    if (d.paintAreaMethod === 'known') {
      size = numOrNull(d.paintAreaM2);
      if (size) mapping.push(meta('size', 'direct', 'Schilder-m² door gebruiker.', 'high'));
      else {
        unknowns.push('paintAreaM2');
        statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      }
    }
    if (!size) {
      size = estimatePaintArea(ctx.areaM2, paintScope, surfaces);
      if (size && d.paintAreaMethod === 'estimate') {
        mapping.push(meta('size', 'derived',
          'Schilder-m² afgeleid van woningopp. × oppervlaktefactoren (transparant).', 'medium'));
      } else if (size) {
        mapping.push(meta('size', 'derived', 'Schilder-m² soft afgeleid; methode onzeker.', 'low'));
        if (d.paintAreaMethod === 'weet_niet' || !d.paintAreaMethod) {
          statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
          unknowns.push('paintAreaMethod');
        }
      } else {
        size = 100;
        unknowns.push('paintArea');
        mapping.push(meta('size', 'assumed', 'Geen woningopp. → 100 m² fallback.', 'low'));
        statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      }
    }

    var surface = ctx.condition === 'goed' ? 'goed' : ctx.condition === 'zwaar' || ctx.condition === 'verouderd' ? 'slecht' : 'matig';
    var answers = {
      size: size,
      level: ctx.level,
      paintScope: paintScope,
      surface: surface,
      wallpaper: 'nee',
      colors: ctx.level === 'premium' ? '2-3' : '1',
      darkColors: ctx.level === 'premium' ? 'ja' : 'nee',
      woodwork: intensity === 'beperkt' ? 'nee' : (surfaces === 'whole_interior' ? 'ja' : 'beperkt'),
      floors: ctx.floors || '1',
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    return wrap('schilderwerken', 'schilderwerken', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: []
    });
  }

  function adaptGevel(state, ctx) {
    var d = (state.packageDetails && state.packageDetails.gevel) || {};
    var intensity = state.scope.gevel;
    var mapping = ctx.mapping.slice();
    var unknowns = ctx.unknowns.slice();
    var statusHint = intensity === 'weet_niet' ? 'NEEDS_MORE_INFORMATION' : null;
    if (intensity === 'weet_niet') unknowns.push('scope.gevel');

    var intervention = null;
    if (d.facadeWork === 'reinigen') intervention = 'reinigen';
    else if (d.facadeWork === 'crepi') intervention = 'crepi';
    else if (d.facadeWork === 'isolatie') intervention = 'isolatie_afwerking';
    else if (intensity === 'beperkt') intervention = 'reinigen';
    else if (intensity === 'volledig') intervention = 'isolatie_afwerking';
    else intervention = 'crepi';
    mapping.push(meta('intervention', d.facadeWork && d.facadeWork !== 'weet_niet' ? 'direct' : 'derived',
      'Gevelinterventie.', 'medium'));
    if (!d.facadeWork || d.facadeWork === 'weet_niet') {
      unknowns.push('facadeWork');
      statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
    }

    var scaffold = null;
    if (d.facadeAccess === 'laag' || d.facadeAccess === 'hoog' || d.facadeAccess === 'middel') {
      scaffold = d.facadeAccess;
      mapping.push(meta('scaffold', 'direct', 'Steiger.', 'high'));
    } else {
      scaffold = 'middel';
      unknowns.push('facadeAccess');
      mapping.push(meta('scaffold', 'assumed', 'Steiger onbekend → middel.', 'low'));
    }

    var elevations = d.facadeElevations;
    if (elevations === '1' || elevations === '2' || elevations === '3plus') {
      mapping.push(meta('elevations', 'direct', 'Aantal gevelvlakken.', 'high'));
    } else {
      elevations = (ctx.property && ctx.property.propertyType === 'rijwoning') ? '1'
        : (ctx.property && ctx.property.propertyType === 'open') ? '3plus' : '2';
      unknowns.push('facadeElevations');
      mapping.push(meta('elevations', 'derived', 'Elevaties soft uit woningtype.', 'low'));
    }

    var size = null;
    if (d.facadeAreaMethod === 'known') {
      size = numOrNull(d.facadeAreaM2);
      if (size) mapping.push(meta('size', 'direct', 'Gevel-m² door gebruiker.', 'high'));
      else {
        unknowns.push('facadeAreaM2');
        statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      }
    }
    if (!size) {
      size = estimateFacadeArea(ctx.property, elevations, d.facadeFrontage);
      if (size && d.facadeAreaMethod === 'estimate') {
        mapping.push(meta('size', 'derived',
          'Gevel-m² via type/verdiepingen/elevaties' +
          (numOrNull(d.facadeFrontage) ? ' + voorgevelbreedte' : '') + '.', 'medium'));
      } else if (size) {
        mapping.push(meta('size', 'derived', 'Gevel-m² soft geschat; methode onzeker.', 'low'));
        if (d.facadeAreaMethod === 'weet_niet' || !d.facadeAreaMethod) {
          statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
          unknowns.push('facadeAreaMethod');
        }
      } else {
        size = intensity === 'beperkt' ? 40 : 90;
        unknowns.push('facadeArea');
        mapping.push(meta('size', 'assumed', 'Geen bruikbare gevelproxy → fallback.', 'low'));
        statusHint = statusHint || 'NEEDS_MORE_INFORMATION';
      }
    }

    var condition = ctx.condition === 'goed' ? 'goed' : ctx.condition === 'zwaar' ? 'slecht' : 'matig';
    var finish = ctx.level === 'premium' ? 'premium' : ctx.level === 'basis' ? 'nee' : 'basis';

    var answers = {
      size: size,
      level: ctx.level,
      intervention: intervention,
      condition: condition,
      elevations: elevations,
      scaffold: scaffold,
      finish: finish,
      housingAge: ctx.housingAge,
      urgency: ctx.urgency,
      province: ctx.province
    };
    return wrap('gevel', 'gevel', ctx.province, answers, mapping, {
      statusHint: statusHint, unknowns: unknowns, assumptions: []
    });
  }

  var ADAPTERS = {
    dak: adaptDak,
    ramen: adaptRamen,
    isolatie: adaptIsolatie,
    verwarming: adaptVerwarming,
    elektriciteit: adaptElektriciteit,
    ventilatie: adaptVentilatie,
    keuken: adaptKeuken,
    vloeren: adaptVloeren,
    schilderwerken: adaptSchilderwerken,
    gevel: adaptGevel
  };

  function adaptPackageToCalc1(packageType, calc2State, options) {
    options = options || {};
    var baseType = packageType.indexOf('badkamer:') === 0
      ? 'badkamer'
      : (packageType.indexOf('isolatie:') === 0 ? 'isolatie' : packageType);
    if (!PACKAGE_TO_TYPE[baseType]) {
      return {
        packageType: packageType,
        type: null,
        province: null,
        answers: null,
        mappingMetadata: [],
        statusHint: 'SKIPPED',
        unknowns: ['unknownPackage'],
        assumptions: []
      };
    }
    var intensity = calc2State && calc2State.scope && calc2State.scope[baseType];
    if (!intensity || intensity === 'niet_nodig') {
      return {
        packageType: baseType,
        type: PACKAGE_TO_TYPE[baseType],
        province: null,
        answers: null,
        mappingMetadata: [meta('scope', 'direct', 'Niet nodig — geen pricing.', 'high')],
        statusHint: 'SKIPPED',
        unknowns: [],
        assumptions: []
      };
    }
    var ctx = baseContext(calc2State);
    if (!ctx.province) {
      return {
        packageType: baseType,
        type: PACKAGE_TO_TYPE[baseType],
        province: null,
        answers: null,
        mappingMetadata: ctx.mapping,
        statusHint: 'NEEDS_MORE_INFORMATION',
        unknowns: ['province'],
        assumptions: []
      };
    }

    var adapted;
    if (baseType === 'badkamer') {
      var instance = options.instance;
      if (!instance) {
        // Default single-instance API: main bathroom only
        instance = listBathroomInstances(calc2State)[0];
      }
      adapted = adaptBadkamerInstance(calc2State, ctx, instance);
    } else if (baseType === 'isolatie') {
      adapted = adaptIsolatie(calc2State, ctx, options.instance || listInsulationInstances(calc2State)[0]);
    } else {
      adapted = ADAPTERS[baseType](calc2State, ctx);
    }
    adapted.resolvedAnswers = adapted.answers;
    return adapted;
  }

  return {
    PACKAGE_TO_TYPE: PACKAGE_TO_TYPE,
    adaptPackageToCalc1: adaptPackageToCalc1,
    listBathroomInstances: listBathroomInstances,
    listInsulationInstances: listInsulationInstances,
    listPricingJobs: listPricingJobs,
    finishToLevel: finishToLevel,
    yearToHousingAge: yearToHousingAge,
    baseContext: baseContext,
    estimateFacadeArea: estimateFacadeArea,
    estimatePaintArea: estimatePaintArea
  };
});
