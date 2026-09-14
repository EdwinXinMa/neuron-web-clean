# Bundled overview basemap

The page loads `world.webp`, a lossless 4096 x 4096 rendering of `world.svg`.
Rasterizing at build time avoids reprocessing detailed SVG paths during zoom.
The SVG is retained as the editable source and is not imported by the app.

`world.svg` is generated from `world-atlas@2.0.2/countries-50m.json` (241 features),
using `topojson-client@3.1.0` to merge land and extract internal borders, and
`d3-geo@3.1.1` to clip at the antimeridian and use a Web Mercator projection.

Source: https://github.com/topojson/world-atlas (npm package version 2.0.2).
The package redistributes Natural Earth 4.1.0, at 1:50 million scale.
The redistribution license is included in `LICENSE-world-atlas.txt`.

This is an overview map, with no street/address data. The square 2048 x 2048 SVG
covers longitude [-180, 180] and latitude approximately [-85.051129, 85.051129],
matching Leaflet's EPSG:3857 image bounds and projection of WGS84 device markers.
Web Mercator preserves local shapes; the World view fits inhabited latitudes
[-55, 75] while higher latitudes remain available by panning.
Country names are separate localized Leaflet labels, not baked into the image. The asset is bundled with the
frontend, so opening, panning and zooming the map needs no external tile requests
or API keys. Zoom is limited to 4 to match the available detail. The initial view
fits valid device locations (at most zoom 2.5); the World view button restores
the full overview. Labels use the browser's Intl.DisplayNames for the UI locale.

To regenerate, obtain the pinned packages and write:

```js
const land = topojson.merge(topology, topology.objects.countries.geometries)
const borders = topojson.mesh(topology, topology.objects.countries, (a, b) => a !== b)
const projection = d3.geoMercator()
  .scale(2048 / (2 * Math.PI)).translate([1024, 1024])
  .clipExtent([[0, 0], [2048, 2048]]).precision(0.2)
const path = d3.geoPath(projection).digits(1)
// Write path(land) and path(borders) into the SVG's 2048 x 2048 viewBox.
// Rasterize with sharp@0.34.5:
await sharp('world.svg', { density: 144 }).resize(4096, 4096)
  .webp({ lossless: true, effort: 6 }).toFile('world.webp')
```

Check for invalid coordinates, then visually inspect the overview with markers
in both hemispheres, including islands near the dateline. Use a geographic
projection's antimeridian clipping: rendering the original geographic polygons
directly in Leaflet can draw long horizontal segments across the map.
