// This function runs the correction itself
function runCorrection(calendarName, startDate, correctionFunction) {
  // Log correction start
  console.info(`Correction started for calendar "${calendarName}".`)

  // Get calendar by name
  let calendar = null
  Calendar.CalendarList.list({ showHidden: true }).items.forEach(cal => {
    if (cal.summaryOverride === calendarName || cal.summary === calendarName) calendar = cal
  })
  if (!calendar) throw new Error(`Calendar ${calendarName} not found.`)

  // Lock the script to avoid corrupt data (up to 30 Min)
  const lock = LockService.getUserLock()
  try {
    lock.waitLock(30 * 60 * 1000)

    // Allow only one waiting script per correction job (now inside lock)
    const waitingKey = calendar.id + ':waiting'
    const waitingValue = PropertiesService.getUserProperties().getProperty(waitingKey)
    if (waitingValue === 'yes') {
      console.info('Script call cancelled because another script call is already waiting.')
      return
    } else {
      PropertiesService.getUserProperties().setProperty(waitingKey, 'yes')
    }

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
    const lastUpdate = new Date(PropertiesService.getUserProperties().getProperty(calendar.id))

    // Remember current time to save later as last update time
    const nextLastUpdate = new Date()

    // Get modified events
    // Exclude deleted events
    const modifiedEvents = []
    let pageToken = null
    while (pageToken !== undefined) {
      const response = Calendar.Events.list(
        calendar.id,
        {
          pageToken,
          showDeleted: false,
          timeMin: startDate.toISOString(),
          updatedMin: lastUpdate.toISOString()
        }
      )
      modifiedEvents.push(...response.items)
      pageToken = response.nextPageToken
    }

    // Loop modified events
    modifiedEvents.forEach(event => {
      // Apply correction function (it is important to destructure the object to avoid any reference)
      const correctedEvent = correctionFunction({ ...event })

      // Compare events
      // Get keys, order them and connect their values as a long string
      const eventString = Object.keys(event).sort().map(key => event[key]).join('')
      const correctedEventString = Object.keys(correctedEvent).sort().map(key => correctedEvent[key]).join('')
      const sameEvents = eventString === correctedEventString

      // Original and corrected events are not the same
      if (!sameEvents) {
        // Update event
        try {
          const updatedEvent = Calendar.Events.update(correctedEvent, calendar.id, correctedEvent.id)
          console.info(`Updated event "${updatedEvent.summary}".`)
        } catch (error) {
          console.info(`Failed to update event "${event.summary}".`)
          console.info(error)
        }
      // Original and corrected events are the same
      } else {
        console.info(`Skipped not corrected event "${event.summary}".`)
      }
    })

    // Save last update to properties
    PropertiesService.getUserProperties().setProperty(calendar.id, nextLastUpdate.toISOString())

    // Reset waiting script value
    PropertiesService.getUserProperties().setProperty(waitingKey, 'no')

    // Log correction end
    console.info('Correction completed.')
  } finally {
    // Always release the lock
    lock.releaseLock()
  }
}