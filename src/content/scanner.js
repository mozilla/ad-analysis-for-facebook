const [Scanner] = (function() {
	"use strict";

	/**
	 * implementation of debounce from https://davidwalsh.name/javascript-debounce-function
	 * @param{function} func - function to wrap with debounce
	 * @param{number} wait - debounce time in milliseconds
	 * @param{boolean} [immediate] - if true, trigger at start rather than end of debounce period
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
	 * @constant {string} Class name for timeline post containers.
	 **/
	const TIMELINE_CLASS_NAME = "userContentWrapper";

	/**
	 * @constant {string} Class name for sidebar post containers.
	 **/
	const SIDEBAR_CLASS_NAME = "ego_unit";

	/**
	 * @constant {number} Initial delay in milleseconds before the first scan.
	 **/
	const SCAN_INITIAL_DELAY_DURATION = 5000;

	/**
	 * @constant {number} Maximum frequency of consecutive scans in milleseconds.
	 **/
	const SCAN_DEBOUNCE_DURATION = 100;

	/**
	 * Scanner for ads within a Facebook page
	 * @class
	 **/
	const FacebookScanner = function() {
		this.monitor = new Monitor("FacebookScanner");
		this.monitor.KEY_ENTER("FacebookScanner");

		/**
		 * @type {iterable} Pointer to all timeline posts.
		 **/
		this.timelinePosts = document.getElementsByClassName(TIMELINE_CLASS_NAME);

		/**
		 * @type {iterable} Ppointer to all sidebar posts.
		 **/
		this.sidebarPosts = document.getElementsByClassName(SIDEBAR_CLASS_NAME);

		/**
		 * Schedule a scan subject to maximum frequency defined in SCAN_DEBOUNCE_DURATION.
		 * @function
		 **/
		this.scheduleScanForAds = debounce(this.checkMonitorStatusAndScanForAds, SCAN_DEBOUNCE_DURATION).bind(this);

		this.listenToBackgroundMessages();
		this.listenToWindowEvents();
		setTimeout(this.scheduleScanForAds, SCAN_INITIAL_DELAY_DURATION);

		this.monitor.KEY_EXIT("FacebookScanner");
	};

	/**
	 * @type {boolean} Flag to indicate whether the scanner is currently running.
	 **/
	let latestScanningStatus = false;

	/**
	 * @type {number} Timestamp when the latest scan was completed.
	 **/
	let latestScanTimestamp = null;

	/**
	 * @type {Object} Durations for the latest scan.
	 **/
	let latestScanDurations = {};

	/**
	 * @type {Object} Counts of posts and ads for the latest scan.
	 **/
	let latestScanCounts = {};

	/**
	 * @type {Object[]} A list of visible posts in the timeline.
	 **/
	let latestTimelineVisiblePosts = [];

	/**
	 * @type {Object[]} A list of visible posts in the sidebar.
	 **/
	let latestSidebarVisiblePosts = [];

	/**
	 * @type {Object[]} A list of visible ads.
	 **/
	let latestVisibleAds = [];


	// Window events ----------------------------------------


	/**
	 * Listen to window events: load, unload, scroll, resize
	 **/
	FacebookScanner.prototype.listenToWindowEvents = function() {
		window.addEventListener("load", this.sendLoadedPageEvent.bind(this));
		window.addEventListener("unload", this.sendUnloadedPageEvent.bind(this));
		window.addEventListener("scroll", this.scheduleScanForAds);
		window.addEventListener("resize", this.scheduleScanForAds);
	};


	// Messages from content to background ----------------------------------------

	/**
	 * Fire an event to notify that content script has been loaded into a tab.
	 **/
	FacebookScanner.prototype.sendLoadedPageEvent = function() {
		this.monitor.ENTER("sendLoadedPageEvent");
		const options = {
			"key": MSG.SCANNER.LOADED,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendLoadedPageEvent");
	};

	/**
	 * Fire an event to notify that content script has been unloaded from a tab.
	 **/
	FacebookScanner.prototype.sendUnloadedPageEvent = function() {
		this.monitor.ENTER("sendUnloadedPageEvent");
		const options = {
			"key": MSG.SCANNER.UNLOADED,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendUnloadedPageEvent");
	};

	/**
	 * Fire an event to notify the start of a scanning pass.
	 **/
	FacebookScanner.prototype.sendStartedScanningMessage = function() {
		this.monitor.ENTER("sendStartedScanningMessage");
		const options = {
			"key": MSG.SCANNER.STARTED_SCANNING,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendStartedScanningMessage");
	};

	/**
	 * Fire an event to notify the end of a scanning pass.
	 **/
	FacebookScanner.prototype.sendFinishedScanningMessage = function() {
		this.monitor.ENTER("sendFinishedScanningMessage");
		const options = {
			"key": MSG.SCANNER.FINISHED_SCANNING,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendFinishedScanningMessage");
	};

	/**
	 * Fire an event that the scanner has examined all posts in a page.
	 **/
	FacebookScanner.prototype.sendFoundAllPostsMessage = function() {
		this.monitor.ENTER("sendFoundAllPostsMessage");
		const options = {
			"key": MSG.SCANNER.FOUND_ALL_POSTS,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendFoundAllPostsMessage");
	};

	/**
	 * Fire an event that the scanner has identified visible posts within the viewport.
	 **/
	FacebookScanner.prototype.sendFoundVisiblePostsMessage = function() {
		this.monitor.ENTER("sendFoundVisiblePostsMessage");
		const options = {
			"key": MSG.SCANNER.FOUND_VISIBLE_POSTS,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendFoundVisiblePostsMessage");
	};

	/**
	 * Fire an event that the scanner has extracted visible ads within the viewport.
	 **/
	FacebookScanner.prototype.sendFoundVisibleAdsMessage = function() {
		this.monitor.ENTER("sendFoundVisibleAdsMessage");
		const options = {
			"key": MSG.SCANNER.FOUND_VISIBLE_ADS,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendFoundVisibleAdsMessage");
	};

	/**
	 * Fire an event that the scanner has extracted new ads from the page.
	 **/
	FacebookScanner.prototype.sendParsedNewAdsMessage = function(newAds = []) {
		this.monitor.ENTER("sendParsedNewAdsMessage");
		const options = {
			"key": MSG.SCANNER.PARSED_NEW_ADS,
			"newAds": newAds,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendParsedNewAdsMessage");
	};

	/**
	 * Fire an event that the scanner has extracted new ad targeting information from the page.
	 **/
	FacebookScanner.prototype.sendParsedNewTargetsMessage = function(newTargets = []) {
		this.monitor.ENTER("sendParsedNewTargetsMessage");
		const options = {
			"key": MSG.SCANNER.PARSED_NEW_TARGETS,
			"newTargets": newTargets,
		};
		this.monitor.OPTIONS(options);
		browser.runtime.sendMessage(options);
		this.monitor.EXIT("sendParsedNewTargetsMessage");
	};

	/**
	 * Send a message to request the latest monitor status.
	 * @async
	 * @returns {boolean} Flag on whether the monitor is enabled.
	 **/
	FacebookScanner.prototype.sendGetMonitorStatusMessage = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("sendGetMonitorStatusMessage");
			const options = {
				"key": MSG.SCANNER.GET_MONITOR_STATUS,
			};
			this.monitor.OPTIONS(options);
			browser.runtime.sendMessage(options).then(results => {
				this.monitor.RESULTS(results);
				resolve(results);
				this.monitor.EXIT("sendGetMonitorStatusMessage");
			});
		});
	};

	// Messages from background to content ----------------------------------------

	/**
	 * @listens Incoming background messages.
	 **/
	FacebookScanner.prototype.listenToBackgroundMessages = function() {
		const onBackgroundMessages = (message, sender) => {
			this.monitor.EVENT("browser.runtime.onMessage (background)", {"message": message, "sender": sender});
			const key = message.key;

			// Respond to requests of the latest scanning status.
			if (key === MSG.BACKGROUND.GET_SCANNING_STATUS) {
				return new Promise(resolve => resolve({
					"isScanning": latestScanningStatus,
					"scanTimestamp": latestScanTimestamp,
					"scanDurations": latestScanDurations,
					"scanCounts": latestScanCounts,
				}));
			}

			// Respond to requests of the latest posts within the page.
			if (key === MSG.BACKGROUND.GET_ALL_POSTS) {
				const timelinePosts = this.timelineAllPosts.map(post => post.innerText);
				const sidebarPosts = this.sidebarAllPosts.map(post => post.innerText);
				const allPosts = timelinePosts.concat(sidebarPosts);
				return new Promise(resolve => resolve({
					"allPosts": allPosts,
				}));
			}

			// Respond to requests of the latest visible posts.
			if (key === MSG.BACKGROUND.GET_VISIBLE_POSTS) {
				const timelinePosts = latestTimelineVisiblePosts.map(post => post.innerText);
				const sidebarPosts = latestSidebarVisiblePosts.map(post => post.innerText);
				const visiblePosts = timelinePosts.concat(sidebarPosts);
				return new Promise(resolve => resolve({
					"visiblePosts": visiblePosts,
				}));
			}

			// Respond to requests of the latest visible ads.
			if (key === MSG.BACKGROUND.GET_VISIBLE_ADS) {
				const visibleAds = latestVisibleAds.slice();
				return new Promise(resolve => resolve({
					"visibleAds": visibleAds,
				}));
			}

			// Listen to requests to start a scan.
			if (key === MSG.BACKGROUND.START_SCANNING) {
				this.scheduleScanForAds();
				return;
			}
			return;
		};
		this.monitor.EVENT("browser.runtime.onMessage.addListener(onBackgroundMessages)");
		browser.runtime.onMessage.addListener(onBackgroundMessages);
	};

	/**
	 * Ensure only one copy of the scanner is ever running at once.
	 * If okay, scan for ads.
	 **/
	FacebookScanner.prototype.singleThreadScanForAds = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("singleThreadScanForAds");
			this.monitor.DATA("latestScanningStatus =", latestScanningStatus);
			if (!latestScanningStatus) {
				latestScanningStatus = true;
				this.scanForAds().then(results => {
					latestScanningStatus = false;
					latestScanTimestamp = Date.now();
					latestScanDurations = results.durations;
					latestScanCounts = results.counts;
					this.monitor.EXIT("singleThreadScanForAds");
					resolve();
				});
			}
			else {
				this.monitor.EXIT("singleThreadScanForAds");
				resolve();
			}
		});
	};

	/**
	 * Check monitor status.
	 * If enabled, check if a previous scan is already running.
	 **/
	FacebookScanner.prototype.checkMonitorStatusAndScanForAds = function() {
		this.monitor.ENTER("checkMonitorStatusAndScanForAds");
		this.sendGetMonitorStatusMessage().then(message => {
			const isEnabled = message["isEnabled"] ? message["isEnabled"] : false;
			this.monitor.DATA("isEnabled =", isEnabled);
			this.monitor.EXIT("checkMonitorStatusAndScanForAds");
			if (isEnabled) {
				this.singleThreadScanForAds();
			}
		});
	};

	/**
	 * Start a scan for ads in the current page.
	 * @async
	 * @returns {Object} durations - Timing information for subtasks within a scan.
	 **/
	FacebookScanner.prototype.scanForAds = function() {
		return new Promise(resolve => {
			this.monitor.ENTER("scanForAds");
			const startTimestamp = Date.now();

			this.sendStartedScanningMessage();

			const startMessageTimestamp = Date.now();

			// Identify all posts in the page.
			const allPosts = this.findAllPosts();

			const allPostsTimestamp = Date.now();

			// Identify visible posts within the viewport.
			const allPostCount = allPosts.timelinePosts.length + allPosts.sidebarPosts.length;
			const visibleTimelinePosts = this.filterVisiblePosts(allPosts.timelinePosts);
			const visibleSidebarPosts = this.filterVisiblePosts(allPosts.sidebarPosts);
			const visiblePosts = visibleTimelinePosts.concat(visibleSidebarPosts);

			const visiblePostsTimestamp = Date.now();

			// Filter posts that were previously scanned.
			const unscannedVisiblePosts = this.filterPreviouslyScannedPosts(visiblePosts);

			const unscannedVisiblePostTimestamp = Date.now();

			// Filter post-within-a-post
			const nonOverlappingUnscannedVisiblePosts = this.filterPostWithinAPost(unscannedVisiblePosts);

			const nonOverlappingUnscannedVisiblePostsTimestamp = Date.now();

			// Apply scraper to unscanned visible posts.
			this.applyScraper(nonOverlappingUnscannedVisiblePosts).then(scraperOutput => {
				const rawResults = scraperOutput.rawResults;
				const adCount = scraperOutput.adCount;
				const notAdCount = scraperOutput.notAdCount;
				const adInAnAdCount = scraperOutput.adInAnAdCount;
				const scraperTimestamp = Date.now();

				// Remove deplicate ads.
				const dedupeResults = this.filterDuplicateAds(rawResults);

				const dedupeTimestamp = Date.now();

				// Insert newly found ads into the database, if any.
				if (dedupeResults.length > 0) {
					const newAds = dedupeResults.map(adAndNode => adAndNode.ad);
					this.monitor.DATA("newAds =", newAds);
					this.sendParsedNewAdsMessage(newAds);

					// Combine all targeting data from all ads into a single array.
					const newTargets = newAds.reduce((combined, ad) => (ad.targets) ? combined.concat(ad.targets) : combined, []);
					this.monitor.DATA("newTargets = ", newTargets);
					this.sendParsedNewTargetsMessage(newTargets);
				}
				const databaseTimestamp = Date.now();

				this.sendFinishedScanningMessage();

				const finishTimestamp = Date.now();

				// Timing report.
				const durations = {
					"0:startMessage": startMessageTimestamp - startTimestamp,
					"1:allPosts": allPostsTimestamp - startMessageTimestamp,
					"2:visiblePosts": visiblePostsTimestamp - allPostsTimestamp,
					"3:unscannedVisiblePosts": unscannedVisiblePostTimestamp - visiblePostsTimestamp,
					"4:nonOverlappingUnscannedVisiblePosts": nonOverlappingUnscannedVisiblePostsTimestamp - unscannedVisiblePostTimestamp,
					"5:scraper": scraperTimestamp - nonOverlappingUnscannedVisiblePostsTimestamp,
					"6:dedupe": dedupeTimestamp - scraperTimestamp,
					"7:database": databaseTimestamp - dedupeTimestamp,
					"8:finishMessage": finishTimestamp - databaseTimestamp,
					"all": finishTimestamp - startTimestamp,
				};

				// Counts of posts and ads at various stage of a scan.
				const counts = {
					"1:allPosts": allPostCount,
					"2:visiblePosts": visiblePosts.length,
					"3:unscannedVisiblePosts": unscannedVisiblePosts.length,
					"4:scraper:ads": adCount,
					"4:scraper:notAds": notAdCount,
					"4:scraper:adsWithinAds": adInAnAdCount,
					"5:rawNewAds": rawResults.length,
					"6:dedupedNewAds": dedupeResults.length,
				};
				this.monitor.EXIT("scanForAds");
				resolve({
					"durations": durations,
					"counts": counts,
				});
			});
		});
	};

	/**
	 * Find all posts within the page.
	 * @returns {iterable|Node[]} timelinePosts - A list of posts in the timeline.
	 * @returns {iterable|Node[]} sidebarPosts - A list of posts in the sidebar.
	 **/
	FacebookScanner.prototype.findAllPosts = function() {
		this.monitor.ENTER("findAllPosts");
		this.monitor.EXIT("findAllPosts");
		return {
			"timelinePosts": this.timelinePosts,
			"sidebarPosts": this.sidebarPosts,
		};
	};

	/**
	 * Determine if a node is within the viewport.
	 * Modified from https://stackoverflow.com/a/7557433
	 * @param {Node} A node.
	 * @returns {boolean} Flag on whether the node is visible.
	 **/
	const isElementInViewport = function(n0) {
		var rect = n0.getBoundingClientRect();
		return (
			rect.top > -rect.height &&
			rect.left > -rect.width &&
			rect.bottom < ((window.innerHeight || document.documentElement.clientHeight) + rect.height) &&
			rect.right < ((window.innerWidth || document.documentElement.clientWidth) + rect.width)
		);
	};

	/**
	 * Determine whether a list of posts are visible within the viewport.
	 * @param {iterable} posts - A list of posts.
	 * @returns {Node[]} A list of visible posts.
	 **/
	FacebookScanner.prototype.filterVisiblePosts = function(posts) {
		this.monitor.ENTER("filterVisiblePosts");
		this.monitor.DATA(`posts (${posts.length}) =`, posts);
		const visiblePosts = [];
		for (const post of posts) {
			if (isElementInViewport(post)) {
				visiblePosts.push(post);
			}
		}
		this.monitor.DATA(`visiblePosts (${visiblePosts.length}) =`, visiblePosts);
		this.monitor.EXIT("filterVisiblePosts");
		return visiblePosts;
	};

	/**
	 * Compare the bounding rects of two nodes to check for overlap.
	 * @param {Node} n1 - First node.
	 * @param {Node} n2 - Second node.
	 * @returns {boolean} Flag on whether two nodes overlap.
	 **/
	const hasOverlappingBoundingRects = function(n1, n2) {
		const r1 = n1.getBoundingClientRect();
		const r2 = n2.getBoundingClientRect();
		return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
	};

	/**
	 * @type {Set} A set of previously scanned visible ads.
	 **/
	const previouslyScannedPosts = new Set();

	/**
	 * Filter posts that were previously examined.
	 * @param {Node[]} A list of visible ads.
	 * @return {Node[]} A list of visible ads not yet scanned.
	 **/
	FacebookScanner.prototype.filterPreviouslyScannedPosts = function(visiblePosts) {
		this.monitor.ENTER("filterPreviouslyScannedPosts");
		this.monitor.DATA(`visiblePosts (${visiblePosts.length}) =`, visiblePosts);
		this.monitor.DATA(`previouslyScannedPosts = (${previouslyScannedPosts.size})`, previouslyScannedPosts);
		const unscannedVisiblePosts = [];
		visiblePosts.forEach(post => {
			if (!previouslyScannedPosts.has(post)) {
				unscannedVisiblePosts.push(post);
			}
		});
		this.monitor.DATA(`unscannedVisiblePosts (${unscannedVisiblePosts.length}) =`, unscannedVisiblePosts);
		this.monitor.EXIT("filterPreviouslyScannedPosts");
		return unscannedVisiblePosts;
	};

	/**
	 * Filter posts-within-a-post. Sometimes an FB post or ad is contained within two nested TIMELINE_SELECTOR;
	 * make sure we only scan one of them.
	 * @param {Node[]} A list of visible posts.
	 * @return {Node[]} A list of visible posts with the inner of any nested pair removed.
	 **/
	FacebookScanner.prototype.filterPostWithinAPost = function(unscannedVisiblePosts) {
		this.monitor.ENTER("filterPostWithinAPost");
		this.monitor.DATA(`unscannedVisiblePosts (${unscannedVisiblePosts.length}) =`, unscannedVisiblePosts);
		const nonOverlappingUnscannedVisiblePosts = [];
		for (let post of unscannedVisiblePosts) {
			let nested = false;
			for (let potentialContainerPost of unscannedVisiblePosts) {
				if (post !== potentialContainerPost && potentialContainerPost.contains(post)) {
					nested = true;
					this.monitor.DATA("found post-within-a-post", post);
					break;
				}
			}
			if (!nested) {
				nonOverlappingUnscannedVisiblePosts.push(post);
			}
		}
		this.monitor.DATA(`nonOverlappingUnscannedVisiblePosts (${nonOverlappingUnscannedVisiblePosts.length}) = `, nonOverlappingUnscannedVisiblePosts);
		this.monitor.EXIT("filterPostWithinAPost");
		return nonOverlappingUnscannedVisiblePosts;
	};

	/**
	 * Visually highlight a newly found ad.
	 * @param {Node} The node of an ad.
	 **/
	FacebookScanner.prototype.highlightNewlyFoundAd = function(node) {
		if (!this.monitor.IS_PRODUCTION()) {
			d3.select(node).style("background-color", "#ffcc00")
				.transition()
				.duration(250)
					.style("background-color", "#ffcc00")
					.transition()
					.duration(1750)
						.style("background-color", "#ffffff");
		}
	};

	/**
	 * Apply the ProPublica scraper to a list of posts.
	 * @async
	 * @param {Node[]} A list of posts.
	 * @returns {Object[]} A list of ads.
	 **/
	FacebookScanner.prototype.applyScraper = function(unscannedVisiblePosts) {
		const NOT_AN_AD = "Not an ad";
		return new Promise(resolve => {
			this.monitor.ENTER("applyScraper");
			this.monitor.DATA(`unscannedVisiblePosts (${unscannedVisiblePosts.length}) =`, unscannedVisiblePosts);
			const rawResults = [];
			let adCount = 0;
			let notAdCount = 0;
			let adInAnAdCount = 0;
			const initialEmptyPromise = Promise.resolve(null);
			const applyScraperSequentiallyToPosts = (previousEmptyPromise, currentPost) => {
				return previousEmptyPromise.then(() => {
					return parser(currentPost).then(adAndNode => {
						const ad = adAndNode.ad;
						const node = adAndNode.node;
						this.monitor.DATA("Found ad.", {"ad": ad, "node": node});
						this.highlightNewlyFoundAd(node);
						adCount++;
						rawResults.push(adAndNode);
						previouslyScannedPosts.add(currentPost);
					}).catch(err => {
						this.monitor.ASSERT(err === NOT_AN_AD, err);
						this.monitor.DATA("Not an ad.", {"node": currentPost});
						notAdCount++;
						previouslyScannedPosts.add(currentPost);
					});
				});
			};
			unscannedVisiblePosts.reduce(applyScraperSequentiallyToPosts, initialEmptyPromise).then(() => {
				this.monitor.DATA(`previouslyScannedPosts = (${previouslyScannedPosts.size})`, previouslyScannedPosts);
				this.monitor.DATA(`rawResults (${rawResults.length}) =`, rawResults);
				this.monitor.EXIT("applyScraper");
				resolve({
					"rawResults": rawResults,
					"adCount": adCount,
					"notAdCount": notAdCount,
					"adInAnAdCount": adInAnAdCount,
				});
			});
		});
	};

	/**
	 * @type {Object[]} A list of existing ads.
	 **/
	const previouslyFoundAds = {};

	/**
	 * Remove duplicate ads.
	 * @param {Object[]} A list of newly found ads.
	 * @returns {Object[]} A list of deduped ads.
	 **/
	FacebookScanner.prototype.filterDuplicateAds = function(rawResults) {
		this.monitor.ENTER("filterDuplicateAds");
		this.monitor.DATA(`rawResults (${rawResults.length}) =`, rawResults);
		const dedupeResults = [];
		// dedupeResults is array of { ad: { parsed ad info }, node: <original DOM node> }
		// Skip any dedupeResults that have the same ID and overlap with previously found ads.
		rawResults.forEach(newAdRecord => {
			if (newAdRecord.ad.id) {
				const adId = newAdRecord.ad.id;
				if (adId in previouslyFoundAds) {
					const oldAdRecord = previouslyFoundAds[newAdRecord.ad.id];
					if (newAdRecord.node && oldAdRecord.node) {
						if (hasOverlappingBoundingRects(newAdRecord.node, oldAdRecord.node)) {
							this.monitor.DATA(`Found duplicate ads (ID = ${adId}).`, {"newAd": newAdRecord, "oldAd": oldAdRecord});
							return;
						}
					}
				}
				previouslyFoundAds[adId] = newAdRecord;
			}
			dedupeResults.push(newAdRecord);
		});
		this.monitor.DATA(`dedupeResults (${dedupeResults.length}) =`, dedupeResults);
		this.monitor.EXIT("filterDuplicateAds");
		return dedupeResults;
	};

	return [FacebookScanner];
})();

// Start an instance of the scanner.
new Scanner();