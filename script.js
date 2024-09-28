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
        let url = `${apiUrl}/stationboard?id=${stationId}&limit=100&transportations[]=bus`;
        const response = await fetch(url);
        const data = await response.json();
        return data.stationboard;
    }

    async function fetchAndDisplayBusInfo(event) {
        event.preventDefault();
        const stopName = stopNameInput ? stopNameInput.value.trim() : null;

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
                    if (!buses[busKey]) {
                        buses[busKey] = { destination: destination, timings: [] };
                    }
                    if (buses[busKey].timings.length < 5) {
                        buses[busKey].timings.push(`${minutesAway} min`);
                    }
                }
            });

            Object.keys(buses).forEach(busKey => {
                const busInfo = buses[busKey];
                const busLine = busKey.split('-')[0];
                const destination = busInfo.destination;
                const timings = busInfo.timings;

                const busLineElement = document.createElement('div');
                busLineElement.classList.add('bus-line');
                busLineElement.innerHTML = `Bus ${busLine} &rarr; ${destination}`;

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

    fetchBusTimingsButton.addEventListener('click', fetchAndDisplayBusInfo);
    busForm.addEventListener('submit', fetchAndDisplayBusInfo);

    setInterval(updateCurrentTime, 1000);
});
