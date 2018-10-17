// modeled on https://github.com/propublica/facebook-political-ads/blob/master/backend/server/src/models.rs

const [adParser] = (function() {
	"use strict";


	function getTitle(adNode) {
		let titleNode = adNode.querySelector("h5 a, h6 a, strong, span.fsl");
		if (titleNode) {
			return(titleNode.textContent);
		}
		else {
			return undefined;
		}
	}

	function getMessage(adNode) {
		let selectors = [".userContent p", "div.mbs", "span"];
		let iters = selectors.map(s => adNode.querySelector(s));
		return iters.map(n => n ? n.textContent : "").join(" ");
	}

	// not working, always undefined
	function getPaidForBy(adNode) {
		let nodes = adNode.querySelectorAll("._5pcq ._3nlk");
		if (nodes.length >= 2) {
			return nodes[1].textContent;
		}
		else {
			return undefined;
		}
	}

	function getAuthorLink(adNode) {
		let node = adNode.querySelector(".fwb a");
		if (node) {
			return node.getAttribute("href");
		}
		else {
			return undefined;
		}
	}

	function getAdInfo(adNode) {
		let page = getAuthorLink(adNode);

		/**
		 * An object containing ad information, with the following properties.
		 * @type {string} title - Title of the ad.
		 * @type {string} message - Text of the ad.
		 * @type {string} paid_for_by - Required for political ads.
		 * @type {string} page - URL of the advertiser's Facebook page.
		 **/
		let adInfo = {
			"title": getTitle(adNode),
			"message": getMessage(adNode),
			"paid_for_by": getPaidForBy(adNode),
			"page": page,
		};

		return adInfo;
	}


	function getTargetingInfo(targetingHTML) {
		let targetingInfo = {};

		if (targetingHTML) {
			/**
			 * An object containing advertiser info and a list of targets, with the following properties.
			 * @type {string} advertiser - Name of advertiser.
			 * @type {Object[]} targets - A list of targets.
			 * @type {string} targets.target - Target type.
			 * @type {string} targets.segment - Target value.
			 **/
			let advertiserAndTargets = adTargetingParser(targetingHTML);
			if (advertiserAndTargets) {
				targetingInfo.targets = advertiserAndTargets.targets;
				if (advertiserAndTargets.advertiser) {
					targetingInfo.advertiser = advertiserAndTargets.advertiser;
				}
				else {
					targetingInfo.advertiser = "";
				}
			}
		}

		/**
		 * An object containing advertiser info and a list of targets, with the following properties.
		 * @type {string} advertiser - Name of advertiser or the URL of the advertiser's Facebook page.
		 * @type {Object[]} targets - A list of targets.
		 * @type {string} targets.target - Target type.
		 * @type {string} targets.segment - Target value.
		 **/
		return targetingInfo;
	}

	return [{
		"getAdInfo": getAdInfo,
		"getTargetingInfo": getTargetingInfo,
	}];

})();