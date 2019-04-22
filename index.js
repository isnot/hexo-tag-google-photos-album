/**
* hexo-tag-google-photos-album
* https://github.com/isnot/hexo-tag-google-photos-album.git
* Copyright (c) 2019 isnot
* Licensed under the MIT license.
* Syntax:
* {% googlePhotosAlbum url maxPics %}
**/

'use strict';
// const pathFn = require('path');
// const fs = require('hexo-fs');
// const log = require('hexo-log')({
//   debug: false,
//   silent: false
// });
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
  maxPics: 99,
  target: '_blank',
  rel: 'noopener',
  className: 'google-photos-album-area',
  enableFactoryStyle: true,
  generateAlways: false,
  large_param: '=s2000-no',
  middle_param: '=s800-no',
  small_param: '=h170-no',
  url: ''
};

hexo.extend.tag.register('googlePhotosAlbum', args => {
  if (!args) { return; }
  let local_settings = factory_defaults;
  if (typeof hexo.config.googlePhotosAlbum === 'object' && hexo.config.googlePhotosAlbum !== null) {
    local_settings = Object.assign(factory_defaults, hexo.config.googlePhotosAlbum);
  }
  local_settings = Object.assign(local_settings, {url: args[0], maxPics: args[1]});
  local_settings.large_param_regexp = util.escapeRegExp(local_settings.large_param);

  if (!local_settings.generateAlways && isDev()) { return; }

  return getTagHtml(local_settings).then(tag => {
    return tag;
  }).catch(err => {
    console.log('Something went wrong! ', err);
    return '';
  });
}, {
  async: true
});

async function getTagHtml(options) {
  const { body: html, url } = await got(options.url);
  const og = await metascraper({ html, url });
  console.log('google-photos-album:', og);
  if (typeof og !== 'object' || og === null) {
    throw new Error('I can not get metadata.');
  }

  const image_urls = await getImageUrls(html, options.maxPics);
  console.log('google-photos-album:', image_urls);
  if (!Array.isArray(image_urls) || image_urls.length < 1) {
    throw new Error('I can not get images from album.');
  }

  let head_image = '';
  let props = '';

  if (hasProperty(og, 'image')) {
    head_image = util.htmlTag('img', { src: og.image, class: 'og-image nolink' }, '');
  }

  if (hasProperty(og, 'title')) {
    props += util.htmlTag('span', { class: 'og-title' }, util.escapeHTML(og.title));
  }

  if (hasProperty(og, 'description')) {
    const description = adjustLength(og.description, options.descriptionLength);
    props += util.htmlTag('span', { class: 'og-description' }, util.escapeHTML(description));
  }

  const alink = util.htmlTag('a', { href: url, class: 'og-url', target: options.target, rel: options.rel }, props);
  const metadatas = util.htmlTag('div', { class: 'metadatas' }, head_image + alink);
  const images_html = getImgHtml(image_urls, options);
  const contents = util.htmlTag('div', { class: options.className },  metadatas + images_html);
  const script_data = `<script>const googlePhotosAlbum_images = ${JSON.stringify(image_urls)};` + getClientSideScript() + '\n</script>\n';
  // const googlePhotosAlbum_opt = ${JSON.stringify(options)};
  return contents + script_data;
}

function getImageUrls(html, max) {
  if (typeof html !== 'string' || html === '') {
    return [];
  }
  const regex = /(?:")(https:\/\/lh\d\.googleusercontent\.com\/[\w\-]+)(?=",\d+,\d+,null,null,null,null,null,null,)/mg;
  let matched = [];
  let myArray;
  let count = 0;
  while ((myArray = regex.exec(html)) !== null) {
    matched.push(...myArray.slice(1));
    count++;
  }
  return matched;
}

function getImgHtml(images, options) {
  return '<div class="google-photos-album-images clearfix">' + images.map(url => {
    return `<a href="${url}${options.large_param}" class="gallery-item" target="${options.target}" rel="${options.rel}"><img src="${url}${options.small_param}"></a>`;
  }).join('\n') + '</div>';
}

function hasProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function adjustLength(text, maxLength) {
  if (typeof text === 'string' && text.length > maxLength) {
    text = text.slice(0, maxLength) + '…';
  }
  return text;
}

function isDev() {
  if (process.argv.length > 2 && (process.argv[2].match(/^d/) || process.argv[2].match(/^g/))) {
    // console.log('hexo-env: production');
    return false;
  } else {
    // console.log('hexo-env: development');
    return true;
  }
}

function getClientSideScript() {
  return `
function addLoadEvent(func) {
  const oldonload = window.onload;
  if (typeof window.onload !== 'function') {
    window.onload = func;
  } else {
    window.onload = function() {
      oldonload();
      func();
    };
  }
}
addLoadEvent(function() {
  try {
    if (!Array.isArray(googlePhotosAlbum_images)) { return; }
    const imgs = document.body.querySelectorAll('.googlePhotosAlbum_images a');
    for (let anchor of imgs) {
      anchor.href = anchor.href.replace(/${options.large_param_regexp}/i, middle_param);
    }
  } catch(e) {
    console.log(e);
  }
});`;
}

////////////////////
// <meta name="og:site_name" content="Google Photos">
// <meta property="og:title" content="2019年4月18日">
// <meta property="og:description" content="8 new photos added to shared album">
// <meta property="og:url" content="https://photos.google.com/share/AF1QipM-qmCtmxuhoUj5Y2lP7OUWe9FH1KjHqVuDokH9IxM1mj3ayWcbHxNa43NfaBLe2A?key=SUIyM0k0RkQ4OTY4elZmQVBwNDBFOFhJZVZwRTBn">
// <meta property="og:image" content="https://lh3.googleusercontent.com/UT9ZLJ58COPY1aqWW9LD2HTWVONf9jWsqN4I85RFeUqe0-8Ag63EeGZOGMhJtNBlmPCvNBi_l13OWAFVP5fW-xYDm5WWrtGnODVr027TxPElWdty_waXNYR1uN-9B52_ert8M36YwCg=w600-h315-p-k">
// ["https://lh3.googleusercontent.com/qNXy20DDeW3ClJw9J7UqgtKe6iouW_pemCUONrR2zoDiFHhKqJq5RtLeBSj8zmv6Opjg1oD81E8J_UEQworGABuZhf6aHmPaUaXwCFAJ77rrH285Q-j4LNmmebSguFJb0OsDyiwj8ztb30VEGS1nP79-ueUh4rQ3ZaBwk18tNu6ieQlzqfMu2k0kiQmPdSxBXrdDuAdCrGbXrn7GpJ8B7T06CG2u2F9wEGTSdX3y495SeTtyOnsolkQE8WFf89jxGIwXnjeYWN17sH5ESqBrLi9zfRMHojpS5okDRSz_gmUkSIijYf_fcecUYf5qB11Vrk4umwazTYz-OtOh9yhww9d1bJJpiZblnPIrSwxXnU8-a_oT68bclp2ZJkISDq2dEX0k6rgIuu7qoLjgoz7PruYBwk5jY9pQO36S3_6fXEtEy9rgH1NTqExhIKDfeQUX3207IRSx1MPlX4otbRn6VNrQkyGQUCRC5vyx99Pzn7AQSqz9tu6KGcAoeL5ezdkkiOdW91WG81nIkgEvJV3Pmz_E1wOvLeF3dk1mMSo0W4lr8ahdJTciI_pxuUpYQMpki8bpkqTlGFX8TvQPOc0UOmCPemahDcOFDYf7k6uTWdUfmbIuFAivTCdanR22-fcZ2AIfJ2IkzEqODL9meevZOAxIBL44axEH6JluemDoQJ1lIn3sD_tyn9Kt-Y0xo0H4WNDd6BS6u4fmx1YBfG4OPw5xMQ",4000,3000,null,null,null,null,null,null,[5264470]]
