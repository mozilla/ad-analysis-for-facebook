/**
 * @constant {Object} A list of message keys.
 **/
const [MSG] = (function() {

	/**
	 * @constant {Object} A list of all message keys used in the add-on.
	 **/
	const MSG = {};

	/**
	 * @constant {Object} A list of message keys from content scripts to
	 *     the background script.
	 **/
	MSG.SCANNER = {};

	/**
	 * @constant {Object} A list of message keys from the UI to the
	 *     background script.
	 **/
	MSG.UI = {};

	/**
	 * @constant {Object} A list of message keys from the background
	 *     script to the content scripts and/or UI.
	 **/
	MSG.BACKGROUND = {};

	/**
	 * @constant {Object} A list of message keys from the UI to the
	 *     background script for API access.
	 **/
	MSG.API = {};

	// From content scripts to background -----------------------------------------

	/**
	 * @constant {string} Event key to indicate the scanner has been loaded into a tab.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.SCANNER.LOADED = "scanner:loaded";

	/**
	 * @constant {string} Event key to indicate the scanner has been unloaded from a tab.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.SCANNER.UNLOADED = "scanner:unloaded";

	/**
	 * @constant {string} Event key to indicate the scanner has started a pass.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.SCANNER.STARTED_SCANNING = "scanner:startedScanning";

	/**
	 * @constant {string} Event key to indicate the scanner has finished a pass.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.SCANNER.FINISHED_SCANNING = "scanner:finishedScanning";

	/**
	 * @constant {string} Event key to indicate the scanner has retrieved a list of posts in a page.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.SCANNER.FOUND_ALL_POSTS = "scanner:foundAllPosts";

	/**
	 * @constant {string} Event key to indicate the scanner has identified a list of posts currently visible in the viewport.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.SCANNER.FOUND_VISIBLE_POSTS = "scanner:foundVisiblePosts";

	/**
	 * @constant {string} Event key to indicate the scanner has identified a list of visible posts as ads.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.SCANNER.FOUND_VISIBLE_ADS = "scanner:foundVisibleAds";

	/**
	 * @constant {string} Message key to send out a list of newly-parsed ads.
	 *     Message body contains a list of ads.
	 *     No return values.
	 **/
	MSG.SCANNER.PARSED_NEW_ADS = "scanner:parsedNewAds";

	/**
	 * @constant {string} Message key to send a list of newly-parsed ad targeting information.
	 *    Message body contains a list of ad targeting information.
	 *    No return values.
	 **/
	MSG.SCANNER.PARSED_NEW_TARGETS = "scanner:parsedNewTargets";

	/**
	 * @constant {string} Message key to retrieve monitor status.
	 *     No parameters.
	 *     Returns a boolean value.
	 **/
	MSG.SCANNER.GET_MONITOR_STATUS = "scanner:getMonitorStatus";

	// From UI to background (global) ---------------------------------------------

	/**
	 * @constant {string} Message key to retrieve monitor status.
	 *     No parameters.
	 *     Returns a boolean value.
	 **/
	MSG.UI.GET_MONITOR_STATUS = "ui:getMonitorStatus";

	/**
	 * @constant {string} Message key to retrieve a list of all ads.
	 *     No parameters.
	 *     Returns a list of ads.
	 **/
	MSG.UI.GET_ALL_ADS = "ui:getAllAds";

	/**
	 * @constant {string} Message key to retrieve a list of all targets.
	 *     No parameters.
	 *     Returns a list of targets.
	 **/
	MSG.UI.GET_ALL_TARGETS = "ui:getAllTargets";

	/**
	 * @constant {string} Message key to retreive start date.
	 *     No parameters.
	 *     Returns a date value.
	 **/
	MSG.UI.GET_START_DATE = "ui:getStartDate";

	/**
	 * @constant {string} Message key to enable monitor.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.UI.ENABLE_MONITOR = "ui:enableMonitor";

	/**
	 * @constant {string} Message key to disable monitor.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.UI.DISABLE_MONITOR = "ui:disableMonitor";

	/**
	 * @constant {string} Message key to clear all ads.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.UI.CLEAR_DATABASE = "ui:clearDatabase";

	// From UI to background (tab-specific) ---------------------------------------

	/**
	 * @constant {string} Message key to retrieve scanning status from a tab.
	 *     Message body contains the target tab id.
	 *     Returns a boolean value.
	 **/
	MSG.UI.GET_SCANNING_STATUS = "ui:getScanningStatus";

	/**
	 * @constant {string} Message key to start scanning for ads in a tab.
	 *     Message body contains the target tab id.
	 *     No return values.
	 **/
	MSG.UI.START_SCANNING = "ui:startScanning";

	// From background to content scripts -----------------------------------------

	/**
	 * @constant {string} Message key to retrieve scanning status.
	 *     No parameters.
	 *     Returns a boolean value.
	 **/
	MSG.BACKGROUND.GET_SCANNING_STATUS = "background:getScanningStatus";

	/**
	 * @constant {string} Message key to start scanning for ads.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.BACKGROUND.START_SCANNING = "background:startScanning";

	// From background to UI ------------------------------------------------------

	/**
	 * @constant {string} Event key to indicate a change in monitor status.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.BACKGROUND.MONITOR_STATUS_EVENT = "background:monitorStatusEvent";

	/**
	 * @constant {string} Event key to indicate an update in the database.
	 *     No parameters.
	 *     No return values.
	 **/
	MSG.BACKGROUND.DATABASE_EVENT = "background:databaseEvent";

	/**
	 * @constant {string} Event key to indicate a change in scanning status.
	 *     Message body contains source tab id.
	 *     No return values.
	 **/
	MSG.BACKGROUND.SCANNING_STATUS_EVENT = "background:scanningStatusEvent";

	return [MSG];
})();
