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

function registerToLoadEvent() {
  addLoadEvent(() => {
    try {
      if (window.innerWidth < Number('LARGESIZETHRESHOLD')) {
        return;
      }
      let imgs = document.body.querySelectorAll('.google-photos-album-images a');
      for (let anchor of imgs) {
        anchor.href = anchor.href.replace(/MEDIUMSIZEREGEXP/i, 'LARGESIZE');
      }
    } catch (e) {
      console.log(e);
    }
  });
}

function stringify(v) {
  if (typeof v === 'function') {
    return v.toString();
  }
  return String(v);
}

function getClientSideScript(options) {
  let content = stringify(registerToLoadEvent);
  content = content
    .replace('function registerToLoadEvent() {', '')
    .replace('LARGESIZETHRESHOLD', options.largeSizeThreshold)
    .replace('MEDIUMSIZEREGEXP', options.mediumSizeRegExp)
    .replace('LARGESIZE', 'options.largeSize')
    .replace(/}$/m, '');

  // const googlePhotosAlbum_opt = ${JSON.stringify(options)};
  // const googlePhotosAlbum_images = ${JSON.stringify(image_urls)};
  return `<script>${stringify(addLoadEvent)}${content}</script>`;
}

exports.scriptHtml = getClientSideScript;
