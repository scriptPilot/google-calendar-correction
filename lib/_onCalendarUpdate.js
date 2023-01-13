function onCalendarUpdate() {
  runCorrection(
    'Work',         // calendar name
    '2023-01-01',   // start date as YYYY-MM-DD
    event => {      // correction function
      event.colorId = event.transparency === 'transparent' ? 8 : 4
      return event
    }
  )
}