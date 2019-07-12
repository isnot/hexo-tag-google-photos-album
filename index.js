/**
 * hexo-tag-google-photos-album-gallery
 * https://github.com/gisjeremy/hexo-tag-google-photos-album-gallery.git
 * Copyright (c) 2019 gisjeremy (aka ISHIDA Naoto)
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

const front = require('./front-end');
const { inspect } = require('util');
//const lightGallery = require('lightgallery');
let image_urls = [];

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

async function getTagHtml(options, count) {
    const { body: html, url } = await got(options.url).catch(error => {
        throw new Error('google-photos-album-gallery: I can not get contents. ' + error.response.body);
    });

    const og = await metascraper({ html, url }).catch(e => {
        throw new Error('google-photos-album-gallery: I can not get Open Graph metadata. ' + e);
    });
    logger.info('google-photos-album-gallery: got Open Graph metadata from target. ', og);
    if (typeof og !== 'object' || og === null) {
        throw new Error('google-photos-album-gallery: missing Open Graph metadata.');
    }

    if (!hasProperty(og, 'url') || og.url.indexOf('photos.google.com/share/') === -1) {
        logger.info('google-photos-album-gallery: It seems no urls for Google Photos.');
        return '';
    }
    var images = [];
    images = await getImageUrls(html, options.maxPics).catch(e => {
        throw new Error('google-photos-album-gallery: found no images.' + e);
    });

    image_urls.push({ id: count, images: images });
    logger.log(`google-photos-album-gallery: found ${images.length} images.`);

    let first_image = '';
    if (images.length && images.length === 1) {
        first_image = images.pop();
    }

    const cover_image = getCoverImageHtml(og, first_image, options) || '';
    const cover_title = getCoverTitleHtml(og, url, options) || '';
    const metadatas = util.htmlTag('div', { class: 'metadatas', id: 'gallery-cover-img-' + count }, cover_image + '<br><span style="font-size: small;margin-top: 0px;padding-top: 0px;">Click image for photo gallery</span><br>');
    //const el = createLightGallery(image_urls, options);
    // const images_html = await getImgHtml(image_urls, options).catch(e => {
    //   throw new Error('google-photos-album: failure on format html.');
    // });
    const contents = util.htmlTag('div', { class: options.className }, metadatas); //+ images_html);
    //Window.globals.image_urls = image_urls;
    return await contents
}

function getCoverTitleHtml(og, url, options) {
    let props = '';
    if (hasProperty(og, 'title') && og.title) {
        props += util.htmlTag('span', { class: 'og-title' }, util.escapeHTML(og.title));
    }

    // if (hasProperty(og, 'description') && og.description) {
    //     const description = util.truncate(og.description, { length: options.descriptionLength, separator: ' ' }) || '';
    //     props += util.htmlTag('span', { class: 'og-description' }, util.escapeHTML(description));
    // }

    return util.htmlTag('a', { href: url, class: 'og-url', target: options.target, rel: options.rel }, props);
}

function getCoverImageHtml(og, single_image_url, options) {
    let image_html = '';
    let class_name = 'og-image';
    if (!single_image_url) {
        class_name += ' nolink';
    }
    if (hasProperty(og, 'image')) {
        image_html = util.htmlTag('img', { src: util.stripHTML(og.image), class: class_name }, '');
    }
    if (single_image_url) {
        return util.htmlTag('a', { href: single_image_url + options.mediumSize, class: 'google-photos-album-image gallery-item', target: options.target, rel: options.rel }, image_html);
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

function createLightGallery(images, options) {
    let urls = images;
    //console.log('urls', urls);
    //console.log('length', urls.length);
    let el = [];

    if (!Array.isArray(images)) {
        logger.info('google-photos-album-gallery: I can not get images via scraping.');
        urls = [];
    }
    try {
        for (var i = 0; i < urls.length; i++) {
            el.push({ 'src': urls[i], 'thumb': urls[i] + options.smallSize });
        };

        return el;
    } catch (e) {
        throw new Error('google-photos-album-gallery: miss images.');
    }

};

async function getImgHtml(images, options) {
    let urls = images;
    if (!Array.isArray(images)) {
        logger.info('google-photos-album-gallery: I can not get images via scraping.');
        urls = [];
    }
    try {
        const html = '\n<div class="google-photos-album-images clearfix">' + urls.map(url => {
            return `<a href="${url}${options.mediumSize}" class="gallery-item" target="${options.target}" rel="${options.rel}"><img src="${url}${options.smallSize}"></a>`;
        }).join('\n') + '</div>\n';
        return await html;
    } catch (e) {
        throw new Error('google-photos-album-gallery: miss images.');
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
        'hexo-tag-google-photos-album-gallery/css',
        css_filename
    );

    logger.debug(`google-photos-album-gallery: copyCss ${css_filename}`);
    fs.copyFile(src, dest).then(_ => {
        logger.debug(`google-photos-album-gallery: copy done. ${src} => ${dest}`);
    }).catch(e => {
        throw new Error('google-photos-album-gallery: file error. ' + e);
    });
}

var count = 0;
// Tag Plugin
hexo.extend.tag.register('googlePhotosAlbum', args => {
    logger.log('google-photos-album-gallery: start ', args[0]);
    if (!args) { return; }
    let config = margeConfig(hexo.config);
    if (!config.generateAlways && isDev()) { return; }

    // debugger;
    // console.log(inspect(hexo, { showHidden: true, depth: 0, colors: true }));
    // Object.getOwnPropertyNames

    config.url = args[0];
    var result = getTagHtml(config, count).catch(e => {
        throw new Error('google-photos-album-gallery: failure.' + e);
    });

    count++;
    return result;
}, {
    async: true
});

// Inject Style/Script
hexo.extend.filter.register('after_post_render', data => {
    // debugger;
    // logger.debug('google-photos-album: filter', data.source);
    if (ignore(data.source)) { return data; }
    //alert('registering');

    const config = margeConfig(hexo.config);
    let myContent = data.content;
    if (config.enableDefaultStyle) {
        myContent = `<link crossorigin="anonymous" media="screen" rel="stylesheet" href="/css/${pathFn.basename(config.defaultStyle)}" />${myContent}`;
        // integrity="sha512-xxxx=="
    }
    var dynEl = []
    data.image_urls = image_urls;
    data.content = `${myContent}${front.scriptHtml(config)}`;
    image_urls.forEach((data) => {
        dynEl.push({ id: data.id, dynEl: JSON.stringify(createLightGallery(data.images, config)) });
    });
    data.dynamicEl = dynEl
    console.log(data.dynamicEl);
    return data;
});

// Copy file
hexo.extend.filter.register('before_exit', _ => {
    // debugger;
    const config = margeConfig(hexo.config);
    if (config.enableDefaultStyle) {
        copyCss().catch(e => {
            throw new Error('google-photos-album-gallery: miss css.' + e);
        });
    }
});