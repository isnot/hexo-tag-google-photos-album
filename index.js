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
const ogs = require('open-graph-scraper');
const front = require('./front-end');
// const { inspect } = require('util');

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

function ignore(source) {
  const ext = source.substring(source.lastIndexOf('.')).toLowerCase();
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

async function getTagHtml(options, counter) {
  const data = await ogs(options).catch(error => {
    throw new Error('google-photos-album: I can not get contents or Open Graph metadata. ' + JSON.stringify(error));
  });
  const { error, result, response } = data;
  logger.log('error:', error); // This is returns true or false. True if there was a error. The error it self is inside the results object.
  logger.log('result:', result); // This contains all of the Open Graph results
  logger.log('response:', response); // This contains the HTML of page
  const og = result;
  const html = response;

  logger.info('google-photos-album: got Open Graph metadata from target. ', og);
  if (typeof og !== 'object' || og === null) {
    throw new Error('google-photos-album: missing Open Graph metadata.');
  }

  if (!hasProperty(og, 'ogUrl') || og.ogUrl.indexOf('photos.google.com/share/') === -1) {
    logger.info('google-photos-album: It seems no urls for Google Photos.');
    return '';
  }
  const url = og.ogUrl;

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
  const metadatas = util.htmlTag('div', { class: 'metadatas' }, cover_image + cover_title, false);
  const images_html = await getImgHtml(image_urls, options).catch(e => {
    throw new Error('google-photos-album: failure on format html.');
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
    return util.htmlTag('a', { href: single_image_url + options.mediumSize + '?authuser=0', class: 'google-photos-album-image gallery-item', target: options.target, rel: options.rel }, image_html, false);
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
let post_item_counter = 0;
hexo.extend.tag.register('googlePhotosAlbum', args => {
  if (!Array.isArray(args)) { return; }
  logger.log('google-photos-album: start ', args[0]);
  const config = margeConfig(hexo.config);
  if (!config.generateAlways && isDev()) { return; }

  // debugger;
  // console.log(inspect(hexo, { showHidden: true, depth: 0, colors: true }));
  // Object.getOwnPropertyNames

  config.url = args[0];
  post_item_counter++;
  return getTagHtml(config, post_item_counter).catch(e => {
    throw new Error('google-photos-album: failure.' + e);
  });
}, {
  async: true
});

// Inject Style/Script
hexo.extend.injector.register('body_end', front.scriptHtml(config), 'post');
hexo.extend.injector.register('body_end', front.scriptHtml(config), 'page');
if (config.enableDefaultStyle) {
  hexo.extend.injector.register('head_end', `<link crossorigin="anonymous" media="screen" rel="stylesheet" href="/css/${pathFn.basename(config.defaultStyle)}" />`, 'default');
}

// Copy file
hexo.extend.filter.register('before_exit', _ => {
  // debugger;
  const config = margeConfig(hexo.config);
  if (config.enableDefaultStyle) {
    copyCss().catch(e => {
      throw new Error('google-photos-album: miss css.' + e);
    });
  }
});
// debugger;
