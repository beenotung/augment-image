import { existsSync, readFileSync, writeFileSync } from 'fs'
import { readJSONFile, resolveFile } from 'cli-helpers'
import { BuildFilterGroupsOptions } from './core'
import { main } from './main'

type Mode = null | 'init' | 'run' | 'help'

type RunOptions = {
  srcDir: string
  outDir: string
  verbose: boolean
  options: BuildFilterGroupsOptions
}

let configFile = 'config.json'

function parseArguments() {
  let mode: Mode = null
  let runOptions: RunOptions = {
    srcDir: './images/raw',
    outDir: './images/augmented',
    verbose: true,
    options: {},
  }
  let args = process.argv

  // If no arguments were given, show an error and hint to use the help flag
  if (args.length === 2) {
    showVersion(console.error)
    console.error('Error: missing arguments')
    console.error(
      'Run "npx argument-image --help" to see detailed help message',
    )
    process.exit(1)
  }

  for (let i = 2; i < args.length; i++) {
    let arg = args[i]
    let next = args[i + 1]
    switch (arg) {
      case '-h':
      case '--help': {
        mode = 'help'
        break
      }
      case '-v':
      case '--version': {
        showVersion(console.log)
        process.exit(0)
      }
      case '-i':
      case '--init': {
        mode = 'init'
        break
      }
      case '-r':
      case '--run': {
        mode = 'run'
        break
      }
      case '-s':
      case '--srcDir': {
        if (!next) {
          showVersion(console.error)
          console.error('Error: missing directory path after --srcDir')
          process.exit(1)
        }
        runOptions.srcDir = next
        i++
        break
      }
      case '-o':
      case '--outDir': {
        if (!next) {
          showVersion(console.error)
          console.error('Error: missing directory path after --outDir')
          process.exit(1)
        }
        runOptions.outDir = next
        i++
        break
      }
      case '-q':
      case '--quiet': {
        runOptions.verbose = false
        break
      }
      default: {
        showVersion(console.error)
        console.error('Error: unknown argument: ' + JSON.stringify(arg))
        process.exit(1)
      }
    }
  }

  if (mode == 'run') {
    runOptions.options = readJSONFile(configFile)
  }

  return { mode, runOptions }
}

function showHelp() {
  showVersion(console.log)
  console.log(`
Usage: npx argument-image [options]

Options:

General:
  -h, --help                  Show this help message and exit.
  -v, --version               Show the version number and exit.

Configuration:
  -i, --init                  Initialize a configuration file.

Run Mode:
  -r, --run                   Run the main logic of the application.
  -s  --srcDir <path>         Specify the source directory. Default is "./images/raw".
  -o, --outDir <path>         Specify the output directory. Default is "./images/augments".
  -q, --quiet                 Disable verbose logging. By default, verbose is enabled.

Notes:
  - Use the --init option to generate a default config file.
  - You can edit the config in "config.json" in the current directory.
  - The config file must exist in the run mode.
`)
}

function showVersion(log: typeof console.log) {
  let pkg = require(resolveFile({ dir: __dirname, filename: 'package.json' }))
  log(`${pkg.name} v${pkg.version}`)
}

function loadConfigType() {
  let file = resolveFile({ dir: __dirname, filename: 'dist/core.d.ts' })
  let text = readFileSync(file).toString()
  let start = text.indexOf('export type BuildFilterGroupsOptions =')
  let end = text.indexOf('\n}', start)
  let type = text.slice(start, end + 2)
  return type
}

function initConfig() {
  if (existsSync(configFile)) {
    console.error(
      'Error: config file already exists at ' + JSON.stringify(configFile),
    )
    process.exit(1)
  }

  let type = loadConfigType()
    .split('\n')
    .map(line => '// ' + line)
    .join('\n')

  let text = `
{
  // "background": ["#00000000", "#88888888", "#ffffffff"],
  "scale": [
    [0.75, 0.75],
    [1, 1]
  ],
  "crop": [
    [null, null],
    [150, 150]
  ],
  "shear": [
    [0, 0],
    // [-16, 0],
    [16, 0],
    // [0, -16],
    [0, 16]
  ],
  "rotate": [0],
  "grayscale": "always",
  "flipX": true,
  "flipY": false,
  "blur": [0]
}
${type}
`

  writeFileSync(configFile, text.trim() + '\n')

  console.log('Config file initialized at ' + JSON.stringify(configFile))
}

export async function cli() {
  const { mode, runOptions } = parseArguments()

  switch (mode) {
    case 'help':
      showHelp()
      break
    case 'init':
      initConfig()
      break
    case 'run':
      await main(runOptions)
      break
    default:
      showVersion(console.error)
      console.error('Error: missing mode argument')
      console.error(
        'Run "npx argument-image --help" to see detailed help message',
      )
      process.exit(1)
  }
}

cli()
