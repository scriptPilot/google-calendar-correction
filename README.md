# Google Calendar Correction

Apply corrections to Google Calendar events on any update to enforce golden rules. Made with Google Apps Script.

Related to [Google Calendar Synchronization](https://github.com/scriptPilot/google-calendar-synchronization).

## Installation

1. Open [Google Apps Script](https://script.google.com/) and create a new project `Google Calendar Correction`
2. Replace `Code.gs` file content with [this code](dist/Code.gs)
3. Click at the `+` next to `Services`, add `Google Calendar API v3` as `Calendar`

## Usage

Click at the `+` next to `Files` to add a new script file, you can name it `onCalendarUpdate`.

Now you can copy and paste the following example code:

```js
function onCalendarUpdate() {
  runCorrection('Work', '2023-01-01', event => {     
    event.colorId = event.transparency === 'transparent' ? 10 : 11
    return event
  })
}
```

Or with comments:

```js
// This function is called by the trigger
// You should modify the name, start date and correction function to your needs
function onCalendarUpdate() {
  // Run the correction with some options
  runCorrection(
    // The name of the calendar
    'Work',         
    // The start date (YYYY-MM-DD, corrections are applied from this date)
    '2023-01-01',  
    // Correction function, event as input 
    event => {     
      // In this example, "busy" events are painted red, "free" events green 
      event.colorId = event.transparency === 'transparent' ? 10 : 11
      // Do not forget to return the corrected event
      return event
    }
  )
}
```

Further reading for the correction function: [Google API Documentation](https://developers.google.com/calendar/api/v3/reference/events) and [color IDs](https://storage.googleapis.com/support-forums-api/attachment/message-114058730-1008415079352027267.jpg)

Finally, save the changes and run the `onCalendarUpdate` function manually.

On the first run, you have to grant permissions (calendar access) to the script.

### Manually

Run the function `onCalendarUpdate()` to correct all events from the start date.

At the first run, all events after the start date are corrected. With any other run, only modified events after the start date are corrected.

### Trigger

Create a trigger for the `onCalendarUpdate` function, triggered by calendar updates and with the respected calendar id.

Now, on every calendar update, the events are corrected automatically if required.

### Multiple Calendars

Copy the `onCalendarUpdate` function, for example as `onWorkCalendarUpdate` or `onFamilyCalendarUpdate`.

```js
onWorkCalendarUpdate() {
  runCorrection('Work', '2023-01-01', event => {
    ...
    return event
  })
}
onFamilyCalendarUpdate() {
  runCorrection('Family', '2023-01-01', event => {
    ...
    return event
  })
}
```

Create a trigger per calendar, select each time a different `on...CalendarUpdate` function and insert a different calendar ID.

### Reset

After any modification to the `onCalendarUpdate` function, you should run the function `resetScript` to reset the script and allow correction of all events from the start date again accordingly.

## Changelog

### v1

- Initial release

### v1.1

- `onCalendarUpdate` function removed from the `Code.gs` file
- `.clasp.json` file removed from the repository

## Development

### Requirements

* [Node.js](https://nodejs.org/) and NPM installed
* [Command Line Apps Script Projects](https://github.com/google/clasp) installed globally

### Installation

1. Clone this repository
2. Run `clasp login` to login to Google if not done before
3. Run `clasp create --type standalone --rootDir lib --title "Google Calendar Correction"` to create a new Apps Script Project
4. Run `mv lib/.clasp.json .clasp.json` to move the CLASP config file to the project root

### Workflow

* Run `clasp push` to replace the remote files with the local ones
* Run `clasp open` to open the project in the [Cloud IDE](https://script.google.com/)
* Run `clasp pull` to replace the local files with the remote ones
* Run `node buildscript.js` to build the `Code.gs` file
