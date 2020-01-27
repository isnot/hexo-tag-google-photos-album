'use strict';

console.log(Date(), '******** Start my test. PWD:', global.process.env.PWD);

// mock for test
if (typeof hexo !== 'object') {
  global.hexo = {
    config: {
      googlePhotosAlbum: {
        generateAlways: true
      }
    },
    log: console,
    extend: {
      tag: () => {},
      filter: () => {}
    }
  };
  global.hexo.extend.filter.register = () => {};
  global.hexo.extend.tag.register = (name, func) => {
    global.hexo.tag_plugin = func;
    global.hexo.tag_plugin_name = name;
  };
}

const myTest = async () => {
  const dummy = require('../index.js');
  const output = await hexo.tag_plugin(['https://photos.app.goo.gl/X4sHxrNrKTXXbTef7']);
  console.log(output);
  console.log(Date(), '******** End.', hexo.tag_plugin_name);
}
myTest();

// https://lh3.googleusercontent.com/w-_",4000,3000,null,[]
