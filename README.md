# The World in One Day — 23 November 2026 · news-image-20261123

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/badboy0771/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard)
[![reward](https://make.fun/badge/news-image-20261123/badboy0771/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123)

One picture of Monday 23 November 2026: a world atlas in gold on navy with
numbered pins, plus eight story cards — COP31 collapses in Belém, a tanker hit
in the Strait of Hormuz, a sea drone off Benghazi, Dymer, Russian missiles hit
Poland, BepiColombo arrives at Mercury, US markets tumble, and a fire in
Cikande, Banten. Built for the [make.fun](https://make.fun)
`news-image-20261123` bounty.

## How it works

- `main.ts` — draws the whole 1024×1024 image with a hand-written rasterizer,
  a 5×7 bitmap font and a PNG encoder, all in pure Node 22 stdlib (zlib).
  No network, no external files, no clock, no randomness — the output is
  byte-identical on every run, from any working directory.

## Local check

`MAKEFUN_OUTPUT_DIR=out node main.ts` renders `entry.png` (27,939 bytes,
1024×1024, RGBA). Three runs from different working directories produce the
same sha256.
