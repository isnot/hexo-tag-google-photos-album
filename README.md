# hexo-tag-google-photos-album-gallery

This is a Tag plugin for [Hexo](https://hexo.io/). It provides the ability to embed photo albums from Google Photos as a light gallery 'Gallery' component.  It is based on the hexo-tag-google-photos-album plugin found [here](https://github.com/isnot/hexo-tag-google-photos-album)

[![NPM](https://nodei.co/npm/hexo-tag-google-photos-album.png)](https://nodei.co/npm/hexo-tag-google-photos-album/)

## Getting Started

* (GitHub) [hexo-tag-google-photos-album-gallery](https://github.com/gisjeremy/hexo-tag-google-photos-album-gallery)

## Installation

```bash
$ cd <path-to-your-blog-dir>
$ npm install hexo-tag-google-photos-album-gallery --save
```

## Usage

This plugin uses [lightgallery.js](https://sachinchoolur.github.io/lightgallery.js/).

download the style and (minified) javascript files from the lightgallery repository

- lightgallery.css
- lightgallery.min.js
- lg-thumbnail.min.js
- lg-fullscreen.min.js


Place the lightgallery style tag in your template's head.ejs file (or equivalent)

```ejs
<%- css('css/lightgallery.css') %>
```

Place the lightgallery javascript and dependencies in your template's article_full.ejs file (or equivalent)

```ejs
<%- js('js/lightgallery.min.js') %>
<%- js('js/lg-thumbnail.min.js') %>
<%- js('js/lg-fullscreen.min.js') %>
```
Place the following javascript in your template's article_full.ejs (or equivalent)

```javascript
<script>
    <% if (item.dynamicEl && item.dynamicEl.length){ %>
      var galleries = [];
      <% item.dynamicEl.forEach(function(el){ %>
        if (document.getElementById('gallery-cover-img-<%-el.id%>')) {
            console.log(<%- JSON.stringify(el) %>);
            galleries.push({
                div: document.getElementById('gallery-cover-img-<%-el.id%>'),
                dynEl: <%- el.dynEl %>
            });
        };

      <% }); %>

      galleries.forEach((gallery) => {
        gallery.div.addEventListener('click', function() {
            lightGallery(gallery.div, {
                dynamic: true,
                selector: '.child_element',
                dynamicEl: gallery.dynEl
            });
        });

        gallery.div.style.textAlign = 'center';
        gallery.div.style.cursor = 'pointer';
      });
    <% } %>
</script>
```

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
[hexo-tag-google-photos-album](https://github.com/isnot/hexo-tag-google-photos-album)

## License

Copyright (c) 2019 gisjeremy
Licensed under the MIT license.
