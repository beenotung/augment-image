import {
  aggressiveFilterGroupsOptions,
  buildFilterGroups,
  scanDirectory,
} from './core'

async function main() {
  // use custom settings
  let filterGroups = buildFilterGroups({
    // RGBA background will be used for out-of-range content when rotate, scale, or shear
    background: ['#ffffffff'],
    scale: [
      [0.5, 0.5],
      [1.0, 0.5],
      [2.0, 2.0],
    ],
    crop: [
      [Infinity, Infinity],
      [100, 100],
      [50, 50],
    ],
    shear: [
      [0, 0],
      [-8, 0],
      [+8, 0],
      [0, -8],
      [0, +8],
    ],
    rotate: [0, 8, -8, 16, -16],
    grayscale: 'both',
    flipX: true,
    blur: [0, 1, 2],
  })

  // use default settings
  filterGroups = buildFilterGroups(aggressiveFilterGroupsOptions)

  await scanDirectory({
    srcDir: './images/raw',
    outDir: './images/augmented',
    filterGroups,
    verbose: true,
  })
}
main().catch(e => console.error(e))
