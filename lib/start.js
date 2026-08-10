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

  createTrigger("startFallback", onStart.correctionInterval + 1)

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

  createTrigger("startFallback", onStart.correctionInterval + 1)
}
