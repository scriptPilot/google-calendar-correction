function resetProperties() {

  // Reset all last update values
  // Will allow a correction from the start date again
  PropertiesService.getUserProperties().deleteAllProperties()
  
}