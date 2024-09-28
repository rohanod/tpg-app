async function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stopInput').value.trim();
    console.log(`Fetching data for stop: ${stopName}`);

    try {
        const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`);
        const locationData = await locationResponse.json();
        console.log('Station data received:', locationData);

        if (locationData.stations.length === 0) {
            displayMessage(`No buses departing from ${stopName} were found.`);
            return;
        }

        const stationId = locationData.stations[0].id;
        console.log(`Station ID for ${stopName}: ${stationId}`);

        const stationboardResponse = await fetch(`https://transport.opendata.ch/v1/stationboard?id=${stationId}&limit=5`);
        const stationboardData = await stationboardResponse.json();
        console.log('Bus stationboard data received:', stationboardData);

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
        console.error('Error fetching or processing data:', error);
        displayMessage('An error occurred while fetching bus information.');
    }
}

function displayBusInfo(buses) {
    const busInfoContainer = document.getElementById('busInfoContainer');
    busInfoContainer.innerHTML = ''; // Clear previous results

    buses.forEach(bus => {
        const busElement = document.createElement('div');
        busElement.classList.add('bus-info');
        busElement.innerHTML = `<strong>Bus ${bus.busNumber}</strong> → ${bus.to} <br> Departure: ${bus.departure}`;
        busInfoContainer.appendChild(busElement);
    });
}

function displayMessage(message) {
    const busInfoContainer = document.getElementById('busInfoContainer');
    busInfoContainer.innerHTML = `<p>${message}</p>`;
}

document.getElementById('bus-form').addEventListener('submit', function(event) {
    event.preventDefault();
    fetchAndDisplayBusInfo();
});
