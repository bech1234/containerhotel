/* globals nnit ko
*/

nnit.vm = {
	skips: {
		psOnline : 0,
		housingOnline : 0,
		neighborEvent : 0,
		nfcPayload : 0
	},
	watchers : {
		constructing : ko.observable(false),
		nextX : 0,
		nextY : 0,
	},
	housingLookup : [],
	workarea: {
		error : {
			active: ko.observable(false)
		},
		hotel:  { 
			active: ko.observable(true),
			occupied : [],
			rows: ko.observableArray([{ apartments: ko.observableArray([{type:"plugin",x:0,y:0}]) }])
		},
		container: {
			active: ko.observable(false),
			house: ko.observable(null)
		},
		picking : {
			active: ko.observable(false),
			selected : ko.observableArray([]),
			available : ko.observableArray([]),
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