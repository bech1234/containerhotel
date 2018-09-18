/* globals House ko:false*/

var nnit = {};

function Mapping(path, action, forwards) {
	var self = this;

	self.path = path;
	self.action = action;
	self.forwards = forwards;
}

function Controller() {
	var self = this;

	self.model = {};

	self.addMapping = function (mapping) {
		self.model[mapping.path] = mapping;
	};

	self.pump = function (path, context) {
		if (!path) {
			return;
		}

		//		console.log(path, context); // eslint-disable-line no-console

		var mapping = self.model[path];

		if (!mapping) {
			console.log("Path not found:", path); // eslint-disable-line no-console
			return;
		}

		var forward = null;

		try {
			forward = mapping.action.execute(context);
		} catch (fail) {
			console.log("Error in action:", fail); // eslint-disable-line no-console
			self.pump("/error");
		}
		if (!forward) {
			return;
		}

		var nextPath = mapping.forwards[forward];
		if (nextPath) {
			self.pump(nextPath, context);
		}
	};

	self.callback = function (path, context) {
		return function () {
			self.pump(path, context);
		};
	};

	self.koCallback = function (path) {
		return function (context) {
			self.pump(path, context);
		};
	};

	self.get = function (path, receiver) {
		var req = new XMLHttpRequest();

		req.onload = self.callback(receiver, req);

		req.open("GET", path);
		req.setRequestHeader("Authorization", "Bearer 70e695be2034a5ad1f4db46cfb5cc56a");
		req.send();
	};

	self.post = function (path, payload, receiver) {
		var req = new XMLHttpRequest();

		req.onload = self.callback(receiver, req);

		req.open("POST", path);
		req.setRequestHeader("Authorization", "Bearer 70e695be2034a5ad1f4db46cfb5cc56a");
		req.send(payload);
	};
}

nnit.controller = new Controller();

function ErrorAction() {
	var self = this;

	self.execute = function () {
		nnit.vm.workarea.set("error");

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/error", new ErrorAction(), {}));

function InitAction() {
	var self = this;

	self.execute = function (context) {

		ko.applyBindings(nnit.vm);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/init", new InitAction(), {
	"next": "/count/start"
}));

function RequestMessageCountsAction() {
	var self = this;

	self.execute = function () {
		nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_7AE4915C16862CF47D5B/$count", "/count/ps-online");
		nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_C97316563D8CB6CD6054/$count", "/count/nfc-payload");
		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/count/start", new RequestMessageCountsAction(), {}));

function SetPSOnlineCountAction() {
	var self = this;

	self.execute = function (xhr) {
		nnit.vm.skips.psOnline = Number(xhr.response);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/count/ps-online", new SetPSOnlineCountAction(), {
	"next": "/watch/ps-online"
}));

function SetHousingOnlineCountAction() {
	var self = this;

	self.execute = function (xhr) {
		nnit.vm.skips.housingOnline = Number(xhr.response);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/count/housing-online", new SetHousingOnlineCountAction(), {
	"next": "/watch/housing-online"
}));

function WatchHousingOnlineAction() {
	var self = this;

	self.execute = function () {
		setTimeout(nnit.controller.callback("/watch/housing-online/request", null), 1000);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/watch/housing-online", new WatchHousingOnlineAction(), {}));

function RequestHousingOnlineAction() {
	var self = this;

	self.execute = function () {
		if (nnit.vm.watchers.constructing()) {
			nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_0F18A4C6D3EC0B850E74?$format=json&$orderby=G_CREATED&$skip=" + nnit.vm.skips.housingOnline,
				"/watch/housing-online/receive");
		}
		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/watch/housing-online/request", new RequestHousingOnlineAction(), {}));

function ReceiveHousingOnlineAction() {
	var self = this;

	self.execute = function (xhr) {
		var r = JSON.parse(xhr.response);

		nnit.vm.skips.housingOnline += Number(r.d.results.length);
		if (r.d.results.length > 0 && nnit.vm.housingLookup[r.d.results[0].G_DEVICE] === undefined) {
			var h = new House(r.d.results[0]);

			h.color("-G-");

			nnit.controller.pump("/apartment/add", h);
			nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_BBF07D19BBAE64F1E3C2/$count", "/count/neighbor-event");
			return "exit";
		}

		return "loop";
	};
}

nnit.controller.addMapping(new Mapping("/watch/housing-online/receive", new ReceiveHousingOnlineAction(), {
	"loop": "/watch/housing-online",
	"exit": null
}));

function SetNeighborEventCountAction() {
	var self = this;

	self.execute = function (xhr) {
		nnit.vm.skips.neighborEvent = Number(xhr.response);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/count/neighbor-event", new SetNeighborEventCountAction(), {
	"next": "/watch/neighbor-event"
}));

function WatchNeighborEventAction() {
	var self = this;

	self.execute = function () {
		setTimeout(nnit.controller.callback("/watch/neighbor-event/request", null), 1000);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/watch/neighbor-event", new WatchNeighborEventAction(), {}));

function RequestNeighborEventAction() {
	var self = this;

	self.execute = function () {
		if (nnit.vm.watchers.constructing()) {
			nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_BBF07D19BBAE64F1E3C2?$format=json&$orderby=G_CREATED&$skip=" + nnit.vm.skips.neighborEvent,
				"/watch/neighbor-event/receive");
		}
		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/watch/neighbor-event/request", new RequestNeighborEventAction(), {}));

function ReceiveNeighborEventAction() {
	var self = this;

	self.execute = function (xhr) {
		var r = JSON.parse(xhr.response).d.results;

		if (r.length > 0) {
			nnit.vm.skips.neighborEvent += r.length;

			var h = nnit.vm.housingLookup[r[0].G_DEVICE];

			if (h != null) {
				try {
					h.next(r[0]);

					nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_0F18A4C6D3EC0B850E74/$count", "/count/housing-online");

					return "exit";
				} catch (occupied) {

				}
			}
		}

		return "loop";
	};
}

nnit.controller.addMapping(new Mapping("/watch/neighbor-event/receive", new ReceiveNeighborEventAction(), {
	"loop": "/watch/neighbor-event",
	"exit": null
}));

function SetNfcPayloadCountAction() {
	var self = this;

	self.execute = function (xhr) {
		nnit.vm.skips.nfcPayload = Number(xhr.response);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/count/nfc-payload", new SetNfcPayloadCountAction(), {
	"next": "/watch/nfc-payload"
}));

function WatchNfcPayloadAction() {
	var self = this;

	self.execute = function () {
		setTimeout(nnit.controller.callback("/watch/nfc-payload/request", null), 1000);

		return "next";
	};
}
nnit.controller.addMapping(new Mapping("/watch/nfc-payload", new WatchNfcPayloadAction(), {}));

function RequestNfcPayloadAction() {
	var self = this;

	self.execute = function () {
		nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_C97316563D8CB6CD6054?$format=json&$orderby=G_CREATED&$skip=" + nnit.vm.skips.nfcPayload,
			"/watch/nfc-payload/receive");

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/watch/nfc-payload/request", new RequestNfcPayloadAction(), {}));

function ReceiveNfcPayloadAction() {
	var self = this;
	
	self.lookForSimpsons = function (container) {
		var problem = null;
		
		if (container.payload.cargo() == "Homer Simpson") {
			problem = "Krusty the Klown";
		}
		if (container.payload.cargo() == "Krusty the Klown") {
			problem = "Homer Simpson";
		}
		
		if (problem == null)
			return;
			
		for ( var i in nnit.vm.housingLookup ) {
			var h = nnit.vm.housingLookup[i];
			
			if (h.container() != null && h.container().payload.cargo() == problem) {
				nnit.controller.pump("/house/eject", h);
				
				return;
			}
		}
	};

	self.execute = function (xhr) {
		var r = JSON.parse(xhr.response).d.results;

		if (r.length > 0)
			console.log(r);

		for (var i = 0; i < r.length; i++) {
			nnit.vm.skips.nfcPayload++;

			if (nnit.vm.housingLookup[r[i].G_DEVICE] !== undefined) {
				var h = nnit.vm.housingLookup[r[i].G_DEVICE];

				if (r[i].C_PRESENT) {
					h.container(new Container(r[i]));
					h.color("--B");
					self.lookForSimpsons(h.container());
				} else {
					h.container(null);
					h.color("-G-");
				}
			}
		}

		return "loop";
	};
}

nnit.controller.addMapping(new Mapping("/watch/nfc-payload/receive", new ReceiveNfcPayloadAction(), {
	"loop": "/watch/nfc-payload"
}));

function NfcWriteAction() {
	var self = this;

	self.execute = function (container) {
		var payload = encodeURIComponent(JSON.stringify({
			color: container.payload.color(),
			cargo: container.payload.cargo(),
			notes: container.payload.notes()
		}));
		var message = '{ "method" : "ws", "messageType":"24335d43d00a1f967d65","messages":[{"nfcid":"' + container.C_NFCID + '", "payload":"' +
			payload + '"}]}';

		nnit.controller.post(
			"/iotmms/v1/api/http/push/" + container.G_DEVICE,
			message);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/nfc/write", new NfcWriteAction(), {}));

function WatchPSOnlineAction() {
	var self = this;

	self.execute = function () {
		setTimeout(nnit.controller.callback("/watch/ps-online/request", null), 1000);

		return "next";
	};
}
nnit.controller.addMapping(new Mapping("/watch/ps-online", new WatchPSOnlineAction(), {}));

function RequestPSOnlineAction() {
	var self = this;

	self.execute = function () {
		nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_7AE4915C16862CF47D5B/$count", "/watch/ps-online/receive");
		return "next";
	};
}
nnit.controller.addMapping(new Mapping("/watch/ps-online/request", new RequestPSOnlineAction(), {}));

function ReceivePSOnlineAction() {
	var self = this;

	self.execute = function (xhr) {
		if (xhr.response > nnit.vm.skips.psOnline) {
			nnit.vm.skips.psOnline = xhr.response;

			nnit.vm.watchers.constructing(true);
			nnit.vm.watchers.nextX = 1;
			nnit.vm.watchers.nextY = 0;
			nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_0F18A4C6D3EC0B850E74/$count", "/count/housing-online");

			return "online";
		}
		return "offline";
	};
}

nnit.controller.addMapping(new Mapping("/watch/ps-online/receive", new ReceivePSOnlineAction(), {
	"online": "/apartment/power-supply",
	"offline": "/watch/ps-online"
}));

function ForcePSOnlineAction() {
	var self = this;

	self.execute = function (xhr) {
		nnit.vm.watchers.constructing(true);
		nnit.vm.watchers.nextX = 1;
		nnit.vm.watchers.nextY = 0;
		nnit.controller.get("/iotmms/v1/api/http/app.svc/T_IOT_0F18A4C6D3EC0B850E74/$count", "/count/housing-online");

		return "online";
	};
}

nnit.controller.addMapping(new Mapping("/force/ps-online", new ForcePSOnlineAction(), {
	"online": "/apartment/power-supply"
}));

function AddApartmentAction() {
	var self = this;

	self.apartments = 0;

	self.execute = function (context) {
		if (context.y == nnit.vm.workarea.hotel.rows().length - 1 || self.apartments == 0) {
			nnit.vm.workarea.hotel.rows.unshift({
				apartments: ko.observableArray([{
					type: "empty",
					x: 0,
					y: context.y + 1
				}, {
					type: "arrow-down",
					x: 1,
					y: context.y + 1
				}])
			});
		}

		var row = nnit.vm.workarea.hotel.rows().length - 1 - context.y;

		nnit.vm.workarea.hotel.rows()[row].apartments.pop();
		nnit.vm.workarea.hotel.rows()[row].apartments.push(context);
		if (context.y == 0) {
			nnit.vm.workarea.hotel.rows()[row].apartments.push({
				type: "arrow-left",
				x: context.x + 1,
				y: context.y
			});
		} else {
			if (nnit.vm.workarea.hotel.rows()[row + 1].apartments()[context.x + 1] && nnit.vm.workarea.hotel.rows()[row + 1].apartments()[context.x +
					1].type == "house")
				nnit.vm.workarea.hotel.rows()[row].apartments.push({
					type: "arrow-down",
					x: context.x + 1,
					y: context.y
				});
		}

		if (row > 0 && nnit.vm.workarea.hotel.rows()[row - 1].apartments()[context.x - 1] && nnit.vm.workarea.hotel.rows()[row - 1].apartments()[
				context.x - 1].type == "house") {
			nnit.vm.workarea.hotel.rows()[row - 1].apartments.push({
				type: "arrow-down",
				x: context.x,
				y: context.y + 1
			});
		}

		self.apartments++;
	};
}

nnit.controller.addMapping(new Mapping("/apartment/add", new AddApartmentAction(), {}));

function ShowPowerSupplyAction() {
	var self = this;

	self.execute = function () {
		nnit.vm.workarea.hotel.rows()[0].apartments.pop();
		nnit.vm.workarea.hotel.rows()[0].apartments.push({
			type: "power-supply",
			x: 0,
			y: 0
		});
		nnit.vm.workarea.hotel.rows()[0].apartments.push({
			type: "arrow-left",
			x: 1,
			y: 0
		});
	};
}

nnit.controller.addMapping(new Mapping("/apartment/power-supply", new ShowPowerSupplyAction(), {}));

function EndConstructionAction() {
	var self = this;

	self.execute = function () {
		nnit.vm.watchers.constructing(false);

		for (var i = 0; i < nnit.vm.workarea.hotel.rows().length; i++) {
			var row = nnit.vm.workarea.hotel.rows()[i];

			// Always remove the first position - either empty space, or the power supply
			row.apartments.shift();

			rowloop: while (row.apartments().length > 0) {
				switch (row.apartments()[row.apartments().length - 1].type) {
				case "empty":
				case "arrow-left":
				case "arrow-down":
					row.apartments.pop();
					break;

				default:
					break rowloop;
				}
			}
		}

		for (var i = nnit.vm.workarea.hotel.rows().length - 1; i >= 0; i--) {
			if (nnit.vm.workarea.hotel.rows()[i].apartments().length == 0) {
				nnit.vm.workarea.hotel.rows.shift()();
			} else {
				break;
			}
		}
		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/end-construction", new EndConstructionAction(), {}));

function EjectAction() {
	var self = this;

	self.execute = function (house) {
		var payload = '{ "method" : "ws", "messageType":"0b829df5bec85cd0d05c","messages":[{"empty":""}]}';

		house.color("R--");

		nnit.controller.post(
			"/iotmms/v1/api/http/push/" + house.id,
			payload);

		//		house.container(null);

		setTimeout(nnit.controller.callback("/house/reset-eject", house), 5000);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/house/eject", new EjectAction(), {}));

function ResetEjectLedAction() {
	var self = this;

	self.execute = function (house) {
		if (house.color() == "R--") {
			house.color("-G-");
		}

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/house/reset-eject", new ResetEjectLedAction(), {}));

function HouseLedsAction() {
	var self = this;

	self.execute = function (house) {
		var red = "off";
		var green = "off";
		var blue = "off";

		switch (house.color().charAt(0)) {
		case "r":
			red = "blink";
			break;
		case "R":
			red = "on";
			break;
		}
		switch (house.color().charAt(1)) {
		case "g":
			green = "blink";
			break;
		case "G":
			green = "on";
			break;
		}
		switch (house.color().charAt(2)) {
		case "b":
			blue = "blink";
			break;
		case "B":
			blue = "on";
			break;
		}

		var payload = '{ "method" : "ws", "messageType" : "88f60e85ca9413bf4927" , "messages":[{"red":"' + red + '","green":"' + green +
			'", "blue":"' + blue + '"}]}';

		nnit.controller.post(
			"/iotmms/v1/api/http/push/" + house.id,
			payload);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/house/led", new HouseLedsAction(), { "next" : "/power-supply/leds" }));

function ShowContainerWorkareaAction() {
	var self = this;

	self.execute = function (house) {
		nnit.vm.workarea.container.house(house);

		nnit.vm.workarea.set("container");

		return "next";
	}
}

nnit.controller.addMapping(new Mapping("/house/container-info", new ShowContainerWorkareaAction(), {}));

function ShowHotelWorkareaAction() {
	var self = this;

	self.execute = function (event) {
		if (event == null || 
			(nnit.vm.workarea.container.active() && event.path.length <= 5) || 
			(nnit.vm.workarea.picking.active() && event.path.length <= 5)) 
		{
			nnit.vm.workarea.set("hotel");
			nnit.vm.workarea.container.house(null);
		}

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/hotel/show", new ShowHotelWorkareaAction(), {}));

nnit.controller.addMapping(new Mapping("/container/save", new NfcWriteAction(), {
	"next": "/container/back-to-hotel"
}));

function BackToHotelWorkareaAction() {
	var self = this;

	self.execute = function () {
		nnit.vm.workarea.set("hotel");
		nnit.vm.workarea.container.house(null);

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/container/back-to-hotel", new BackToHotelWorkareaAction(), {}));

function PanicAction() {
	var self = this;

	self.execute = function () {
		var pause = 500;
		var occupied = [];

		for (var id in nnit.vm.housingLookup) {
			var h = nnit.vm.housingLookup[id];

			if (h.container() != null) {
				occupied.push(h);
			}
		}

		while (occupied.length > 0) {
			var h = occupied.splice(Math.floor(occupied.length * Math.random()), 1)[0];
			setTimeout(nnit.controller.callback("/house/eject", h), pause);
			pause += 500;
		}

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/force/panic", new PanicAction(), {}));


function PowerSupplyLedsAction() {
	var self = this;

	self.execute = function () {
		var ledState = {};
		var red = 0;
		var green = 0;
		var blue = 0;

		for (var id in nnit.vm.housingLookup) {
			var h = nnit.vm.housingLookup[id];

			switch (h.color()) {
			case "R--":
				red++;
				break;
			case "-G-":
				green++;
				break;
			case "--B":
				blue++;
				break;
			}
		}
		
		for (var i = 0; i < 8; i++) {
			if (blue > 0) {
				ledState["led"+i] = "blue";
				blue--;
				continue;
			}
			if (green > 0) {
				ledState["led"+i] = "green";
				green--;
				continue;
			}
			if (red > 0) {
				ledState["led"+i] = "red";
				red--;
				continue;
			}
				ledState["led"+i] = "off";
		}

		var payload = '{ "method" : "ws", "messageType":"625f0f906dca05bc6ee7","messages":[' + JSON.stringify(ledState) + ']}';

		nnit.controller.post(
			"/iotmms/v1/api/http/push/1f6c92c7-9c8f-4072-ba08-ea709528a624",
			payload);

		return "next";
	};

}

nnit.controller.addMapping(new Mapping("/power-supply/leds", new PowerSupplyLedsAction(), {}));




function NewPickAction() {
	var self = this;
	
	self.execute = function () {
		var wa = nnit.vm.workarea.picking;
		
		console.log("new pick");
		
		wa.selected([]);
		wa.available([]);
		
		
		
		for (var id in nnit.vm.housingLookup) {
			var h = nnit.vm.housingLookup[id];
			
			if (h.container() != null) {
				wa.available.push(h.container());
			}
		}
		
		nnit.vm.workarea.set("picking");

		return "next";
	};
}


nnit.controller.addMapping(new Mapping("/pick/new", new NewPickAction(), {}));



function PickSelectAction() {
	var self = this;
	
	self.execute = function (container) {
		console.log(container);
		
		if (nnit.vm.workarea.picking.available.remove(container).length > 0) {
			nnit.vm.workarea.picking.selected.push(container);
		} else {
			nnit.vm.workarea.picking.selected.remove(container);
			nnit.vm.workarea.picking.available.push(container);
		}
		
		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/pick/select", new PickSelectAction(), {}));
nnit.controller.addMapping(new Mapping("/pick/deselect", new PickSelectAction(), {}));




function PickAction() {
	var self = this;
	
	self.execute = function () {
		var picked = nnit.vm.workarea.picking.selected();

		for (var i = 0; i < picked.length; i++) {
			setTimeout(nnit.controller.callback("/house/eject", nnit.vm.housingLookup[picked[i].G_DEVICE]), 0);
		}

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/pick/execute", new PickAction(), { "next" : "/hotel/show" }));















//