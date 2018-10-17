/**
 * @requires background/data-server.js
 * @requires background/api-propublica.js
 * @requires background/background.js
 **/
const [__insertAdsFromProPublica, __insertRandomAdsFromProPublica] = (function() {

	// Temporary debugging code to simulate user data by importing from the ProPublica database.
	// Intended for QA Testing only.
	const apiProPublica = new __ApiProPublica();
	const dataStorage = new DataStorage();
	const insertAdsFromProPublica = function(queryOptions, pageCount = 1, pageProb = 1.0, logToConsole = false) {
		return new Promise(resolve => {
			const ads = [];
			const pageIndices = [];
			for (let i = 0; i < pageCount; i++) {
				pageIndices.push(i);
			}
			const calls = pageIndices.map(pageIndex => {
				return new Promise(resolve => {
					const options = Object.assign(queryOptions, {"page": pageIndex});
					apiProPublica.query(options).then(results => {
						results.ads.forEach(ad => {
							if (Math.random() <= pageProb) {
								ads.push(ad);
							}
						});
						if (logToConsole) {
							console.log("Got", ads.length, "ads");
						}
						resolve();
					});
				});
			});
			Promise.all(calls).then(() => {
				dataStorage.storeAds(ads).then(() => {
					resolve();
				});
			});
		});
	};

	// Choose a random facet and value and import approximately 100 ads from ProPublica
	const insertRandomAdsFromProPublica = function() {
		const SEARCH_FACETS = [
			{
				"facet": "state",
				"values": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
					"Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
					"Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
					"New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
					"Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
					"Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
			},
			{
				"facet": "politics",
				"values": ["liberal", "conservative"],
			},
			{
				"facet": "gender",
				"values": ["female", "male"],
			},
			{
				"facet": "age",
				"values": [],
			}
		];

		for (let i = 13; i < 90; i++) {
			SEARCH_FACETS[3].values.push(i);
		}

		const facet = SEARCH_FACETS[Math.floor(Math.random() * SEARCH_FACETS.length)];
		const value = facet.values[Math.floor(Math.random() * facet.values.length)];
		const pageCount = Math.floor(Math.random() * 10) + 5;
		const pageProb = 5.0 / pageCount;

		const queryOptions = {};
		queryOptions[facet.facet] = value;

		dataStorage.getAllAds().then(adsBefore => {
			console.log("Database has", adsBefore.length, "ads.");
			console.log("Fetching approximately 95 random ads from ProPublica - this may take up to a minute.");
			insertAdsFromProPublica(queryOptions, pageCount, pageProb, true).then(() => {
				__server.sendDatabaseEvent();
				dataStorage.getAllAds().then(adsAfter => {
					console.log("Database has", adsAfter.length, "ads.");
					console.log("Finished fetching ads from ProPublica.");
				});
			});
		});
	};

	return [insertAdsFromProPublica, insertRandomAdsFromProPublica];
})();
