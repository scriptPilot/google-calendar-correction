const fs = require('fs')
const path = require('path')

function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      findJsFiles(filePath, fileList)
    } else if (/\.js$/.test(file)) {
      fileList.push(filePath)
    }
  })
  return fileList
}

let files = findJsFiles('lib')

files = files.filter(file => !['onStart.js', 'onStart.gs'].includes(path.basename(file)))

files = files.sort((a, b) => {
  const lowerA = a.toLowerCase()
  const lowerB = b.toLowerCase()

  const priorities = [
    'start.js',
    'stop.js',
    'runcorrection.js',
    'setcorrectioninterval',
    'setmaxexecutiontime',
  ]

  const indexA = priorities.findIndex(priority => lowerA.endsWith(priority))
  const indexB = priorities.findIndex(priority => lowerB.endsWith(priority))

  if (indexA !== -1 && indexB !== -1) return indexA - indexB
  if (indexA !== -1) return -1
  if (indexB !== -1) return 1

  return lowerA.localeCompare(lowerB)
})

const codeBlocks = []

const now = new Date()
const date = now.toISOString().substr(0, 10)
const link = 'https://github.com/scriptPilot/google-calendar-correction'
codeBlocks.push(`// Google Calendar Correction, build on ${date}\n// Source: ${link}\n`)

files.forEach(file => {
  const fileContent = fs.readFileSync(file, { encoding: 'utf8' })
  codeBlocks.push(fileContent)
})

if (!fs.existsSync('dist')) fs.mkdirSync('dist')

fs.writeFileSync('dist/Code.gs', codeBlocks.join('\n'))

console.log('Code.gs file updated.')
