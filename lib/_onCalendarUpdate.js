function onCalendarUpdate() {
  runCorrection(
    'Planung',
    '2023-01-01',
    event => {
      event.colorId = event.transparency === 'transparent' ? 8 : 4
      return event
    }
  )
}