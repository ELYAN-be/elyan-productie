/* ============================================================
   ELYAN Calculator 2 — Isolated session state (UI only)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof require !== 'undefined' ? require('./scope-model') : null,
      typeof require !== 'undefined' ? require('./property-profile') : null
    );
  } else {
    root.ElyanCalc2State = factory(root.ElyanCalc2Scope, root.ElyanCalc2Property);
  }
})(typeof self !== 'undefined' ? self : this, function (scopeModel, propertyModel) {
  'use strict';

  var SECTIONS = [
    { id: 'goal', label: 'Doel' },
    { id: 'property', label: 'Woning' },
    { id: 'scope', label: 'Renovatie' },
    { id: 'details', label: 'Details' },
    { id: 'finish', label: 'Afwerking' },
    { id: 'organisation', label: 'Organisatie' },
    { id: 'review', label: 'Analyse' },
    { id: 'finance', label: 'Investering' }
  ];

  var PROCUREMENT = [
    {
      value: 'separate',
      label: 'Losse vakmannen',
      desc: 'Ik regel en coördineer de verschillende aannemers zelf.'
    },
    {
      value: 'general_contractor',
      label: 'Algemene aannemer',
      desc: 'Eén hoofdaannemer coördineert meerdere vakmannen.'
    },
    {
      value: 'design_build',
      label: 'Design & build / totaalpartner',
      desc: 'Ontwerp, coördinatie en uitvoering worden als één project georganiseerd.'
    },
    {
      value: 'weet_niet',
      label: 'Weet ik nog niet',
      desc: 'Organisatie nog niet beslist.'
    }
  ];

  var STRUCTURAL_RISK = [
    { value: 'ja', label: 'Ja, waarschijnlijk', desc: 'Dragende muren, grote openingen of structureel risico.' },
    { value: 'nee', label: 'Nee', desc: 'Geen structurele ingrepen gepland.' },
    { value: 'weet_niet', label: 'Weet ik niet', desc: 'Nog onduidelijk — houden we open.' }
  ];

  var GOALS = {
    homeowner: {
      value: 'homeowner',
      label: 'Mijn eigen woning renoveren',
      support: 'Breng het renovatiebudget voor jouw geselecteerde werken, de planning en de belangrijkste risico’s in kaart.'
    },
    investor: {
      value: 'investor',
      label: 'Een woning kopen, renoveren & doorverkopen',
      support: 'Analyseer het renovatiebudget voor geselecteerde werken en bereid later een investeringsanalyse voor.'
    }
  };

  var FINISH = [
    {
      value: 'functioneel',
      label: 'Functioneel',
      desc: 'Degelijke, prijsbewuste keuzes.'
    },
    {
      value: 'comfort',
      label: 'Comfort',
      desc: 'Moderne materialen en een goede balans tussen kwaliteit en budget.'
    },
    {
      value: 'premium',
      label: 'Premium',
      desc: 'Hoogwaardige materialen en afwerking.'
    }
  ];

  function createState() {
    return {
      goal: null,
      propertyProfile: propertyModel ? propertyModel.emptyProfile() : {},
      scope: scopeModel ? scopeModel.emptyScope() : {},
      packageDetails: {},
      finishProfile: null,
      procurementModel: null,
      structuralRisk: null,
      softCostOverrides: {},
      costResolutions: {},
      financeProfile: null,
      currentStep: 'goal',
      currentDetailIndex: 0,
      metadata: {
        version: 'calc2-phase5-investor-finance',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locale: 'nl-BE',
        market: 'Belgium'
      }
    };
  }

  function emptyFinanceProfile() {
    return {
      purchasePrice: null,
      buyerType: 'natural',
      intendedUse: 'flip',
      ownerOccupierOnlyHome: false,
      acquisitionOverrides: {},
      financing: {
        mode: 'unknown',
        loanAmount: null,
        interestRate: null,
        holdingMonths: 6,
        oneTimeCosts: 0
      },
      holding: {
        monthlyTotal: null,
        propertyTaxAnnual: 0,
        insuranceMonthly: 0,
        utilitiesMonthly: 0,
        otherMonthly: 0,
        explicitZero: false
      },
      selling: {
        mode: 'unknown',
        agentRateExVat: null,
        otherSellingCosts: 0,
        certificatesCosts: 0
      },
      vat: {
        mode: 'indicative_mixed',
        worksVatRate: 0.21,
        softVatRate: 0.21,
        procurementVatRate: 0.21,
        worksSixPercentConfirmed: false,
        userVatAmount: null
      },
      resale: {
        mode: 'scenarios',
        conservative: null,
        expected: null,
        strong: null
      },
      targetRoiPercent: 15
    };
  }

  function ensureFinanceProfile(state) {
    if (!state.financeProfile) state.financeProfile = emptyFinanceProfile();
    return state.financeProfile;
  }

  function touch(state) {
    if (!state.metadata) state.metadata = {};
    state.metadata.updatedAt = new Date().toISOString();
    return state;
  }

  function serialize(state) {
    return JSON.stringify(state);
  }

  function deserialize(json) {
    var parsed = typeof json === 'string' ? JSON.parse(json) : json;
    return parsed;
  }

  function sectionIndex(sectionId) {
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id === sectionId) return i;
    }
    return 0;
  }

  function progressPercent(sectionId) {
    var idx = sectionIndex(sectionId);
    return Math.round(((idx + 1) / SECTIONS.length) * 100);
  }

  function finishLabel(value) {
    for (var i = 0; i < FINISH.length; i++) {
      if (FINISH[i].value === value) return FINISH[i].label;
    }
    return value || '—';
  }

  function goalLabel(value) {
    return (GOALS[value] && GOALS[value].label) || value || '—';
  }

  function procurementLabel(value) {
    for (var i = 0; i < PROCUREMENT.length; i++) {
      if (PROCUREMENT[i].value === value) return PROCUREMENT[i].label;
    }
    return value || '—';
  }

  function setSoftCostOverride(state, id, value) {
    if (!state.softCostOverrides) state.softCostOverrides = {};
    if (value === null || value === '' || typeof value === 'undefined') {
      delete state.softCostOverrides[id];
    } else {
      state.softCostOverrides[id] = value;
    }
    return touch(state);
  }

  function setCostResolution(state, id, resolution) {
    if (!state.costResolutions) state.costResolutions = {};
    if (!resolution) delete state.costResolutions[id];
    else state.costResolutions[id] = resolution;
    return touch(state);
  }

  return {
    SECTIONS: SECTIONS,
    GOALS: GOALS,
    FINISH: FINISH,
    PROCUREMENT: PROCUREMENT,
    STRUCTURAL_RISK: STRUCTURAL_RISK,
    createState: createState,
    emptyFinanceProfile: emptyFinanceProfile,
    ensureFinanceProfile: ensureFinanceProfile,
    touch: touch,
    serialize: serialize,
    deserialize: deserialize,
    sectionIndex: sectionIndex,
    progressPercent: progressPercent,
    finishLabel: finishLabel,
    goalLabel: goalLabel,
    procurementLabel: procurementLabel,
    setSoftCostOverride: setSoftCostOverride,
    setCostResolution: setCostResolution
  };
});
