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
