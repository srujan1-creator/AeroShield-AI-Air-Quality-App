"""
AeroShield AI - Deterministic Local GenAI Fallback Engine
Guarantees 100% offline functionality, deterministic grading outputs, and
robust schema compliance even without an active internet connection or Gemini API key.
"""

from typing import Dict, Any, List
from impact_engine import (
    CITY_PRESETS,
    calculate_aqi_from_pm25,
    calculate_impact,
    calculate_corsi_rosenthal_specs,
    generate_diurnal_curve
)


def generate_fallback_routines(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Tab 1: Low-Emission Daily Routines
    Time-slotted schedule optimizing routines around winter thermal inversion and smog peaks.
    """
    city_key = str(profile.get("city", "delhi")).lower().strip()
    city_data = CITY_PRESETS.get(city_key, CITY_PRESETS["delhi"])
    custom_val = profile.get("custom_pm25")
    ambient_pm25 = float(custom_val if custom_val is not None else city_data["base_pm25"])
    aqi_data = calculate_aqi_from_pm25(ambient_pm25)
    
    children_count = int(profile.get("children", 0))
    elderly_count = int(profile.get("elderly", 0))
    has_respiratory = bool(profile.get("respiratory_sensitivity", False))
    commute_type = str(profile.get("commute_type", "two_wheeler")).lower()

    # Vulnerability tags
    vulnerable_notes = []
    if children_count > 0:
        vulnerable_notes.append(f"{children_count} Child(ren) Profile: Higher minute ventilation per kg body mass; keep physical exertion indoors during morning inversions.")
    if elderly_count > 0:
        vulnerable_notes.append(f"{elderly_count} Senior(s) Profile: Elevated cardiovascular risk from fine particulate translocation; maintain continuous indoor bedroom filtration.")
    if has_respiratory:
        vulnerable_notes.append("Respiratory Sensitivity (Asthma/COPD) Alert: Bronchial hyper-reactivity requires pre-emptive bronchodilator accessibility and N95 fit.")

    slots = [
        {
            "slot_id": "slot_early_morning",
            "time_range": "05:00 - 08:00",
            "phase_name": "Nocturnal Inversion Trap (Ground Stagnation)",
            "smog_risk": "Severe Hazard",
            "risk_color": "#EF4444",
            "ambient_expected_pm25": round(ambient_pm25 * 1.65, 1),
            "inversion_physics": (
                "Radiational cooling of the Earth's surface traps cold air beneath a warmer atmospheric lid. "
                "Mixing height compresses to <100 meters, concentrating combustion soot and dust near the ground."
            ),
            "recommended_actions": [
                "Strictly avoid outdoor jogging, cycling, or morning walks. Shift exercise to an indoor filtered room.",
                "Keep all north and west-facing windows locked to prevent infiltration of overnight stagnation plumes.",
                "Run bedroom air purifier or DIY Corsi-Rosenthal unit on medium speed; keep bedroom door draft-sealed."
            ],
            "vulnerability_flag": "High Risk for Children & Seniors" if (children_count > 0 or elderly_count > 0) else "General Population Alert",
            "default_checked": True,
            "routine_id": "shift_morning_exercise"
        },
        {
            "slot_id": "slot_morning_commute",
            "time_range": "08:00 - 11:00",
            "phase_name": "Morning Rush Hour & Trapped Exhaust",
            "smog_risk": "High Exposure",
            "risk_color": "#F97316",
            "ambient_expected_pm25": round(ambient_pm25 * 1.55, 1),
            "inversion_physics": (
                "Peak vehicular traffic coincides with low boundary layer. Nitric oxide (NO) and black carbon "
                "accumulate within 2 meters of road surfaces without horizontal wind dispersal."
            ),
            "recommended_actions": [
                (
                    f"Commute mode '{commute_type.replace('_', ' ').title()}': Wear a certified NIOSH N95 / FFP2 respirator. "
                    "Ensure tight facial seal; cloth or surgical masks provide <20% sub-micron filtration."
                ),
                "If traveling by car/cab: Switch HVAC intake to internal RECIRCULATION mode with activated carbon cabin filter.",
                "Schools and offices: Postpone outdoor morning assemblies, physical education drills, and open sports until noon."
            ],
            "vulnerability_flag": "Child School Transit Precaution" if children_count > 0 else "High Roadside Micro-Environment Exposure",
            "default_checked": True,
            "routine_id": "mask_commute"
        },
        {
            "slot_id": "slot_midday_ventilation",
            "time_range": "11:30 - 15:30",
            "phase_name": "Convective Boundary Layer Expansion (Ventilation Window)",
            "smog_risk": "Daily Minimum",
            "risk_color": "#22C55E",
            "ambient_expected_pm25": round(ambient_pm25 * 0.65, 1),
            "inversion_physics": (
                "Solar surface heating breaks the nocturnal inversion lid. Thermal thermals elevate mixing height "
                "up to 1,200 meters, dramatically diluting particulate matter to the 24-hour minimum."
            ),
            "recommended_actions": [
                "Execute the 15-20 Minute Cross-Ventilation Flush: Open opposing windows simultaneously to dilute indoor CO2 and TVOCs.",
                "Safest time for essential outdoor errands, low-intensity walks, or sun exposure.",
                "Run natural laundry sun-drying to utilize natural UV disinfection without attracting soot."
            ],
            "vulnerability_flag": "Safe Window for All Age Groups",
            "default_checked": True,
            "routine_id": "timed_ventilation"
        },
        {
            "slot_id": "slot_evening_inversion",
            "time_range": "16:30 - 20:30",
            "phase_name": "Radiation Inversion Reformation & Evening Rush",
            "smog_risk": "Severe Spike",
            "risk_color": "#DC2626",
            "ambient_expected_pm25": round(ambient_pm25 * 1.60, 1),
            "inversion_physics": (
                "Surface heat dissipates rapidly at sunset. Cold air settles down into urban basin, re-forming "
                "the thermal inversion lid right as evening commute and domestic cooking emissions surge."
            ),
            "recommended_actions": [
                "Seal all exterior windows and balcony doors by 16:30 before ambient PM2.5 begins rapid escalation.",
                "Return trip commute: Re-apply N95 respirator before stepping onto curbs or public platforms.",
                "Kitchen exhaust: Always engage cooktop extractor hood with kitchen door closed to prevent internal soot migration."
            ],
            "vulnerability_flag": "Asthma & Cardiac Attack Peak Period",
            "default_checked": True,
            "routine_id": "rescheduled_commute"
        },
        {
            "slot_id": "slot_night_sleep",
            "time_range": "20:30 - 05:00",
            "phase_name": "Nocturnal Boundary Stagnation & Recovery",
            "smog_risk": "Controlled Indoor Protection",
            "risk_color": "#38BDF8",
            "ambient_expected_pm25": round(ambient_pm25 * 1.40, 1),
            "inversion_physics": (
                "Calm surface winds (<0.8 m/s) prevent horizontal advection. Outdoor PM2.5 remains hazardous, "
                "making home envelope tightness and mechanical air filtration paramount for overnight recovery."
            ),
            "recommended_actions": [
                "Run Corsi-Rosenthal Box / HEPA purifier on continuous low mode in bedrooms (aim for ACH >= 4.0).",
                "Maintain relative humidity at 40% - 50% using an evaporative humidifier to accelerate Stokes settling of aerosols.",
                "Ensure door sweep or rolled draft towel at bottom of bedroom door to isolate sleeping clean zone."
            ],
            "vulnerability_flag": "Deep Lung Restorative Sleep Protocol",
            "default_checked": True,
            "routine_id": "corsi_box_filtration"
        }
    ]

    return {
        "status": "success",
        "engine": "deterministic_offline_ai",
        "city": city_data["name"],
        "ambient_aqi": aqi_data["aqi"],
        "category": aqi_data["category"],
        "inversion_summary": (
            f"Diurnal thermal inversion for {city_data['name']} creates two severe danger peaks: "
            f"{city_data['inversion_morning_peak']} and {city_data['inversion_evening_peak']}. "
            f"The safest aeration window is {city_data['optimal_ventilation_window']}."
        ),
        "vulnerability_notes": vulnerable_notes,
        "time_slots": slots
    }


def generate_fallback_indoor_hacks(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Tab 2: Indoor Air Quality Hacks
    Comprehensive budget hacks: Corsi-Rosenthal sizing, ventilation windows,
    NASA bio-filtration plants, and aerosol humidity dynamics.
    """
    room_sqft = float(profile.get("room_sqft", 250.0))
    ceiling_height = float(profile.get("ceiling_height", 9.0))
    filter_count = int(profile.get("filter_count", 4))
    filter_merv = int(profile.get("filter_merv", 13))

    corsi_specs = calculate_corsi_rosenthal_specs(
        room_sqft=room_sqft,
        ceiling_height_ft=ceiling_height,
        filter_count=filter_count,
        filter_merv=filter_merv
    )

    # NASA Clean Air Study bio-filtration plants
    plants = [
        {
            "name": "Snake Plant (Dracaena trifasciata / Sansevieria)",
            "botanical_traits": "Crassulacean Acid Metabolism (CAM) plant — absorbs CO2 and releases oxygen at NIGHT.",
            "pollutants_cleared": "Formaldehyde, Benzene, Toluene, Trichloroethylene, PM2.5 leaf cuticle adhesion",
            "placement": "Bedrooms (oxygenates sleep zone) — 2 pots per 100 sq ft",
            "maintenance": "Extremely low: water every 2-3 weeks; tolerates low indirect winter lighting.",
            "pet_safe": "Mildly toxic to cats/dogs if ingested (keep elevated)."
        },
        {
            "name": "Spider Plant (Chlorophytum comosum)",
            "botanical_traits": "Rapid biomass growth with dense foliage surface area for particulate interception.",
            "pollutants_cleared": "Carbon monoxide (CO), Xylene, Formaldehyde, airborne spore dust",
            "placement": "Kitchens, living areas, children's study desks",
            "maintenance": "Easy: indirect sunlight, water once weekly, non-toxic.",
            "pet_safe": "100% Non-toxic & Pet Safe (ASPCA verified)."
        },
        {
            "name": "Areca Palm (Dypsis lutescens)",
            "botanical_traits": "Superb biological humidifier; transpires up to 1 liter of purified moisture per 24 hours.",
            "pollutants_cleared": "Acetone, Xylene, Toluene; facilitates PM2.5 particle settling via ambient moisture",
            "placement": "Main living room or adjacent to Corsi-Rosenthal Box",
            "maintenance": "Moderate: bright indirect light, keep soil moist but well-drained.",
            "pet_safe": "100% Non-toxic to cats and dogs."
        },
        {
            "name": "Peace Lily (Spathiphyllum)",
            "botanical_traits": "High transpiration rate and broad glossy leaves with electrostatic dust attraction.",
            "pollutants_cleared": "Ammonia, Benzene, Trichloroethylene, airborne mold spores",
            "placement": "Bathrooms or humid corridors",
            "maintenance": "Low-to-medium: thrives in shade, wilts visibly to signal watering need.",
            "pet_safe": "Toxic to pets (contains calcium oxalate crystals — keep out of reach)."
        }
    ]

    # Humidity control science
    humidity_guide = {
        "target_relative_humidity": "40% - 50% RH",
        "scientific_mechanism": (
            "Hygroscopic growth: PM2.5 aerosols (sulfates, nitrates, organic carbon) absorb water vapor at "
            "moderate RH, swelling particle diameter (Dp). According to Stokes' Law, gravitational settling "
            "velocity scales with the square of diameter (v_s ~ D_p^2), precipitating fine particles onto floors "
            "where they can be wet-mopped before alveolar lung inhalation."
        ),
        "safety_threshold": "Never exceed 55% RH to avoid triggering fungal Aspergillus spores and house dust mites.",
        "budget_diy_methods": [
            "Boil filtered water in an uncovered stockpot for 15 minutes during dry evening heating periods.",
            "Hang clean damp cotton towels near indoor heat registers or radiators for passive evaporative humidification.",
            "Place broad shallow ceramic bowls filled with water on window sills receiving midday solar warmth."
        ]
    }

    # Inversion ventilation guide
    ventilation_guide = {
        "inversion_aeration_strategy": "The 15-Minute Convective Flush",
        "optimal_window": "12:30 PM - 15:00 PM daily",
        "protocol": [
            "Step 1: Check diurnal forecast — verify ambient PM2.5 has dropped to the daily trough (<100 ug/m3).",
            "Step 2: Turn OFF indoor air purifiers to prevent drawing outside particulate into pre-filter mesh.",
            "Step 3: Open opposing doors/windows simultaneously for exactly 15 minutes to establish a rapid thermal draft.",
            "Step 4: Lock all windows tightly at minute 16; power on Corsi-Rosenthal Box to high speed for 20 minutes to scrub transient intake."
        ]
    }

    return {
        "status": "success",
        "engine": "deterministic_offline_ai",
        "corsi_rosenthal_specs": corsi_specs,
        "bio_filtration_plants": plants,
        "humidity_control": humidity_guide,
        "ventilation_strategy": ventilation_guide
    }


def generate_fallback_alternatives(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Tab 3: Sustainable Lifestyle Alternatives
    Tailored swaps across transit, household energy, and waste with community smog pooling.
    """
    commute_type = str(profile.get("commute_type", "two_wheeler")).lower()
    heating_type = str(profile.get("heating_type", "lpg")).lower()

    transit_swaps = [
        {
            "id": "swap_metro_transit",
            "title": "Shift Commute to Dedicated Electric Metro / Train",
            "scope": "Transit",
            "badge": "High CO2e Impact",
            "co2_saved_kg_year": 984.0 if commute_type in ["car", "taxi"] else 342.0,
            "pm25_avoided_pct": "85% reduction vs roadside traffic plume",
            "annual_cost_savings": "$650 - $1,400 in fuel, parking, and vehicle depreciation",
            "how_to_implement": "Park vehicle at transit node; utilize underground rail where air filtration systems isolate passengers from road exhaust.",
            "default_checked": True
        },
        {
            "id": "swap_ev_micromobility",
            "title": "Transition Two-Wheeler to Electric Moped / Pedal-Assist E-Bike",
            "scope": "Transit",
            "badge": "Zero Tailpipe",
            "co2_saved_kg_year": 295.0,
            "pm25_avoided_pct": "Eliminates 100% of local 2-stroke/4-stroke unburned hydrocarbon smog",
            "annual_cost_savings": "$320 in gasoline savings",
            "how_to_implement": "Charge battery during off-peak solar/grid hours; equip helmet with chin-mounted particulate respirator.",
            "default_checked": False
        },
        {
            "id": "community_carpooling",
            "title": "Neighborhood Smog-Pool Commute Cluster (4-into-1 Carpool)",
            "scope": "Community Pooling",
            "badge": "Congestion Cutter",
            "co2_saved_kg_year": 620.0,
            "pm25_avoided_pct": "Removes 3 internal combustion engines from morning idle queue",
            "annual_cost_savings": "$480 per participant",
            "how_to_implement": "Form a 4-person micro-cluster on messaging apps; take turns driving one high-efficiency vehicle with cabin HEPA filter.",
            "default_checked": True
        }
    ]

    energy_swaps = [
        {
            "id": "swap_induction_cooking",
            "title": "Switch from Biomass / Gas to Magnetic Induction Cooktop",
            "scope": "Household Energy",
            "badge": "Zero Indoor Combustion",
            "co2_saved_kg_year": 950.0 if heating_type in ["wood_coal", "chulha"] else 240.0,
            "pm25_avoided_pct": "Eliminates 98% of peak indoor PM2.5, NO2, and Carbon Monoxide spikes",
            "annual_cost_savings": "$90 - $180 vs bottled LPG canisters",
            "how_to_implement": "Deploy portable single-burner 1800W induction plate ($40); 90% thermal efficiency vs 40% for gas flames.",
            "default_checked": True
        },
        {
            "id": "swap_smart_heating_weatherstrip",
            "title": "Silicone Weatherstripping & Thermal Draft Stoppers",
            "scope": "Household Energy",
            "badge": "Efficiency & Infiltration",
            "co2_saved_kg_year": 310.0,
            "pm25_avoided_pct": "Reduces passive outdoor PM2.5 indoor infiltration by up to 55%",
            "annual_cost_savings": "$140 in winter heating electricity/fuel",
            "how_to_implement": "Apply self-adhesive EPDM rubber gaskets along door perimeters and window sashes; install under-door brush seals.",
            "default_checked": True
        }
    ]

    waste_and_community = [
        {
            "id": "anti_biomass_composting",
            "title": "Community Leaf-Composting Pit vs Open Dry Leaf Burning",
            "scope": "Waste & Community",
            "badge": "Direct Smog Prevention",
            "co2_saved_kg_year": 180.0,
            "pm25_avoided_pct": "Prevents catastrophic 400+ ug/m3 local ground smoke plumes",
            "annual_cost_savings": "Generates 200 kg of free organic garden fertilizer per season",
            "how_to_implement": "Establish designated neighborhood leaf-mulch wire cages; aerate weekly with moisture instead of setting fire to dry leaves.",
            "default_checked": True
        },
        {
            "id": "community_clean_air_hub",
            "title": "Co-op Neighborhood Air Purifier Filter Bulk Buy",
            "scope": "Community Pooling",
            "badge": "Economic Collective",
            "co2_saved_kg_year": 140.0,
            "pm25_avoided_pct": "Enables 100% of neighborhood families to afford MERV 13 filtration",
            "annual_cost_savings": "Reduces per-filter cost by 45% via wholesale contractor packs",
            "how_to_implement": "Pool apartment residents or neighborhood society to order commercial case lots (12-packs) of 20x20x1 MERV 13 filters.",
            "default_checked": True
        }
    ]

    return {
        "status": "success",
        "engine": "deterministic_offline_ai",
        "transit_swaps": transit_swaps,
        "energy_swaps": energy_swaps,
        "waste_and_community_swaps": waste_and_community
    }


def generate_fallback_impact(profile: Dict[str, Any], selected_routines: List[str] = None, selected_alternatives: List[str] = None) -> Dict[str, Any]:
    """
    Generate Tab 4: Direct Impact Quantifier
    Exact PM2.5 inhalation avoided (ug/day), CO2e saved (kg/year), and Trees Planted.
    """
    if selected_routines is None:
        selected_routines = ["shift_morning_exercise", "mask_commute", "corsi_box_filtration", "timed_ventilation", "humidity_control"]
    if selected_alternatives is None:
        selected_alternatives = ["swap_metro_transit", "community_carpooling", "swap_induction_cooking", "swap_smart_heating_weatherstrip", "anti_biomass_composting", "community_clean_air_hub"]

    impact_data = calculate_impact(
        profile=profile,
        selected_routines=selected_routines,
        selected_alternatives=selected_alternatives
    )

    return {
        "status": "success",
        "engine": "deterministic_offline_ai",
        "impact": impact_data,
        "scientific_formulae": {
            "pm25_avoided_formula": "Delta Inhaled Dose = Sum_i [ V_E,i * t_i * C_ambient * Delta_eta_filter,i ] * Vulnerability_Factor",
            "co2_emissions_formula": "Delta CO2e = Sum_j [ Delta_EF_j * Activity_Volume_j * Days_per_Year ]",
            "trees_planted_factor": "1 Mature Urban Tree = 21.77 kg CO2 / year (US EPA Greenhouse Gas Equivalencies Protocol)",
            "minute_ventilation_basis": "Adult rest: 0.45 m3/h | Active transit: 1.08 m3/h | Aerobic exercise: 2.4 m3/h"
        }
    }
