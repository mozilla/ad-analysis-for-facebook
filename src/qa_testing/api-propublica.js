/**
 * A class for accessing the ProPublica FBPAC ads API.
 * @class
 * @requires common/monitor.js
 **/
const [__ApiProPublica] = (function() {
	"use strict";

	/**
	 * Class for accessing the ProPublica FBPAC ads API.
	 * @class
	 **/
	const ApiProPublica = function() {
		this.monitor = new Monitor("ApiProPublica");
		this.monitor.KEY_ENTER("ApiProPublica");
		this.monitor.KEY_EXIT("ApiProPublica");
	};

	/**
	 * @constant {string} Base URL for the ProPublica API.
	 **/
	const API_URL = "https://projects.propublica.org/fbpac-api/ads/persona";

	/**
	 * @constant {Object} Default query with available options set to null.
	 **/
	const DEFAULT_QUERY = {
		"age_bucket": null,
		"location_bucket": null,
		"politics_bucket": null,
		"gender": null,
	};

	/**
	 * Build the API URL from an input query.
	 * @param {Object} query - API options.
	 * @returns {string} URL for the API request.
	 **/
	const getQueryUrl = function(query) {
		const url = new URL(API_URL);
		for (var p in query) {
			if (query.hasOwnProperty(p) && query[p] !== null) {
				url.searchParams.append(p, query[p]);
			}
		}
		return url.href;
	};

	/**
	 * Query the ProPublica FBPAC API.
	 * @param {number|undefined} options.age - Age between 0 and 99.
	 * @param {string|undefined} options.state - One of the 50 U.S. States, case sensitive.
	 * @param {string|undefined} options.gender - One of "male" or "female".
	 * @param {string|undefined} options.politics - One of "liberal" or "conservative".
	 * @param {number|undefined} options.page - Page to request. Each page contains 20 ads.
	 * @returns {Object} API results containing a list of ads in field "ads" among other fields.
	 **/
	ApiProPublica.prototype.query = function(options) {
		return new Promise(resolve => {
			this.monitor.ENTER("query");
			this.monitor.OPTIONS("options =", options);
			const query = Object.assign({}, DEFAULT_QUERY);
			if ("age" in options && options["age"] !== "") {
				query["age_bucket"] = options["age"];
			}
			if ("state" in options && options["state"] !== "") {
				query["location_bucket"] = options["state"];
			}
			if ("politics" in options && options["politics"] !== "") {
				query["politics_bucket"] = options["politics"];
			}
			if ("gender" in options && options["gender"] !== "--") {
				query["gender"] = options["gender"];
			}
			if ("page" in options && options["page"] !== "") {
				query["page"] = options["page"];
			}
			const url = getQueryUrl(query);
			this.monitor.OPTIONS("url =", url);
			fetch(url).then(response => {
				return response.json();
			}).then(json => {
				this.monitor.RESULTS("results =", json);
				if (json.ads) {
					json.ads.forEach(singleAd => {
						singleAd.timestamp = new Date(singleAd.created_at).getTime();
					});
				}
				this.monitor.EXIT("query");
				resolve(json);
			});
		});
	};

	return [ApiProPublica];
})();
