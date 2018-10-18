# System Design

This extension collects ad targeting information on Facebook, and presents the aggregated statistics to a Firefox user. All data collected is stored locally. No data leaves the add-on.

# High-level overview of the add-on

More specifically, this extension contains:
- A scanner that extracts ad targeting information from Facebook;
- Two user-facing tools (a door hanger and an information page); and
- Various utility code to support messaging and data storage.

## Scanner

After a user installs the extension, the scanner runs only when _all_ of the following conditions are met:
- The user turns on the scanner.
- The user navigates to a webpage matching `*://www.facebook.com/*` in a tab.
- The tab is _not_ in private browsing mode.

When running, the scanner examines DOM elements in the webpage that:

(A) Contain signatures of being a Facebook post and are currently visible in the view port.

On a laptop screen, there are usually between 1 and 3 posts visible in the view port at any given time. On some occasions, we've observed as many as 6+ posts simultaneously.

(B) The scanner then performs a check to see whether the above Facebook posts are advertisements.

(C) If a post is an ad, the scanner then extracts its targeting information.

### How does the scanner determine if a DOM element is a Facebook post?

By CSS class name `.userContentWrapper`.

### How does the scanner determine if a Facebook post is an advertisement?

Using a state machine that we adopted from the ProPublica PAC Add-on, we look for the string "Sponsored" within the DOM element's text in combination with a few other checks on CSS class names (e.g., `.clearfix a` or `.ego_section a`) and DOM element attributes (e.g., the width of the "Sponsor" element must be greater than 0 pixel).

### How does the scanner extract targeting information from an ad?

All Facebook posts contain a pop-up menu in the upper right corner. (Click on the "..." icon to reveal pop-up menu.) For ads, the pop-up menu contains an additional item labeled "Why am I seeing this?" Clicking on the menu item will bring up a "targeting information" window that describes targeting criteria the advertiser used to target the ad to the user.

When the scanner detects an ad, it simulates two user clicks: One to open the pop-up menu. One to select the "Why am I seeing this?" menu item. The scanner then reads the content of the targeting information window, and saves it to a local database.

## Door hanger

The door hanger provides a quick overview on how a user has been targeted for advertising. The door hanger also contains a settings panel where a user can turn on/off the scanner, as well as other key information such as the privacy policy for the extension.

## Information page

The information page provides a detailed summary on how a user has been targeted for advertising. The page also contains targeting information from 10,000+ users that was collected and released publicly by ProPublica. To clarify, we download the dataset from ProPublica but this extension does _not_ transmit any information to us or ProPublica.

## Messaging and data storage

The innerworkings of these utility code is described below.

# Data Flow - Internal (DataServer, Scanner, and UI)

All data flow in the extension goes through `DataServer` which runs in the background script.

`DataServer` communicates with three objects: `Scanner` in the content scripts, `DataInterface` in the UI, and `DataStorage` which manages persistant data storage.

## DataStorage

This extension stores four persistent variables. All read and write access to the persistent variables must go through the object `DataStorage`. There is only one instance of `DataStorage` running in the extension, inside of `DataServer`.

The four persistant variables are:
- `disableMonitor` is a boolean that specifies whether the scanner is disabled.
- `startDate` records the time when the scanner is first turned on or when the database is last cleared.
- `ads` contains an array of ads collected.
- `targets` contains an array of ad targeting information.

## DataServer

`DataServer` relays messages between `DataInterface` (i.e., running inside of user-facing tools including the door hanger and the information page) and `Scanner` (i.e., running in content scripts). `DataServer` also manages all read and write operations to the persistent variables through the only instance of `DataStorage` in the extension.

`DataInterface` and `Scanner` must send messages to `DataServer` to store and retrieve data. They do _not_ directly communicate with each other. They do _not_ have direct access to the persistant variables.

A complete list of all message keys is in the file `messages.js`. Messages with the prefix `MSG.UI` are sent by the UI to the background script. Messages with the prefix `MSG.SCANNER` are sent by the scanner to the background script. Messages with the prefix `MSG.BACKGROUND` are sent by the background script to either the UI or scanner.

`DataServer` communicates with `DataStorage` through asynchronous function calls.

### Monitoring and testing

All data flow in the extension goes through --- and can be monitored --- by observing `DataServer`. In fact, a `Monitor` object is available inside of `DataServer` and logs the complete state of the extension.

As a corollary, all states of the extension can be set --- and simulated and tested --- by firing the appropriate sequence of messages from `DataServer`.

## DataInterface

An instance of `DataInterface` runs inside of every UI element. `DataInterface` sends messages to/receives messages from the background scripts; abstracts away the messaging system; and presents the functionalities to the UI elements as asynchronous function calls.

`DataInterface` provides the following database-related functionalities to the UI.
- getMonitorStatus()
- getStartDate()
- getAllAds()
- getAllTargets()
- enableMonitor()
- disableMonitor()
- resetStartDate()
- clearDatabase()

`DataInterface` provides the following functionalities for the UI to control and observe the state of the scanner.
- startScanning()

In some cases, `DataInterface` combines multiple messages and provides higher-level functionalities to the UI, such as:
- computePublicTargetStats()

## Scanner

An instance of `Scanner` runs inside of each tab that matches `*://www.faceboom.com/*`

`Scanner` sends out the following events to notify background script of its state and progress:
- sendLoadedPageEvent()
- sendUnloadedPageEvent()
- sendStartedScanningMessage()
- sendFinishedScanningMessage()
- sendFoundAllPostsMessage()
- sendFoundVisiblePostsMessage()
- sendFoundVisibleAdsMessage()
- sendParsedNewAdsMessage()
- sendParsedNewTargetsMessage()

Inside of `Scanner`, the method `scanForAds()` controls the flow of a single scan, and sends out a timing report as its return value.

## Monitor

A `Monitor` object is used to log the state of all of the above classes. The `Monitor` object is tied to the flag `IS_PRODUCTION` in the `gulp` build environment. When `gulp` is set to production mode, all output from `Monitor` will be suppressed.

# Data Flow - External (DOM elements, remote sites, packaged data)

## Data written to DOM Elements

The extension _does not_ write to the webpage DOM directly, but _does_ send two types of UI events that can modify the webpage.

### Clicking on the menu icon of a Facebook post

The extension sends two `click` events to menu icon of a Facebook post. Visually, the menu icon is the `...` icon at the top right corner of a post. The first `click` event will cause the menu to open. After the menu loads, the second `click` event will cause the menu to close. The extension needs to load the menu in order to grab the "Why am I seeing this ad?" menu item.

The two `click` events may be fired as quickly as 50 millesconds apart, but sometimes up to 1 - 5 seconds apart until the scanner can identify the "Why am I seeing this?" menu item. The second `click` event will always fire after 10 seconds to close the menu.

Visually, depending on a user's network connection speed, machine, and other factors, a user may see the menu briefly rendered on screen (i.e., a quick flash <50ms) before the extension has a chance to close it.

### Restoring a user's text selection on the screen

When the extension clicks on the menu icon (see above) to open a Facebook post menu, if the user has any text selection in the webpage, the text selection will be cleared. Therefore, when the extension clicks again to close the menu, it attempts to restore the text selection.

Visually, a user may see their text selection (i.e., text that is highlighted and shown with a light blue background on the webpage) briefly cleared and restored (i.e., within <50ms) when the scanner is extracting ad targeting information.

## Data read from DOM Elements

When the extension determines that a Facebook post is an ad, it reads the `outerHTML` of the DOM element containing the ad, in order to extract the following four pieces of structured information from the ad.

- The title of the ad
- The text of the ad
- The advertiser's Facebook page URL
- Any "paid for by" disclosure required for political ads

The above information is saved to local storage, will not be used for rendering any DOM element, and will not be sent remotely in any way.

At the initial launch, the above information is stored but not used by the extension. In the future, we may use the the information to help users look up advertisers who target them or, conversely, identify prolific advertisers who exclude them. Any "look up" operation will be performed by downloading a public dataset into the extension, and matching the following strings against the dataset locally within the browser. No user data will leave the extension.

- Words in the title or text of an ad
- An advertiser's name or `page_id` from its Facebook page URL
- The paid-for-by sponsor string associated with an ad

For security, the `outerHTML` of the ad is first sanitized using DOMPurify and then passed through a second  `sanitizeAndCleanAdTargetingNode` function to remove known HTML elements and attributes that contain tracking code or personal data. Once the above four pieces of structured information are extracted, the `outerHTML` element is no longer referenced or stored.

https://github.com/mozilla/fb-online-targeting/blob/0a8bc8cd9b252fdc3b61edd8df8a0f6aed55d553/src/content/parser.js#L15
```
const cleanAdNode = sanitizeAndCleanAdTargetingNode(DOMPurify.sanitize(node.outerHTML));
```

## Data sent and recieved remotely

When the extension determines that a Facebook post is an ad, it opens the menu associated with the ad, and retrieves the URL in menu item "Why am I seeing this?".

### Outgoing data

The extension then sends a AJAX request based on the URL above, to retrieve the content of the "Why am I seeing this?" pop-up window. This request is the only data leaving the extension for a remote server.

### Incoming data

The extension uses the AJAX response to extract targeting information associated with the ad. This response is the only data coming into the extension from a remote server.

The extracted "targeting information" is a list of items where each item containts two strings.
- `targetType` is a high-level targeting description, e.g., "Location", "Gender", "Interest"
- `targetValue` is a low-level targeting attribute, e.g. You've been targeted because you live in "San Francisco, California" or because you are a "woman" or because you are interested in "Computer programming".

The AJAX response contains some JavaScript code at its head, e.g. `for (;;);`, followed by a valid stringified DOM element. For security, the AJAX response is first sanitized using DOMPurify, constructed as a Node object, passed through the `sanitizeAndCleanAdTargetingNode` function (see above), and the flattened back to a string using `innerHTML`. After targeting information is extracted from the string, it is no longer referenced or stored.

https://github.com/mozilla/fb-online-targeting/blob/0a8bc8cd9b252fdc3b61edd8df8a0f6aed55d553/src/content/parser.js#L350-L353

```
const cleanTargetingNode = sanitizeAndCleanAdTargetingNode(
  JSON.parse(req.response.replace("for (;;);", ""))["jsmods"]["markup"][0][1]["__html"]
);
const targetingHtml = DOMPurify.sanitize(cleanTargetingNode.innerHTML.replace(/&amp;/g, "&"));
```

## Remote data packaged into the extension

The extension contains data from two public datasets released by [ProPublica](https://projects.propublica.org/facebook-ads/) and [New York University](https://engineering.nyu.edu/online-political-ads-transparency-project/).

The original datasets are available at https://www.propublica.org/datastore/dataset/political-advertisements-from-facebook and https://github.com/online-pol-ads/FacebookApiPolAdsCollector, respectively.

# Instructions 
## Load the Add-on in Firefox

Enter `about:debugging` in the address bar. Load the Add-on as a temporary extension by selecting `dist/manifest.json`.

## Set up a development environment

To install the required libraries, run:
```
npm install
```

To start the continuous build system, run:
```
npm start
```
The above script will automatically monitor the `src` folder and regenerate relevant files in the `dist` folder including linting `*.js` files, minifying `*.js` and `*.html` files, and compiling `*.less` into `*.css`.
