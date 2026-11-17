/* 3.22.11: ספריית החישוב של המחשבונים המתקדמים – הקוד המקורי (src/lib/calculators/*.ts) אחרי הידור ל-JavaScript בלבד (esbuild), בלי שום שינוי בנוסחאות, בטבלאות או בספים.
   לא לערוך כאן ידנית: לעדכן את קובצי המקור ולהדר מחדש. 19 הבדיקות המקוריות עוברות על הקובץ הזה בדיוק. */
var moeqsProLib = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    BREAKER_LABELS: () => BREAKER_LABELS,
    BREAKER_SIZES: () => BREAKER_SIZES,
    BURIED_SPACINGS: () => BURIED_SPACINGS,
    CURVE_MULTIPLIERS: () => CURVE_MULTIPLIERS,
    C_MANUFACTURER_MULTIPLIER: () => C_MANUFACTURER_MULTIPLIER,
    DEFAULT_TARIFF: () => DEFAULT_TARIFF,
    DEVICE_PRESETS: () => DEVICE_PRESETS,
    DUCT_SPACINGS: () => DUCT_SPACINGS,
    EV_PRESETS: () => EV_PRESETS,
    GROUP_COUNTS: () => GROUP_COUNTS,
    INSTALL_METHODS: () => INSTALL_METHODS,
    INSULATION_LABELS: () => INSULATION_LABELS,
    IZ_TABLES: () => IZ_TABLES,
    K_AIR_TEMP: () => K_AIR_TEMP,
    K_BURIED: () => K_BURIED,
    K_DUCTS_MULTI_CORE: () => K_DUCTS_MULTI_CORE,
    K_DUCTS_SINGLE_CORE: () => K_DUCTS_SINGLE_CORE,
    K_GROUND_TEMP: () => K_GROUND_TEMP,
    K_GROUPING: () => K_GROUPING,
    K_SOIL_RESISTIVITY: () => K_SOIL_RESISTIVITY,
    MATERIAL_LABELS: () => MATERIAL_LABELS,
    MCB_SIZES: () => MCB_SIZES,
    PANEL_LABELS: () => PANEL_LABELS,
    SECTIONS: () => SECTIONS,
    TARIFF_DATE: () => TARIFF_DATE,
    U0: () => U0,
    VOLTAGES: () => VOLTAGES,
    cableLabel: () => cableLabel,
    calcAllSections: () => calcAllSections,
    calcBreakerCable: () => calcBreakerCable,
    calcEnergyCost: () => calcEnergyCost,
    calcVoltageDrop: () => calcVoltageDrop,
    checkAmpacity: () => checkAmpacity,
    checkLoop: () => checkLoop,
    correctionFactors: () => correctionFactors,
    currentFromPower: () => currentFromPower,
    getMethod: () => getMethod,
    isThreePhase: () => isThreePhase,
    lookupIz: () => lookupIz,
    maxLoopImpedance: () => maxLoopImpedance,
    mvPerAmpMeter: () => mvPerAmpMeter,
    recommendSection: () => recommendSection,
    requiredIz: () => requiredIz,
    sectionsFor: () => sectionsFor,
    tableId: () => tableId,
    tripCurrent: () => tripCurrent,
    trippingCurrentFactor: () => trippingCurrentFactor
  });

  // ../pkg/קוד/src/lib/calculators/fault-loop.ts
  var U0 = 230;
  var CURVE_MULTIPLIERS = { B: 5, C: 10, D: 20, K: 14, Z: 3 };
  var C_MANUFACTURER_MULTIPLIER = 6.6;
  var MCB_SIZES = [6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125];
  var PANEL_LABELS = {
    class1: { title: "סוג I – לוח מתכת", breakerQuestion: 'גודל המא"ז הגדול ביותר בלוח (הראשי)' },
    class2: { title: "סוג II – לוח פלסטיק", breakerQuestion: 'גודל המא"ז הגדול ביותר בלוח, בלי הראשי' }
  };
  var tripCurrent = (inAmps, k) => k * inAmps;
  var maxLoopImpedance = (inAmps, k, u0 = U0) => u0 / (k * inAmps);
  function checkLoop(inAmps, k, measured) {
    const maxZ = maxLoopImpedance(inAmps, k);
    return { maxZ, ia: tripCurrent(inAmps, k), measuredOk: measured === null ? null : measured <= maxZ };
  }

  // ../pkg/קוד/src/lib/calculators/voltage-drop.ts
  var VOLTAGES = [230, 400, 690];
  var SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
  var MATERIAL_LABELS = { copper: "נחושת", aluminum: "אלומיניום" };
  var INSULATION_LABELS = { pvc: "PVC", xlpe: "XLPE" };
  var RHO1 = { copper: 0.0225, aluminum: 0.036 };
  var LAMBDA = 8e-5;
  var AMPACITY_RULE = [
    { maxAmps: 10, minSection: 1.5 },
    { maxAmps: 16, minSection: 2.5 },
    { maxAmps: 20, minSection: 4 }
  ];
  var isThreePhase = (v) => v !== 230;
  function currentFromPower(kw, voltage, cosPhi) {
    const watts = kw * 1e3;
    return isThreePhase(voltage) ? watts / (Math.sqrt(3) * voltage * cosPhi) : watts / (voltage * cosPhi);
  }
  function mvPerAmpMeter(section, material, voltage, cosPhi) {
    const b = isThreePhase(voltage) ? 1 : 2;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const ohmPerM = b * (RHO1[material] / section * cosPhi + LAMBDA * sinPhi);
    return (isThreePhase(voltage) ? ohmPerM * Math.sqrt(3) : ohmPerM) * 1e3;
  }
  function checkAmpacity(ampsPerCable, section) {
    const row = AMPACITY_RULE.find((r) => ampsPerCable <= r.maxAmps);
    if (!row) return { status: "unknown" };
    return section >= row.minSection ? { status: "ok", minSection: row.minSection } : { status: "too_small", minSection: row.minSection };
  }
  function calcVoltageDrop(i) {
    const mvPerAm = mvPerAmpMeter(i.section, i.material, i.voltage, i.cosPhi);
    const dropV = mvPerAm / 1e3 * i.amps * i.lengthM / i.parallel;
    const allowedV = i.voltage * i.maxDropPct / 100;
    const dropPct = dropV / i.voltage * 100;
    const dropOk = dropV <= allowedV;
    const ampacity = checkAmpacity(i.amps / i.parallel, i.section);
    return { mvPerAm, dropV, dropPct, allowedV, dropOk, ampacity, ok: dropOk && ampacity.status !== "too_small" };
  }
  function calcAllSections(i) {
    return SECTIONS.map((section) => __spreadValues({ section }, calcVoltageDrop(__spreadProps(__spreadValues({}, i), { section }))));
  }
  function recommendSection(i) {
    var _a, _b;
    return (_b = (_a = calcAllSections(i).find((r) => r.ok)) == null ? void 0 : _a.section) != null ? _b : null;
  }
  function cableLabel(voltage, section, parallel) {
    const cores = isThreePhase(voltage) ? 5 : 3;
    const one = `${cores}×${section}`;
    return parallel > 1 ? `${parallel}×(${one})` : one;
  }
  var EV_PRESETS = [
    { label: "3.7kW חד-פאזי", kw: 3.7, voltage: 230 },
    { label: "7.4kW חד-פאזי", kw: 7.4, voltage: 230 },
    { label: "11kW תלת-פאזי", kw: 11, voltage: 400 },
    { label: "22kW תלת-פאזי", kw: 22, voltage: 400 }
  ];

  // ../pkg/קוד/src/lib/calculators/ampacity-tables.ts
  var IZ_TABLES = {
    "70.1": [
      [1.5, 14, 13, null, null],
      [2.5, 18, 17, null, null],
      [4, 24, 23, null, null],
      [6, 32, 29, 24, 23],
      [10, 43, 39, 34, 30],
      [16, 57, 53, 45, 40],
      [25, 75, 69, 59, 54],
      [35, 93, 84, 72, 66],
      [50, 112, 102, 87, 79],
      [70, 142, 128, 111, 101],
      [95, 171, 154, 133, 121],
      [120, 197, 177, 154, 140],
      [150, 226, 203, 178, 160],
      [185, 257, 230, 202, 182],
      [240, 302, 269, 237, 213],
      [300, 345, 308, 272, 245]
    ],
    "70.2": [
      [1.5, 13, 12, null, null],
      [2.5, 17, 16, null, null],
      [4, 24, 22, null, null],
      [6, 30, 27, 24, 22],
      [10, 40, 37, 31, 29],
      [16, 54, 49, 41, 39],
      [25, 71, 64, 55, 50],
      [35, 86, 78, 67, 61],
      [50, 103, 93, 81, 73],
      [70, 131, 118, 102, 92],
      [95, 157, 141, 122, 111],
      [120, 180, 162, 141, 127],
      [150, 206, 184, 162, 146],
      [185, 233, 210, 183, 165],
      [240, 274, 245, 215, 195],
      [300, 314, 280, 247, 223]
    ],
    "70.3": [
      [1.5, 16, 15, null, null],
      [2.5, 23, 20, null, null],
      [4, 30, 26, null, null],
      [6, 39, 34, 30, 26],
      [10, 54, 47, 41, 37],
      [16, 71, 64, 56, 50],
      [25, 95, 84, 74, 66],
      [35, 118, 103, 91, 81],
      [50, 142, 126, 111, 98],
      [70, 180, 161, 141, 125],
      [95, 218, 195, 170, 151],
      [120, 252, 225, 197, 175]
    ],
    "70.4": [
      [1.5, 16, 14, null, null],
      [2.5, 22, 19, null, null],
      [4, 28, 25, null, null],
      [6, 36, 32, 28, 25],
      [10, 49, 43, 39, 34],
      [16, 65, 58, 51, 45],
      [25, 85, 75, 67, 58],
      [35, 104, 93, 81, 72],
      [50, 125, 111, 98, 86],
      [70, 158, 140, 123, 109],
      [95, 189, 168, 148, 131],
      [120, 218, 194, 170, 150]
    ],
    "70.5": [
      [1.5, 18, 16, null, null],
      [2.5, 25, 23, null, null],
      [4, 34, 30, null, null],
      [6, 43, 39, 34, 30],
      [10, 59, 54, 46, 41],
      [16, 80, 71, 62, 55],
      [25, 105, 90, 78, 69],
      [35, 130, 112, 97, 85],
      [50, 158, 135, 118, 103],
      [70, 200, 173, 150, 132],
      [95, 243, 210, 183, 160],
      [120, 281, 243, 212, 185],
      [150, 323, 281, 245, 213],
      [185, 368, 321, 280, 243],
      [240, 433, 379, 331, 287],
      [300, 498, 436, 382, 330]
    ],
    "70.6": [
      [1.5, 20, 16, null, null],
      [2.5, 26, 21, null, null],
      [4, 34, 28, null, null],
      [6, 42, 35, 32, 27],
      [10, 56, 46, 43, 36],
      [16, 72, 60, 55, 46],
      [25, 93, 77, 71, 59],
      [35, 111, 92, 85, 71],
      [50, 132, 109, 101, 84],
      [70, 163, 134, 125, 104],
      [95, 192, 159, 148, 123],
      [120, 219, 181, 168, 140],
      [150, 247, 205, 190, 158],
      [185, 278, 230, 214, 178],
      [240, 321, 264, 247, 205],
      [300, 363, 299, 279, 231]
    ],
    "70.7": [
      [1.5, 21, 17, null, null],
      [2.5, 28, 24, null, null],
      [4, 38, 32, null, null],
      [6, 48, 40, 37, 31],
      [10, 66, 56, 51, 43],
      [16, 88, 75, 69, 57],
      [25, 112, 95, 84, 73],
      [35, 139, 118, 104, 90],
      [50, 169, 144, 127, 110],
      [70, 218, 184, 163, 141],
      [95, 265, 224, 197, 172],
      [120, 308, 259, 229, 199],
      [150, 356, 300, 265, 230],
      [185, 408, 342, 303, 263],
      [240, 483, 404, 257, 310],
      // בספר: אלומיניום חד-מופעי 257 (כנראה טעות דפוס של 357) – נשמר כפי שמודפס, שמרני
      [300, 557, 467, 413, 358]
    ],
    "70.8": [
      [25, 123, 103, 92, 79],
      [35, 152, 129, 115, 99],
      [50, 184, 157, 140, 120],
      [70, 236, 203, 180, 156],
      [95, 286, 248, 221, 191],
      [120, 331, 290, 257, 223],
      [150, 382, 335, 297, 258],
      [185, 435, 384, 341, 296],
      [240, 513, 456, 404, 353],
      [300, 591, 527, 467, 408],
      [400, 709, 617, 564, 494],
      [500, 816, 704, 652, 573],
      [630, 945, 804, 760, 668]
    ],
    "90.1": [
      [1.5, 18, 16, null, null],
      [2.5, 25, 22, null, null],
      [4, 34, 30, null, null],
      [6, 43, 38, 34, 31],
      [10, 59, 52, 46, 42],
      [16, 78, 70, 61, 56],
      [25, 102, 91, 81, 73],
      [35, 126, 112, 99, 90],
      [50, 152, 135, 120, 108],
      [70, 192, 172, 152, 136],
      [95, 231, 207, 183, 164],
      [120, 267, 239, 211, 189],
      [150, 305, 274, 243, 217],
      [185, 348, 311, 276, 246],
      [240, 407, 365, 324, 288],
      [300, 467, 418, 372, 330]
    ],
    "90.2": [
      [1.5, 18, 16, null, null],
      [2.5, 24, 21, null, null],
      [4, 32, 29, null, null],
      [6, 40, 36, 32, 30],
      [10, 55, 49, 43, 39],
      [16, 73, 65, 58, 53],
      [25, 95, 85, 75, 68],
      [35, 116, 105, 92, 84],
      [50, 139, 125, 110, 100],
      [70, 176, 157, 139, 126],
      [95, 211, 189, 168, 151],
      [120, 243, 218, 193, 173],
      [150, 278, 249, 221, 198],
      [185, 316, 283, 252, 224],
      [240, 371, 332, 295, 262],
      [300, 424, 380, 338, 300]
    ],
    "90.3": [
      [1.5, 22, 19, null, null],
      [2.5, 30, 27, null, null],
      [4, 40, 36, null, null],
      [6, 52, 46, 41, 36],
      [10, 72, 63, 57, 50],
      [16, 96, 84, 76, 68],
      [25, 128, 112, 101, 89],
      [35, 157, 138, 125, 111],
      [50, 190, 168, 151, 134],
      [70, 243, 213, 192, 172],
      [95, 294, 258, 232, 208],
      [120, 340, 300, 270, 241]
    ],
    "90.4": [
      [1.5, 21, 19, null, null],
      [2.5, 29, 25, null, null],
      [4, 38, 34, null, null],
      [6, 49, 42, 38, 34],
      [10, 66, 58, 52, 46],
      [16, 87, 77, 69, 61],
      [25, 114, 101, 90, 81],
      [35, 140, 123, 110, 99],
      [50, 168, 148, 132, 119],
      [70, 212, 186, 168, 150],
      [95, 254, 224, 202, 180],
      [120, 293, 257, 232, 207]
    ],
    "90.5": [
      [1.5, 23, 21, null, null],
      [2.5, 32, 29, null, null],
      [4, 43, 38, null, null],
      [6, 56, 50, null, null],
      [10, 77, 68, null, null],
      [16, 103, 92, null, null],
      [25, 132, 114, null, null],
      [35, 164, 141, null, null],
      [50, 201, 172, null, null],
      [70, 258, 220, null, null],
      [95, 315, 267, null, null],
      [120, 367, 309, null, null],
      [150, 423, 356, null, null],
      [185, 486, 407, null, null],
      [240, 575, 480, null, null],
      [300, 665, 553, null, null]
    ],
    "90.6": [
      [1.5, 24, 20, null, null],
      [2.5, 32, 27, null, null],
      [4, 41, 34, null, null],
      [6, 52, 43, 39, 33],
      [10, 68, 57, 52, 44],
      [16, 88, 73, 68, 57],
      [25, 113, 94, 86, 73],
      [35, 136, 113, 104, 87],
      [50, 161, 134, 123, 104],
      [70, 198, 166, 152, 128],
      [95, 234, 196, 179, 153],
      [120, 267, 223, 205, 173],
      [150, 301, 252, 232, 195],
      [185, 338, 283, 259, 219],
      [240, 390, 326, 299, 253],
      [300, 441, 368, 339, 286]
    ],
    "90.7": [
      [1.5, 25, 22, null, null],
      [2.5, 35, 31, null, null],
      [4, 47, 40, null, null],
      [6, 60, 52, 47, 40],
      [10, 83, 72, 64, 56],
      [16, 110, 96, 87, 74],
      [25, 143, 122, 104, 93],
      [35, 178, 152, 130, 115],
      [50, 216, 184, 157, 140],
      [70, 277, 236, 203, 180],
      [95, 338, 286, 247, 218],
      [120, 394, 332, 288, 252],
      [150, 454, 383, 332, 292],
      [185, 520, 438, 381, 333],
      [240, 615, 516, 451, 393],
      [300, 711, 596, 521, 452]
    ],
    "90.8": [
      [25, 155, 130, 116, 99],
      [35, 192, 162, 144, 124],
      [50, 232, 199, 177, 153],
      [70, 298, 257, 228, 198],
      [95, 362, 315, 277, 243],
      [120, 420, 368, 324, 284],
      [150, 484, 426, 373, 329],
      [185, 552, 490, 429, 379],
      [240, 652, 583, 509, 452],
      [300, 752, 675, 588, 525],
      [400, 902, 790, 710, 636],
      [500, 1040, 908, 822, 739],
      [630, 1204, 1044, 956, 863]
    ]
  };
  var K_AIR_TEMP = [
    [10, 1.3, 1.2],
    [15, 1.24, 1.17],
    [20, 1.19, 1.13],
    [25, 1.13, 1.08],
    [30, 1.06, 1.04],
    [35, 1, 1],
    [40, 0.93, 0.95],
    [45, 0.84, 0.91],
    [50, 0.76, 0.85],
    [55, 0.65, 0.79],
    [60, 0.53, 0.74],
    [65, null, 0.68],
    [70, null, 0.6],
    [75, null, 0.52],
    [80, null, 0.43]
  ];
  var K_GROUND_TEMP = [
    [10, 1.24, 1.15],
    [15, 1.18, 1.12],
    [20, 1.12, 1.08],
    [25, 1.07, 1.03],
    [30, 1, 1],
    [35, 0.94, 0.96],
    [40, 0.87, 0.91],
    [45, 0.8, 0.86],
    [50, 0.71, 0.82],
    [55, 0.62, 0.76],
    [60, 0.51, 0.7],
    [65, null, 0.65],
    [70, null, 0.57],
    [75, null, 0.49],
    [80, null, 0.41]
  ];
  var K_SOIL_RESISTIVITY = [
    [1, 1.18],
    [1.5, 1.1],
    [2, 1.05],
    [2.5, 1],
    [3, 0.96]
  ];
  var GROUP_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 20];
  var K_GROUPING = [
    {
      id: 1,
      label: "מקבץ כבלים על גבי משטח, בהתקנה סמויה או חשופה",
      factors: [1, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.5, 0.45, 0.41, 0.38]
    },
    {
      id: 2,
      label: "שכבה אחת על קיר, רצפה או מגש לא מחורר",
      factors: [1, 0.85, 0.79, 0.75, 0.73, 0.72, 0.72, 0.71, 0.7, null, null, null]
    },
    {
      id: 3,
      label: "שכבה אחת בצמוד לתקרה",
      factors: [0.95, 0.81, 0.72, 0.68, 0.66, 0.64, 0.63, 0.62, 0.61, null, null, null]
    },
    {
      id: 4,
      label: "שכבה אחת על מגש מחורר אופקי או אנכי",
      factors: [1, 0.88, 0.82, 0.77, 0.75, 0.73, 0.73, 0.72, 0.72, null, null, null]
    },
    {
      id: 5,
      label: "שכבה אחת על סולם כבלים או בחבקים",
      factors: [1, 0.87, 0.82, 0.8, 0.8, 0.79, 0.79, 0.78, 0.78, null, null, null]
    }
  ];
  var BURIED_SPACINGS = ["צמודים", "מרחק קוטר כבל", '12.5 ס"מ', '25 ס"מ', '50 ס"מ'];
  var K_BURIED = {
    2: [0.75, 0.8, 0.85, 0.9, 0.9],
    3: [0.65, 0.7, 0.75, 0.8, 0.85],
    4: [0.6, 0.6, 0.7, 0.75, 0.8],
    5: [0.55, 0.55, 0.65, 0.7, 0.8],
    6: [0.5, 0.55, 0.6, 0.7, 0.8]
  };
  var DUCT_SPACINGS = ["צמודים", '25 ס"מ', '50 ס"מ', '100 ס"מ'];
  var K_DUCTS_SINGLE_CORE = {
    2: [0.8, 0.9, 0.9, 0.95],
    3: [0.7, 0.8, 0.85, 0.9],
    4: [0.65, 0.75, 0.8, 0.9],
    5: [0.6, 0.7, 0.8, 0.9],
    6: [0.6, 0.7, 0.8, 0.9]
  };
  var K_DUCTS_MULTI_CORE = {
    2: [0.85, 0.9, 0.95, 0.95],
    3: [0.75, 0.85, 0.9, 0.95],
    4: [0.7, 0.8, 0.85, 0.9],
    5: [0.65, 0.8, 0.85, 0.9],
    6: [0.6, 0.8, 0.8, 0.9]
  };
  var INSTALL_METHODS = [
    { id: "a", code: "א", description: "מוליכים מבודדים או כבלים חד-גידיים בצינור שבקיר, עם בידוד תרמי", table: 1, env: "air", defaultGrouping: 1 },
    { id: "b", code: "ב", description: "כבלים רב-גידיים בצינור שבקיר, עם בידוד תרמי", table: 2, env: "air", defaultGrouping: 1 },
    { id: "g", code: "ג", description: "מוליכים מבודדים או כבלים חד-גידיים במוביל על גבי קיר, או בחבקים (עד 0.3 קוטר מהקיר)", table: 3, env: "air", defaultGrouping: 1 },
    { id: "d", code: "ד", description: "כבלים רב-גידיים במוביל על גבי קיר, או בחבקים (עד 0.3 קוטר מהקיר)", table: 4, env: "air", defaultGrouping: 1 },
    { id: "h", code: "ה", description: "מוליכים מבודדים או כבלים חד-גידיים בתוך תעלה על גבי קיר", table: 3, env: "air", defaultGrouping: 1 },
    { id: "v", code: "ו", description: "כבלים רב-גידיים בתוך תעלה על גבי קיר", table: 4, env: "air", defaultGrouping: 1 },
    { id: "z", code: "ז", description: "מוליכים מבודדים או כבלים חד-גידיים בתוך תעלה תלויה", table: 4, env: "air", defaultGrouping: 1 },
    { id: "ch", code: "ח", description: "כבלים רב-גידיים בתוך תעלה תלויה", table: 4, env: "air", defaultGrouping: 1 },
    { id: "t", code: "ט", description: "מוליכים מבודדים או כבלים חד-גידיים בתעלה חשופה המשמשת גם שירותים אחרים", table: 3, env: "air", defaultGrouping: 1 },
    { id: "y", code: "י", description: "כבלים רב-גידיים בתעלה חשופה המשמשת גם שירותים אחרים", table: 4, env: "air", defaultGrouping: 1 },
    { id: "ya", code: 'י"א', description: "כבלים חד-גידיים או רב-גידיים בתוך משקוף של דלת או חלון", table: 1, env: "air", defaultGrouping: 1 },
    { id: "yb", code: 'י"ב', description: "כבלים חד-גידיים או רב-גידיים בצמוד לקיר או לתקרה", table: 5, env: "air", defaultGrouping: 2 },
    { id: "yg", code: 'י"ג', description: "כבלים חד-גידיים או רב-גידיים על גבי מגש לא מחורר", table: 5, env: "air", defaultGrouping: 2 },
    { id: "yd", code: 'י"ד', description: "כבלים רב-גידיים על גבי מגש מחורר או מגש רשת", table: 7, env: "air", defaultGrouping: 4 },
    { id: "tv", code: 'ט"ו', description: "כבלים חד-גידיים על גבי מגש מחורר או מגש רשת", table: 8, env: "air", defaultGrouping: 4 },
    { id: "tz", code: 'ט"ז', description: "כבלים רב-גידיים על גבי סולם כבלים", table: 7, env: "air", defaultGrouping: 5 },
    { id: "yz", code: 'י"ז', description: "כבלים חד-גידיים על גבי סולם כבלים", table: 8, env: "air", defaultGrouping: 5 },
    { id: "ych_a", code: 'י"ח (א)', description: "כבלים בחלל בנוי בתוך מבנה, מרווח 1.5 עד 5 קוטרי כבל", table: 4, env: "air", defaultGrouping: 1 },
    { id: "ych_b", code: 'י"ח (ב)', description: "כבלים בחלל בנוי בתוך מבנה, מרווח 5 עד 50 קוטרי כבל", table: 3, env: "air", defaultGrouping: 1 },
    { id: "yt_a", code: 'י"ט (א)', description: "כבלים בתקרה כפולה או ברצפה צפה, מרווח 1.5 עד 5 קוטרי כבל", table: 4, env: "air", defaultGrouping: 1 },
    { id: "yt_b", code: 'י"ט (ב)', description: "כבלים בתקרה כפולה או ברצפה צפה, מרווח 5 עד 50 קוטרי כבל", table: 3, env: "air", defaultGrouping: 1 },
    { id: "k", code: "כ", description: "כבל חד-גידי בתוך תעלה משוקעת ברצפה, מכסה בלא אוורור", table: 3, env: "air", defaultGrouping: 1 },
    { id: "ka", code: 'כ"א', description: "כבלים רב-גידיים בתוך תעלה משוקעת ברצפה, מכסה בלא אוורור", table: 4, env: "air", defaultGrouping: 1 },
    { id: "kb", code: 'כ"ב', description: "כבלים חד-גידיים בתעלה משוקעת בתוך קיר, מכסה בלא אוורור", table: 3, env: "air", defaultGrouping: 1 },
    { id: "kg", code: 'כ"ג', description: "כבלים רב-גידיים בתעלה משוקעת בתוך קיר, מכסה בלא אוורור", table: 4, env: "air", defaultGrouping: 1 },
    { id: "kd_a", code: 'כ"ד (א)', description: "מוליכים מבודדים בצינור בתעלה בלא אוורור (אופקי), מרווח 1.5 עד 20 קוטרי כבל", table: 4, env: "air", defaultGrouping: 1 },
    { id: "kd_b", code: 'כ"ד (ב)', description: "מוליכים מבודדים בצינור בתעלה בלא אוורור (אופקי), מרווח 20 קוטרי כבל ומעלה", table: 3, env: "air", defaultGrouping: 1 },
    { id: "kh", code: 'כ"ה', description: "מוליכים מבודדים בצינור בתעלת כבלים ברצפה, פתוחה או עם מכסה מאוורר", table: 3, env: "air", defaultGrouping: 1 },
    { id: "kv", code: 'כ"ו', description: "כבלים רב-גידיים בצינור בתעלת כבלים ברצפה, פתוחה או עם מכסה מאוורר", table: 4, env: "air", defaultGrouping: 1 },
    { id: "kz", code: 'כ"ז', description: "כבלים בתעלת כבלים (אופקית או אנכית), פתוחה או עם מכסה מאוורר", table: 3, env: "air", defaultGrouping: 1 },
    { id: "kch", code: 'כ"ח', description: "מוליכים מבודדים או כבלים חד-גידיים בצינור בתוך קיר", table: 3, env: "air", defaultGrouping: 1 },
    { id: "kt", code: 'כ"ט', description: "כבלים רב-גידיים בצינור בתוך קיר", table: 4, env: "air", defaultGrouping: 1 },
    { id: "l", code: "ל", description: "כבלים בצינור או בתעלה בנויה בתוך האדמה", table: 6, env: "ground_duct", defaultGrouping: 1 },
    { id: "la", code: 'ל"א', description: "כבלים טמונים במישרין באדמה, עם או בלי כיסוי מגן", table: 6, env: "ground_direct", defaultGrouping: 1 }
  ];

  // ../pkg/קוד/src/lib/calculators/ampacity.ts
  var BREAKER_LABELS = {
    mcb: 'מפסק אוטומטי זעיר (מא"ז)',
    adjustable: "מפסק אוטומטי הניתן לכוונון",
    fuse: "נתיך"
  };
  var BREAKER_SIZES = [
    6,
    10,
    13,
    16,
    20,
    25,
    32,
    40,
    50,
    63,
    80,
    100,
    125,
    160,
    200,
    250,
    315,
    400,
    500,
    630,
    800,
    1e3,
    1250
  ];
  function trippingCurrentFactor(type, inAmps) {
    if (type === "mcb") return 1.45;
    if (type === "adjustable") return 1.3;
    return inAmps <= 25 ? 1.75 : 1.6;
  }
  function requiredIz(type, inAmps) {
    const i2 = trippingCurrentFactor(type, inAmps) * inAmps;
    return Math.max(inAmps, i2 / 1.45);
  }
  var getMethod = (id) => {
    var _a;
    return (_a = INSTALL_METHODS.find((m) => m.id === id)) != null ? _a : INSTALL_METHODS[0];
  };
  var tableId = (method, insulation) => `${insulation === "pvc" ? 70 : 90}.${method.table}`;
  function lookupIz(method, insulation, material, threePhase, section) {
    var _a;
    const row = (_a = IZ_TABLES[tableId(method, insulation)]) == null ? void 0 : _a.find((r) => r[0] === section);
    if (!row) return null;
    const col = material === "copper" ? threePhase ? 2 : 1 : threePhase ? 4 : 3;
    return row[col];
  }
  var sectionsFor = (method, insulation) => {
    var _a;
    return ((_a = IZ_TABLES[tableId(method, insulation)]) != null ? _a : []).map((r) => r[0]);
  };
  function correctionFactors(method, insulation, c) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const factors = [];
    const col = insulation === "pvc" ? 1 : 2;
    const tempTable = method.env === "air" ? K_AIR_TEMP : K_GROUND_TEMP;
    const tRow = tempTable.find((r) => r[0] === c.ambientC);
    const kT = (_a = tRow == null ? void 0 : tRow[col]) != null ? _a : null;
    if (kT === null) return { ok: false, error: `טמפרטורה ${c.ambientC}°C אינה מותרת לבידוד ${insulation === "pvc" ? "70°C" : "90°C"}` };
    factors.push({
      key: "K1",
      label: method.env === "air" ? "טמפרטורת אוויר (טבלה 1)" : "טמפרטורת קרקע (טבלה 2)",
      value: kT
    });
    if (method.env === "air") {
      const arr = (_b = K_GROUPING.find((g) => g.id === c.groupingArrangement)) != null ? _b : K_GROUPING[0];
      const idx = GROUP_COUNTS.indexOf(c.groupCount);
      const kG = idx >= 0 ? arr.factors[idx] : null;
      if (kG === null || kG === void 0) {
        return { ok: false, error: "בסידור הזה התקנות מתירות עד 9 מעגלים או כבלים רב-גידיים" };
      }
      factors.push({ key: "K4", label: "קיבוץ כבלים (טבלה 4)", value: kG });
    } else if (method.env === "ground_direct") {
      const kG = c.groupCount <= 1 ? 1 : (_d = (_c = K_BURIED[c.groupCount]) == null ? void 0 : _c[c.spacingIndex]) != null ? _d : null;
      if (kG === null) return { ok: false, error: "בטבלה 5 יש ערכים ל-2 עד 6 מעגלים" };
      factors.push({ key: "K5", label: "מעגלים טמונים באדמה (טבלה 5)", value: kG });
      const kS = (_f = (_e = K_SOIL_RESISTIVITY.find((r) => r[0] === c.soilResistivity)) == null ? void 0 : _e[1]) != null ? _f : 1;
      factors.push({ key: "K3", label: "התנגדות תרמית של הקרקע (טבלה 3)", value: kS });
    } else {
      const table = c.singleCore ? K_DUCTS_SINGLE_CORE : K_DUCTS_MULTI_CORE;
      const kG = c.groupCount <= 1 ? 1 : (_h = (_g = table[c.groupCount]) == null ? void 0 : _g[c.spacingIndex]) != null ? _h : null;
      if (kG === null) return { ok: false, error: "בטבלאות 6 ו-7 יש ערכים ל-2 עד 6 קבוצות" };
      factors.push({
        key: c.singleCore ? "K6" : "K7",
        label: c.singleCore ? "צינורות באדמה, חד-גידיים (טבלה 6)" : "צינורות באדמה, רב-גידיים (טבלה 7)",
        value: kG
      });
    }
    return { ok: true, factors };
  }
  function calcBreakerCable(i) {
    var _a;
    const method = getMethod(i.methodId);
    const corr = correctionFactors(method, i.insulation, i.corrections);
    if (!corr.ok) return corr;
    const c = corr.factors.reduce((acc, f) => acc * f.value, 1);
    const required = requiredIz(i.breakerType, i.inAmps);
    const rows = sectionsFor(method, i.insulation).map((section) => {
      const iz = lookupIz(method, i.insulation, i.material, i.threePhase, section);
      if (iz === null) return { section, iz: null, izTotal: null, izCorrected: null, ok: false };
      const izTotal = iz * i.parallel;
      const izCorrected = izTotal * c;
      return { section, iz, izTotal, izCorrected, ok: Math.round(izCorrected * 1e3) >= Math.round(required * 1e3) };
    });
    return {
      ok: true,
      table: tableId(method, i.insulation),
      required,
      i2Factor: trippingCurrentFactor(i.breakerType, i.inAmps),
      factors: corr.factors,
      c,
      rows,
      recommended: (_a = rows.find((r) => r.ok)) != null ? _a : null
    };
  }

  // ../pkg/קוד/src/lib/calculators/energy-cost.ts
  var DEFAULT_TARIFF = 0.6352;
  var TARIFF_DATE = "1.7.2026";
  function calcEnergyCost(i) {
    const kwhPerDay = i.watts / 1e3 * i.hoursPerDay * i.quantity;
    const kwhPerMonth = kwhPerDay * i.daysPerMonth;
    const kwhPerYear = kwhPerMonth * 12;
    const effectivePrice = i.pricePerKwh * (1 - i.discountPct / 100);
    return {
      kwhPerDay,
      kwhPerMonth,
      kwhPerYear,
      effectivePrice,
      costPerDay: kwhPerDay * effectivePrice,
      costPerMonth: kwhPerMonth * effectivePrice,
      costPerYear: kwhPerYear * effectivePrice
    };
  }
  var DEVICE_PRESETS = [
    { label: 'מזגן 1 כ"ס', watts: 1e3, hours: 8 },
    { label: 'מזגן 2.5 כ"ס', watts: 2500, hours: 8 },
    { label: "דוד חשמל", watts: 2500, hours: 1 },
    { label: "תנור חימום", watts: 2e3, hours: 4 },
    { label: "מייבש כביסה", watts: 2500, hours: 1 },
    { label: "טעינת רכב 11kW", watts: 11e3, hours: 3 },
    { label: "טעינת רכב 7.4kW", watts: 7400, hours: 4 }
  ];
  return __toCommonJS(entry_exports);
})();
