function runCorrection(calendarName, pastDays, correctionFunction) {

  console.info(`Correction started for calendar "${calendarName}".`)

  const PAGE_SIZE = 2500

  const isRetryable = (error) => {
    const message = String((error && error.message) || '')
    return message.indexOf('Backend Error') >= 0
  }

  const isGone = (error) => {
    const message = String((error && error.message) || '')
    return message.toLowerCase().indexOf('gone') >= 0 || message.indexOf('410') >= 0
  }

  const callWithRetry = (call, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return call()
      } catch (error) {
        if (isGone(error)) throw error
        if (isRetryable(error) && attempt < 5) {
          maxAttempts = Math.max(maxAttempts, 5)
        }
        if (attempt === maxAttempts) throw error
        Utilities.sleep(1000 * attempt * (isRetryable(error) ? 2 : 1))
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
  const syncTokenKey = `${calendar.id}_syncToken`
  const pageTokenKey = `${calendar.id}_pageTokenV2`
  const pageNumberKey = `${calendar.id}_pageV2`
  props.deleteProperty(`${calendar.id}`)
  props.deleteProperty(`${calendar.id}_pageToken`)
  props.deleteProperty(`${calendar.id}_page`)

  const deadline = onStart.deadline

  if (Date.now() >= deadline) {
    console.info(`Deadline already passed, skipping calendar "${calendarName}".`)
    return
  }

  const endsBeforeStartDate = (event) => {
    const end = event.end && (event.end.dateTime || event.end.date)
    return end ? new Date(end) <= startDate : false
  }

  const savePageState = () => {
    if (pageToken) {
      props.setProperty(pageTokenKey, pageToken)
    } else {
      props.deleteProperty(pageTokenKey)
    }
    props.setProperty(pageNumberKey, String(page))
  }

  const clearPageState = () => {
    props.deleteProperty(syncTokenKey)
    props.deleteProperty(pageTokenKey)
    props.deleteProperty(pageNumberKey)
  }

  let completed = false
  let skippedDeleted = 0
  let syncToken = props.getProperty(syncTokenKey)
  let pageToken = props.getProperty(pageTokenKey)
  let page = parseInt(props.getProperty(pageNumberKey) || '0', 10)

  if (syncToken) {
    console.info('Running incremental sync.')
  } else if (pageToken) {
    console.info('Resuming full sync from saved page token.')
  } else {
    console.info('Starting full sync.')
  }

  while (!completed && Date.now() < deadline) {
    if (Date.now() + 5000 >= deadline) {
      savePageState()
      break
    }

    const params = { maxResults: PAGE_SIZE }
    if (pageToken) params.pageToken = pageToken
    if (syncToken) {
      params.syncToken = syncToken
    } else {
      params.showDeleted = true
      params.timeMin = startDate.toISOString()
    }

    let response
    try {
      response = callWithRetry(() => Calendar.Events.list(calendar.id, params))
    } catch (error) {
      if (isGone(error)) {
        syncToken = null
        pageToken = null
        page = 0
        clearPageState()
        console.info('Sync token expired, restarting full sync.')
        continue
      }
      throw error
    }

    const items = response.items || []
    let deadlineHit = false
    for (const event of items) {
      if (event.status === 'cancelled') {
        skippedDeleted++
        continue
      }
      if (endsBeforeStartDate(event)) continue
      if (Date.now() >= deadline) {
        deadlineHit = true
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

    if (deadlineHit) {
      savePageState()
      break
    }

    pageToken = response.nextPageToken
    page++
    if (pageToken) {
      console.info(`Processed page ${page} with ${items.length} events.`)
      savePageState()
    } else {
      completed = true
      const nextSyncToken = response.nextSyncToken
      if (nextSyncToken) {
        props.setProperty(syncTokenKey, nextSyncToken)
      } else {
        console.info('No sync token returned, the next run will be a full sync again.')
      }
      props.deleteProperty(pageTokenKey)
      props.deleteProperty(pageNumberKey)
    }
  }

  if (completed) {
    console.info(`Correction completed. Skipped ${skippedDeleted} deleted events.`)
  } else {
    console.info(`Correction timed out, will resume on next run. Skipped ${skippedDeleted} deleted events so far.`)
  }
}
