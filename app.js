/* ==========================================================================
   EcoTrace - Core Application Logic & Data Visualization
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        calculatorInputs: {
            carFuel: 'gasoline',
            carDistance: 12000,
            transitTime: 3,
            flightsShort: 2,
            flightsLong: 0,
            electricity: 300,
            cleanMix: 10,
            heatFuel: 'natural-gas',
            heatingEnergy: 400,
            diet: 'average-meat',
            localSourcing: 20,
            foodWaste: 'minimal',
            shopping: 'average',
            recyclePaper: true,
            recyclePlastic: true,
            recycleGlass: false,
            recycleMetal: false,
            digitalStreaming: 10,  // weekly hours
            digitalMeeting: 5,     // weekly hours
            digitalScrolling: 2    // daily hours
        },
        commitments: [], // array of action IDs (e.g. ['led-bulbs'])
        checkedHabits: [], // array of checked commitment IDs for the week
        sandboxSwitches: {
            solar: false,
            vegan: false,
            ev: false,
            flights: false,
            waste: false
        },
        quizAnswers: [],
        quizScore: 0,
        unlockedBadges: [],
        theme: 'light'
    };

    // --- DATA DICTIONARIES ---
    const ACTIONS_DATABASE = [
        {
            id: 'led-bulbs',
            category: 'energy',
            title: 'Switch to LED Bulbs',
            desc: 'Replace standard lightbulbs with energy-efficient LEDs to reduce residential electric draw.',
            difficulty: 'easy',
            impact: 150 // kg CO2 saved per year
        },
        {
            id: 'cold-wash',
            category: 'energy',
            title: 'Cold Water Laundry',
            desc: 'Run washing machines on cold cycles. Heating water consumes 90% of a washer\'s energy.',
            difficulty: 'easy',
            impact: 80
        },
        {
            id: 'thermostat',
            category: 'energy',
            title: 'Adjust Thermostat',
            desc: 'Lower thermostat by 2°C in winter and raise it by 2°C in summer for climate control savings.',
            difficulty: 'medium',
            impact: 220
        },
        {
            id: 'meatless-mondays',
            category: 'food',
            title: 'Meatless Mondays',
            desc: 'Ditch meat items just one day a week to reduce industrial livestock agricultural load.',
            difficulty: 'easy',
            impact: 160
        },
        {
            id: 'grow-food',
            category: 'food',
            title: 'Grow Your Own Produce',
            desc: 'Grow a small portion of your herbs and vegetables at home to limit packaging and transport.',
            difficulty: 'medium',
            impact: 90
        },
        {
            id: 'compost',
            category: 'waste',
            title: 'Compost Organic Waste',
            desc: 'Compost leftover food scraps to keep organic waste from generating landfill methane.',
            difficulty: 'medium',
            impact: 120
        },
        {
            id: 'commute-bike',
            category: 'transport',
            title: 'Cycle/Walk Short Trips',
            desc: 'Choose to bike or walk for all short errands and commutes under 3 kilometers.',
            difficulty: 'medium',
            impact: 450
        },
        {
            id: 'carpool',
            category: 'transport',
            title: 'Carpool to Commute',
            desc: 'Ride-share with coworkers or friends to decrease fuel costs and mileage.',
            difficulty: 'medium',
            impact: 350
        },
        {
            id: 'no-single-use',
            category: 'waste',
            title: 'Zero Single-Use Plastics',
            desc: 'Swap single-use water bottles, grocery bags, and utensils for reusable alternatives.',
            difficulty: 'easy',
            impact: 110
        },
        {
            id: 'solar-panels',
            category: 'energy',
            title: 'Rooftop Solar Install',
            desc: 'Fit solar energy grids or transition household utility to a green community solar program.',
            difficulty: 'hard',
            impact: 1200
        }
    ];

    const QUIZ_DATABASE = [
        {
            question: "Which sector is globally responsible for the largest share of greenhouse gas emissions?",
            options: [
                "Transportation (Cars, Planes, Ships)",
                "Electricity & Heat Production",
                "Agriculture, Forestry & Land Use",
                "Industrial Manufacturing & Construction"
            ],
            correct: 1,
            explain: "Electricity and heat production accounts for about 25% of global emissions due to fossil fuel combustion, followed closely by agriculture/forestry at 24%."
        },
        {
            question: "Which food item has the largest carbon footprint per kilogram of finished product?",
            options: [
                "Farmed Chicken Meat",
                "Pork Products",
                "Cow Milk Cheese",
                "Beef / Red Meat"
            ],
            correct: 3,
            explain: "Beef produces roughly 60kg of greenhouse gases per kg of meat—more than double cheese, and nearly ten times chicken—due to cow methane emissions and land clearing."
        },
        {
            question: "Approximately how much CO2 does a mature, healthy tree absorb each year?",
            options: [
                "Around 2 kg",
                "Around 22 kg",
                "Around 220 kg",
                "Around 2,200 kg"
            ],
            correct: 1,
            explain: "On average, a mature tree absorbs about 22 kg (48 lbs) of carbon dioxide annually, making global reforestation a key natural carbon offset buffer."
        },
        {
            question: "What is the primary greenhouse gas emitted directly by global human activities?",
            options: [
                "Methane (CH4)",
                "Nitrous Oxide (N2O)",
                "Carbon Dioxide (CO2)",
                "Fluorinated Gases"
            ],
            correct: 2,
            explain: "Carbon dioxide (CO2) represents about 76% of global human-caused greenhouse emissions, remaining in the atmosphere for centuries."
        },
        {
            question: "Which travel option produces the lowest emissions per passenger-kilometer?",
            options: [
                "Passenger Train / Subway",
                "Average Electric SUV",
                "Short-Haul Passenger Jet",
                "Single-Occupant Gasoline Sedan"
            ],
            correct: 0,
            explain: "Trains are highly energy-efficient and aggregate passengers on shared tracks. A typical train journey averages only about 15-30g of CO2 per passenger-km."
        }
    ];

    const BADGES_DATABASE = [
        {
            id: 'green-citizen',
            title: 'Green Citizen',
            desc: 'Footprint is below the national average (8.0 Tons).',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
        },
        {
            id: 'eco-warrior',
            title: 'Eco Warrior',
            desc: 'Footprint is below the target threshold (4.0 Tons).',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
        },
        {
            id: 'committed',
            title: 'Activist',
            desc: 'Committed to 3 or more carbon-reduction actions.',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`
        },
        {
            id: 'plant-powered',
            title: 'Plant Powered',
            desc: 'Selected Vegetarian or Vegan diet.',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 0 0-9 9c0 4.5 4.5 9 9 9s9-4.5 9-9-4.5-9-9-9zm0 3c3 0 5 2.5 5 5s-2.5 5-5 5-5-2.5-5-5 2.5-5 5-5z"/></svg>`
        },
        {
            id: 'solar-saver',
            title: 'Solar Saver',
            desc: 'Set renewable electricity mix above 75%.',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        },
        {
            id: 'carbon-minimalist',
            title: 'Minimalist',
            desc: 'Set shopping habits to Minimalist.',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`
        },
        {
            id: 'trivia-scholar',
            title: 'Trivia Scholar',
            desc: 'Scored 5/5 on the Climate Trivia challenge.',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
        }
    ];

    // --- CHARTS OBJECTS ---
    let categoryChart = null;
    let compareChart = null;

    // --- INITIALIZE FROM LOCAL STORAGE ---
    function loadState() {
        const savedState = localStorage.getItem('ecotrace_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                state = { ...state, ...parsed };
            } catch (e) {
                console.error("Error parsing stored state", e);
            }
        }
    }

    function saveState() {
        localStorage.setItem('ecotrace_state', JSON.stringify(state));
    }

    // --- CORE CALCULATOR LOGIC ---
    function calculateFootprint(inputs = state.calculatorInputs) {
        // 1. TRANSPORTATION
        let carFactor = 0.00018; // gasoline (tons CO2 / km)
        if (inputs.carFuel === 'diesel') carFactor = 0.00017;
        else if (inputs.carFuel === 'hybrid') carFactor = 0.00010;
        else if (inputs.carFuel === 'electric') carFactor = 0.00004;
        else if (inputs.carFuel === 'none') carFactor = 0.00000;

        const carEmissions = (inputs.carDistance * carFactor);
        const transitEmissions = (inputs.transitTime * 52 * 0.0012); // ~0.06 tons per weekly hour
        const flightsEmissions = (inputs.flightsShort * 0.15) + (inputs.flightsLong * 0.8);
        const transportTotal = carEmissions + transitEmissions + flightsEmissions;

        // 2. ENERGY
        const cleanMixMultiplier = (1 - (inputs.cleanMix / 100));
        const electricityEmissions = (inputs.electricity * 12) * cleanMixMultiplier * 0.00035; // 0.35 kg/kWh

        let heatingFactor = 0.00020; // Natural Gas (tons / kWh)
        if (inputs.heatFuel === 'oil') heatingFactor = 0.00027;
        else if (inputs.heatFuel === 'electric') heatingFactor = cleanMixMultiplier * 0.00035;
        else if (inputs.heatFuel === 'biomass') heatingFactor = 0.00003; // minimal footprint

        const heatingEmissions = (inputs.heatingEnergy * 12) * heatingFactor;
        const energyTotal = electricityEmissions + heatingEmissions;

        // 3. FOOD & DIET
        let dietBase = 2.2; // Average meat (tons/yr)
        if (inputs.diet === 'heavy-meat') dietBase = 3.2;
        else if (inputs.diet === 'vegetarian') dietBase = 1.5;
        else if (inputs.diet === 'vegan') dietBase = 0.9;

        let foodWasteAdjustment = 0.0; // Minimal
        if (inputs.foodWaste === 'moderate') foodWasteAdjustment = 0.15;
        else if (inputs.foodWaste === 'high') foodWasteAdjustment = 0.40;

        // Local sourcing reduces footprint up to 15% of the base diet
        const localSourcingDiscount = (inputs.localSourcing / 100) * 0.15 * dietBase;
        const foodTotal = Math.max(0.6, (dietBase - localSourcingDiscount) + foodWasteAdjustment);

        // 4. LIFESTYLE & WASTE
        let shoppingBase = 0.8; // Average
        if (inputs.shopping === 'minimalist') shoppingBase = 0.3;
        else if (inputs.shopping === 'consumerist') shoppingBase = 2.2;

        let wasteBase = 0.5;
        let recyclingDiscount = 0.0;
        if (inputs.recyclePaper) recyclingDiscount += 0.08;
        if (inputs.recyclePlastic) recyclingDiscount += 0.12;
        if (inputs.recycleGlass) recyclingDiscount += 0.06;
        if (inputs.recycleMetal) recyclingDiscount += 0.09;

        const wasteTotal = shoppingBase + Math.max(0.1, wasteBase - recyclingDiscount);

        // 5. DIGITAL CARBON FOOTPRINT (NEW FEATURE)
        // Streaming: 180g (0.00018 Tons) per hour
        // Calls: 120g (0.00012 Tons) per hour
        // Scrolling: 50g (0.00005 Tons) per hour
        const streamingEmissions = (inputs.digitalStreaming * 52 * 0.00018);
        const callsEmissions = (inputs.digitalMeeting * 52 * 0.00012);
        const scrollingEmissions = (inputs.digitalScrolling * 365 * 0.00005);
        const digitalTotal = streamingEmissions + callsEmissions + scrollingEmissions;

        return {
            transport: parseFloat(carEmissions + transitEmissions + flightsEmissions),
            energy: parseFloat(energyTotal),
            food: parseFloat(foodTotal),
            waste: parseFloat(wasteTotal),
            digital: parseFloat(digitalTotal),
            total: parseFloat((transportTotal + energyTotal + foodTotal + wasteTotal + digitalTotal).toFixed(2))
        };
    }

    // --- TAB NAVIGATION ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            navButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabPanels.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-hidden', 'true');
            });
            
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active');
                targetEl.setAttribute('aria-hidden', 'false');
            }

            if (targetTab === 'dashboard') {
                updateDashboardCharts();
            } else if (targetTab === 'sandbox') {
                updateSandboxSimulation();
            }
        });
    });

    // --- THEME SWITCHING ---
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');

    function setTheme(theme) {
        state.theme = theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.body.classList.remove('dark-theme');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
        saveState();
        updateDashboardCharts();
    }

    themeToggle.addEventListener('click', () => {
        setTheme(state.theme === 'light' ? 'dark' : 'light');
    });

    // Initialize Theme
    setTheme(state.theme);

    // --- WIZARD FORM LOGIC ---
    const wizardPanels = document.querySelectorAll('.wizard-panel');
    const wizardTabBtns = document.querySelectorAll('.wizard-tab-btn');
    const prevBtn = document.getElementById('prev-wizard-btn');
    const nextBtn = document.getElementById('next-wizard-btn');
    const wizardDots = document.querySelectorAll('.wizard-progress-dots .dot');
    let currentWizardIndex = 0;

    function showWizardPanel(index) {
        currentWizardIndex = index;
        wizardPanels.forEach((panel, i) => {
            const isActive = i === index;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
        wizardTabBtns.forEach((btn, i) => {
            const isActive = i === index;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        wizardDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        prevBtn.disabled = index === 0;
        if (index === wizardPanels.length - 1) {
            nextBtn.textContent = 'Finish & View Dashboard';
        } else {
            nextBtn.textContent = 'Next';
        }
    }

    wizardTabBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            showWizardPanel(index);
        });
    });

    prevBtn.addEventListener('click', () => {
        if (currentWizardIndex > 0) {
            showWizardPanel(currentWizardIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentWizardIndex < wizardPanels.length - 1) {
            showWizardPanel(currentWizardIndex + 1);
        } else {
            // Jump to Dashboard tab
            document.querySelector('.nav-btn[data-tab="dashboard"]').click();
        }
    });

    // --- CALCULATOR INTERACTION & BINDINGS ---
    function bindInputs() {
        // Fuel Type radios
        const fuelRadios = document.querySelectorAll('input[name="car-fuel"]');
        const carDistGroup = document.getElementById('car-dist-group');
        fuelRadios.forEach(radio => {
            // Setup initial selection
            if (radio.value === state.calculatorInputs.carFuel) {
                radio.checked = true;
                if (radio.value === 'none') carDistGroup.style.display = 'none';
            }
            radio.addEventListener('change', (e) => {
                state.calculatorInputs.carFuel = e.target.value;
                if (e.target.value === 'none') {
                    carDistGroup.style.display = 'none';
                } else {
                    carDistGroup.style.display = 'flex';
                }
                onInputsChange();
            });
        });

        // Car Distance
        const carDistInput = document.getElementById('car-distance');
        const carDistVal = document.getElementById('car-distance-val');
        carDistInput.value = state.calculatorInputs.carDistance;
        carDistVal.textContent = state.calculatorInputs.carDistance.toLocaleString() + ' km';
        carDistInput.addEventListener('input', (e) => {
            state.calculatorInputs.carDistance = parseInt(e.target.value);
            carDistVal.textContent = state.calculatorInputs.carDistance.toLocaleString() + ' km';
            onInputsChange();
        });

        // Public Transit
        const transitInput = document.getElementById('transit-time');
        const transitVal = document.getElementById('transit-time-val');
        transitInput.value = state.calculatorInputs.transitTime;
        transitVal.textContent = state.calculatorInputs.transitTime + ' hours';
        transitInput.addEventListener('input', (e) => {
            state.calculatorInputs.transitTime = parseInt(e.target.value);
            transitVal.textContent = state.calculatorInputs.transitTime + ' hours';
            onInputsChange();
        });

        // Short Flights
        const shortFlightsInput = document.getElementById('flights-short');
        const shortFlightsVal = document.getElementById('flights-short-val');
        shortFlightsInput.value = state.calculatorInputs.flightsShort;
        shortFlightsVal.textContent = state.calculatorInputs.flightsShort + ' flights/yr';
        shortFlightsInput.addEventListener('input', (e) => {
            state.calculatorInputs.flightsShort = parseInt(e.target.value);
            shortFlightsVal.textContent = state.calculatorInputs.flightsShort + ' flights/yr';
            onInputsChange();
        });

        // Long Flights
        const longFlightsInput = document.getElementById('flights-long');
        const longFlightsVal = document.getElementById('flights-long-val');
        longFlightsInput.value = state.calculatorInputs.flightsLong;
        longFlightsVal.textContent = state.calculatorInputs.flightsLong + ' flights/yr';
        longFlightsInput.addEventListener('input', (e) => {
            state.calculatorInputs.flightsLong = parseInt(e.target.value);
            longFlightsVal.textContent = state.calculatorInputs.flightsLong + ' flights/yr';
            onInputsChange();
        });

        // Electricity consumption
        const elecInput = document.getElementById('electricity');
        const elecVal = document.getElementById('electricity-val');
        elecInput.value = state.calculatorInputs.electricity;
        elecVal.textContent = state.calculatorInputs.electricity + ' kWh';
        elecInput.addEventListener('input', (e) => {
            state.calculatorInputs.electricity = parseInt(e.target.value);
            elecVal.textContent = state.calculatorInputs.electricity + ' kWh';
            onInputsChange();
        });

        // Clean electricity mix
        const cleanMixInput = document.getElementById('clean-mix');
        const cleanMixVal = document.getElementById('clean-mix-val');
        cleanMixInput.value = state.calculatorInputs.cleanMix;
        cleanMixVal.textContent = state.calculatorInputs.cleanMix + '%';
        cleanMixInput.addEventListener('input', (e) => {
            state.calculatorInputs.cleanMix = parseInt(e.target.value);
            cleanMixVal.textContent = state.calculatorInputs.cleanMix + '%';
            onInputsChange();
        });

        // Heating Fuel Radios
        const heatRadios = document.querySelectorAll('input[name="heat-fuel"]');
        heatRadios.forEach(radio => {
            if (radio.value === state.calculatorInputs.heatFuel) radio.checked = true;
            radio.addEventListener('change', (e) => {
                state.calculatorInputs.heatFuel = e.target.value;
                onInputsChange();
            });
        });

        // Heating consumption
        const heatEnergyInput = document.getElementById('heating-energy');
        const heatEnergyVal = document.getElementById('heating-energy-val');
        heatEnergyInput.value = state.calculatorInputs.heatingEnergy;
        heatEnergyVal.textContent = state.calculatorInputs.heatingEnergy + ' kWh';
        heatEnergyInput.addEventListener('input', (e) => {
            state.calculatorInputs.heatingEnergy = parseInt(e.target.value);
            heatEnergyVal.textContent = state.calculatorInputs.heatingEnergy + ' kWh';
            onInputsChange();
        });

        // Diet type radios
        const dietRadios = document.querySelectorAll('input[name="diet"]');
        dietRadios.forEach(radio => {
            if (radio.value === state.calculatorInputs.diet) radio.checked = true;
            radio.addEventListener('change', (e) => {
                state.calculatorInputs.diet = e.target.value;
                onInputsChange();
            });
        });

        // Food Local Sourcing
        const localInput = document.getElementById('local-sourcing');
        const localVal = document.getElementById('local-sourcing-val');
        localInput.value = state.calculatorInputs.localSourcing;
        localVal.textContent = state.calculatorInputs.localSourcing + '%';
        localInput.addEventListener('input', (e) => {
            state.calculatorInputs.localSourcing = parseInt(e.target.value);
            localVal.textContent = state.calculatorInputs.localSourcing + '%';
            onInputsChange();
        });

        // Food waste radios
        const wasteRadios = document.querySelectorAll('input[name="food-waste"]');
        wasteRadios.forEach(radio => {
            if (radio.value === state.calculatorInputs.foodWaste) radio.checked = true;
            radio.addEventListener('change', (e) => {
                state.calculatorInputs.foodWaste = e.target.value;
                onInputsChange();
            });
        });

        // Shopping frequency radios
        const shopRadios = document.querySelectorAll('input[name="shopping"]');
        shopRadios.forEach(radio => {
            if (radio.value === state.calculatorInputs.shopping) radio.checked = true;
            radio.addEventListener('change', (e) => {
                state.calculatorInputs.shopping = e.target.value;
                onInputsChange();
            });
        });

        // Recycling checkboxes
        const recyclePaperInput = document.getElementById('recycle-paper');
        recyclePaperInput.checked = state.calculatorInputs.recyclePaper;
        recyclePaperInput.addEventListener('change', (e) => {
            state.calculatorInputs.recyclePaper = e.target.checked;
            onInputsChange();
        });

        const recyclePlasticInput = document.getElementById('recycle-plastic');
        recyclePlasticInput.checked = state.calculatorInputs.recyclePlastic;
        recyclePlasticInput.addEventListener('change', (e) => {
            state.calculatorInputs.recyclePlastic = e.target.checked;
            onInputsChange();
        });

        const recycleGlassInput = document.getElementById('recycle-glass');
        recycleGlassInput.checked = state.calculatorInputs.recycleGlass;
        recycleGlassInput.addEventListener('change', (e) => {
            state.calculatorInputs.recycleGlass = e.target.checked;
            onInputsChange();
        });

        const recycleMetalInput = document.getElementById('recycle-metal');
        recycleMetalInput.checked = state.calculatorInputs.recycleMetal;
        recycleMetalInput.addEventListener('change', (e) => {
            state.calculatorInputs.recycleMetal = e.target.checked;
            onInputsChange();
        });

        // NEW: Digital Carbon Sliders Binding
        const streamingInput = document.getElementById('digital-streaming');
        const streamingVal = document.getElementById('digital-streaming-val');
        streamingInput.value = state.calculatorInputs.digitalStreaming;
        streamingVal.textContent = state.calculatorInputs.digitalStreaming + ' hours/week';
        streamingInput.addEventListener('input', (e) => {
            state.calculatorInputs.digitalStreaming = parseInt(e.target.value);
            streamingVal.textContent = state.calculatorInputs.digitalStreaming + ' hours/week';
            onInputsChange();
        });

        const meetingInput = document.getElementById('digital-meeting');
        const meetingVal = document.getElementById('digital-meeting-val');
        meetingInput.value = state.calculatorInputs.digitalMeeting;
        meetingVal.textContent = state.calculatorInputs.digitalMeeting + ' hours/week';
        meetingInput.addEventListener('input', (e) => {
            state.calculatorInputs.digitalMeeting = parseInt(e.target.value);
            meetingVal.textContent = state.calculatorInputs.digitalMeeting + ' hours/week';
            onInputsChange();
        });

        const scrollingInput = document.getElementById('digital-scrolling');
        const scrollingVal = document.getElementById('digital-scrolling-val');
        scrollingInput.value = state.calculatorInputs.digitalScrolling;
        scrollingVal.textContent = state.calculatorInputs.digitalScrolling + ' hours/day';
        scrollingInput.addEventListener('input', (e) => {
            state.calculatorInputs.digitalScrolling = parseFloat(e.target.value);
            scrollingVal.textContent = state.calculatorInputs.digitalScrolling + ' hours/day';
            onInputsChange();
        });

        // NEW: Website Carbon Analyzer Button
        const checkerBtn = document.getElementById('web-checker-btn');
        if (checkerBtn) checkerBtn.addEventListener('click', runWebChecker);

        // Bind Premium Feature Lock Overlays to trigger Auth modal
        const webLock = document.getElementById('web-checker-lock');
        if (webLock) {
            webLock.addEventListener('click', () => {
                const authBtn = document.getElementById('auth-modal-btn');
                if (authBtn) authBtn.click();
            });
        }
        const chatLock = document.getElementById('chatbot-lock');
        if (chatLock) {
            chatLock.addEventListener('click', () => {
                const authBtn = document.getElementById('auth-modal-btn');
                if (authBtn) authBtn.click();
            });
        }
    }

    function onInputsChange() {
        saveState();
        checkUnlockedBadges();
        updateDashboardUI();
    }

    // --- WEBSITE CARBON CHECKER LOGIC ---
    function runWebChecker() {
        const urlInput = document.getElementById('web-checker-url').value.trim();
        if (!urlInput) return;

        const resultsGrid = document.getElementById('web-checker-results');
        const weightVal = document.getElementById('web-weight-val');
        const co2Val = document.getElementById('web-co2-val');
        const hostingVal = document.getElementById('web-hosting-val');
        const gradeVal = document.getElementById('web-grade-val');
        const tipText = document.getElementById('web-checker-tip');
        const checkerBtn = document.getElementById('web-checker-btn');

        const originalBtnText = checkerBtn.textContent;
        checkerBtn.textContent = 'Auditing...';
        checkerBtn.disabled = true;

        resultsGrid.classList.add('hidden');
        tipText.classList.add('hidden');

        fetch('/api/check-website', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlInput })
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            weightVal.textContent = data.weightMB.toFixed(2) + ' MB';
            co2Val.textContent = data.co2Grams.toFixed(2) + ' g';
            hostingVal.textContent = data.isGreen ? 'Clean Energy' : 'Fossil Grid';
            hostingVal.style.color = data.isGreen ? 'var(--color-green)' : '#ef4444';
            gradeVal.textContent = data.grade;
            
            if (data.isEstimated) {
                tipText.innerHTML = `<strong>Note:</strong> ${data.note || 'Calculations estimated.'}<br>Web weights are measured by fetching page header content lengths. Optimized media and compressed assets keep weights low.`;
            } else {
                tipText.innerHTML = `This page transfers <strong>${data.weightMB} MB</strong> per load. Making assets smaller, compression, and clean hosting makes the web green!`;
            }

            resultsGrid.classList.remove('hidden');
            tipText.classList.remove('hidden');
        })
        .catch(err => {
            console.error('Error auditing website:', err);
            // Local fallback
            let hash = 0;
            for (let i = 0; i < urlInput.length; i++) {
                hash = urlInput.charCodeAt(i) + ((hash << 5) - hash);
            }
            const pageWeight = Math.abs((hash % 46) + 4) / 10; 
            const co2E = pageWeight * 0.18; 
            const isGreen = Math.abs(hash % 2) === 0;
            let grade = 'B';
            if (co2E > 0.5) grade = 'D';
            else if (co2E < 0.15) grade = 'A';

            weightVal.textContent = pageWeight.toFixed(1) + ' MB (Simulated)';
            co2Val.textContent = co2E.toFixed(2) + ' g';
            hostingVal.textContent = isGreen ? 'Clean Energy' : 'Fossil Grid';
            hostingVal.style.color = isGreen ? 'var(--color-green)' : '#ef4444';
            gradeVal.textContent = grade;

            resultsGrid.classList.remove('hidden');
            tipText.classList.remove('hidden');
        })
        .finally(() => {
            checkerBtn.textContent = originalBtnText;
            checkerBtn.disabled = false;
        });
    }

    // --- DASHBOARD UI UPDATING ---
    function updateDashboardUI() {
        const results = calculateFootprint();
        
        // Total Footprint Text
        const footprintValueEl = document.getElementById('total-footprint-value');
        footprintValueEl.textContent = results.total.toFixed(2);
        
        // Status Badge
        const statusEl = document.getElementById('footprint-status');
        if (results.total < 4.0) {
            statusEl.textContent = 'Excellent (Eco Target Met)';
            statusEl.className = 'stat-subtitle status-good';
        } else if (results.total < 8.0) {
            statusEl.textContent = 'Moderate (Below Average)';
            statusEl.className = 'stat-subtitle status-warn';
        } else {
            statusEl.textContent = 'Above Average (Action Needed)';
            statusEl.className = 'stat-subtitle status-bad';
        }

        // Comparison vs National Average
        const compareValueEl = document.getElementById('comparison-value');
        const nationalAvg = 8.0;
        const diffPercent = Math.round(((results.total - nationalAvg) / nationalAvg) * 100);
        if (diffPercent < 0) {
            compareValueEl.textContent = `${Math.abs(diffPercent)}% Less`;
            compareValueEl.style.color = 'var(--color-green)';
        } else if (diffPercent > 0) {
            compareValueEl.textContent = `${diffPercent}% More`;
            compareValueEl.style.color = '#ef4444';
        } else {
            compareValueEl.textContent = 'Equal';
            compareValueEl.style.color = 'var(--text-primary)';
        }

        // Active Commitments count
        const commitCountEl = document.getElementById('active-commitments-count');
        commitCountEl.textContent = state.commitments.length;

        // Estimated savings
        const savingsValueEl = document.getElementById('projected-savings-value');
        const totalSavings = state.commitments.reduce((acc, actionId) => {
            const act = ACTIONS_DATABASE.find(a => a.id === actionId);
            return acc + (act ? act.impact : 0);
        }, 0);
        savingsValueEl.textContent = totalSavings.toLocaleString() + ' kg';

        // Redraw badges
        renderBadgesList();
    }

    // --- CHARTS GENERATION & RENDER ---
    function updateDashboardCharts() {
        const results = calculateFootprint();
        const fontColor = state.theme === 'dark' ? '#92aba0' : '#53645b';
        const gridColor = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
        
        // 1. DOUGHNUT CHART (Updated for 5 slices)
        const categoryData = [results.transport, results.energy, results.food, results.waste, results.digital];
        const categoryLabels = ['Transport', 'Energy', 'Food', 'Waste', 'Digital'];
        const categoryColors = [
            getComputedStyle(document.documentElement).getPropertyValue('--transport-color').trim(),
            getComputedStyle(document.documentElement).getPropertyValue('--energy-color').trim(),
            getComputedStyle(document.documentElement).getPropertyValue('--food-color').trim(),
            getComputedStyle(document.documentElement).getPropertyValue('--waste-color').trim(),
            '#06b6d4' // cyan for digital
        ];

        if (categoryChart) {
            categoryChart.data.datasets[0].data = categoryData;
            categoryChart.data.datasets[0].backgroundColor = categoryColors;
            categoryChart.options.plugins.legend.labels.color = fontColor;
            categoryChart.update();
        } else {
            const ctxCat = document.getElementById('categoryChart').getContext('2d');
            categoryChart = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        data: categoryData,
                        backgroundColor: categoryColors,
                        borderWidth: state.theme === 'dark' ? 2 : 1,
                        borderColor: state.theme === 'dark' ? '#0f1c16' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 10,
                                color: fontColor,
                                font: { family: 'Inter', size: 10, weight: '500' }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.label}: ${context.raw.toFixed(2)} Tons CO₂e`;
                                }
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }

        // 2. COMPARISON BAR CHART
        const compareData = [results.total, 8.0, 2.0];
        const compareLabels = ['You', 'National Average', 'Net Zero Target'];
        const compareColors = [
            getComputedStyle(document.documentElement).getPropertyValue('--color-green').trim(),
            state.theme === 'dark' ? '#273c33' : '#cbd5e1',
            '#3b82f6'
        ];

        if (compareChart) {
            compareChart.data.datasets[0].data = compareData;
            compareChart.data.datasets[0].backgroundColor = compareColors;
            compareChart.options.scales.x.ticks.color = fontColor;
            compareChart.options.scales.x.grid.color = gridColor;
            compareChart.options.scales.y.ticks.color = fontColor;
            compareChart.options.scales.y.grid.color = gridColor;
            compareChart.update();
        } else {
            const ctxComp = document.getElementById('compareChart').getContext('2d');
            compareChart = new Chart(ctxComp, {
                type: 'bar',
                data: {
                    labels: compareLabels,
                    datasets: [{
                        data: compareData,
                        backgroundColor: compareColors,
                        borderRadius: 6,
                        barThickness: 24
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: fontColor, font: { family: 'Inter', size: 10 } },
                            title: { display: true, text: 'Tons CO₂e/year', color: fontColor, font: { family: 'Inter', size: 10, weight: '600' } }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: fontColor, font: { family: 'Outfit', size: 11, weight: '600' } }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.raw.toFixed(2)} Tons CO₂e/yr`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // 3. UPDATE ACCESSIBLE SUMMARY TABLES
        const totalValue = results.total || 0;
        const categoriesMap = {
            'transport': results.transport,
            'energy': results.energy,
            'food': results.food,
            'waste': results.waste,
            'digital': results.digital
        };
        for (const cat in categoriesMap) {
            const val = categoriesMap[cat];
            const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
            const valEl = document.getElementById(`breakdown-val-${cat}`);
            const pctEl = document.getElementById(`breakdown-pct-${cat}`);
            if (valEl) valEl.textContent = `${val.toFixed(2)} Tons`;
            if (pctEl) pctEl.textContent = `${pct.toFixed(0)}%`;
        }

        const compareYouEl = document.getElementById('compare-val-you');
        if (compareYouEl) {
            compareYouEl.textContent = `${results.total.toFixed(2)} Tons`;
        }
    }

    // --- BADGES LOGIC ---
    function checkUnlockedBadges() {
        const results = calculateFootprint();
        const currentBadges = [...state.unlockedBadges];
        state.unlockedBadges = [];

        // 1. Green Citizen: Footprint < 8.0 tons
        if (results.total < 8.0) state.unlockedBadges.push('green-citizen');
        
        // 2. Eco Warrior: Footprint < 4.0 tons
        if (results.total < 4.0) state.unlockedBadges.push('eco-warrior');

        // 3. Activist: committed to 3 or more actions
        if (state.commitments.length >= 3) state.unlockedBadges.push('committed');

        // 4. Plant Powered: vegetarian or vegan diet
        if (state.calculatorInputs.diet === 'vegetarian' || state.calculatorInputs.diet === 'vegan') {
            state.unlockedBadges.push('plant-powered');
        }

        // 5. Solar Saver: Renewable mix >= 75%
        if (state.calculatorInputs.cleanMix >= 75) state.unlockedBadges.push('solar-saver');

        // 6. Minimalist: shopping is minimalist
        if (state.calculatorInputs.shopping === 'minimalist') state.unlockedBadges.push('carbon-minimalist');

        // 7. Trivia Scholar: scored 5/5 on quiz (re-add if present in currentBadges)
        if (currentBadges.includes('trivia-scholar')) {
            state.unlockedBadges.push('trivia-scholar');
        }

        saveState();
    }

    function renderBadgesList() {
        const container = document.getElementById('badges-container');
        container.innerHTML = '';

        BADGES_DATABASE.forEach(badge => {
            const isUnlocked = state.unlockedBadges.includes(badge.id);
            const badgeEl = document.createElement('div');
            badgeEl.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
            badgeEl.innerHTML = `
                <div class="badge-icon-wrapper">
                    ${badge.icon}
                </div>
                <div class="badge-info">
                    <span class="badge-title">${badge.title}</span>
                    <span class="badge-desc">${badge.desc}</span>
                </div>
            `;
            container.appendChild(badgeEl);
        });

        document.getElementById('unlocked-count').textContent = state.unlockedBadges.length;
    }

    // --- ACTIONS & HABITS PLANNER LOGIC ---
    let activeFilter = 'all';
    
    function renderActionsMarketplace() {
        const grid = document.getElementById('actions-marketplace-grid');
        grid.innerHTML = '';

        const filteredActions = ACTIONS_DATABASE.filter(action => {
            return activeFilter === 'all' || action.category === activeFilter;
        });

        filteredActions.forEach(action => {
            const isCommitted = state.commitments.includes(action.id);
            const card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = `
                <div class="action-card-header">
                    <span class="action-category-tag ${action.category}-accent">${action.category}</span>
                    <span class="action-difficulty-badge diff-${action.difficulty}">${action.difficulty}</span>
                </div>
                <div class="action-body">
                    <h4 class="action-title">${action.title}</h4>
                    <p class="action-desc">${action.desc}</p>
                    <span class="action-impact-label">-${action.impact} kg CO₂ / yr</span>
                </div>
                <button class="action-commit-btn primary-btn" data-action-id="${action.id}" style="${isCommitted ? 'background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);' : ''}">
                    ${isCommitted ? 'Cancel Commitment' : 'Commit to Habit'}
                </button>
            `;

            const btn = card.querySelector('.action-commit-btn');
            btn.addEventListener('click', () => {
                toggleCommitment(action.id);
            });

            grid.appendChild(card);
        });
    }

    function toggleCommitment(actionId) {
        const index = state.commitments.indexOf(actionId);
        if (index === -1) {
            state.commitments.push(actionId);
        } else {
            state.commitments.splice(index, 1);
            // Also uncheck in active habits
            const habitIdx = state.checkedHabits.indexOf(actionId);
            if (habitIdx !== -1) {
                state.checkedHabits.splice(habitIdx, 1);
            }
        }
        saveState();
        checkUnlockedBadges();
        updateDashboardUI();
        renderActionsMarketplace();
        renderCommitmentsChecklist();
    }

    // Filters behavior
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-filter');
            renderActionsMarketplace();
        });
    });

    function renderCommitmentsChecklist() {
        const container = document.getElementById('commitments-checklist-container');
        const countVal = document.getElementById('active-com-val');
        const savingsVal = document.getElementById('active-savings-val');
        const progressBarFill = document.getElementById('weekly-savings-bar');
        const percentageText = document.getElementById('weekly-savings-percentage');

        container.innerHTML = '';
        countVal.textContent = state.commitments.length;

        // Calculate total savings from active commitments
        const totalSaved = state.commitments.reduce((acc, actionId) => {
            const act = ACTIONS_DATABASE.find(a => a.id === actionId);
            return acc + (act ? act.impact : 0);
        }, 0);
        savingsVal.textContent = totalSaved.toLocaleString() + ' kg';

        if (state.commitments.length === 0) {
            container.innerHTML = `
                <div class="checklist-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="placeholder-icon">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <p>You haven't committed to any habits yet. Choose actions on the left to start shrinking your footprint!</p>
                </div>
            `;
            progressBarFill.style.width = '0%';
            percentageText.textContent = '0%';
            return;
        }

        // Generate Checklist Items
        state.commitments.forEach(actionId => {
            const action = ACTIONS_DATABASE.find(a => a.id === actionId);
            if (!action) return;

            const isChecked = state.checkedHabits.includes(actionId);
            const item = document.createElement('div');
            item.className = `checklist-item ${isChecked ? 'checked' : ''}`;
            item.innerHTML = `
                <div class="checklist-item-left">
                    <input type="checkbox" data-habit-id="${actionId}" ${isChecked ? 'checked' : ''}>
                    <span class="checklist-item-title">${action.title}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="checklist-item-impact">-${action.impact} kg</span>
                    <button class="remove-commit-btn" data-remove-id="${actionId}" title="Remove Commitment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            // Bind checkbox checking
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!state.checkedHabits.includes(actionId)) {
                        state.checkedHabits.push(actionId);
                    }
                } else {
                    const idx = state.checkedHabits.indexOf(actionId);
                    if (idx !== -1) {
                        state.checkedHabits.splice(idx, 1);
                    }
                }
                saveState();
                renderCommitmentsChecklist();
            });

            // Bind remove button
            const removeBtn = item.querySelector('.remove-commit-btn');
            removeBtn.addEventListener('click', () => {
                toggleCommitment(actionId);
            });

            container.appendChild(item);
        });

        // Weekly progress calculations
        const checkedCount = state.checkedHabits.length;
        const totalCount = state.commitments.length;
        const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
        
        progressBarFill.style.width = `${progressPercentage}%`;
        percentageText.textContent = `${progressPercentage}%`;
    }

    // --- "WHAT-IF" SANDBOX SIMULATOR ---
    const simSolar = document.getElementById('sim-solar');
    const simVegan = document.getElementById('sim-vegan');
    const simEV = document.getElementById('sim-ev');
    const simFlights = document.getElementById('sim-flights');
    const simWaste = document.getElementById('sim-waste');

    // Bind Sandbox toggle triggers
    [simSolar, simVegan, simEV, simFlights, simWaste].forEach(el => {
        el.addEventListener('change', () => {
            state.sandboxSwitches = {
                solar: simSolar.checked,
                vegan: simVegan.checked,
                ev: simEV.checked,
                flights: simFlights.checked,
                waste: simWaste.checked
            };
            saveState();
            updateSandboxSimulation();
        });
    });

    // Populate toggles from initial state on load
    function initSandboxState() {
        simSolar.checked = state.sandboxSwitches.solar;
        simVegan.checked = state.sandboxSwitches.vegan;
        simEV.checked = state.sandboxSwitches.ev;
        simFlights.checked = state.sandboxSwitches.flights;
        simWaste.checked = state.sandboxSwitches.waste;
    }

    function updateSandboxSimulation() {
        const baseline = calculateFootprint();
        
        // Construct sandbox cloned inputs
        const sandboxInputs = { ...state.calculatorInputs };

        // Apply Sandbox Overrides
        if (state.sandboxSwitches.solar) {
            sandboxInputs.cleanMix = 100;
        }
        if (state.sandboxSwitches.vegan) {
            sandboxInputs.diet = 'vegan';
        }
        if (state.sandboxSwitches.ev) {
            sandboxInputs.carFuel = 'electric';
            if (state.sandboxSwitches.solar) {
                sandboxInputs.cleanMix = 100;
            }
        }
        if (state.sandboxSwitches.flights) {
            sandboxInputs.flightsShort = Math.round(sandboxInputs.flightsShort / 2);
            sandboxInputs.flightsLong = Math.round(sandboxInputs.flightsLong / 2);
        }
        if (state.sandboxSwitches.waste) {
            sandboxInputs.shopping = 'minimalist';
            sandboxInputs.recyclePaper = true;
            sandboxInputs.recyclePlastic = true;
            sandboxInputs.recycleGlass = true;
            sandboxInputs.recycleMetal = true;
        }

        const simulated = calculateFootprint(sandboxInputs);

        // Update Graphic Bars
        const baselineValEl = document.getElementById('sim-baseline-value');
        const projectedValEl = document.getElementById('sim-projected-value');
        const baselineBar = document.getElementById('sim-baseline-fill');
        const projectedBar = document.getElementById('sim-projected-fill');

        baselineValEl.textContent = `${baseline.total.toFixed(2)} Tons`;
        projectedValEl.textContent = `${simulated.total.toFixed(2)} Tons`;

        // Bar sizing relative to baseline
        const maxVal = Math.max(baseline.total, 8.0);
        const baselinePct = (baseline.total / maxVal) * 100;
        const projectedPct = (simulated.total / maxVal) * 100;

        baselineBar.style.width = `${baselinePct}%`;
        projectedBar.style.width = `${projectedPct}%`;

        // Update Results Cards
        const avoidedValEl = document.getElementById('sim-avoided-val');
        const avoidedPctEl = document.getElementById('sim-avoided-pct');
        const treesValEl = document.getElementById('sim-trees-val');

        const tonsAvoided = Math.max(0, baseline.total - simulated.total);
        const percentReduced = baseline.total > 0 ? Math.round((tonsAvoided / baseline.total) * 100) : 0;
        
        avoidedValEl.textContent = avoidedFactorPrint(tonsAvoided);
        avoidedPctEl.textContent = `${percentReduced}% Reduction`;

        // 1 Tree absorbs roughly 22kg CO2 per year
        const treesEquivalent = Math.round((tonsAvoided * 1000) / 22);
        treesValEl.textContent = treesEquivalent.toLocaleString();

        // Render Trees SVG forest plot
        renderSandboxForest(treesEquivalent);
    }

    function avoidedFactorPrint(val) {
        return val.toFixed(2);
    }

    function renderSandboxForest(numTrees) {
        const plot = document.getElementById('tree-plot-area');
        plot.innerHTML = '';

        const iconsToDraw = Math.min(40, Math.floor(numTrees / 12));
        
        if (iconsToDraw === 0) {
            plot.innerHTML = '<span style="font-size:0.8rem; color:var(--text-secondary); opacity:0.6; padding:1.5rem 0;">Simulation results are equal. Check toggles above to grow your simulated forest!</span>';
            return;
        }

        const treeSVG = `
            <svg class="sim-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 22h20L12 2z" fill="rgba(16, 185, 129, 0.2)" stroke="var(--color-green)"/>
                <path d="M12 12v10" stroke="var(--color-green-dark)" stroke-width="2"/>
            </svg>
        `;

        for (let i = 0; i < iconsToDraw; i++) {
            const treeWrapper = document.createElement('div');
            treeWrapper.style.animationDelay = `${i * 0.03}s`;
            treeWrapper.innerHTML = treeSVG;
            plot.appendChild(treeWrapper.firstElementChild);
        }
    }

    // --- CLIMATE TRIVIA QUIZ ENGINE ---
    const quizIntro = document.getElementById('quiz-intro');
    const quizQuestionContainer = document.getElementById('quiz-question-container');
    const quizResults = document.getElementById('quiz-results');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const retryQuizBtn = document.getElementById('retry-quiz-btn');
    const viewDashboardBtn = document.getElementById('view-dashboard-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    
    const questionTextEl = document.getElementById('quiz-question-text');
    const optionsContainer = document.getElementById('quiz-options-container');
    const progressFill = document.getElementById('quiz-progress-fill');
    const progressNumText = document.getElementById('quiz-question-num');
    const scoreTextEl = document.getElementById('quiz-score-indicator');
    
    const feedbackPanel = document.getElementById('quiz-feedback');
    const feedbackStatusEl = document.getElementById('feedback-status');
    const feedbackExplainEl = document.getElementById('feedback-explanation');

    let currentQuestionIndex = 0;
    let quizScore = 0;
    let hasAnswered = false;

    startQuizBtn.addEventListener('click', startQuiz);
    retryQuizBtn.addEventListener('click', startQuiz);
    nextQuestionBtn.addEventListener('click', handleNextQuestion);
    
    viewDashboardBtn.addEventListener('click', () => {
        document.querySelector('.nav-btn[data-tab="dashboard"]').click();
    });

    function startQuiz() {
        currentQuestionIndex = 0;
        quizScore = 0;
        quizIntro.classList.remove('active');
        quizResults.classList.remove('active');
        quizQuestionContainer.classList.add('active');
        loadQuestion(0);
    }

    function loadQuestion(index) {
        hasAnswered = false;
        nextQuestionBtn.disabled = true;
        feedbackPanel.classList.remove('active');
        
        const questionData = QUIZ_DATABASE[index];
        questionTextEl.textContent = questionData.question;
        progressNumText.textContent = `Question ${index + 1} of ${QUIZ_DATABASE.length}`;
        scoreTextEl.textContent = `Eco Score: ${quizScore}/${QUIZ_DATABASE.length}`;
        
        const percentage = ((index + 1) / QUIZ_DATABASE.length) * 100;
        progressFill.style.width = `${percentage}%`;

        optionsContainer.innerHTML = '';
        questionData.options.forEach((optText, i) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt-btn';
            btn.textContent = optText;
            btn.addEventListener('click', () => {
                if (!hasAnswered) selectOption(i);
            });
            optionsContainer.appendChild(btn);
        });
    }

    function selectOption(selectedIdx) {
        hasAnswered = true;
        nextQuestionBtn.disabled = false;
        
        const questionData = QUIZ_DATABASE[currentQuestionIndex];
        const correctIdx = questionData.correct;
        const optionsButtons = optionsContainer.querySelectorAll('.quiz-opt-btn');

        optionsButtons.forEach((btn, i) => {
            btn.disabled = true;
            if (i === correctIdx) {
                btn.classList.add('correct');
            } else if (i === selectedIdx) {
                btn.classList.add('incorrect');
            }
        });

        const isCorrect = selectedIdx === correctIdx;
        if (isCorrect) {
            quizScore++;
            feedbackPanel.style.borderLeftColor = 'var(--color-green)';
            feedbackStatusEl.textContent = 'Correct Answer!';
            feedbackStatusEl.style.color = 'var(--color-green-dark)';
        } else {
            feedbackPanel.style.borderLeftColor = '#ef4444';
            feedbackStatusEl.textContent = 'Incorrect Answer';
            feedbackStatusEl.style.color = '#ef4444';
        }

        feedbackExplainEl.textContent = questionData.explain;
        feedbackPanel.classList.add('active');
        scoreTextEl.textContent = `Eco Score: ${quizScore}/${QUIZ_DATABASE.length}`;
    }

    function handleNextQuestion() {
        if (currentQuestionIndex < QUIZ_DATABASE.length - 1) {
            currentQuestionIndex++;
            loadQuestion(currentQuestionIndex);
        } else {
            showQuizResults();
        }
    }

    function showQuizResults() {
        quizQuestionContainer.classList.remove('active');
        quizResults.classList.add('active');

        const resultsTitle = document.getElementById('quiz-results-title');
        const resultsDesc = document.getElementById('quiz-results-desc');
        const badgeAlert = document.getElementById('quiz-badge-unlock-alert');
        const resultsSvg = document.getElementById('quiz-results-svg');

        resultsDesc.textContent = `You scored ${quizScore} out of ${QUIZ_DATABASE.length} on the Climate Trivia challenge.`;

        if (quizScore === QUIZ_DATABASE.length) {
            resultsTitle.textContent = "Climate Scholar! Perfect Score 🌟";
            resultsSvg.style.color = "var(--color-green)";
            
            if (!state.unlockedBadges.includes('trivia-scholar')) {
                state.unlockedBadges.push('trivia-scholar');
                saveState();
                checkUnlockedBadges();
                updateDashboardUI();
            }
            badgeAlert.classList.add('active');
        } else if (quizScore >= 3) {
            resultsTitle.textContent = "Green Enthusiast! Great Job 👍";
            resultsSvg.style.color = "var(--energy-color)";
            badgeAlert.classList.remove('active');
        } else {
            resultsTitle.textContent = "Keep Learning! 📚";
            resultsSvg.style.color = "#ef4444";
            badgeAlert.classList.remove('active');
        }
    }

    // --- FLOATING AI ASSISTANT CHATBOT LOGIC ---
    const chatbotToggleBtn = document.getElementById('chatbot-toggle-btn');
    const chatbotBox = document.getElementById('chatbot-box');
    const chatbotCloseBtn = document.getElementById('chatbot-close-btn');
    const chatbotMessagesContainer = document.getElementById('chatbot-messages-container');
    const chatbotInputForm = document.getElementById('chatbot-input-form');
    const chatbotInputField = document.getElementById('chatbot-input-field');
    const chatbotQuickChips = document.querySelectorAll('.prompt-chip');
    const chatbotPing = chatbotToggleBtn.querySelector('.chatbot-ping');

    // Toggle chatbot panel
    chatbotToggleBtn.addEventListener('click', () => {
        chatbotBox.classList.toggle('hidden');
        if (chatbotPing) chatbotPing.style.display = 'none'; // hide ping notification once opened
        scrollChatToBottom();
    });

    chatbotCloseBtn.addEventListener('click', () => {
        chatbotBox.classList.add('hidden');
    });

    // Handle Form Message send
    chatbotInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatbotInputField.value.trim();
        if (!text) return;

        askEcoBot(text);
        chatbotInputField.value = '';
    });

    // Handle Prompt Chips click
    chatbotQuickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const action = chip.getAttribute('data-action');
            let userMsg = chip.textContent;
            
            if (action === 'explain') {
                appendChatMessage(userMsg, 'user');
                setTimeout(() => {
                    const reply = "Our calculations are based on standard greenhouse gas coefficients: gasoline cars emit roughly 180g CO₂ per km, standard grid electricity yields 350g CO₂ per kWh, and red-meat heavy diets produce about 3.2 tons CO₂ per year. Offset scores are generated by committing to and checking off green habits inside the **Action Plan** tab!";
                    appendChatMessage(reply, 'bot');
                }, 400);
            } else {
                askEcoBot(userMsg);
            }
        });
    });

    function askEcoBot(messageText) {
        if (!messageText) return;

        appendChatMessage(messageText, 'user');

        // Create typing indicator bubble
        const typingBubble = document.createElement('div');
        typingBubble.className = 'chat-bubble bot loading';
        typingBubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        chatbotMessagesContainer.appendChild(typingBubble);
        scrollChatToBottom();

        // Construct current stats payload
        const results = calculateFootprint();
        const commitmentsObj = state.commitments.map(id => {
            const act = ACTIONS_DATABASE.find(a => a.id === id);
            return {
                title: act ? act.title : id,
                impact: act ? act.impact : 0
            };
        });
        const userStats = {
            transport: results.transport,
            energy: results.energy,
            food: results.food,
            waste: results.waste,
            digital: results.digital,
            total: results.total,
            commitments: commitmentsObj
        };

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText, userStats: userStats })
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            typingBubble.remove();
            let formattedReply = formatMarkdown(data.reply);
            appendChatMessage(formattedReply, 'bot', true);
        })
        .catch(error => {
            console.error('Error fetching chat response:', error);
            typingBubble.remove();
            const fallbackReply = generateBotReply(messageText.toLowerCase());
            appendChatMessage(fallbackReply + "\n\n*(Note: Running in offline fallback mode)*", 'bot');
        });
    }

    function formatMarkdown(text) {
        if (!text) return "";
        let html = text;
        // Escape HTML tags to prevent XSS
        html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // Convert **bold** to <strong>bold</strong>
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert *italic* or _italic_ to <em>italic</em>
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Convert `code` to <code>code</code>
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        // Replace newlines with <br>
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function appendChatMessage(msg, sender, isHTML = false) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;

        // Add screen reader prefix
        const srPrefix = document.createElement('span');
        srPrefix.className = 'sr-only';
        srPrefix.textContent = sender === 'bot' ? 'EcoBot: ' : 'You: ';
        bubble.appendChild(srPrefix);

        const contentSpan = document.createElement('span');
        if (isHTML) {
            contentSpan.innerHTML = msg;
        } else {
            const temp = document.createElement('div');
            temp.textContent = msg;
            contentSpan.innerHTML = temp.innerHTML.replace(/\n/g, '<br>');
        }
        bubble.appendChild(contentSpan);

        chatbotMessagesContainer.appendChild(bubble);
        scrollChatToBottom();
    }

    function scrollChatToBottom() {
        chatbotMessagesContainer.scrollTop = chatbotMessagesContainer.scrollHeight;
    }

    function generateBotReply(text) {
        if (text.includes('hi') || text.includes('hello') || text.includes('hey')) {
            return "Hello! I am EcoBot. How can I help you today? You can ask me to **analyze** your carbon footprint, suggest **tips**, or ask general environmental questions!";
        }
        if (text.includes('analyze') || text.includes('stat') || text.includes('score') || text.includes('my footprint')) {
            return generatePersonalizedAnalysis();
        }
        if (text.includes('tip') || text.includes('reduce') || text.includes('help') || text.includes('cut')) {
            return generateCategoryTips();
        }
        if (text.includes('solar') || text.includes('energy') || text.includes('electricity')) {
            return "Home energy is a massive source of personal emissions! Consider setting your renewable electricity percentage slider higher, installing LED bulbs, washing laundry in cold water, or switching to an electric heat pump.";
        }
        if (text.includes('meat') || text.includes('food') || text.includes('vegan') || text.includes('diet')) {
            return "Transitioning to a plant-based diet is one of the most effective personal climate actions. Beef has 10x the carbon footprint of chicken and 60x that of vegetables. Try starting with 'Meatless Mondays' in the Action Plan tab!";
        }
        if (text.includes('car') || text.includes('driving') || text.includes('flight') || text.includes('fly')) {
            return "Transportation emits high amounts of CO₂. Driving less, carpooling, choosing public transit, and reducing flights (especially long-haul flights) make a major difference. If you drive, switching to an electric vehicle reduces fuel emissions by about 75%!";
        }
        if (text.includes('compost') || text.includes('recycle') || text.includes('plastic') || text.includes('waste')) {
            return "Landfills produce methane, a greenhouse gas 28x more potent than CO₂. Composting organic waste and recycling paper, glass, plastic, and metal helps mitigate landfill loads. Minimizing shopping and avoiding fast fashion also cuts manufacturing emissions.";
        }

        return "I'm not sure I understand that completely. Try clicking one of my quick-action buttons below or ask me about **energy**, **transport**, **food**, or **waste**!";
    }

    function generatePersonalizedAnalysis() {
        const results = calculateFootprint();
        
        // Find highest emissions category
        let categories = [
            { name: 'Transport', value: results.transport },
            { name: 'Energy', value: results.energy },
            { name: 'Food', value: results.food },
            { name: 'Waste', value: results.waste },
            { name: 'Digital Carbon', value: results.digital }
        ];
        
        categories.sort((a, b) => b.value - a.value);
        const highest = categories[0];

        return `Based on your inputs, your estimated carbon footprint is **${results.total.toFixed(2)} Tons CO₂e/year**.\n\nYour highest emission category is **${highest.name}** at **${highest.value.toFixed(2)} Tons**, followed by **${categories[1].name}** at **${categories[1].value.toFixed(2)} Tons**.\n\nYou currently have committed to **${state.commitments.length}** habit actions, saving an estimated **${state.commitments.reduce((acc, id) => acc + (ACTIONS_DATABASE.find(a => a.id === id)?.impact || 0), 0)} kg CO₂/year**. Keep it up!`;
    }

    function generateCategoryTips() {
        const results = calculateFootprint();
        
        // Find highest emissions category
        let categories = [
            { name: 'transport', value: results.transport },
            { name: 'energy', value: results.energy },
            { name: 'food', value: results.food },
            { name: 'waste', value: results.waste },
            { name: 'digital', value: results.digital }
        ];
        categories.sort((a, b) => b.value - a.value);
        const highestCat = categories[0].name;

        if (highestCat === 'transport') {
            return "Since **Transport** is your largest emissions source, try these high-impact changes:\n1. Commit to **Cycle/Walk Short Trips** in your Action Plan to save up to 450 kg CO₂/yr.\n2. Carpool with colleagues (saves 350 kg/yr).\n3. Try to combine multiple flights or choose train routes when traveling locally.";
        }
        if (highestCat === 'energy') {
            return "Since **Energy** is your largest source, try these utility fixes:\n1. Switch to **LED Bulbs** (saves 150 kg/yr).\n2. Lower your winter heating by just 2°C (saves 220 kg/yr).\n3. Purchase clean community solar energy or install solar panels.";
        }
        if (highestCat === 'food') {
            return "Since **Food & Diet** emissions are high, try starting here:\n1. Try **Meatless Mondays** in your checklist (saves 160 kg/yr).\n2. Reduce food waste (saves up to 400 kg/yr by composting leftovers and planning meals).\n3. Source seasonal ingredients locally to cut transport packaging emissions.";
        }
        if (highestCat === 'waste') {
            return "Since **Lifestyle Waste** is your biggest source:\n1. Switch to **Zero Single-Use Plastics** (saves 110 kg/yr).\n2. Separate cardboards, plastics, glass, and metals to optimize recycling offsets.\n3. Practice minimalist purchasing, choosing durable second-hand alternatives over fast fashion.";
        }
        if (highestCat === 'digital') {
            return "Since **Digital Carbon** is your largest source:\n1. Try reducing passive video streaming or lower the resolution to 720p.\n2. Turn off video feeds in large virtual call meetings if not needed.\n3. Take a digital break to decrease daily screen time scrolling.";
        }

        return "Try selecting active commitments in your **Action Plan** tab. Every commitment helps offset your footprint!";
    }

    // --- APPLICATION STARTUP ---
    loadState();
    bindInputs();
    checkUnlockedBadges();
    updateDashboardUI();
    renderActionsMarketplace();
    renderCommitmentsChecklist();
    initSandboxState();
    updateSandboxSimulation();
    showWizardPanel(0);

    // Initial bot notification bubble check after 4 seconds
    setTimeout(() => {
        if (chatbotPing && chatbotBox.classList.contains('hidden')) {
            chatbotPing.style.display = 'block';
        }
    }, 4000);
});

// ==========================================
// AUTHENTICATION & CLOUD SAVE MODULE
// ==========================================
const authModalBtn = document.getElementById('auth-modal-btn');
const authModal = document.getElementById('auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const authTabs = document.querySelectorAll('.auth-tab');
const authForm = document.getElementById('auth-form');
const authModalTitle = document.getElementById('auth-modal-title');
const authErrorMsg = document.getElementById('auth-error-msg');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');

const userProfile = document.getElementById('user-profile');
const userNameDisplay = document.getElementById('user-name-display');
const logoutBtn = document.getElementById('logout-btn');
const saveProgressBtn = document.getElementById('save-progress-btn');

let currentAuthMode = 'login'; // 'login' or 'register'
let authToken = localStorage.getItem('ecotrace_token');
let currentUsername = localStorage.getItem('ecotrace_username');

// Initialize Auth State
function initAuth() {
    if (authToken && currentUsername) {
        setLoggedInState(currentUsername);
        loadProgress();
    }
}

// UI Toggles
authModalBtn.addEventListener('click', () => {
    authModal.classList.remove('hidden');
    authErrorMsg.classList.add('hidden');
});
closeAuthModal.addEventListener('click', () => authModal.classList.add('hidden'));

authTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        authTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentAuthMode = e.target.dataset.authMode;
        
        authModalTitle.textContent = currentAuthMode === 'login' ? 'Welcome Back' : 'Create Account';
        authSubmitBtn.textContent = currentAuthMode === 'login' ? 'Login' : 'Sign Up';
        authErrorMsg.classList.add('hidden');
    });
});

// Form Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = authUsername.value.trim();
    const password = authPassword.value;
    
    if (!username || !password) return;
    
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'Processing...';
    
    try {
        const endpoint = currentAuthMode === 'login' ? '/api/login' : '/api/register';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Authentication failed');
        
        // Success
        authToken = data.token;
        currentUsername = data.username;
        localStorage.setItem('ecotrace_token', authToken);
        localStorage.setItem('ecotrace_username', currentUsername);
        
        setLoggedInState(currentUsername);
        authModal.classList.add('hidden');
        
        if (currentAuthMode === 'login' && data.progress) {
            applyProgressToUI(data.progress);
        }
    } catch (err) {
        authErrorMsg.textContent = err.message;
        authErrorMsg.classList.remove('hidden');
    } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = currentAuthMode === 'login' ? 'Login' : 'Sign Up';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    authToken = null;
    currentUsername = null;
    localStorage.removeItem('ecotrace_token');
    localStorage.removeItem('ecotrace_username');
    
    authModalBtn.classList.remove('hidden');
    userProfile.classList.add('hidden');
    saveProgressBtn.classList.add('hidden');
    
    // Lock premium features
    document.getElementById('chatbot-lock')?.classList.remove('hidden');
    document.getElementById('web-checker-lock')?.classList.remove('hidden');

    // Disable inputs
    const chatbotInput = document.getElementById('chatbot-input-field');
    const chatSendBtn = document.querySelector('.chat-send-btn');
    const webUrlInput = document.getElementById('web-checker-url');
    const webCheckerBtn = document.getElementById('web-checker-btn');
    
    if (chatbotInput) chatbotInput.disabled = true;
    if (chatSendBtn) chatSendBtn.disabled = true;
    if (webUrlInput) webUrlInput.disabled = true;
    if (webCheckerBtn) webCheckerBtn.disabled = true;
});

// Logged In UI State
function setLoggedInState(username) {
    authModalBtn.classList.add('hidden');
    userProfile.classList.remove('hidden');
    saveProgressBtn.classList.remove('hidden');
    userNameDisplay.textContent = username;
    
    // Unlock premium features
    document.getElementById('chatbot-lock')?.classList.add('hidden');
    document.getElementById('web-checker-lock')?.classList.add('hidden');

    // Enable inputs
    const chatbotInput = document.getElementById('chatbot-input-field');
    const chatSendBtn = document.querySelector('.chat-send-btn');
    const webUrlInput = document.getElementById('web-checker-url');
    const webCheckerBtn = document.getElementById('web-checker-btn');
    
    if (chatbotInput) chatbotInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    if (webUrlInput) webUrlInput.disabled = false;
    if (webCheckerBtn) webCheckerBtn.disabled = false;
}

// --- SAVE & LOAD PROGRESS LOGIC ---
saveProgressBtn.addEventListener('click', async () => {
    if (!authToken) return;
    
    const originalText = saveProgressBtn.innerHTML;
    saveProgressBtn.innerHTML = 'Saving...';
    
    try {
        const progressData = {
            sliders: {
                carDistance: document.getElementById('car-distance').value,
                transitTime: document.getElementById('transit-time').value,
                flightsShort: document.getElementById('flights-short').value,
                flightsLong: document.getElementById('flights-long').value,
                electricity: document.getElementById('electricity').value,
                cleanMix: document.getElementById('clean-mix').value,
                heatingEnergy: document.getElementById('heating-energy').value,
                localSourcing: document.getElementById('local-sourcing').value,
                digitalStreaming: document.getElementById('digital-streaming').value,
                digitalMeeting: document.getElementById('digital-meeting').value,
                digitalScrolling: document.getElementById('digital-scrolling').value
            },
            radios: {
                carFuel: document.querySelector('input[name="car-fuel"]:checked').value,
                heatFuel: document.querySelector('input[name="heat-fuel"]:checked').value,
                diet: document.querySelector('input[name="diet"]:checked').value,
                foodWaste: document.querySelector('input[name="food-waste"]:checked').value,
                shopping: document.querySelector('input[name="shopping"]:checked').value
            },
            checkboxes: {
                recyclePaper: document.getElementById('recycle-paper').checked,
                recyclePlastic: document.getElementById('recycle-plastic').checked,
                recycleGlass: document.getElementById('recycle-glass').checked,
                recycleMetal: document.getElementById('recycle-metal').checked
            },
            activeActions: Array.from(document.querySelectorAll('#actions-marketplace-grid .secondary-btn.active')).map(btn => btn.dataset.actionId)
        };

        const res = await fetch('/api/save-progress', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify({ progress: progressData })
        });
        
        if (!res.ok) throw new Error('Save failed');
        saveProgressBtn.innerHTML = 'Saved!';
    } catch (e) {
        console.error('Failed to save progress:', e);
        saveProgressBtn.innerHTML = 'Error Saving';
    } finally {
        setTimeout(() => { saveProgressBtn.innerHTML = originalText; }, 2000);
    }
});

async function loadProgress() {
    try {
        const res = await fetch('/api/load-progress', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (!res.ok) throw new Error('Load failed');
        const data = await res.json();
        
        if (data.progress && Object.keys(data.progress).length > 0) {
            applyProgressToUI(data.progress);
        }
    } catch (e) {
        console.error('Failed to load progress:', e);
    }
}

function applyProgressToUI(progress) {
    if (!progress) return;
    
    // Sliders
    if (progress.sliders) {
        document.getElementById('car-distance').value = progress.sliders.carDistance || 12000;
        document.getElementById('transit-time').value = progress.sliders.transitTime || 3;
        document.getElementById('flights-short').value = progress.sliders.flightsShort || 2;
        document.getElementById('flights-long').value = progress.sliders.flightsLong || 0;
        document.getElementById('electricity').value = progress.sliders.electricity || 300;
        document.getElementById('clean-mix').value = progress.sliders.cleanMix || 10;
        document.getElementById('heating-energy').value = progress.sliders.heatingEnergy || 400;
        document.getElementById('local-sourcing').value = progress.sliders.localSourcing || 20;
        document.getElementById('digital-streaming').value = progress.sliders.digitalStreaming || 10;
        document.getElementById('digital-meeting').value = progress.sliders.digitalMeeting || 5;
        document.getElementById('digital-scrolling').value = progress.sliders.digitalScrolling || 2;
    }
    
    // Radios
    if (progress.radios) {
        if(progress.radios.carFuel) document.querySelector('input[name="car-fuel"][value="' + progress.radios.carFuel + '"]').checked = true;
        if(progress.radios.heatFuel) document.querySelector('input[name="heat-fuel"][value="' + progress.radios.heatFuel + '"]').checked = true;
        if(progress.radios.diet) document.querySelector('input[name="diet"][value="' + progress.radios.diet + '"]').checked = true;
        if(progress.radios.foodWaste) document.querySelector('input[name="food-waste"][value="' + progress.radios.foodWaste + '"]').checked = true;
        if(progress.radios.shopping) document.querySelector('input[name="shopping"][value="' + progress.radios.shopping + '"]').checked = true;
    }
    
    // Checkboxes
    if (progress.checkboxes) {
        document.getElementById('recycle-paper').checked = progress.checkboxes.recyclePaper;
        document.getElementById('recycle-plastic').checked = progress.checkboxes.recyclePlastic;
        document.getElementById('recycle-glass').checked = progress.checkboxes.recycleGlass;
        document.getElementById('recycle-metal').checked = progress.checkboxes.recycleMetal;
    }
    
    // Update all visual sliders numbers
    document.getElementById('car-distance-val').textContent = parseInt(document.getElementById('car-distance').value).toLocaleString() + ' km';
    document.getElementById('transit-time-val').textContent = document.getElementById('transit-time').value + ' hours';
    document.getElementById('flights-short-val').textContent = document.getElementById('flights-short').value + ' flights/yr';
    document.getElementById('flights-long-val').textContent = document.getElementById('flights-long').value + ' flights/yr';
    document.getElementById('electricity-val').textContent = document.getElementById('electricity').value + ' kWh';
    document.getElementById('clean-mix-val').textContent = document.getElementById('clean-mix').value + '%';
    document.getElementById('heating-energy-val').textContent = document.getElementById('heating-energy').value + ' kWh';
    document.getElementById('local-sourcing-val').textContent = document.getElementById('local-sourcing').value + '%';
    document.getElementById('digital-streaming-val').textContent = document.getElementById('digital-streaming').value + ' hours';
    document.getElementById('digital-meeting-val').textContent = document.getElementById('digital-meeting').value + ' hours';
    document.getElementById('digital-scrolling-val').textContent = document.getElementById('digital-scrolling').value + ' hours';

    // Recalculate
    calculateFootprint();
    
    // Restore Active Actions
    if (progress.activeActions && Array.isArray(progress.activeActions)) {
        setTimeout(() => {
            progress.activeActions.forEach(actionId => {
                const btn = document.querySelector('#actions-marketplace-grid .secondary-btn[data-action-id="' + actionId + '"]');
                if (btn && !btn.classList.contains('active')) {
                    btn.click();
                }
            });
        }, 500);
    }
}

// Call on startup
initAuth();
