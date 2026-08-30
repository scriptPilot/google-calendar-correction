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
- retry `Backend Error` with up to 5 attempts and doubled backoff instead of failing after 3 short retries
- `setMaxExecutionTime()` only logs when explicitly overridden
- fallback trigger interval now `max(correctionInterval + 1, maxExecutionTime)`
- add `AGENTS.md` with development workflow instructions

### v3.3

- skip calendar when deadline already passed instead of erroring with "Invalid argument"
- validate `lastUpdate` property value to guard against corrupted data

### v3.4

- replace `updatedMin`-based change detection with `syncToken`-based incremental sync
- fix extreme slowness with thousands of events in the trash: `updatedMin` makes the API return every event deleted since that time regardless of `showDeleted`, so the first run paginated through the whole trash
- increase page size from 25 to 2500 (API maximum) to reduce the number of API calls by a factor of 100
- full sync uses `showDeleted: true` and saves the `nextSyncToken` of the last page; incremental syncs pass only `syncToken` and finish with a single API call when nothing changed
- skip deleted (`cancelled`) events and events outside the correction window client-side (`timeMin`/`updatedMin` are not allowed together with `syncToken`)
- restart with a full sync when the sync token expired (`410 GONE`)
- fix a timed-out page could be skipped entirely (the page token was advanced before saving, now the page is refetched on resume)
- fix a `null` page token could be persisted as the string `"null"`, breaking all subsequent runs
- clean up legacy `lastUpdate` properties from previous versions
- fix README example for date helpers: `startOfWeek(-1)` points to the beginning of next week, the beginning of last week is `startOfWeek(1)` (helper unchanged, consistent with the synchronization project)
