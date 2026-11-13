import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

await mkdir('public/icons', { recursive: true })
await sharp('public/icon-source.svg').resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp('public/icon-source.svg').resize(512, 512).png().toFile('public/icons/icon-512.png')

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#163B70"/></svg>`
await sharp(Buffer.from(maskableSvg)).composite([{ input: 'public/icon-source.svg', top: 51, left: 51 }]).png().toFile('public/icons/icon-maskable-512.png')
