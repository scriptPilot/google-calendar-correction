// This function reset the script
// Run it after changing onCalendarUpdate function
// It is not required to change this code
function resetScript() {
  PropertiesService.getUserProperties().deleteAllProperties()  
}