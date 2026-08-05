// Google Calendar Correction, build on 2026-08-05
// Source: https://github.com/scriptPilot/google-calendar-correction

function isSynchronizedEvent(event) {
  return event.extendedProperties?.private?.sourceCalendarId !== undefined
}

function isAlldayEvent(event) {
  const start = new Date(event.start.dateTime || event.start.date)
  const end = new Date(event.end.dateTime || event.end.date)
  return (end - start) % (24*60*60*1000) === 0
}

function isOOOEvent(event) {
  return event.eventType === 'outOfOffice'
}

function isBusyEvent(event) {
  return event.transparency !== 'transparent' && !isOOOEvent(event)
}


function isRecurringEvent(event) {
  return event.recurringEventId !== undefined
}

function isDeclinedByMe(event) {
  return event.attendees?.filter(attendee => attendee.email === Session.getEffectiveUser().getEmail())[0]?.responseStatus === 'declined'
}

function isOpenOrTentativeByMe(event) {
  const responseStatus = event.attendees?.filter(attendee => attendee.email === Session.getEffectiveUser().getEmail())[0]?.responseStatus
  return responseStatus === 'needsAction' || responseStatus === 'tentative'
}

function isOnWeekend(event) {
  const startDate = new Date(event.start.dateTime || event.start.date)
  return startDate.getDay() === 6 || startDate.getDay() === 0
}

// This function reset the script
function resetScript() {
  PropertiesService.getUserProperties().deleteAllProperties()  
  console.log('Script reset done.')
}

// This function runs the correction itself
function runCorrection(calendarName, startDate, correctionFunction) {

  // Log correction start
  console.info(`Correction started for calendar "${calendarName}".`)

  // Limit the runtime of a single script call to avoid the DEADLINE_EXCEEDED error
  const MAX_RUNTIME_MS = 3.5 * 60 * 1000

  // Page size of the events list request
  const PAGE_SIZE = 100

  // Check if an error indicates an expired page token
  const isGone = (error) => {
    const message = String((error && error.message) || '')
    return message.indexOf('GONE') >= 0 || message.indexOf('410') >= 0
  }

  // Call an API function and retry transient errors (e.g. Backend Error)
  const callWithRetry = (call, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return call()
      } catch (error) {
        if (attempt === maxAttempts || isGone(error)) throw error
        Utilities.sleep(1000 * attempt)
      }
    }
  }

  // Get calendar by name
  let calendar = null
  const calendarList = callWithRetry(() => Calendar.CalendarList.list({ showHidden: true })).items || []
  calendarList.forEach(cal => {
    if (cal.summaryOverride === calendarName || cal.summary === calendarName) calendar = cal
  })
  if (!calendar) throw new Error(`Calendar ${calendarName} not found.`)

  // Lock the script to avoid corrupt data
  // A short wait bridges a running script call without blocking queued calls for minutes
  const lock = LockService.getUserLock()
  if (!lock.tryLock(1000)) {
    console.info('Script call skipped because another script call is running.')
    return
  }

  try {

    // Calculate start date based on days in the past
    if (Number.isInteger(startDate)) {
      const dateObj = new Date()
      dateObj.setHours(0, 0, 0, 0)
      startDate = new Date(dateObj.setDate(dateObj.getDate() - startDate))

    // Accept YYYY-MM-DD to support v1
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      startDate = new Date(parseInt(startDate.substr(0, 4)), parseInt(startDate.substr(5, 2) - 1), parseInt(startDate.substr(8, 2)))

    // Try to create date as fallback solution
    } else if (!(startDate instanceof Date)) {
      startDate = new Date(startDate)
    }

    // Get last update from properties (if property is empty, last update will be 1970-01-01)
    const props = PropertiesService.getUserProperties()
    const lastUpdate = new Date(props.getProperty(calendar.id))

    // Remove old waiting marker that is no longer used
    props.deleteProperty(calendar.id + ':waiting')

    // Remember current time to save later as last update time
    const nextLastUpdate = new Date()

    // Deadline to stop this script call before the execution time is exceeded
    const deadline = Date.now() + MAX_RUNTIME_MS

    // Restore a saved pagination state to continue an unfinished correction
    // (this avoids restarting the whole correction after a timed out script call)
    const resumeKey = calendar.id + ':resume'
    let resume = null
    try {
      resume = JSON.parse(props.getProperty(resumeKey))
    } catch (error) {
      resume = null
    }

    // The pagination query must always use the exact same parameters
    let pageToken = null
    let queryUpdatedMin = lastUpdate
    let queryStartDate = startDate
    if (resume && resume.pageToken) {
      try {
        const resumeUpdatedMin = new Date(resume.updatedMin).getTime()
        const resumeStartDate = new Date(resume.startDate).getTime()
        if (resumeUpdatedMin === queryUpdatedMin.getTime() && resumeStartDate === queryStartDate.getTime()) {
          pageToken = resume.pageToken
          console.info('Resuming correction from saved progress.')
        }
      } catch (error) {
        // ignore invalid resume state
      }
    }

    // Get modified events (paginated), exclude deleted events
    let completed = false
    let page = 0
    while (!completed && Date.now() < deadline) {
      let response
      try {
        response = callWithRetry(() => Calendar.Events.list(
          calendar.id,
          {
            pageToken,
            showDeleted: false,
            timeMin: queryStartDate.toISOString(),
            updatedMin: queryUpdatedMin.toISOString(),
            maxResults: PAGE_SIZE
          }
        ))
      } catch (error) {
        // An expired page token forces a restart from the last update
        if (isGone(error)) {
          props.deleteProperty(resumeKey)
          pageToken = null
          queryUpdatedMin = lastUpdate
          queryStartDate = startDate
          console.info('Saved progress expired, restarting correction.')
          continue
        }
        throw error
      }

      // Loop modified events, exclude cancelled events
      const items = response.items || []
      let processedAll = true
      for (const event of items) {
        if (event.status === 'cancelled') continue
        if (Date.now() >= deadline) {
          processedAll = false
          break
        }

        // Apply correction function (it is important to deeply clone the object to avoid any reference)
        const correctedEvent = correctionFunction(JSON.parse(JSON.stringify(event)))

        // Compare events
        // JSON.stringify provides a reliable deep comparison
        const eventString = JSON.stringify(event)
        const correctedEventString = JSON.stringify(correctedEvent)
        const sameEvents = eventString === correctedEventString

        // Original and corrected events are not the same
        if (!sameEvents) {
          // Update event
          try {
            const updatedEvent = Calendar.Events.update(correctedEvent, calendar.id, correctedEvent.id)
            console.info(`Updated event "${updatedEvent.summary}".`)
            // Sleep to avoid rate limiting (500 requests per 100 seconds)
            Utilities.sleep(250)
          } catch (error) {
            console.info(`Failed to update event "${event.summary}".`)
            console.info(error)
          }
        }
      }

      // Only advance the pagination state after a fully processed page,
      // otherwise a timed out script call would skip the remaining events
      pageToken = response.nextPageToken
      if (processedAll) {
        page++
        if (pageToken) {
          props.setProperty(resumeKey, JSON.stringify({
            pageToken,
            updatedMin: queryUpdatedMin.toISOString(),
            startDate: queryStartDate.toISOString()
          }))
          console.info(`Processed page ${page}.`)
        } else {
          completed = true
          props.deleteProperty(resumeKey)
        }
      }
    }

    // Save last update to properties
    if (completed) {
      props.setProperty(calendar.id, nextLastUpdate.toISOString())
      console.info('Correction completed.')
    } else {
      console.info('Correction progress saved, continuation will follow.')
    }

  } finally {
    // Always release the lock
    lock.releaseLock()
  }
}
