function runCorrection(calendarName, pastDays, correctionFunction) {

  console.info(`Correction started for calendar "${calendarName}".`)

  const MAX_RUNTIME_MS = 3.5 * 60 * 1000
  const PAGE_SIZE = 100

  const isGone = (error) => {
    const message = String((error && error.message) || '')
    return message.indexOf('GONE') >= 0 || message.indexOf('410') >= 0
  }

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

  let calendar = null
  const calendarList = callWithRetry(() => Calendar.CalendarList.list({ showHidden: true })).items || []
  calendarList.forEach(cal => {
    if (cal.summaryOverride === calendarName || cal.summary === calendarName) calendar = cal
  })
  if (!calendar) throw new Error(`Calendar ${calendarName} not found.`)

  const todayMorning = new Date()
  todayMorning.setHours(0, 0, 0, 0)
  const startDate = new Date(todayMorning.getTime() - pastDays * 24 * 60 * 60 * 1000)

  const props = PropertiesService.getUserProperties()
  const lastUpdate = new Date(props.getProperty(calendar.id))
  const nextLastUpdate = new Date()

  const deadline = Date.now() + MAX_RUNTIME_MS

  let completed = false
  let pageToken = null
  let page = 0

  while (!completed && Date.now() < deadline) {
    let response
    try {
      response = callWithRetry(() => Calendar.Events.list(
        calendar.id,
        {
          pageToken,
          showDeleted: false,
          timeMin: startDate.toISOString(),
          updatedMin: lastUpdate.toISOString(),
          maxResults: PAGE_SIZE
        }
      ))
    } catch (error) {
      if (isGone(error)) {
        pageToken = null
        console.info('Page token expired, restarting pagination.')
        continue
      }
      throw error
    }

    const items = response.items || []
    let processedAll = true
    for (const event of items) {
      if (event.status === 'cancelled') continue
      if (Date.now() >= deadline) {
        processedAll = false
        break
      }

      const correctedEvent = correctionFunction(JSON.parse(JSON.stringify(event)))

      const eventString = JSON.stringify(event)
      const correctedEventString = JSON.stringify(correctedEvent)
      const sameEvents = eventString === correctedEventString

      if (!sameEvents) {
        try {
          const updatedEvent = Calendar.Events.update(correctedEvent, calendar.id, correctedEvent.id)
          console.info(`Updated event "${updatedEvent.summary}".`)
          Utilities.sleep(250)
        } catch (error) {
          console.info(`Failed to update event "${event.summary}".`)
          console.info(error)
        }
      }
    }

    pageToken = response.nextPageToken
    if (processedAll) {
      page++
      if (pageToken) {
        console.info(`Processed page ${page}.`)
      } else {
        completed = true
      }
    }
  }

  if (completed) {
    props.setProperty(calendar.id, nextLastUpdate.toISOString())
    console.info('Correction completed.')
  } else {
    console.info('Correction timed out, will resume on next run.')
  }
}
