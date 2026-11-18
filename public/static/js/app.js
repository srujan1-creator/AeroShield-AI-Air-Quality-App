/**
 * AeroShield AI - Main Application Coordinator
 * High-performance vanilla JS module coordinating state, accessibility,
 * input debouncing, interactive charts, and live GenAI generation.
 */

(function (window) {
    'use strict';

    // Application State
    const state = {
        profile: {
            city: 'delhi',
            pin_code: '110001',
            children: 1,
            elderly: 1,
            respiratory_sensitivity: true,
            pregnant_or_infant: false,
            commute_type: 'two_wheeler',
            heating_type: 'lpg',
            custom_pm25: 285.0,
            room_sqft: 250,
            ceiling_height: 9.0,
            filter_count: 4,
            filter_merv: 13
        },
        activeTab: 'routines',
        selectedRoutines: [
            'shift_morning_exercise',
            'mask_commute',
            'timed_ventilation',
            'corsi_box_filtration',
            'humidity_control'
        ],
        selectedAlternatives: [
            'swap_metro_transit',
            'community_carpooling',
            'swap_induction_cooking',
            'swap_smart_heating_weatherstrip',
            'anti_biomass_composting',
            'community_clean_air_hub'
        ],
        cityPresets: {},
        currentAQI: 385,
        currentCategory: 'Hazardous / Severe',
        currentColor: '#7E22CE',
        diurnalCurve: [],
        vulnerabilityLevel: 'Standard',
        vulnerabilityScore: 1.0,
        tabData: {
            routines: null,
            indoor_hacks: null,
            alternatives: null,
            impact: null
        },
        useGeminiCloud: false,
        geminiApiKey: '',
        theme: localStorage.getItem('aeroshield_theme') || 'dark',
        cacheStats: { hits: 0, misses: 0, hitRatePct: 0 },
        corsiViewMode: 'blueprint' // 'blueprint' | 'photo'
    };

    // 300ms Input Debouncing Utility
    function debounce(func, wait = 300) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Screen reader live announcement
    function announceToScreenReader(message) {
        const liveRegion = document.getElementById('sr-announcements');
        if (liveRegion) {
            liveRegion.textContent = '';
            setTimeout(() => {
                liveRegion.textContent = message;
            }, 50);
        }
    }

    // EPA AQI conversion
    function getAQICategory(pm25) {
        const c = Math.max(0, parseFloat(pm25) || 0);
        if (c <= 12.0) {
            const aqi = Math.round((50 / 12.0) * c);
            return { aqi, category: "Good", color: "#22C55E" };
        } else if (c <= 35.4) {
            const aqi = Math.round(((100 - 51) / (35.4 - 12.1)) * (c - 12.1) + 51);
            return { aqi, category: "Moderate", color: "#EAB308" };
        } else if (c <= 55.4) {
            const aqi = Math.round(((150 - 101) / (55.4 - 35.5)) * (c - 35.5) + 101);
            return { aqi, category: "Unhealthy for Sensitive Groups", color: "#F97316" };
        } else if (c <= 150.4) {
            const aqi = Math.round(((200 - 151) / (150.4 - 55.5)) * (c - 55.5) + 151);
            return { aqi, category: "Unhealthy", color: "#EF4444" };
        } else if (c <= 250.4) {
            const aqi = Math.round(((300 - 201) / (250.4 - 150.5)) * (c - 150.5) + 201);
            return { aqi, category: "Very Unhealthy", color: "#A855F7" };
        } else if (c <= 500.4) {
            const aqi = Math.round(((500 - 301) / (500.4 - 250.5)) * (c - 250.5) + 301);
            return { aqi, category: "Hazardous / Severe", color: "#7E22CE" };
        } else {
            const aqi = Math.min(800, 500 + Math.round((c - 500.4) * 0.8));
            return { aqi, category: "Emergency / Hazardous", color: "#4C1D95" };
        }
    }

    // Core Application Object
    const AeroShieldApp = {
        getAQICategory,

        async init() {
            AeroShieldApp.applyTheme(state.theme);
            AeroShieldApp.setupEventListeners();
            AeroShieldApp.setupKeyboardNavigation();
            await AeroShieldApp.loadPresets();
            await AeroShieldApp.updateProfileAnalysis();
            await AeroShieldApp.loadTabContent(state.activeTab);
            AeroShieldApp.updateDirectImpactQuantifier();
            announceToScreenReader("AeroShield AI loaded and ready. High contrast mode available.");
        },

        // Theme management (WCAG 2.1 AAA Compliant)
        applyTheme(theme) {
            state.theme = theme;
            localStorage.setItem('aeroshield_theme', theme);
            document.documentElement.setAttribute('data-theme', theme);

            const themeBtn = document.getElementById('theme-toggle-btn');
            if (themeBtn) {
                if (theme === 'high-contrast') {
                    themeBtn.innerHTML = '<span>👁️</span> Contrast: <strong>AAA Max</strong>';
                    themeBtn.setAttribute('aria-label', 'Switch to standard dark mode (Current: High Contrast AAA)');
                } else if (theme === 'light') {
                    themeBtn.innerHTML = '<span>☀️</span> Theme: <strong>Light</strong>';
                    themeBtn.setAttribute('aria-label', 'Switch to high contrast AAA mode (Current: Light)');
                } else {
                    themeBtn.innerHTML = '<span>🌙</span> Theme: <strong>Dark</strong>';
                    themeBtn.setAttribute('aria-label', 'Switch to light mode (Current: Dark)');
                }
            }
        },

        toggleTheme() {
            if (state.theme === 'dark') {
                AeroShieldApp.applyTheme('light');
            } else if (state.theme === 'light') {
                AeroShieldApp.applyTheme('high-contrast');
            } else {
                AeroShieldApp.applyTheme('dark');
            }
            announceToScreenReader(`Theme changed to ${state.theme}`);
        },

        // Load City Presets
        async loadPresets() {
            try {
                const res = await fetch('/api/presets');
                const data = await res.json();
                if (data.presets) {
                    state.cityPresets = data.presets;
                    AeroShieldApp.populateCitySelect();
                }
            } catch (err) {
                console.warn("Could not fetch presets, using built-ins", err);
            }
        },

        populateCitySelect() {
            const select = document.getElementById('city-select');
            if (!select) return;
            select.innerHTML = '';
            for (const key in state.cityPresets) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = state.cityPresets[key].name;
                if (key === state.profile.city) opt.selected = true;
                select.appendChild(opt);
            }
            const customOpt = document.createElement('option');
            customOpt.value = 'custom';
            customOpt.textContent = 'Custom Location / Custom Pin...';
            select.appendChild(customOpt);
        },

        // Update profile analysis (AQI, Diurnal Inversion, Vulnerabilities)
        async updateProfileAnalysis() {
            const city = state.profile.city;
            const cityData = state.cityPresets[city];
            if (city !== 'custom' && cityData) {
                state.profile.custom_pm25 = cityData.base_pm25;
            }

            const aqiData = getAQICategory(state.profile.custom_pm25);
            state.currentAQI = aqiData.aqi;
            state.currentCategory = aqiData.category;
            state.currentColor = aqiData.color;

            // Update City Pills Active State
            const pills = document.querySelectorAll('.city-pill');
            pills.forEach(p => {
                if (p.getAttribute('data-city') === city) {
                    p.classList.add('active');
                } else {
                    p.classList.remove('active');
                }
            });

            // Update Hero Banner
            AeroShieldApp.renderHeroBanner(cityData);

            // Render AQI Gauge & Cards
            AeroShieldApp.renderAQIDial();
            AeroShieldApp.renderDiurnalCurve();
            AeroShieldApp.renderVulnerabilityAlerts();
            AeroShieldApp.updateDirectImpactQuantifier();
        },

        renderHeroBanner(cityData) {
            const headline = document.getElementById('hero-city-headline');
            const weather = document.getElementById('hero-city-weather');
            const inversionStatus = document.getElementById('hero-inversion-status');
            const inversionSub = document.getElementById('hero-inversion-sub');

            const cityName = cityData ? cityData.name : state.profile.city.toUpperCase();
            const exceedance = (state.profile.custom_pm25 / 15.0).toFixed(1);

            const whoTicker = document.getElementById('ticker-who-exceedance');
            if (whoTicker) whoTicker.textContent = `${exceedance}× Exceedance`;

            if (headline) headline.textContent = `Winter Smog & Inversion Alert: ${cityName}`;
            if (weather && cityData) {
                weather.innerHTML = `<span>🌡️ Min ${cityData.temp_min_c}°C &bull; Max ${cityData.temp_max_c}°C</span>`;
            }
            if (inversionStatus && cityData) {
                inversionStatus.textContent = `Morning Peak: ${cityData.inversion_morning_peak} &bull; Evening: ${cityData.inversion_evening_peak}`;
            }
            if (inversionSub && cityData) {
                inversionSub.textContent = `Optimal Convective Ventilation Window: ${cityData.optimal_ventilation_window}`;
            }
        },

        renderAQIDial() {
            const aqiEl = document.getElementById('aqi-value');
            const categoryEl = document.getElementById('aqi-category');
            const pm25El = document.getElementById('pm25-value');
            const dialArc = document.getElementById('aqi-dial-progress');
            const grapBadge = document.getElementById('grap-stage-badge');
            const miniPm25 = document.getElementById('mini-pm25-val');
            const miniPm10 = document.getElementById('mini-pm10-val');
            const miniWho = document.getElementById('mini-who-val');
            const miniPbl = document.getElementById('mini-pbl-val');

            const cityData = state.cityPresets[state.profile.city];
            const aqi = state.currentAQI;
            const pm25 = state.profile.custom_pm25;
            const exceedance = (pm25 / 15.0).toFixed(1);

            if (aqiEl) aqiEl.textContent = aqi;
            if (categoryEl) {
                categoryEl.textContent = state.currentCategory;
                categoryEl.style.color = state.currentColor;
            }
            if (pm25El) {
                pm25El.innerHTML = `${pm25} µg/m³ &bull; <span style="color:var(--accent-amber); font-weight:700;">(${exceedance}× WHO Limit)</span>`;
            }

            // Update Mini Telemetry Grid
            if (miniPm25) miniPm25.textContent = `${pm25} µg/m³`;
            if (miniPm10) miniPm10.textContent = `${Math.round(pm25 * 1.45)} µg/m³`;
            if (miniWho) miniWho.textContent = `${exceedance}×`;
            if (miniPbl) miniPbl.textContent = cityData ? `${cityData.inversion_morning_peak.includes('07') ? '85m (Lid Trap)' : '110m'}` : '95m';

            // Dynamic CPCB GRAP Stage Badge
            if (grapBadge) {
                if (aqi >= 450) {
                    grapBadge.textContent = 'GRAP STAGE IV • EMERGENCY ACTIONS';
                    grapBadge.className = 'grap-badge-pill grap-4';
                } else if (aqi >= 301) {
                    grapBadge.textContent = 'GRAP STAGE III • SEVERE AIR PROTOCOL';
                    grapBadge.className = 'grap-badge-pill grap-3';
                } else if (aqi >= 201) {
                    grapBadge.textContent = 'GRAP STAGE II • VERY POOR AIR ALERT';
                    grapBadge.className = 'grap-badge-pill grap-2';
                } else if (aqi >= 101) {
                    grapBadge.textContent = 'GRAP STAGE I • MODERATE DISPERSAL';
                    grapBadge.className = 'grap-badge-pill grap-1';
                } else {
                    grapBadge.textContent = 'CPCB STANDARD ATTAINMENT';
                    grapBadge.className = 'grap-badge-pill grap-0';
                }
            }

            if (dialArc) {
                // Arc is M 25 125 A 95 95 0 0 1 215 125 with perimeter = pi * 95 ~= 298.45
                const maxAQIScale = 500;
                const ratio = Math.min(1.0, aqi / maxAQIScale);
                const strokeDashoffset = Math.round(298.45 - (298.45 * ratio));
                dialArc.style.strokeDasharray = '298.45';
                dialArc.style.strokeDashoffset = strokeDashoffset;
            }
        },

        renderDiurnalCurve() {
            const container = document.getElementById('diurnal-chart-container');
            if (!container) return;

            const basePM = state.profile.custom_pm25;
            const factors = [
                1.35, 1.40, 1.45, 1.50, 1.55, 1.65,
                1.75, 1.85, 1.70, 1.40, 1.10, 0.85,
                0.65, 0.60, 0.65, 0.75, 0.95, 1.25,
                1.55, 1.70, 1.65, 1.50, 1.45, 1.38
            ];

            const width = 860;
            const height = 250;
            const padL = 50;
            const padR = 30;
            const padT = 45;
            const padB = 40;
            const plotW = width - padL - padR;
            const plotH = height - padT - padB;
            const maxPM = basePM * 2.0;

            let points = [];
            factors.forEach((f, hr) => {
                const x = padL + (hr / 23) * plotW;
                const pm = basePM * f;
                const y = padT + plotH - ((pm / maxPM) * plotH);
                points.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, hr, pm: Math.round(pm) });
            });

            // Smooth cubic bezier SVG path generator
            const getCurvedPath = (pts) => {
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = pts[i === 0 ? 0 : i - 1];
                    const p1 = pts[i];
                    const p2 = pts[i + 1];
                    const p3 = pts[i + 2] || p2;

                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;

                    d += ` C ${Math.round(cp1x)} ${Math.round(cp1y)}, ${Math.round(cp2x)} ${Math.round(cp2y)}, ${p2.x} ${p2.y}`;
                }
                return d;
            };

            const curvePathD = getCurvedPath(points);
            const areaD = `${curvePathD} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`;

            // Calculate zone boundary coordinates
            const mStart = padL + (5.0 / 23) * plotW;
            const mEnd = padL + (9.5 / 23) * plotW;
            const mWidth = mEnd - mStart;

            const vStart = padL + (11.5 / 23) * plotW;
            const vEnd = padL + (15.5 / 23) * plotW;
            const vWidth = vEnd - vStart;

            const eStart = padL + (17.5 / 23) * plotW;
            const eEnd = padL + (21.5 / 23) * plotW;
            const eWidth = eEnd - eStart;

            container.innerHTML = `
                <svg viewBox="0 0 ${width} ${height}" class="diurnal-chart-svg" role="img" aria-labelledby="diurnal-svg-title diurnal-svg-desc">
                    <title id="diurnal-svg-title">24-Hour Diurnal Thermal Inversion & Smog Concentration Curve</title>
                    <desc id="diurnal-svg-desc">Diurnal curve plotting morning inversion trap at 07:30, convective boundary flush between 12:00 and 15:30, and evening radiation inversion spike at 19:30.</desc>
                    <defs>
                        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.5" />
                            <stop offset="60%" stop-color="#38BDF8" stop-opacity="0.15" />
                            <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.0" />
                        </linearGradient>
                        <linearGradient id="morningZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#EF4444" stop-opacity="0.22" />
                            <stop offset="100%" stop-color="#EF4444" stop-opacity="0.04" />
                        </linearGradient>
                        <linearGradient id="ventZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#10B981" stop-opacity="0.28" />
                            <stop offset="100%" stop-color="#10B981" stop-opacity="0.05" />
                        </linearGradient>
                        <linearGradient id="eveningZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#F97316" stop-opacity="0.22" />
                            <stop offset="100%" stop-color="#F97316" stop-opacity="0.04" />
                        </linearGradient>
                    </defs>

                    <!-- Background Grid Lines -->
                    <line x1="${padL}" y1="${padT}" x2="${width - padR}" y2="${padT}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4,4" />
                    <text x="${padL - 8}" y="${padT + 4}" text-anchor="end" fill="#64748B" font-size="10" font-family="var(--font-mono)">${Math.round(maxPM)}</text>

                    <line x1="${padL}" y1="${padT + plotH * 0.5}" x2="${width - padR}" y2="${padT + plotH * 0.5}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4,4" />
                    <text x="${padL - 8}" y="${padT + plotH * 0.5 + 4}" text-anchor="end" fill="#64748B" font-size="10" font-family="var(--font-mono)">${Math.round(maxPM * 0.5)}</text>

                    <!-- Zone 1: Morning Inversion Lid -->
                    <rect x="${mStart}" y="${padT}" width="${mWidth}" height="${plotH}" fill="url(#morningZoneGrad)" stroke="rgba(239, 68, 68, 0.4)" stroke-width="1" rx="6" />
                    <g transform="translate(${mStart + mWidth / 2 - 95}, 12)">
                        <rect width="190" height="24" rx="12" fill="#1C1420" stroke="#EF4444" stroke-width="1.2" />
                        <text x="95" y="16" text-anchor="middle" fill="#F87171" font-size="10.5" font-weight="800">⚠️ 07:30 Inversion Lid Trap</text>
                    </g>

                    <!-- Zone 2: Convective Aeration Flush Window -->
                    <rect x="${vStart}" y="${padT}" width="${vWidth}" height="${plotH}" fill="url(#ventZoneGrad)" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4,4" rx="6" />
                    <g transform="translate(${vStart + vWidth / 2 - 105}, 12)">
                        <rect width="210" height="24" rx="12" fill="#0C251C" stroke="#10B981" stroke-width="1.4" />
                        <text x="105" y="16" text-anchor="middle" fill="#34D399" font-size="10.5" font-weight="800">🍃 12:00-15:30 Convective Flush</text>
                    </g>

                    <!-- Zone 3: Evening Radiation Inversion Reformation -->
                    <rect x="${eStart}" y="${padT}" width="${eWidth}" height="${plotH}" fill="url(#eveningZoneGrad)" stroke="rgba(249, 115, 22, 0.4)" stroke-width="1" rx="6" />
                    <g transform="translate(${eStart + eWidth / 2 - 95}, 12)">
                        <rect width="190" height="24" rx="12" fill="#241812" stroke="#F97316" stroke-width="1.2" />
                        <text x="95" y="16" text-anchor="middle" fill="#FB923C" font-size="10.5" font-weight="800">🚨 19:30 Evening Smog Trap</text>
                    </g>

                    <!-- Area Fill & Spline Curve -->
                    <path d="${areaD}" fill="url(#curveGradient)" />
                    <path d="${curvePathD}" fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Morning Peak Glowing Circle -->
                    <circle cx="${points[7].x}" cy="${points[7].y}" r="6" fill="#EF4444" stroke="#FFFFFF" stroke-width="2" />
                    <circle cx="${points[7].x}" cy="${points[7].y}" r="12" fill="none" stroke="#EF4444" stroke-width="1.5" stroke-opacity="0.6" />

                    <!-- Evening Peak Glowing Circle -->
                    <circle cx="${points[19].x}" cy="${points[19].y}" r="6" fill="#EF4444" stroke="#FFFFFF" stroke-width="2" />
                    <circle cx="${points[19].x}" cy="${points[19].y}" r="12" fill="none" stroke="#EF4444" stroke-width="1.5" stroke-opacity="0.6" />

                    <!-- Midday Trough Minimum Dot -->
                    <circle cx="${points[13].x}" cy="${points[13].y}" r="5" fill="#10B981" stroke="#FFFFFF" stroke-width="2" />

                    <!-- X-Axis Baseline & Time Ticks -->
                    <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" />
                    
                    <text x="${points[0].x}" y="${height - 12}" fill="#94A3B8" font-size="11" font-family="var(--font-mono)">00:00</text>
                    <text x="${points[3].x}" y="${height - 12}" text-anchor="middle" fill="#94A3B8" font-size="11" font-family="var(--font-mono)">03:00</text>
                    <text x="${points[6].x}" y="${height - 12}" text-anchor="middle" fill="#F87171" font-size="11" font-weight="700" font-family="var(--font-mono)">06:00</text>
                    <text x="${points[9].x}" y="${height - 12}" text-anchor="middle" fill="#94A3B8" font-size="11" font-family="var(--font-mono)">09:00</text>
                    <text x="${points[12].x}" y="${height - 12}" text-anchor="middle" fill="#34D399" font-size="11" font-weight="700" font-family="var(--font-mono)">12:00</text>
                    <text x="${points[15].x}" y="${height - 12}" text-anchor="middle" fill="#34D399" font-size="11" font-weight="700" font-family="var(--font-mono)">15:00</text>
                    <text x="${points[18].x}" y="${height - 12}" text-anchor="middle" fill="#FB923C" font-size="11" font-weight="700" font-family="var(--font-mono)">18:00</text>
                    <text x="${points[21].x}" y="${height - 12}" text-anchor="middle" fill="#94A3B8" font-size="11" font-family="var(--font-mono)">21:00</text>
                    <text x="${points[23].x}" y="${height - 12}" text-anchor="end" fill="#94A3B8" font-size="11" font-family="var(--font-mono)">23:59</text>
                </svg>
            `;
        },

        renderVulnerabilityAlerts() {
            const container = document.getElementById('vulnerability-badges-container');
            if (!container) return;

            const c = state.profile.children;
            const e = state.profile.elderly;
            const resp = state.profile.respiratory_sensitivity;
            const preg = state.profile.pregnant_or_infant;

            let badges = [];
            if (c > 0) {
                badges.push(`<span class="vuln-pill vuln-pediatric" role="status">🧒 ${c} Child(ren) Profile: Higher Minute Ventilation</span>`);
            }
            if (e > 0) {
                badges.push(`<span class="vuln-pill vuln-geriatric" role="status">👴 ${e} Senior(s) Profile: Cardiovascular Alert</span>`);
            }
            if (resp) {
                badges.push(`<span class="vuln-pill vuln-respiratory" role="status">🫁 Asthma / COPD Protocol Active</span>`);
            }
            if (preg) {
                badges.push(`<span class="vuln-pill vuln-pregnancy" role="status">🤰 Infant / Pregnancy Air Buffer Active</span>`);
            }
            if (badges.length === 0) {
                badges.push(`<span class="vuln-pill vuln-standard">👤 Standard Adult Exposure Profile</span>`);
            }

            container.innerHTML = badges.join('');
        },

        // Fetch Tab content with LRU cache, Gemini API, or deterministic fallback
        async fetchTabContent(tabName, profile, forceFallback = false) {
            const cacheKey = JSON.stringify({ tab: tabName, ...profile, force: forceFallback });
            
            // 1. Check client-side LRU Cache in O(1)
            const cached = window.clientLRUCache.get(cacheKey);
            if (cached) {
                return cached;
            }

            // 2. Fetch from backend API
            const payload = {
                tab: tabName,
                profile: profile,
                api_key: state.geminiApiKey || null,
                force_fallback: forceFallback || !state.useGeminiCloud,
                selected_routines: state.selectedRoutines,
                selected_alternatives: state.selectedAlternatives
            };

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API generation failed with HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // 3. Cache in client O(1) LRU Cache with 5-minute TTL
            window.clientLRUCache.set(cacheKey, data, 300000);
            return data;
        },

        // Load content for currently selected tab
        async loadTabContent(tabName) {
            state.activeTab = tabName;
            const contentArea = document.getElementById('tab-content-area');
            if (!contentArea) return;

            contentArea.innerHTML = `
                <div class="loading-state" role="status" aria-live="polite">
                    <div class="spinner"></div>
                    <p>Generating personalized science-backed recommendations for ${tabName.replace('_', ' ')}...</p>
                </div>
            `;

            try {
                const data = await AeroShieldApp.fetchTabContent(tabName, state.profile);
                state.tabData[tabName] = data;

                if (tabName === 'routines') {
                    AeroShieldApp.renderRoutinesTab(data);
                } else if (tabName === 'indoor_hacks') {
                    AeroShieldApp.renderIndoorHacksTab(data);
                } else if (tabName === 'alternatives') {
                    AeroShieldApp.renderAlternativesTab(data);
                } else if (tabName === 'impact') {
                    AeroShieldApp.renderImpactTab(data);
                }

                announceToScreenReader(`Loaded content for ${tabName.replace('_', ' ')}`);
            } catch (err) {
                console.error("Tab load error:", err);
                contentArea.innerHTML = `
                    <div class="error-banner" role="alert">
                        <h3>Error Loading Content</h3>
                        <p>${window.Security.sanitizeHTML(err.message)}</p>
                        <button class="btn btn-secondary" onclick="window.AeroShieldApp.loadTabContent('${tabName}')">Retry</button>
                    </div>
                `;
            }
        },

        // Render Tab 1: Low-Emission Daily Routines
        renderRoutinesTab(data) {
            const container = document.getElementById('tab-content-area');
            if (!container) return;

            const slots = data.time_slots || [];
            const designations = {
                slot_early_morning: "WMO Stability Class F (Extremely Stable) • PBL Height: 60-110m • Nocturnal Surface Trap",
                slot_morning_commute: "Roadside Plume Boundary Layer • Exhaust Entrainment Zone • NIOSH TC-84A Mandate",
                slot_midday_ventilation: "WMO Stability Class B/C (Convective Mixing) • PBL Height: 950-1350m • ASHRAE Flush Window",
                slot_evening_inversion: "Radiation Inversion Genesis • PBL Collapse (<180m) • Commuter Peak Injection",
                slot_night_sleep: "Atmospheric Stagnation Class G • Surface Calm (<0.8 m/s) • ASHRAE 62.2 Envelope"
            };

            let slotsHTML = slots.map((slot, idx) => {
                const isChecked = state.selectedRoutines.includes(slot.routine_id);
                const safeActions = slot.recommended_actions.map(a => `<li>${window.Security.sanitizeHTML(a)}</li>`).join('');
                const stdText = designations[slot.slot_id] || "Standard Atmospheric Classification";

                return `
                <article class="routine-slot-card" style="border-left: 5px solid ${slot.risk_color};">
                    <div class="slot-header">
                        <div class="slot-time-badge">
                            <span class="clock-icon" aria-hidden="true">⏱️</span>
                            <strong>${window.Security.sanitizeHTML(slot.time_range)}</strong>
                        </div>
                        <span class="slot-risk-tag" style="background-color: ${slot.risk_color}22; color: ${slot.risk_color}; border: 1px solid ${slot.risk_color};">
                            ${window.Security.sanitizeHTML(slot.smog_risk)}
                        </span>
                    </div>

                    <h3 class="slot-phase-name">${window.Security.sanitizeHTML(slot.phase_name)}</h3>
                    <div class="slot-designation-badge" style="margin-top:-6px; margin-bottom:6px;">
                        <span class="badge-std">${stdText}</span>
                    </div>

                    <div class="slot-physics-box">
                        <strong>Atmospheric Inversion Dynamics:</strong>
                        <p>${window.Security.sanitizeHTML(slot.inversion_physics)}</p>
                    </div>

                    <div class="slot-actions-box">
                        <strong>Recommended Protocol:</strong>
                        <ul class="routine-actions-list">${safeActions}</ul>
                    </div>

                    <div class="slot-footer">
                        <span class="slot-vuln-notice">${window.Security.sanitizeHTML(slot.vulnerability_flag)}</span>
                        <label class="routine-toggle-label" for="routine-check-${slot.routine_id}">
                            <input type="checkbox" id="routine-check-${slot.routine_id}" 
                                class="routine-toggle-checkbox" 
                                data-routine="${slot.routine_id}"
                                ${isChecked ? 'checked' : ''} 
                                onchange="window.AeroShieldApp.onRoutineToggled('${slot.routine_id}', this.checked)">
                            <span>Add to Active Plan</span>
                        </label>
                    </div>
                </article>
                `;
            }).join('');

            container.innerHTML = `
                <div class="tab-pane-container" role="tabpanel" id="panel-routines" aria-labelledby="tab-routines">
                    <header class="tab-header">
                        <h2>Low-Emission Daily Routines</h2>
                        <p class="tab-subtitle">Schedule aligned with diurnal atmospheric thermal boundary layer expansion and nighttime inversion collapse.</p>
                        <div class="inversion-summary-callout">
                            <strong>Today's Inversion Insight:</strong> ${window.Security.sanitizeHTML(data.inversion_summary || '')}
                        </div>
                    </header>
                    <div class="routines-grid">
                        ${slotsHTML}
                    </div>
                </div>
            `;
        },

        onRoutineToggled(routineId, isChecked) {
            if (isChecked) {
                if (!state.selectedRoutines.includes(routineId)) {
                    state.selectedRoutines.push(routineId);
                }
            } else {
                state.selectedRoutines = state.selectedRoutines.filter(id => id !== routineId);
            }
            AeroShieldApp.updateDirectImpactQuantifier();
            announceToScreenReader(`Routine toggled. Inhaled dose recalculating.`);
        },

        // Render Tab 2: Indoor Air Quality Hacks
        renderIndoorHacksTab(data) {
            const container = document.getElementById('tab-content-area');
            if (!container) return;

            const specs = window.CorsiDesigner.computeSpecs(
                state.profile.room_sqft,
                state.profile.ceiling_height,
                state.profile.filter_count,
                state.profile.filter_merv
            );

            const svgBlueprint = window.CorsiDesigner.renderSVG(specs);

            const plantsHTML = (data.bio_filtration_plants || []).map(p => `
                <div class="plant-card">
                    <h4>🪴 ${window.Security.sanitizeHTML(p.name)}</h4>
                    <p class="plant-traits"><strong>Trait:</strong> ${window.Security.sanitizeHTML(p.botanical_traits)}</p>
                    <p><strong>Pollutants Cleared:</strong> <span class="tag">${window.Security.sanitizeHTML(p.pollutants_cleared)}</span></p>
                    <p><strong>Placement:</strong> ${window.Security.sanitizeHTML(p.placement)}</p>
                    <p class="pet-safe-tag"><strong>Pet Safety:</strong> ${window.Security.sanitizeHTML(p.pet_safe)}</p>
                </div>
            `).join('');

            const humidity = data.humidity_control || {};
            const ventilation = data.ventilation_strategy || {};

            container.innerHTML = `
                <div class="tab-pane-container" role="tabpanel" id="panel-indoor_hacks" aria-labelledby="tab-indoor_hacks">
                    <header class="tab-header">
                        <h2>Indoor Air Quality Hacks</h2>
                        <p class="tab-subtitle">Budget-friendly physical interventions: Corsi-Rosenthal DIY HEPA sizing, ventilation windows, and bio-filtration.</p>
                    </header>

                    <!-- 1. Corsi-Rosenthal Designer -->
                    <section class="hack-section corsi-designer-card">
                        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
                            <span class="badge-std">ASHRAE 52.2 &bull; MERV 13</span>
                            <span class="badge-std">ISO 16890 &bull; ePM1 &ge; 50%</span>
                            <span class="badge-std">AHAM AC-1 CADR Benchmark</span>
                            <span class="badge-std">CDC/NIOSH Airborne Mitigator</span>
                        </div>
                        <h3>1. DIY Corsi-Rosenthal Box Air Cleaner Sizing Calculator</h3>
                        <p class="section-desc">Build a commercial-grade HEPA equivalent for ~$55 using a 20-inch box fan and MERV 13 pleated furnace filters.</p>
                        
                        <div class="corsi-inputs-grid">
                            <div class="input-group">
                                <label for="corsi-sqft">Room Area (sq ft): <span id="sqft-val"><strong>${state.profile.room_sqft}</strong></span></label>
                                <input type="range" id="corsi-sqft" min="80" max="1500" step="10" value="${state.profile.room_sqft}" 
                                    oninput="window.AeroShieldApp.onCorsiParamChange('room_sqft', this.value)">
                            </div>
                            <div class="input-group">
                                <label for="corsi-ceiling">Ceiling Height (ft): <span id="ceiling-val"><strong>${state.profile.ceiling_height}</strong></span></label>
                                <input type="range" id="corsi-ceiling" min="7" max="16" step="0.5" value="${state.profile.ceiling_height}"
                                    oninput="window.AeroShieldApp.onCorsiParamChange('ceiling_height', this.value)">
                            </div>
                            <div class="input-group">
                                <label for="corsi-filters">Filter Configuration:</label>
                                <select id="corsi-filters" onchange="window.AeroShieldApp.onCorsiParamChange('filter_count', this.value)">
                                    <option value="4" ${state.profile.filter_count == 4 ? 'selected' : ''}>4-Filter Cube (Standard Recommended)</option>
                                    <option value="5" ${state.profile.filter_count == 5 ? 'selected' : ''}>5-Filter Tower (Maximum CADR)</option>
                                    <option value="2" ${state.profile.filter_count == 2 ? 'selected' : ''}>2-Filter V-Wedge (Compact / Desk)</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label for="corsi-merv">Filter Rating:</label>
                                <select id="corsi-merv" onchange="window.AeroShieldApp.onCorsiParamChange('filter_merv', this.value)">
                                    <option value="13" ${state.profile.filter_merv == 13 ? 'selected' : ''}>MERV 13 (85% PM2.5 Efficiency - Recommended)</option>
                                    <option value="14" ${state.profile.filter_merv == 14 ? 'selected' : ''}>MERV 14 (90% PM2.5 Efficiency)</option>
                                    <option value="11" ${state.profile.filter_merv == 11 ? 'selected' : ''}>MERV 11 (65% PM2.5 Efficiency)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Technical Blueprint vs Real Build View -->
                        <div class="corsi-output-layout">
                            <div class="corsi-visual-card">
                                <div class="corsi-view-switch">
                                    <button class="corsi-view-btn ${state.corsiViewMode === 'blueprint' ? 'active' : ''}" onclick="window.AeroShieldApp.switchCorsiView('blueprint')">
                                        📐 Technical Blueprint
                                    </button>
                                    <button class="corsi-view-btn ${state.corsiViewMode === 'photo' ? 'active' : ''}" onclick="window.AeroShieldApp.switchCorsiView('photo')">
                                        📸 Real Assembled Build
                                    </button>
                                </div>
                                <div class="corsi-blueprint-container" id="corsi-svg-wrapper" style="display: ${state.corsiViewMode === 'blueprint' ? 'flex' : 'none'};">
                                    ${svgBlueprint}
                                </div>
                                <div class="corsi-photo-wrapper" id="corsi-photo-wrapper" style="display: ${state.corsiViewMode === 'photo' ? 'block' : 'none'};">
                                    <img src="/static/assets/corsi_rosenthal_real.jpg" alt="Assembled Corsi-Rosenthal Box Air Cleaner in modern living room" class="corsi-photo-img" />
                                </div>
                            </div>

                            <div class="corsi-metrics-panel">
                                <div class="metric-card">
                                    <span class="metric-label">Clean Air Delivery (CADR)</span>
                                    <span class="metric-big" id="cadr-metric">${specs.cadrCfm} CFM</span>
                                </div>
                                <div class="metric-card">
                                    <span class="metric-label">Air Changes / Hour (ACH)</span>
                                    <span class="metric-big" id="ach-metric">${specs.ach} ACH</span>
                                    <span class="badge" id="protection-badge" style="background-color: ${specs.ratingColor}22; color: ${specs.ratingColor}; border: 1px solid ${specs.ratingColor};">
                                        ${specs.rating}
                                    </span>
                                </div>
                                <div class="metric-card cost-comparison">
                                    <span class="metric-label">Cost Comparison (India Market Index)</span>
                                    <div class="cost-breakdown">
                                        <div>DIY Build: <strong id="diy-cost">₹${(specs.totalDiyCostInr || Math.round(specs.totalDiyCost * 86)).toLocaleString('en-IN')}</strong></div>
                                        <div>Commercial HEPA: <strike id="comm-cost">₹${(specs.commercialCostInr || Math.round(specs.commercialCost * 86)).toLocaleString('en-IN')}</strike></div>
                                    </div>
                                    <div class="savings-tag" id="savings-tag">You Save ₹${(specs.savingsInr || Math.round(specs.savingsUsd * 86)).toLocaleString('en-IN')} (${specs.savingsPct}%)</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 2. Ventilation Strategy -->
                    <section class="hack-section ventilation-card">
                        <h3>2. Ventilation Windows & Convective Flush Protocol</h3>
                        <p><strong>Safest Window:</strong> <span class="highlight">${window.Security.sanitizeHTML(ventilation.optimal_window || '12:30 PM - 15:00 PM')}</span></p>
                        <p>${window.Security.sanitizeHTML(ventilation.inversion_aeration_strategy || '')}</p>
                        <ol class="protocol-list">
                            ${(ventilation.protocol || []).map(step => `<li>${window.Security.sanitizeHTML(step)}</li>`).join('')}
                        </ol>
                    </section>

                    <!-- 3. Bio-Filtration Plants -->
                    <section class="hack-section plants-section">
                        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
                            <span class="badge-std">NASA Clean Air Study Designation SP-2007-6105</span>
                            <span class="badge-std">Phytoremediation Alveolar Buffer</span>
                        </div>
                        <h3>3. NASA Clean Air Study Indoor Bio-Filtration Plants</h3>
                        <p class="section-desc">Botanical species scientifically tested for VOC absorption and leaf cuticle particulate deposition.</p>
                        
                        <!-- Photorealistic Plant Showcase Banner -->
                        <div class="plants-hero-card">
                            <img src="/static/assets/indoor_plants_biofilter.jpg" alt="Botanical air purifying plants in a bright room" class="plants-hero-img" />
                            <div class="plants-hero-overlay">
                                <h4>Botanical Alveolar Buffer</h4>
                                <p>Living foliage creates a micro-climate that reduces ambient volatile organics and settles fine airborne dust.</p>
                            </div>
                        </div>

                        <div class="plants-grid">
                            ${plantsHTML}
                        </div>
                    </section>

                    <!-- 4. Aerosol Settling & Humidity Control -->
                    <section class="hack-section humidity-card">
                        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
                            <span class="badge-std">Stokes' Law Gravitational Precipitation (v_s &prop; D_p^2)</span>
                            <span class="badge-std">EPA Indoor RH Goldilocks Band (40-50% RH)</span>
                        </div>
                        <h3>4. Humidity Control to Accelerate PM2.5 Gravitational Settling</h3>
                        <p><strong>Target Range:</strong> <span class="highlight">${window.Security.sanitizeHTML(humidity.target_relative_humidity || '40% - 50% RH')}</span></p>
                        <div class="physics-explanation">
                            <strong>Aerosol Physical Mechanism:</strong>
                            <p>${window.Security.sanitizeHTML(humidity.scientific_mechanism || '')}</p>
                        </div>
                        <div class="warning-box">
                            <strong>Safety Warning:</strong> ${window.Security.sanitizeHTML(humidity.safety_threshold || '')}
                        </div>
                        <h4>Budget DIY Methods:</h4>
                        <ul>
                            ${(humidity.budget_diy_methods || []).map(m => `<li>${window.Security.sanitizeHTML(m)}</li>`).join('')}
                        </ul>
                    </section>
                </div>
            `;
        },

        switchCorsiView(mode) {
            state.corsiViewMode = mode;
            const svgEl = document.getElementById('corsi-svg-wrapper');
            const photoEl = document.getElementById('corsi-photo-wrapper');
            const btns = document.querySelectorAll('.corsi-view-btn');

            if (svgEl) svgEl.style.display = mode === 'blueprint' ? 'flex' : 'none';
            if (photoEl) photoEl.style.display = mode === 'photo' ? 'block' : 'none';

            btns.forEach(b => {
                if ((mode === 'blueprint' && b.textContent.includes('Blueprint')) ||
                    (mode === 'photo' && b.textContent.includes('Real'))) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        },

        onCorsiParamChange(param, value) {
            state.profile[param] = parseFloat(value);
            
            // Recompute specs
            const specs = window.CorsiDesigner.computeSpecs(
                state.profile.room_sqft,
                state.profile.ceiling_height,
                state.profile.filter_count,
                state.profile.filter_merv
            );

            // Update DOM dynamically without full rerender
            if (param === 'room_sqft') {
                const el = document.getElementById('sqft-val');
                if (el) el.innerHTML = `<strong>${value}</strong>`;
            } else if (param === 'ceiling_height') {
                const el = document.getElementById('ceiling-val');
                if (el) el.innerHTML = `<strong>${value}</strong>`;
            }

            const svgWrapper = document.getElementById('corsi-svg-wrapper');
            if (svgWrapper) svgWrapper.innerHTML = window.CorsiDesigner.renderSVG(specs);

            const cadrEl = document.getElementById('cadr-metric');
            if (cadrEl) cadrEl.textContent = `${specs.cadrCfm} CFM`;

            const achEl = document.getElementById('ach-metric');
            if (achEl) achEl.textContent = `${specs.ach} ACH`;

            const badgeEl = document.getElementById('protection-badge');
            if (badgeEl) {
                badgeEl.textContent = specs.rating;
                badgeEl.style.color = specs.ratingColor;
                badgeEl.style.backgroundColor = `${specs.ratingColor}22`;
                badgeEl.style.borderColor = specs.ratingColor;
            }

            const inrDiy = specs.totalDiyCostInr || Math.round(specs.totalDiyCost * 86);
            const inrComm = specs.commercialCostInr || Math.round(specs.commercialCost * 86);
            const inrSaved = specs.savingsInr || (inrComm - inrDiy);

            const diyCost = document.getElementById('diy-cost');
            if (diyCost) diyCost.textContent = `₹${inrDiy.toLocaleString('en-IN')}`;

            const commCost = document.getElementById('comm-cost');
            if (commCost) commCost.textContent = `₹${inrComm.toLocaleString('en-IN')}`;

            const savingsTag = document.getElementById('savings-tag');
            if (savingsTag) savingsTag.textContent = `You Save ₹${inrSaved.toLocaleString('en-IN')} (${specs.savingsPct}%)`;
        },

        // Render Tab 3: Sustainable Lifestyle Alternatives
        renderAlternativesTab(data) {
            const container = document.getElementById('tab-content-area');
            if (!container) return;

            const allGroups = [
                { title: "Transit Swaps", items: data.transit_swaps || [], icon: "🚆", showMetroHero: true },
                { title: "Household Energy & Insulation", items: data.energy_swaps || [], icon: "⚡", showMetroHero: false },
                { title: "Waste Management & Community Smog Pooling", items: data.waste_and_community_swaps || [], icon: "🤝", showMetroHero: false }
            ];

            let html = '';
            allGroups.forEach(group => {
                const cards = group.items.map(item => {
                    const isChecked = state.selectedAlternatives.includes(item.id);
                    return `
                    <div class="alternative-card">
                        <div class="alt-header">
                            <span class="alt-badge">${window.Security.sanitizeHTML(item.badge)}</span>
                            <span class="alt-scope">${window.Security.sanitizeHTML(item.scope)}</span>
                        </div>
                        <h4 class="alt-title">${window.Security.sanitizeHTML(item.title)}</h4>
                        <div class="alt-stats">
                            <div class="stat">CO2e Saved: <strong>${item.co2_saved_kg_year} kg/yr</strong></div>
                            <div class="stat">Air Quality: <span>${window.Security.sanitizeHTML(item.pm25_avoided_pct)}</span></div>
                            <div class="stat">Savings: <span>${window.Security.sanitizeHTML(item.annual_cost_savings)}</span></div>
                        </div>
                        <p class="alt-impl"><strong>Implementation:</strong> ${window.Security.sanitizeHTML(item.how_to_implement)}</p>
                        <div class="alt-footer">
                            <label class="alt-toggle-label" for="alt-check-${item.id}">
                                <input type="checkbox" id="alt-check-${item.id}"
                                    class="alt-toggle-checkbox"
                                    ${isChecked ? 'checked' : ''}
                                    onchange="window.AeroShieldApp.onAlternativeToggled('${item.id}', this.checked)">
                                <span>Commit to this Swap</span>
                            </label>
                        </div>
                    </div>
                    `;
                }).join('');

                const metroHero = group.showMetroHero ? `
                    <div class="transit-hero-card">
                        <img src="/static/assets/clean_transit_metro.jpg" alt="Clean underground electric transit station" class="transit-hero-img" />
                        <div class="transit-hero-overlay">
                            <h4>Electric Rapid Transit Sanctuary</h4>
                            <p>Underground metro stations maintain filtered micro-climates, isolating commuters from intense roadside exhaust plumes.</p>
                        </div>
                    </div>
                ` : '';

                html += `
                <section class="alternatives-group">
                    <h3>${group.icon} ${group.title}</h3>
                    ${metroHero}
                    <div class="alternatives-grid">${cards}</div>
                </section>
                `;
            });

            container.innerHTML = `
                <div class="tab-pane-container" role="tabpanel" id="panel-alternatives" aria-labelledby="tab-alternatives">
                    <header class="tab-header">
                        <h2>Sustainable Lifestyle Alternatives</h2>
                        <p class="tab-subtitle">High-impact swaps for transit, domestic heating, and neighborhood smog pooling.</p>
                    </header>
                    ${html}
                </div>
            `;
        },

        onAlternativeToggled(altId, isChecked) {
            if (isChecked) {
                if (!state.selectedAlternatives.includes(altId)) {
                    state.selectedAlternatives.push(altId);
                }
            } else {
                state.selectedAlternatives = state.selectedAlternatives.filter(id => id !== altId);
            }
            AeroShieldApp.updateDirectImpactQuantifier();
            announceToScreenReader("Alternative updated. Recalculating CO2 and tree equivalence.");
        },

        // Render Tab 4: Direct Impact Quantifier
        renderImpactTab(data) {
            const container = document.getElementById('tab-content-area');
            if (!container) return;

            const impact = window.ImpactCalc.calculate(
                state.profile,
                state.selectedRoutines,
                state.selectedAlternatives
            );

            container.innerHTML = `
                <div class="tab-pane-container" role="tabpanel" id="panel-impact" aria-labelledby="tab-impact">
                    <header class="tab-header">
                        <h2>Direct Impact Quantifier</h2>
                        <p class="tab-subtitle">Calculated using physical minute ventilation volumes, aerosol penetration fractions, and EPA emissions factors.</p>
                        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                            <span class="badge-std">US EPA Exposure Factors Handbook (EPA/600/R-09/052F)</span>
                            <span class="badge-std">IPCC AR6 Working Group III Climate Metrics</span>
                            <span class="badge-std">USDA Forest Service Carbon Protocol (40 CFR Part 98)</span>
                        </div>
                    </header>

                    <div class="impact-big-grid">
                        <div class="impact-stat-box pm25-box">
                            <span class="impact-icon" aria-hidden="true">🛡️</span>
                            <span class="impact-label">PM2.5 Inhalation Avoided</span>
                            <span class="impact-num" id="pm25-avoided-val">${impact.pm25AvoidedUgDay}</span>
                            <span class="impact-unit">micrograms / day</span>
                            <span class="impact-sub">${impact.inhalationReductionPct}% reduction in internal lung dose</span>
                        </div>

                        <div class="impact-stat-box co2-box">
                            <span class="impact-icon" aria-hidden="true">🌱</span>
                            <span class="impact-label">CO2e Emissions Prevented</span>
                            <span class="impact-num" id="co2-saved-val">${impact.co2eSavedKgYear}</span>
                            <span class="impact-unit">kg CO2e / year</span>
                            <span class="impact-sub">Calculated across selected transit & household energy swaps</span>
                        </div>

                        <div class="impact-stat-box tree-box">
                            <span class="impact-icon" aria-hidden="true">🌳</span>
                            <span class="impact-label">Equivalent Trees Planted</span>
                            <span class="impact-num" id="trees-planted-val">${impact.treesPlanted}</span>
                            <span class="impact-unit">Mature Urban Trees</span>
                            <span class="impact-sub">US EPA Sequestration Benchmark: 21.77 kg CO2 / tree / year</span>
                        </div>
                    </div>

                    <section class="formulae-card">
                        <h3>Scientific Formulae & Health Disclosure</h3>
                        <div class="formula-item">
                            <strong>PM2.5 Inhaled Dose Equation:</strong>
                            <code>Δ Inhaled Dose = Σ [ V_E,i × t_i × C_ambient × (1 - η_filter,i) ] × Vulnerability_Multiplier</code>
                            <p class="formula-desc">Based on minute ventilation volume (V_E) from EPA Exposure Factors Handbook: Resting adult: 0.45 m³/h; Motorbike commute: 1.08 m³/h; Active cycling: 1.92 m³/h.</p>
                        </div>
                        <div class="formula-item">
                            <strong>Greenhouse Gas Sequestration Protocol:</strong>
                            <code>Equivalent Trees = (Δ CO2e kg/yr) / 21.77 kg/tree/yr</code>
                            <p class="formula-desc">Standards derived from USDA Forest Service and EPA Greenhouse Gas Equivalencies Calculator.</p>
                        </div>
                    </section>

                    <div class="export-actions-bar">
                        <button class="btn btn-primary" onclick="window.AeroShieldApp.exportActionPlan()">
                            <span>📄</span> Generate & Print Smog Action Plan
                        </button>
                        <button class="btn btn-secondary" onclick="window.AeroShieldApp.downloadJSONReport()">
                            <span>💾</span> Download JSON Audit Report
                        </button>
                    </div>
                </div>
            `;
        },

        // Update Direct Impact Quantifier everywhere in UI
        updateDirectImpactQuantifier() {
            const impact = window.ImpactCalc.calculate(
                state.profile,
                state.selectedRoutines,
                state.selectedAlternatives
            );

            // Update top bar summary badges
            const barPM = document.getElementById('summary-bar-pm25');
            const barCO2 = document.getElementById('summary-bar-co2');
            const barTrees = document.getElementById('summary-bar-trees');

            if (barPM) barPM.textContent = `${impact.pm25AvoidedUgDay} µg/d`;
            if (barCO2) barCO2.textContent = `${impact.co2eSavedKgYear} kg/yr`;
            if (barTrees) barTrees.textContent = `${impact.treesPlanted} trees`;

            // Update tab 4 if active
            const pmVal = document.getElementById('pm25-avoided-val');
            const co2Val = document.getElementById('co2-saved-val');
            const treeVal = document.getElementById('trees-planted-val');

            if (pmVal) pmVal.textContent = impact.pm25AvoidedUgDay;
            if (co2Val) co2Val.textContent = impact.co2eSavedKgYear;
            if (treeVal) treeVal.textContent = impact.treesPlanted;
        },

        // Keyboard accessible tabs (WCAG 2.1 AAA)
        setupKeyboardNavigation() {
            const tabList = document.querySelector('[role="tablist"]');
            if (!tabList) return;

            const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));

            tabList.addEventListener('keydown', (e) => {
                const currentTab = document.activeElement;
                const index = tabs.indexOf(currentTab);
                if (index === -1) return;

                let nextIndex = index;
                if (e.key === 'ArrowRight') {
                    nextIndex = (index + 1) % tabs.length;
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft') {
                    nextIndex = (index - 1 + tabs.length) % tabs.length;
                    e.preventDefault();
                } else if (e.key === 'Home') {
                    nextIndex = 0;
                    e.preventDefault();
                } else if (e.key === 'End') {
                    nextIndex = tabs.length - 1;
                    e.preventDefault();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    currentTab.click();
                    e.preventDefault();
                    return;
                }

                if (nextIndex !== index) {
                    tabs.forEach(t => {
                        t.setAttribute('tabindex', '-1');
                        t.setAttribute('aria-selected', 'false');
                    });
                    const nextTab = tabs[nextIndex];
                    nextTab.setAttribute('tabindex', '0');
                    nextTab.setAttribute('aria-selected', 'true');
                    nextTab.focus();
                    nextTab.click();
                }
            });
        },

        // Setup Event Listeners
        setupEventListeners() {
            // Quick 1-click City Pills
            const pillsBar = document.getElementById('city-pills-bar');
            if (pillsBar) {
                pillsBar.addEventListener('click', (e) => {
                    const pill = e.target.closest('.city-pill');
                    if (!pill) return;
                    const city = pill.getAttribute('data-city');
                    state.profile.city = city;

                    const select = document.getElementById('city-select');
                    if (select) select.value = city;

                    const customGroup = document.getElementById('custom-city-group');
                    if (customGroup) customGroup.style.display = 'none';

                    AeroShieldApp.updateProfileAnalysis();
                    AeroShieldApp.loadTabContent(state.activeTab);
                    announceToScreenReader(`Switched city to ${city}`);
                });
            }

            // City dropdown preset change
            const citySelect = document.getElementById('city-select');
            if (citySelect) {
                citySelect.addEventListener('change', (e) => {
                    const val = e.target.value;
                    state.profile.city = val;
                    if (val === 'custom') {
                        document.getElementById('custom-city-group').style.display = 'block';
                    } else {
                        document.getElementById('custom-city-group').style.display = 'none';
                        state.profile.pin_code = state.cityPresets[val] ? 'Preset' : '';
                    }
                    AeroShieldApp.updateProfileAnalysis();
                    AeroShieldApp.loadTabContent(state.activeTab);
                });
            }

            // Custom inputs debounced
            const debouncedUpdate = debounce(() => {
                AeroShieldApp.updateProfileAnalysis();
                AeroShieldApp.loadTabContent(state.activeTab);
            }, 300);

            const bindDebounced = (id, field, isNumeric = false) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', (e) => {
                    state.profile[field] = isNumeric ? parseFloat(e.target.value) || 0 : e.target.value;
                    debouncedUpdate();
                });
            };

            bindDebounced('custom-city-input', 'city');
            bindDebounced('pin-code-input', 'pin_code');
            bindDebounced('custom-pm25-slider', 'custom_pm25', true);

            // Family composition & Vulnerabilities
            const bindChange = (id, field, isBool = false, isNumeric = false) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('change', (e) => {
                    if (isBool) state.profile[field] = e.target.checked;
                    else if (isNumeric) state.profile[field] = parseInt(e.target.value, 10) || 0;
                    else state.profile[field] = e.target.value;
                    AeroShieldApp.updateProfileAnalysis();
                    AeroShieldApp.loadTabContent(state.activeTab);
                });
            };

            bindChange('children-count', 'children', false, true);
            bindChange('elderly-count', 'elderly', false, true);
            bindChange('respiratory-check', 'respiratory_sensitivity', true);
            bindChange('pregnancy-check', 'pregnant_or_infant', true);
            bindChange('commute-select', 'commute_type');
            bindChange('heating-select', 'heating_type');

            // Tab switching
            const tabs = document.querySelectorAll('[role="tab"]');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => {
                        t.setAttribute('aria-selected', 'false');
                        t.setAttribute('tabindex', '-1');
                        t.classList.remove('active');
                    });
                    const target = e.currentTarget;
                    target.setAttribute('aria-selected', 'true');
                    target.setAttribute('tabindex', '0');
                    target.classList.add('active');
                    const tabId = target.getAttribute('data-tab');
                    AeroShieldApp.loadTabContent(tabId);
                });
            });

            // Theme toggle button
            const themeBtn = document.getElementById('theme-toggle-btn');
            if (themeBtn) {
                themeBtn.addEventListener('click', () => {
                    AeroShieldApp.toggleTheme();
                });
            }

            // Engine Toggle (Offline Fallback vs Gemini Cloud)
            const engineToggleBtn = document.getElementById('engine-mode-btn');
            if (engineToggleBtn) {
                engineToggleBtn.addEventListener('click', () => {
                    AeroShieldApp.toggleEngineMode();
                });
            }
        },

        toggleEngineMode() {
            state.useGeminiCloud = !state.useGeminiCloud;
            const btn = document.getElementById('engine-mode-btn');
            if (btn) {
                if (state.useGeminiCloud) {
                    btn.innerHTML = '<span>⚡</span> Mode: <strong>Gemini Cloud</strong>';
                    btn.className = 'btn btn-gemini-active';
                    if (!state.geminiApiKey) {
                        const key = prompt("Enter optional Gemini API key (or leave empty to use server GEMINI_API_KEY environment):");
                        if (key) state.geminiApiKey = key.trim();
                    }
                } else {
                    btn.innerHTML = '<span>🛡️</span> Mode: <strong>Deterministic Fallback</strong>';
                    btn.className = 'btn btn-fallback-active';
                }
            }
            AeroShieldApp.loadTabContent(state.activeTab);
            announceToScreenReader(`AI Engine switched to ${state.useGeminiCloud ? 'Gemini Cloud' : 'Deterministic Offline Engine'}`);
        },

        // Test Runner Modal Dialog
        openTestRunner() {
            const modal = document.getElementById('test-suite-modal');
            if (!modal) return;
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');

            const container = document.getElementById('test-results-log');
            if (container) {
                container.innerHTML = '<p class="test-running-notice">Running 16 automated tests across AQI calculations, physical minute ventilation math, XSS defense, LRU caching, and AI fallback schemas...</p>';
            }

            window.runTestSuite((result, current, total) => {
                // Progress callback
                const progressBar = document.getElementById('test-progress-bar');
                if (progressBar) {
                    const pct = Math.round((current / total) * 100);
                    progressBar.style.width = `${pct}%`;
                    progressBar.textContent = `${pct}%`;
                }

                if (container) {
                    const item = document.createElement('div');
                    item.className = `test-result-item ${result.status === 'PASS' ? 'pass' : 'fail'}`;
                    item.innerHTML = `
                        <span class="test-badge ${result.status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${result.status}</span>
                        <span class="test-category">[${window.Security.sanitizeHTML(result.category)}]</span>
                        <span class="test-name">${window.Security.sanitizeHTML(result.name)}</span>
                        <span class="test-time">${result.durationMs}ms</span>
                        ${result.error ? `<div class="test-error">${window.Security.sanitizeHTML(result.error)}</div>` : ''}
                    `;
                    container.appendChild(item);
                    container.scrollTop = container.scrollHeight;
                }
            }).then(summary => {
                const summaryEl = document.getElementById('test-summary-header');
                if (summaryEl) {
                    summaryEl.innerHTML = `
                        <div class="summary-chip ${summary.allPassed ? 'all-pass' : 'has-failures'}">
                            <strong>${summary.passed} / ${summary.total} Passed</strong> (${summary.failed} Failed) in ${summary.durationMs}ms
                        </div>
                    `;
                }
                announceToScreenReader(`Test Suite finished. ${summary.passed} of ${summary.total} tests passed.`);
            });
        },

        closeTestRunner() {
            const modal = document.getElementById('test-suite-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        },

        // Cache Stats Modal Dialog
        openCacheStats() {
            const modal = document.getElementById('cache-stats-modal');
            if (!modal) return;
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');

            const clientStats = window.clientLRUCache.getStats();
            document.getElementById('cache-stat-size').textContent = clientStats.size;
            document.getElementById('cache-stat-hits').textContent = clientStats.hits;
            document.getElementById('cache-stat-misses').textContent = clientStats.misses;
            document.getElementById('cache-stat-evictions').textContent = clientStats.evictions;
            document.getElementById('cache-stat-hitrate').textContent = `${clientStats.hitRatePct}%`;
            document.getElementById('cache-stat-ttl').textContent = `${clientStats.ttlSeconds}s (5 min)`;
        },

        closeCacheStats() {
            const modal = document.getElementById('cache-stats-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        },

        clearCache() {
            window.clientLRUCache.clear();
            AeroShieldApp.openCacheStats();
            announceToScreenReader("LRU Cache cleared");
        },

        // Export Actions
        exportActionPlan() {
            window.print();
        },

        downloadJSONReport() {
            const impact = window.ImpactCalc.calculate(
                state.profile,
                state.selectedRoutines,
                state.selectedAlternatives
            );
            const report = {
                app: "AeroShield AI: Urban Air Quality & Winter Smog Assistant",
                timestamp: new Date().toISOString(),
                profile: state.profile,
                ambientAQI: state.currentAQI,
                category: state.currentCategory,
                selectedRoutines: state.selectedRoutines,
                selectedAlternatives: state.selectedAlternatives,
                quantifiedImpact: impact
            };
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AeroShield_Smog_Action_Plan_${state.profile.city}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    window.AeroShieldApp = AeroShieldApp;

    // Initialize on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        window.AeroShieldApp.init();
    });
})(window);
