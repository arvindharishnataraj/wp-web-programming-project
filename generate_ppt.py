"""
GeoPulse 360 - PowerPoint Generator
Creates a professional 16:9 widescreen presentation for 3rd-year Web Programming final project.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_presentation(output_path):
    prs = Presentation()
    # 16:9 widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Theme Colors
    BG_COLOR = RGBColor(10, 16, 28)       # Deep obsidian navy
    CARD_BG = RGBColor(17, 27, 46)        # Glass card dark blue
    ACCENT_CYAN = RGBColor(0, 243, 255)   # Cyber cyan
    TEXT_LIGHT = RGBColor(248, 250, 252)  # Bright white/slate
    TEXT_MUTED = RGBColor(148, 163, 184)  # Cool grey
    ACCENT_GOLD = RGBColor(245, 158, 11)  # Amber
    ACCENT_EMERALD = RGBColor(16, 185, 129)# Green
    BORDER_COLOR = RGBColor(30, 48, 77)

    def set_slide_background(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = BG_COLOR

    def add_header(slide, title_text, category="GEOPULSE 360 • FINAL PROJECT PRESENTATION"):
        # Category pill/subtitle
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.5), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ACCENT_CYAN

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.5), Inches(0.8))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(24)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT

    def create_card(slide, left, top, width, height, title, body_bullets, title_color=ACCENT_CYAN):
        # Card shape
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = CARD_BG
        shape.line.color.rgb = BORDER_COLOR
        shape.line.width = Pt(1.5)

        # Content
        tf = shape.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.25)
        tf.margin_right = Inches(0.25)
        tf.margin_top = Inches(0.25)
        tf.margin_bottom = Inches(0.25)

        # Title paragraph
        p_title = tf.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(16)
        p_title.font.bold = True
        p_title.font.color.rgb = title_color
        p_title.space_after = Pt(12)

        # Bullets
        for b in body_bullets:
            p = tf.add_paragraph()
            p.text = b
            p.font.size = Pt(12)
            p.font.color.rgb = TEXT_LIGHT
            p.space_after = Pt(8)

    # -------------------------------------------------------------
    # SLIDE 1: Title Slide
    # -------------------------------------------------------------
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide1)

    # Hero Box
    hero = slide1.shapes.add_textbox(Inches(1.0), Inches(1.2), Inches(11.333), Inches(3.0))
    tf1 = hero.text_frame
    tf1.word_wrap = True

    p_badge = tf1.paragraphs[0]
    p_badge.text = "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING"
    p_badge.font.size = Pt(12)
    p_badge.font.bold = True
    p_badge.font.color.rgb = ACCENT_CYAN
    p_badge.space_after = Pt(14)

    p_title = tf1.add_paragraph()
    p_title.text = "GeoPulse 360"
    p_title.font.size = Pt(44)
    p_title.font.bold = True
    p_title.font.color.rgb = TEXT_LIGHT

    p_sub = tf1.add_paragraph()
    p_sub.text = "Real-Time Planetary, Seismic & South Indian Environmental Telemetry Platform"
    p_sub.font.size = Pt(18)
    p_sub.font.color.rgb = ACCENT_GOLD
    p_sub.space_after = Pt(16)

    p_course = tf1.add_paragraph()
    p_course.text = "3rd Year Final Course Project • Web Programming (Section A)"
    p_course.font.size = Pt(13)
    p_course.font.color.rgb = TEXT_MUTED

    # Student & College Metadata Card
    info_card = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(4.5), Inches(11.333), Inches(2.2))
    info_card.fill.solid()
    info_card.fill.fore_color.rgb = CARD_BG
    info_card.line.color.rgb = ACCENT_CYAN
    info_card.line.width = Pt(1.5)

    tf_info = info_card.text_frame
    tf_info.word_wrap = True
    tf_info.margin_left = Inches(0.4)
    tf_info.margin_top = Inches(0.3)

    p_cand = tf_info.paragraphs[0]
    p_cand.text = "STUDENT & INSTITUTION DETAILS"
    p_cand.font.size = Pt(12)
    p_cand.font.bold = True
    p_cand.font.color.rgb = ACCENT_CYAN
    p_cand.space_after = Pt(8)

    p_stu = tf_info.add_paragraph()
    p_stu.text = "Candidate: ARVIND HARISH  |  Roll Number: 240701052  |  Section: Web Programming 'A'"
    p_stu.font.size = Pt(14)
    p_stu.font.bold = True
    p_stu.font.color.rgb = TEXT_LIGHT
    p_stu.space_after = Pt(6)

    p_clg = tf_info.add_paragraph()
    p_clg.text = "Institution: RAJALAKSHMI ENGINEERING COLLEGE (REC), CHENNAI"
    p_clg.font.size = Pt(13)
    p_clg.font.bold = True
    p_clg.font.color.rgb = ACCENT_GOLD
    p_clg.space_after = Pt(6)

    p_urls = tf_info.add_paragraph()
    p_urls.text = "GitHub: github.com/arvindharishnataraj/wp-web-programming-project  •  Live Demo: https://0e8f329b8a1d6e.lhr.life"
    p_urls.font.size = Pt(11)
    p_urls.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 2: Problem Statement & Motivation
    # -------------------------------------------------------------
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide2)
    add_header(slide2, "Project Overview & Problem Statement")

    create_card(slide2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "1. The Challenge",
                [
                    "• Real-time environmental and seismic telemetry is fragmented across multiple siloed platforms.",
                    "• Most climate tools rely on static daily updates rather than continuous real-time feeds.",
                    "• Coastal South India faces acute vulnerability: Bay of Bengal cyclones, monsoon floods, and Indian Ocean tsunami risk.",
                    "• Existing commercial telemetry APIs require expensive subscription keys."
                ], ACCENT_GOLD)

    create_card(slide2, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "2. The Solution",
                [
                    "• GeoPulse 360: A unified, single-page command center aggregating heterogeneous live streams.",
                    "• Connects 3 live international scientific networks with zero API keys required.",
                    "• Focuses on South India (Chennai, Bengaluru, Hyderabad, Kochi, Vizag, Andaman Trench).",
                    "• Sub-5ms response times via in-memory server proxy caching."
                ], ACCENT_CYAN)

    create_card(slide2, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "3. Core Innovations",
                [
                    "• Server-Sent Events (SSE) streaming live packets directly to the client.",
                    "• Interactive Leaflet GIS with pulsing SVG magnitude-scaled markers.",
                    "• Web Audio API tactical sonar alerts synthesized entirely in-browser.",
                    "• Watchlist CRUD persistence (local & backend JSON store)."
                ], ACCENT_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 3: Live Real-Time Data Sources
    # -------------------------------------------------------------
    slide3 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide3)
    add_header(slide3, "Heterogeneous Real-Time Scientific Data Feeds")

    create_card(slide3, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "USGS Live Seismic Feed",
                [
                    "• Source: USGS Earthquake Hazards Program (GeoJSON API).",
                    "• Cadence: Updated every few seconds in real time.",
                    "• Parameters Captured:",
                    "  - Richter Magnitude (0.1 to 9.0+)",
                    "  - Hypocenter Depth (km)",
                    "  - Geographic Lat/Long coordinates",
                    "  - Official Tsunami Warning Advisory flags",
                    "• Visualized with pulsing concentric seismic rings."
                ], ACCENT_GOLD)

    create_card(slide3, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "Open-Meteo & WMO Telemetry",
                [
                    "• Atmospheric Weather:",
                    "  - Real-time temperature & feels-like",
                    "  - Wind speed & direction vector",
                    "  - Barometric pressure & relative humidity",
                    "  - 24-hr hourly & 5-day daily forecast",
                    "• Air Quality Index (AQI):",
                    "  - US EPA AQI & European AQI standards",
                    "  - PM2.5 & PM10 particulate levels",
                    "  - Ozone (O3) and Nitrogen Dioxide (NO2)"
                ], ACCENT_CYAN)

    create_card(slide3, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "ISS Orbital Telemetry",
                [
                    "• Source: Where The ISS At REST telemetry.",
                    "• Orbital Telemetry:",
                    "  - Live satellite coordinates (Lat / Lon)",
                    "  - Orbital velocity (~27,580 km/h)",
                    "  - Altitude above sea level (~420 km)",
                    "• Real-time SVG marker dynamically moving over continents.",
                    "• Zero API keys, 100% free open-access data."
                ], ACCENT_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 4: South India & Regional Focus
    # -------------------------------------------------------------
    slide4 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide4)
    add_header(slide4, "South India & Indian Ocean Telemetry Hubs")

    create_card(slide4, Inches(0.8), Inches(1.8), Inches(3.6), Inches(2.4),
                "🌊 Chennai, Tamil Nadu",
                [
                    "• Bay of Bengal coastal radar watch.",
                    "• Real-time monitoring of tropical depressions & cyclone landfall winds.",
                    "• High humidity & coastal barometric telemetry."
                ], ACCENT_CYAN)

    create_card(slide4, Inches(4.8), Inches(1.8), Inches(3.6), Inches(2.4),
                "🏙️ Bengaluru, Karnataka",
                [
                    "• Deccan Plateau climate monitoring.",
                    "• ISRO Satellite Telemetry Headquarters.",
                    "• Urban air quality index & temperature diurnal curve."
                ], ACCENT_EMERALD)

    create_card(slide4, Inches(8.8), Inches(1.8), Inches(3.6), Inches(2.4),
                "🏛️ Hyderabad, Telangana",
                [
                    "• Headquarters of INCOIS (Indian National Centre for Ocean Information Services).",
                    "• Central node for the National Tsunami Early Warning System."
                ], ACCENT_GOLD)

    create_card(slide4, Inches(0.8), Inches(4.4), Inches(3.6), Inches(2.4),
                "🌴 Kochi, Kerala",
                [
                    "• Arabian Sea Marine & Monsoon Telemetry.",
                    "• Real-time onset tracking for Southwest Monsoon precipitation.",
                    "• Maritime wind speed & atmospheric pressure."
                ], ACCENT_EMERALD)

    create_card(slide4, Inches(4.8), Inches(4.4), Inches(3.6), Inches(2.4),
                "⚓ Visakhapatnam, Andhra Pradesh",
                [
                    "• East Coast Cyclone Warning Centre.",
                    "• Eastern Naval Command maritime meteorological hub."
                ], ACCENT_CYAN)

    create_card(slide4, Inches(8.8), Inches(4.4), Inches(3.6), Inches(2.4),
                "🏝️ Andaman & Nicobar Trench",
                [
                    "• Active Indo-Burma subduction zone.",
                    "• Historic 2004 Indian Ocean tsunami epicenter fault line.",
                    "• Visualized on the interactive map with custom fault vector."
                ], ACCENT_GOLD)

    # -------------------------------------------------------------
    # SLIDE 5: Full-Stack Architecture
    # -------------------------------------------------------------
    slide5 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide5)
    add_header(slide5, "Full-Stack System Architecture & Data Pipeline")

    create_card(slide5, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "Backend Architecture (Node.js & Express)",
                [
                    "• REST API Proxy Layer: Shields client from rate limits and eliminates CORS issues.",
                    "• In-Memory Caching Engine:",
                    "  - USGS Earthquakes: 25-second TTL cache",
                    "  - Weather & AQI: 3-minute TTL cache",
                    "  - ISS Telemetry: 2-second TTL cache",
                    "• Real-Time Server-Sent Events (SSE):",
                    "  - Persistent HTTP connection at /api/events/live",
                    "  - Periodically broadcasts telemetry heartbeat packets to all connected clients",
                    "• JSON Storage Database: Persists user bookmarks to data/bookmarks.json",
                    "• CSV Exporter: Dynamic CSV formatting engine at /api/export?format=csv"
                ], ACCENT_CYAN)

    create_card(slide5, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "Frontend Architecture (Modular Client)",
                [
                    "• Single Page Architecture (SPA) with zero heavy framework bloat.",
                    "• app.js: Central state manager, SSE event listeners, auto-refresh countdown (15s/30s/60s).",
                    "• map.js: Leaflet.js geospatial controller, custom SVG DivIcons, pulsing concentric rings.",
                    "• charts.js: Chart.js controller with dynamic theme switching (Dark/Light).",
                    "• weather.js: Open-Meteo consumer, city geocoding with debounce search, WMO code parser.",
                    "• audio.js: Web Audio API acoustic synthesizer (sonar pings and dual-frequency alert sirens).",
                    "• styles.css: Glassmorphism, CSS Custom Variables, responsive Flexbox/Grid, and @media print."
                ], ACCENT_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 6: Interactive Geospatial Mapping (Leaflet.js)
    # -------------------------------------------------------------
    slide6 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide6)
    add_header(slide6, "Interactive GIS & Geospatial Visualization")

    create_card(slide6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "Geospatial Features",
                [
                    "• Leaflet.js Geospatial Engine: High-performance canvas and vector rendering.",
                    "• Multiple Free, Unwatermarked Basemaps:",
                    "  - Esri Dark Canvas (Tactical mission control view)",
                    "  - OpenStreetMap (Standard street topology)",
                    "  - Esri World Imagery (High-res satellite Earth view)",
                    "  - Topographic Map (Elevation & contours)",
                    "• Custom Pulsing Seismic Markers: Color-coded & sized by Richter scale (Green <M2.5, Cyan M2.5-3.9, Amber M4.0-4.9, Red M5.0-6.4, Violet M6.5+).",
                    "• Fault Line Overlays: Pacific Ring of Fire & Andaman-Sumatra Subduction Arc.",
                    "• Interactive Popups: Direct 'Epicenter Weather Inspection' linking coordinates to meteorological telemetry."
                ], ACCENT_CYAN)

    create_card(slide6, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "UI / UX Design Highlights",
                [
                    "• Tactical Mission Control Layout: Dark Glassmorphism aesthetics with glowing cyan accents.",
                    "• Theme Switcher: Seamless toggle between Tactical Dark and Crisp High-Contrast Light Mode.",
                    "• Quick Observatory Pills: Instant one-click camera pan and zoom to Chennai, Bengaluru, Hyderabad, Kochi, Vizag, or Andaman.",
                    "• Live Status Indicator: Real-time pulsing badge reflecting active SSE connection.",
                    "• Filter System: Instant filtering by magnitude (All, M2.5+, M4.0+, M5.0+ Urgent), Tsunami Risk, and Indian Ocean region."
                ], ACCENT_GOLD)

    # -------------------------------------------------------------
    # SLIDE 7: Visual Analytics (Chart.js)
    # -------------------------------------------------------------
    slide7 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide7)
    add_header(slide7, "Multi-Dimensional Visual Analytics (Chart.js)")

    create_card(slide7, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "Magnitude Histogram",
                [
                    "• Type: Categorical Bar Chart.",
                    "• Aggregates active earthquakes into standard scientific classifications:",
                    "  - Micro (< M2.5)",
                    "  - Minor (M2.5 - M3.9)",
                    "  - Light (M4.0 - M4.9)",
                    "  - Moderate (M5.0 - M5.9)",
                    "  - Strong / Major (M6.0+)",
                    "• Color-coded bars matching map markers."
                ], ACCENT_CYAN)

    create_card(slide7, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "Depth vs. Magnitude",
                [
                    "• Type: 2D Scatter Plot.",
                    "• Correlates hypocenter depth (km) against Richter magnitude for top 45 recent events.",
                    "• Distinguishes between shallow crustal fractures (< 70 km) and deep subduction mantle earthquakes (> 100 km).",
                    "• Interactive tooltips showing exact location and depth on hover."
                ], ACCENT_GOLD)

    create_card(slide7, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "24-Hour Forecast Curve",
                [
                    "• Type: Dual-Axis Spline Line Chart.",
                    "• Primary Y-Axis (Left): Hourly ambient temperature variations (°C) with gradient fill.",
                    "• Secondary Y-Axis (Right): Precipitation probability (0 - 100%).",
                    "• Automatically refreshes whenever user selects a new South Indian or global city."
                ], ACCENT_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 8: Acoustic Alert System (Web Audio API)
    # -------------------------------------------------------------
    slide8 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide8)
    add_header(slide8, "Synthetic Acoustic Warning System (Web Audio API)")

    create_card(slide8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "Why Web Audio API?",
                [
                    "• Traditional Approach: Loading external MP3 or WAV files over the network.",
                    "  - Drawbacks: High bandwidth, latency, MIME errors, browser autoplay blocks.",
                    "• GeoPulse 360 Approach: Pure browser-synthesized audio using AudioContext, Oscillators, and GainNodes.",
                    "• Zero external audio assets required.",
                    "• Instantaneous response with sub-millisecond acoustic latency.",
                    "• User toggle with persistence saved in LocalStorage."
                ], ACCENT_CYAN)

    create_card(slide8, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "Acoustic Telemetry Profiles",
                [
                    "1. Tactical Sonar Ping (Auto-Refresh):",
                    "   - Sine wave oscillator sweeping from 1046.5 Hz (C6) down to 523.25 Hz (C5) over 350ms.",
                    "   - Exponential volume decay for a crisp submarine radar feedback sound.",
                    "2. Critical Seismic Alert (M >= 5.0):",
                    "   - Dual-tone sawtooth alarm (440 Hz & 880 Hz) with rapid frequency modulation.",
                    "   - Triggered automatically whenever a high-severity earthquake packet is detected.",
                    "3. Tactile UI Click:",
                    "   - Subtle 800 Hz to 400 Hz 40ms click for button interactions."
                ], ACCENT_GOLD)

    # -------------------------------------------------------------
    # SLIDE 9: REST API Specifications
    # -------------------------------------------------------------
    slide9 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide9)
    add_header(slide9, "Backend REST API Specifications")

    create_card(slide9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "Telemetry Endpoints",
                [
                    "• GET /api/health",
                    "  - Service health check, uptime, and timestamp.",
                    "• GET /api/earthquakes?minMag=X&limit=Y",
                    "  - Parsed, cached USGS feed with summary aggregates.",
                    "• GET /api/weather?lat=X&lon=Y",
                    "  - Parallel fetch of Open-Meteo weather + air quality.",
                    "• GET /api/geocode?q=CityName",
                    "  - Debounced global city autocomplete.",
                    "• GET /api/iss",
                    "  - Real-time orbital coordinates, altitude, and speed.",
                    "• GET /api/stats",
                    "  - Real-time KPI counts (24h quakes, peak mag, tsunami alerts)."
                ], ACCENT_CYAN)

    create_card(slide9, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
                "Streaming, Persistence & Export",
                [
                    "• GET /api/events/live (Server-Sent Events)",
                    "  - Content-Type: text/event-stream",
                    "  - Maintains persistent connection, streaming live telemetry heartbeats every 6s.",
                    "• GET /api/bookmarks & POST /api/bookmarks",
                    "  - CRUD operations for user watchlist observation stations.",
                    "  - Stored persistently in data/bookmarks.json.",
                    "• DELETE /api/bookmarks/:id",
                    "  - Removes saved station by identifier.",
                    "• GET /api/export?format=csv",
                    "  - Dynamic CSV dataset download for spreadsheet/GIS analysis."
                ], ACCENT_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 10: Academic Rubric Alignment
    # -------------------------------------------------------------
    slide10 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide10)
    add_header(slide10, "Academic Web Programming Rubric Alignment")

    create_card(slide10, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "Frontend Engineering",
                [
                    "• HTML5 Semantic Elements: <header>, <main>, <section>, <article>.",
                    "• Modern CSS3:",
                    "  - CSS Custom Variables (theming)",
                    "  - Responsive CSS Grid & Flexbox",
                    "  - Backdrop filters & Glassmorphism",
                    "  - Print media stylesheet (@media print)",
                    "• DOM Manipulation: Dynamic card rendering, debounced inputs, event delegation."
                ], ACCENT_CYAN)

    create_card(slide10, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "Asynchronous JavaScript",
                [
                    "• ES6+ Modern JavaScript:",
                    "  - async / await and Promise.all()",
                    "  - Fetch API for REST consumption",
                    "  - Server-Sent Events (EventSource)",
                    "  - Web Audio API (AudioContext)",
                    "• State Management:",
                    "  - Single source of truth in GeoPulseApp",
                    "  - Dual-layer persistence (LocalStorage + Server JSON)."
                ], ACCENT_GOLD)

    create_card(slide10, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
                "Full-Stack & DevOps",
                [
                    "• Server Engineering: Node.js & Express RESTful API with smart TTL caching.",
                    "• Version Control: Git repository with clean commits and .gitignore.",
                    "• GitHub Deployment: Live at github.com/arvindharishnataraj/wp-web-programming-project.",
                    "• Cloud Tunnel: Public HTTPS URL for live mobile presentation."
                ], ACCENT_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 11: Viva / Defense Questions & Answers
    # -------------------------------------------------------------
    slide11 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide11)
    add_header(slide11, "Project Defense & Viva-Voce Questions")

    create_card(slide11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.4),
                "Q1: Why Server-Sent Events (SSE) over WebSockets?",
                [
                    "• Ans: SSE operates over standard HTTP, supports automatic reconnection, and is lightweight for unidirectional server-to-client telemetry pushing, avoiding WebSocket protocol overhead."
                ], ACCENT_CYAN)

    create_card(slide11, Inches(6.8), Inches(1.8), Inches(5.6), Inches(2.4),
                "Q2: How does the caching mechanism work?",
                [
                    "• Ans: In-memory cache store with custom TTLs (25s for USGS, 3m for weather). Reduces external latency from 800ms down to < 5ms and prevents API rate limiting."
                ], ACCENT_GOLD)

    create_card(slide11, Inches(0.8), Inches(4.4), Inches(5.6), Inches(2.4),
                "Q3: How are map markers scaled?",
                [
                    "• Ans: Custom SVG DivIcons dynamically compute circle radius and concentric pulse rings exponentially proportional to the logarithmic Richter magnitude."
                ], ACCENT_EMERALD)

    create_card(slide11, Inches(6.8), Inches(4.4), Inches(5.6), Inches(2.4),
                "Q4: What makes this project relevant to South India?",
                [
                    "• Ans: Built-in focus presets for Chennai, Bengaluru, Hyderabad (INCOIS tsunami center), Kochi, Vizag, and the Andaman subduction trench fault line."
                ], ACCENT_CYAN)

    # -------------------------------------------------------------
    # SLIDE 12: Conclusion & Demonstration Links
    # -------------------------------------------------------------
    slide12 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide12)
    add_header(slide12, "Conclusion & Project Resources")

    hero_box = slide12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.8), Inches(10.333), Inches(4.8))
    hero_box.fill.solid()
    hero_box.fill.fore_color.rgb = CARD_BG
    hero_box.line.color.rgb = ACCENT_CYAN
    hero_box.line.width = Pt(2)

    tf_c = hero_box.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = Inches(0.5)
    tf_c.margin_top = Inches(0.4)

    p1 = tf_c.paragraphs[0]
    p1.text = "PROJECT SUMMARY & VERIFICATION"
    p1.font.size = Pt(14)
    p1.font.bold = True
    p1.font.color.rgb = ACCENT_CYAN
    p1.space_after = Pt(14)

    bullets = [
        "✔ GeoPulse 360 successfully implements a robust, full-stack real-time intelligence dashboard.",
        "✔ Integrates 3 live scientific APIs (USGS, Open-Meteo Weather/AQI, ISS Telemetry) with 0 API keys.",
        "✔ Specially calibrated for South Indian coastal monitoring (Bay of Bengal, Arabian Sea, Andaman Trench).",
        "✔ High-performance architecture with in-memory caching, SSE streaming, and Web Audio API alerts.",
        "✔ Fully committed and published to GitHub with comprehensive documentation and academic rubric."
    ]
    for b in bullets:
        p = tf_c.add_paragraph()
        p.text = b
        p.font.size = Pt(13)
        p.font.color.rgb = TEXT_LIGHT
        p.space_after = Pt(8)

    p_links = tf_c.add_paragraph()
    p_links.text = "\n🔗 GitHub: https://github.com/arvindharishnataraj/wp-web-programming-project\n🌐 Live Demonstration: https://0e8f329b8a1d6e.lhr.life\n👨‍🎓 Arvind Harish (240701052) • Rajalakshmi Engineering College (REC)"
    p_links.font.size = Pt(12)
    p_links.font.bold = True
    p_links.font.color.rgb = ACCENT_GOLD

    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    out1 = r"C:\Users\Harish\Downloads\GeoPulse_360_Web_Programming_Final_Project.pptx"
    create_presentation(out1)
