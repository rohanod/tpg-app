document.getElementById('bus-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fetchAndDisplayBusInfo();
});

document.getElementById('fetch-bus-timings').addEventListener('click', fetchAndDisplayBusInfo);

async function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    if (!stopName) return;

    try {
        console.log(`Fetching data for stop: ${stopName}`);

        const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`);
        if (!locationResponse.ok) {
            throw new Error(`Network response was not ok: ${locationResponse.statusText}`);
        }

        const locationData = await locationResponse.json();
        console.log('Station data received:', locationData);

        if (!locationData || locationData.stations.length === 0) {
            alert('No matching station found.');
            return;
        }

        const stationId = locationData.stations[0].id;
        console.log(`Station ID for ${stopName}: ${stationId}`);

        const stationboardResponse = await fetch(`https://transport.opendata.ch/v1/stationboard?station=${stationId}&limit=50`);
        if (!stationboardResponse.ok) {
            throw new Error(`Network response was not ok: ${stationboardResponse.statusText}`);
        }

        const stationboardData = await stationboardResponse.json();
        console.log('Bus stationboard data received:', stationboardData);

        const busInfoContainer = document.getElementById('bus-info');
        busInfoContainer.innerHTML = '';

        // Filter the buses to only show those departing from the current stop
        const filteredBuses = stationboardData.stationboard.filter(bus => {
            return bus.stop.station.name.toLowerCase() === stopName.toLowerCase();
        });

        if (filteredBuses.length === 0) {
            busInfoContainer.innerHTML = `<p>No buses departing from ${stopName} were found.</p>`;
            return;
        }

        filteredBuses.forEach(bus => {
            // Get the departure timestamp and convert it to a readable time
            const departureTime = new Date(bus.stop.departureTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const busItem = document.createElement('div');
            busItem.classList.add('bus-info-item');
            busItem.innerHTML = `
                <div class="bus-line">Bus ${bus.number} From ${stopName} → ${bus.to}</div>
                <div class="departure-time">Departure: ${departureTime}</div>
            `;
            busInfoContainer.appendChild(busItem);
        });

    } catch (error) {
        console.error('Error fetching bus info:', error);
    }
}
