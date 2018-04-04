/* globals nnit ko
*/

nnit.vm = {
	active : true,
	workarea: {
		error : {
			active: ko.observable(false)
		},
		connectPowerSupply:  { 
			active: ko.observable(false)
		},
		ledControl : {
			active: ko.observable(false),
			led0: ko.observable("off"),
			led1: ko.observable("off"),
			led2: ko.observable("off"),
			led3: ko.observable("off"),
			led4: ko.observable("off"),
			led5: ko.observable("off"),
			led6: ko.observable("off"),
			led7: ko.observable("off")
		},
		set : function (wa) {
			for (var i in nnit.vm.workarea) {
				if (nnit.vm.workarea[i].active) {
					nnit.vm.workarea[i].active(wa === i);
				}
			}
		}

	}
};