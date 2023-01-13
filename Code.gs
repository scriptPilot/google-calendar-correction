function onCalendarUpdate() {
  runCorrection(
    'Work',         // calendar name
    '2023-01-01',   // start date as YYYY-MM-DD
    event => {      // correction function
      event.colorId = event.transparency === 'transparent' ? 8 : 4
      return event
    }
  )
}

function resetProperties() {

  // Reset all last update values
  // Will allow a correction from the start date again
  PropertiesService.getUserProperties().deleteAllProperties()
  
}

function runCorrection(calendarName, startDate, correctionFunction) {

  // Log correction start
  console.info(`Correction started for calendar "${calendarName}".`)

  // Get calendar by name
  let calendar = null
  Calendar.CalendarList.list().items.forEach(cal => {
    if (cal.summaryOverride === calendarName || cal.summary === calendarName) calendar = cal
  })
  if (!calendar) throw new Error(`Calendar ${calendarName} not found.`)

  // Create date object from startDate
  startDate = new Date(parseInt(startDate.substr(0, 4)), parseInt(startDate.substr(5, 2)-1), parseInt(startDate.substr(8, 2)))

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
        console.error(`Failed to update event "${event.summary}".`)
        console.error(error)
      }

    // Original and corrected events are the same
    } else {
      console.info(`Skipped not corrected event "${event.summary}".`)
    }

  })

  // Save last update to properties
  PropertiesService.getUserProperties().setProperty(calendar.id, nextLastUpdate.toISOString())

  // Log correction end
  console.info('Correction completed.')
  
}