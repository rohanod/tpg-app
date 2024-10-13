async function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    const timeZone = 'Europe/Zurich';

    try {
        const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`);
        const locationData = await locationResponse.json();

        if (locationData.stations.length === 0) {
            displayMessage(`No buses or trams departing from ${stopName} were found.`);
            return;
        }

        const stationId = locationData.stations[0].id;

        const stationboardResponse = await fetch(`https://transport.opendata.ch/v1/stationboard?id=${stationId}&limit=300`);
        const stationboardData = await stationboardResponse.json();

        if (stationboardData.stationboard.length === 0) {
            displayMessage(`No buses or trams departing from ${stopName} were found.`);
            return;
        }

        const now = moment().tz(timeZone);

        // Grouping buses by number and direction
        const groupedBuses = stationboardData.stationboard
            .filter(entry => entry.stop && entry.stop.departure)
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
            .filter(bus => bus.departure.isAfter(now))
            .reduce((acc, bus) => {
                const key = `${bus.vehicleType} ${bus.busNumber}: ${bus.to}`;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(bus);
                return acc;
            }, {});

        if (Object.keys(groupedBuses).length === 0) {
            displayMessage(`No upcoming buses or trams departing from ${stopName} were found.`);
        } else {
            displayBusInfo(groupedBuses);
        }

    } catch (error) {
        console.error('Error fetching or processing data:', error);
        displayMessage('An error occurred while fetching bus or tram information.');
    }
}

function displayBusInfo(groupedBuses) {
    const busInfoContainer = document.getElementById('bus-info');
    if (!busInfoContainer) {
        console.error('Bus info container element not found!');
        return;
    }

    busInfoContainer.innerHTML = '';

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

    busDetails.forEach(bus => {
        const busElement = document.createElement('div');
        busElement.innerHTML = `<h3>${bus.vehicleType} ${bus.busNumber} - To: ${bus.to}</h3>`;
        const busList = document.createElement('ul');

        const busItem = document.createElement('li');
        busItem.textContent = `${bus.minutesUntilDeparture} min`;
        busList.appendChild(busItem);

        busElement.appendChild(busList);
        modalBody.appendChild(busElement);
    });

    modal.style.display = 'block';
}

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('popup-modal').style.display = 'none';
});

document.getElementById('bus-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fetchAndDisplayBusInfo();
});

setInterval(fetchAndDisplayBusInfo, 5000);