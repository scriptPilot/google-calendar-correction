// This function is called by the trigger
// You should modify the name, start date and correction function to your needs
function onCalendarUpdate() {
  // Run the correction with some options
  runCorrection(
    // The name of the calendar
    'Work',         
    // The start date (YYYY-MM-DD, corrections are applied from this date)
    '2023-01-01',  
    // Correction function, event as input 
    event => {     
      // In this example, "busy" events are painted red, "free" events green 
      event.colorId = event.transparency === 'transparent' ? 10 : 11
      // Do not forget to return the corrected event
      return event
    }
  )
}