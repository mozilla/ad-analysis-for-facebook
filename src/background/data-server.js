/**
 * Server to handle message exchanges between the UI and content scripts.
 * @class
 * @requires common/messages.js
 * @requires common/monitor.js
 * @requires background/data-storage.js
 **/
const [DataServer] = (function() {
	"use strict";

	/**
	 * @constant {number} Debounce duration in milleseconds.
	 **/
	const SEND_GLOBAL_EVENTS_DEBOUNCE_DURATION = 50;

	/**
	 * https://davidwalsh.name/javascript-debounce-function
	 * @param {function} func - function to wrap with debounce
	 * @param {number} wait - debounce time in milliseconds
	 * @param {boolean} [immediate] - if true, trigger at start rather than end of debounce period
	 **/
	const debounce = function(func, wait, immediate) {
		let timeout;
		return function() {
			const context = this;
			const args = arguments;
			const later = function() {
				timeout = null;
				if (!immediate) {
					func.apply(context, args);
				}
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) {
				func.apply(context, args);
			}
		};
	};

	/**
	 * A data server to handle message exchanges between the UI and content scripts.
	 * @class
	 **/
	const DataServer = function() {
		this.monitor = new Monitor("DataServer");
		this.monitor.KEY_ENTER("DataServer");
		this.dataStorage = new DataStorage();
		this.sendMonitorStatusEvent = debounce(this.sendMonitorStatusEventImmediately, SEND_GLOBAL_EVENTS_DEBOUNCE_DURATION).bind(this);
		this.sendDatabaseEvent = debounce(this.sendDatabaseEventImmediately, SEND_GLOBAL_EVENTS_DEBOUNCE_DURATION).bind(this);
		this.listenToScannerMessages();
		this.listenToUiMessages();
		this.monitor.KEY_EXIT("DataServer");
	};

	// Incoming events from content to background ---------------------------------

	/**
	 * @listens Incoming events from the content scripts.
	 **/
	DataServer.prototype.listenToScannerMessages = function() {
		const onScannerMessages = (message, sender) => {
			this.monitor.EVENT("browser.runtime.onMessage (scanner)", {"message": message, "sender": sender});
			const key = message.key;
			const tabId = (sender && sender.tab) ? sender.tab.id : null;
			const isIncognito = (sender && sender.tab) ? sender.tab.incognito : null;

			// No operation defined.
			if (MSG.SCANNER.LOADED === key) {
				return;
			}

			// No operation defined.
			if (MSG.SCANNER.UNLOADED === key) {
				return;
			}

			// Relay scanning events to the UI.
			if (MSG.SCANNER.STARTED_SCANNING === key || MSG.SCANNER.FINISHED_SCANNING === key) {
				if (!isIncognito) {
					this.sendScanningStatusEvent(tabId);
				}
				return;
			}

			// Insert new ads into the database.
			// Fire a database update event.
			if (MSG.SCANNER.PARSED_NEW_ADS === key) {
				if (!isIncognito) {
					const newAds = message["newAds"] ? message["newAds"] : [];
					this.insertAdsIntoDatabase(newAds).then(() => {
						this.sendDatabaseEvent();
					});
				}
				return;
			}

			// Insert new ad targeting information into the database.
			// Fire a database update event.
			if (MSG.SCANNER.PARSED_NEW_TARGETS === key) {
				if (!isIncognito) {
					const newTargets = message["newTargets"] ? message["newTargets"] : [];
					this.insertTargetsIntoDatabase(newTargets).then(() => {
						this.sendDatabaseEvent();
					});
				}
				return;
			}

			// Return the current monitor status.
			if (MSG.SCANNER.GET_MONITOR_STATUS === key) {
				if (!isIncognito) {
					return this.getMonitorStatus().then(isEnabled => {
						return {
							"isEnabled": isEnabled,
						};
					});
				}
				else {
					return Promise.resolve({
						"isEnabled": false,
					});
				}
			}

			return;
		};
		this.monitor.EVENT("browser.runtime.onMessage.addListener(onScannerMessages)");
		browser.runtime.onMessage.addListener(onScannerMessages);
	};

	// Outgoing events from background to UI --------------------------------------

	/**
	 * Fire an event to notify UI of a change in monitor status.
	 **/
	DataServer.prototype.sendMonitorStatusEventImmediately = function() {
		this.monitor.ENTER("sendMonitorStatusEvent");
		const options = {
			"key": MSG.BACKGROUND.MONITOR_STATUS_EVENT,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options).then(() => {
			this.monitor.EXIT("sendMonitorStatusEvent");
		});
	};

	/**
	 * Fire an event to notify UI of an update in the database.
	 **/
	DataServer.prototype.sendDatabaseEventImmediately = function() {
		this.monitor.ENTER("sendDatabaseEvent");
		const options = {
			"key": MSG.BACKGROUND.DATABASE_EVENT,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options).then(() => {
			this.monitor.EXIT("sendDatabaseEvent");
		});
	};

	/**
	 * Fire an event to notify UI of a change in scanning status in a tab.
	 * @param {string} tabId - Source tab.
	 **/
	DataServer.prototype.sendScanningStatusEvent = function(tabId) {
		this.monitor.ENTER("sendScanningStatusEvent");
		const options = {
			"key": MSG.BACKGROUND.SCANNING_STATUS_EVENT,
			"tabId": tabId,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options).then(() => {
			this.monitor.EXIT("sendScanningStatusEvent");
		});
	};

	// Incoming messages from UI to background ------------------------------

	/**
	 * @listens Incoming data requests and actions from the UI.
	 **/
	DataServer.prototype.listenToUiMessages = function() {
		const onUiMessages = (message, sender) => {
			this.monitor.EVENT("browser.runtime.onMessage (ui)", {"message": message, "sender": sender});
			const key = message.key;
			const tabId = message.tabId;
			const isIncognito = message.isIncognito;

			// Respond to requests related to persistant data storage.
			if (MSG.UI.GET_MONITOR_STATUS === key) {
				if (!isIncognito) {
					return this.getMonitorStatus().then(isEnabled => {
						return {
							"isEnabled": isEnabled,
						};
					});
				}
				else {
					return Promise.resolve({
						"isEnabled": false,
					});
				}
			}

			// Respond to requests related to persistant data storage.
			if (MSG.UI.GET_ALL_ADS === key) {
				if (!isIncognito) {
					return this.getAllAds().then(allAds => {
						return {
							"allAds": allAds,
						};
					});
				}
				else {
					return Promise.resolve({
						"allAds": [],
					});
				}
			}

			// Respond to requests related to persistant data storage.
			if (MSG.UI.GET_ALL_TARGETS === key) {
				if (!isIncognito) {
					return this.getAllTargets().then(allTargets => {
						return {
							"allTargets": allTargets,
						};
					});
				}
				else {
					return Promise.resolve({
						"allTargets": [],
					});
				}
			}

			// Respond to requests related to persistant data storage.
			if (MSG.UI.GET_START_DATE === key) {
				if (!isIncognito) {
					return this.getStartDate().then(startDate => {
						return {
							"startDate": startDate,
						};
					});
				}
				else {
					return Promise.resolve({
						"startDate": undefined,
					});
				}
			}

			// Apply actions to persistant data storage.
			if (MSG.UI.ENABLE_MONITOR === key) {
				if (!isIncognito) {
					this.enableMonitor().then(isInitStartDate => {
						this.sendMonitorStatusEvent();
						if (isInitStartDate) {
							this.sendDatabaseEvent();
						}
					});
				}
				return;
			}

			// Apply actions to persistant data storage.
			if (MSG.UI.DISABLE_MONITOR === key) {
				if (!isIncognito) {
					this.disableMonitor().then(() => {
						this.sendMonitorStatusEvent();
					});
				}
				return;
			}

			// Apply actions to persistant data storage.
			if (MSG.UI.CLEAR_DATABASE === key) {
				if (!isIncognito) {
					this.clearDatabase().then(() => {
						this.sendDatabaseEvent();
					});
				}
				return;
			}

			// Relay data requests to the content scripts.
			// Relay responses back to the UI.
			if (MSG.UI.GET_SCANNING_STATUS === key) {
				if (!isIncognito) {
					return this.sendGetScanningStatusMessage(tabId).then(message => {
						return message;
					});
				}
				else {
					return Promise.resolve({});
				}
			}

			// Check monitor status.
			// If enabled, reply actions to the content scripts.
			if (MSG.UI.START_SCANNING === key) {
				if (!isIncognito) {
					this.getMonitorStatus().then(isEnabled => {
						if (isEnabled) {
							this.sendStartScanningMessage(tabId);
						}
					});
				}
				return;
			}

			return;
		};
		this.monitor.EVENT("browser.runtime.onMessage.addListener(onUiMessages)");
		browser.runtime.onMessage.addListener(onUiMessages);
	};

	// Messages from background to content ----------------------------------------

	/**
	 * Fire a message to retrieve scanning status from a tab.
	 * @returns {boolean} isScanning - Scanning status (on a Facebook page) or undefined otherwise.
	 **/
	DataServer.prototype.sendGetScanningStatusMessage = function(tabId) {
		return new Promise(resolve => {
			this.monitor.ENTER("sendGetScanningStatusMessage");
			browser.tabs.sendMessage(tabId, {"key": MSG.BACKGROUND.GET_SCANNING_STATUS}).then(message => {
				this.monitor.RESULTS(message);
				resolve(message);
				this.monitor.EXIT("sendGetScanningStatusMessage");
			}).catch(() => {
				resolve({});
				this.monitor.EXIT("sendGetScanningStatusMessage");
			});
		});
	};

	/**
	 * Fire a message to start scanning a page for ads.
	 **/
	DataServer.prototype.sendStartScanningMessage = function(tabId) {
		return new Promise(resolve => {
			this.monitor.ENTER("sendStartScanningMessage");
			browser.tabs.sendMessage(tabId, {"key": MSG.BACKGROUND.START_SCANNING}).then(() => {
				resolve();
				this.monitor.EXIT("sendStartScanningMessage");
			}).catch(() => {
				resolve();
				this.monitor.EXIT("sendStartScanningMessage");
			});
		});
	};

	// Database functions: Read-only by UI or scanner -----------------------------

	/**
	 * Retrieve a list of all ads in the database.
	 * @async
	 * @returns {Object[]} List of ads.
	 **/
	DataServer.prototype.getAllAds = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getAllAds");
			this.dataStorage.getAllAds().then(allAds => {
				this.monitor.RESULTS("allAds =", allAds);
				this.monitor.EXIT("getAllAds");
				resolve(allAds);
			});
		});
	};

	/**
	 * Retrieve a list of all targets in the database.
	 * @async
	 * @returns {Object[]} List of targets.
	 **/
	DataServer.prototype.getAllTargets = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getAllTargets");
			this.dataStorage.getAllTargets().then(allTargets => {
				this.monitor.RESULTS("allTargets =", allTargets);
				this.monitor.EXIT("getAllTargets");
				resolve(allTargets);
			});
		});
	};

	/**
	 * Retrieve the start date of the database.
	 * @async
	 * @returns {number} Value in milliseconds since the UNIX epoch.
	 **/
	DataServer.prototype.getStartDate = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getStartDate");
			this.dataStorage.getStartDate().then(startDate => {
				this.monitor.RESULTS("startDate =", startDate);
				this.monitor.EXIT("getStartDate");
				resolve(startDate);
			});
		});
	};

	/**
	 * Retrieve the status of the monitor.
	 * @async
	 * @returns {boolean} Flag on whether the monitor is enabled.
	 **/
	DataServer.prototype.getMonitorStatus = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getMonitorStatus");
			this.dataStorage.getDisableMonitor().then(isDisabled => {
				this.monitor.RESULTS("isDisabled =", isDisabled);
				this.monitor.EXIT("getMonitorStatus");
				// Default to disabled.
				if (isDisabled === undefined) {
					isDisabled = false;
				}
				// Enabled only if isDisabled is false.
				resolve(isDisabled === false);
			});
		});
	};

	// Database functions: Write to DB by UI --------------------------------------

	/**
	 * Clear all ads in the database.
	 * @async
	 **/
	DataServer.prototype.clearDatabase = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("clearDatabase");
			this.dataStorage.clearAllAds().then(() => {
				this.dataStorage.clearAllTargets().then(() => {
					this.dataStorage.resetStartDate().then(() => {
						this.monitor.EXIT("clearDatabase");
						resolve();
					});
				});
			});
		});
	};

	/**
	 * Enable the monitor.
	 * @async
	 **/
	DataServer.prototype.enableMonitor = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("enableMonitor");
			this.dataStorage.setDisableMonitor(false).then(() => {
				this.dataStorage.initStartDate().then(isInitStartDate => {
					this.monitor.EXIT("enableMonitor");
					resolve(isInitStartDate);
				});
			});
		});
	};

	/**
	 * Disable the monitor.
	 * @async
	 **/
	DataServer.prototype.disableMonitor = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("disableMonitor");
			this.dataStorage.setDisableMonitor(true).then(() => {
				this.monitor.EXIT("disableMonitor");
				resolve();
			});
		});
	};

	// Database functions: Write to DB by content scripts -------------------------

	/**
	 * Insert a list of ads into the database.
	 * @async
	 * @param {Object[]} ads - List of new ads.
	 **/
	DataServer.prototype.insertAdsIntoDatabase = function(ads = []) {
		return new Promise(resolve => {
			this.monitor.ENTER("insertAdsIntoDatabase");
			this.monitor.OPTIONS("ads =", ads);
			this.dataStorage.storeAds(ads).then(() => {
				this.monitor.EXIT("insertAdsIntoDatabase");
				resolve();
			});
		});
	};

	/**
	 * Insert a list of targets into the database.
	 * @async
	 * @param {Object[]} targeting - List of new targets.
	 **/
	DataServer.prototype.insertTargetsIntoDatabase = function(targets = []) {
		return new Promise(resolve => {
			this.monitor.ENTER("insertTargetsIntoDatabase");
			this.monitor.OPTIONS("targets =", targets);
			this.dataStorage.storeTargets(targets).then(() => {
				this.monitor.EXIT("insertTargetsIntoDatabase");
				resolve();
			});
		});
	};

	return [DataServer];
})();
