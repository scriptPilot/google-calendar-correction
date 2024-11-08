# Google Calendar Correction

Apply corrections to Google Calendar events on any update to enforce golden rules.

Made with Google Apps Script, related to [Google Calendar Synchronization](https://github.com/scriptPilot/google-calendar-synchronization).

## Installation

1. Backup all Google Calendars to be able to restore them if something went wrong.
2. Open [Google Apps Script](https://script.google.com/) and create a new project `Calendar Correction`.
3. Replace the `Code.gs` file content with [this code](https://raw.githubusercontent.com/scriptPilot/google-calendar-correction/refs/heads/main/dist/Code.gs).
4. Click at the `+` next to `Services`, add `Google Calendar API` `v3` as `Calendar`.

## Usage

The following examples are based on assumed calendars `Work` and `Family`.

### Correction

1. Click the `+` next to `Files` to add a new script file `onCalendarUpdate`:

    ```js
    function onCalendarUpdate() {

      // Correction function
      function correctionFunction(event) {

        // Enforce the default calendar color
        event.colorId = '0'

        // Do not forget to return the event
        return event
        
      }

      // Run correction, start 7 days in the past
      runCorrection('Work', 7, correctionFunction)

    }
    ```

2. Save the changes and run the `onCalendarUpdate` function manually.

    - Allow the prompt and grant the requested calendar access.
    - At the first run, all events within the [time range](#time-range) are corrected.
    - With any other run, only modified events are corrected.

3. On the left menu, select "Trigger" and add a new trigger:

    - run function `onCalendarUpdate`
    - trigger source `calendar`
    - calendar email `work-calendar-id` (to be found in the Google Calendar settings)

Now, any change to the `Work` calendar is being corrected.

Further reading for the correction function: [Google API Documentation](https://developers.google.com/calendar/api/v3/reference/events) and [color IDs](https://storage.googleapis.com/support-forums-api/attachment/message-114058730-1008415079352027267.jpg).

### Start Date

As start date you have several options.

```js
// Number of days in the past
runCorrection('Work', 7, correctionFunction)

// String in format "YYYY-MM-DD"
runCorrection('Work', '2020-31-12', correctionFunction)

// A date object
const dateObj = new Date()
dateObj.setHours(0, 0, 0, 0)
dateObj.setDate(dateObj.getDate() - 7)
runCorrection('Work', dateObj, correctionFunction)

```

### Helper Functions

There are a couple of helper function available to support the correction function.

```js
isSynchronizedEvent(sourceEvent) // true if synchronized from any other calendar
isRecurringEvent(sourceEvent)    // true if recurring event
isOOOEvent(sourceEvent)          // true if out of office event
isAlldayEvent(sourceEvent)       // true if allday event
isOnWeekend(sourceEvent)         // true if on Saturday or Sunday
isBusyEvent(sourceEvent)         // true if status is busy
isOpenByMe(sourceEvent)          // true if needs action by me
isAcceptedByMe(sourceEvent)      // true if accepted by me
isTentativeByMe(sourceEvent)     // true if responded tentative by me
isDeclinedByMe(sourceEvent)      // true if declined by me
```

### Multiple Calendars

#### Same correction function

```js
function onWorkCalendarUpdate() {
  runCorrection('Work', correctionStartDate, correctionFunction)
}

function onFamilyCalendarUpdate() {
  runCorrection('Family', correctionStartDate, correctionFunction)
}
```

Do not forget to configure two triggers respectively.

#### Different correction function

```js
function onWorkCalendarUpdate() {
  runCorrection('Work', correctionStartDate, workCorrectionFunction)
}

function onFamilyCalendarUpdate() {
  runCorrection('Family', correctionStartDate, familyCorrectionFunction)
}
```

Do not forget to configure two triggers respectively.

### Script Reset

By default, only updated events are corrected. To apply modified rules you want to reset the script to allow a full correction again. This can be done by running the function `resetScript` manually.

For test purpose, you can also add it to the beginning of the `onCalendarUpdate` function. Do not forget to remove it again after completing the development.

## Update

To update the script version, replace the `Code.gs` file content with [this code](https://raw.githubusercontent.com/scriptPilot/google-calendar-correction/refs/heads/main/dist/Code.gs).

## Deinstallation

Remove the Google Apps Script project. This will also remove all triggers.

## Support

Feel free to open an [issue](https://github.com/scriptPilot/google-calendar-correction/issues) for bugs, feature requests or any other question.
