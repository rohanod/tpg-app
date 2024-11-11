let debounceTimeout;
let kioskMode = false;
let stops = [];
let currentStopIndex = 0;
let kioskInterval;
let countdownInterval;
let refreshCountdown;
let language = 'en';
let suggestedStops = [];
let userSelectedStop = false;
let darkMode = localStorage.getItem('darkMode') === 'true';

function updateURLParams() {
    const newUrl = new URL(window.location);
    if (kioskMode) {
        newUrl.search = '';
        stops.forEach((stop, index) => {
            let stopParamName = index === 0 ? 'stop' : `stop${index + 1}`;
            let numbersParamName = index === 0 ? 'numbers' : `numbers${index + 1}`;
            newUrl.searchParams.set(stopParamName, stop.stopName);
            if (stop.vehicleNumbers.length > 0) {
                newUrl.searchParams.set(numbersParamName, stop.vehicleNumbers.join(','));
            } else {
                newUrl.searchParams.delete(numbersParamName);
            }
        });
        newUrl.searchParams.set('kiosk', 'true');
    } else {
        newUrl.search = '';
        const stopName = document.getElementById('stop-name').value.trim();
        const vehicleNumbersInput = document.getElementById('vehicle-numbers').value.trim();
        const vehicleNumbers = vehicleNumbersInput ? vehicleNumbersInput.split(',').map(num => num.trim()) : [];
        if (stopName) {
            newUrl.searchParams.set('stop', stopName);
        }
        if (vehicleNumbers.length > 0) {
            newUrl.searchParams.set('numbers', vehicleNumbers.join(','));
        }
    }
    window.history.pushState({}, '', newUrl);
}

async function suggestStops(query) {
    if (!query || userSelectedStop) {
        document.getElementById('stop-suggestions').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&type=station`);
        const data = await response.json();
        suggestedStops = data.stations || [];
        
        const suggestionsDiv = document.getElementById('stop-suggestions');
        suggestionsDiv.innerHTML = '';
        
        if (suggestedStops.length > 0) {
            const matchedStops = suggestedStops
                .filter(station => station.id && station.name.toLowerCase().includes(query.toLowerCase()))
                .sort((a, b) => {
                    const aExact = a.name.toLowerCase() === query.toLowerCase();
                    const bExact = b.name.toLowerCase() === query.toLowerCase();
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    
                    const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase());
                    const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase());
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    
                    return a.name.localeCompare(b.name);
                })
                .slice(0, 5);

            matchedStops.forEach(station => {
                const suggestion = document.createElement('div');
                suggestion.classList.add('stop-suggestion');
                suggestion.textContent = station.name;
                suggestion.addEventListener('click', () => {
                    document.getElementById('stop-name').value = station.name;
                    suggestionsDiv.innerHTML = '';
                    userSelectedStop = true;
                    fetchAndDisplayBusInfo();
                });
                suggestionsDiv.appendChild(suggestion);
            });
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

document.getElementById('stop-name').addEventListener('input', function() {
    clearTimeout(debounceTimeout);
    const query = this.value.trim();
    userSelectedStop = false;
    
    debounceTimeout = setTimeout(() => {
        if (!kioskMode) {
            updateURLParams();
            suggestStops(query);
        } else {
            stops[currentStopIndex].stopName = query;
            updateURLParams();
        }
    }, 300);
});

document.getElementById('vehicle-numbers').addEventListener('input', function () {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        if (!kioskMode) {
            updateURLParams();
            if (userSelectedStop) {
                fetchAndDisplayBusInfo();
            }
        } else {
            const vehicleNumbersInput = document.getElementById('vehicle-numbers').value.trim();
            const vehicleNumbers = vehicleNumbersInput ? vehicleNumbersInput.split(',').map(num => num.trim()) : [];
            stops[currentStopIndex].vehicleNumbers = vehicleNumbers;
            updateURLParams();
        }
    }, 300);
});

function autofillStopNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const kioskParam = urlParams.get('kiosk');
    kioskMode = kioskParam === 'true';
    stops = [];

    if (kioskMode) {
        const stopName = urlParams.get('stop');
        const busNumbersParam = urlParams.get('numbers');
        if (stopName) {
            const vehicleNumbers = busNumbersParam ? busNumbersParam.split(',').map(num => num.trim()) : [];
            stops.push({
                stopName: decodeURIComponent(stopName),
                vehicleNumbers
            });

            let index = 2;
            while (true) {
                let stopParamName = `stop${index}`;
                let numbersParamName = `numbers${index}`;
                if (!urlParams.has(stopParamName)) break;
                const nextStopName = urlParams.get(stopParamName);
                const nextBusNumbersParam = urlParams.get(numbersParamName);
                const nextVehicleNumbers = nextBusNumbersParam ? nextBusNumbersParam.split(',').map(num => num.trim()) : [];
                stops.push({
                    stopName: decodeURIComponent(nextStopName),
                    vehicleNumbers: nextVehicleNumbers
                });
                index++;
            }
        }
        if (stops.length > 0) {
            showKioskModeUI();
            startKioskMode();
        }
    } else {
        const stopName = urlParams.get('stop');
        const vehicleNumbersParam = urlParams.get('numbers');
        const vehicleNumbers = vehicleNumbersParam ? vehicleNumbersParam.split(',').map(num => num.trim()) : [];
        if (stopName) {
            document.getElementById('stop-name').value = decodeURIComponent(stopName);
            userSelectedStop = true;
        }
        if (vehicleNumbersParam) {
            document.getElementById('vehicle-numbers').value = decodeURIComponent(vehicleNumbersParam);
        }
        showNormalModeUI();
        if (stopName) {
            startNormalMode();
        }
    }
}

function startKioskMode() {
    clearInterval(kioskInterval);
    clearInterval(countdownInterval);
    
    refreshCountdown = 10;
    createRefreshIndicator(refreshCountdown);
    
    fetchAndDisplayCurrentStop().then(() => {
        kioskInterval = setInterval(async () => {
            try {
                refreshCountdown = 0;
                updateRefreshIndicator(0);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (stops.length > 1) {
                    currentStopIndex = (currentStopIndex + 1) % stops.length;
                    await fetchAndDisplayCurrentStop();
                } else {
                    await fetchAndDisplayBusInfo();
                }
                
                refreshCountdown = 10;
                setTimeout(() => {
                    if (kioskMode) {
                        updateRefreshIndicator(refreshCountdown);
                    }
                }, 300);
            } catch (error) {
                console.error('Error in kiosk refresh:', error);
                refreshCountdown = 10;
                updateRefreshIndicator(refreshCountdown);
            }
        }, 10000);

        countdownInterval = setInterval(() => {
            if (refreshCountdown > 0) {
                refreshCountdown = Math.max(0, refreshCountdown - 1);
                updateRefreshIndicator(refreshCountdown);
            }
        }, 1000);
    }).catch(error => {
        console.error('Error starting kiosk mode:', error);
        refreshCountdown = 10;
        updateRefreshIndicator(refreshCountdown);
    });
}

function startNormalMode() {
    clearInterval(kioskInterval);
    clearInterval(countdownInterval);
    removeRefreshIndicator();
    
    fetchAndDisplayBusInfo().then(() => {
        kioskInterval = setInterval(() => {
            fetchAndDisplayBusInfo().catch(error => {
                console.error('Error in normal refresh:', error);
            });
        }, 20000);
    });
}

async function fetchAndDisplayCurrentStop() {
    const stop = stops[currentStopIndex];
    if (stop) {
        const header = document.getElementById('stop-name-header');
        const busInfo = document.getElementById('bus-info');
        
        if (header) header.classList.add('fade-out');
        if (busInfo) busInfo.classList.add('fade-out');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        document.getElementById('stop-name').value = stop.stopName;
        document.getElementById('vehicle-numbers').value = stop.vehicleNumbers.join(', ');
        document.getElementById('stop-name-header').textContent = (language === 'en' ? 'Stop: ' : 'Arrêt : ') + stop.stopName;
        
        await fetchAndDisplayBusInfo();
        
        if (header) {
            header.classList.remove('fade-out');
            header.classList.add('fade-in');
        }
        if (busInfo) {
            busInfo.classList.remove('fade-out');
            busInfo.classList.add('fade-in');
        }
        
        setTimeout(() => {
            if (header) header.classList.remove('fade-in');
            if (busInfo) busInfo.classList.remove('fade-in');
        }, 300);
    }
}

function showKioskModeUI() {
    document.body.classList.add('kiosk-mode');
    document.querySelector('.container').classList.add('kiosk-mode');
    document.getElementById('bus-form').style.display = 'none';
    document.getElementById('stop-name-header').style.display = 'block';
}

function showNormalModeUI() {
    document.body.classList.remove('kiosk-mode');
    document.querySelector('.container').classList.remove('kiosk-mode');
    document.getElementById('bus-form').style.display = 'flex';
    document.getElementById('stop-name-header').style.display = 'none';
    document.getElementById('stop-name-header').textContent = '';
}

function toggleDarkMode() {
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.classList.add('rotate');
    
    setTimeout(() => {
        darkMode = !darkMode;
        localStorage.setItem('darkMode', darkMode);
        updateDarkMode();
        themeToggle.classList.remove('rotate');
    }, 500);
}

function updateDarkMode() {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.getElementById('theme-toggle').textContent = darkMode ? '🌙' : '☀️';
}

function exitKioskMode() {
    kioskMode = false;
    const stopName = document.getElementById('stop-name').value.trim();
    const vehicleNumbers = document.getElementById('vehicle-numbers').value.trim();
    
    const newUrl = new URL(window.location);
    newUrl.search = '';
    
    if (stopName) {
        newUrl.searchParams.set('stop', stopName);
        if (vehicleNumbers) {
            newUrl.searchParams.set('numbers', vehicleNumbers);
        }
    }
    
    window.history.pushState({}, '', newUrl);
    stops = [];
    currentStopIndex = 0;
    clearInterval(kioskInterval);
    clearInterval(countdownInterval);
    removeRefreshIndicator();
    showNormalModeUI();
    startNormalMode();
}

function createRefreshIndicator(seconds) {
    removeRefreshIndicator();
    const indicator = document.createElement('div');
    indicator.classList.add('refresh-indicator');
    indicator.id = 'refresh-indicator';
    document.body.appendChild(indicator);
    
    // Force reflow to ensure animation works
    indicator.offsetHeight;
    
    updateRefreshIndicator(seconds);
}

function updateRefreshIndicator(seconds) {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) {
        if (seconds === 0) {
            indicator.classList.add('fade');
            indicator.textContent = language === 'en' ? 'Refreshing...' : 'Actualisation...';
        } else {
            indicator.classList.toggle('fade', seconds <= 3);
            indicator.textContent = `${language === 'en' ? 'Refreshing in' : 'Actualisation dans'} ${seconds}s`;
        }
    }
}

function removeRefreshIndicator() {
    const existingIndicator = document.getElementById('refresh-indicator');
    if (existingIndicator) {
        existingIndicator.classList.add('fade');
        setTimeout(() => {
            if (existingIndicator.parentNode) {
                existingIndicator.remove();
            }
        }, 300);
    }
}

document.addEventListener('keydown', function(event) {
    if (event.shiftKey && event.key.toLowerCase() === 'k') {
        if (kioskMode) {
            exitKioskMode();
        } else {
            const stopName = document.getElementById('stop-name').value.trim();
            const vehicleNumbers = document.getElementById('vehicle-numbers').value.trim();
            if (stopName) {
                const newUrl = new URL(window.location);
                newUrl.search = '';
                newUrl.searchParams.set('stop', stopName);
                if (vehicleNumbers) {
                    newUrl.searchParams.set('numbers', vehicleNumbers);
                }
                newUrl.searchParams.set('kiosk', 'true');
                window.history.pushState({}, '', newUrl);
                stops = [{
                    stopName,
                    vehicleNumbers: vehicleNumbers ? vehicleNumbers.split(',').map(num => num.trim()) : []
                }];
                kioskMode = true;
                showKioskModeUI();
                startKioskMode();
            }
        }
    }
});

document.getElementById('readme-button').addEventListener('click', function() {
    const readmeModal = document.getElementById('readme-modal');
    const readmeBody = document.getElementById('readme-body');
    readmeBody.innerHTML = getReadmeContent();
    readmeModal.style.display = 'block';
});

document.querySelector('.close-readme').addEventListener('click', () => {
    document.getElementById('readme-modal').style.display = 'none';
});

document.getElementById('language-switch').addEventListener('change', function() {
    language = this.checked ? 'fr' : 'en';
    document.getElementById('language-label').textContent = language.toUpperCase();
    updateLanguage();
    fetchAndDisplayBusInfo();
});

function updateLanguage() {
    const elements = {
        'main-title': {
            'en': 'TPG Bus and Tram Timings',
            'fr': 'Horaires des bus et trams TPG'
        },
        'stop-name': {
            'en': 'Enter stop name',
            'fr': 'Entrez le nom de l\'arrêt'
        },
        'vehicle-numbers': {
            'en': 'Enter bus/tram numbers (optional)',
            'fr': 'Entrez les numéros de bus/tram (facultatif)'
        },
        'readme-button': {
            'en': 'Read Me',
            'fr': 'Lire Moi'
        }
    };

    for (let id in elements) {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.placeholder = elements[id][language];
            } else {
                element.textContent = elements[id][language];
            }
        }
    }
}

function getReadmeContent() {
    if (language === 'en') {
        return `
            <div class="readme-body">
                <h2>TPG Bus and Tram Timings</h2>
                <p>Get real-time schedules for Geneva's public transport system (TPG) with an easy-to-use interface.</p>
                
                <div class="feature-grid">
                    <div class="feature-card">
                        <h4>🔍 Smart Search</h4>
                        <p>Type any stop name and get instant suggestions with our intelligent autocomplete.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🌓 Dark Mode</h4>
                        <p>Easy on your eyes with automatic theme persistence and smooth transitions.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🌍 Bilingual</h4>
                        <p>Switch seamlessly between English and French interfaces.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🚌 Real-time Updates</h4>
                        <p>Departure times update automatically every 10 seconds.</p>
                    </div>
                </div>

                <h3>Quick Start Guide</h3>
                <ol>
                    <li><strong>Find Your Stop:</strong> Start typing the stop name in the search box - suggestions will appear automatically.</li>
                    <li><strong>Filter Routes (Optional):</strong> Enter specific bus/tram numbers separated by commas (e.g., "12, 18").</li>
                    <li><strong>View Departures:</strong> Click on any bus/tram number to see detailed departure times for all directions.</li>
                </ol>

                <h3>Pro Tips</h3>
                <ul>
                    <li><strong>Quick Theme Switch:</strong> Click the sun/moon icon to toggle between light and dark modes.</li>
                    <li><strong>Language Toggle:</strong> Use the switch in the top-right corner to change between EN/FR.</li>
                    <li><strong>Modal Navigation:</strong> Press <span class="shortcut-key">ESC</span> or click outside to close any modal window.</li>
                    <li><strong>Multiple Routes:</strong> Enter multiple bus numbers like "12, 18" to filter specific routes.</li>
                </ul>

                <h3>URL Parameters</h3>
                <p>You can use URL parameters to pre-configure the application:</p>
                <ul>
                    <li><strong>Single Stop:</strong></li>
                    <li><span class="shortcut-key">?stop={Stop Name}&numbers={Bus/Tram Numbers}</span></li>
                    <li>Example: <span class="shortcut-key">?stop=Gare Cornavin&numbers=12,17,18</span></li>
                </ul>
                <p>For kiosk mode with multiple stops:</p>
                <ul>
                    <li>Format:</li>
                    <li><span class="shortcut-key">?stop={Stop1}&numbers={Bus/Tram Numbers}&stop2={Stop2}&numbers2={Bus/Tram Numbers}&kiosk=true</span></li>
                    <li>Example:</li>
                    <li><span class="shortcut-key">?stop=Gare Cornavin&numbers=10,18&stop2=Bel-Air&numbers2=14,17&kiosk=true</span></li>
                    <li>Exit kiosk mode: Press <span class="shortcut-key">Shift + K</span></li>
                </ul>

                <h3>About TPG Data</h3>
                <p>All transport data is provided in real-time by the TPG (Transports publics genevois) API. Times are shown in minutes until departure and automatically update.</p>
            </div>
        `;
    } else {
        return `
            <div class="readme-body">
                <h2>Horaires des Bus et Trams TPG</h2>
                <p>Obtenez les horaires en temps réel du réseau de transport public genevois (TPG) avec une interface simple d'utilisation.</p>
                
                <div class="feature-grid">
                    <div class="feature-card">
                        <h4>🔍 Recherche Intelligente</h4>
                        <p>Tapez le nom d'un arrêt et obtenez des suggestions instantanées avec notre autocomplétion intelligente.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🌓 Mode Sombre</h4>
                        <p>Agréable pour les yeux avec persistance automatique du thème et transitions fluides.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🌍 Bilingue</h4>
                        <p>Basculez facilement entre les interfaces en anglais et en français.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🚌 Mises à jour en temps réel</h4>
                        <p>Les horaires de départ se mettent à jour automatiquement toutes les 10 secondes.</p>
                    </div>
                </div>

                <h3>Guide de Démarrage Rapide</h3>
                <ol>
                    <li><strong>Trouvez Votre Arrêt :</strong> Commencez à taper le nom de l'arrêt dans la barre de recherche - les suggestions apparaîtront automatiquement.</li>
                    <li><strong>Filtrez les Lignes (Optionnel) :</strong> Entrez les numéros de bus/tram spécifiques séparés par des virgules (ex: "12, 18").</li>
                    <li><strong>Voir les Départs :</strong> Cliquez sur n'importe quel numéro de bus/tram pour voir les horaires détaillés pour toutes les directions.</li>
                </ol>

                <h3>Astuces Pro</h3>
                <ul>
                    <li><strong>Changement de Thème :</strong> Cliquez sur l'icône soleil/lune pour basculer entre les modes clair et sombre.</li>
                    <li><strong>Changement de Langue :</strong> Utilisez le commutateur en haut à droite pour changer entre EN/FR.</li>
                    <li><strong>Navigation :</strong> Appuyez sur <span class="shortcut-key">ESC</span> ou cliquez à l'extérieur pour fermer toute fenêtre.</li>
                    <li><strong>Lignes Multiples :</strong> Entrez plusieurs numéros de bus comme "12, 18" pour filtrer des lignes spécifiques.</li>
                </ul>

                <h3>Paramètres URL</h3>
                <p>Vous pouvez utiliser des paramètres URL pour préconfigurer l'application :</p>
                <ul>
                    <li><strong>Arrêt Unique :</strong></li>
                    <li><span class="shortcut-key">?stop={Nom de l'arrêt}&numbers={Numéros Bus/Tram}</span></li>
                    <li>Exemple : <span class="shortcut-key">?stop=Gare Cornavin&numbers=12,14,17</span></li>
                </ul>
                <p>Pour le mode kiosque avec plusieurs arrêts :</p>
                <ul>
                    <li>Format :</li>
                    <li><span class="shortcut-key">?stop={Arrêt1}&numbers={Numéros Bus/Tram}&stop2={Arrêt2}&numbers2={Numéros Bus/Tram}&kiosk=true</span></li>
                    <li>Exemple :</li>
                    <li><span class="shortcut-key">?stop=Gare Cornavin&numbers=10,18&stop2=Bel-Air&numbers2=14,17&kiosk=true</span></li>
                    <li>Quitter le mode kiosque : Appuyez sur <span class="shortcut-key">Shift + K</span></li>
                </ul>

                <h3>À Propos des Données TPG</h3>
                <p>Toutes les données de transport sont fournies en temps réel par l'API TPG (Transports publics genevois). Les temps sont affichés en minutes jusqu'au départ et se mettent à jour automatiquement.</p>
            </div>
        `;
    }
}

async function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    const vehicleNumbersInput = document.getElementById('vehicle-numbers').value.trim();
    const vehicleNumbers = vehicleNumbersInput ? vehicleNumbersInput.split(',').map(num => num.trim()) : [];
    const timeZone = 'Europe/Zurich';
    
    if (!stopName) {
        displayMessage(language === 'en' ? 'Please enter a stop name.' : 'Veuillez entrer un nom d\'arrêt.');
        return;
    }

    try {
        const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(stopName)}&type=station`);
        const locationData = await locationResponse.json();
        
        if (!locationData.stations || locationData.stations.length === 0) {
            displayMessage(language === 'en' ? `No buses or trams departing from "${stopName}" were found.` : `Aucun bus ou tram au départ de "${stopName}" n'a été trouvé.`);
            return;
        }

        let station = locationData.stations.find(s => s.name.toLowerCase() === stopName.toLowerCase());
        if (!station) {
            station = locationData.stations[0];
        }

        const stationId = station.id;
        const stationboardResponse = await fetch(`https://transport.opendata.ch/v1/stationboard?id=${encodeURIComponent(stationId)}&limit=300`);
        const stationboardData = await stationboardResponse.json();
        
        if (!stationboardData.stationboard || stationboardData.stationboard.length === 0) {
            displayMessage(language === 'en' ? `No upcoming buses or trams departing from "${stopName}" were found.` : `Aucun prochain bus ou tram au départ de "${stopName}" n'a été trouvé.`);
            return;
        }
        
        const now = moment().tz(timeZone);
        let buses = stationboardData.stationboard
            .filter(entry => entry.stop && entry.stop.departure)
            .filter(entry => vehicleNumbers.length === 0 || vehicleNumbers.includes(entry.number))
            .map(entry => {
                const departureTime = moment.tz(entry.stop.departure, timeZone);
                const vehicleType = entry.category === 'T' ? (language === 'en' ? 'Tram' : 'Tram') : (language === 'en' ? 'Bus' : 'Bus');
                return {
                    vehicleType,
                    busNumber: entry.number,
                    to: entry.to,
                    departure: departureTime,
                    minutesUntilDeparture: Math.ceil(moment.duration(departureTime.diff(now)).asMinutes())
                };
            })
            .filter(bus => bus.departure.isAfter(now));

        if (buses.length === 0) {
            displayMessage(language === 'en' ? `No upcoming buses or trams departing from "${stopName}" were found.` : `Aucun prochain bus ou tram au départ de "${stopName}" n'a été trouvé.`);
        } else {
            if (kioskMode) {
                document.getElementById('stop-name-header').textContent = (language === 'en' ? 'Stop: ' : 'Arrêt : ') + stopName;
                displayBusesKioskMode(buses);
            } else {
                displayBusInfo(buses);
            }
        }
    } catch (error) {
        console.error('Error fetching or processing data:', error);
        displayMessage(language === 'en' ? 'An error occurred while fetching bus or tram information.' : 'Une erreur s\'est produite lors de la récupération des informations de bus ou de tram.');
    }
}

function displayBusesKioskMode(buses) {
    const busInfoContainer = document.getElementById('bus-info');
    if (!busInfoContainer) return;
    
    busInfoContainer.innerHTML = '';
    const gridContainer = document.createElement('div');
    gridContainer.classList.add('grid-container');

    const busGroups = {};
    buses.forEach(bus => {
        const key = `${bus.vehicleType} ${bus.busNumber}`;
        if (!busGroups[key]) {
            busGroups[key] = {};
        }
        if (!busGroups[key][bus.to]) {
            busGroups[key][bus.to] = [];
        }
        busGroups[key][bus.to].push(bus);
    });

    Object.entries(busGroups).sort().forEach(([busKey, directions]) => {
        const bigBox = document.createElement('div');
        bigBox.classList.add('big-box');

        const busInfo = document.createElement('div');
        busInfo.classList.add('bus-info');
        busInfo.textContent = busKey;
        bigBox.appendChild(busInfo);

        Object.entries(directions).sort().forEach(([direction, busList]) => {
            const directionHeader = document.createElement('div');
            directionHeader.classList.add('direction-header');
            directionHeader.textContent = (language === 'en' ? 'To: ' : 'Vers : ') + direction;
            bigBox.appendChild(directionHeader);

            const timeGrid = document.createElement('div');
            timeGrid.classList.add('time-grid');

            busList
                .sort((a, b) => a.minutesUntilDeparture - b.minutesUntilDeparture)
                .slice(0, 3)
                .forEach(bus => {
                    const cell = document.createElement('div');
                    cell.classList.add('cell');
                    cell.textContent = `${bus.minutesUntilDeparture} min`;
                    timeGrid.appendChild(cell);
                });

            bigBox.appendChild(timeGrid);
        });

        gridContainer.appendChild(bigBox);
    });

    busInfoContainer.appendChild(gridContainer);
}

function displayBusInfo(buses) {
    const busInfoContainer = document.getElementById('bus-info');
    busInfoContainer.innerHTML = '';
    const groupedBuses = buses.reduce((acc, bus) => {
        const key = `${bus.vehicleType} ${bus.busNumber}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(bus);
        return acc;
    }, {});
    Object.keys(groupedBuses).forEach(busKey => {
        const busElement = document.createElement('div');
        busElement.classList.add('bus-info-item');
        busElement.innerHTML = `<strong>${busKey}</strong>`;
        busElement.addEventListener('click', () => {
            displayModal(groupedBuses[busKey]);
        });
        busInfoContainer.appendChild(busElement);
    });
}

function displayModal(busDetails) {
    const modal = document.getElementById('popup-modal');
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = '';
    
    const title = document.createElement('h2');
    title.textContent = `${busDetails[0].vehicleType} ${busDetails[0].busNumber}`;
    title.style.color = 'var(--primary-color)';
    title.style.marginBottom = '20px';
    modalBody.appendChild(title);
    
    const groupedByDirection = busDetails.reduce((acc, bus) => {
        if (!acc[bus.to]) {
            acc[bus.to] = [];
        }
        acc[bus.to].push(bus.minutesUntilDeparture);
        return acc;
    }, {});
    
    const directionsContainer = document.createElement('div');
    directionsContainer.classList.add('directions-container');
    
    Object.keys(groupedByDirection).forEach(direction => {
        const directionColumn = document.createElement('div');
        directionColumn.classList.add('direction-column');
        
        const directionHeader = document.createElement('h3');
        directionHeader.textContent = (language === 'en' ? 'To: ' : 'Vers : ') + direction;
        directionColumn.appendChild(directionHeader);
        
        const busList = document.createElement('ul');
        busList.classList.add('bus-list');
        
        const times = groupedByDirection[direction]
            .sort((a, b) => a - b)
            .slice(0, 10);
            
        times.forEach(minutes => {
            const busItem = document.createElement('li');
            busItem.classList.add('bus-item');
            busItem.textContent = `${minutes} min`;
            busList.appendChild(busItem);
        });
        
        directionColumn.appendChild(busList);
        directionsContainer.appendChild(directionColumn);
    });
    
    modalBody.appendChild(directionsContainer);
    modal.style.display = 'block';
}

function displayMessage(message) {
    if (kioskMode) {
        document.getElementById('stop-name-header').textContent = '';
    }
    const busInfoContainer = document.getElementById('bus-info');
    busInfoContainer.innerHTML = `<p class="message">${message}</p>`;
}

document.querySelector('.close').addEventListener('click', () => {
    const modal = document.getElementById('popup-modal');
    modal.style.display = 'none';
});

document.addEventListener('click', (event) => {
    const modal = document.getElementById('popup-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('popup-modal');
        modal.style.display = 'none';
    }
});

document.querySelector('.close-readme').addEventListener('click', () => {
    document.getElementById('readme-modal').style.display = 'none';
});

window.addEventListener('popstate', () => {
    clearInterval(kioskInterval);
    clearInterval(countdownInterval);
    removeRefreshIndicator();
    setTimeout(autofillStopNameFromURL, 300);
});

document.addEventListener('DOMContentLoaded', () => {
    updateDarkMode();
    autofillStopNameFromURL();
    updateLanguage();
});

window.addEventListener('beforeunload', () => {
    clearInterval(kioskInterval);
    clearInterval(countdownInterval);
    removeRefreshIndicator();
});

window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(kioskInterval);
        clearInterval(countdownInterval);
        removeRefreshIndicator();
    } else {
        setTimeout(() => {
            if (kioskMode) {
                refreshCountdown = 10;
                createRefreshIndicator(refreshCountdown);
                startKioskMode();
            } else if (document.getElementById('stop-name').value.trim()) {
                startNormalMode();
            }
        }, 300);
    }
});

document.addEventListener('click', function(event) {
    const suggestionsDiv = document.getElementById('stop-suggestions');
    const stopNameInput = document.getElementById('stop-name');
    
    if (!event.target.closest('#stop-suggestions') && !event.target.closest('#stop-name')) {
        suggestionsDiv.innerHTML = '';
    }
});

document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);
