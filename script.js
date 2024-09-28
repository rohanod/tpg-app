function fetchAndDisplayBusInfo() {
    const stopName = document.getElementById('stop-name').value.trim();
    if (!stopName) return;

    fetch(`https://transport.opendata.ch/v1/locations?query=${stopName}`)
        .then(response => response.json())
        .then(data => {
            if (data.stations.length === 0) {
                alert('No matching station found.');
                return;
            }

            console.log("Matching stations:", data.stations); // Debugging to print station names
            
            const stationId = data.stations[0].id;
            return fetch(`https://transport.opendata.ch/v1/stationboard?station=${stationId}&limit=100`);
        })
        .then(response => response.json())
        .then(data => {
            const busInfoContainer = document.getElementById('bus-info');
            busInfoContainer.innerHTML = '';

            const filteredBuses = data.stationboard.filter(bus => {
                return bus.passList.some(pass => pass.station && pass.station.name && pass.station.name.toLowerCase() === stopName.toLowerCase());
            });

            if (filteredBuses.length === 0) {
                busInfoContainer.innerHTML = `<p>No buses departing from ${stopName} were found.</p>`;
                return;
            }

            filteredBuses.forEach(bus => {
                const relevantStop = bus.passList.find(pass => pass.station && pass.station.name && pass.station.name.toLowerCase() === stopName.toLowerCase());
                const busItem = document.createElement('div');
                busItem.classList.add('bus-info-item');
                busItem.innerHTML = `
                    <div class="bus-line">Bus ${bus.number} From ${stopName} → ${bus.to}</div>
                    <div class="departure-time">Departure: ${new Date(relevantStop.departureTimestamp * 1000).toLocaleTimeString()}</div>
                `;
                busItem.addEventListener('click', () => showModal(bus, relevantStop));
                busInfoContainer.appendChild(busItem);
            });
        })
        .catch(error => {
            console.error('Error fetching bus info:', error);
        });
}
