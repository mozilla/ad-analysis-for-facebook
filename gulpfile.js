// Load gulp
const gulp = require("gulp");

// Global constants
const IS_PRODUCTION = true;
const IS_QA_TESTING = false;
const NODE = "node_modules/";
const DIST = "dist/";

// Load logical flows
const iƒ = require("gulp-if");

// Load compilation and minification tools
const esLint = require("gulp-eslint");
const minifyJs = require("gulp-minify");
const less = require("gulp-less");
const cleanCss = require("gulp-clean-css");
const minifyHtml = require("gulp-htmlmin");

// Load additional utilities
const fs = require("fs");
const extReplace = require("gulp-ext-replace");
const rename = require("gulp-rename");
const browserify = require("browserify");
const vinylSourceStream = require("vinyl-source-stream");
const vinylBuffer = require("vinyl-buffer");

// Derive excluded directories
const EXCLUDE_DIRS = [];
if (IS_QA_TESTING) {
	EXCLUDE_DIRS.push("!src/sidebar/*");
}
else if (IS_PRODUCTION) {
	EXCLUDE_DIRS.push("!src/sidebar/*", "!src/qa_testing/*");
}

gulp.task("default", [
	"build",
	"watch"
]);

// Global tasks ----------------------------------------------------------------

gulp.task("globals", function() {
	const data = `const IS_PRODUCTION = ${IS_PRODUCTION};`;
	fs.writeFileSync("src/common/globals.js", data);
	return gulp.src("src/common/globals.js");
});

gulp.task("lib", function() {
	return gulp.src(IS_PRODUCTION ? [
			`${NODE}d3/dist/d3.min.js`,
			`${NODE}localforage/dist/localforage.min.js`,
			`${NODE}dompurify/dist/purify.min.js`,
		] : [
			`${NODE}d3/dist/d3.js`,
			`${NODE}localforage/dist/localforage.js`,
			`${NODE}dompurify/dist/purify.js`,
		])
		.pipe(extReplace(".js", ".min.js"))
		.pipe(gulp.dest(`${DIST}lib`));
});

gulp.task("lib:photon", function() {
	return gulp.src(`${NODE}photon-colors/photon-colors.less`)
		.pipe(gulp.dest("src/photon"));
});

gulp.task("lib:browserify", function() {
	return browserify()
		.require('parsimmon')
		.bundle()
		.pipe(vinylSourceStream('parsimmon-browserified.js'))
		.pipe(vinylBuffer())
		.pipe(iƒ(IS_PRODUCTION, minifyJs({
			"ext": {
				"src": "-combined.js",
				"min": ".js"
			},
			"noSource": true,
		})))
		.pipe(gulp.dest(`${DIST}lib`));
});

gulp.task("js:lint", function() {
	return gulp.src("src/**/*.js")
		.pipe(esLint())
		.pipe(esLint.format());
});

gulp.task("js:minify", function() {
	return gulp.src([
			"src/**/*.js"
		].concat(EXCLUDE_DIRS))
		.pipe(iƒ(IS_PRODUCTION, minifyJs({
			"ext": {
				"src": "-combined.js",
				"min": ".js"
			},
			"noSource": true,
		})))
		.pipe(gulp.dest(DIST));
});

gulp.task("less", function() {
	return gulp.src([
			"src/**/*.less",
			"!src/common/*.less",
			"!src/photon/*.less",
		].concat(EXCLUDE_DIRS))
		.pipe(less())
		.pipe(extReplace(".css"))
		.pipe(cleanCss())
		.pipe(gulp.dest(DIST));	
});

gulp.task("html", function() {
	return gulp.src([
			"src/**/*.html"
		].concat(EXCLUDE_DIRS))
		.pipe(minifyHtml({
			"collapseWhitespace": true,
			"removeComments": true,
		}))
		.pipe(gulp.dest(DIST));
});

gulp.task("assets:svg", function() {
	return gulp.src("src/**/*.svg")
		.pipe(gulp.dest(DIST));
});

gulp.task("assets:png", function() {
	return gulp.src("src/**/*.png")
		.pipe(gulp.dest(DIST));
});

gulp.task("assets:data", function() {
	return gulp.src([
			"data/*.json",
			"data/**/*.json",
			"data/**/*.tsv",
		])
		.pipe(gulp.dest(`${DIST}info`));
});

gulp.task("addon:manifest", function() {
	return gulp.src(IS_QA_TESTING ? "manifest-qa-testing.json" : "manifest-production.json")
		.pipe(rename("manifest.json"))
		.pipe(gulp.dest(DIST));
});

// ---------------------------------------------------------------------

gulp.task("build", [
	"globals",
	"lib", "lib:photon", "lib:browserify",
	"js:lint", "js:minify",
	"less",
	"html",
	"assets:svg", "assets:png", "assets:data",
	"addon:manifest"
]);

gulp.task("watch", function() {
	gulp.watch("src/**/*.js", ["js:lint", "js:minify"]);
	gulp.watch("src/**/*.less", ["less"]);
	gulp.watch("src/**/*.html", ["html"]);
	gulp.watch("src/**/*.svg", ["assets:svg"]);
	gulp.watch("src/**/*.png", ["assets:png"]);
	gulp.watch("data/*.json", ["assets:data"]);
	gulp.watch("manifest.json", ["addon:manifest"]);
});
