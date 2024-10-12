import {
  BuildFilterGroupsOptions,
  buildFilterGroups,
  scanDirectory,
} from './core'

export async function main(args: {
  srcDir: string
  outDir: string
  verbose: boolean
  options: BuildFilterGroupsOptions
}) {
  let filterGroups = buildFilterGroups(args.options)
  await scanDirectory({
    srcDir: args.srcDir,
    outDir: args.outDir,
    verbose: args.verbose,
    filterGroups,
  })
}
