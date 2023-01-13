// Import File System module
const fs = require('fs')

// Read library folder
fs.readdir('lib', (err, files) => {

  // Exit on error
  if (err) {
    console.error('Failed to loop the library folder.', err)
    process.exit(1)
  }

  // Filter for .js files
  files = files.filter(file => /\.js$/.test(file))

  // Start array of code blocks
  const codeBlocks = []

  // Loop files
  files.forEach(file => {

    // Read file content
    const fileContent = fs.readFileSync('lib/' + file, { encoding: 'utf8' })

    // Add file content to code blocks
    codeBlocks.push(fileContent)

  })

  // Merge and write code blocks to Code.gs file
  fs.writeFileSync('Code.gs', codeBlocks.join('\n\n'))

  // Log script completion
  console.log('Code.gs file updated.')

})
