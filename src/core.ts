import { mkdirSync, readdirSync } from 'fs'
import { version } from 'os'
import { extname, join } from 'path'
import sharp, { Sharp } from 'sharp'

type FilterGroup = {
  name: string
  variants: Filter[]
}

type Filter = {
  (image: Sharp): Sharp[] | Sharp | Promise<Sharp[] | Sharp>
}

async function getImageDimension(image: Sharp) {
  let metadata = await image.metadata()
  let width = metadata.width
  let height = metadata.height
  if (!width || !height) {
    throw new Error(`Missing image dimension metadata`)
  }
  return { width, height }
}

/**
 * affine matrix
 * [a b]
 * [c d]
 *
 * a: scale in x-axis
 * d: scale in y-axis
 *
 * b: shear in x-axis
 * c: shear in y-axis
 */

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

export function buildFilterGroups(options: BuildFilterGroupsOptions) {
  let groups: FilterGroup[] = []
  let background =
    options.background?.length! > 0 ? options.background! : ['#00000000']

  if (options.scale) {
    let group: FilterGroup = {
      name: 'scale',
      variants: options.scale.flatMap(([w, h]) =>
        background.map(
          background => image =>
            image.affine(
              [
                [w, 0],
                [0, h],
              ],
              { background },
            ),
        ),
      ),
    }
    groups.push(group)
  }

  if (options.crop) {
    let group: FilterGroup = {
      name: 'crop',
      variants: [
        async image => {
          let { width, height } = await getImageDimension(image)
          let images: Sharp[] = []
          let w_h_sizes: number[][] = []
          for (let [w, h] of options.crop!) {
            /* avoid overflow */
            w = Math.min(w || Infinity, width)
            h = Math.min(h || Infinity, height)

            /* skip already checked size */
            let h_sizes = w_h_sizes[w]
            if (!h_sizes) {
              h_sizes = []
              w_h_sizes[w] = h_sizes
            }
            if (h_sizes[h]) continue
            h_sizes[h] = 1

            /* crop each grid */
            for (let y = 0; y < height; y += h) {
              for (let x = 0; x < width; x += w) {
                images.push(
                  image.clone().extract({
                    top: y + h < height ? y : height - h,
                    left: x + w < width ? x : width - w,
                    width: w,
                    height: h,
                  }),
                )
              }
            }
          }
          return images
        },
      ],
    }
    groups.push(group)
  }

  if (options.shear) {
    let group: FilterGroup = {
      name: 'shear',
      variants: options.shear.flatMap(([x, y]) =>
        background.map(
          background => image =>
            image.affine(
              [
                [1, -(x / 180) * Math.PI],
                [(-y / 180) * Math.PI, 1],
              ],
              { background },
            ),
        ),
      ),
    }
    groups.push(group)
  }

  if (options.flipY) {
    let group: FilterGroup = {
      name: 'flipY',
      variants: [image => image.flip(false), image => image.flip(true)],
    }
    groups.push(group)
  }

  if (options.flipX) {
    let group: FilterGroup = {
      name: 'flipX',
      variants: [image => image.flop(false), image => image.flop(true)],
    }
    groups.push(group)
  }

  if (options.rotate) {
    let group: FilterGroup = {
      name: 'rotate',
      variants: options.rotate.flatMap(deg =>
        background.map(
          background => image => image.rotate(deg, { background }),
        ),
      ),
    }
    groups.push(group)
  }

  if (options.grayscale && options.grayscale != 'never') {
    let group: FilterGroup = {
      name: 'filter',
      variants:
        options.grayscale == 'always'
          ? [image => image.grayscale()]
          : [image => image, image => image.grayscale()],
    }
    groups.push(group)
  }

  if (options.blur) {
    let group: FilterGroup = {
      name: 'blur',
      variants: options.blur.map(
        sigma => image => sigma >= 1 ? image.blur(sigma) : image,
      ),
    }
    groups.push(group)
  }

  if (groups.length == 0) {
    console.warn('Warning: no filters selected')
  }

  return groups
}

export function range(args: {
  /** @description inclusive */
  from: number
  /** @description inclusive */
  to: number
  /** @description can be positive or negative */
  step: number
}): number[] {
  let values: number[] = []
  let { from, to, step } = args
  let count = (to - from) / step
  if (count < 0) {
    step = -step
  }
  for (let i = from; i <= to; i += step) {
    values.push(i)
    if (from == to) {
      break
    }
  }
  return values
}

export function rangeAround(args: {
  center: number
  /** @description inclusive */
  range: number
  /** @description can be positive or negative */
  step: number
}) {
  let { center, range, step } = args
  step = Math.abs(step)
  let values: number[] = [center]
  for (let i = step; i <= range; i += step) {
    values.push(center - i)
    values.push(center + i)
  }
  return values
}

export function expandCropSize(
  /** @description e.g. `[Infinity, 1000, 500, 300, 200, 100, 50]` */
  size: number[],
) {
  let res: number[][] = []
  let i = 0
  res.push([size[i], size[i]])
  for (i = 1; i < size.length; i++) {
    res.push([size[i - 1], size[i]])
    res.push([size[i], size[i - 1]])
    res.push([size[i], size[i]])
  }
  i--
  res.push([size[i], size[i]])
  return res
}

export let aggressiveFilterGroupsOptions: BuildFilterGroupsOptions = {
  // background: ['#00000000', '#88888888', '#ffffffff'],
  scale: [0.75, 1.0].flatMap(s => [[s, s]]),
  crop: [Infinity, 150].map(s => [s, s]),
  shear: [
    [0, 0],
    [16, 0],
    [0, 16],
    // [-16, 0],
    // [0, -16],
  ],
  // rotate: rangeAround({ center: 0, range: 15, step: 15 }),
  grayscale: 'always',
  flipX: true,
  flipY: false,
  blur: [0, 1],
}

export async function* augmentImage(image: Sharp, filterGroups: FilterGroup[]) {
  let n = filterGroups.length
  let variantIndies = new Array(n).fill(0)
  function tick() {
    for (let i = 0; i < n; i++) {
      variantIndies[i]++
      if (variantIndies[i] < filterGroups[i].variants.length) {
        return false
      }
      for (let j = i; j >= 0; j--) {
        variantIndies[j] = 0
      }
    }
    return true
  }
  for (;;) {
    let images = [image.clone()]
    for (let i = 0; i < n; i++) {
      let group = filterGroups[i]
      let filter = group.variants[variantIndies[i]]
      let newImages: Sharp[] = []
      for (let image of images) {
        let result = await filter(image)
        if (Array.isArray(result)) {
          newImages.push(...result)
        } else {
          newImages.push(result)
        }
      }
      images = newImages
    }
    for (let image of images) {
      yield image
    }
    let ended = tick()
    if (ended) {
      break
    }
  }
}

export async function scanDirectory(options: {
  srcDir: string
  outDir: string
  filterGroups: FilterGroup[]
  /** @description default `true` */
  verbose?: boolean
}) {
  let { srcDir, outDir, filterGroups } = options
  let verbose = options.verbose ?? true

  mkdirSync(outDir, { recursive: true })

  if (verbose) {
    console.log('augment images in directory', srcDir, '->', outDir)
    console.log(
      'filter variants',
      filterGroups.map(s => [s.name, s.variants.length]),
    )
    console.log(
      'number of combination:',
      filterGroups.reduce((acc, c) => acc * c.variants.length, 1),
    )
  }

  let filenames = readdirSync(srcDir).filter(
    filename => !filename.endsWith('.txt') && !filename.endsWith('.log'),
  )
  let fileCount = filenames.length
  let startTime = Date.now()
  let fileIndex = 0
  let imageCount = 0
  for (let filename of filenames) {
    let ext = extname(filename)
    let name = filename.slice(0, filename.length - ext.length)

    if (verbose && fileIndex == 0) {
      print(`[progress] augmenting ${fileIndex + 1}/${fileCount} images...`)
    }
    if (verbose && fileIndex > 0) {
      let timePassed = Date.now() - startTime
      let speed = fileIndex / timePassed
      let fileRemind = fileCount - fileIndex
      let timeRemind = fileRemind / speed
      let eta = formatDuration(timeRemind)
      print(
        `[progress] augmented ${
          fileIndex + 1
        }/${fileCount} images into ${imageCount} images (ETA: ${eta} remains)`,
      )
    }

    let file = join(srcDir, filename)
    let image = sharp(file)
    let images = augmentImage(image, filterGroups)
    let imageIndex = 0
    for await (let image of images) {
      let file = join(outDir, `${name}-${imageIndex}${ext}`)
      await image.toFile(file)
      imageIndex++
      imageCount++
    }
    fileIndex++
  }
  if (verbose) {
    clearLine()
    console.log(
      'generated',
      imageCount.toLocaleString(),
      'augmented images from',
      fileCount.toLocaleString(),
      'source images',
    )
  }
  return { fileCount }
}

let lastLineLength = 0

function print(line: string) {
  process.stdout.write('\r' + line)
  lastLineLength = line.length
}

function clearLine() {
  print(' '.repeat(lastLineLength))
  print('')
}

function formatDuration(time: number) {
  time = Math.ceil(time)
  if (time < 1000) {
    return time + ' ms'
  }
  if (time < 1000 * 60) {
    return (time / 1000).toFixed(1) + ' sec'
  }
  if (time < 1000 * 60 * 60) {
    return (time / 1000 / 60).toFixed(1) + ' min'
  }
  return (time / 1000 / 60 / 60).toFixed(1) + ' hr'
}
