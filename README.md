# Google Calendar Correction

Apply corrections to Google Calendar events on any update to enforce golden rules. Made with Google Apps Script.

## Installation

1. Open [Google Apps Script](https://script.google.com/) and create a new project `Google Calendar Corrections`
2. Replace `Code.gs` file content with [this code](Code.gs)
3. Modify the correction function in `onCalendarUpdate` according to your needs ([Google API Documentation](https://developers.google.com/calendar/api/v3/reference/events))
4. Click on the `+` next to `Services`, add `Google Calendar API v3` as `Calendar`
5. Save and run the function `onCalendarUpdate` and grant permissions (calendar access)

## Usage

1. Create a trigger for the `onCalendarUpdate` function, triggered by calendar updates

Now, on every calendar update, the events are corrected automatically if required.

### Multiple Calendars

1. Copy the `onCalendarUpdate` function, for example as `onWorkCalendarUpdate` or `onFamilyCalendarUpdate`
2. Create a trigger per calendar, select each time a different correction function and insert a different calendar ID

### Reset

To reset the user properties to allow a correction from the start date again, run the script `resetProperties()`.

## Changelog

### v1

- Initial release

## Developers

### Requirements

* [Node.js](https://nodejs.org/) and NPM installed
* [Command Line Apps Script Projects](https://github.com/google/clasp) installed globally

### Installation

1. Clone this repository
2. Run `clasp login` to login to Google if not done before
3. Run `clasp create --type standalone --rootDir lib --title "Google Calendar Corrections"` to create a new Apps Script Project

### Development

* Run `clasp open` to open the project in the [Cloud IDE](https://script.google.com/)
* Run `clasp push` to replace the remote files with the local ones
* Run `clasp pull` to replace the local files with the remote ones

### Build

* Run `node buildscript.js` to build the `Code.gs` file
