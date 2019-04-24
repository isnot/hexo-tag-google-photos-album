/**
* hexo-tag-google-photos-album
* https://github.com/isnot/hexo-tag-google-photos-album.git
* Copyright (c) 2019 isnot (aka ISHIDA Naoto)
* Licensed under the MIT license.
* Syntax:
* {% googlePhotosAlbum url %}
**/

'use strict';
const pathFn = require('path');
const fs = require('hexo-fs');
const util = require('hexo-util');
const logger = hexo.log || console;
const got = require('got');
const cheerio = require('cheerio');
const metascraper = require('metascraper')([
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-title')(),
  require('metascraper-url')()
]);
// CAUTION
// metascraper have XSS vulnerabilities and no patch available.
// More info https://nodesecurity.io/advisories/603
// DO NOT forget escape the acquired contents or its results.

const front = require('./front-end.mjs');

const factory_defaults = {
  descriptionLength: 140,
  target: '_blank',
  rel: 'noopener',
  className: 'google-photos-album-area',
  enableDefaultStyle: true,
  defaultStyle: 'google_photos_album.css',
  largeSizeThreshold: 768,
  largeSize: '=s1920-no',
  mediumSize: '=s720-no',
  smallSize: '=w225-no',
  generateAlways: false,
  maxPics: 999,
  url: ''
};

function hasProperty(obj, prop) {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function isDev() {
  if (process.argv.length > 2 && (process.argv[2].match(/^d/) || process.argv[2].match(/^g/))) {
    // logger.log('hexo-env: production');
    return false;
  }
  // logger.log('hexo-env: development');
  return true;
}

function ignore(data) {
  var source = data.source;
  var ext = source.substring(source.lastIndexOf('.')).toLowerCase();
  return ['.html', '.htm'].indexOf(ext) > -1;
}

function margeConfig(config_yml) {
  let config = {};
  if (hasProperty(config_yml, 'googlePhotosAlbum')) {
    config = config_yml.googlePhotosAlbum;
  }
  if (typeof config === 'object' && config !== null) {
    config = Object.assign(factory_defaults, config);
  }
  return config;
}

async function getTagHtml(options) {
  const { body: html, url } = await got(options.url).catch(error => {
    throw new Error('google-photos-album: I can not get contents. ' + error.response.body);
  });

  const og = await metascraper({ html, url }).catch(e => {
    throw new Error('google-photos-album: I can not get metadata. ' + e);
  });
  logger.log('google-photos-album:', og);
  if (typeof og !== 'object' || og === null) {
    throw new Error('google-photos-album: something went wrong!');
  }

  const image_urls = await getImageUrls(html, options.maxPics).catch(e => {
    throw new Error('google-photos-album: I can not get images.' + e);
  });
  logger.log(`google-photos-album: found ${image_urls.length} images.`);
  if (!Array.isArray(image_urls) || image_urls.length < 1) {
    throw new Error('google-photos-album: I can not get images via scraping.');
  }

  let head_image = '';
  let props = '';

  if (hasProperty(og, 'image')) {
    head_image = util.htmlTag('img', { src: util.stripHTML(og.image), class: 'og-image nolink' }, '');
  }

  if (hasProperty(og, 'title')) {
    props += util.htmlTag('span', { class: 'og-title' }, util.escapeHTML(og.title));
  }

  if (hasProperty(og, 'description')) {
    const description = util.truncate(og.description, {length: options.descriptionLength, separator: ' '});
    props += util.htmlTag('span', { class: 'og-description' }, util.escapeHTML(description));
  }

  const alink = util.htmlTag('a', { href: url, class: 'og-url', target: options.target, rel: options.rel }, props);
  const metadatas = util.htmlTag('div', { class: 'metadatas' }, head_image + alink);
  const images_html = await getImgHtml(image_urls, options).catch(e => {
    throw new Error('google-photos-album: I can not format html.');
  });
  const contents = util.htmlTag('div', { class: options.className }, metadatas + images_html);
  return await contents;
}

async function getImageUrls(html, max) {
  if (typeof html !== 'string' || html === '') {
    throw new Error('google-photos-album: need html.');
  }
  const regex = /(?:")(https:\/\/lh\d\.googleusercontent\.com\/[\w-]+)(?=",\d+,\d+,null,null,null,null,null,null,)/mg;
  let matched = [];
  let myArray;
  while ((myArray = regex.exec(html)) !== null) {
    if (max >= matched.length) {
      matched.push(...myArray.slice(1));
    }
  }
  return await matched;
}

async function getImgHtml(images, options) {
  try {
    const html = '\n<div class="google-photos-album-images clearfix">' + images.map(url => {
      return `<a href="${url}${options.mediumSize}" class="gallery-item" target="${options.target}" rel="${options.rel}"><img src="${url}${options.smallSize}"></a>`;
    }).join('\n') + '</div>\n';
    return await html;
  } catch (e) {
    throw new Error('google-photos-album: miss.');
  }
}

// Tag Plugin
hexo.extend.tag.register('googlePhotosAlbum', args => {
  logger.log('google-photos-album: start ', args[0]);
  if (!args) { return; }
  let config = margeConfig(hexo.config);
  if (!config.generateAlways && isDev()) { return; }

  config.url = args[0];
  return getTagHtml(config).catch(e => {
    throw new Error('google-photos-album: miss.' + e);
  });
}, {
  async: true
});

// Inject Style/Script
hexo.extend.filter.register('after_post_render', data => {
  logger.debug('google-photos-album: filter', Object.keys(data).length);
  if (ignore(data)) { return data; }

  const config = margeConfig(hexo.config);
  const $ = cheerio.load(data.content, {decodeEntities: false});

  if (config.enableDefaultStyle) {
    $('body').append(`<link crossorigin="anonymous" media="screen" rel="stylesheet" href="/css/${pathFn.basename(config.defaultStyle)}" />`);
    // integrity="sha512-xxxx=="
  }

  $('body').append(front.scriptHtml(config));

  data.content = $('body').html();
  return data;
});

// Copy Files
if (margeConfig({}).enableDefaultStyle) {
  hexo.extend.generator.register('google-photos-album-css', locals => {
    const config = margeConfig(locals.config);
    logger.debug('google-photos-album: generator', Object.keys(locals).length);

    // const css_filename = pathFn.basename(config.defaultStyle).replace(/[\w-]/g, '');
    const css_filename = config.defaultStyle;
    const dist = pathFn.join(
      hexo.public_dir,
      'css',
      pathFn.basename(css_filename, pathFn.extname(css_filename)) + '.css'
    );
    const src = pathFn.join(
      hexo.plugin_dir,
      'hexo-tag-google-photos-album/css',
      css_filename
    );
    return {
      path: dist,
      data: _ => {
        logger.debug(`google-photos-album: copy ${src} => ${dist}`);
        try {
          return fs.createReadStream(src);
        } catch (e) {
          throw new Error('google-photos-album: file error. ' + e);
        }
      }
    };
  });
}

// sample data
// <meta name="og:site_name" content="Google Photos">
// <meta property="og:title" content="2019年4月18日">
// <meta property="og:description" content="8 new photos added to shared album">
// <meta property="og:url" content="https://photos.google.com/share/AF1QipM-qmCtmxuhoUj5Y2lP7OUWe9FH1KjHqVuDokH9IxM1mj3ayWcbHxNa43NfaBLe2A?key=SUIyM0k0RkQ4OTY4elZmQVBwNDBFOFhJZVZwRTBn">
// <meta property="og:image" content="https://lh3.googleusercontent.com/UT9ZLJ58COPY1aqWW9LD2HTWVONf9jWsqN4I85RFeUqe0-8Ag63EeGZOGMhJtNBlmPCvNBi_l13OWAFVP5fW-xYDm5WWrtGnODVr027TxPElWdty_waXNYR1uN-9B52_ert8M36YwCg=w600-h315-p-k">
// ["https://lh3.googleusercontent.com/qNXy20DDeW3ClJw9J7UqgtKe6iouW_pemCUONrR2zoDiFHhKqJq5RtLeBSj8zmv6Opjg1oD81E8J_UEQworGABuZhf6aHmPaUaXwCFAJ77rrH285Q-j4LNmmebSguFJb0OsDyiwj8ztb30VEGS1nP79-ueUh4rQ3ZaBwk18tNu6ieQlzqfMu2k0kiQmPdSxBXrdDuAdCrGbXrn7GpJ8B7T06CG2u2F9wEGTSdX3y495SeTtyOnsolkQE8WFf89jxGIwXnjeYWN17sH5ESqBrLi9zfRMHojpS5okDRSz_gmUkSIijYf_fcecUYf5qB11Vrk4umwazTYz-OtOh9yhww9d1bJJpiZblnPIrSwxXnU8-a_oT68bclp2ZJkISDq2dEX0k6rgIuu7qoLjgoz7PruYBwk5jY9pQO36S3_6fXEtEy9rgH1NTqExhIKDfeQUX3207IRSx1MPlX4otbRn6VNrQkyGQUCRC5vyx99Pzn7AQSqz9tu6KGcAoeL5ezdkkiOdW91WG81nIkgEvJV3Pmz_E1wOvLeF3dk1mMSo0W4lr8ahdJTciI_pxuUpYQMpki8bpkqTlGFX8TvQPOc0UOmCPemahDcOFDYf7k6uTWdUfmbIuFAivTCdanR22-fcZ2AIfJ2IkzEqODL9meevZOAxIBL44axEH6JluemDoQJ1lIn3sD_tyn9Kt-Y0xo0H4WNDd6BS6u4fmx1YBfG4OPw5xMQ",4000,3000,null,null,null,null,null,null,[5264470]]
