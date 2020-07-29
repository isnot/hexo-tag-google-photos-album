/**
 * hexo-tag-google-photos-album
 * https://github.com/isnot/hexo-tag-google-photos-album
 * Copyright (c) 2019-2020 isnot (aka ISHIDA Naoto)
 * Licensed under the MIT license.
 * Syntax:
 * {% googlePhotosAlbum url %}
 **/

'use strict';
const util = require('hexo-util');
const got = require('got');
const ogs = require('open-graph-scraper');
const front = require('./front-end');
// const { inspect } = require('util');

const factory_defaults = {
  descriptionLength: 140,
  target: '_blank',
  rel: 'noopener',
  className: 'google-photos-album-area',
  enableDefaultStyle: true,
  defaultStyle: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/hexo-tag-google-photos-album@1.2.0/css/google_photos_album.css" integrity="sha256-+fmg1peSAbhT32GtVA2D9f1zAjN3v6lX+9Y14jKmYBs=" crossorigin="anonymous">',
  largeSizeThreshold: 768,
  largeSize: '=s1920-no',
  mediumSize: '=s720-no',
  smallSize: '=w225-no',
  tip_on_top: true,
  generateAlways: true,
  maxPics: 999,
  url: ''
};

const logger = hexo.log || console;

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

async function getTagHtml(options, counter) {
  const { body: html } = await got(options.url).catch(e => {
    throw new Error(`google-photos-album: request failure. ${JSON.stringify(e)}`);
  });
  const { error, result: og } = await ogs({html}).catch(e => {
    throw new Error(`google-photos-album: I can not get contents or Open Graph metadata. ${JSON.stringify(e)}`);
  });
  logger.debug('google-photos-album: ogs result:', Object.keys(og));

  if (error) {
    throw new Error(`google-photos-album: retrieving metadata failure. ${JSON.stringify([options, og])}`);
  }
  if (typeof og !== 'object' || og === null) {
    throw new Error(`google-photos-album: missing Open Graph metadata. ${JSON.stringify([options, og])}`);
  }
  logger.debug('google-photos-album: got Open Graph metadata from target. ', og);

  if (!hasProperty(og, 'ogUrl') || og.ogUrl.indexOf('photos.google.com/share/') === -1) {
    logger.info('google-photos-album: It seems no urls for Google Photos.');
    return '';
  }
  const url = og.ogUrl;

  const image_urls = await getImageUrls(html, options.maxPics).catch(e => {
    throw new Error(`google-photos-album: found no images. ${e}`);
  });
  logger.log(`google-photos-album: found ${image_urls.length} images.`);

  let first_image = '';
  if (image_urls.length && image_urls.length === 1) {
    first_image = image_urls.pop();
  }

  const cover_image = getCoverImageHtml(og, first_image, options) || '';
  const cover_title = getCoverTitleHtml(og, url, options) || '';
  const metadatas = util.htmlTag('div', { class: 'metadatas' }, cover_image + cover_title, false);
  const images_html = await getImgHtml(image_urls, options).catch(e => {
    throw new Error(`google-photos-album: failure on format html. ${JSON.stringify(e)}`);
  });
  const contents = util.htmlTag('div', { class: options.className, id: `${options.className}${counter}` }, metadatas + images_html, false);
  return await contents;
}

function getCoverTitleHtml(og, url, options) {
  let props = '';
  if (hasProperty(og, 'ogTitle') && og.ogTitle) {
    props += util.htmlTag('span', { class: 'og-title' }, og.ogTitle, true);
  }

  if (hasProperty(og, 'ogDescription') && og.ogDescription) {
    const description = util.truncate(og.ogDescription, {length: options.descriptionLength, separator: ' '}) || '';
    props += util.htmlTag('span', { class: 'og-description' }, description, true);
  }

  return util.htmlTag('a', { href: url, class: 'og-url', target: options.target, rel: options.rel }, props, false);
}

function getCoverImageHtml(og, single_image_url, options) {
  let image_html = '';
  let class_name = 'og-image';
  if (!single_image_url) {
    class_name += ' nolink';
  }
  if (hasProperty(og, 'ogImage')) {
    image_html = util.htmlTag('img', { src: util.stripHTML(og.ogImage.url), class: class_name }, '', true);
  }
  if (single_image_url) {
    return util.htmlTag('a', { href: `${single_image_url}${options.mediumSize}?authuser=0`, class: 'google-photos-album-image gallery-item', target: options.target, rel: options.rel }, image_html, false);
  }
  return image_html;
}

async function getImageUrls(html, max) {
  if (typeof html !== 'string' || html === '') {
    throw new Error('google-photos-album: need html.');
  }
  const regex = /(?:")(https:\/\/lh\d\.googleusercontent\.com\/[\w-]+)(?=",\d+,\d+,null,\[\]\s)/mg;
  const matched = {};
  let myArray;
  while ((myArray = regex.exec(html)) !== null) {
    if (max >= Object.keys(matched).length) {
      matched[myArray.slice(1).pop()] = true;
    }
  }
  return await Object.keys(matched);
}

async function getImgHtml(images, options) {
  let urls = images;
  if (!Array.isArray(images)) {
    logger.info('google-photos-album: I can not get images via scraping.');
    urls = [];
  }
  try {
    const html = '\n<div class="google-photos-album-images clearfix">' + urls.map(url => {
      return `<a href="${url}${options.mediumSize}" class="gallery-item" target="${options.target}" rel="${options.rel}"><img src="${url}${options.smallSize}?authuser=0"></a>`;
    }).join('\n') + '</div>\n';
    return await html;
  } catch (e) {
    throw new Error('google-photos-album: miss images.');
  }
}

// Tag Plugin
let post_item_counter = 0;
hexo.extend.tag.register('googlePhotosAlbum', args => {
  logger.debug('google-photos-album: loaded');
  const config = margeConfig(hexo.config);
  if (!Array.isArray(args)) { return; }
  if (!config.generateAlways && isDev()) { return; }

  // debugger;
  // console.log(inspect(hexo, { showHidden: true, depth: 0, colors: true }));
  // Object.getOwnPropertyNames

  logger.log('google-photos-album: start ', args[0]);
  config.url = args[0];
  post_item_counter++;
  return getTagHtml(config, post_item_counter).catch(e => {
    throw new Error(`google-photos-album: failure. ${e}`);
  });
}, {
  async: true
});

// Inject Style/Script
if (hasProperty(hexo.extend, 'injector')) {
  const config = margeConfig(hexo.config);
  hexo.extend.injector.register('body_end', front.scriptHtml(config), 'default');
  if (config.enableDefaultStyle) {
    hexo.extend.injector.register('head_end', config.defaultStyle, 'default');
  }
} else {
  logger.warn('google-photos-album: Hexo version 5.0 or later is highly recommended. https://hexo.io/news/2020/07/29/hexo-5-released/');
  logger.warn('google-photos-album: No scripts/styles are injected. Setup its manually in your theme if you needed.');
}
