document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = "https://transport.opendata.ch/v1";
    const busInfoContainer = document.getElementById('bus-info');
    const currentTimeDisplay = document.getElementById('current-time');
    const fetchBusTimingsButton = document.getElementById('fetch-bus-timings');
    const stopNameInput = document.getElementById('stop-name');
    const busNumberInput = document.getElementById('bus-number');
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

    async function fetchStationBoard(stationId, busNumber) {
        let url = `${apiUrl}/stationboard?id=${stationId}&limit=100&transportations[]=bus`;
        const response = await fetch(url);
        const data = await response.json();

        if (busNumber) {
            return data.stationboard.filter(bus => bus.number == busNumber);
        }
        return data.stationboard;
    }

    async function fetchAndDisplayBusInfo() {
        const stopName = stopNameInput.value.trim();
        const busNumber = busNumberInput.value.trim();

        if (!stopName) {
            busInfoContainer.innerHTML = "Please enter a bus stop name.";
            return;
        }

        try {
            const stationId = await fetchStationId(stopName);
            const stationBoard = await fetchStationBoard(stationId, busNumber);

            busInfoContainer.innerHTML = '';
            const buses = {};

            // Process stationboard, and group by bus line and destination
            stationBoard.forEach(bus => {
                const minutesAway = Math.round((new Date(bus.stop.departure) - new Date()) / 60000);
                if (minutesAway >= 0) {
                    const busLine = bus.number;
                    const destination = bus.to;

                    const busKey = `${busLine}-${destination}`;
                    if (!buses[busKey]) {
                        buses[busKey] = { destination: destination, timings: [] };
                    }
                    if (buses[busKey].timings.length < 5) {
                        buses[busKey].timings.push(`${minutesAway} min`);
                    }
                }
            });

            // Display the buses in a collapsible format
            Object.keys(buses).forEach(busKey => {
                const busInfo = buses[busKey];
                const busLine = busKey.split('-')[0];
                const destination = busInfo.destination;
                const timings = busInfo.timings;

                // Create bus line element
                const busLineElement = document.createElement('div');
                busLineElement.classList.add('bus-line');
                busLineElement.innerHTML = `Bus ${busLine} &rarr; ${destination}`;

                // Create timings element (hidden by default)
                const timingsElement = document.createElement('div');
                timingsElement.classList.add('timings');
                timings.forEach(time => {
                    const timingElement = document.createElement('div');
                    timingElement.classList.add('timing');
                    timingElement.textContent = time;
                    timingsElement.appendChild(timingElement);
                });

                busLineElement.addEventListener('click', function () {
                    timingsElement.classList.toggle('active');
                });

                // Append to the container
                const busInfoItem = document.createElement('div');
                busInfoItem.classList.add('bus-info-item');
                busInfoItem.appendChild(busLineElement);
                busInfoItem.appendChild(timingsElement);

                busInfoContainer.appendChild(busInfoItem);
            });

            if (Object.keys(buses).length === 0) {
                busInfoContainer.innerHTML = "No bus timings found for the selected stop.";
            }
        } catch (error) {
            busInfoContainer.innerHTML = "Error fetching bus information.";
            console.error(error);
        }
    }

    // Allow both pressing the button and hitting "Enter" to trigger fetching bus info
    fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);
    busForm.addEventListener('submit', function (event) {
        event.preventDefault();
        fetchAndDisplayBusInfo();
    });

    // Update current time display every second
    setInterval(updateCurrentTime, 1000);
});
