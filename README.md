# Google Calendar Correction

Apply corrections to Google Calendar events on a regular schedule to enforce golden rules.

Made with Google Apps Script, related to [Google Calendar Synchronization](https://github.com/scriptPilot/google-calendar-synchronization).

## Installation

1. [Backup all Google Calendars](https://calendar.google.com/calendar/u/0/r/settings/export) to be able to restore them if something went wrong.
2. Open [Google Apps Script](https://script.google.com/) and create a new project `Calendar Correction`.
3. Click at the `+` next to `Services`, add `Google Calendar API` `v3` as `Calendar`.
4. Replace the `Code.gs` file content with [this code](https://raw.githubusercontent.com/scriptPilot/google-calendar-correction/refs/heads/main/dist/Code.gs).

## Usage

The following examples are based on assumed calendars `Work` and `Family`.

### Correction

1. Click the `+` next to `Files` to add a new script file `onStart`:

    ```js
    function onStart() {

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

2. Save the changes, select the `Code.gs` file and run the `start` function.

    - Allow the prompt and grant the requested calendar access.
    - At the first run, all events after the [start date](#start-date) are corrected.
    - With any other run, only modified events are corrected.
    - The correction repeats automatically every minute by default.

3. To stop the correction, select the `Code.gs` file and run the `stop` function.

### Start Date

The start date is specified as the number of days in the past.

Example — correct all events since 7 days ago:

```js
runCorrection('Work', 7, correctionFunction)
```

Helper functions are available for common time ranges:

```js
startOfWeek(offset = 0)       
startOfMonth(offset = 0)
startOfQuarter(offset = 0)
startOfHalfyear(offset = 0)
startOfYear(offset = 0)
```

Example — correct all events since the beginning of last week:

```js
runCorrection('Work', startOfWeek(-1), correctionFunction)
```

### Multiple Calendars

Multiple calendars can be corrected within the same `onStart` function.

```js
function onStart() {
  runCorrection('Work', 7, workCorrectionFunction)
  runCorrection('Family', 7, familyCorrectionFunction)
}
```

### Correction Interval

The correction interval can be specified.

By default, the next correction is triggered after `1` minute.

This value can be increased, if the Google Calendar API quota is an issue.

```js
function onStart() {
  setCorrectionInterval(10)
  runCorrection('Work', 7, correctionFunction)
} 
```

### Maximum Execution Time

A fallback trigger starts the correction again, if the correction script is not completed within the maximum execution time.

By default, the maximum execution time is `6` minutes.

This value can be increased to make use of the increased Google Workspace limit of `30` minutes.

```js
function onStart() {
  setMaxExecutionTime(30)
  runCorrection('Work', 7, correctionFunction)
} 
```

### Script Reset

By default, only updated events are corrected. To apply modified rules you want to reset the script to allow a full correction again. This can be done by running the function `resetScript` manually.

## Update

To update the script version, replace the `Code.gs` file content with [this code](https://raw.githubusercontent.com/scriptPilot/google-calendar-correction/refs/heads/main/dist/Code.gs).

## Deinstallation

1. To stop the correction, select file `Code.gs` and run `stop()`.
2. Remove the Google Apps Script project.

## Support

Feel free to open an [issue](https://github.com/scriptPilot/google-calendar-correction/issues) for bugs, feature requests or any other question.
