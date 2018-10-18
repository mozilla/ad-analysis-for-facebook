const [AppDoorHanger] = (function() {
	"use strict";

	const MAX_BAR_WIDTH = 250;

	const TOP_TARGET_TYPES = 5;
	const FREQUENT_TARGET_VALUES = 5;
	const RECENT_TARGET_VALUES = 5;
	const RECENT_DAYS = 7;

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
	 * @constant {number} Slide animation duration in milleseconds.
	 **/
	const SLIDE_TRANSITION_DURATION = 160;

	/**
	 * @constant {number} Delay before slide animation in milleseconds.
	 **/
	const SLIDE_DEBOUNCE_DURATION = 50;

	/**
	 * @constant {number} Delay before resizing in milleseconds.
	 **/
	const RESIZE_DEBOUNCE_DURATION = 50;

	/**
	 * Class to handle user interactions, data processing, and rendering.
	 * @class
	 **/
	const AppDoorHanger = function() {
		this.monitor = new Monitor("AppDoorHanger");
		this.monitor.KEY_ENTER("AppDoorHanger");
		this.dataInterface = new DataInterface();
		this.settings = {};
		this.clearAdsRowSettings = {};
		this.stats = {};
		this.slideIndex = 0;
		this.resizeHeight = debounce(this.resizeHeightImmediately, RESIZE_DEBOUNCE_DURATION).bind(this);
		this.slidePanel = debounce(this.slidePanelImmediately, SLIDE_DEBOUNCE_DURATION).bind(this);
		this.monitor.KEY_EXIT("AppDoorHanger");
	};

	// App and user actions --------------------------------------------------------

	/**
	 * Slide the content of the door hanger horizontally to another panel.
	 * @param {number} index - Index of the destination panel either 0 or 1.
	 **/
	AppDoorHanger.prototype.slidePanelImmediately = function(index = 0) {
		this.monitor.ENTER("slidePanel");
		this.slideIndex = index;
		d3.selectAll(".panel").style("height", 0);
		d3.selectAll(`.panel${this.slideIndex}`).style("height", null);
		this.resizeHeight();
		d3.select("#Slide")
			.transition()
			.duration(SLIDE_TRANSITION_DURATION)
			.style("left", (-this.slideIndex * 320) + "px");
		this.monitor.EXIT("slidePanel");
	};

	/**
	 * Resize the height of the door hanger to fit the current panel.
	 * Additional calculation is requried to
	 *   (a) Avoid a sub-pixel (<1px in height) white line at the bottom of the door hanger.
	 *   (b) Prevent the vertical scroll bar from showing up because door hanger content is <1px taller than the door hanger dimension.
	 **/
	AppDoorHanger.prototype.resizeHeightImmediately = function() {
		this.monitor.ENTER("resizeHeight");
		const bodyHeight = Math.ceil(d3.select(`.panel${this.slideIndex}`).node().getBoundingClientRect().height);
		d3.select("html").style("height", `${bodyHeight}px`);
		d3.select("body").style("height", `${bodyHeight}px`);
		this.monitor.EXIT("resizeHeight");
	};

	/**
	 * Toggle the monitor status.
	 **/
	AppDoorHanger.prototype.clickMonitorStatus = function() {
		this.monitor.ENTER("clickMonitorStatus");
		if (this.settings.isEnabled === false) {
			this.dataInterface.enableMonitor();
		}
		else {
			this.dataInterface.disableMonitor();
		}
		this.monitor.EXIT("clickMonitorStatus");
	};

	/**
	 * Clear the local database.
	 **/
	AppDoorHanger.prototype.clearDatabase = function() {
		this.monitor.ENTER("clearDatabase");
		this.dataInterface.clearDatabase().then(() => {
			this.monitor.EXIT("clearDatabase");
		});
	};

	// Listeners -------------------------------------------------------------------

	/**
	 * Attach listeners to UI elements that can trigger any of the above actions.
	 **/
	AppDoorHanger.prototype.initClickActions = function() {
		const onMouseOverEvent = () => {
			d3.select(d3.event.target).classed("hover", true);
		};
		const onMouseOutEvent = () => {
			d3.select(d3.event.target).classed("hover", false);
		};
		d3.selectAll(".actionSlide0").on("click", () => { this.slidePanel(0); });
		d3.selectAll(".actionSlide1").on("click", () => { this.slidePanel(1); });
		d3.selectAll(".actionToggleMonitor").on("click", this.clickMonitorStatus.bind(this));
		d3.selectAll(".actionClearDatabase").on("click", this.clearDatabase.bind(this));
		d3.selectAll(".action")
			.on("mouseover", onMouseOverEvent)
			.on("mouseout", onMouseOutEvent);
	};

	// Renderers -------------------------------------------------------------------

	/**
	 * Update all UI elements that display the monitor status including the
	 * monitor status toggle, the word "ON" and "OFF", and whether select UI
	 * elements are active or dimmed.
	 **/
	AppDoorHanger.prototype.renderMonitorStatus = function() {
		this.dataInterface.isIncognito().then(isIncognito => {
			const isEnabled = this.settings.isEnabled && !isIncognito;
			const toggle = d3.selectAll(".actionToggleMonitor");
			toggle.style("cursor", isIncognito ? "not-allowed" : null);
			if (isIncognito) {
				toggle.on("click", () => {});
			}
			toggle.selectAll(".slider").style("cursor", isIncognito ? "not-allowed" : null);
			toggle.selectAll("input").classed("isChecked", isEnabled);
			const firstPanel = d3.select("#FirstPanel");
			firstPanel.select(".topVisibleRows")
				.style("border-bottom", isIncognito ? "none" : null);
			firstPanel.select(".dimmedOnDisableRows")
				.style("display", isIncognito ? "none" : "block")
				.selectAll(".row")
					.classed("dimmed", !isEnabled);
			firstPanel.select(".incognitoRow")
				.style("display", isIncognito ? "block" : "none");
			this._renderClearAdsRow({"isIncognito": isIncognito});
			this.resizeHeight();
		});
	};

	AppDoorHanger.prototype._renderClearAdsRow = function(clearAdsRowSettings) {
		this.clearAdsRowSettings = Object.assign(this.clearAdsRowSettings, clearAdsRowSettings);

		const firstPanel = d3.select("#FirstPanel");
		if (this.clearAdsRowSettings.isIncognito || this.clearAdsRowSettings.isNoAdsCollected) {
			firstPanel.select(".clearAdsRow").style("display", "none");
		}
		else {
			firstPanel.select(".clearAdsRow").style("display", "block");
		}
	};

	/**
	 * Update all UI elements that display the content of the database
	 * including the number of ads, top target types, and recent target values.
	 **/
	AppDoorHanger.prototype.renderDatabaseStats = function() {
		const adCount = this.stats.adCount;

		/**
		 * Display the "no ads examined" message if the add-on has been turned on but no ads have been collected.
		 * Hide all rows without data.
		 **/
		const renderNoAdsCollected = () => {
			const isNoAdsCollected = (adCount === 0);
			this.monitor.DATA("isNoAdsCollected =", isNoAdsCollected);
			const firstPanel = d3.select("#FirstPanel");
			firstPanel.selectAll(".stats").style("display", !isNoAdsCollected ? "block" : "none");
			firstPanel.selectAll(".noStats").style("display", isNoAdsCollected ? "block" : "none");
			this._renderClearAdsRow({"isNoAdsCollected": isNoAdsCollected});
		};

		/**
		 * Display the number of ads in the database as a string in all .numDatabaseAdCount elements.
		 * @inner
		 **/
		const renderAdCount = () => {
			this.monitor.DATA("adCount =", adCount);
			d3.selectAll(".numDatabaseAdCount").text(adCount);
			d3.selectAll(".strAdCollected").style("display", adCount === 1 ? null : "none");
			d3.selectAll(".strAdsCollected").style("display", adCount !== 1 ? null : "none");
		};

		/**
		 * Display recent ad target values in #RecentTargetValues.
		 * @inner
		 **/
		const renderRecentTargetValues = () => {
			const renderTargetValue = (elem) => {
				elem.text(d => d.key);
			};
			const data = this.stats.recentTargetValues;
			d3.select("#RecentTargetValuesRow").style("display", data.length === 0 ? "none" : "block");
			const elem = d3.select("#RecentTargetValues").selectAll("div.targetValue").data(data);
			elem.exit()
				.remove();
			elem.enter()
				.append("div")
				.attr("class", "targetValue")
			.merge(elem)
				.call(renderTargetValue);
		};

		/**
		 * Display top target types in #TopTargetTypes.
		 * @inner
		 **/
		const renderTopTargetTypes = () => {
			const barWidth = (d) => {
				const ratio = Math.min(1.0, Math.max(0.0, d.count / maxCount));
				const width = ratio * MAX_BAR_WIDTH;
				return `${width}px`;
			};
			const renderTargetType = (elem) => {
				elem.selectAll("*").remove();
				const firstRow = elem.append("div").attr("class", "firstRow");
				const secondRow = elem.append("div").attr("class", "secondRow");
				firstRow.append("span")
					.attr("class", "label")
					.text(d => d.label);
				firstRow.append("span")
					.text(" ");
				firstRow.append("span")
					.attr("class", "count")
					.text(d => d.count === 1 ? "(1 time)" : `(${d.count} times)`);
				secondRow.append("span")
					.attr("class", "bar")
					.style("width", barWidth);
			};

			const data = this.stats.topTargetTypes;
			const maxCount = data.reduce((maxValue, d) => Math.max(maxValue, d.count), 0);
			d3.select("#TargetTypesRow").style("display", data.length === 0 ? "none" : "block");
			const elem = d3.select("#TopTargetTypes").selectAll("div.targetType").data(data);
			elem.exit()
				.remove();
			elem.enter()
				.append("div")
				.attr("class", "targetType")
			.merge(elem)
				.call(renderTargetType);
		};

		/**
		 * Display the number of target types not shown above as a string in #RemainingTargetTypes.
		 * @inner
		 **/
		const renderRemainingTargetTypes = () => {
			const data = this.stats.remainingTargetTypes;
			const remainingDataCount = data.length;
			d3.select("#RemainingTargetTypes").style("display", remainingDataCount === 0 ? "none" : "block");
			d3.selectAll(".strPlusNOtherCategories").text(`Plus ${remainingDataCount} other types of data`);
		};

		this.monitor.ENTER("renderDatabaseStats");
		renderNoAdsCollected();
		renderAdCount();
		renderRecentTargetValues();
		renderTopTargetTypes();
		renderRemainingTargetTypes();
		this.slidePanel(0);
		this.monitor.EXIT("renderDatabaseStats");
	};

	// Listeners -------------------------------------------------------------------

	/**
	 * Refersh UI to show changes in monitor status.
	 **/
	AppDoorHanger.prototype.onMonitorStatusEvents = function() {
		this.monitor.ENTER("onMonitorStatusEvents");
		this.dataInterface.getMonitorStatus().then(results => {
			this.monitor.RESULTS(results);
			Object.assign(this.settings, results);
			this.monitor.DATA("settings =", this.settings);
			this.monitor.EXIT("onMonitorStatusEvents");
			this.renderMonitorStatus();
		});
	};

	/**
	 * Refersh UI to show changes in database values.
	 **/
	AppDoorHanger.prototype.onDatabaseEvents = function() {
		this.monitor.ENTER("onDatabaseEvents");
		this.monitor.DATA("settings =", this.settings);
		this.dataInterface.computeDoorHangerStats(TOP_TARGET_TYPES, FREQUENT_TARGET_VALUES, RECENT_TARGET_VALUES, RECENT_DAYS).then(results => {
			this.monitor.RESULTS(results);
			Object.assign(this.stats, results);
			this.monitor.DATA("stats =", this.stats);
			this.monitor.EXIT("onDatabaseEvents");
			this.renderDatabaseStats();
		});
	};

	/**
	 * On startup, attach listeners to relevant DOM elements, attach listeners for
	 * background messages, and render all UI elements.
	 */
	AppDoorHanger.prototype.initDataEvents = function() {
		this.monitor.ENTER("initDataEvents");
		this.initClickActions();
		this.dataInterface.onMonitorStatusEvents(this.onMonitorStatusEvents.bind(this));
		this.dataInterface.onDatabaseEvents(this.onDatabaseEvents.bind(this));
		this.onMonitorStatusEvents();
		this.onDatabaseEvents();
		this.resizeHeight();
		this.monitor.EXIT("initDataEvents");
	};

	return [AppDoorHanger];
})();

const appDoorHanger = new AppDoorHanger();
document.addEventListener("DOMContentLoaded", function() { appDoorHanger.initDataEvents(); });
