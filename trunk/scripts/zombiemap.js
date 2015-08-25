/*
 * GLOBALS
 */

var map = null;
var channels = {};

/*
 * CHANNEL MANAGEMENT
 */

function addChannel(name, url) {
	removeChannel(name);

	channels[name] = {
		url: url,
		clients: {},

		timer: window.setInterval(function () {
				var script = document.createElement('script');
				script.src = url + "?action=enum&callback=channels['" + name + "'].onenum";
				script.type = 'text/javascript';
				script.onload = function () {
					document.body.removeChild(script);
				};

				document.body.appendChild(script);
		}, 5000),

		onenum: function (clients) {
			for (var client_id in clients)
				if (!clientExists(name, client_id))
					addClient(name, client_id, clients[client_id]);
				else {
					channels[name].clients[client_id].ttl = 1;
					channels[name].clients[client_id].data = clients[client_id];
				}
		}
	};

	return channels[name];
}

function removeChannel(name) {
	if (channelExists(name)) {
		window.clearTimer(channels[name].timer);
		delete channels[name];
	}
}

function channelExists(channel_name) {
	return channels[channel_name]?true:false;
}

/*
 * CLIENT MANAGEMENT
 */

function addClient(channel_name, client_id, client_data) {
	removeClient(channel_name, client_id);

	channels[channel_name].clients[client_id] = {
		ttl: 1,
		point: null,
		marker: null,
		isMapped: false,
		data: client_data,

		getLocation: function () {
			var script = document.createElement('script');
			script.src = "http://www.gnucitizen.org/util/location?ip=" + client_data['_client_ip'] + "&callback=channels['" + channel_name + "'].clients['" + client_id + "'].onlocation";
			script.type = 'text/javascript';
			script.onload = function () {
				document.body.removeChild(script);
			};

			document.body.appendChild(script);
		},

		onlocation: function (location) {
			channels[channel_name].clients[client_id].location = location;
			channels[channel_name].clients[client_id].point = new GLatLng(location.latitude, location.longitude);
			channels[channel_name].clients[client_id].marker = new GMarker(channels[channel_name].clients[client_id].point);

			var info = 'channel: ' + channel_name + '<br/>'
			         + 'client: ' + client_id + '<br/>'
			         + 'ip: ' + channels[channel_name].clients[client_id].data['_client_ip'] + '<br/>'
			         + 'address: ' + location.city + ', ' + location.region + ',' + location.country_name;

			GEvent.addListener(channels[channel_name].clients[client_id].marker, 'click', function () {
				channels[channel_name].clients[client_id].marker.openInfoWindowHtml('<div style="color:#000000">' + info + '</div>');
			});

			if (!channels[channel_name].clients[client_id].isMapped) {
				map.addOverlay(channels[channel_name].clients[client_id].marker);
				channels[channel_name].clients[client_id].isMapped = true;
			}
		}
	};

	channels[channel_name].clients[client_id].getLocation();

	return channels[channel_name].clients[client_id];
}

function removeClient(channel_name, client_id) {
	if (clientExists(channel_name, client_id)) {
		if (channels[channel_name].clients[client_id].isMapped)
				map.removeOverlay(channels[channel_name].clients[client_id].marker);

		delete channels[channel_name].clients[client_id];
	}
}

function clientExists(channel_name, client_id) {
	return channelExists(channel_name) && channels[channel_name].clients[client_id]?true:false;
}

/*
 * ACTION MANAGEMENT
 */

function addAction(name, action) {
	removeAction(name);

	var nice_name = name.toLowerCase().replace(/\W|\s/g, '_')

	$('#actions').append('<li><a id="action_' + nice_name + '" href="#">' + name + '</a></li>');
	$('#action_' + nice_name).click(action);
}

function removeAction(name) {
	if (actionExists(name)) {
		var nice_name = name.toLowerCase().replace(/\W|\s/g, '_')
		$('#action_' + nice_name).remove();
	}
}

function actionExists(name) {
	var nice_name = name.toLowerCase().replace(/\W|\s/g, '_')
	return $('#action_' + nice_name).length == 1?true:false;
}

/*
 * HELPERS
 */

function b64decode(input) {
	var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

	var result = '';
	var chr1, chr2, chr3;
	var enc1, enc2, enc3, enc4;
	var i = 0;

	var input = input.replace(/[^A-Za-z0-9+/=]/g, '');

	do {
		enc1 = b64chars.indexOf(input.charAt(i++));
		enc2 = b64chars.indexOf(input.charAt(i++));
		enc3 = b64chars.indexOf(input.charAt(i++));
		enc4 = b64chars.indexOf(input.charAt(i++));

		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;

		result += String.fromCharCode(chr1);

		if (enc3 != 64)
			result += String.fromCharCode(chr2);

		if (enc4 != 64)
			result += String.fromCharCode(chr3);
	} while (i < input.length);

	return result;
}

/*
 * MAIN
 */

$(document).ready(function () {
	if (GBrowserIsCompatible()) {
		map = new GMap2($('#map').get(0));
		map.addControl(new GLargeMapControl());
		map.addControl(new GMapTypeControl());
		map.setCenter(new GLatLng(0, 0), 1);

		window.setInterval(function () {
			for (var channel_name in channels)
				for (var client_id in channels[channel_name].clients)
					if (channels[channel_name].clients[client_id].ttl >= 3)
						removeClient(channel_name, client_id);
					else
						channels[channel_name].clients[client_id].ttl += 1;
		}, 5000);

		var query = document.location.search.substring(1).replace(/(^\s+|\s+$)/, '');

		if (query.length > 0 && confirm('ZombieMap is set to load a dynamic, URL based profile. Do you want to proceed?'))
			eval(b64decode(query));

		addChannel('carnaval', 'http://www.gnucitizen.org/carnaval/channel');
	}
});
