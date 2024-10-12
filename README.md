# augment-image

Image augmentation library and cli for machine learning tasks

[![npm Package Version](https://img.shields.io/npm/v/augment-image)](https://www.npmjs.com/package/augment-image)

## Features

- Rich combination of customizable image augmentation
  - background color
  - scale
  - crop
  - shear
  - rotate
  - gray-scale
  - flipX
  - flipY
  - blur
- Typescript support
- Support usage from cli

## Installation

```bash
npm install augment-image
```

You can also install `augment-image` with [pnpm](https://pnpm.io/), [yarn](https://yarnpkg.com/), or [slnpm](https://github.com/beenotung/slnpm)

Note that optional dependency should not be disabled, sharp installs the os-specific native package as optional dependencies.

## Usage Example

```typescript
import {
  aggressiveFilterGroupsOptions,
  buildFilterGroups,
  scanDirectory,
} from 'augment-image'

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
```

## Typescript Signature

<details>
  <summary>core functions and types</summary>

```typescript
import { Sharp } from 'sharp'

/** @description the core function that apply all combination of image augmentation filters */
export function augmentImage(
  image: Sharp,
  filterGroups: FilterGroup[],
): AsyncGenerator<Sharp, void, unknown>

/** @description scan images in `srcDir` and save the augmented images in `outDir` */
export function scanDirectory(options: {
  srcDir: string
  outDir: string
  filterGroups: FilterGroup[]
  /** @description default `true` */
  verbose?: boolean
}): Promise<{
  fileCount: number
}>

/** @description generate filter groups with variants based on the given options */
export function buildFilterGroups(
  options: BuildFilterGroupsOptions,
): FilterGroup[]

export type BuildFilterGroupsOptions = {
  /**
   * @description for region that overflow when transform
   * default `['#00000000']`
   */
  background?: string[]
  /**
   * @description `Array<[w,h]>` in percentage, applied before crop
   * e.g. `[[0.8,1.2]]` for 80% in width and 120% in height
   * */
  scale?: [w: number, h: number][]
  /**
   * @description `Array<[w,h]>` in pixel unit, applied before after scale
   * e.g. `[[100,100],[100,150],[150,100]]`
   */
  crop?: [w: number, h: number][]
  /**
   * @description `Array<[x,y]>` in degree, applied after crop
   * e.g. `[[0,0],[-16,0],[+16,0],[0,-16],[0,+16]]`
   * */
  shear?: [x: number, y: number][]
  /**
   * @description in degree
   * e.g. `[-15, 0, 15]`
   * */
  rotate?: number[]
  grayscale?: 'always' | 'never' | 'both'
  flipX?: boolean
  flipY?: boolean
  /**
   * @description sigma range from 0 to 1000
   * e.g. `[0, 1]`
   * */
  blur?: number[]
}

/** @description a reference setting that balance the number of image augmentation combination and the time cost */
export let aggressiveFilterGroupsOptions: BuildFilterGroupsOptions

type FilterGroup = {
  name: string
  variants: Filter[]
}

type Filter = {
  (image: Sharp): Sharp[] | Sharp | Promise<Sharp[] | Sharp>
}
```

</details>

<details>
  <summary>helper functions</summary>

```typescript
import { Sharp } from 'sharp'

/** @description generate sequence of `number[]` */
export function range(args: {
  /** @description inclusive */
  from: number
  /** @description inclusive */
  to: number
  /** @description can be positive or negative */
  step: number
}): number[]

/** @description generate sequence of `number[]` */
export function rangeAround(args: {
  center: number
  /** @description inclusive */
  range: number
  /** @description can be positive or negative */
  step: number
}): number[]

/** @description generate `[[a,a],[b,b]]` into combination of `[[a,a],[a,b],[b,a],[b,b]]` */
export function expandCropSize(
  /** @description e.g. `[Infinity, 1000, 500, 300, 200, 100, 50]` */
  size: number[],
): number[][]
```

</details>

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
