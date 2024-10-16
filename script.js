let debounceTimeout;
function updateURLParams() {
	const stopName = document.getElementById('stop-name').value.trim();
	const vehicleNumbersInput = document.getElementById('vehicle-numbers').value.trim();
	const vehicleNumbers = vehicleNumbersInput ? vehicleNumbersInput.split(',').map(num => num.trim()) : [];
	const newUrl = new URL(window.location);
	if (stopName) {
		newUrl.searchParams.set('stop', stopName);
	} else {
		newUrl.searchParams.delete('stop');
	}
	if (vehicleNumbers.length > 0) {
		newUrl.searchParams.set('numbers', vehicleNumbers.join(','));
	} else {
		newUrl.searchParams.delete('numbers');
	}
	window.history.pushState({}, '', newUrl);
}
document.getElementById('stop-name').addEventListener('input', function () {
	clearTimeout(debounceTimeout);
	debounceTimeout = setTimeout(() => {
		updateURLParams();
		fetchAndDisplayBusInfo();
	}, 500);
});
document.getElementById('vehicle-numbers').addEventListener('input', function () {
	clearTimeout(debounceTimeout);
	debounceTimeout = setTimeout(() => {
		updateURLParams();
		fetchAndDisplayBusInfo();
	}, 500);
});
async function fetchAndDisplayBusInfo() {
	const stopName = document.getElementById('stop-name').value.trim();
	const vehicleNumbersInput = document.getElementById('vehicle-numbers').value.trim();
	const vehicleNumbers = vehicleNumbersInput ? vehicleNumbersInput.split(',').map(num => num.trim()) : [];
	const timeZone = 'Europe/Zurich';
	if (!stopName) {
		displayMessage('Please enter a stop name.');
		return;
	}
	try {
		const locationResponse = await fetch(`https://transport.opendata.ch/v1/locations?query=${encodeURIComponent(stopName)}`);
		const locationData = await locationResponse.json();
		if (!locationData.stations || locationData.stations.length === 0) {
			displayMessage(`No buses or trams departing from "${stopName}" were found.`);
			return;
		}
		const stationId = locationData.stations[0].id;
		const stationboardResponse = await fetch(`https://transport.opendata.ch/v1/stationboard?id=${encodeURIComponent(stationId)}&limit=300`);
		const stationboardData = await stationboardResponse.json();
		if (!stationboardData.stationboard || stationboardData.stationboard.length === 0) {
			displayMessage(`No upcoming buses or trams departing from "${stopName}" were found.`);
			return;
		}
		const now = moment().tz(timeZone);
		const groupedBuses = stationboardData.stationboard
			.filter(entry => entry.stop && entry.stop.departure)
			.filter(entry => vehicleNumbers.length === 0 || vehicleNumbers.includes(entry.number))
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
				const key = `${bus.vehicleType} ${bus.busNumber}`;
				if (!acc[key]) {
					acc[key] = [];
				}
				acc[key].push(bus);
				return acc;
			}, {});
		if (Object.keys(groupedBuses).length === 0) {
			displayMessage(`No upcoming buses or trams departing from "${stopName}" were found.`);
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
	const groupedByDirection = busDetails.reduce((acc, bus) => {
		if (!acc[bus.to]) {
			acc[bus.to] = [];
		}
		acc[bus.to].push(bus.minutesUntilDeparture);
		return acc;
	}, {});
	const directionsContainer = document.createElement('div');
	directionsContainer.style.display = 'flex';
	directionsContainer.style.justifyContent = 'space-between';
	Object.keys(groupedByDirection).forEach(direction => {
		const directionColumn = document.createElement('div');
		directionColumn.style.flex = '1';
		directionColumn.style.margin = '0 10px';
		const directionHeader = document.createElement('h3');
		directionHeader.textContent = `To: ${direction}`;
		directionColumn.appendChild(directionHeader);
		const busList = document.createElement('ul');
		const times = groupedByDirection[direction]
			.sort((a, b) => a - b)
			.slice(0, 10);
		times.forEach(minutes => {
			const busItem = document.createElement('li');
			busItem.textContent = `${minutes} min`;
			busList.appendChild(busItem);
		});
		directionColumn.appendChild(busList);
		directionsContainer.appendChild(directionColumn);
	});
	modalBody.appendChild(directionsContainer);
	modal.style.display = 'block';
}
function displayMessage(message) {
	const busInfoContainer = document.getElementById('bus-info');
	busInfoContainer.innerHTML = `<p class="message">${message}</p>`;
}
document.querySelector('.close').addEventListener('click', () => {
	document.getElementById('popup-modal').style.display = 'none';
});
function autofillStopNameFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const stopName = urlParams.get('stop');
	const vehicleNumbers = urlParams.get('numbers');
	if (stopName) {
		document.getElementById('stop-name').value = decodeURIComponent(stopName);
	}
	if (vehicleNumbers) {
		document.getElementById('vehicle-numbers').value = decodeURIComponent(vehicleNumbers);
	}
	if (stopName) {
		fetchAndDisplayBusInfo();
	}
}
autofillStopNameFromURL();
setInterval(fetchAndDisplayBusInfo, 10000);
