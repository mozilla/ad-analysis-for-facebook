const [AppPage] = (function() {
	"use strict";

	const MAX_BAR_WIDTH = 560;
	const OPEN_CLOSE_ANIMATION_DURATION = 160;
	const RENDER_PAGE_IMPRESSIONS_DEBOUNCE_DURATION = 200;

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

	const FILTER_BY_STATE = "State";
	const FILTER_BY_GENDER_AND_AGE = "GenderAndAge";

	const SORT_BY_LABEL = "Label";
	const SORT_BY_LOW_IMPRESSIONS = "LowImpressions";
	const SORT_BY_HIGH_IMPRESSIONS = "HighImpressions";
	const SORT_BY_LOW_SPENDING = "LowSpending";
	const SORT_BY_HIGH_SPENDING = "HighSpending";

	const AppPage = function() {
		this.monitor = new Monitor("AppPage");
		this.monitor.KEY_ENTER("AppPage");
		this.dataInterface = new DataInterface();
		this.renderTopAdvertisers = debounce(this.renderTopAdvertisersImmediately, RENDER_PAGE_IMPRESSIONS_DEBOUNCE_DURATION).bind(this);
		this.sortByKey = SORT_BY_HIGH_IMPRESSIONS;
		this.monitor.KEY_EXIT("AppPage");
	};

	AppPage.prototype._renderTargets = function(elem, showPercentage = false) {
		const renderAdCount = (d) => {
			return ` (${d.typeCount} times)`;
		};
		const renderAdPercentage = (d) => {
			const percentage = Math.round(1000.0 * d.typeCount / d.adCount) / 10.0;
			return` (${percentage}% of ads)`;
		};
		const renderTargetTypeHead = (elem) => {
			elem.append("span")
				.attr("class", "label")
				.text(d => d.label);
		};
		const renderTargetTypeBody = (elem) => {
			elem.append("span")
				.attr("class", "bar")
				.style("width", d => `${MAX_BAR_WIDTH * d.typeCount / d.adCount}px`);
			elem.append("span")
				.attr("class", "count")
				.text(showPercentage ? renderAdPercentage : renderAdCount);
		};
		const renderTargetValuesHead = (elem) => {
			const openContainer = elem.append("span")
				.attr("class", "action actionShowTargets openContainer")
				.on("click", () => {
					const container = d3.select(d3.event.target.parentNode.parentNode);
					container.selectAll(".targetValuesBody")
						.transition()
						.duration(OPEN_CLOSE_ANIMATION_DURATION)
							.style("max-height", "500px")
							.on("start", () => {
								container
									.classed("isCollapsed", false)
									.classed("isExpanded", true);
							});
				});
			const closeContainer = elem.append("span")
				.attr("class", "action actionHideTargets closeContainer")
				.on("click", () => {
					const container = d3.select(d3.event.target.parentNode.parentNode);
					container.selectAll(".targetValuesBody")
						.transition()
						.duration(OPEN_CLOSE_ANIMATION_DURATION)
							.style("max-height", "0px")
							.on("end", () => {
								container
									.classed("isCollapsed", true)
									.classed("isExpanded", false);
							});
				});
			openContainer.append("span")
				.attr("class", "label")
				.text("Show targets");
			openContainer.append("img")
				.attr("class", "arrow arrowDown")
				.attr("alt", "Show targets")
				.attr("src", "show_targets_triangle_down.svg");
			closeContainer.append("span")
				.attr("class", "label")
				.text("Hide targets");
			closeContainer.append("img")
				.attr("class", "arrow arrowUp")
				.attr("alt", "Hide targets")
				.attr("src", "show_targets_triangle_up.svg");
		};
		const renderTargetValuesBody = (container) => {
			const elem = container.selectAll("div.targetValue").data(d => d.targetValues);
			elem.exit().remove();
			elem.enter().append("div").attr("class", "targetValue")
				.merge(elem).text(d => d);
		};
		const renderTargetNoValues = (elem) => {
			elem.append("span")
				.attr("class", "label")
				.text("No targets to show");
			elem.append("span")
				.text(" - ");
			elem.append("span")
				.attr("class", "text")
				.text("Facebook does not provide targeting details for this category");
		};

		elem.selectAll("*").remove();
		elem.append("div")
			.attr("class", "targetTypeHeader")
			.call(renderTargetTypeHead);
		elem.append("div")
			.attr("class", "targetTypeBody")
			.call(renderTargetTypeBody);
		const targetsContainer = elem.filter(targetType => targetType.hasValues).append("div")
			.attr("class", "targetValuesContainer")
			.classed("isCollapsed", true);
		targetsContainer.append("div")
			.attr("class", "targetValuesHead")
			.call(renderTargetValuesHead);
		targetsContainer.append("div")
			.attr("class", "targetValuesBody")
			.call(renderTargetValuesBody);
		elem.filter(targetType => !targetType.hasValues).append("div")
			.attr("class", "targetValuesNoContainer")
			.call(renderTargetNoValues);
	};

	AppPage.prototype.renderYourTargets = function() {
		this.monitor.ENTER("renderYourTargets");
		this.dataInterface.computeYourTargetStats().then(yourStats => {
			const yourTargets = this.dataInterface.getAllTargetTypes()
				.map(targetType => Object.assign(yourStats[targetType.key], targetType))
				.sort((a, b) => b.typeCount - a.typeCount)
				.filter(d => d.typeCount > 0);
			const root = d3.select("#YourTargetsContainer");
			const elem = root.selectAll("div.yourTargetContainer").data(yourTargets);
			elem.exit().remove();
			elem.enter().append("div").attr("class", "yourTargetContainer")
				.merge(elem).call(this._renderTargets.bind(this));

			const totalAds = yourTargets.reduce((tally, d) => tally + d.adCount, 0);
			root.selectAll(".msgNoAdsCollected").style("display", totalAds === 0 ? "block" : null);
			this.monitor.EXIT("renderYourTargets");
		});
	};

	AppPage.prototype.renderPublicTargets = function() {
		this.monitor.ENTER("renderPublicTargets");
		this.dataInterface.computePublicTargetStats().then(publicStats => {
			const publicTargets = this.dataInterface.getAllTargetTypes()
				.map(targetType => Object.assign(publicStats[targetType.key], targetType))
				.sort((a, b) => b.typeCount - a.typeCount)
				.filter(d => d.typeCount > 0);
			const root = d3.select("#PublicTargetsContainer");
			const elem = root.selectAll("div.publicTargetContainer").data(publicTargets);
			elem.exit().remove();
			elem.enter().append("div").attr("class", "publicTargetContainer")
				.merge(elem).call(elem => this._renderTargets(elem, true));
			this.monitor.EXIT("renderPublicTargets");
		});
	};

	AppPage.prototype.showYourTargetContainer = function() {
		this.renderTargetContainerTabs(true);
	};

	AppPage.prototype.showPublicTargetContainer = function() {
		this.renderTargetContainerTabs(false);
	};

	AppPage.prototype.initTargetContainerTabs = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("initTargetContainerTabs");
			this.dataInterface.isIncognito().then(isIncognito => {
				if (isIncognito) {
					d3.selectAll(".actionShowYourTargets").classed("disabled", true);
				}
				this.monitor.EXIT("initTargetContainerTabs");
				resolve();
			});
		});
	};

	AppPage.prototype.renderTargetContainerTabs = function(showYourTargetContainer) {
		const render = (showYourTargetContainer) => {
			d3.select("#YourTargetsContainer").style("display", showYourTargetContainer ? "block" : "none");
			d3.select("#PublicTargetsContainer").style("display", !showYourTargetContainer ? "block" : "none");
			d3.selectAll(".actionShowYourTargets")
				.classed("active", showYourTargetContainer)
				.classed("inactive", !showYourTargetContainer);
			d3.selectAll(".actionShowPublicTargets")
				.classed("active", !showYourTargetContainer)
				.classed("inactive", showYourTargetContainer);
		};

		this.monitor.ENTER("renderTargetContainerTabs");
		this.dataInterface.isIncognito().then(isIncognito => {
			render(isIncognito ? false : showYourTargetContainer);
			this.monitor.EXIT("renderTargetContainerTabs");
		});
	};

	const ONE_WEEK = 1000 * 60 * 60 * 24 * 6;

	const DEFAULT_LOCALE_EN_US = "en-US";

	const MAX_ADVERTISERS = 250;

	const ALL = "ALL";

	const GENDER_LABELS = {
		"ALL": "All users",
		"male": "Men",
		"female": "Women"
	};

	const AGE_LABELS = {
		"ALL": "All ages",
		"13-17": "13 to 17",
		"18-24": "18 to 24",
		"25-34": "25 to 34",
		"35-44": "35 to 44",
		"45-54": "45 to 54",
		"55-64": "55 to 64",
		"65+": "65 and over",
	};

	const getTopAdvertisersClassName = function(weekKey, filterByKey, stateKey, genderKey, ageKey) {
		const getClassName = (s) => s.replace(/\W+/g, "");
		const weekClassName = getClassName(weekKey);
		if (filterByKey === FILTER_BY_STATE) {
			const stateClassName = getClassName(stateKey);
			return `w${weekClassName}_s${stateClassName}`;
		}
		if (filterByKey === FILTER_BY_GENDER_AND_AGE) {
			const genderClassName = getClassName(genderKey);
			const ageClassName = getClassName(ageKey);
			return `w${weekClassName}_g${genderClassName}_a${ageClassName}`;
		}
		return `w${weekClassName}`;
	};

	AppPage.prototype._updateFilterByControls = function() {
		const radioFilterByState = d3.selectAll(".radioFilterByState");
		const radioFilterByGenderAndAge = d3.selectAll(".radioFilterByGenderAndAge");
		const labelTopAdvertisersByState = d3.selectAll(".labelTopAdvertisersByState");
		const labelTopAdvertisersByGenderAndAge = d3.selectAll(".labelTopAdvertisersByGenderAndAge");
		const selectByState = d3.selectAll(".selectTopAdvertisersByState");
		const selectByGender = d3.selectAll(".selectTopAdvertisersByGender");
		const selectByAge = d3.selectAll(".selectTopAdvertisersByAge");
		if (radioFilterByState.node().checked) {
			selectByState.node().disabled = false;
			labelTopAdvertisersByState.classed("disabled", false);
			selectByGender.node().disabled = true;
			selectByAge.node().disabled = true;
			labelTopAdvertisersByGenderAndAge.classed("disabled", true);
			return FILTER_BY_STATE;
		}
		if (radioFilterByGenderAndAge.node().checked) {
			selectByState.node().disabled = true;
			labelTopAdvertisersByState.classed("disabled", true);
			selectByGender.node().disabled = false;
			selectByAge.node().disabled = false;
			labelTopAdvertisersByGenderAndAge.classed("disabled", false);
			return FILTER_BY_GENDER_AND_AGE;
		}
		selectByState.node().disabled = true;
		labelTopAdvertisersByState.classed("disabled", true);
		selectByGender.node().disabled = true;
		selectByAge.node().disabled = true;
		labelTopAdvertisersByGenderAndAge.classed("disabled", true);
		return null;
	};

	AppPage.prototype.initPageImpressionControls = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("initPageImpressionControls");
			d3.selectAll(".radioFilterByState").on("change", this.renderTopAdvertisers.bind(this));
			d3.selectAll(".radioFilterByGenderAndAge").on("change", this.renderTopAdvertisers.bind(this));

			this.dataInterface.computeTopAdvertisersIndex().then(index => {
				this.monitor.DATA("index =", index);

				const renderWeekControl = () => {
					const renderWeekLabel = (key) => {
						var options = {
							"weekday": "long",
							"year": "numeric",
							"month": "long",
							"day": "numeric"
						};
						if (key === ALL) {
							return "since May 2018";
						}
						else {
							const dateFields = key.split("-");
							const year = parseInt(dateFields[0]);
							const month = parseInt(dateFields[1]);
							const day = parseInt(dateFields[2]);
							const startDate = new Date(year, month - 1, day);
							const endDate = new Date(startDate.getTime() + ONE_WEEK);
							const endDateStr = endDate.toLocaleDateString(DEFAULT_LOCALE_EN_US, options);
							return `for the week ending ${endDateStr}`;
						}
					};
					const weekKeys = index.week_keys;
					const selectByWeek = d3.selectAll(".selectTopAdvertisersByWeek");
					selectByWeek.selectAll("option").data(weekKeys).enter()
						.append("option")
						.attr("selected", (key, index) => (index === 0) ? "selected" : null)
						.attr("value", key => key)
						.attr("label", renderWeekLabel)
						.text(renderWeekLabel);
					selectByWeek.on("change", this.renderTopAdvertisers.bind(this));
				};
				const renderStateControl = () => {
					const renderStateLabel = (key) => {
						return (key === ALL) ? "All US states and the District of Columbia" : key;
					};
					const stateKeys = index.state_keys;
					const selectByState = d3.selectAll(".selectTopAdvertisersByState");
					selectByState.selectAll("option").data(stateKeys).enter()
						.append("option")
						.attr("selected", (key, index) => (index === 0) ? "selected" : null)
						.attr("value", key => key)
						.attr("label", renderStateLabel)
						.text(renderStateLabel);
					selectByState.on("change", this.renderTopAdvertisers.bind(this));
				};
				const renderGenderControl = () => {
					const renderGenderLabel = (key) => {
						return GENDER_LABELS[key];
					};
					const genderKeys = index.gender_keys;
					const selectByGender = d3.selectAll(".selectTopAdvertisersByGender");
					selectByGender.selectAll("option").data(genderKeys).enter()
						.append("option")
						.attr("selected", (d, index) => (index === 0) ? "selected" : null)
						.attr("value", d => d)
						.attr("label", renderGenderLabel)
						.text(renderGenderLabel);
					selectByGender.on("change", this.renderTopAdvertisers.bind(this));
				};
				const renderAgeControl = () => {
					const renderAgeLabel = (key) => {
						return AGE_LABELS[key];
					};
					const ageKeys = index.age_keys;
					const selectByAge = d3.selectAll(".selectTopAdvertisersByAge");
					selectByAge.selectAll("option").data(ageKeys).enter()
						.append("option")
						.attr("selected", (d, index) => (index === 0) ? "selected" : null)
						.attr("value", d => d)
						.attr("label", renderAgeLabel)
						.text(renderAgeLabel);
					selectByAge.on("change", this.renderTopAdvertisers.bind(this));
				};
				const renderAllTableContainers = () => {
					const tableList = [];
					const weeks = index.week_keys.map(key => index.weeks[key]);
					weeks.forEach(week => {
						const states = week.state_keys.map(key => week.states[key]);
						states.forEach(table => {
							tableList.push(table);
						});
						const genders = week.gender_keys.map(key => week.genders[key]);
						genders.forEach(gender => {
							const ages = gender.age_keys.map(key => gender.ages[key]);
							ages.forEach(table => {
								tableList.push(table);
							});
						});
					});
					const root = d3.select("#PageImpressionsContainer");
					const elem = root.selectAll("div.topAdvertisersTable").data(tableList);
					elem.exit().remove("*");
					elem.enter().append("div").attr("class", table => `topAdvertisersTable ${table.class_name}`);
				};

				renderWeekControl();
				renderStateControl();
				renderGenderControl();
				renderAgeControl();
				renderAllTableContainers();
				this.monitor.EXIT("initPageImpressionControls");
				resolve();
			});
		});
	};

	AppPage.prototype.renderTopAdvertisersImmediately = function() {
		this.monitor.ENTER("renderTopAdvertisers");

		const selectByWeek = d3.selectAll(".selectTopAdvertisersByWeek");
		const selectByState = d3.selectAll(".selectTopAdvertisersByState");
		const selectByGender = d3.selectAll(".selectTopAdvertisersByGender");
		const selectByAge = d3.selectAll(".selectTopAdvertisersByAge");
		const weekKey = selectByWeek.node().value;
		const stateKey = selectByState.node().value;
		const genderKey = selectByGender.node().value;
		const ageKey = selectByAge.node().value;
		const filterByKey = this._updateFilterByControls();
		const className = getTopAdvertisersClassName(weekKey, filterByKey, stateKey, genderKey, ageKey);

		this.monitor.DATA("className =", className);
		this.dataInterface.computeTopAdvertisersTable(className).then(rawTable => {

			const formatter = d3.format(",");
			const getQueryURL = (key) => {
				const encodedKey = encodeURIComponent(key);
				return `https://www.facebook.com/ads/archive/?country=US&q=${encodedKey}`;
			};
			const alphanumeric = (key) => {
				return key.toLowerCase().replace(/[^\w ]+/g, "");
			};
			const keySorter = (a, b) => {
				return alphanumeric(a.advertiser).localeCompare(alphanumeric(b.advertiser));
			};
			const lowImpressionsSorter = (a, b) => {
				if (a.lowImpressions !== b.lowImpressions) {
					return b.lowImpressions - a.lowImpressions;
				}
				else {
					return alphanumeric(a.advertiser).localeCompare(alphanumeric(b.advertiser));
				}
			};
			const highImpressionsSorter = (a, b) => {
				if (a.highImpressions !== b.highImpressions) {
					return b.highImpressions - a.highImpressions;
				}
				else {
					return alphanumeric(a.advertiser).localeCompare(alphanumeric(b.advertiser));
				}
			};
			const lowSpendingSorter = (a, b) => {
				if (a.lowSpending !== b.lowSpending) {
					return b.lowSpending - a.lowSpending;
				}
				else {
					return alphanumeric(a.advertiser).localeCompare(alphanumeric(b.advertiser));
				}
			};
			const highSpendingSorter = (a, b) => {
				if (a.highSpending !== b.highSpending) {
					return b.highSpending - a.highSpending;
				}
				else {
					return alphanumeric(a.advertiser).localeCompare(alphanumeric(b.advertiser));
				}
			};
			const getTopAdvertisers = () => {
				const threshold = (data) => {
					return data.slice(0, Math.min(data.length, MAX_ADVERTISERS));
				};
				const data = rawTable.map(row => {
					return {
						"advertiser": row[0],
						"highImpressions": parseInt(row[1]),
						"highSpending": parseInt(row[2]),
					};
				});
				if (this.sortByKey === SORT_BY_LABEL) {
					return threshold(data.sort(keySorter));
				}
				else if (this.sortByKey === SORT_BY_LOW_IMPRESSIONS) {
					return threshold(data.sort(lowImpressionsSorter));
				}
				else if (this.sortByKey === SORT_BY_HIGH_IMPRESSIONS) {
					return threshold(data.sort(highImpressionsSorter));
				}
				else if (this.sortByKey === SORT_BY_LOW_SPENDING) {
					return threshold(data.sort(lowSpendingSorter));
				}
				else if (this.sortByKey === SORT_BY_HIGH_SPENDING) {
					return threshold(data.sort(highSpendingSorter));
				}
				else {
					return threshold(data);
				}
			};
			const renderTableHeader = (header) => {
				const onMouseOverEvent = () => {
					d3.select(d3.event.target).classed("hover", true);
				};
				const onMouseOutEvent = () => {
					d3.select(d3.event.target).classed("hover", false);
				};
				const createOnClickEvent = (sortByKey) => {
					return () => {
						this.sortByKey = sortByKey;
						renderSortBySettings(sortByKey);
						this.renderTopAdvertisers();
					};
				};
				const labelHeader = header.append("span")
					.attr("class", "label");
				labelHeader.append("span")
					.text("Advertiser");
				const impressionsHeader = header.append("span")
					.attr("class", "impressions action actionSortBy actionSortByHighImpressions")
					.on("mouseover", onMouseOverEvent)
					.on("mouseout", onMouseOutEvent)
					.on("click",createOnClickEvent(SORT_BY_HIGH_IMPRESSIONS));
				impressionsHeader.append("span")
					.text("Impressions");
				impressionsHeader.append("span")
					.append("img")
						.attr("class", "sort sortNumber")
						.attr("alt", "Sort by impressions")
						.attr("src", "sort_number.svg");
				const spendingHeader = header.append("span")
					.attr("class", "spending action actionSortBy actionSortByHighSpending")
					.on("mouseover", onMouseOverEvent)
					.on("mouseout", onMouseOutEvent)
					.on("click", createOnClickEvent(SORT_BY_HIGH_SPENDING));
				spendingHeader.append("span")
					.text("Spending");
				spendingHeader.append("span")
					.append("img")
						.attr("class", "sort sortNumber")
						.attr("alt", "Sort by spending")
						.attr("src", "sort_number.svg");
			};
			const renderTableBody = (body) => {
				const rows = body.selectAll("div.row").data(getTopAdvertisers).enter()
					.append("div")
					.attr("class", "row");
				const labelField = rows.append("span").attr("class", "label");
				labelField.append("span")
					.append("a")
						.attr("href", d => getQueryURL(d.advertiser))
						.attr("rel", "noopener noreferrer")
						.attr("target", "_blank")
						.text(d => d.advertiser);
				const impressionsField = rows.append("span").attr("class", "impressions");
				impressionsField.append("span")
					.text(d => `< ${formatter(d.highImpressions)}`);
				const spendingField = rows.append("span").attr("class", "spending");
				spendingField.append("span")
					.text(d => d.highSpending === 0 ? "-" : `< $${formatter(d.highSpending)}`);
			};
			const renderTopAdvertisersTable = (container) => {
				container.append("div")
					.attr("class", "header")
					.call(renderTableHeader);
				container.append("div")
					.attr("class", "body")
					.call(renderTableBody);
			};
			const renderSortBySettings = (sortByKey) => {
				d3.selectAll(".actionSortBy")
					.classed("sortActive", false)
					.classed("sortInactive", true);
				d3.selectAll(`.actionSortBy${sortByKey}`)
					.classed("sortActive", true)
					.classed("sortInactive", false);
			};

			const allTableElems = d3.selectAll(".topAdvertisersTable");
			allTableElems
				.style("display", "none")
				.selectAll("*").remove();

			const thisTableElem = d3.selectAll(`.${className}`);
			thisTableElem
				.call(renderTopAdvertisersTable)
				.style("display", "block");

			renderSortBySettings(this.sortByKey);
			this.monitor.EXIT("renderTopAdvertisers");
		});
	};

	// Listeners ------------------------------------------------------------------

	/**
	 * Attach listeners to UI elements to trigger actions from user.
	 **/
	AppPage.prototype.initClickActions = function() {
		this.monitor.ENTER("initClickActions");
		d3.selectAll(".actionShowYourTargets").on("click", this.showYourTargetContainer.bind(this));
		d3.selectAll(".actionShowPublicTargets").on("click", this.showPublicTargetContainer.bind(this));
		this.monitor.EXIT("initClickActions");
	};

	/**
	 * On startup, attach listeners to relevant DOM elements, attach listeners for
	 * background messages, and render all UI elements.
	 */
	AppPage.prototype.initDataEvents = function() {
		this.monitor.ENTER("initDataEvents");
		this.initClickActions();
		this.initTargetContainerTabs().then(() => {
			this.renderTargetContainerTabs(true);
			this.renderPublicTargets();
			this.renderYourTargets();
			this.initPageImpressionControls().then(() => {
				this.renderTopAdvertisers();
				this.dataInterface.onDatabaseEvents(this.renderYourTargets.bind(this));
				this.monitor.EXIT("initDataEvents");
			});
		});
	};

	return [AppPage];
})();

const appPage = new AppPage();
document.addEventListener("DOMContentLoaded", function() { appPage.initDataEvents(); });
