// Google Calendar Correction, build on 2026-08-10
// Source: https://github.com/scriptPilot/google-calendar-correction

function start() {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(1)) {
    Logger.log("start() is already running - skipping this invocation")
    return
  }

  if (typeof onStart !== "function") {
    throw new Error(
      "onStart() function is missing - please check the documentation",
    )
  }

  onStart.calledByStartFunction = true

  setCorrectionInterval()
  setMaxExecutionTime()

  onStart.deadline = Date.now() + (onStart.maxExecutionTime || 6) * 60 * 1000 - 60 * 1000

  createTrigger("startFallback", Math.max(onStart.correctionInterval + 1, onStart.maxExecutionTime))

  PropertiesService.getUserProperties().deleteProperty("stopNote")

  try {
    onStart()
  } catch (err) {
    Logger.log("An error occured during the correction")
    Logger.log(`Message: ${err.message}`)
  }

  if (PropertiesService.getUserProperties().getProperty("stopNote") !== null) {
    Logger.log("Correction stopped.")
    return
  }

  createTrigger("start", onStart.correctionInterval)

  createTrigger("startFallback", Math.max(onStart.correctionInterval + 1, onStart.maxExecutionTime))
}

function stop() {
  deleteTrigger("start")
  deleteTrigger("startFallback")

  PropertiesService.getUserProperties().setProperty("stopNote", true)

  Logger.log("The correction will not run again")
  Logger.log("If the script is currently running, it will complete")
}

function runCorrection(calendarName, pastDays, correctionFunction) {

  console.info(`Correction started for calendar "${calendarName}".`)

  const PAGE_SIZE = 100

  const isRetryable = (error) => {
    const message = String((error && error.message) || '')
    return message.indexOf('Backend Error') >= 0
  }

  const isGone = (error) => {
    const message = String((error && error.message) || '')
    return message.indexOf('GONE') >= 0 || message.indexOf('410') >= 0
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
  const lastUpdateProp = props.getProperty(calendar.id)
  const lastUpdate = lastUpdateProp ? new Date(lastUpdateProp) : new Date(0)
  if (isNaN(lastUpdate.getTime())) throw new Error(`Invalid lastUpdate for calendar ${calendar.id}: ${lastUpdateProp}`)
  const nextLastUpdate = new Date()
  const pageTokenKey = `${calendar.id}_pageToken`
  const pageNumberKey = `${calendar.id}_page`

  const deadline = onStart.deadline

  if (Date.now() >= deadline) {
    console.info(`Deadline already passed, skipping calendar "${calendarName}".`)
    return
  }

  let completed = false
  let pageToken = props.getProperty(pageTokenKey) || null
  let page = parseInt(props.getProperty(pageNumberKey) || '0', 10)

  if (pageToken) {
    console.info(`Resuming from saved page token.`)
  }

  while (!completed && Date.now() < deadline) {
    if (Date.now() + 5000 >= deadline) {
      props.setProperty(pageTokenKey, pageToken)
      props.setProperty(pageNumberKey, page)
      break
    }

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
        page = 0
        props.deleteProperty(pageTokenKey)
        props.deleteProperty(pageNumberKey)
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
        props.setProperty(pageTokenKey, pageToken)
        props.setProperty(pageNumberKey, page)
      } else {
        completed = true
        props.deleteProperty(pageTokenKey)
        props.deleteProperty(pageNumberKey)
      }
    } else {
      props.setProperty(pageTokenKey, pageToken)
      props.setProperty(pageNumberKey, page)
    }
  }

  if (completed) {
    props.setProperty(calendar.id, nextLastUpdate.toISOString())
    console.info('Correction completed.')
  } else {
    console.info('Correction timed out, will resume on next run.')
  }
}

function createTrigger(functionName, minutes) {
  if (functionName === "startFallback") {
    minutes =
      minutes >= 30
        ? minutes
        : minutes > 15
          ? 30
          : minutes > 10
            ? 15
            : minutes > 5
              ? 10
              : 5

    let newTrigger = null
    if (minutes <= 30) {
      newTrigger = ScriptApp.newTrigger(functionName)
        .timeBased()
        .everyMinutes(minutes)
        .create()
    } else {
      newTrigger = ScriptApp.newTrigger(functionName)
        .timeBased()
        .everyHours(1)
        .create()
    }
    deleteTrigger(functionName, newTrigger.getUniqueId())
  } else {
    deleteTrigger(functionName)
    ScriptApp.newTrigger(functionName)
      .timeBased()
      .after(minutes * 60 * 1000)
      .create()
  }
  Logger.log(
    `Trigger created for the ${functionName}() function ${functionName === "startFallback" ? "every" : "in"} ${minutes} minute${minutes !== 1 ? "s" : ""}`,
  )
}

function daysAgo(date) {
  const todayMorning = new Date()
  todayMorning.setHours(0, 0, 0, 0)
  return Math.floor((todayMorning.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
}

function startOfWeek(offset = 0) {
  const todayMorning = new Date()
  todayMorning.setHours(0, 0, 0, 0)
  const dayOfWeek = todayMorning.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const target = new Date(todayMorning.getTime() - (mondayOffset + offset * 7) * 24 * 60 * 60 * 1000)
  return daysAgo(target)
}

function startOfMonth(offset = 0) {
  const target = new Date()
  target.setHours(0, 0, 0, 0)
  target.setMonth(target.getMonth() - offset)
  target.setDate(1)
  return daysAgo(target)
}

function startOfQuarter(offset = 0) {
  const target = new Date()
  target.setHours(0, 0, 0, 0)
  const currentMonth = target.getMonth()
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3 - offset * 3
  target.setMonth(quarterStartMonth)
  target.setDate(1)
  return daysAgo(target)
}

function startOfHalfyear(offset = 0) {
  const target = new Date()
  target.setHours(0, 0, 0, 0)
  const currentMonth = target.getMonth()
  const halfyearStartMonth = Math.floor(currentMonth / 6) * 6 - offset * 6
  target.setMonth(halfyearStartMonth)
  target.setDate(1)
  return daysAgo(target)
}

function startOfYear(offset = 0) {
  const target = new Date()
  target.setHours(0, 0, 0, 0)
  target.setMonth(0 - offset * 12)
  target.setDate(1)
  return daysAgo(target)
}

function deleteTrigger(functionName, exclude = null) {
  let triggers = ScriptApp.getProjectTriggers()
  for (let trigger of triggers) {
    if (
      trigger.getHandlerFunction() === functionName &&
      trigger.getUniqueId() !== exclude
    ) {
      ScriptApp.deleteTrigger(trigger)
      Logger.log(`Existing trigger deleted for the ${functionName}() function`)
    }
  }
}

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

function isRecurringEvent(event) {
  return event.recurringEventId !== undefined
}

function isOnWeekend(event) {
  const startDate = new Date(event.start.dateTime || event.start.date)
  return startDate.getDay() === 6 || startDate.getDay() === 0
}

function isOpenByMe(event) {
  return event.attendees?.filter(attendee => attendee.email === Session.getEffectiveUser().getEmail())[0]?.responseStatus === 'needsAction'
}

function isAcceptedByMe(event) {
  return event.attendees?.filter(attendee => attendee.email === Session.getEffectiveUser().getEmail())[0]?.responseStatus === 'accepted'
}

function isTentativeByMe(event) {
  return event.attendees?.filter(attendee => attendee.email === Session.getEffectiveUser().getEmail())[0]?.responseStatus === 'tentative'
}

function isDeclinedByMe(event) {
  return event.attendees?.filter(attendee => attendee.email === Session.getEffectiveUser().getEmail())[0]?.responseStatus === 'declined'
}

function isOpenOrTentativeByMe(event) {
  const responseStatus = event.attendees?.filter(attendee => attendee.email === Session.getEffectiveUser().getEmail())[0]?.responseStatus
  return responseStatus === 'needsAction' || responseStatus === 'tentative'
}

function resetScript() {
  PropertiesService.getUserProperties().deleteAllProperties()
  console.log('Script reset done.')
}

function setCorrectionInterval(minutes = 1) {
  if (!onStart.calledByStartFunction) {
    throw new Error(
      "Please select the Code.gs file and run the start() script.",
    )
  }
  onStart.correctionInterval = minutes
}

function setMaxExecutionTime(minutes = 6) {
  if (!onStart.calledByStartFunction) {
    throw new Error(
      "Please select the Code.gs file and run the start() script.",
    )
  }
  onStart.maxExecutionTime = minutes
  if (arguments.length > 0) {
    Logger.log(`Max execution time set to ${minutes} minute${minutes !== 1 ? "s" : ""}`)
  }
}

function startFallback() {
  start()
}
