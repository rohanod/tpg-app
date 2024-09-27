document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = "https://transport.opendata.ch/v1";
    const busInfoContainer = document.getElementById('bus-info');
    const currentTimeDisplay = document.getElementById('current-time');
    const fetchBusTimingsButton = document.getElementById('fetch-bus-timings');
    const stopNameInput = document.getElementById('stop-name');

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
                if (minutesAway >= 0) { // Exclude negative timings
                    const busLine = bus.number;
                    const destination = bus.to;

                    if (!buses[busLine]) buses[busLine] = { destination: destination, timings: [] };
                    if (buses[busLine].timings.length < 5) buses[busLine].timings.push(minutesAway);
                }
            });

            Object.keys(buses).forEach(busLine => {
                const busDetails = buses[busLine];

                const busInfo = `
                    <div class="bus-info-item">
                        <div class="bus-line" data-bus="${busLine}">
                            <span>Bus ${busLine}</span>
                            <span>→ ${busDetails.destination}</span>
                        </div>
                        <div class="timings" id="timings-${busLine}">
                            <span>${busDetails.timings.join(' min, ')} min</span>
                        </div>
                    </div>`;
                busInfoContainer.innerHTML += busInfo;
            });

            // Add click event listener to each bus-line element for collapse/expand functionality
            document.querySelectorAll('.bus-line').forEach(busLineElement => {
                busLineElement.addEventListener('click', function () {
                    const busLine = this.dataset.bus;
                    const timingsElement = document.getElementById(`timings-${busLine}`);
                    timingsElement.classList.toggle('active');
                });
            });

        } catch (error) {
            busInfoContainer.innerHTML = "Error fetching bus timings.";
        }
    }

    fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);

    // Prevent form submission on Enter key press
    document.getElementById('bus-form').addEventListener('submit', function (event) {
        event.preventDefault();
    });

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});
