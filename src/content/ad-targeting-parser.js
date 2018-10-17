// modeled on https://github.com/propublica/facebook-political-ads/blob/master/backend/server/src/targeting_parser.rs

const [adTargetingParser] = (function() {
	"use strict";

	// Depends on Parsimmon parser library as P

	let P = require("parsimmon");




	let take_until = function(str) {
		let quoted = str.replace(/(?=[/\\^$*+?.()|{}[\]])/g, "\\");
		let re = new RegExp("(.*?)" + quoted);	// the ? makes (.*) non-greedy so the re only matches to the first occurence of str
		return P.regexp(re, 1);
	};

	let until_b = take_until("</b>");


	let list = take_until("added you to a list of people they want to reach on Facebook.").result({target: "List"});


	let engaged_with_content = P.alt(
		take_until("wants to reach people who engaged with them or their content."),
		take_until("wants to reach people who have engaged with them or with their content")
	).result({target: "EngagedWithContent"});


	let activity_on_the_facebook_family = take_until("wants to reach people based on their activity on the Facebook family of apps and services")
	.result({target: "Activity on the Facebook Family"});


	let like = P.alt(
		take_until("who like their"),
		take_until("whose friends like their"),
		take_until("Personen erreichen möchte, denen deren Seite gefällt.")
	)
	.result({target: "Like"});


	let school = P.seqMap(
		take_until("som har angivet skolen <b>"),
		take_until("</b> på"),
		(_, res) => { return {target: "Employer", segment: res}; }
	);

	let employer = P.seqMap(
		take_until("Personen erreichen möchte, die <b>"),
		take_until("</b> als Arbeitgeber"),
		(_, res) => { return {target: "Employer", segment: res}; }
	);

	let provider = P.alt(
		take_until("based on data provided by"),
		take_until("wir basierend auf Daten von")
	)
	.then(take_until("<b>"))
	.then(until_b.map(res => { return {target: "Agency", segment: res}; }));


	let advertiser_wants = P.seqMap(
		take_until("including that "),
		take_until(" wants to reach"),
		(_, res) => { return {target: "Advertiser", segment: res}; }
	);


	let advertiser_b = P.seqMap(
		P.alt(
			take_until("is that <b>"),
			take_until("is because <b>"),
			take_until("<b id=\"ad_prefs_advertiser\">")
		),
		until_b,
		(_, res) => { return {target: "Advertiser", segment: res}; }
	);


	let interest = P.seqMap(
		take_until("<b id=\"ad_prefs_interest\">"),
		until_b,
		(_, res) => { return {target: "Interest", segment: res}; }
	);


	let language = P.alt(
		P.seqMap(
			take_until("die <b>"),
			take_until("</b> sprechen"),
			(_, res) => { return {target: "Language", segment: res}; }
		),
		P.seqMap(
			take_until("who speak <b>"),
			P.string("\"").fallback(null),
			P.alt( take_until("\"</b>"), until_b ),
			(_, __, res) => { return {target: "Language", segment: res}; }
		)
	);


	let segment = P.alt(
		P.seqMap(
			P.alt(
				take_until("„<b>"),
				take_until("<b>\""),
				take_until("<b>„")
			),
			P.alt(
				take_until("\"</b>"),
				take_until("</b>“"),
				take_until("“</b>")
			),
			(_, res) => { return {target: "Segment", segment: res}; }
		),

		P.seqMap(
			take_until("an audience called '"),
			take_until("'"),
			(_, res) => { return {target: "Segment", segment: res}; }
		),

		P.seqMap(
			take_until("an audience called \""),
			take_until("\""),
			(_, res) => { return {target: "Segment", segment: res}; }
		)

	);


	let gender = P.seqMap(
		take_until("<b>"),
		P.alt(
			P.alt(
				P.string("men"),
				P.string("Männer"),
				P.string("mænd"),
				P.string("gli uomini"),
				P.string("män")
			).result( {target: "Gender", segment: "men"} ),

			P.alt(
				P.string("women"),
				P.string("Frauen"),
				P.string("kvinder")
			).result( {target: "Gender", segment: "women"} ),

			P.alt(
				P.string("people"),
				P.string("Personen"),
				P.string("personer"),
				P.string("le persone")
			).result( "" )
		),

		(_, res) => res

	);


	let website = P.seqMap(
		take_until("wants to reach "),
		P.string("people who have visited their website or used one of their apps"),
		(_, res) => {return {target: "Website", segment: res}; }
	);


	let retargeting = P.seqMap(
		take_until("<b>"),
		P.alt(
			P.string("people who may be similar to their customers"),
			P.string("Personen, die deren Kunden ähneln"),
			P.string("personer, som minder om deres kunder"),
			P.string("i nærheden af deres virksomhed for nylig"),
			P.string("kürzlich in der Nähe des Unternehmens"),
			P.string("nyss varit i närheten av företaget"),
			P.string("recently near their business")
		),
		(_, res) => { return {target: "Retargeting", segment: res}; }
	);


	let age = P.alt(
		P.seqMap(
			P.alt(
				P.string("zwischen"),
				P.string("im Alter von"),
				P.string("i alderen"),
				P.string("i åldern"),
				P.string("på"),
				P.string("di età")
			).trim(P.optWhitespace),
			P.alt(
				take_until("derover"),
				take_until("älter"),
				take_until("die in"),
				take_until("che vivono"),
				take_until(",")
			).trim(P.optWhitespace),
			(_, complete) => {return {target: "Age", segment: complete}; }
		),

		P.seqMap(
			P.string("age").trim(P.optWhitespace),
			P.string("s").fallback(null).trim(P.optWhitespace),
			P.string("d").fallback(null).trim(P.optWhitespace),
			P.alt(take_until(" who").trim(P.optWhitespace), until_b),
			(_, __, ___, complete) => { return {target: "Age", segment: complete}; }
		)
	);


	let max_age_parser = P.seqMap(
		P.alt(
			P.seqMap(
				take_until("and ").trim(P.optWhitespace),
				P.string("older"),
				(_, older) => { return older; }
			),

			P.seqMap(
				take_until("to ").trim(P.optWhitespace),
				P.digits,
				(_, actual_age) => { return actual_age; }
			),

			P.string("")
		),
		(max_age) => {
			if (max_age === "") {
				return undefined;
			}
			else if (max_age === "older") {
				return {target: "MaxAge", segment: undefined};
			}
			else {
				return {target: "MaxAge", segment: max_age};
			}
		}
	);


	let min_max_age = P.seqMap(
		P.digits.trim(P.optWhitespace).fallback(null),
		max_age_parser,
		(min_age, max_age) => {
			let r = [];
			r.push({target: "MinAge", segment: min_age});
			if (max_age) {
				r.push(max_age);
			}
			else if (min_age) {
				r.push({target: "MaxAge", segment: min_age});
			}
			return r;
		}
	);


	let region = P.seqMap(
		P.string("who").fallback(null).trim(P.optWhitespace),
		P.alt( P.string("live"), P.string("were recently") ),
		take_until("in").trim(P.optWhitespace),
		until_b,
		(_, __, ___, country) => { return [{target: "Region", segment: country}]; }
	);


	let city_state = P.seqMap(
		P.alt(
			take_until("near "),
			take_until("in"),
			take_until("af")
		).trim(P.optWhitespace),
		take_until(",").trim(P.optWhitespace),
		P.alt( take_until("wohnen oder"), until_b ),
		(_, city, state) => { return [{target: "City", segment: city}, {target: "State", segment: state}]; }
	);


	let age_and_location = P.seqMap(
		age.trim(P.optWhitespace).fallback(null),
		P.alt(city_state, region, P.succeed([])),
		(age, location) => {
			return [].concat(age, min_max_age.parse(age? age.segment || "" : "").value, location); //.filter(a => a && a.Targeting);
		}
	);

	let get_targeting = P.alt(
		P.seqMap(
			advertiser_b.fallback(null),
			P.alt(
				interest,
				retargeting,
				employer,
				school,
				website,
				provider,
				language,
				segment,
				like,
				list,
				activity_on_the_facebook_family
			).fallback(null),
			advertiser_wants.fallback(null),
			gender,
			age_and_location,
			P.regexp(/\. This.*$/), // use up the rest of the message

			(advertiser_first, sources_and_interests, advertiser_second, gender, location) => {
				return [].concat([advertiser_first, sources_and_interests, advertiser_second, gender], location)
					.filter(a => a && a.target);
			}
		),

		P.seqMap(
			advertiser_b.fallback(null),
			engaged_with_content.fallback(null),
			P.regexp(/\. This.*$/), // use up the rest of the message

			(advertiser_first, sources_and_interests) => {
				return [advertiser_first, sources_and_interests].filter(a => a && a.target);
			}
		)
	);


	// TODO
	// fails "and younger" differently from how PP does (PP: minAge === maxAge, this: no minAge or maxAge)



	/* for testing in REPL
	module.exports.get_targeting = get_targeting;
	*/

	// argument: the HTML text of the targeting node
	function getTargeting(targetingText) {
		let targets = get_targeting.parse(targetingText).value;
		if (!targets || targets.length === 0) {
			return undefined;
		}
		else {
			// separate out advertiser results
			// sometimes the advertiser is found twice, take only the first
			let advertisers = targets.filter(t => t.target === "Advertiser");
			let advertiser;
			if (advertisers.length > 0) {
				advertiser = advertisers[0].segment;
			}

			targets = targets.filter(t => t.target !== "Advertiser");

			// quick fixes
			// if maxage is unspecified, leave out that target
			targets = targets.filter(t => !(t.target === "MaxAge" && !t.segment));

			return {
				"advertiser": advertiser,
				"targets": targets
			};
		}
	}


	return [getTargeting];
})();