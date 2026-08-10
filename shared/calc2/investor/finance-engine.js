/* ============================================================
   ELYAN Calc2 Investor — Finance engine (Phase 5)
   Hard gate: investorReadiness.allowed === true
   Consumes ONLY renovationInput. No AVM. No profit tax auto.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./acquisition-costs'),
      require('./selling-costs'),
      require('./vat-finance'),
      require('./financing-holding')
    );
  } else {
    root.ElyanCalc2FinanceEngine = factory(
      root.ElyanCalc2AcquisitionCosts,
      root.ElyanCalc2SellingCosts,
      root.ElyanCalc2VatFinance,
      root.ElyanCalc2FinancingHolding
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Acq, Selling, Vat, FinHold) {
  'use strict';

  function round50(n) {
    return Math.round(Number(n) / 50) * 50;
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function ledgerItem(id, label, value, sourceType, confidence, source, userEditable, explanation) {
    return {
      id: id,
      label: label,
      value: value,
      sourceType: sourceType,
      confidence: confidence || 'medium',
      source: source || null,
      userEditable: !!userEditable,
      explanation: explanation || ''
    };
  }

  function decisionStatus(profit, marginPct, confidenceBlocked) {
    if (confidenceBlocked) return 'INSUFFICIENT_INFORMATION';
    if (!isFinite(profit)) return 'INSUFFICIENT_INFORMATION';
    if (profit < -500) return 'NEGATIVE';
    if (Math.abs(profit) <= 500) return 'BREAK_EVEN';
    if (marginPct != null && marginPct < 5 && profit > 0) return 'THIN_MARGIN';
    if (marginPct != null && marginPct >= 15 && profit > 0) return 'STRONG_POSITIVE';
    if (profit > 0) return 'POSITIVE';
    return 'NEGATIVE';
  }

  function decisionLabel(status) {
    var map = {
      STRONG_POSITIVE: 'Sterk positief scenario (indicatief)',
      POSITIVE: 'Positief scenario (indicatief)',
      THIN_MARGIN: 'Dunne marge',
      BREAK_EVEN: 'Rond break-even',
      NEGATIVE: 'Dit scenario resulteert momenteel in een potentieel verlies.',
      INSUFFICIENT_INFORMATION: 'Onvoldoende informatie voor een betrouwbare uitkomst'
    };
    return map[status] || status;
  }

  function emptyFinanceProfile() {
    return {
      purchasePrice: null,
      region: null,
      alreadyPurchased: null,
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

  function validateInputs(fp) {
    var errors = [];
    var p = Number(fp.purchasePrice);
    if (!isFinite(p) || p <= 0) errors.push('purchase_price_invalid');
    var r = fp.resale || {};
    var hasResale = [r.conservative, r.expected, r.strong].some(function (v) {
      return isFinite(Number(v)) && Number(v) > 0;
    });
    if (!hasResale && !(isFinite(Number(r.expected)) && Number(r.expected) > 0)) {
      errors.push('resale_missing');
    }
    return errors;
  }

  function normalizeResale(fp) {
    var r = fp.resale || {};
    var exp = Number(r.expected);
    var cons = Number(r.conservative);
    var str = Number(r.strong);
    if (isFinite(exp) && exp > 0 && (!isFinite(cons) || cons <= 0) && (!isFinite(str) || str <= 0)) {
      /* Optional model spread — clearly labelled */
      return {
        conservative: round50(exp * 0.95),
        expected: round50(exp),
        strong: round50(exp * 1.05),
        spreadSource: 'ELYAN_MODEL_ASSUMPTION',
        note: 'Enkel verwachte verkoopwaarde opgegeven — ±5% scenario’s zijn ELYAN-modelassumptie, geen waardering.'
      };
    }
    return {
      conservative: isFinite(cons) && cons > 0 ? round50(cons) : round50(exp),
      expected: isFinite(exp) && exp > 0 ? round50(exp) : round50(cons || str),
      strong: isFinite(str) && str > 0 ? round50(str) : round50(exp),
      spreadSource: 'USER_ASSUMPTION',
      note: 'Verkoopscenario’s door gebruiker aangeleverd — geen geautomatiseerde waardering.'
    };
  }

  function computeStack(opts) {
    var purchase = opts.purchase;
    var renovationInput = opts.renovationInput;
    var fp = opts.financeProfile;
    var scenario = opts.scenario || 'expected';
    var renovationBand = opts.renovationBand || 'expected';

    var renoBase = Number(renovationInput.expected) || 0;
    if (renovationBand === 'low') renoBase = Number(renovationInput.low) || renoBase;
    if (renovationBand === 'high') renoBase = Number(renovationInput.high) || renoBase;

    /* Scale component shares for band */
    var worksE = Number(renovationInput.worksExpected) || 0;
    var softE = Number(renovationInput.softCostsExpected) || 0;
    var procE = Number(renovationInput.procurementCostsExpected) || 0;
    var resE = Number(renovationInput.reserveExpected) || 0;
    var sumE = worksE + softE + procE + resE;
    var scale = sumE > 0 ? renoBase / sumE : 1;
    var scaledInput = {
      worksExpected: worksE * scale,
      softCostsExpected: softE * scale,
      procurementCostsExpected: procE * scale,
      reserveExpected: resE * scale
    };

    var vatOpts = Object.assign({}, fp.vat || {}, { scenario: scenario === 'conservative' ? 'conservative' : 'expected' });
    var vat = Vat.resolveVat(scaledInput, vatOpts);

    var fin = fp.financing || {};
    var holdingMonths = Number(fin.holdingMonths);
    if (scenario === 'conservative' && isFinite(holdingMonths)) holdingMonths = holdingMonths + 3;
    if (scenario === 'strong' && isFinite(holdingMonths) && holdingMonths > 3) holdingMonths = Math.max(1, holdingMonths - 1);

    var financed = fin.mode === 'mortgage' || fin.mode === 'mixed';
    var acq = Acq.buildAcquisitionCosts({
      purchasePrice: purchase,
      region: fp.region,
      province: fp.province,
      buyerType: fp.buyerType || 'natural',
      ownerOccupierOnlyHome: !!fp.ownerOccupierOnlyHome,
      financed: financed,
      loanAmount: Number(fin.loanAmount) || 0,
      overrides: fp.acquisitionOverrides || {}
    });

    var financing = FinHold.buildFinancingCosts(Object.assign({}, fin, { holdingMonths: holdingMonths }));
    var holding = FinHold.buildHoldingCosts(Object.assign({}, fp.holding || {}, { holdingMonths: holdingMonths }));

    var totalInvestment =
      purchase +
      acq.totalAcquisitionCosts.expected +
      vat.renovationCashInclVat +
      financing.totalFinancingCosts.expected +
      holding.totalHoldingCosts.expected;

    return {
      purchase: round50(purchase),
      acquisition: acq,
      vat: vat,
      renovationCash: vat.renovationCashInclVat,
      financing: financing,
      holding: holding,
      totalInvestment: round50(totalInvestment),
      holdingMonths: holdingMonths,
      accountingConvention: {
        totalInvestmentIncludes: [
          'purchasePrice',
          'acquisitionCosts',
          'renovationCashInclResolvedVat',
          'financingCosts',
          'holdingCosts'
        ],
        sellingCosts: 'deducted_from_gross_resale_not_in_total_investment',
        profitTax: 'not_modelled'
      }
    };
  }

  function metricsForResale(stack, grossResale, sellingOpts) {
    var np = Selling.netProceeds(grossResale, sellingOpts);
    var profit = np.net - stack.totalInvestment;
    var margin = np.net > 0 ? (profit / np.net) * 100 : null;
    var roi = stack.totalInvestment > 0 ? (profit / stack.totalInvestment) * 100 : null;
    return {
      grossResale: np.gross,
      sellingCosts: np.selling,
      netResaleProceeds: np.net,
      potentialProfit: round50(profit),
      profitMarginPercent: margin == null ? null : round1(margin),
      projectRoiPercent: roi == null ? null : round1(roi),
      sellingDetail: np.detail,
      definitions: {
        profit: 'potentiële projectwinst vóór eventuele belasting op de gerealiseerde winst/meerwaarde = netto verkoopopbrengst − totale projectinvestering',
        margin: 'projectmarge = potentiële projectwinst / netto verkoopopbrengst',
        roi: 'project-ROI = potentiële projectwinst / totale projectinvestering (niet equity-ROI, niet cash-on-cash)',
        totalInvestment: 'totale projectinvestering = aankoop + aankoopkosten + renovatiecash(incl. btw-laag) + financieringskosten + holdingkosten',
        netResale: 'netto verkoopopbrengst = bruto verkoop (jouw aanname) − verkoopkosten'
      }
    };
  }

  function breakEvenGross(stack, sellingOpts) {
    return Selling.grossForTargetNet(stack.totalInvestment, sellingOpts);
  }

  /**
   * Max purchase such that project ROI >= target at given expected resale.
   * Solves iteratively because acquisition costs depend on purchase price.
   * TI(P) = P + acq(P) + fixedOther
   * profit = netResale - TI
   * ROI = profit/TI = target  =>  netResale = TI*(1+target)  => TI = netResale/(1+target)
   */
  function solveMaxPurchase(opts) {
    var targetRoi = (Number(opts.targetRoiPercent) || 0) / 100;
    var grossResale = Number(opts.grossResale) || 0;
    var sellingOpts = opts.sellingOpts || {};
    var np = Selling.netProceeds(grossResale, sellingOpts);
    var targetTI = np.net / (1 + targetRoi);
    if (!isFinite(targetTI) || targetTI <= 0) {
      return { value: null, impossible: true, reason: 'target_ti_invalid' };
    }

    var fixedOther = opts.fixedOther || 0;
    var fp = opts.financeProfile || {};
    var fin = fp.financing || {};
    var financed = fin.mode === 'mortgage' || fin.mode === 'mixed';

    function tiAt(p) {
      var acq = Acq.buildAcquisitionCosts({
        purchasePrice: p,
        region: fp.region,
        province: fp.province,
        buyerType: fp.buyerType || 'natural',
        ownerOccupierOnlyHome: !!fp.ownerOccupierOnlyHome,
        financed: financed,
        loanAmount: Number(fin.loanAmount) || 0,
        overrides: fp.acquisitionOverrides || {}
      });
      return {
        ti: p + acq.totalAcquisitionCosts.expected + fixedOther,
        acq: acq.totalAcquisitionCosts.expected
      };
    }

    var minCheck = tiAt(1000);
    if (minCheck.ti > targetTI) {
      return {
        value: null,
        impossible: true,
        reason: 'target_return_unreachable',
        targetTI: round50(targetTI),
        minTI: round50(minCheck.ti)
      };
    }

    var lo = 1000;
    var hi = Math.max(lo + 1000, targetTI);
    var best = null;
    for (var i = 0; i < 56; i++) {
      var mid = (lo + hi) / 2;
      var cur = tiAt(mid);
      if (cur.ti > targetTI) {
        hi = mid;
      } else {
        best = mid;
        lo = mid;
      }
    }
    return {
      value: best == null ? null : round50(best),
      impossible: best == null,
      reason: best == null ? 'no_convergence' : null,
      targetTI: round50(targetTI)
    };
  }

  function buildConfidence(stack, metrics, fp, renovationInput) {
    var costBits = [];
    var resaleBits = ['USER_ASSUMPTION'];

    if ((renovationInput && renovationInput.confidence) === 'HIGH') costBits.push('HIGH');
    else if ((renovationInput && renovationInput.confidence) === 'MEDIUM') costBits.push('MEDIUM');
    else costBits.push('LOW');

    if (stack.acquisition.registrationDuties.confidence === 'high') costBits.push('HIGH');
    else costBits.push('MEDIUM');

    if (stack.vat.confidence === 'high') costBits.push('HIGH');
    else if (stack.vat.confidence === 'medium') costBits.push('MEDIUM');
    else costBits.push('LOW');

    if ((fp.financing || {}).mode === 'unknown') costBits.push('LOW');
    if ((fp.selling || {}).mode === 'unknown') costBits.push('LOW');
    if ((fp.selling || {}).mode === 'agent' && (fp.selling || {}).agentRateExVat == null) {
      costBits.push('LOW'); /* market default commission not a quote */
    }
    if ((fp.holding || {}).monthlyTotal == null && !(fp.holding || {}).explicitZero) {
      costBits.push('LOW');
    }
    if ((fp.vat || {}).mode === 'indicative_mixed' && !(fp.vat || {}).worksSixPercentConfirmed) {
      costBits.push('MEDIUM'); /* conservative 21% default — not HIGH */
    }

    function rank(list) {
      if (list.indexOf('LOW') !== -1) return 'LOW';
      if (list.indexOf('MEDIUM') !== -1) return 'MEDIUM';
      return 'HIGH';
    }

    var costConf = rank(costBits);
    var resaleConf = 'USER_ASSUMPTION_ONLY';
    var overall = costConf === 'HIGH' ? 'MEDIUM' : costConf;
    /* Never imply ELYAN verified resale */
    if (overall === 'HIGH') overall = 'MEDIUM';

    return {
      FINANCIAL_CONFIDENCE: overall,
      COST_MODEL_CONFIDENCE: costConf,
      RESALE_ASSUMPTION_CONFIDENCE: resaleConf,
      note: 'Resale values are user assumptions — overall confidence never certifies exit price.'
    };
  }

  function buildLedger(stack, metrics, fp, resaleNorm) {
    var items = [];
    items.push(ledgerItem('purchase', 'Aankoopprijs', stack.purchase, 'USER_ASSUMPTION', 'high', null, true, 'Door gebruiker opgegeven.'));
    items.push(ledgerItem(
      'registration',
      stack.acquisition.registrationDuties.label,
      stack.acquisition.registrationDuties.expected,
      'OFFICIAL_REGULATION',
      'high',
      stack.acquisition.registrationDuties.source,
      true,
      stack.acquisition.registrationDuties.explanation
    ));
    items.push(ledgerItem(
      'notary',
      'Notariskosten',
      stack.acquisition.notaryCosts.expected,
      'MODEL_ASSUMPTION',
      'medium',
      null,
      true,
      stack.acquisition.notaryCosts.explanation
    ));
    items.push(ledgerItem(
      'renovation_cash',
      'Renovatie cash (incl. opgeloste btw-laag)',
      stack.renovationCash,
      'CALC2_RENOVATION_ENGINE',
      (fp && fp._renoConf) || 'medium',
      null,
      false,
      'Uitsluitend investorReadiness.renovationInput + VAT finance layer.'
    ));
    items.push(ledgerItem(
      'vat_layer',
      'BTW-laag presentatie',
      stack.vat.totalVat,
      stack.vat.sourceType,
      stack.vat.confidence,
      null,
      true,
      stack.vat.explanation + ' Presentatie: ' + stack.vat.presentation
    ));
    items.push(ledgerItem(
      'financing',
      'Financieringskosten',
      stack.financing.totalFinancingCosts.expected,
      stack.financing.interestDuringHold.sourceType,
      stack.financing.interestDuringHold.confidence,
      null,
      true,
      stack.financing.interestDuringHold.explanation
    ));
    items.push(ledgerItem(
      'holding',
      'Holdingkosten',
      stack.holding.totalHoldingCosts.expected,
      stack.holding.monthlyHolding.sourceType,
      stack.holding.monthlyHolding.confidence,
      null,
      true,
      stack.holding.monthlyHolding.explanation
    ));
    items.push(ledgerItem(
      'selling',
      'Verkoopkosten',
      metrics.sellingCosts,
      metrics.sellingDetail.agentCommission.sourceType,
      metrics.sellingDetail.agentCommission.confidence,
      metrics.sellingDetail.agentCommission.source,
      true,
      metrics.sellingDetail.accountingNote || metrics.sellingDetail.agentCommission.explanation
    ));
    items.push(ledgerItem(
      'resale_expected',
      'Verwachte verkoopwaarde',
      resaleNorm.expected,
      resaleNorm.spreadSource,
      'USER_ASSUMPTION',
      null,
      true,
      resaleNorm.note
    ));
    items.push(ledgerItem(
      'profit_tax',
      'Belasting op meerwaarde/winst',
      null,
      'UNRESOLVED',
      'low',
      null,
      false,
      'Eventuele belasting op de gerealiseerde meerwaarde/winst is niet automatisch opgenomen.'
    ));
    return items;
  }

  function sensitivity(stack, metrics, sellingOpts, resaleExpected, fp) {
    var baseProfit = metrics.potentialProfit;
    var baseRoi = metrics.projectRoiPercent;
    var out = [];

    function pack(id, label, m, stackAlt) {
      return {
        id: id,
        label: label,
        profitDelta: round50(m.potentialProfit - baseProfit),
        potentialProfit: m.potentialProfit,
        projectRoiPercent: m.projectRoiPercent,
        roiDelta: m.projectRoiPercent == null || baseRoi == null
          ? null
          : round1(m.projectRoiPercent - baseRoi),
        totalInvestment: stackAlt ? stackAlt.totalInvestment : stack.totalInvestment
      };
    }

    var renoUp = Object.assign({}, stack, {
      renovationCash: round50(stack.renovationCash * 1.1),
      totalInvestment: round50(
        stack.purchase +
        stack.acquisition.totalAcquisitionCosts.expected +
        stack.renovationCash * 1.1 +
        stack.financing.totalFinancingCosts.expected +
        stack.holding.totalHoldingCosts.expected
      )
    });
    out.push(pack('reno_plus_10', 'Als renovatiekosten 10% hoger uitvallen',
      metricsForResale(renoUp, resaleExpected, sellingOpts), renoUp));

    out.push(pack('resale_minus_5', 'Als jouw verwachte verkoopwaarde 5% lager uitvalt',
      metricsForResale(stack, round50(resaleExpected * 0.95), sellingOpts), stack));

    var monthly = stack.holding.monthlyHolding.expected || 0;
    var finMonthlyInterest = 0;
    var fin = (fp && fp.financing) || {};
    if ((fin.mode === 'mortgage' || fin.mode === 'mixed') && fin.loanAmount > 0 && fin.interestRate != null) {
      finMonthlyInterest = (Number(fin.loanAmount) * (Number(fin.interestRate) / 100)) / 12;
    }
    var holdExtraAmt = (monthly + finMonthlyInterest) * 3;
    var holdExtra = Object.assign({}, stack, {
      totalInvestment: round50(stack.totalInvestment + holdExtraAmt)
    });
    out.push(pack('hold_plus_3m',
      'Als holdingperiode 3 maanden langer duurt (holding + geschatte rente)',
      metricsForResale(holdExtra, resaleExpected, sellingOpts), holdExtra));

    /* Combined downside stress */
    var combined = Object.assign({}, stack, {
      renovationCash: round50(stack.renovationCash * 1.1),
      totalInvestment: round50(
        stack.purchase +
        stack.acquisition.totalAcquisitionCosts.expected +
        stack.renovationCash * 1.1 +
        stack.financing.totalFinancingCosts.expected +
        stack.holding.totalHoldingCosts.expected +
        holdExtraAmt
      )
    });
    out.push(pack(
      'combined_downside',
      'Gecombineerde stress: renovatie +10% én verkoop −5% én holding +3 maanden',
      metricsForResale(combined, round50(resaleExpected * 0.95), sellingOpts),
      combined
    ));

    return out;
  }

  function analyse(project, financeProfile, calc2State) {
    calc2State = calc2State || {};
    financeProfile = financeProfile || emptyFinanceProfile();

    var ir = (project && project.investorReadiness) || {};
    if (!ir.allowed) {
      return {
        ran: false,
        blocked: true,
        status: 'BLOCKED_BY_INVESTOR_READINESS',
        reasons: ir.reasons || ['Renovatiebudget is nog niet klaar voor investeringsanalyse'],
        blockingItems: ir.blockingItems || [],
        disclaimer: 'Geen winst, ROI, break-even of max. aankoopprijs zolang renovatie-readiness geblokkeerd is.',
        version: 'calc2-phase5-investor-finance'
      };
    }

    var renovationInput = ir.renovationInput;
    if (!renovationInput) {
      return {
        ran: false,
        blocked: true,
        status: 'BLOCKED_NO_RENOVATION_INPUT',
        reasons: ['renovationInput ontbreekt'],
        version: 'calc2-phase5-investor-finance'
      };
    }

    var fp = Object.assign(emptyFinanceProfile(), financeProfile);
    if (!fp.region && calc2State.propertyProfile) {
      fp.province = calc2State.propertyProfile.province;
      fp.region = Acq.regionFromProvince(calc2State.propertyProfile.province);
    }
    if (fp.purchasePrice == null && calc2State.propertyProfile && calc2State.propertyProfile.intendedPurchasePrice) {
      fp.purchasePrice = calc2State.propertyProfile.intendedPurchasePrice;
    }

    var errors = validateInputs(fp);
    if (errors.length) {
      return {
        ran: false,
        blocked: true,
        status: 'INSUFFICIENT_INFORMATION',
        reasons: errors,
        disclaimer: 'Vul aankoopprijs en minstens één verkoopscenario in.',
        version: 'calc2-phase5-investor-finance'
      };
    }

    var purchase = Number(fp.purchasePrice);
    var resaleNorm = normalizeResale(fp);
    var sellingOpts = fp.selling || {};

    var stackExpected = computeStack({
      purchase: purchase,
      renovationInput: renovationInput,
      financeProfile: fp,
      scenario: 'expected',
      renovationBand: 'expected'
    });
    var stackCons = computeStack({
      purchase: purchase,
      renovationInput: renovationInput,
      financeProfile: fp,
      scenario: 'conservative',
      renovationBand: 'high'
    });
    var stackStrong = computeStack({
      purchase: purchase,
      renovationInput: renovationInput,
      financeProfile: fp,
      scenario: 'strong',
      renovationBand: 'low'
    });

    var mExp = metricsForResale(stackExpected, resaleNorm.expected, sellingOpts);
    var mCons = metricsForResale(stackCons, resaleNorm.conservative, sellingOpts);
    var mStrong = metricsForResale(stackStrong, resaleNorm.strong, sellingOpts);

    var be = breakEvenGross(stackExpected, sellingOpts);
    var fixedOther =
      stackExpected.renovationCash +
      stackExpected.financing.totalFinancingCosts.expected +
      stackExpected.holding.totalHoldingCosts.expected;

    var maxSolve = solveMaxPurchase({
      targetRoiPercent: fp.targetRoiPercent,
      grossResale: resaleNorm.expected,
      sellingOpts: sellingOpts,
      fixedOther: fixedOther,
      financeProfile: fp
    });
    var maxPurchase = maxSolve && maxSolve.value != null ? maxSolve.value : null;

    var offerHeadroom = null;
    if (maxPurchase != null && purchase > 0) {
      offerHeadroom = {
        askingOrIntendedPurchase: round50(purchase),
        maxPurchaseForTarget: maxPurchase,
        difference: round50(purchase - maxPurchase),
        targetRoiPercent: fp.targetRoiPercent,
        interpretation:
          'Voor dit doelrendement ligt je indicatieve doelprijs ongeveer ' +
          fmtAbs(purchase - maxPurchase) +
          (purchase > maxPurchase ? ' onder' : ' boven') +
          ' de huidige aankoopprijs. Dit is geen aankoopadvies.'
      };
    }

    var conf = buildConfidence(stackExpected, mExp, fp, renovationInput);
    var status = decisionStatus(mExp.potentialProfit, mExp.profitMarginPercent, false);

    var moneyMap = {
      aankoop: stackExpected.purchase,
      aankoopkosten: stackExpected.acquisition.totalAcquisitionCosts.expected,
      renovatieExVatComponents:
        (Number(renovationInput.worksExpected) || 0) +
        (Number(renovationInput.softCostsExpected) || 0) +
        (Number(renovationInput.procurementCostsExpected) || 0) +
        (Number(renovationInput.reserveExpected) || 0),
      btw: stackExpected.vat.totalVat,
      financiering: stackExpected.financing.totalFinancingCosts.expected,
      holding: stackExpected.holding.totalHoldingCosts.expected,
      verkoopkosten: mExp.sellingCosts
    };

    return {
      ran: true,
      blocked: false,
      status: status,
      statusLabel: decisionLabel(status),
      disclaimer:
        'Indicatieve scenariomodellering volgens jouw aannames — geen gegarandeerde winst, ROI of verkoopwaarde. ' +
        'Geen beleggingsadvies. Potentiële projectwinst is vóór eventuele belasting op de gerealiseerde winst/meerwaarde. ' +
        'Door jou verwachte verkoopwaarde = jouw aanname (geen geautomatiseerde waardering).',
      accountingConvention: stackExpected.accountingConvention,
      region: stackExpected.acquisition.region,
      purchasePrice: stackExpected.purchase,
      totalInvestment: stackExpected.totalInvestment,
      potentialProfit: mExp.potentialProfit,
      profitMarginPercent: mExp.profitMarginPercent,
      projectRoiPercent: mExp.projectRoiPercent,
      breakEvenResalePrice: be,
      breakEvenNote:
        'Break-even verkoopprijs: onder deze bruto verkoopprijs maakt het scenario verlies vóór eventuele belastingen die niet gemodelleerd zijn.',
      maxPurchasePrice: maxPurchase,
      maxPurchaseSolve: maxSolve,
      maxPurchaseNote: maxPurchase != null
        ? ('Maximale aankoopprijs zodat project-ROI ≈ ' + fp.targetRoiPercent +
          '% bij jouw verwachte verkoopwaarde (registratie/notaris herberekend per iteratie).')
        : ('Geen haalbare maximale aankoopprijs voor dit doelrendement met de huidige niet-aankoopkosten' +
          (maxSolve && maxSolve.reason ? ' (' + maxSolve.reason + ')' : '') + '.'),
      offerHeadroom: offerHeadroom,
      vatPresentation: stackExpected.vat.presentation,
      scenarios: {
        conservative: {
          id: 'downside',
          label: 'Nadeel (downside)',
          changes: 'Hogere renovatieband + btw-werken 21% + langere holding + conservatieve verkoop (jouw aanname)',
          optimisticCombo: false,
          totalInvestment: stackCons.totalInvestment,
          grossResale: mCons.grossResale,
          potentialProfit: mCons.potentialProfit,
          projectRoiPercent: mCons.projectRoiPercent,
          profitMarginPercent: mCons.profitMarginPercent
        },
        expected: {
          id: 'base',
          label: 'Basis (base)',
          changes: 'Expected renovatie + gekozen btw-model + basis holding + verwachte verkoop (jouw aanname)',
          optimisticCombo: false,
          totalInvestment: stackExpected.totalInvestment,
          grossResale: mExp.grossResale,
          potentialProfit: mExp.potentialProfit,
          projectRoiPercent: mExp.projectRoiPercent,
          profitMarginPercent: mExp.profitMarginPercent
        },
        strong: {
          id: 'upside',
          label: 'Optimistisch (upside)',
          changes: 'OPTIMISTISCHE COMBINATIE: lagere renovatieband + kortere holding + sterke verkoop — geen “waarschijnlijk” scenario',
          optimisticCombo: true,
          totalInvestment: stackStrong.totalInvestment,
          grossResale: mStrong.grossResale,
          potentialProfit: mStrong.potentialProfit,
          projectRoiPercent: mStrong.projectRoiPercent,
          profitMarginPercent: mStrong.profitMarginPercent
        }
      },
      moneyMap: moneyMap,
      stack: stackExpected,
      metrics: mExp,
      confidence: conf,
      assumptionLedger: buildLedger(stackExpected, mExp, fp, resaleNorm),
      sensitivity: sensitivity(stackExpected, mExp, sellingOpts, resaleNorm.expected, fp),
      resale: resaleNorm,
      renovationInputUsed: {
        low: renovationInput.low,
        expected: renovationInput.expected,
        high: renovationInput.high,
        confidence: renovationInput.confidence,
        vatStatus: renovationInput.vatStatus
      },
      definitions: mExp.definitions,
      version: 'calc2-phase5.5-financial-audit'
    };
  }

  function fmtAbs(n) {
    var v = Math.abs(round50(n));
    return '€' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* Test helpers exported */
  function __testInternals() {
    return {
      computeStack: computeStack,
      metricsForResale: metricsForResale,
      breakEvenGross: breakEvenGross,
      solveMaxPurchase: solveMaxPurchase,
      normalizeResale: normalizeResale,
      decisionStatus: decisionStatus,
      round50: round50
    };
  }

  return {
    emptyFinanceProfile: emptyFinanceProfile,
    analyse: analyse,
    __testInternals: __testInternals,
    Acq: Acq,
    Selling: Selling,
    Vat: Vat,
    FinHold: FinHold
  };
});
