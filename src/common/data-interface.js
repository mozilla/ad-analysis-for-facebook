/**
 * Data interface for UI elements
 * @class
 * @requires common/messages.js
 * @requires common/monitor.js
 **/
const [DataInterface] = (function() {
	"use strict";

	/**
	 * Single object that manages how UI elements interact with content scripts and persistant data.
	 * Converts all message passing into asynchronous function calls (outgoing) and listeners (incoming).
	 * @class
	 **/
	const DataInterface = function() {
		this.monitor = new Monitor("DataInterface");
		this.monitor.KEY_ENTER("DataInterface");
		this.listeners = {};
		this.isIncognitoWindow = null;
		this.listenToBackgroundMessages();
		this.monitor.KEY_EXIT("DataInterface");
	};

	/**
	 * Send a message to background.
	 * @async
	 * @private
	 * @param {string} key - Message key
	 * @param {number} tabId - Active tab ID
	 * @param {boolean} isIncognito - Private browsing mode of the current window
	 * @param {Object} [extraFields] - Optional map of additional fields to add to message
	 * @returns {Object} Response if any
	 **/
	DataInterface.prototype._sendMessage = function(key, tabId = null, options = {}) {
		return new Promise(resolve => {
			const msg = {
				"key": key,
				"tabId": tabId,
				"isIncognito": this.isIncognitoWindow,
				"options": options,
			};
			browser.runtime.sendMessage(msg).then(results => {
				resolve(results);
			});
		});
	};

	/**
	 * Retrieve the status of the monitor.
	 * @async
	 * @returns {boolean} Flag on whether the monitor is enabled.
	 **/
	DataInterface.prototype.getMonitorStatus = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getMonitorStatus");
			this._sendMessage(MSG.UI.GET_MONITOR_STATUS).then(results => {
				this.monitor.RESULTS(results);
				this.monitor.EXIT("getMonitorStatus");
				resolve(results);
			});
		});
	};

	/**
	 * Retrieve a list of all ads in the database.
	 * @async
	 * @returns {Object[]} List of ads.
	 **/
	DataInterface.prototype.getAllAds = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getAllAds");
			this._sendMessage(MSG.UI.GET_ALL_ADS).then(results => {
				this.monitor.RESULTS(results);
				this.monitor.EXIT("getAllAds");
				resolve(results);
			});
		});
	};

	/**
	 * Retrieve a list of all targets in the database.
	 * @async
	 * @returns {Object[]} List of targets.
	 **/
	DataInterface.prototype.getAllTargets = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getAllTargets");
			this._sendMessage(MSG.UI.GET_ALL_TARGETS).then(results => {
				this.monitor.RESULTS(results);
				this.monitor.EXIT("getAllTargets");
				resolve(results);
			});
		});
	};

	/**
	 * @constant {number} Default number of target types to generate.
	 **/
	const DEFAULT_TARGET_TYPE_LIMIT = 5;

	/**
	 * @constant {number} Default number of target values to generate.
	 **/
	const DEFAULT_TARGET_VALUE_LIMIT = 5;

	/**
	 * @constant {number} Default number of days used to define "recency window".
	 **/
	const DEFAULT_RECENT_DAYS = 7;

	/**
	 * @constant {Object} Description for 'age' targeting type.
	 **/
	const TARGET_AGE = {
		"key": "Age",
		"label": "Age",
		"hasValues": true,
	};

	/**
	 * @constant {Object} Description for 'gender' targeting type.
	 **/
	const TARGET_GENDER = {
		"key": "Gender",
		"label": "Gender",
		"hasValues": true,
	};

	/**
	 * @constant {Object} Description for 'region', 'city', or 'state' targeting type.
	 **/
	const TARGET_LOCATION = {
		"key": "Location",
		"label": "Locations",
		"hasValues": true,
	};

	/**
	 * @constant {Object} Description for 'retargeting' targeting type.
	 **/
	const TARGET_RETARGETING = {
		"key": "Retargeting",
		"label": "Similarity to an audience profile",
		"hasValues": false,
	};

	/**
	 * @constant {Object} Description for 'interest' targeting type.
	 **/
	const TARGET_INTEREST = {
		"key": "Interest",
		"label": "Interests",
		"hasValues": true,
	};

	/**
	 * @constant {Object} Description for 'segment' targeting type.
	 **/
	const TARGET_SEGMENT = {
		"key": "Segment",
		"label": "Advertiser categories",
		"hasValues": true,
	};

	/**
	 * @constant {Object} Description for 'lanuage' targeting type.
	 **/
	const TARGET_LANGUAGE = {
		"key": "Language",
		"label": "Languages",
		"hasValues": true,
	};

	/**
	 * @constant {Object} Description for 'like' targeting type.
	 **/
	const TARGET_LIKE = {
		"key": "Like",
		"label": "Activities on Facebook",
		"hasValues": false,
	};

	/**
	 * @constant {Object} Description for 'list' targeting type.
	 **/
	const TARGET_LIST = {
		"key": "List",
		"label": "Inclusion in a contact list",
		"hasValues": false,
	};

	/**
	 * @constant {Object} Description for 'website' targeting type.
	 **/
	const TARGET_WEBSITE = {
		"key": "Website",
		"label": "Browsing history or app usage",
		"hasValues": false,
	};

	/**
	 * @constant {Object} Description for 'agency' targeting type.
	 **/
	const TARGET_AGENCY = {
		"key": "Agency",
		"label": "Data provided by external agencies",
		"hasValues": true,
	};

	/**
	 * @constant {Object} Description other unknown targeting type.
	 **/
	const TARGET_UNKNOWN = {
		"key": "Unknown",
		"label": "Unseen reason",
		"hasValues": false,
	};

	/**
	 * @constant {Set} A list of target types with interpretable values.
	 **/
	const VALUE_WHITELIST = new Set([
		"Segment",
		"Interest",
	]);

	/**
	 * Sanitize target types
	 * @param {string} targetType - Targeting type generated by parser.
	 * @returns {string|null} Sanitized targeting type or null if no match is found.
	 **/
	const sanitizeTargetType = (targetType) => {
		if (targetType === "Age") {
			return TARGET_AGE;
		}
		if (targetType === "Gender") {
			return TARGET_GENDER;
		}
		if (targetType === "Region" || targetType === "City" || targetType === "State") {
			return TARGET_LOCATION;
		}
		if (targetType === "Retargeting") {
			return TARGET_RETARGETING;
		}
		if (targetType === "Interest") {
			return TARGET_INTEREST;
		}
		if (targetType === "Segment") {
			return TARGET_SEGMENT;
		}
		if (targetType === "Language") {
			return TARGET_LANGUAGE;
		}
		if (targetType === "Like") {
			return TARGET_LIKE;
		}
		if (targetType === "List") {
			return TARGET_LIST;
		}
		if (targetType === "Website") {
			return TARGET_WEBSITE;
		}
		if (targetType === "Agency") {
			return TARGET_AGENCY;
		}
		return TARGET_UNKNOWN;
	};

	const sanitizeTargetValue = (targetValue) => {
		if (targetValue && targetValue.length >= 1) {
			if (targetValue.substring(targetValue.length - 1, targetValue.length) === ".") {
				return targetValue.substring(0, targetValue.length - 1);
			}
		}
		return targetValue;
	};

	DataInterface.prototype.getAllTargetTypes = function() {
		return [
			TARGET_AGE,
			TARGET_GENDER,
			TARGET_LOCATION,
			TARGET_RETARGETING,
			TARGET_INTEREST,
			TARGET_SEGMENT,
			TARGET_LANGUAGE,
			TARGET_LIKE,
			TARGET_LIST,
			TARGET_WEBSITE,
			TARGET_AGENCY,
		];
	};

	DataInterface.prototype.computePublicTargetStats = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("computePublicTargetStats");
			fetch("fbpac-targets.json").then(response => {
				return response.json();
			}).then(json => {
				this.monitor.RESULTS(json);
				this.monitor.EXIT("computePublicTargetStats");
				resolve(json);
			});
		});
	};

	DataInterface.prototype.computeYourTargetStats = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("computeYourTargetStats");
			this.getAllAds().then(results => {
				const allAds = results.allAds;
				const allStats = {};
				this.getAllTargetTypes().forEach(sectionTargetType => {
					const allTargetValueList = [];
					const allTargetValueSet = new Set();
					allAds.forEach(singleAd => {
						if (singleAd.targets) {
							const targetValueSet = new Set();
							let targetCityValue = null;
							let targetStateValue = null;
							singleAd.targets.forEach(d => {
								const targetType = sanitizeTargetType(d.target);
								if (targetType.key === sectionTargetType.key) {
									const targetValue = sanitizeTargetValue(d.segment);
									if (targetValue !== undefined) {
										if (d.target === "City") {
											targetCityValue = targetValue;
										}
										else if (d.target === "State") {
											targetStateValue = targetValue;
										}
										else {
											targetValueSet.add(targetValue);
										}
									}
								}
							});
							if (targetCityValue !== null && targetStateValue !== null) {
								targetValueSet.add(`${targetCityValue}, ${targetStateValue}`);
							}
							else {
								if (targetCityValue !== null) {
									targetValueSet.add(targetCityValue);
								}
								if (targetStateValue !== null) {
									targetValueSet.add(targetStateValue);
								}
							}
							if (targetValueSet.size > 0) {
								allTargetValueList.push(targetValueSet);
								targetValueSet.forEach(d => allTargetValueSet.add(d));
							}
						}
					});
					const stats = {
						"adCount": allAds.length,
						"typeCount": allTargetValueList.length,
						"targetValues": Array.from(allTargetValueSet).sort(),
					};
					allStats[sectionTargetType.key] = stats;
				});
				this.monitor.RESULTS(allStats);
				this.monitor.EXIT("computeYourTargetStats");
				resolve(allStats);
			});
		});
	};

	DataInterface.prototype.computeTopAdvertisersIndex = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("computeTopAdvertisersIndex");
			fetch("tables/index.json").then(response => {
				return response.json();
			}).then(json => {
				this.monitor.RESULTS(json);
				this.monitor.EXIT("computeTopAdvertisersIndex");
				resolve(json);
			});
		});
	};

	DataInterface.prototype.computeTopAdvertisersTable = function(key) {
		return new Promise(resolve => {
			this.monitor.ENTER("computeTopAdvertisersTable");
			fetch(`tables/${key}.tsv`).then(response => {
				return response.text();
			}).then(text => {
				const data = text.split("\n").filter(row => row.length > 0).map(row => row.split("\t"));
				this.monitor.RESULTS(data);
				this.monitor.EXIT("computeTopAdvertisersTable");
				resolve(data);
			});
		});
	};

	/**
	 * Get a list of common target types, frequent target values, recent target values, and remaining target types.
	 * @async
	 * @param {number} topTargetTypeLimit - Number of common target types to return.
	 * @param {number} frequentTargetValueLimit - Number of frequent target values to return.
	 * @param {number} recentTargetValueLimit - Number of recent target values to return.
	 * @param {number} recentDays - Size of "recency" window in number of days.
	 * @returns {Object[]} commonTargetTypes - List of top target types.
	 * @returns {number} remainingTargetTypes - Number of remaining target types.
	 * @returns {Object[]} frequentTargetValues - List of frequent target values.
	 * @returns {Object[]} recentTargetValues - List of recent target values.
	 **/
	DataInterface.prototype.computeDoorHangerStats = function(topTargetTypeLimit = DEFAULT_TARGET_TYPE_LIMIT, frequentTargetValueLimit = DEFAULT_TARGET_VALUE_LIMIT, recentTargetValueLimit = DEFAULT_TARGET_VALUE_LIMIT, recentDays = DEFAULT_RECENT_DAYS) {

		/**
		 * Comparator for sorting a list of targets by frequency (most frequent ones first).
		 * @inner
		 * @param {Object} a - First target.
		 * @param {Object} b - Second target.
		 * @returns {number} Ordering criteria: <0, 0, or >0.
		 **/
		const descendingCountSorter = (a, b) => {
			return b.count - a.count;
		};

		/**
		 * Create a lookup table of item and item counts, from a list of item sets.
		 * @param {Set[]} targetTypeList - A list of target types.
		 * @returns {Object} Target types, their label, description, and corresponding frequency.
		 **/
		const getTargetTypeLookup = (targetTypeList) => {
			const targetTypeLookup = {};
			targetTypeList.forEach(targetTypeSet => {
				targetTypeSet.forEach(targetType => {
					const key = targetType.key;
					if (!(key in targetTypeLookup)) {
						targetTypeLookup[key] = targetType;
						targetTypeLookup[key].count = 0;
					}
					targetTypeLookup[key].count++;
				});
			});
			return targetTypeLookup;
		};

		/**
		 * Create a lookup table of item and item counts, from a list of item sets.
		 * @param {Set[]} targetTypeList - A list of target types.
		 * @returns {Object} Target types and their corresponding frequency.
		 **/
		const getTargetValueLookup = (targetValueList) => {
			const targetValueLookup = {};
			targetValueList.forEach(targetValueSet => {
				targetValueSet.forEach(key => {
					if (!(key in targetValueLookup)) {
						targetValueLookup[key] = {
							"key": key,
							"count": 0,
						};
					}
					targetValueLookup[key].count++;
				});
			});
			return targetValueLookup;
		};

		/**
		 * Create a list of most freqeunt items from a lookup table.
		 * @param {Object} lookup - Items and their corresponding frequency as field 'count'.
		 * @param {number} limit - Number of top items to retrieve.
		 * @return {Object[]} A list of the most frequent items.
		 **/
		const getTopItems = (targetTypeLookup, limit) => {
			const targetTypeList = Object.values(targetTypeLookup).sort(descendingCountSorter);
			return targetTypeList.slice(0, limit);
		};

		/**
		 * Create a list of least frequent items from a lookup table.
		 * @param {Object} lookup - Items and their corresponding frequency as field 'count'.
		 * @param {number} limit - Number of top items to retrieve.
		 * @return {Object[]} A list of the least frequent items.
		 **/
		const getRemainingItems = (targetTypeLookup, limit) => {
			const targetTypeList = Object.values(targetTypeLookup).sort(descendingCountSorter);
			return targetTypeList.slice(limit);
		};

		return new Promise(resolve => {
			this.monitor.ENTER("computeDoorHangerStats");
			this.getAllAds().then(results => {
				const allAds = results.allAds;
				const allTargetTypeList = [];
				const allTargetValueList = [];
				const recentTargetValueList = [];
				const recentTimestampThreshold = Date.now() - (1000 * 60 * 60 * 24 * recentDays);
				allAds.forEach(singleAd => {
					const adTimestamp = singleAd.timestamp;
					if (singleAd.targets) {
						const targetTypeSet = new Set();
						const targetValueSet = new Set();
						let targetCityValue = null;
						let targetStateValue = null;
						singleAd.targets.forEach(d => {
							const targetType = sanitizeTargetType(d.target);
							if (targetType.key !== TARGET_UNKNOWN.key) {
								targetTypeSet.add(targetType);
							}
							if (VALUE_WHITELIST.has(targetType.key)) {
								const targetValue = sanitizeTargetValue(d.segment);
								if (targetValue !== undefined) {
									if (d.target === "City") {
										targetCityValue = targetValue;
									}
									else if (d.target === "State") {
										targetStateValue = targetValue;
									}
									else {
										targetValueSet.add(targetValue);
									}
								}
							}
						});
						if (targetCityValue !== null && targetStateValue !== null) {
							targetValueSet.add(`${targetCityValue}, ${targetStateValue}`);
						}
						else {
							if (targetCityValue !== null) {
								targetValueSet.add(targetCityValue);
							}
							if (targetStateValue !== null) {
								targetValueSet.add(targetStateValue);
							}
						}
						allTargetTypeList.push(targetTypeSet);
						allTargetValueList.push(targetValueSet);
						if (adTimestamp >= recentTimestampThreshold) {
							recentTargetValueList.push(targetValueSet);
						}
					}
				});
				this.monitor.DATA({
					"allTargetTypeList": allTargetTypeList,
					"allTargetValueList": allTargetValueList,
					"recentTargetValueList": recentTargetValueList,
				});
				const targetTypeLookup = getTargetTypeLookup(allTargetTypeList);
				const topTargetTypes = getTopItems(targetTypeLookup, topTargetTypeLimit);
				const remainingTargetTypes = getRemainingItems(targetTypeLookup, topTargetTypeLimit);

				const frequentTargetValueLookup = getTargetValueLookup(allTargetValueList);
				const frequentTargetValues = getTopItems(frequentTargetValueLookup, frequentTargetValueLimit);

				const recentTargetValueLookup = getTargetValueLookup(recentTargetValueList);
				const recentTargetValues = getTopItems(recentTargetValueLookup, recentTargetValueLimit);
				const stats = {
					"adCount": allAds.length,
					"topTargetTypes": topTargetTypes,
					"remainingTargetTypes": remainingTargetTypes,
					"frequentTargetValues": frequentTargetValues,
					"recentTargetValues": recentTargetValues,
				};
				this.monitor.RESULTS(stats);
				this.monitor.EXIT("computeDoorHangerStats");
				resolve(stats);
			});
		});
	};

	/**
	 * Start the monitor.
	 * @async
	 **/
	DataInterface.prototype.enableMonitor = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("enableMonitor");
			this._sendMessage(MSG.UI.ENABLE_MONITOR).then(() => {
				this.monitor.EXIT("enableMonitor");
				resolve();
			});
		});
	};

	/**
	 * Stop the monitor.
	 * @async
	 **/
	DataInterface.prototype.disableMonitor = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("disableMonitor");
			this._sendMessage(MSG.UI.DISABLE_MONITOR).then(() => {
				this.monitor.EXIT("disableMonitor");
				resolve();
			});
		});
	};

	/**
	 * Clear all ads in the database.
	 * @async
	 **/
	DataInterface.prototype.clearDatabase = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("clearDatabase");
			this._sendMessage(MSG.UI.CLEAR_DATABASE).then(() => {
				this.monitor.EXIT("clearDatabase");
				resolve();
			});
		});
	};

	/**
	 * Check whether scanner is currently running in a tab.
	 * @async
	 * @param {number} tabId - Active tab.
	 * @returns {boolean} Status of the scanner.
	 **/
	DataInterface.prototype.getScanningStatus = function(tabId) {
		return new Promise(resolve => {
			this.monitor.ENTER("getScanningStatus");
			this._sendMessage(MSG.UI.GET_SCANNING_STATUS, tabId).then(results => {
				this.monitor.RESULTS(results);
				this.monitor.EXIT("getScanningStatus");
				resolve(results);
			});
		});
	};

	/**
	 * Initiate a full scan for ads in a tab.
	 * @async
	 * @param {number} tabId - Active tab.
	 **/
	DataInterface.prototype.startScanning = function(tabId) {
		return new Promise(resolve => {
			this.monitor.ENTER("startScanning");
			this._sendMessage(MSG.UI.START_SCANNING, tabId).then(() => {
				this.monitor.EXIT("startScanning");
				resolve();
			});
		});
	};

	/**
	 * Attach a listener to listeners.
	 * @param {string} key - Listener key.
	 * @param {function} listener - Listener.
	 * @param {Object} listeners - List of listeners.
	 **/
	const addListener = function(key, listener, listeners) {
		listeners[key] = listener;
	};

	/**
	 * Attach a listener for monitor status changes.
	 * @param {function} listener - Listener function.
	 **/
	DataInterface.prototype.onMonitorStatusEvents = function(listener) {
		addListener(MSG.BACKGROUND.MONITOR_STATUS_EVENT, listener, this.listeners);
	};

	/**
	 * Attach a listener for database updates.
	 * @param {function} listener - Listener function.
	 **/
	DataInterface.prototype.onDatabaseEvents = function(listener) {
		addListener(MSG.BACKGROUND.DATABASE_EVENT, listener, this.listeners);
	};

	/**
	 * Attach a listener for scanning status changes.
	 * @param {function} listener - Listener function.
	 **/
	DataInterface.prototype.onScanningStatusEvents = function(listener) {
		addListener(MSG.BACKGROUND.SCANNING_STATUS_EVENT, listener, this.listeners);
	};

	/**
	 * Check if the current script is running inside of a private-browswing window.
	 * @return {boolean} True for incognito windows.
	 **/
	DataInterface.prototype.isIncognito = function() {
		return new Promise(resolve => {
			browser.windows.getCurrent().then(currentWindow => {
				resolve(currentWindow.incognito);
			});
		});
	};

	/**
	 * Listen to background messages
	 * @private
	 **/
	DataInterface.prototype.listenToBackgroundMessages = function() {
		const ALL_EVENT_KEYS = [
			MSG.BACKGROUND.MONITOR_STATUS_EVENT,
			MSG.BACKGROUND.DATABASE_EVENT,
			MSG.BACKGROUND.SCANNING_STATUS_EVENT,
		];
		const onBackgroundMessages = (message, sender) => {
			this.monitor.EVENT("browser.runtime.onMessage (background)", {"message": message, "sender": sender});
			const key = message.key;
			ALL_EVENT_KEYS.forEach(eventKey => {
				if (eventKey === key) {
					const eventListener = this.listeners[eventKey];
					if (eventListener) {
						eventListener(message);
					}
				}
			});
			return true;
		};
		this.isIncognito().then(isIncognito => {
			this.isIncognitoWindow = isIncognito;
			this.monitor.DATA("isIncognitoWindow = ", this.isIncognitoWindow);
			this.monitor.EVENT("browser.runtime.onMessage.addListener(onBackgroundMessages)");
			browser.runtime.onMessage.addListener(onBackgroundMessages);
		});
	};

	return [DataInterface];
})();
