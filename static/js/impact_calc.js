/**
 * AeroShield AI - Client-Side Impact Quantifier Engine
 * Computes exact physical minute ventilation, inhaled dose avoided, CO2e reduction,
 * and EPA equivalent trees planted with instant 60fps reactivity.
 */

(function (window) {
    'use strict';

    const EPA_TREE_CO2_KG_YEAR = 21.77;

    const COMMUTE_VENTILATION_RATES = {
        walking_cycling: 1.92,  // m3/hour (32 L/min)
        two_wheeler: 1.08,      // m3/hour (18 L/min)
        open_auto: 0.85,        // m3/hour (14 L/min)
        public_bus: 0.72,       // m3/hour (12 L/min)
        metro: 0.70,            // m3/hour (11.6 L/min)
        car: 0.65,              // m3/hour (10.8 L/min)
        remote: 0.45            // m3/hour (7.5 L/min)
    };

    const COMMUTE_EXPOSURE_FACTORS = {
        walking_cycling: 1.25,
        two_wheeler: 1.35,
        open_auto: 1.20,
        public_bus: 0.90,
        metro: 0.40,
        car: 0.70,
        remote: 0.35
    };

    const ImpactCalc = {
        /**
         * Calculates full physical impact metrics
         */
        calculate: function (profile, selectedRoutines, selectedAlternatives) {
            const ambientPM25 = Math.max(1, parseFloat(profile.custom_pm25 || profile.ambient_pm25 || 250));
            const commuteType = String(profile.commute_type || 'two_wheeler').toLowerCase();
            const heatingType = String(profile.heating_type || 'lpg').toLowerCase();
            const children = Math.max(0, parseInt(profile.children || 0, 10));
            const elderly = Math.max(0, parseInt(profile.elderly || 0, 10));
            const hasRespiratory = Boolean(profile.respiratory_sensitivity);

            // 1. Baseline Inhaled Dose Math (ug/day)
            const commuteVe = COMMUTE_VENTILATION_RATES[commuteType] || 1.0;
            const commuteExposure = COMMUTE_EXPOSURE_FACTORS[commuteType] || 1.0;
            const commuteHours = 1.5;

            const commuteBaseInhaled = commuteVe * commuteHours * (ambientPM25 * commuteExposure);
            const indoorBaseInhaled = (0.65 * 14.5 * (ambientPM25 * 0.65)) + (0.45 * 8.0 * (ambientPM25 * 0.55));
            const totalBaseDose = commuteBaseInhaled + indoorBaseInhaled;

            // 2. Compute Inhaled Dose Avoided
            let avoidedDose = 0.0;
            const routinesSet = new Set(selectedRoutines || []);

            if (routinesSet.has('mask_commute') || routinesSet.has('rescheduled_commute')) {
                // N95 respirator 90-95% efficiency
                avoidedDose += (commuteBaseInhaled * 0.90);
            }
            if (routinesSet.has('corsi_box_filtration') || routinesSet.has('indoor_hepa')) {
                // Indoor HEPA / Corsi-Rosenthal unit scrubs ~72% of indoor background
                avoidedDose += (indoorBaseInhaled * 0.72);
            }
            if (routinesSet.has('shift_morning_exercise')) {
                // Avoiding outdoor morning run in heavy inversion (2.4 m3/h ventilation in 1.7x smog)
                avoidedDose += (1.0 * 2.4 * (ambientPM25 * 1.7) * 0.80);
            }
            if (routinesSet.has('timed_ventilation')) {
                avoidedDose += (indoorBaseInhaled * 0.12);
            }
            if (routinesSet.has('humidity_control')) {
                // Gravitational Stokes settling
                avoidedDose += (indoorBaseInhaled * 0.10);
            }

            // Vulnerability weighting
            let vulnerabilityMultiplier = 1.0;
            if (children > 0) vulnerabilityMultiplier += (children * 0.35);
            if (elderly > 0) vulnerabilityMultiplier += (elderly * 0.25);
            if (hasRespiratory) vulnerabilityMultiplier += 0.40;

            const finalPM25Avoided = Math.round(avoidedDose * vulnerabilityMultiplier * 10) / 10;

            // 3. CO2e Emissions Reduction Math (kg CO2e / year)
            let co2eSavedKgYear = 0.0;
            const altSet = new Set(selectedAlternatives || []);

            if (altSet.has('swap_metro_transit') || altSet.has('swap_public_transit')) {
                if (commuteType === 'car') co2eSavedKgYear += 984.0;
                else if (commuteType === 'two_wheeler' || commuteType === 'open_auto') co2eSavedKgYear += 342.0;
                else co2eSavedKgYear += 250.0;
            }
            if (altSet.has('swap_ev_micromobility')) {
                co2eSavedKgYear += 295.0;
            }
            if (altSet.has('community_carpooling')) {
                co2eSavedKgYear += 620.0;
            }
            if (altSet.has('swap_induction_cooking')) {
                if (heatingType === 'wood_coal' || heatingType === 'chulha') co2eSavedKgYear += 950.0;
                else if (heatingType === 'kerosene' || heatingType === 'gas_furnace') co2eSavedKgYear += 520.0;
                else co2eSavedKgYear += 240.0;
            }
            if (altSet.has('swap_smart_heating_weatherstrip')) {
                co2eSavedKgYear += 310.0;
            }
            if (altSet.has('anti_biomass_composting')) {
                co2eSavedKgYear += 180.0;
            }
            if (altSet.has('community_clean_air_hub')) {
                co2eSavedKgYear += 140.0;
            }

            co2eSavedKgYear = Math.round(co2eSavedKgYear * 10) / 10;

            // 4. Equivalent Trees Planted (EPA standard: 21.77 kg CO2/tree/yr)
            const treesPlanted = Math.round((co2eSavedKgYear / EPA_TREE_CO2_KG_YEAR) * 10) / 10;

            // Percentage reduction
            const pctAvoided = Math.min(92, Math.round((avoidedDose / Math.max(1, totalBaseDose)) * 1000) / 10);

            return {
                pm25AvoidedUgDay: finalPM25Avoided,
                co2eSavedKgYear: co2eSavedKgYear,
                treesPlanted: treesPlanted,
                inhalationReductionPct: pctAvoided,
                baselineDoseUgDay: Math.round(totalBaseDose * 10) / 10,
                vulnerabilityMultiplier: Math.round(vulnerabilityMultiplier * 100) / 100
            };
        }
    };

    window.ImpactCalc = ImpactCalc;
})(window);
