/* globals nnit ko
 */

function House(json) {
	var self = this;

	self.id = json.G_DEVICE;
	self.name = json.C_DEVICE;

	self.type = "house";
	self.x = nnit.vm.watchers.nextX;
	self.y = nnit.vm.watchers.nextY;

	self.classes = "house " + json.C_COLOUR;
	self.container = ko.observable();

	nnit.vm.housingLookup[self.id] = self;

	self.color = ko.observable("---");

	self.color.subscribe(nnit.controller.callback("/house/led", self));

	self.next = function (neighborEvent) {
		nnit.vm.watchers.nextX = self.x;
		nnit.vm.watchers.nextY = self.y;

		switch (neighborEvent.C_LOCATION) {
		case "top":
			nnit.vm.watchers.nextY++;
			break;

		case "right":
			nnit.vm.watchers.nextX++;
			break;
		}
		
		if (nnit.vm.workarea.hotel.occupied["x" + nnit.vm.watchers.nextX + "y" + nnit.vm.watchers.nextY]) {
			throw { error : "Duplicate neighbor event" };
		} else {
			nnit.vm.workarea.hotel.occupied["x" + nnit.vm.watchers.nextX + "y" + nnit.vm.watchers.nextY] = true;
		}
	};
}

function Container(json) {
	var self = this;

	for (var i in json) {
		self[i] = json[i];
	}

	try {
		if (json.C_PAYLOAD.length == 0) {
			throw {
				text: "no payload"
			};
		}
		var payload = JSON.parse(decodeURIComponent(json.C_PAYLOAD));
		self.payload = {
			"color": ko.observable(payload.color),
			"cargo": ko.observable(payload.cargo),
			"notes": ko.observable(payload.notes)
		};

	} catch (failure) {
		self.payload = {
			"color": ko.observable("unknown"),
			"cargo": ko.observable("Empty"),
			"notes": ko.observable("")
		};

		// nnit.controller.pump("/nfc/write", self);
	}

	self.classes = ko.observable("container " + self.payload.color());

	self.payload.color.subscribe(
		function () {
			self.classes("container " + self.payload.color());
		}
	);
}

//