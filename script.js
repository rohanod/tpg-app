let debounceTimeout;
let kioskMode = false;
let stops = [];
let currentStopIndex = 0;
let kioskInterval;

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

document.getElementById('stop-name').addEventListener('input', function () {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        if (!kioskMode) {
            updateURLParams();
            fetchAndDisplayBusInfo();
        } else {
            stops[currentStopIndex].stopName = document.getElementById('stop-name').value.trim();
            updateURLParams();
        }
    }, 500);
});

document.getElementById('vehicle-numbers').addEventListener('input', function () {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        if (!kioskMode) {
            updateURLParams();
            fetchAndDisplayBusInfo();
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

async function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    const vehicleNumbersInput = document.getElementById('vehicle-numbers').value.trim();
    const vehicleNumbers = vehicleNumbersInput ? vehicleNumbersInput.split(',').map(num => num.trim()) : [];
    const timeZone = 'Europe/Zurich';
    if (!stopName) {
        displayMessage('Please enter a stop name.');
        return;
    }
    try {
        const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(stopName)}`);
        const locationData = await locationResponse.json();
        if (!locationData.stations || locationData.stations.length === 0) {
            displayMessage(`No buses or trams departing from "${stopName}" were found.`);
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
            displayMessage(`No upcoming buses or trams departing from "${stopName}" were found.`);
            return;
        }
        const now = moment().tz(timeZone);
        let buses = stationboardData.stationboard
            .filter(entry => entry.stop && entry.stop.departure)
            .filter(entry => vehicleNumbers.length === 0 || vehicleNumbers.includes(entry.number))
            .map(entry => {
                const departureTime = moment.tz(entry.stop.departure, timeZone);
                const vehicleType = entry.category === 'T' ? 'Tram' : 'Bus';
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
            displayMessage(`No upcoming buses or trams departing from "${stopName}" were found.`);
        } else {
            if (kioskMode) {
                document.getElementById('stop-name-header').textContent = `Stop: ${stopName}`;
                displayBusesKioskMode(buses);
            } else {
                document.getElementById('stop-name-header').textContent = '';
                displayBusInfo(buses);
            }
        }
    } catch (error) {
        console.error('Error fetching or processing data:', error);
        displayMessage('An error occurred while fetching bus or tram information.');
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
            directionHeader.textContent = `To: ${direction}`;
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
        directionHeader.textContent = `To: ${direction}`;
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

window.addEventListener('popstate', autofillStopNameFromURL);

autofillStopNameFromURL();

if (kioskMode) {
    setInterval(fetchAndDisplayCurrentStop, 10000);
} else {
    setInterval(fetchAndDisplayBusInfo, 10000);
}
