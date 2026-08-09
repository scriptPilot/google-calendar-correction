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
