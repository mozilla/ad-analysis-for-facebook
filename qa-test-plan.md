# QA Test Plan

# (INST) Installation

## (1) Toolbar icon
- Action: Install the extension.
- [ ] Verify an icon now appears in the toolbar.

## (2) Door hanger
- Action: Click on toolbar icon.
- [ ] Verify a door hanger opens below the toolbar icon.
- [ ] Verify the ad analysis switch is in the "ON" state.
- [ ] Verify there is a "Visit Facebook to start collectin ads" message.
- [ ] Verify there is a "View More Information" button.

## (3) Turn off an analysis
- Action: In the door hanger, click on the ad analysis switch.
- [ ] Verify the ad analysis switch is in the "OFF" state.

## (4) Turn on an analysis
- Action: In the door hanger, click on the ad analysis switch.
- [ ] Verify the ad analysis switch is back in the "ON" state.

# (DL) Download sample ads for testing

## (1) Download ads
- Action: Open the add-on debug console
  - Open `about:debugging` in Firefox.
  - Find this extension in the listing: `ad-analysis-for-facebook`.
  - Click on the `Debug` button and then select `OK` to enable debugging.
  - This will open up a debug console in a new window titled `Developer Tools - ad-analysis-for-facebook`
- Action: Download about 100 ads from a public dataset whose API is at `projects.propublica.org/facebook-ads/ads` and insert them into the extension's local data storage. 
  - Go to the `Console` tab in the debug console.
  - At the bottom of the `Console` tab, execute the command `__insertRandomAdsFromProPublica()`.
  - You should see console output similar to the following:
```
Database has 0 ads.
Fetching approximately 95 random ads from ProPublica - this may take a few seconds.
Got 19 ads.
Got 38 ads.
Got 57 ads.
Got 76 ads.
Got 95 ads.
Database has 95 ads.
Finished fetching ads from ProPublica.
```
  - [ ] Please note the number of ads in the database. You'll need this number for steps `(DH-C)(1)` and `(DB)(1)` below.
  
# (DH-C) Door Hanger - Content

## (1) Visual presentation
- Action: Click on this extension's toolbar icon to open the door hanger.
- Please verify the following displays
  - [ ] Extension status should be still "ON".
  - [ ] You should see a box with text "95 ads collected" or similar.
  - [ ] You should see various "targeting types" each represented by its name, its a count, and a bar chart. Examples of targeting types are "Age", "Location", "Advertiser categories", etc.
  - [ ] You should see various "targeting values" each represented as a tag. Examples of targeting values are "Bernie Sanders", "US Politics (liberal)", etc.
  - [ ] You should see an additional option "Clear all collected ads".
- NOTE: The above data is based on random ads from ProPublica, and is not connected to your actual Facebook profile.

# (DB) Database

## (1) Stored data is persistent between browser sessions
- Action: Restart Firefox.
  - Quit Firefox.
  - Start Firefox again.
  - Click on the toolbar icon to open the door hanger.
- [ ] Verify the number of ads collected is the same as above.

## (2) Clear stored data
- Action: Clear all collected ads.
  - Open the door hanger.
  - Click on the button "Clear all collected ads".
- [ ] The door handger should slide left to a confirmation panel.
- Action: Confirm to clear all ads.
  - Click on the button "Clear now".
  - Click on the title to slide back to the main panel.
- [ ] Verify the number of ads collected is now zero.
- [ ] Verify the "Visit Facebook to start collecting ads" message is back.
- [ ] Verify the "targeting categories" row is now hidden (because there is no data to display).
- [ ] Verify the "targeting values" row is now hidden (because there is no data to display).
- [ ] Verify the "Clear all collected ads" button is now hidden (because there is no data to display).

# (SCAN) Scanning for Ads

## (1) Scan for an ad in Facebook
- Action: Navigate to Facebook and look for an ad in the newsfeed.
  - Open `www.facebook.com` in Firefox.
  - Log into Facebook. If you do not have an account, please contact @jcchuang for access to some research accounts.
  - Scroll through the newsfeed (i.e. scroll down the page at a pace you would normally read the newsfeed) and look for ads (i.e, They are marked by the label "Sponsored" in the upperleft corner of a Facebook post.)
  - There is usually an ad after about 10 - 20 posts.
  - Please skip the rest of this section `(SCAN)` and skip test `(SET)(2)` if you don't see any ads within 2 - 5 minutes, or if you have an ad blocker installed.
  - Open the door hanger.
- [ ] Verify the number of ads is now "1 ad collected".
- [ ] Verify the "targeting categories" row is now visible again (with some data).
- [ ] The "targeting values" row may or may not be visible depending on whether the extension was able to identify targeting values for the ad you just saw.

## (2) Scan for a second ad in Facebook
- Action: Look for a second ad in the Facebook newsfeed.
  - Continue to scroll through the newsfeed, and look for ads.
- [ ] Verify the number of ads is now "2 ads analyzed" or more.
- [ ] The "targeting categories" row may be updated (depending on what targeting data was extracted from the ads).
- [ ] The "targeting values" row may be updated (depending on ads).

# (INFO) Information Page

## (1) Open information page
- Action: In the door hanger, click on "View More Information".
- [ ] You should see a local webpage open in your browser titled "Ad Analysis for Facebook".

## (2) Your targeting data
- Action: Scroll down to the section "How Facebook uses what it knows".
- [ ] You should see a display of your ad targets inside of a tab, showing targeting types with a bar chart below each type.

## (3) Public targeting data
- Action: Click on the tab "Public targeting data"
- [ ] You should see a display of a public dataset in the tab, showing targeting types such as "Age", "Location", "Similarity to an audience profile", etc.

## (4) Show detailed targeting information
- Action: In either "Your Targeting Data" or "Public Targeting Data" tab, click on the control "Show Targets".
- [ ] You should see a list of targeting values, displayed as tags.

## (5) Hide detailed targeting information
- Action: Click on the control "Hide Targets".
- [ ] You should no longer see the list of targeting values.

## (6) U.S. political ads
- Action: Scroll down to the section "Peek outside your filter bubble"
- [ ] You should see two drop-down menus about location and time frames.
- [ ] The default location should be "All 50 States and the District of Columbia".
- [ ] The default time frame should be "Week ending Sunday, September 30, 2018" or a similar date.

## (7) Select political ads by state
- Action: Choose a state from the drop down menu.
- [ ] Verify that the list of top advetisers refreshes.

## (8) Select political ads by time
- Action: Choose another time frame from the drop down menu.
- [ ] Verify that the list of top advetisers refreshes.

## (9) Display individual ads
- Action: Click on an advertiser.
- [ ] Verify that a new tab opens, showing you the search results for the advertiser in the Facebook Ad Archive.

# (AT) Additional Tests

## (1) Private browsing
- Action: Open door hanger in a private-browsing window.
- [ ] Verify ad analysis is "OFF" in the private-browsing door hanger.
- [ ] Verify a "not allowed" cursor appears when you mouseover the on-off switch.
- [ ] Verify that clicking on the on-off switch has no effect.
- Action: Click on "Show More Information" to open the information page.
- [ ] Verify that "Your Targeting Data" tab is disabled in the private-browsing information page.
- [ ] Verify a "not allowed" cursor appears when you mouseover the "Your Targeting Data" tab.
- [ ] Verify that clicking on the "Your Targeting Data" tab has no effect.

## (2) Other Operating Systems
- Action: Repeat section `(DH-C)` using Firefox running in another Operation System.
- [ ] Verify all visual presentations render properly.
