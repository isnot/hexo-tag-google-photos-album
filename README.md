# hexo-tag-google-photos-album

This is a Tag plugin for [Hexo](https://hexo.io/). It provides the ability to embed albums from Google Photos.

This plugin provide a ability to embed a Google Photos album for Hexo.

## Getting Started

* (GitHub) [hexo-tag-google-photos-album](https://github.com/isnot/hexo-tag-google-photos-album)
* (npm) TBD
* (sample) TBD https://pages.isnot.jp/2019-04/13-image-test/

## Installation

```bash
$ cd <path-to-your-blog-dir>
$ npm install hexo-tag-google-photos-album hexo-inject --save
```
## Usage

### Settings

in \_config.yml

```yaml
googlePhotosAlbum:
  descriptionLength: 140
  maxPics: 999
  target: _blank
  rel: noopener
  className: google-photos-album-area
  enableFactoryStyle: true
  factoryStyle: /css/google_photos_album.css
  large_param: =s1920-no
  middle_param: =s720-no
  small_param: =w225-no
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
| enableFactoryStyle | if set to false, you may use own styles by your way. | true |
| factoryStyle      | default style and its filename.               | /css/google\_photos\_album.css |
| large\_param      | image's size to link                         | =s1920-no |
| middle\_param      | image's size to link in case of mobile        | =s720-no |
| small\_param       | thumbnail's size                            | =w225-no |
| maxPics           | (experimental)limit {Number} of embeded phtos. | 999   |
| generateAlways     | (experimental)                              | false |

### Syntax

```
{% googlePhotosAlbum url %}
```

Example:
```
{% googlePhotosAlbum  %}
```

## Custamize

[Hexo-light-gallery](https://github.com/lzane/hexo-light-gallery)



- @param url {URL} Google Photos' share url.
  You can also use shortened one.

## Thanks

[hexo-tag-link-preview](https://www.npmjs.com/package/hexo-tag-link-preview)

## License

Copyright (c) 2019 isnot
Licensed under the MIT license.
