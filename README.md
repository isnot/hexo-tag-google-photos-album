# hexo-tag-google-photos-album

This is a Tag plugin for [Hexo](https://hexo.io/). It provides the ability to embed photo albums from Google Photos.

[![NPM](https://nodei.co/npm/hexo-tag-google-photos-album.png)](https://nodei.co/npm/hexo-tag-google-photos-album/)

## Getting Started

* (GitHub) [hexo-tag-google-photos-album](https://github.com/isnot/hexo-tag-google-photos-album)
* (npm) [hexo-tag-google-photos-album](https://www.npmjs.com/package/hexo-tag-google-photos-album)
* (sample) https://pages.isnot.jp/2019-04/13-image-test/

## Installation

```bash
$ cd <path-to-your-blog-dir>
$ npm install hexo-tag-google-photos-album --save
```

## Usage

### Settings

in \_config.yml

```yaml
googlePhotosAlbum:
  descriptionLength: 140
  target: _blank
  rel: noopener
  className: google-photos-album-area
  enableDefaultStyle: true
  defaultStyle: google_photos_album.css
  largeSizeThreshold: 768
  largeSize:  =s1920-no
  mediumSize: =s720-no
  smallSize:  =w225-no
  maxPics: 999
  generateAlways: false
```

All params are optional.
You can use this plugin with no config.

| attribute         | description                                | default |
|:-----------------|:------------------------------------------|:-------|
| descriptionLength  | crop the og:description in {Number} of chars. | 140    |
| target            | link elenment's target property.             | \_blank |
| rel               | link element's rel property.                | noopener |
| className         | className for photos and descriptions.        | google-photos-album-area |
| enableDefaultStyle | if set to false, you may use own styles by your way. | true |
| defaultStyle      | default style and its filename.               | /css/google\_photos\_album.css |
| largeSizeThreshold | for responsive                              | 768 |
| largeSize         | image's size to link                         | =s1920-no |
| mediumSize        | image's size to link in case of mobile        | =s720-no |
| smallSize         | thumbnail's size                             | =w225-no |
| maxPics           | (experimental)limit {Number} of embeded phtos. | 999   |
| generateAlways     | (experimental)                              | false |

### Syntax

```
{% googlePhotosAlbum url %}
```

- @param {string} url - Google Photos' share url.
  You can also use shortened one.

Example
```
{% googlePhotosAlbum https://photos.google.com/share/AF1QipM-qmCtmxuhoUj5Y2lP7OUWe9FH1KjHqVuDokH9IxM1mj3ayWcbHxNa43NfaBLe2A?key=SUIyM0k0RkQ4OTY4elZmQVBwNDBFOFhJZVZwRTBn %}
```

## Customize

use [hexo-light-gallery](https://github.com/lzane/hexo-light-gallery)

## Thanks

[hexo-tag-link-preview](https://www.npmjs.com/package/hexo-tag-link-preview)

## License

Copyright (c) 2019 isnot
Licensed under the MIT license.
