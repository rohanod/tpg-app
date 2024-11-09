let debounceTimeout;
let kioskMode = false;
let stops = [];
let currentStopIndex = 0;
let kioskInterval;
let language = 'en';
let suggestedStops = [];
let userSelectedStop = false;

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
            suggestedStops
                .filter(station => station.id)
                .slice(0, 5)
                .forEach(station => {
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
    }, 500);
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
    }, 500);
});

function autofillStopNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const kioskParam = urlParams.get('kiosk');
    kioskMode = kioskParam === 'true';
    stops = [];

    if (kioskMode) {
        let index = 1;
        while (true) {
            let stopParamName = index === 1 ? 'stop' : `stop${index}`;
            let numbersParamName = index === 1 ? 'numbers' : `numbers${index}`;
            if (!urlParams.has(stopParamName)) break;
            const stopName = urlParams.get(stopParamName);
            const busNumbersParam = urlParams.get(numbersParamName);
            const vehicleNumbers = busNumbersParam ? busNumbersParam.split(',').map(num => num.trim()) : [];
            stops.push({
                stopName,
                vehicleNumbers
            });
            index++;
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
            fetchAndDisplayBusInfo();
        }
    }
}

function startKioskMode() {
    fetchAndDisplayCurrentStop();
    clearInterval(kioskInterval);
    kioskInterval = setInterval(() => {
        currentStopIndex = (currentStopIndex + 1) % stops.length;
        fetchAndDisplayCurrentStop();
    }, 15000);
}

function fetchAndDisplayCurrentStop() {
    const stop = stops[currentStopIndex];
    if (stop) {
        document.getElementById('stop-name').value = stop.stopName;
        document.getElementById('vehicle-numbers').value = stop.vehicleNumbers.join(', ');
        fetchAndDisplayBusInfo();
    }
}

function showKioskModeUI() {
    document.body.classList.add('kiosk-mode');
    document.querySelector('.container').classList.add('kiosk-mode');
    document.getElementById('bus-form').style.display = 'none';
}

function showNormalModeUI() {
    document.body.classList.remove('kiosk-mode');
    document.querySelector('.container').classList.remove('kiosk-mode');
    document.getElementById('bus-form').style.display = 'flex';
}

function exitKioskMode() {
    kioskMode = false;
    stops = [];
    currentStopIndex = 0;
    clearInterval(kioskInterval);
    updateURLParams();
    showNormalModeUI();
    fetchAndDisplayBusInfo();
}

document.addEventListener('keydown', function(event) {
    if (event.shiftKey && event.key.toLowerCase() === 'k') {
        if (kioskMode) {
            exitKioskMode();
        }
    }
});

document.getElementById('readme-button').addEventListener('click', function() {
    const readmeModal = document.getElementById('readme-modal');
    const readmeBody = document.getElementById('readme-body');
    readmeBody.innerHTML = getReadmeContent();
    readmeModal.style.display = 'block';
});

document.querySelector('.close-readme').addEventListener('click', function() {
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
        if (element.tagName === 'INPUT') {
            element.placeholder = elements[id][language];
        } else {
            element.textContent = elements[id][language];
        }
    }
}

function getReadmeContent() {
    if (language === 'en') {
        return `
            <h2>Welcome to the TPG Bus and Tram Timings Application</h2>
            <p>This application provides real-time bus and tram schedules from TPG (Geneva Public Transport).</p>
            <h3>How to Use</h3>
            <ol>
                <li><strong>Enter the stop name</strong> in the input field.</li>
                <li><strong>Optional:</strong> Enter specific bus or tram numbers separated by commas.</li>
                <li>The upcoming departures will display below.</li>
                <li>Click on a bus or tram to see detailed timings.</li>
            </ol>
            <h3>Kiosk Mode</h3>
            <p>Activate kiosk mode by adding stops and bus/tram numbers as URL parameters, including <code>?kiosk=true</code> in the URL.</p>
            <p><strong>Example:</strong> <code>?stop=Stop1&numbers=Bus1,Bus2&stop2=Stop2&numbers2=Bus3,Bus4&kiosk=true</code></p>
            <p>In kiosk mode, the display cycles through the configured stops automatically.</p>
            <p><strong>Exit Kiosk Mode:</strong> Press <strong>Shift + K</strong> on your keyboard.</p>
            <h3>Language Toggle</h3>
            <p>Use the language toggle at the top to switch between English and French.</p>
            <h3>Enjoy your journey!</h3>
        `;
    } else {
        return `
            <h2>Bienvenue sur l'application des horaires des bus et trams TPG</h2>
            <p>Cette application fournit les horaires en temps réel des bus et trams des TPG (Transports publics genevois).</p>
            <h3>Comment utiliser</h3>
            <ol>
                <li><strong>Entrez le nom de l'arrêt</strong> dans le champ de saisie.</li>
                <li><strong>Facultatif :</strong> Entrez les numéros spécifiques de bus ou tram séparés par des virgules.</li>
                <li>Les prochains départs s'afficheront ci-dessous.</li>
                <li>Cliquez sur un bus ou un tram pour voir les horaires détaillés.</li>
            </ol>
            <h3>Mode Kiosque</h3>
            <p>Activez le mode kiosque en ajoutant des arrêts et des numéros de bus/tram en tant que paramètres d'URL, en incluant <code>?kiosk=true</code> dans l'URL.</p>
            <p><strong>Exemple :</strong> <code>?stop=Arret1&numbers=Bus1,Bus2&stop2=Arret2&numbers2=Bus3,Bus4&kiosk=true</code></p>
            <p>En mode kiosque, l'affichage défile automatiquement à travers les arrêts configurés.</p>
            <p><strong>Quitter le mode kiosque :</strong> Appuyez sur <strong>Maj + K</strong> sur votre clavier.</p>
            <h3>Bascule de langue</h3>
            <p>Utilisez la bascule de langue en haut pour passer de l'anglais au français.</p>
            <h3>Bonne route !</h3>
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

    if (!userSelectedStop) {
        try {
            const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(stopName)}&type=station`);
            const locationData = await locationResponse.json();
            
            if (!locationData.stations || locationData.stations.length === 0) {
                displayMessage(language === 'en' ? `No buses or trams departing from "${stopName}" were found.` : `Aucun bus ou tram au départ de "${stopName}" n'a été trouvé.`);
                return;
            }

            const exactMatch = locationData.stations.find(s => s.name.toLowerCase() === stopName.toLowerCase());
            if (!exactMatch) {
                return;
            }
        } catch (error) {
            console.error('Error checking stop name:', error);
            return;
        }
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
                document.getElementById('stop-name-header').textContent = '';
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

    Object.entries(busGroups).forEach(([busKey, directions]) => {
        const bigBox = document.createElement('div');
        bigBox.classList.add('big-box');

        const busInfo = document.createElement('div');
        busInfo.classList.add('bus-info');
        busInfo.textContent = busKey;
        bigBox.appendChild(busInfo);

        Object.entries(directions).forEach(([direction, busList]) => {
            const directionHeader = document.createElement('div');
            directionHeader.classList.add('direction-header');
            directionHeader.textContent = (language === 'en' ? 'To: ' : 'Vers : ') + direction;
            bigBox.appendChild(directionHeader);

            const timeGrid = document.createElement('div');
            timeGrid.classList.add('time-grid');

            busList.sort((a, b) => a.departure.diff(b.departure))
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
    if (!busInfoContainer) {
        console.error('Bus info container element not found!');
        return;
    }
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
    document.getElementById('popup-modal').style.display = 'none';
});

document.querySelector('.close-readme').addEventListener('click', function() {
    document.getElementById('readme-modal').style.display = 'none';
});

window.addEventListener('popstate', autofillStopNameFromURL);

autofillStopNameFromURL();
updateLanguage();

if (kioskMode) {
    setInterval(fetchAndDisplayCurrentStop, 10000);
} else {
    setInterval(fetchAndDisplayBusInfo, 10000);
}
