function stop() {
  deleteTrigger("start")
  deleteTrigger("startFallback")

  PropertiesService.getUserProperties().setProperty("stopNote", true)

  Logger.log("The correction will not run again")
  Logger.log("If the script is currently running, it will complete")
}
