(function () {
  const root = document.querySelector(".tool-steam-turbine");
  if (!root) return;

  const isSpanish = root.dataset.lang === "es";
  const labels = {
    warningsTitle: isSpanish ? "Revisa estos datos:" : "Check these inputs:",
    manualWarning: isSpanish ? "h1 debe ser mayor que h2'." : "h1 must be greater than h2'.",
    etaWarning: isSpanish ? "La eficiencia debe estar entre 0 y 1." : "Efficiency must be between 0 and 1.",
    rpmWarning: isSpanish ? "Las RPM deben ser positivas." : "RPM must be positive.",
    diameterWarning: isSpanish ? "El diametro debe ser positivo." : "Diameter must be positive.",
    lossWarning: isSpanish ? "Las perdidas mecanicas deben estar entre 0 y 50%." : "Mechanical losses must be between 0 and 50%.",
    alphaWarning: isSpanish ? "El angulo alpha debe estar entre 0 y 80 grados." : "Alpha angle should be between 0 and 80 degrees.",
    pressureWarning: isSpanish ? "P1 absoluta debe ser mayor que P2 absoluta para expansion." : "P1 absolute must be greater than P2 absolute for expansion.",
    targetWarning: isSpanish ? "La potencia objetivo debe ser positiva." : "Target power must be positive.",
    flowWarning: isSpanish ? "El flujo masico debe ser positivo." : "Mass flow must be positive.",
    state1: isSpanish ? "Estado 1" : "State 1",
    ideal: isSpanish ? "2' ideal" : "2' ideal",
    actual: isSpanish ? "2 real" : "2 actual",
    entropy: "s = entropy",
    enthalpy: "h = enthalpy",
    entropyEs: "s = entropia",
    enthalpyEs: "h = entalpia",
    idealDrop: isSpanish ? "Delta h ideal" : "Delta h ideal",
    actualDrop: isSpanish ? "Delta h real" : "Delta h actual"
  };

  const selectors = {
    p1: "p1",
    t1: "t1",
    p2: "p2",
    h1: "h1",
    h2s: "h2s",
    eta: "eta",
    mechanicalLossPercent: "mechanicalLoss",
    massFlow: "massFlow",
    targetPower: "targetPower",
    rpm: "rpm",
    diameter: "diameter",
    alpha: "alpha"
  };

  const P_ATM_PSI = 14.6959;
  const R_steam_kJkgK = 0.4615;
  const cp_steam_kJkgK = 2.08;
  const cp_BtuLbR = 0.497;

  function getElement(id) {
    return document.getElementById(id);
  }

  function readNumber(id) {
    const value = Number.parseFloat(getElement(id).value);
    return Number.isFinite(value) ? value : Number.NaN;
  }

  function readInputs() {
    const h2sSource = document.querySelector("input[name='h2sSource']:checked").value;
    const calculationMode = document.querySelector("input[name='calculationMode']:checked").value;

    return {
      p1: readNumber(selectors.p1),
      t1: readNumber(selectors.t1),
      p2: readNumber(selectors.p2),
      h1: readNumber(selectors.h1),
      h2s: readNumber(selectors.h2s),
      eta: readNumber(selectors.eta),
      mechanicalLossPercent: readNumber(selectors.mechanicalLossPercent),
      massFlow: readNumber(selectors.massFlow),
      targetPower: readNumber(selectors.targetPower),
      rpm: readNumber(selectors.rpm),
      diameter: readNumber(selectors.diameter),
      alpha: readNumber(selectors.alpha),
      h2sSource,
      calculationMode
    };
  }

  function estimateH2sIdealGas(inputs) {
    const P1_abs = inputs.p1 + P_ATM_PSI;
    const P2_abs = inputs.p2 + P_ATM_PSI;
    const T1_R = inputs.t1 + 459.67;
    const exponent = R_steam_kJkgK / cp_steam_kJkgK;
    const T2s_R = T1_R * Math.pow(P2_abs / P1_abs, exponent);
    const T2s_F = T2s_R - 459.67;
    const h2s_estimated = inputs.h1 + cp_BtuLbR * (T2s_R - T1_R);

    return {
      h2s: h2s_estimated,
      T2s_F,
      P1_abs,
      P2_abs
    };
  }

  function validateInputs(inputs) {
    const warnings = [];
    const P1_abs = inputs.p1 + P_ATM_PSI;
    const P2_abs = inputs.p2 + P_ATM_PSI;

    if (!(inputs.h1 > inputs.h2s)) warnings.push(labels.manualWarning);
    if (!(inputs.eta > 0 && inputs.eta <= 1)) warnings.push(labels.etaWarning);
    if (!(inputs.rpm > 0)) warnings.push(labels.rpmWarning);
    if (!(inputs.diameter > 0)) warnings.push(labels.diameterWarning);
    if (!(inputs.mechanicalLossPercent >= 0 && inputs.mechanicalLossPercent <= 50)) warnings.push(labels.lossWarning);
    if (!(inputs.alpha >= 0 && inputs.alpha <= 80)) warnings.push(labels.alphaWarning);
    if (!(P1_abs > P2_abs)) warnings.push(labels.pressureWarning);
    if (inputs.calculationMode === "requiredFlow" && !(inputs.targetPower > 0)) warnings.push(labels.targetWarning);
    if (inputs.calculationMode === "knownFlow" && !(inputs.massFlow > 0)) warnings.push(labels.flowWarning);

    return warnings;
  }

  function calculateComparison(deltaH_ideal, rpm, alpha_deg, diameter_mm) {
    const D_ft = diameter_mm / 304.8;
    const U_ft_s = Math.PI * D_ft * rpm / 60;
    const alpha_rad = alpha_deg * Math.PI / 180;
    const deltaH_stage = Math.pow((2 * U_ft_s) / (223.8 * Math.cos(alpha_rad)), 2);
    const stageCount = deltaH_ideal / deltaH_stage;

    return {
      diameter_mm,
      U_ft_s,
      deltaH_stage,
      stageCount,
      roundedNearestStages: Math.round(stageCount)
    };
  }

  function calculateResults() {
    const inputs = readInputs();
    let estimated = null;

    if (inputs.h2sSource === "approximate") {
      estimated = estimateH2sIdealGas(inputs);
      inputs.h2s = estimated.h2s;
      getElement(selectors.h2s).value = formatNumber(estimated.h2s, 2);
    }

    const warnings = validateInputs(inputs);
    const deltaH_ideal = inputs.h1 - inputs.h2s;
    const deltaH_actual = inputs.eta * deltaH_ideal;
    const h2_actual = inputs.h1 - deltaH_actual;
    const mechanicalLossFraction = inputs.mechanicalLossPercent / 100;
    let flowPathPower_kW = null;
    let shaftPower_kW = null;
    let requiredMassFlow_lbm_hr = null;

    if (inputs.calculationMode === "knownFlow") {
      flowPathPower_kW = inputs.massFlow * deltaH_actual / 3413;
      shaftPower_kW = flowPathPower_kW * (1 - mechanicalLossFraction);
    } else {
      requiredMassFlow_lbm_hr = 3413 * inputs.targetPower / ((1 - mechanicalLossFraction) * deltaH_actual);
      flowPathPower_kW = requiredMassFlow_lbm_hr * deltaH_actual / 3413;
      shaftPower_kW = inputs.targetPower;
    }

    const D_ft = inputs.diameter / 304.8;
    const U_ft_s = Math.PI * D_ft * inputs.rpm / 60;
    const alpha_rad = inputs.alpha * Math.PI / 180;
    const deltaH_stage = Math.pow((2 * U_ft_s) / (223.8 * Math.cos(alpha_rad)), 2);
    const stageCount = deltaH_ideal / deltaH_stage;
    const roundedNearestStages = Math.round(stageCount);
    const roundedUpStages = Math.ceil(stageCount);
    const specificWork_kJ_kg = deltaH_actual * 2.326;

    return {
      inputs,
      warnings,
      estimated,
      deltaH_ideal,
      deltaH_actual,
      h2_actual,
      flowPathPower_kW,
      shaftPower_kW,
      requiredMassFlow_lbm_hr,
      U_ft_s,
      deltaH_stage,
      stageCount,
      roundedNearestStages,
      roundedUpStages,
      specificWork_Btu_lbm: deltaH_actual,
      specificWork_kJ_kg,
      comparison: [
        calculateComparison(deltaH_ideal, inputs.rpm, inputs.alpha, 700),
        calculateComparison(deltaH_ideal, inputs.rpm, inputs.alpha, 800)
      ]
    };
  }

  function updateResultsUI(results) {
    const status = getElement("toolWarnings");
    const warningList = getElement("warningList");
    if (results.warnings.length) {
      status.hidden = false;
      warningList.innerHTML = results.warnings.map((warning) => `<li>${warning}</li>`).join("");
    } else {
      status.hidden = true;
      warningList.innerHTML = "";
    }

    document.querySelectorAll("[data-result]").forEach((node) => {
      const key = node.dataset.result;
      const value = results[key] ?? results.inputs[key];
      const decimals = key.includes("rounded") ? 0 : 2;
      node.textContent = Number.isFinite(value) ? formatNumber(value, decimals) : "--";
    });

    const t2sRow = document.querySelector("[data-optional='t2s']");
    if (t2sRow) {
      t2sRow.hidden = results.inputs.h2sSource !== "approximate";
      const t2sValue = t2sRow.querySelector("[data-result='T2s_F']");
      if (t2sValue) t2sValue.textContent = results.estimated ? formatNumber(results.estimated.T2s_F, 2) : "--";
    }

    const requiredFlowCard = document.querySelector("[data-mode-result='requiredFlow']");
    const powerCard = document.querySelector("[data-mode-result='knownFlow']");
    if (requiredFlowCard) requiredFlowCard.hidden = results.inputs.calculationMode !== "requiredFlow";
    if (powerCard) powerCard.hidden = results.inputs.calculationMode !== "knownFlow";
  }

  function drawMollierChart(results) {
    const svg = getElement("mollierChart");
    if (!svg) return;

    const width = 640;
    const height = 430;
    const chart = { left: 82, right: 590, top: 42, bottom: 360 };
    const hValues = [results.inputs.h1, results.inputs.h2s, results.h2_actual].filter(Number.isFinite);
    const hMax = Math.max(...hValues) + 45;
    const hMin = Math.min(...hValues) - 45;
    const yForH = (h) => chart.bottom - ((h - hMin) / (hMax - hMin)) * (chart.bottom - chart.top);
    const state1 = { x: 345, y: yForH(results.inputs.h1) };
    const ideal = { x: 345, y: yForH(results.inputs.h2s) };
    const actualShift = 34 + (1 - results.inputs.eta) * 190;
    const actual = { x: ideal.x + actualShift, y: yForH(results.h2_actual) };
    const entropyLabel = isSpanish ? labels.entropyEs : labels.entropy;
    const enthalpyLabel = isSpanish ? labels.enthalpyEs : labels.enthalpy;

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = `
      <defs>
        <marker id="arrow-teal" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="rgba(234,240,255,.78)"></path>
        </marker>
        <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#ff5d73"></path>
        </marker>
        <marker id="arrow-amber" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#f5b642"></path>
        </marker>
      </defs>
      <path class="axis" d="M${chart.left} ${chart.bottom} H${chart.right}" marker-end="url(#arrow-teal)"></path>
      <path class="axis" d="M${chart.left} ${chart.bottom} V${chart.top}" marker-end="url(#arrow-teal)"></path>
      <text x="${chart.right - 95}" y="${chart.bottom + 34}">${entropyLabel}</text>
      <text x="14" y="${chart.top + 26}" transform="rotate(-90 14 ${chart.top + 26})">${enthalpyLabel}</text>
      <path class="dome" d="M170 332 C198 228 246 156 306 126 C371 159 419 230 449 332 Z"></path>
      <text x="220" y="340" fill="rgba(120,231,255,.78)">saturation dome</text>
      <path class="ideal" d="M${state1.x} ${state1.y} L${ideal.x} ${ideal.y}"></path>
      <path class="actual" d="M${state1.x} ${state1.y} C${state1.x + 48} ${state1.y + 58}, ${actual.x - 70} ${actual.y - 22}, ${actual.x} ${actual.y}"></path>
      <path class="drop-ideal" d="M${state1.x - 56} ${state1.y} V${ideal.y}" marker-end="url(#arrow-red)"></path>
      <path class="drop-actual" d="M${actual.x + 42} ${state1.y} V${actual.y}" marker-end="url(#arrow-amber)"></path>
      <circle class="state" cx="${state1.x}" cy="${state1.y}" r="8" fill="#78e7ff"></circle>
      <circle class="state" cx="${ideal.x}" cy="${ideal.y}" r="8" fill="#ff5d73"></circle>
      <circle class="state" cx="${actual.x}" cy="${actual.y}" r="8" fill="#f5b642"></circle>
      <text x="${state1.x + 14}" y="${state1.y - 10}">${labels.state1}</text>
      <text x="${ideal.x + 14}" y="${ideal.y + 24}">${labels.ideal}</text>
      <text x="${actual.x + 14}" y="${actual.y + 6}">${labels.actual}</text>
      <text x="${state1.x - 134}" y="${(state1.y + ideal.y) / 2}">${labels.idealDrop}</text>
      <text x="${actual.x + 54}" y="${(state1.y + actual.y) / 2}">${labels.actualDrop}</text>
    `;
  }

  function updateComparisonTable(results) {
    const body = getElement("comparisonBody");
    if (!body) return;

    body.innerHTML = results.comparison.map((row) => `
      <tr>
        <td>${formatNumber(row.diameter_mm, 0)} mm</td>
        <td>${formatNumber(row.U_ft_s, 2)} ft/s</td>
        <td>${formatNumber(row.deltaH_stage, 2)} Btu/lbm</td>
        <td>${formatNumber(row.stageCount, 2)}</td>
        <td>${formatNumber(row.roundedNearestStages, 0)}</td>
      </tr>
    `).join("");
  }

  function formatNumber(value, decimals) {
    if (!Number.isFinite(value)) return "--";
    return new Intl.NumberFormat(isSpanish ? "es-MX" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  function syncModeState() {
    const inputs = readInputs();
    const h2sInput = getElement(selectors.h2s);
    h2sInput.readOnly = inputs.h2sSource === "approximate";
  }

  function updateAll() {
    syncModeState();
    const results = calculateResults();
    updateResultsUI(results);
    drawMollierChart(results);
    updateComparisonTable(results);
  }

  root.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", updateAll);
    input.addEventListener("change", updateAll);
  });

  const recalculate = getElement("recalculateButton");
  if (recalculate) recalculate.addEventListener("click", updateAll);

  // Future V2: replace this ideal-gas approximation with a local IAPWS-IF97 or precomputed steam_properties_grid.json interpolation module.
  // IAPWS-IF97 uses absolute pressure, not gauge pressure.
  updateAll();
})();
