"""
AeroShield AI - Scientific Impact & Atmospheric Modeling Engine
Provides mathematical models for:
- Diurnal winter thermal inversion and AQI forecasting
- Minute ventilation volume and PM2.5 internal inhaled dose avoided
- CO2e emissions reduction and EPA equivalent tree calculations
- Corsi-Rosenthal DIY Box filter CADR and ACH sizing
"""

from typing import Dict, Any, List


# Pre-calibrated city profiles for Indian urban winter smog hotspots
CITY_PRESETS: Dict[str, Dict[str, Any]] = {
    "delhi": {
        "name": "Delhi NCR (Capital Region)",
        "state": "National Capital Region",
        "base_aqi": 385,
        "base_pm25": 285.0,  # ug/m3
        "inversion_morning_peak": "07:30",
        "inversion_evening_peak": "20:00",
        "optimal_ventilation_window": "12:30 - 15:00",
        "grap_stage": "GRAP Stage III / IV Active (Severe Smog Protocol)",
        "primary_sources": ["Crop residue stubble burning (Parali)", "Vehicular corridor exhaust", "Road dust re-suspension", "Gangetic radiation inversion trap"],
        "temp_min_c": 6.5,
        "temp_max_c": 21.0
    },
    "mumbai": {
        "name": "Mumbai, Maharashtra",
        "state": "Maharashtra",
        "base_aqi": 195,
        "base_pm25": 115.0,
        "inversion_morning_peak": "08:00",
        "inversion_evening_peak": "20:30",
        "optimal_ventilation_window": "13:00 - 16:00",
        "grap_stage": "Coastal Advisory Active (Moderate-Poor)",
        "primary_sources": ["Construction dust", "Heavy coastal traffic corridor", "Sea breeze inversion barrier", "Refinery emissions"],
        "temp_min_c": 17.0,
        "temp_max_c": 31.0
    },
    "kolkata": {
        "name": "Kolkata, West Bengal",
        "state": "West Bengal",
        "base_aqi": 275,
        "base_pm25": 185.0,
        "inversion_morning_peak": "07:00",
        "inversion_evening_peak": "20:00",
        "optimal_ventilation_window": "12:30 - 15:00",
        "grap_stage": "High Stagnation Alert (Poor-Very Poor)",
        "primary_sources": ["Solid waste open burning", "Commercial diesel freight", "Winter boundary layer compression", "Brick kilns"],
        "temp_min_c": 13.0,
        "temp_max_c": 26.0
    },
    "bengaluru": {
        "name": "Bengaluru, Karnataka",
        "state": "Karnataka",
        "base_aqi": 135,
        "base_pm25": 52.0,
        "inversion_morning_peak": "08:30",
        "inversion_evening_peak": "19:30",
        "optimal_ventilation_window": "12:00 - 15:30",
        "grap_stage": "Moderate Plateau Smog Advisory",
        "primary_sources": ["Vehicular bottlenecks (ORR & Silk Board)", "Road dust", "Unpaved construction fringes"],
        "temp_min_c": 15.0,
        "temp_max_c": 28.0
    },
    "hyderabad": {
        "name": "Hyderabad, Telangana",
        "state": "Telangana",
        "base_aqi": 165,
        "base_pm25": 84.0,
        "inversion_morning_peak": "08:00",
        "inversion_evening_peak": "20:00",
        "optimal_ventilation_window": "12:30 - 15:30",
        "grap_stage": "Deccan Stagnation Advisory",
        "primary_sources": ["Industrial clusters (Pashamylaram/Jeedimetla)", "Two-wheeler fleet exhaust", "Construction corridors"],
        "temp_min_c": 14.0,
        "temp_max_c": 29.0
    },
    "chennai": {
        "name": "Chennai, Tamil Nadu",
        "state": "Tamil Nadu",
        "base_aqi": 120,
        "base_pm25": 44.0,
        "inversion_morning_peak": "08:00",
        "inversion_evening_peak": "19:00",
        "optimal_ventilation_window": "12:30 - 16:00",
        "grap_stage": "Coromandel Coastal Advisory",
        "primary_sources": ["Heavy transport corridor (Ennore & Manali)", "Vehicular exhaust", "High coastal humidity aerosol growth"],
        "temp_min_c": 21.0,
        "temp_max_c": 30.0
    },
    "lucknow": {
        "name": "Lucknow, Uttar Pradesh",
        "state": "Uttar Pradesh",
        "base_aqi": 365,
        "base_pm25": 265.0,
        "inversion_morning_peak": "07:30",
        "inversion_evening_peak": "20:30",
        "optimal_ventilation_window": "12:30 - 15:00",
        "grap_stage": "GRAP Stage III Active (Severe Winter Smog)",
        "primary_sources": ["Gangetic plain radiation fog/smog trap", "Biomass Chulha burning", "Transit bottlenecks", "Agricultural burning"],
        "temp_min_c": 7.0,
        "temp_max_c": 22.0
    },
    "patna": {
        "name": "Patna, Bihar",
        "state": "Bihar",
        "base_aqi": 375,
        "base_pm25": 278.0,
        "inversion_morning_peak": "07:00",
        "inversion_evening_peak": "20:00",
        "optimal_ventilation_window": "12:30 - 15:00",
        "grap_stage": "GRAP Stage III Active (Severe Basin Trap)",
        "primary_sources": ["Ganges river basin boundary layer collapse", "Solid fuel domestic cooking", "Diesel autos & tempos"],
        "temp_min_c": 8.0,
        "temp_max_c": 23.0
    },
    "ahmedabad": {
        "name": "Ahmedabad, Gujarat",
        "state": "Gujarat",
        "base_aqi": 235,
        "base_pm25": 145.0,
        "inversion_morning_peak": "08:00",
        "inversion_evening_peak": "20:00",
        "optimal_ventilation_window": "13:00 - 15:30",
        "grap_stage": "Industrial Corridor Poor AQI Alert",
        "primary_sources": ["Industrial emissions (Vatva/Naroda)", "Vehicular exhaust", "Arid dust transport"],
        "temp_min_c": 12.0,
        "temp_max_c": 29.0
    },
    "varanasi": {
        "name": "Varanasi, Uttar Pradesh",
        "state": "Uttar Pradesh",
        "base_aqi": 320,
        "base_pm25": 225.0,
        "inversion_morning_peak": "07:00",
        "inversion_evening_peak": "20:30",
        "optimal_ventilation_window": "12:30 - 15:00",
        "grap_stage": "Middle Gangetic Inversion Alert",
        "primary_sources": ["River basin thermal fog-smog trap", "Dense urban old city stagnation", "Biomass solid fuel combustion"],
        "temp_min_c": 8.5,
        "temp_max_c": 24.0
    }
}

# EPA PM2.5 Breakpoints (ug/m3 -> AQI)
AQI_BREAKPOINTS = [
    (0.0, 12.0, 0, 50, "Good", "#22C55E"),
    (12.1, 35.4, 51, 100, "Moderate", "#EAB308"),
    (35.5, 55.4, 101, 150, "Unhealthy for Sensitive Groups", "#F97316"),
    (55.5, 150.4, 151, 200, "Unhealthy", "#EF4444"),
    (150.5, 250.4, 201, 300, "Very Unhealthy", "#A855F7"),
    (250.5, 500.4, 301, 500, "Hazardous / Severe", "#7E22CE"),
]


def calculate_aqi_from_pm25(pm25: float) -> Dict[str, Any]:
    """
    Standard linear interpolation formula for AQI index:
    I = [(I_hi - I_lo) / (BP_hi - BP_lo)] * (C - BP_lo) + I_lo
    """
    c = max(0.0, round(pm25, 1))
    
    for bp_lo, bp_hi, i_lo, i_hi, category, color in AQI_BREAKPOINTS:
        if bp_lo <= c <= bp_hi:
            aqi = round(((i_hi - i_lo) / (bp_hi - bp_lo)) * (c - bp_lo) + i_lo)
            return {
                "aqi": aqi,
                "pm25": c,
                "category": category,
                "color": color
            }
            
    # Above max breakpoint (> 500 ug/m3)
    extra_aqi = min(800, 500 + int((c - 500.4) * 0.8))
    return {
        "aqi": extra_aqi,
        "pm25": c,
        "category": "Emergency / Hazardous",
        "color": "#4C1D95"
    }


def generate_diurnal_curve(base_pm25: float) -> List[Dict[str, Any]]:
    """
    Simulates the 24-hour diurnal winter smog profile driven by boundary layer dynamics.
    Solar mixing height collapses at night (<100m) and expands midday (1200m).
    """
    # Diurnal multiplier curve based on atmospheric stability class
    diurnal_factors = [
        1.35, 1.40, 1.45, 1.50, 1.55, 1.65,  # 00:00 - 05:00: Deep night inversion
        1.75, 1.85, 1.70, 1.40, 1.10, 0.85,  # 06:00 - 11:00: Morning rush + inversion trap breaking
        0.65, 0.60, 0.65, 0.75, 0.95, 1.25,  # 12:00 - 17:00: Solar convective aeration window
        1.55, 1.70, 1.65, 1.50, 1.45, 1.38   # 18:00 - 23:00: Evening radiation inversion + rush
    ]
    
    curve = []
    for hour in range(24):
        factor = diurnal_factors[hour]
        hour_pm = round(base_pm25 * factor, 1)
        aqi_info = calculate_aqi_from_pm25(hour_pm)
        
        # Categorize inversion stage
        if 5 <= hour <= 9:
            inversion_stage = "Severe Morning Inversion Trap"
        elif 12 <= hour <= 15:
            inversion_stage = "Convective Mixing Window (Best Aeration)"
        elif 17 <= hour <= 21:
            inversion_stage = "Evening Radiation Inversion Spike"
        else:
            inversion_stage = "Nocturnal Atmospheric Stagnation"
            
        curve.append({
            "hour": hour,
            "time_str": f"{hour:02d}:00",
            "pm25": hour_pm,
            "aqi": aqi_info["aqi"],
            "category": aqi_info["category"],
            "color": aqi_info["color"],
            "inversion_stage": inversion_stage,
            "can_ventilate": (12 <= hour <= 15)
        })
        
    return curve


def calculate_impact(
    profile: Dict[str, Any],
    selected_routines: List[str],
    selected_alternatives: List[str]
) -> Dict[str, Any]:
    """
    Compute rigorous physical impact:
    1. PM2.5 internal inhaled dose avoided (micrograms/day)
    2. CO2e emissions reduction (kg/year)
    3. EPA Equivalent Trees Planted
    """
    city_key = str(profile.get("city", "delhi")).lower().strip()
    city_data = CITY_PRESETS.get(city_key, CITY_PRESETS["delhi"])
    custom_val = profile.get("custom_pm25")
    ambient_pm25 = float(custom_val if custom_val is not None else city_data["base_pm25"])
    
    children_count = max(0, int(profile.get("children", 0)))
    elderly_count = max(0, int(profile.get("elderly", 0)))
    has_respiratory = bool(profile.get("respiratory_sensitivity", False))
    commute_type = str(profile.get("commute_type", "two_wheeler")).lower()
    heating_type = str(profile.get("heating_type", "lpg")).lower()
    
    # -------------------------------------------------------------------------
    # 1. PM2.5 INHALATION DOSE AVOIDED CALCULATION
    # Formula: Inhaled Dose = V_E (m3/h) * time (h) * Concentration (ug/m3) * (1 - filter_eff)
    # -------------------------------------------------------------------------
    
    # Baseline ventilation rates (m3/hour)
    # Adult resting: 0.45 m3/h, commute: 1.08 m3/h (two-wheeler), 1.92 m3/h (cycling)
    commute_ve_table = {
        "walking_cycling": 1.92,
        "two_wheeler": 1.08,
        "open_auto": 0.85,
        "public_bus": 0.72,
        "metro": 0.70,
        "car": 0.65,
        "remote": 0.45
    }
    commute_ve = commute_ve_table.get(commute_type, 1.0)
    commute_hours = 1.5  # Average daily roundtrip commute
    
    # Exposure micro-environment concentration factors
    commute_exposure_factor = {
        "walking_cycling": 1.25,  # Roadside plume exposure
        "two_wheeler": 1.35,      # Direct tailpipe plume
        "open_auto": 1.20,
        "public_bus": 0.90,
        "metro": 0.40,            # Filtered stations
        "car": 0.70,              # Cabin filter
        "remote": 0.35
    }.get(commute_type, 1.0)
    
    # Baseline daily inhaled dose without mitigation (ug/day)
    # Indoor baseline (14 hours): indoor PM2.5 typically ~65% of outdoor in unsealed homes
    # Sleep (8 hours): ~55% of outdoor
    # Commute (1.5 hours): ambient * commute factor
    commute_inhaled_base = commute_ve * commute_hours * (ambient_pm25 * commute_exposure_factor)
    indoor_inhaled_base = (0.65 * 14.5 * (ambient_pm25 * 0.65)) + (0.45 * 8.0 * (ambient_pm25 * 0.55))
    total_baseline_dose = commute_inhaled_base + indoor_inhaled_base
    
    # Calculate avoided dose based on selected active routines
    avoided_dose = 0.0
    
    # Impact of N95 mask / Masked commute
    if "mask_commute" in selected_routines or "rescheduled_commute" in selected_routines:
        # N95 filters 95% of particulate in commute
        mask_savings = commute_inhaled_base * 0.90
        avoided_dose += mask_savings

    # Impact of DIY Corsi-Rosenthal Box / HEPA Indoor Filtration
    if "corsi_box_filtration" in selected_routines or "indoor_hepa" in selected_routines:
        # Reduces indoor concentration from 65% down to 15% of ambient
        indoor_purifier_savings = indoor_inhaled_base * 0.72
        avoided_dose += indoor_purifier_savings
        
    # Impact of Shifting Morning Jog / Aerobic Exercise Indoors
    if "shift_morning_exercise" in selected_routines:
        # Avoids 1 hour of high ventilation (2.4 m3/h) in severe morning peak (ambient * 1.7)
        exercise_savings = 1.0 * 2.4 * (ambient_pm25 * 1.7) * 0.80
        avoided_dose += exercise_savings

    # Impact of Midday Timed Ventilation Window (avoids indoor CO2 and PM buildup)
    if "timed_ventilation" in selected_routines:
        # Prevents late-afternoon indoor re-accumulation
        vent_savings = indoor_inhaled_base * 0.12
        avoided_dose += vent_savings

    # Impact of Humidity Control (40-50% RH)
    if "humidity_control" in selected_routines:
        # Accelerates Stokes settling velocity of fine aerosol particles
        settling_savings = indoor_inhaled_base * 0.10
        avoided_dose += settling_savings

    # Additional family scaling for vulnerable members
    family_vulnerability_multiplier = 1.0
    if children_count > 0:
        family_vulnerability_multiplier += (children_count * 0.35)
    if elderly_count > 0:
        family_vulnerability_multiplier += (elderly_count * 0.25)
    if has_respiratory:
        family_vulnerability_multiplier += 0.40

    total_pm25_avoided_ug_day = round(avoided_dose * family_vulnerability_multiplier, 1)

    # -------------------------------------------------------------------------
    # 2. CO2e EMISSIONS SAVED CALCULATION (kg CO2e / year)
    # -------------------------------------------------------------------------
    co2e_saved_kg_year = 0.0
    
    # Transit swaps
    if "swap_metro_transit" in selected_alternatives or "swap_public_transit" in selected_alternatives:
        # Commute 24 km/day * 250 days = 6000 km/year
        # Car (192 g/km) -> Metro (28 g/km) = 164 g/km saved -> 984 kg/yr
        # Two wheeler (85 g/km) -> Metro (28 g/km) = 57 g/km saved -> 342 kg/yr
        if commute_type in ["car", "taxi"]:
            co2e_saved_kg_year += 984.0
        elif commute_type in ["two_wheeler", "open_auto"]:
            co2e_saved_kg_year += 342.0
        else:
            co2e_saved_kg_year += 250.0

    if "swap_ev_micromobility" in selected_alternatives:
        # EV two-wheeler or e-bike vs ICE
        co2e_saved_kg_year += 295.0

    if "community_carpooling" in selected_alternatives:
        # 4-into-1 carpool
        co2e_saved_kg_year += 620.0

    # Household heating / cooking swaps
    if "swap_induction_cooking" in selected_alternatives:
        if heating_type in ["wood_coal", "chulha"]:
            # Biomass replacement: massive 950 kg CO2e + black carbon avoided
            co2e_saved_kg_year += 950.0
        elif heating_type in ["kerosene", "gas_furnace"]:
            co2e_saved_kg_year += 520.0
        else:
            co2e_saved_kg_year += 240.0

    if "swap_smart_heating_weatherstrip" in selected_alternatives:
        # Eliminates winter draft heat loss (25% reduction in thermal energy requirement)
        co2e_saved_kg_year += 310.0

    if "anti_biomass_composting" in selected_alternatives:
        # Neighborhood leaf mulch pit vs burning dry leaves
        co2e_saved_kg_year += 180.0

    if "community_clean_air_hub" in selected_alternatives:
        # Consolidated air purification space efficiency
        co2e_saved_kg_year += 140.0

    co2e_saved_kg_year = round(co2e_saved_kg_year, 1)

    # -------------------------------------------------------------------------
    # 3. EQUIVALENT TREES PLANTED (EPA Sequestration Factor: 21.77 kg CO2 / tree / year)
    # -------------------------------------------------------------------------
    EPA_TREE_SEQUESTRATION_KG_YR = 21.77
    trees_equivalent = round(co2e_saved_kg_year / EPA_TREE_SEQUESTRATION_KG_YR, 1)

    # Inhalation reduction percentage
    inhalation_reduction_pct = round(min(92.0, (avoided_dose / max(1.0, total_baseline_dose)) * 100), 1)

    return {
        "pm25_avoided_ug_day": total_pm25_avoided_ug_day,
        "co2e_saved_kg_year": co2e_saved_kg_year,
        "trees_equivalent": trees_equivalent,
        "inhalation_reduction_pct": inhalation_reduction_pct,
        "baseline_dose_ug_day": round(total_baseline_dose, 1),
        "vulnerability_multiplier": round(family_vulnerability_multiplier, 2),
        "city": city_data["name"],
        "ambient_pm25": ambient_pm25
    }


def calculate_corsi_rosenthal_specs(
    room_sqft: float,
    ceiling_height_ft: float = 9.0,
    fan_type: str = "lasko_20_box",
    filter_count: int = 4,
    filter_merv: int = 13
) -> Dict[str, Any]:
    """
    Engineering calculations for DIY Corsi-Rosenthal Box Air Cleaner:
    Computes Clean Air Delivery Rate (CADR), Air Changes per Hour (ACH),
    and cost comparison against commercial HEPA systems.
    """
    room_sqft = max(50.0, min(3000.0, float(room_sqft)))
    ceiling_height_ft = max(7.0, min(16.0, float(ceiling_height_ft)))
    room_volume_cuft = room_sqft * ceiling_height_ft
    
    # Fan airflow characteristics under MERV 13 static pressure drop (Delta P ~ 0.08 in H2O)
    base_cfm = 600.0 if filter_count >= 4 else 420.0
    if filter_count == 5:
        base_cfm = 660.0  # Tower design (5 filters) offers lowest face velocity
        
    # Filter efficiency by MERV rating for PM2.5 (0.3 - 1.0 micron particles)
    merv_efficiency = {
        11: 0.65,
        12: 0.75,
        13: 0.85,
        14: 0.90,
        16: 0.95
    }.get(filter_merv, 0.85)

    cadr_cfm = round(base_cfm * merv_efficiency, 1)
    
    # Air Changes per Hour (ACH) = (CADR * 60) / Room Volume
    ach = round((cadr_cfm * 60.0) / room_volume_cuft, 2)
    
    # Smog Protection Rating based on ACH
    if ach >= 6.0:
        protection_rating = "Exceptional (Hospital/Isolation Grade)"
        rating_color = "#22C55E"
    elif ach >= 4.0:
        protection_rating = "Optimal (Recommended for Heavy Winter Smog)"
        rating_color = "#38BDF8"
    elif ach >= 2.5:
        protection_rating = "Moderate (Acceptable for Light Smog)"
        rating_color = "#EAB308"
    else:
        protection_rating = "Sub-optimal (Consider Adding a Second Box Fan Unit)"
        rating_color = "#EF4444"

    # Financial Cost Estimation (USD & Indian Rupee ₹ conversion @ ₹86/USD)
    fan_cost = 24.0
    filter_cost_each = 9.50
    tape_and_shroud_cost = 6.0
    total_diy_cost = round(fan_cost + (filter_count * filter_cost_each) + tape_and_shroud_cost, 2)
    
    # Commercial HEPA unit with comparable CADR (~450 - 550 CFM)
    commercial_hepa_cost = 480.0
    cost_savings_usd = round(commercial_hepa_cost - total_diy_cost, 2)
    cost_savings_pct = round((cost_savings_usd / commercial_hepa_cost) * 100, 1)

    diy_cost_inr = round(total_diy_cost * 86.0)
    commercial_cost_inr = round(commercial_hepa_cost * 86.0)
    savings_inr = commercial_cost_inr - diy_cost_inr

    return {
        "room_sqft": room_sqft,
        "ceiling_height_ft": ceiling_height_ft,
        "room_volume_cuft": round(room_volume_cuft, 1),
        "fan_cfm_delivered": base_cfm,
        "filter_merv": filter_merv,
        "filter_efficiency_pct": int(merv_efficiency * 100),
        "cadr_cfm": cadr_cfm,
        "ach": ach,
        "protection_rating": protection_rating,
        "rating_color": rating_color,
        "diy_cost_usd": total_diy_cost,
        "commercial_cost_usd": commercial_hepa_cost,
        "cost_savings_usd": cost_savings_usd,
        "cost_savings_pct": cost_savings_pct,
        "diy_cost_inr": diy_cost_inr,
        "commercial_cost_inr": commercial_cost_inr,
        "savings_inr": savings_inr,
        "filters_required": filter_count,
        "lifespan_months": "3 - 5 months during active smog season"
    }
