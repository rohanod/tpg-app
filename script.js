async function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();

    try {
        const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`);
        const locationData = await locationResponse.json();

        if (locationData.stations.length === 0) {
            displayMessage(`No buses departing from ${stopName} were found.`);
            return;
        }

        const stationId = locationData.stations[0].id;

        const stationboardResponse = await fetch(`https://transport.opendata.ch/v1/stationboard?id=${stationId}&limit=50`);
        const stationboardData = await stationboardResponse.json();

        if (stationboardData.stationboard.length === 0) {
            displayMessage(`No buses departing from ${stopName} were found.`);
            return;
        }

        const buses = stationboardData.stationboard
            .filter(entry => entry.stop && entry.stop.departure)
            .map(entry => {
                const departureTime = new Date(entry.stop.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return {
                    busNumber: entry.number,
                    to: entry.to,
                    departure: departureTime
                };
            });

        if (buses.length === 0) {
            displayMessage(`No buses departing from ${stopName} were found.`);
        } else {
            displayBusInfo(buses);
        }

    } catch (error) {
        displayMessage('An error occurred while fetching bus information.');
    }
}

function displayBusInfo(buses) {
    const busInfoContainer = document.getElementById('bus-info');
    busInfoContainer.innerHTML = ''; 

    buses.forEach(bus => {
        const busElement = document.createElement('div');
        busElement.classList.add('bus-info-item');
        busElement.innerHTML = `<span><strong>Bus ${bus.busNumber}</strong> → ${bus.to}</span> <span>Departure: ${bus.departure}</span>`;
        busInfoContainer.appendChild(busElement);
    });
}

function displayMessage(message) {
    const busInfoContainer = document.getElementById('bus-info');
    busInfoContainer.innerHTML = `<p>${message}</p>`;
}

document.getElementById('bus-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fetchAndDisplayBusInfo();
});
