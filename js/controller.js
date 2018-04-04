/* global ko:false */

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

	self.addMapping = function(mapping) {
		self.model[mapping.path] = mapping;
	};

	self.pump = function(path, context) {
		if (!path) {
			return;
		}

		console.log(path, context); // eslint-disable-line no-console

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

	self.callback = function(path, context) {
		return function() {
			self.pump(path, context);
		};
	};

	self.get = function(path, receiver) {
		var req = new XMLHttpRequest();

		req.onload = self.callback(receiver, req);

		req.open("GET", path);
		req.setRequestHeader("Authorization", "Bearer 70e695be2034a5ad1f4db46cfb5cc56a");
		req.send();
	};

	self.post = function(path, payload, receiver) {
		var req = new XMLHttpRequest();

		req.onload = self.callback(receiver, req);

		req.open("POST", path);
		req.setRequestHeader("Authorization", "Bearer 70e695be2034a5ad1f4db46cfb5cc56a");
		req.send(payload);
	};
}

nnit.controller = new Controller();

var skips = 0;

function ErrorAction() {
	var self = this;

	self.execute = function() {
		nnit.vm.workarea.set("error");

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/error", new ErrorAction(), {}));

function InitAction() {
	var self = this;

	self.execute = function(context) {
		ko.components.register("led-state", {
			viewModel: function(params) {
				this.colour = params.value;

				this.off = function() {
					this.colour("off");
				}.bind(this);
				this.red = function() {
					this.colour("red");
				}.bind(this);
				this.green = function() {
					this.colour("green");
				}.bind(this);
				this.blue = function() {
					this.colour("blue");
				}.bind(this);
			},
			template: {
				element: "led-state-template"
			}
		});

		for (var i = 0; i < 8; i++) {
			nnit.vm.workarea.ledControl["led" + i].subscribe(nnit.controller.callback("/power-supply/send-led"));
		}

		ko.applyBindings(nnit.vm);

		nnit.controller.get(
			"/iotmms/v1/api/http/app.svc/T_IOT_7AE4915C16862CF47D5B?$format=json",
			"/inbound/power-on/set-skip");

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/init", new InitAction(), {
	"next": "/power-supply/check-online"
}));

function ClearInboundAction() {
	var self = this;

	self.execute = function(xhr) {
		var pol = JSON.parse(xhr.response).d.results;

		skips = pol.length;

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/inbound/power-on/set-skip", new ClearInboundAction(), {}));

function SendLedStateAction() {
	var self = this;

	self.execute = function(context) {
		var payload = '{ "method" : "ws", "messageType":"625f0f906dca05bc6ee7","messages":[' + ko.toJSON(nnit.vm.workarea.ledControl) + ']}';

		nnit.controller.post(
			"/iotmms/v1/api/http/push/1f6c92c7-9c8f-4072-ba08-ea709528a624",
			payload,
			"/power-supply/detect-online");

		return "next";
	};
}

nnit.controller.addMapping(new Mapping("/power-supply/check-online", new SendLedStateAction(), {}));
nnit.controller.addMapping(new Mapping("/power-supply/send-led", new SendLedStateAction(), {}));

function DetectPowerSupplyOnline() {
	var self = this;

	self.execute = function(xhr) {
		switch (xhr.status) {
			case 200:
				return "online";
			case 410:
				return "offline";
			default:
				return "error";
		}
	};
}

nnit.controller.addMapping(new Mapping("/power-supply/detect-online", new DetectPowerSupplyOnline(), {
	"online": "/power-supply/online",
	"offline": "/power-supply/offline",
	"error": "/error"
}));

function PowerSupplyOnlineAction() {
	var self = this;

	self.execute = function(context) {
		nnit.vm.workarea.set("ledControl");

		return "next";
	};
}
nnit.controller.addMapping(new Mapping("/power-supply/online", new PowerSupplyOnlineAction(), {}));

function PowerSupplyOfflineAction() {
	var self = this;

	self.execute = function(context) {
		nnit.vm.workarea.set("connectPowerSupply");

		return "next";
	};

}

nnit.controller.addMapping(new Mapping("/power-supply/offline", new PowerSupplyOfflineAction(), {
	next: "/inbound/power-on/timer"
}));

function LookForPowerOnAction() {
	var self = this;

	self.execute = function(context) {
		setTimeout(nnit.controller.callback("/inbound/power-on/read"), 1000);

		return "next";
	};

}

nnit.controller.addMapping(new Mapping("/inbound/power-on/timer", new LookForPowerOnAction(), {}));

function ReadPowerOnAction() {
	var self = this;

	self.execute = function(context) {
		nnit.controller.get(
			"/iotmms/v1/api/http/app.svc/T_IOT_7AE4915C16862CF47D5B?$format=json&$skip=" + skips,
			"/inbound/power-on/process");

		return "next";
	};

}

nnit.controller.addMapping(new Mapping("/inbound/power-on/read", new ReadPowerOnAction(), {}));

function ProcessPowerOnAction() {
	var self = this;

	self.execute = function(xhr) {
		var pol = JSON.parse(xhr.response).d.results;

		if (pol.length == 0) {
			return "next";
		}

		skips += pol.length;
		
		nnit.controller.pump("/power-supply/send-led", null);
		
		return "online";
	};

}

nnit.controller.addMapping(new Mapping("/inbound/power-on/process", new ProcessPowerOnAction(), { "next" : "/inbound/power-on/timer", "online" : "/power-supply/online"}));

//