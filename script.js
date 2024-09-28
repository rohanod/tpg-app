document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = "https://transport.opendata.ch/v1";
    const busInfoContainer = document.getElementById('bus-info');
    const currentTimeDisplay = document.getElementById('current-time');
    const fetchBusTimingsButton = document.getElementById('fetch-bus-timings');
    const stopNameInput = document.getElementById('stop-name');
    const busForm = document.getElementById('bus-form');

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
        const url = `${apiUrl}/stationboard?id=${stationId}&limit=100&transportations[]=bus`;
        const response = await fetch(url);
        const data = await response.json();
        return data.stationboard;
    }

    async function fetchAndDisplayBusInfo() {
        const stopName = stopNameInput.value.trim();

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
                if (minutesAway >= 0) {
                    const busLine = bus.number;
                    const destination = bus.to;

                    const busKey = `${busLine}-${destination}`;
                    if (!buses[busKey]) buses[busKey] = { destination: destination, timings: [] };
                    if (buses[busKey].timings.length < 5) buses[busKey].timings.push(minutesAway);
                }
            });

            Object.keys(buses).forEach(busKey => {
                const busDetails = buses[busKey];
                const [busLine] = busKey.split('-');

                const busInfo = `
                    <div class="bus-info-item">
                        <div class="bus-line" data-bus="${busKey}">
                            <span>Bus ${busLine}</span>
                            <span>→ ${busDetails.destination}</span>
                        </div>
                        <div class="timings" id="timings-${busKey}">
                            ${busDetails.timings.map(t => `<div class="timing">${t} min</div>`).join('')}
                        </div>
                    </div>`;
                busInfoContainer.innerHTML += busInfo;
            });

            document.querySelectorAll('.bus-line').forEach(busLineElement => {
                busLineElement.addEventListener('click', function () {
                    const busKey = this.dataset.bus;
                    const timingsElement = document.getElementById(`timings-${busKey}`);
                    timingsElement.classList.toggle('active');
                });
            });

        } catch (error) {
            busInfoContainer.innerHTML = "Error fetching bus timings.";
        }
    }

    fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);

    busForm.addEventListener('submit', function (event) {
        event.preventDefault();
        fetchAndDisplayBusInfo();
    });

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});
