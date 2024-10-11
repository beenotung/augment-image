import {
  aggressiveFilterGroupsOptions,
  buildFilterGroups,
  scanDirectory,
} from './core'

async function main() {
  let filterGroups = buildFilterGroups(aggressiveFilterGroupsOptions)
  await scanDirectory({
    srcDir: './images/raw',
    outDir: './images/augmented',
    filterGroups,
    verbose: true,
  })
}
main().catch(e => console.error(e))
