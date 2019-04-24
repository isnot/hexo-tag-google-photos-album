/**
* hexo-tag-google-photos-album
* https://github.com/isnot/hexo-tag-google-photos-album.git
* Copyright (c) 2019 isnot
* Licensed under the MIT license.
* Syntax:
* {% googlePhotosAlbum url %}
**/

'use strict';
// const pathFn = require('path');
const fs = require('hexo-fs');
const util = require('hexo-util');
const got = require('got');
const metascraper = require('metascraper')([
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-title')(),
  require('metascraper-url')()
]);

const factory_defaults = {
  descriptionLength: 140,
  target: '_blank',
  rel: 'noopener',
  className: 'google-photos-album-area',
  enableDefaultStyle: true,
  defaultStyle: './css/google_photos_album.css',
  largeSizeThreshold: 768,
  largeSize: '=s1920-no',
  middleSize: '=s720-no',
  smallSize: '=w225-no',
  generateAlways: false,
  maxPics: 999,
  url: '',
  userStyle: ''
};

hexo.extend.tag.register('googlePhotosAlbum', args => {
  console.log('DEBUG tag', typeof this, args);
  if (!args) { return; }
  let config = {};
  if (hasProperty(hexo.config, 'googlePhotosAlbum') {
    config = hexo.config.googlePhotosAlbum;
  }
  if (typeof config === 'object' && config !== null) {
    config = Object.assign(factory_defaults, config);
  }
  config = Object.assign(config, {url: args[0]});
  config.middleSizeRegExp = util.escapeRegExp(config.middleSize);

  if (!config.generateAlways && isDev()) { return; }

  return getTagHtml(config).then(tag => {
    return tag;
  }).catch(err => {
    console.log('google-photos-album: Something went wrong! ', err);
    return '';
  });
}, {
  async: true
});

// inject_ready
hexo.extend.filter.register('after_generate', post => {
  console.log('DEBUG filter', typeof this, typeof post);
  let config = {};
  if (hasProperty(hexo.config, 'googlePhotosAlbum') {
    config = hexo.config.googlePhotosAlbum;
  }
  if (typeof config === 'object' && config !== null) {
    config = Object.assign(factory_defaults, config);
  }
  if (config.enableDefaultStyle) {
    const css = fs.createReadStream(config.defaultStyle);
    // inject.style('head_end', {media: 'screen'}, css);
    // inject.link('head_end', { src: config.defaultStyle, rel: 'stylesheet' }, opts);
  }

  const script_data = `<script>${getClientSideScript(config)}</script>`;
  // inject.raw('body_end', script_data);
  // const googlePhotosAlbum_opt = ${JSON.stringify(options)};
  // const googlePhotosAlbum_images = ${JSON.stringify(image_urls)};
  // inject.require('body_begin', module, opts);
});

async function getTagHtml(options) {
  const { body: html, url } = await got(options.url);
  // try {
  // } catch (error) {
  //   console.log(error.response.body);
  // }

  const og = await metascraper({ html, url });
  console.log('google-photos-album:', og);
  if (typeof og !== 'object' || og === null) {
    throw new Error('google-photos-album: I can not get metadata.');
  }

  const image_urls = await getImageUrls(html, options.maxPics);
  console.log('google-photos-album:', image_urls);
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
  const images_html = getImgHtml(image_urls, options);
  const contents = util.htmlTag('div', { class: options.className }, metadatas + images_html);
  return contents;
}

function getImageUrls(html, max) {
  if (typeof html !== 'string' || html === '') {
    return [];
  }
  const regex = /(?:")(https:\/\/lh\d\.googleusercontent\.com\/[\w-]+)(?=",\d+,\d+,null,null,null,null,null,null,)/mg;
  let matched = [];
  let myArray;
  while ((myArray = regex.exec(html)) !== null) {
    if (max >= matched.length) {
      matched.push(...myArray.slice(1));
    }
  }
  return matched;
}

function getImgHtml(images, options) {
  return '\n<div class="google-photos-album-images clearfix">' + images.map(url => {
    return `<a href="${url}${options.middleSize}" class="gallery-item" target="${options.target}" rel="${options.rel}"><img src="${url}${options.smallSize}"></a>`;
  }).join('\n') + '</div>\n';
}

function hasProperty(obj, prop) {
  if (typeof obj !== 'obj' || obj === null) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function isDev() {
  if (process.argv.length > 2 && (process.argv[2].match(/^d/) || process.argv[2].match(/^g/))) {
    // console.log('hexo-env: production');
    return false;
  }
  // console.log('hexo-env: development');
  return true;
}

function getClientSideScript(options) {
  return `
function addLoadEvent(func) {
  const oldonload = window.onload;
  if (typeof window.onload !== 'function') {
    window.onload = func;
  } else {
    window.onload = () => {
      oldonload();
      func();
    };
  }
}
addLoadEvent(() => {
  try {
    if (window.innerWidth < options.largeSizeThreshold) {
      return;
    }
    let imgs = document.body.querySelectorAll('.google-photos-album-images a');
    for (let anchor of imgs) {
      anchor.href = anchor.href.replace(/${options.middleSizeRegExp}/i, '${options.largeSize}');
    }
  } catch(e) {
    console.log(e);
  }
});`;
}

// sample data
// <meta name="og:site_name" content="Google Photos">
// <meta property="og:title" content="2019年4月18日">
// <meta property="og:description" content="8 new photos added to shared album">
// <meta property="og:url" content="https://photos.google.com/share/AF1QipM-qmCtmxuhoUj5Y2lP7OUWe9FH1KjHqVuDokH9IxM1mj3ayWcbHxNa43NfaBLe2A?key=SUIyM0k0RkQ4OTY4elZmQVBwNDBFOFhJZVZwRTBn">
// <meta property="og:image" content="https://lh3.googleusercontent.com/UT9ZLJ58COPY1aqWW9LD2HTWVONf9jWsqN4I85RFeUqe0-8Ag63EeGZOGMhJtNBlmPCvNBi_l13OWAFVP5fW-xYDm5WWrtGnODVr027TxPElWdty_waXNYR1uN-9B52_ert8M36YwCg=w600-h315-p-k">
// ["https://lh3.googleusercontent.com/qNXy20DDeW3ClJw9J7UqgtKe6iouW_pemCUONrR2zoDiFHhKqJq5RtLeBSj8zmv6Opjg1oD81E8J_UEQworGABuZhf6aHmPaUaXwCFAJ77rrH285Q-j4LNmmebSguFJb0OsDyiwj8ztb30VEGS1nP79-ueUh4rQ3ZaBwk18tNu6ieQlzqfMu2k0kiQmPdSxBXrdDuAdCrGbXrn7GpJ8B7T06CG2u2F9wEGTSdX3y495SeTtyOnsolkQE8WFf89jxGIwXnjeYWN17sH5ESqBrLi9zfRMHojpS5okDRSz_gmUkSIijYf_fcecUYf5qB11Vrk4umwazTYz-OtOh9yhww9d1bJJpiZblnPIrSwxXnU8-a_oT68bclp2ZJkISDq2dEX0k6rgIuu7qoLjgoz7PruYBwk5jY9pQO36S3_6fXEtEy9rgH1NTqExhIKDfeQUX3207IRSx1MPlX4otbRn6VNrQkyGQUCRC5vyx99Pzn7AQSqz9tu6KGcAoeL5ezdkkiOdW91WG81nIkgEvJV3Pmz_E1wOvLeF3dk1mMSo0W4lr8ahdJTciI_pxuUpYQMpki8bpkqTlGFX8TvQPOc0UOmCPemahDcOFDYf7k6uTWdUfmbIuFAivTCdanR22-fcZ2AIfJ2IkzEqODL9meevZOAxIBL44axEH6JluemDoQJ1lIn3sD_tyn9Kt-Y0xo0H4WNDd6BS6u4fmx1YBfG4OPw5xMQ",4000,3000,null,null,null,null,null,null,[5264470]]
