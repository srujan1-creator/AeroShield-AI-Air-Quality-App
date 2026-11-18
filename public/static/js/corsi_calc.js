/**
 * AeroShield AI - Interactive Corsi-Rosenthal DIY Box Filter Designer
 * Calculates CADR, ACH, cost delta, and renders dynamic SVG technical blueprints.
 */

(function (window) {
    'use strict';

    const MERV_EFFICIENCIES = {
        11: 0.65,
        12: 0.75,
        13: 0.85,
        14: 0.90,
        16: 0.95
    };

    const CorsiDesigner = {
        /**
         * Computes engineering metrics
         */
        computeSpecs: function (roomSqft, ceilingHeightFt, filterCount, filterMerv) {
            const sqft = Math.max(40, Math.min(3000, parseFloat(roomSqft) || 250));
            const height = Math.max(7, Math.min(18, parseFloat(ceilingHeightFt) || 9));
            const filters = parseInt(filterCount, 10) || 4;
            const merv = parseInt(filterMerv, 10) || 13;

            const roomVolumeCuFt = sqft * height;

            // Fan airflow delivered under pressure drop
            let fanCfm = 600.0;
            if (filters === 2) fanCfm = 420.0; // V-wedge
            else if (filters === 5) fanCfm = 660.0; // 5-filter tower

            const efficiency = MERV_EFFICIENCIES[merv] || 0.85;
            const cadrCfm = Math.round(fanCfm * efficiency);
            const ach = Math.round(((cadrCfm * 60) / roomVolumeCuFt) * 100) / 100;

            let rating = "Optimal (Recommended for Heavy Winter Smog)";
            let ratingColor = "#38BDF8";
            if (ach >= 6.0) {
                rating = "Exceptional (Hospital/Isolation Grade)";
                ratingColor = "#22C55E";
            } else if (ach < 2.5) {
                rating = "Sub-optimal (Recommend adding 2nd unit or running high fan speed)";
                ratingColor = "#EF4444";
            } else if (ach < 4.0) {
                rating = "Moderate (Acceptable for Light Smog)";
                ratingColor = "#EAB308";
            }

            // Financials (USD & Indian Rupee ₹ conversion @ ₹86/USD)
            const fanCost = 24.0;
            const filterCostEach = 9.5;
            const tapeCost = 6.0;
            const totalDiyCost = Math.round((fanCost + (filters * filterCostEach) + tapeCost) * 100) / 100;
            const commercialCost = 480.0;
            const savingsUsd = Math.round((commercialCost - totalDiyCost) * 100) / 100;
            const savingsPct = Math.round((savingsUsd / commercialCost) * 1000) / 10;

            const totalDiyCostInr = Math.round(totalDiyCost * 86);
            const commercialCostInr = Math.round(commercialCost * 86);
            const savingsInr = commercialCostInr - totalDiyCostInr;

            return {
                roomSqft: sqft,
                ceilingHeightFt: height,
                roomVolumeCuFt: Math.round(roomVolumeCuFt),
                cadrCfm: cadrCfm,
                ach: ach,
                rating: rating,
                ratingColor: ratingColor,
                totalDiyCost: totalDiyCost,
                commercialCost: commercialCost,
                savingsUsd: savingsUsd,
                savingsPct: savingsPct,
                totalDiyCostInr: totalDiyCostInr,
                commercialCostInr: commercialCostInr,
                savingsInr: savingsInr,
                filterEfficiencyPct: Math.round(efficiency * 100),
                filterCount: filters,
                filterMerv: merv
            };
        },

        /**
         * Renders an accessible SVG schematic of the Corsi-Rosenthal Box
         */
        renderSVG: function (specs) {
            const isFourFilter = specs.filterCount >= 4;
            return `
            <svg viewBox="0 0 460 320" class="corsi-schematic-svg" role="img" aria-labelledby="corsi-svg-title corsi-svg-desc">
                <title id="corsi-svg-title">Corsi-Rosenthal Box Filter Engineering Blueprint</title>
                <desc id="corsi-svg-desc">Isometric schematic showing a top-mounted 20-inch box fan with cardboard circular shroud ring, surrounded by ${specs.filterCount} MERV ${specs.filterMerv} pleated furnace filters sealed with duct tape.</desc>
                <defs>
                    <linearGradient id="fanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0284C7" />
                        <stop offset="100%" stop-color="#0369A1" />
                    </linearGradient>
                    <linearGradient id="filterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#E2E8F0" />
                        <stop offset="50%" stop-color="#CBD5E1" />
                        <stop offset="100%" stop-color="#94A3B8" />
                    </linearGradient>
                    <linearGradient id="airExhaust" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.8" />
                        <stop offset="100%" stop-color="#22C55E" stop-opacity="0" />
                    </linearGradient>
                </defs>

                <!-- Clean Air Exhaust Upward Plume -->
                <path d="M 180 80 Q 230 15 280 80 Z" fill="url(#airExhaust)" />
                <path d="M 200 65 L 230 20 L 260 65" stroke="#38BDF8" stroke-width="2.5" fill="none" stroke-dasharray="4,4" />
                <text x="230" y="35" text-anchor="middle" fill="#38BDF8" font-size="12" font-weight="700">Clean Air Exhaust: ${specs.cadrCfm} CFM</text>

                <!-- Box Fan on Top -->
                <rect x="150" y="80" width="160" height="28" rx="4" fill="url(#fanGrad)" stroke="#38BDF8" stroke-width="2" />
                <!-- Fan Shroud Opening -->
                <ellipse cx="230" cy="94" rx="60" ry="10" fill="#0F172A" stroke="#7DD3FC" stroke-width="1.5" />
                <ellipse cx="230" cy="94" rx="20" ry="4" fill="#38BDF8" />
                <text x="230" y="106" text-anchor="middle" fill="#FFFFFF" font-size="9" font-weight="600">20" Box Fan (Top Mounted)</text>

                <!-- Cardboard Shroud Ring Label -->
                <line x1="310" y1="94" x2="365" y2="94" stroke="#F59E0B" stroke-width="1.5" />
                <circle cx="365" cy="94" r="3" fill="#F59E0B" />
                <text x="375" y="98" fill="#F59E0B" font-size="11" font-weight="600">14" Shroud Ring</text>

                <!-- Front Filter Panel -->
                <polygon points="150,108 310,108 310,230 150,230" fill="url(#filterGrad)" stroke="#64748B" stroke-width="2" />
                
                <!-- Pleat lines on front filter -->
                <line x1="170" y1="108" x2="170" y2="230" stroke="#94A3B8" stroke-width="1.5" />
                <line x1="190" y1="108" x2="190" y2="230" stroke="#94A3B8" stroke-width="1.5" />
                <line x1="210" y1="108" x2="210" y2="230" stroke="#94A3B8" stroke-width="1.5" />
                <line x1="230" y1="108" x2="230" y2="230" stroke="#94A3B8" stroke-width="1.5" />
                <line x1="250" y1="108" x2="250" y2="230" stroke="#94A3B8" stroke-width="1.5" />
                <line x1="270" y1="108" x2="270" y2="230" stroke="#94A3B8" stroke-width="1.5" />
                <line x1="290" y1="108" x2="290" y2="230" stroke="#94A3B8" stroke-width="1.5" />

                <!-- Left Side Filter Panel (Isometric perspective) -->
                <polygon points="150,108 100,140 100,250 150,230" fill="#94A3B8" stroke="#475569" stroke-width="2" />
                <line x1="115" y1="130" x2="115" y2="245" stroke="#64748B" stroke-width="1" />
                <line x1="130" y1="120" x2="130" y2="238" stroke="#64748B" stroke-width="1" />

                <!-- Duct Tape Sealing Edge Callout -->
                <line x1="150" y1="108" x2="150" y2="230" stroke="#DC2626" stroke-width="3.5" />
                <line x1="150" y1="170" x2="70" y2="170" stroke="#DC2626" stroke-width="1.5" />
                <circle cx="70" cy="170" r="3" fill="#DC2626" />
                <text x="65" y="165" text-anchor="end" fill="#DC2626" font-size="11" font-weight="700">Duct Tape Seal</text>
                <text x="65" y="180" text-anchor="end" fill="#94A3B8" font-size="9">Airtight Corners</text>

                <!-- Filter Label -->
                <rect x="180" y="160" width="100" height="24" rx="3" fill="#0F172A" opacity="0.85" />
                <text x="230" y="176" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="700">MERV ${specs.filterMerv} (x${specs.filterCount})</text>

                <!-- Bottom Base Cardboard -->
                <polygon points="100,250 150,230 310,230 260,265" fill="#78350F" opacity="0.8" stroke="#451A03" stroke-width="2" />
                <text x="200" y="252" text-anchor="middle" fill="#FEF3C7" font-size="9">Cardboard Base Floor</text>

                <!-- Lateral Dirty Air Intake Arrows -->
                <path d="M 50 200 L 90 200" stroke="#EF4444" stroke-width="2.5" marker-end="url(#arrow)" />
                <text x="50" y="215" fill="#EF4444" font-size="10" font-weight="600">Smog Intake</text>
                
                <path d="M 370 170 L 320 170" stroke="#EF4444" stroke-width="2.5" />
                <text x="375" y="174" fill="#EF4444" font-size="10" font-weight="600">Smog Intake</text>

                <!-- Performance Summary Badge Inside SVG -->
                <rect x="20" y="280" width="420" height="32" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
                <text x="35" y="301" fill="#94A3B8" font-size="11">Delivered ACH: <tspan fill="#38BDF8" font-weight="700">${specs.ach} ACH</tspan></text>
                <text x="185" y="301" fill="#94A3B8" font-size="11">CADR: <tspan fill="#22C55E" font-weight="700">${specs.cadrCfm} CFM</tspan></text>
                <text x="315" y="301" fill="#94A3B8" font-size="11">Cost: <tspan fill="#F59E0B" font-weight="700">$${specs.totalDiyCost}</tspan> (Save ${specs.savingsPct}%)</text>
            </svg>
            `;
        }
    };

    window.CorsiDesigner = CorsiDesigner;
})(window);
