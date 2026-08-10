# Development

This is about the development of this repository.

Feel free to open an [issue](https://github.com/scriptPilot/google-calendar-correction/issues) for bugs, feature requests or any other question.

## Requirements

* [Node.js](https://nodejs.org/) and NPM installed
* [Command Line Apps Script Projects](https://github.com/google/clasp) installed globally

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/scriptPilot/google-calendar-correction.git
   ```

2. Login to Google Apps Script CLI:

    ```
    clasp login
    ```
3. Create a new Google Apps Script project:

    ```
    clasp create --type standalone --rootDir lib --title "Google Calendar Correction"
    ```

## Workflow

1. Apply changes to the code and documentation.
2. Push the changes to the [Cloud IDE](https://script.google.com/) and open the project:

    ```
    clasp push && clasp open-script
    ````
3. Test the changes in the Cloud IDE according to the documentation.
4. Build the `dist/Code.gs` file:

    ```
    node buildscript.js
    ```

5. Update the changelog.
6. Set a new version tag in GitHub Desktop.
7. Commit and push the changes to GitHub.

## Changelog

### v1

- Initial release

### v1.1

- `onCalendarUpdate` function removed from the `Code.gs` file
- `.clasp.json` file removed from the repository

### v1.2

- consider hidden calendars

### v2

- lock script to avoid parallel run
- accept differnt types of starDate
- lot of helper functions
- updated documentation

### v2.1

- improved locking and error handling to avoid parallel script runs and quota errors

### v2.3

- show event update errors as information only to avoid script failure
- do not show log for not corrected events

### v2.4

- calendar-trigger-based execution with locking

### v2.5

- fix `DEADLINE_EXCEEDED` failures caused by unbounded processing and the trigger/lock storm
- limit the runtime of a single script call to a time budget
- save pagination state so a timed out run continues instead of restarting from scratch
- use a short lock wait instead of blocking queued trigger calls for up to 30 minutes
- retry transient API errors (e.g. `Backend Error`) and expired pagination tokens
- add progress logs to follow the correction of large calendars

### v3.0

- replace calendar-trigger-based execution with time-based triggers to eliminate race conditions
- `onCalendarUpdate` entry point replaced by `onStart`
- add `start()`, `stop()` and `startFallback()` functions for trigger management
- add `setCorrectionInterval()` and `setMaxExecutionTime()` for configuration
- remove locking (no longer needed with sequential time-based triggers)
- remove pagination save/resume (no longer needed without concurrent runs)
- restructure source code into `lib/` and `lib/helper/` directories
- add `isOpenByMe`, `isAcceptedByMe`, `isTentativeByMe` helper functions
- simplify `pastDays` parameter (only integer, like sync project)
- add `startOfWeek`, `startOfMonth`, `startOfQuarter`, `startOfHalfyear`, `startOfYear` date helpers

### v3.1

- add lock (`LockService.getScriptLock()`) to `start()` to prevent parallel executions from the fallback trigger
- fix `setMaxExecutionTime()` was ignored by `runCorrection()` – now reads `onStart.maxExecutionTime` with 30s safety margin

### v3.2

- re-add pagination resume: save page token and page number so timed-out runs continue from where they left off
- share one deadline across all `runCorrection` calls within `onStart`, abort 5s before with 60s safety margin
- `setMaxExecutionTime()` only logs when explicitly overridden
- fallback trigger interval now `max(correctionInterval + 1, maxExecutionTime)`
- add `AGENTS.md` with development workflow instructions
