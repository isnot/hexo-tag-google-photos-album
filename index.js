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

function isPageOrPost() {
  // if (hexo.extend.helper.store.is_page()) {
  // }

  logger.log('google_photos_album: DEV', Object.keys(hexo), Object.keys(hexo.extend), Object.keys(hexo.extend.helper.store));
  logger.log('google_photos_album: DEV permalink', util.Permalink(hexo.config.permalink));
  logger.log('google_photos_album: DEV', hexo.extend.helper.store.url_for(), hexo.extend.helper.store.is_page(), hexo.extend.helper.store.is_post());

  try {
    if (hexo.helper.is_page || hexo.helper.is_post) {
      return true;
    }
  } catch (e) {
    throw new Error('I can not detect what type content is. ', e);
  }
  return false;
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

  const cover_image = getCoverImageHtml(og, hexo.page, options);
  const cover_title = getCoverTitleHtml(og, url, options);
  const metadatas = util.htmlTag('div', { class: 'metadatas' }, cover_image + cover_title);
  const images_html = await getImgHtml(image_urls, options).catch(e => {
    throw new Error('google-photos-album: I can not format html.');
  });
  const contents = util.htmlTag('div', { class: options.className }, metadatas + images_html);
  return await contents;
}

function getCoverTitleHtml(og, url, options) {
  let props = '';
  if (hasProperty(og, 'title')) {
    props += util.htmlTag('span', { class: 'og-title' }, util.escapeHTML(og.title));
  }

  if (hasProperty(og, 'description')) {
    const description = util.truncate(og.description, {length: options.descriptionLength, separator: ' '});
    props += util.htmlTag('span', { class: 'og-description' }, util.escapeHTML(description));
  }

  return util.htmlTag('a', { href: url, class: 'og-url', target: options.target, rel: options.rel }, props);
}

function getCoverImageHtml(og, page, options) {
  let image_html = '';
  if (hasProperty(og, 'image')) {
    image_html = util.htmlTag('img', { src: util.stripHTML(og.image), class: 'og-image nolink' }, '');
  }
  if (!options.tip_on_top || isPageOrPost() || !hasProperty(page, 'permalink')) {
    return image_html;
  }
  return util.htmlTag('a', { href: page.permalink, class: 'google-photos-album-cover-image-link' }, image_html);
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
  if (options.tip_on_top && !isPageOrPost()) {
    logger.debug('google-photos-album: show only album cover image, without other.');
    return '';
  }
  try {
    const html = '\n<div class="google-photos-album-images clearfix">' + images.map(url => {
      return `<a href="${url}${options.mediumSize}" class="gallery-item" target="${options.target}" rel="${options.rel}"><img src="${url}${options.smallSize}"></a>`;
    }).join('\n') + '</div>\n';
    return await html;
  } catch (e) {
    throw new Error('google-photos-album: miss.');
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
    throw new Error('google-photos-album: miss.' + e);
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
