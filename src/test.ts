import sharp from 'sharp'
import {
  aggressiveFilterGroupsOptions,
  augmentImage,
  buildFilterGroups,
} from './index'
import { mkdirSync } from 'fs'

async function main() {
  let filterGroups = buildFilterGroups({
    // background: ['#00000000', '#ffffff00'],
    // grayscale: 'both',
    // rotate: range({ from: -45, to: 45, step: 45 / 3 }),
    // scale: [
    //   [1, 0.8],
    //   [1, 1],
    //   [1, 1.2],
    // ],
    // scale: [
    //   [0.5, 0.5],
    //   [1.0, 1.0],
    //   [2.0, 2.0],
    // ],
    // shear: [
    //   [0, 0],
    //   [-16, 0],
    //   [+16, 0],
    //   [0, -16],
    //   [0, +16],
    // ],
    // blur: [0, 1],
    // flipX: true,
    // flipY: true,
    // crop: [
    //   [100, 100],
    //   [200, 100],
    //   [100, 200],
    // ],
    // crop: [
    //   [50, 50],
    //   [50, 150],
    //   [150, 50],
    // ],
    // crop: [
    //   [Infinity, Infinity],
    //   [500, 500],
    //   [200, 200],
    //   [100, 100],
    //   [100, 50],
    //   [50, 100],
    //   [50, 50],
    // ],
  })

  filterGroups = buildFilterGroups(aggressiveFilterGroupsOptions)
  console.log(filterGroups.map(group => [group.name, group.variants.length]))
  console.log(
    'total:',
    filterGroups.reduce((acc, c) => acc * c.variants.length, 1),
  )

  let image = sharp('cat.png')
  mkdirSync('augmented', { recursive: true })
  let expandedImages = augmentImage(image, filterGroups)
  let i = 0
  for await (let image of expandedImages) {
    let out = `augmented/cat-${i}.png`
    await image.toFile(out)
    i++
  }
}
main().catch(e => console.error(e))
