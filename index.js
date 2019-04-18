/**
* hexo-tag-google-photos-album
* https://github.com/isnot/hexo-tag-google-photos-album.git
* Copyright (c) 2019, isnot
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
const escapeHTML = require('escape-html');
const metascraper = require('metascraper')([
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-title')(),
  require('metascraper-url')()
]);
const got = require('got');

const descriptionLength = (hexo.config.googlePhotosAlbum && hexo.config.googlePhotosAlbum.descriptionLength)
      ? hexo.config.googlePhotosAlbum.descriptionLength : 140;
const className = (hexo.config.googlePhotosAlbum && hexo.config.googlePhotosAlbum.className)
      ? hexo.config.googlePhotosAlbum.className : 'google-photos-album-area';

hexo.extend.tag.register('googlePhotosAlbum', args => {
  if (!args) { return; }
  if (typeof hexo.config.googlePhotosAlbum !== 'object') {
    throw new Error('need googlePhotosAlbum in _config.yml');
    return;
  }
  if (!hexo.config.googlePhotosAlbum.generateAlways && isDev()) { return; }

  return getTagHtml(
    Object.assign(hexo.config.googlePhotosAlbum, {url: args[0], maxPics: args[1]})
  ).then(tag => {
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
  console.log(og);
  if (typeof og !== 'object' || og === null) {
    throw new Error('I can not get metadata.');
  }

  const image_urls = await getImageUrls(html);
  console.log(image_urls);
  if (!Array.isArray(image_urls) || image_urls.length < 1) {
    throw new Error('I can not get images from album.');
  }

  let head_image = '';
  let metadatas = '';

  if (hasProperty(og, 'image')) {
    head_image = util.htmlTag('img', { src: og.image }, '');
    head_image = util.htmlTag('div', { class: 'metadatas og-image'}, head_image);
  }

  metadatas += util.htmlTag('span', { class: 'og-title' }, escapeHTML(og.title));

  if (hasProperty(og, 'description')) {
    const description = adjustLength(og.description, descriptionLength);
    metadatas += util.htmlTag('span', { class: 'og-description' }, escapeHTML(description));
  }

  const alink = util.htmlTag('a', { href: url, class: 'og-url', target: options.target, rel: options.rel }, metadatas);

  metadatas = util.htmlTag('div', { class: 'metadatas' }, alink);

  const tag = util.htmlTag('div', { class: className },  head_image + metadatas);
  return tag;
}

function getImageUrls(html) {
  if (typeof html !== 'string' || html === '') {
    return [];
  }

  return ['test_image'];
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

//////////////////////////

// function addLoadEvent(func) {
//    const oldonload = window.onload;
//    if (typeof window.onload != 'function') {
//        window.onload = func;
//    } else {
//        window.onload = function() {
//            oldonload();
//            func();
//        };
//    }
// }

// addLoadEvent(function() {
//    try {
//    } catch(e) {
//        console.log(e);
//    }
// });

////////////////////
// <meta name="og:site_name" content="Google Photos">
// <meta property="og:title" content="2019年4月18日">
// <meta property="og:description" content="8 new photos added to shared album">
// <meta property="og:url" content="https://photos.google.com/share/AF1QipM-qmCtmxuhoUj5Y2lP7OUWe9FH1KjHqVuDokH9IxM1mj3ayWcbHxNa43NfaBLe2A?key=SUIyM0k0RkQ4OTY4elZmQVBwNDBFOFhJZVZwRTBn">
// <meta property="og:image" content="https://lh3.googleusercontent.com/UT9ZLJ58COPY1aqWW9LD2HTWVONf9jWsqN4I85RFeUqe0-8Ag63EeGZOGMhJtNBlmPCvNBi_l13OWAFVP5fW-xYDm5WWrtGnODVr027TxPElWdty_waXNYR1uN-9B52_ert8M36YwCg=w600-h315-p-k">

// <div class="google-photos-album-area">
//   <div class="metadata og-image">
//     <img src="https://lh3.googleusercontent.com/c9OjlbkVvrK8SccaAdpg9rb5e_zmPhHSp1XOtKXssDOcM3Uh15nzWY5XvZ5iMZXSo58HCjoisq3Q2DiafqzRticVrTlkn6ztCGfJ_chRpvqgqxAL5r4aio4D-tgjYwRUgDPWw3jiBic=w600-h315-p-k">
//   </div>
//   <div class="metadata">
//     <a href="https://photos.app.goo.gl/BPMyX13M24MA7hWx6" class="og-url" target="_blank" rel="noopener">
//       <span class="og-title">さくら2019</span>
//       <span class="og-description">8 new photos added to shared album</span>
//     </a>
//   </div>
// </div>

// https://lh3.googleusercontent.com/POAIcyaMNHzc2hslHMj08htML9FtB5inQK6IrkUA1grUGIndo0FXCo_WbLVKXT0xJo_acPXXbiSNHTQ94xfSd8MqbNoNCmfczCBrBD6e_98s-6gqoHITFllFznfhRUHIKW8WZ7hE-Zg
// https://lh3.googleusercontent.com/GfDV8DCG0qrZIXHDCiJx5-dpDdC1Y4CX6N400lGdQgKSUlf-YeHvb065BHrunvJT92vRBToUDQKkksjARr_wm0D6nd0YlrQL-EEmumLpLxHG0Bsrjw8S-fvRBHfSJib5oXAg0Rt9ECY
// https://lh3.googleusercontent.com/Dl3Ku3qHe5aUeDlpu4hEwALwyzqcHbd9hbHlsyxYDPtv1dhLuOa20mgOJ4C6juUR47TNAjW9PfXaT-Pk2WThPz8nlunqVAdkjVrE4fWGHrVLHWK7jbdNldcMALJc117s_T8lHjXM-Ro
// https://lh3.googleusercontent.com/WqSyuXpDnrpuO9jPhHFK1c61jiwuzZ536jyGWHG0drVc6a1x2Z8vwgyD2wkRvkvH496B7AZRESeXTCWfXMgPlZJdqGNwaYGbZxz9_xlDv7PDQk7sgxvzfr-moYcfK9lScOUo1uk1XJA
// https://lh3.googleusercontent.com/fCM0HR6RiT1-yRE-xkFMlE_Ddak2fGSzLGlC-WUjrRdHYsvYc4nLigjY37JztY8-r6YpzU71t4YJ37dzS2vNSPVg-o2laIzlbZ6LyGPH5gq0-qR-aebWNCK-Z85zkJYLOOavYiib-zw
// https://lh3.googleusercontent.com/KoaMPRIj3LCdk6DPeYmduXCAPRtXoxuixLVgrt2xd_qaenqWcRwWlQfpF1r9Wdf39cMl6OkBPRAV5QwJMTbd-D1y1jIwKPZlNu4CJ5MQ3m9UBW8Bs47RwOs8mEElWq3ZH-USxA-92g8
// https://lh3.googleusercontent.com/fM3n0qwHFEvejwNzfVXJo5vAKhQHvf_V6oDXBg9IY4nhFEONgBAWP6J7oN5U7Qt7cpZVMT318pCfizCl3vj2yif8am9yctMuzH1VSkvExOzHuGpwFoLDHABmv0z23q7kbl4_CFt0DVA
// https://lh3.googleusercontent.com/UT9ZLJ58COPY1aqWW9LD2HTWVONf9jWsqN4I85RFeUqe0-8Ag63EeGZOGMhJtNBlmPCvNBi_l13OWAFVP5fW-xYDm5WWrtGnODVr027TxPElWdty_waXNYR1uN-9B52_ert8M36YwCg

// ["https://lh3.googleusercontent.com/qNXy20DDeW3ClJw9J7UqgtKe6iouW_pemCUONrR2zoDiFHhKqJq5RtLeBSj8zmv6Opjg1oD81E8J_UEQworGABuZhf6aHmPaUaXwCFAJ77rrH285Q-j4LNmmebSguFJb0OsDyiwj8ztb30VEGS1nP79-ueUh4rQ3ZaBwk18tNu6ieQlzqfMu2k0kiQmPdSxBXrdDuAdCrGbXrn7GpJ8B7T06CG2u2F9wEGTSdX3y495SeTtyOnsolkQE8WFf89jxGIwXnjeYWN17sH5ESqBrLi9zfRMHojpS5okDRSz_gmUkSIijYf_fcecUYf5qB11Vrk4umwazTYz-OtOh9yhww9d1bJJpiZblnPIrSwxXnU8-a_oT68bclp2ZJkISDq2dEX0k6rgIuu7qoLjgoz7PruYBwk5jY9pQO36S3_6fXEtEy9rgH1NTqExhIKDfeQUX3207IRSx1MPlX4otbRn6VNrQkyGQUCRC5vyx99Pzn7AQSqz9tu6KGcAoeL5ezdkkiOdW91WG81nIkgEvJV3Pmz_E1wOvLeF3dk1mMSo0W4lr8ahdJTciI_pxuUpYQMpki8bpkqTlGFX8TvQPOc0UOmCPemahDcOFDYf7k6uTWdUfmbIuFAivTCdanR22-fcZ2AIfJ2IkzEqODL9meevZOAxIBL44axEH6JluemDoQJ1lIn3sD_tyn9Kt-Y0xo0H4WNDd6BS6u4fmx1YBfG4OPw5xMQ",4000,3000,null,null,null,null,null,null,[5264470]]
