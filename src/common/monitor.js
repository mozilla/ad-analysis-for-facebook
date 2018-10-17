const Monitor = (function() {
	const defaultFlags = {
		"*": true,
		"key_enter": true,
		"key_exit": true,
		"enter": true,
		"exit": true,
		"event": true,
		"options": true,
		"results": true,
		"data": true,
		"assert": true,
	};
	const overrideFlags = {
//		"*": false, // Uncomment (i.e., set to false) to suppress all output.
	};

	// Suppress all output if IS_PRODUCTION is true.
	if (typeof IS_PRODUCTION !== "undefined") {
		if (IS_PRODUCTION) {
			overrideFlags["*"] = false;
		}
	}

	const display = (flags, key, label, moduleLabel) => {
		if (flags["*"] && flags[key]) {
			return (message, obj) => {
				if (typeof obj !== "undefined") {
					console.log(`[${moduleLabel}]`, `[${label}]`, message, obj);
				}
				else {
					console.log(`[${moduleLabel}]`, `[${label}]`, message);
				}
			};
		}
		else {
			return () => {};
		}
	};

	const warning = (flags, key, moduleLabel) => {
		if (flags["*"] && flags[key]) {
			return (assert_expression, message, obj) => {
				if (!assert_expression) {
					if (typeof obj !== "undefined") {
						console.log(`[${moduleLabel}]`, "!!! WARNING !!!", message, obj);
					}
					else {
						console.log(`[${moduleLabel}]`, "!!! WARNING !!!", message);
					}
				}
			};
		}
		else {
			return () => {};
		}
	};

	const isProduction = (flags) => {
		return () => {
			return !flags["*"];
		};
	};

	const Monitor = function(moduleLabel, optFlags = {}) {
		this.flags = Object.assign({}, defaultFlags, optFlags, overrideFlags);
		this.KEY_ENTER = display(this.flags, "key_enter", "ENTER", moduleLabel);
		this.KEY_EXIT = display(this.flags, "key_exit", "EXIT", moduleLabel);
		this.ENTER = display(this.flags, "enter", "enter >>>>", moduleLabel);
		this.EXIT = display(this.flags, "exit", "<<<< exit", moduleLabel);
		this.EVENT = display(this.flags, "event", "event", moduleLabel);
		this.OPTIONS = display(this.flags, "options", "options >", moduleLabel);
		this.RESULTS = display(this.flags, "results", "< results", moduleLabel);
		this.DATA = display(this.flags, "data", "data", moduleLabel);
		this.ASSERT = warning(this.flags, "assert", moduleLabel);
		this.IS_PRODUCTION = isProduction(this.flags);
	};

	return Monitor;
})();
