document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = "https://transport.opendata.ch/v1";
    const busInfoContainer = document.getElementById('bus-info');
    const currentTimeDisplay = document.getElementById('current-time');
    const fetchBusTimingsButton = document.getElementById('fetch-bus-timings');

    function updateCurrentTime() {
        const now = new Date();
        currentTimeDisplay.textContent = now.toLocaleTimeString();
    }

    async function fetchStationId(stopName) {
        const url = `${apiUrl}/locations?query=${stopName}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.stations && data.stations.length > 0) {
            return data.stations[0].id;
        } else {
            busInfoContainer.innerHTML = "No station found.";
            throw new Error("No station found");
        }
    }

    async function fetchStationBoard(stationId) {
        const url = `${apiUrl}/stationboard?id=${stationId}&limit=5&transportations[]=bus`;
        const response = await fetch(url);
        const data = await response.json();
        return data.stationboard;
    }

    async function fetchAndDisplayBusInfo() {
        const stopName = document.getElementById('stop-name').value.trim();

        if (!stopName) {
            busInfoContainer.innerHTML = "Please enter a bus stop name.";
            return;
        }

        try {
            const stationId = await fetchStationId(stopName);
            const stationBoard = await fetchStationBoard(stationId);

            busInfoContainer.innerHTML = '';
            const buses = {};

            stationBoard.forEach(bus => {
                const minutesAway = Math.round((new Date(bus.stop.departure) - new Date()) / 60000);
                const busLine = bus.number;
                const destination = bus.to;

                if (!buses[busLine]) buses[busLine] = { destination: destination, timings: [] };
                buses[busLine].timings.push(minutesAway);
            });

            Object.keys(buses).forEach(busLine => {
                const busDetails = buses[busLine];
                const busInfo = `<div class="bus-info-item">Bus ${busLine} to ${busDetails.destination}: ${busDetails.timings.join(' min, ')} min</div>`;
                busInfoContainer.innerHTML += busInfo;
            });

        } catch (error) {
            busInfoContainer.innerHTML = "Error fetching bus timings.";
        }
    }

    fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});
