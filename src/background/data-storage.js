/**
 * An interface for accessing persistent data.
 * @class
 * @requires lib/localforage.js
 * @requires common/monitor.js
 **/
const [DataStorage] = (function(){
	"use strict";

	/**
	 * Interface to store and retrieve persistent data.
	 * @class
	 **/
	const DataStorage = function() {
		this.monitor = new Monitor("DataStorage");
		this.monitor.KEY_ENTER("DataStorage");
		this.db = localforage.createInstance({"name": "fbads"});
		this.monitor.KEY_EXIT("DataStorage");
	};

	/**
	 * @constant {string} Base name for the ads table.
	 **/
	const ADS_TABLE_BASE_NAME = "ads";

	/**
	 * @constant {string} Base name for the targets table.
	 **/
	const TARGETS_TABLE_BASE_NAME = "targets";

	/**
	 * @constant {number} Version number for targeting data.
	 **/
	const TARGETING_DATA_VERSION = 1;

	/**
	 * @constant {string} Full key for the ads table.
	 **/
	const ADS_TABLE = `${ADS_TABLE_BASE_NAME}_${TARGETING_DATA_VERSION}`;

	/**
	 * @constant {string} Full key for the targets table.
	 **/
	const TARGETS_TABLE = `${TARGETS_TABLE_BASE_NAME}_${TARGETING_DATA_VERSION}`;


	/**
	 * Append a list of items into the database.
	 * Create a new list if no list exists.
	 * @async
	 * @param {string} table - One of ADS_TABLE or TARGETS_TABLE.
	 * @param {Object[]} newItems - List of new items to append.
	 **/
	DataStorage.prototype._appendList = function(table, newItems) {
		return new Promise(resolve => {
			this.monitor.ENTER("_appendList");
			this.monitor.OPTIONS("table =", table);
			this.monitor.OPTIONS("newItems =", newItems);
			this.db.getItem(table).then(results => {
				const existingItems = Array.isArray(results) ? results : [];
				const combinedItems = existingItems.concat(newItems);
				this.db.setItem(table, combinedItems).then(() => {
					this.monitor.RESULTS("combinedItems =", combinedItems);
					this.monitor.EXIT("_appendList");
					resolve();
				});
			});
		});
	};

	/**
	 * Retrieve a list of all items from a database table.
	 * Return an empty array if no list exists.
	 * @async
	 * @param {string} table - One of ADS_TABLE or TARGETS_TABLE.
	 * @returns {Object[]} List of items.
	 **/
	DataStorage.prototype._retrieveList = function(table) {
		return new Promise(resolve => {
			this.monitor.ENTER("_retrieveList");
			this.monitor.OPTIONS("table =", table);
			this.db.getItem(table).then(results => {
				const items = Array.isArray(results) ? results : [];
				this.monitor.RESULTS("items =", items);
				this.monitor.EXIT("_retrieveList");
				resolve(items);
			});
		});
	};

	/**
	 * Clear a table in the database.
	 * @async
	 * @param {string} table - One of ADS_TABLE or TARGETS_TABLE.
	 **/
	DataStorage.prototype._clearList = function(table) {
		return new Promise(resolve => {
			this.monitor.ENTER("_clearList");
			this.monitor.OPTIONS("table = ", table);
			this.db.setItem(table, []).then(() => {
				this.monitor.EXIT("_clearList");
				resolve();
			});
		});
	};

	/**
	 * Insert a list of ads into the database.
	 * @async
	 * @param {Object[]} newAds - List of all ads.
	 **/
	DataStorage.prototype.storeAds = function(newAds) {
		return new Promise(resolve => {
			this.monitor.ENTER("storeAds");
			this.monitor.OPTIONS("newAds =", newAds);
			this._appendList(ADS_TABLE, newAds).then(() => {
				this.monitor.EXIT("storeAds");
				resolve();
			});
		});
	};

	/**
	 * Retrieve a list of all ads from the database.
	 * @async
	 * @returns {Object[]} List of all ads.
	 **/
	DataStorage.prototype.getAllAds = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getAllAds");
			this._retrieveList(ADS_TABLE).then(results => {
				this.monitor.RESULTS(results);
				this.monitor.EXIT("getAllAds");
				resolve(results);
			});
		});
	};

	/**
	 * Clear all ads in the database.
	 * @async
	 **/
	DataStorage.prototype.clearAllAds = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("clearAllAds");
			this._clearList(ADS_TABLE).then(() => {
				this.monitor.EXIT("clearAllAds");
				resolve();
			});
		});
	};

	/**
	 * Insert a list of targets into the database.
	 * @async
	 * @param {Object[]} targets - List of all targets. Targets should be of form { "targetType": string, "targetValue": string|undefined }
	 **/
	DataStorage.prototype.storeTargets = function(newTargets) {
		return new Promise(resolve => {
			this.monitor.ENTER("storeTargets");
			this.monitor.OPTIONS("newTargets =", newTargets);
			this._appendList(TARGETS_TABLE, newTargets).then(() => {
				this.monitor.EXIT("storeTargets");
				resolve();
			});
		});
	};

	/**
	 * Retrieve a list of all targets from the database.
	 * @async
	 * @returns {Object[]} List of all targets.
	 **/
	DataStorage.prototype.getAllTargets = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("getAllTargets");
			this._retrieveList(TARGETS_TABLE).then(results => {
				this.monitor.RESULTS(results);
				this.monitor.EXIT("getAllTargets");
				resolve(results);
			});
		});
	};

	/**
	 * Clear all targets in the database.
	 * @async
	 **/
	DataStorage.prototype.clearAllTargets = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("clearAllTargets");
			this._clearList(TARGETS_TABLE).then(() => {
				this.monitor.EXIT("clearAllTargets");
				resolve();
			});
		});
	};

	/**
	 * @constant {string} Key for the "startDate" value.
	 **/
	const START_DATE_KEY = "startDate";

	/**
	 * @constant {string} Key for the "disableMonitor" value.
	 **/
	const DISABLE_MONITOR_KEY = "disableMonitor";

	/**
	 * @constant {string} Key for the "disallowSurveys" value.
	 **/
	const DISALLOW_SURVEYS_KEY = "disallowSurveys";

	/**
	 * Reset the start date if no value is currently set.
	 * One-time initialization when the add-on is first installed (and database first created).
	 * @async
	 **/
	DataStorage.prototype.initStartDate = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("initStartDate");
			this.getStartDate().then(value => {
				if (!value) {
					this.resetStartDate().then(() => {
						this.monitor.EXIT("initStartDate");
						resolve(true);
					});
				}
				else {
					this.monitor.EXIT("initStartDate");
					resolve(false);
				}
			});
		});
	};

	/**
	 * Set the value of a persistant variable.
	 * @async
	 * @param {string} key - Key of the variable.
	 * @param {Object} value - Value of the variable.
	 */
	DataStorage.prototype._setValue = function(key, value) {
		return new Promise(resolve => {
			this.monitor.ENTER("_setValue");
			const options = {};
			options[key] = value;
			this.monitor.OPTIONS(options);
			browser.storage.local.set(options).then(() => {
				this.monitor.EXIT("_setValue");
				resolve();
			});
		});
	};

	/**
	 * Get the value of a persistant variable.
	 * @async
	 * @param {string} key - Key of the variable.
	 * @returns {Object} Value of the variable.
	 **/
	DataStorage.prototype._getValue = function(key) {
		return new Promise(resolve => {
			this.monitor.ENTER("_getValue");
			browser.storage.local.get(key).then(results => {
				this.monitor.RESULTS(results);
				this.monitor.EXIT("_getValue");
				resolve(results[key]);
			});
		});
	};

	/**
	 * Reset the value of "startDate" to now.
	 * @async
	 **/
	DataStorage.prototype.resetStartDate = function() {
		return this._setValue(START_DATE_KEY, Date.now());
	};

	/**
	 * Get the value of "startDate".
	 * @async
	 * @return {number} Value in milliseconds since the UNIX epoch.
	 **/
	DataStorage.prototype.getStartDate = function() {
		return this._getValue(START_DATE_KEY);
	};

	/**
	 * Set the value of "disableMonitor".
	 * @async
	 * @param {boolean} isDsiabled - Flag to disable the monitor.
	 **/
	DataStorage.prototype.setDisableMonitor = function(isDisabled) {
		return this._setValue(DISABLE_MONITOR_KEY, isDisabled);
	};

	/**
	 * Get the value of "disableMonitor".
	 * @async
	 * @returns {boolean} Flag to disable to the monitor.
	 **/
	DataStorage.prototype.getDisableMonitor = function() {
		return this._getValue(DISABLE_MONITOR_KEY);
	};

	/**
	 * Set the value of "disallowSurveys".
	 * @async
	 * @param {boolean} Flag to disallow surveys.
	 **/
	DataStorage.prototype.setDisallowSurveys = function(isDisallowed) {
		return this._setValue(DISALLOW_SURVEYS_KEY, isDisallowed);
	};

	/**
	 * Get the value of "disallowSurveys".
	 * @async
	 * @returns {boolean} Flag to disallow surveys.
	 **/
	DataStorage.prototype.getDisallowSurveys = function() {
		return this._getValue(DISALLOW_SURVEYS_KEY);
	};

	return [DataStorage];
})();
