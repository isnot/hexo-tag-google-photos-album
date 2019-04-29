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
  tip_on_top: true,
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

function ignore(source) {
  var ext = source.substring(source.lastIndexOf('.')).toLowerCase();
  return ['.js', '.css', '.html', '.htm'].indexOf(ext) > -1;
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
    throw new Error('google-photos-album: I can not get Open Graph metadata. ' + e);
  });
  logger.info('google-photos-album: got Open Graph metadata from target. ', og);
  if (typeof og !== 'object' || og === null) {
    throw new Error('google-photos-album: missing Open Graph metadata.');
  }

  if (!hasProperty(og, 'url') || og.url.indexOf('photos.google.com/share/') === -1) {
    logger.info('google-photos-album: It seems no urls for Google Photos.');
    return '';
  }

  const image_urls = await getImageUrls(html, options.maxPics).catch(e => {
    throw new Error('google-photos-album: found no images.' + e);
  });
  logger.log(`google-photos-album: found ${image_urls.length} images.`);

  let first_image = '';
  if (image_urls.length && image_urls.length === 1) {
    first_image = image_urls.pop();
  }

  const cover_image = getCoverImageHtml(og, first_image, options) || '';
  const cover_title = getCoverTitleHtml(og, url, options) || '';
  const metadatas = util.htmlTag('div', { class: 'metadatas' }, cover_image + cover_title);
  const images_html = await getImgHtml(image_urls, options).catch(e => {
    throw new Error('google-photos-album: failure on format html.');
  });
  const contents = util.htmlTag('div', { class: options.className }, metadatas + images_html);
  return await contents;
}

function getCoverTitleHtml(og, url, options) {
  let props = '';
  if (hasProperty(og, 'title') && og.title) {
    props += util.htmlTag('span', { class: 'og-title' }, util.escapeHTML(og.title));
  }

  if (hasProperty(og, 'description') && og.description) {
    const description = util.truncate(og.description, {length: options.descriptionLength, separator: ' '}) || '';
    props += util.htmlTag('span', { class: 'og-description' }, util.escapeHTML(description));
  }

  return util.htmlTag('a', { href: url, class: 'og-url', target: options.target, rel: options.rel }, props);
}

function getCoverImageHtml(og, single_image_url, options) {
  let image_html = '';
  let class_name = '';
  if (single_image_url) {
    class_name += 'gallery-item og-image';
  } else {
    class_name += 'og-image nolink';
  }
  if (hasProperty(og, 'image')) {
    image_html = util.htmlTag('img', { src: util.stripHTML(og.image), class: class_name }, '');
  }
  if (single_image_url) {
    return util.htmlTag('a', { href: single_image_url + options.mediumSize, class: 'google-photos-album-image', target: options.target, rel: options.rel }, image_html);
  }
  return image_html;
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
  let urls = images;
  if (!Array.isArray(images)) {
    logger.info('google-photos-album: I can not get images via scraping.');
    urls = [];
  }
  try {
    const html = '\n<div class="google-photos-album-images clearfix">' + urls.map(url => {
      return `<a href="${url}${options.mediumSize}" class="gallery-item" target="${options.target}" rel="${options.rel}"><img src="${url}${options.smallSize}"></a>`;
    }).join('\n') + '</div>\n';
    return await html;
  } catch (e) {
    throw new Error('google-photos-album: miss images.');
  }
}

async function copyCss() {
  const config = margeConfig(hexo.config);
  const css_filename = pathFn.basename(config.defaultStyle).replace(/[^\w-.]/g, '');
  const dest = pathFn.join(
    hexo.public_dir,
    'css',
    pathFn.basename(css_filename, pathFn.extname(css_filename)) + '.css'
  );
  const src = pathFn.join(
    hexo.plugin_dir,
    'hexo-tag-google-photos-album/css',
    css_filename
  );

  logger.debug(`google-photos-album: copyCss ${css_filename}`);
  fs.copyFile(src, dest).then(_ => {
    logger.debug(`google-photos-album: copy done. ${src} => ${dest}`);
  }).catch(e => {
    throw new Error('google-photos-album: file error. ' + e);
  });
}

// Tag Plugin
hexo.extend.tag.register('googlePhotosAlbum', args => {
  logger.log('google-photos-album: start ', args[0]);
  if (!args) { return; }
  let config = margeConfig(hexo.config);
  if (!config.generateAlways && isDev()) { return; }

  config.url = args[0];
  return getTagHtml(config).catch(e => {
    throw new Error('google-photos-album: failure.' + e);
  });
}, {
  async: true
});

// Inject Style/Script
hexo.extend.filter.register('after_post_render', data => {
  // logger.debug('google-photos-album: filter', data.source);
  if (ignore(data.source)) { return data; }

  const config = margeConfig(hexo.config);
  let myContent = data.content;
  if (config.enableDefaultStyle) {
    myContent = `<link crossorigin="anonymous" media="screen" rel="stylesheet" href="/css/${pathFn.basename(config.defaultStyle)}" />${myContent}`;
    // integrity="sha512-xxxx=="
  }
  data.content = `${myContent}${front.scriptHtml(config)}`;
  return data;
});

// Copy file
hexo.extend.filter.register('before_exit', _ => {
  const config = margeConfig(hexo.config);
  if (config.enableDefaultStyle) {
    copyCss().catch(e => {
      throw new Error('google-photos-album: miss css.' + e);
    });
  }
});
