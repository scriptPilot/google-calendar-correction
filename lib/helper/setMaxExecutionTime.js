function setMaxExecutionTime(minutes = 6) {
  if (!onStart.calledByStartFunction) {
    throw new Error(
      "Please select the Code.gs file and run the start() script.",
    )
  }
  onStart.maxExecutionTime = minutes
}
