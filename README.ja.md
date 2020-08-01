# hexo-tag-google-photos-album

[Hexo](https://hexo.io/) 向けのタグ・プラグインです。
Googleフォトの、アルバムを埋め込みます。

[![NPM](https://nodei.co/npm/hexo-tag-google-photos-album.png)](https://nodei.co/npm/hexo-tag-google-photos-album/)

## Getting Started

* (GitHub) [hexo-tag-google-photos-album](https://github.com/isnot/hexo-tag-google-photos-album)
* (npm) [hexo-tag-google-photos-album](https://www.npmjs.com/package/hexo-tag-google-photos-album)
* (sample) https://pages.isnot.jp/2019-04/13-image-test/

## インストール

```bash
$ cd <path-to-your-blog-dir>
$ npm install hexo-tag-google-photos-album --save
```

## 使い方

### 設定

ブログ全体の \_config.yml の中に、以下を書きます。（任意）

```yaml
googlePhotosAlbum:
  descriptionLength: 140
  target: _blank
  rel: noopener
  className: google-photos-album-area
  enableDefaultStyle: true
  largeSizeThreshold: 768
  largeSize:  =s1920-no
  mediumSize: =s720-no
  smallSize:  =w225-no
  maxPics: 999
  generateAlways: true
```

全ての設定項目は、任意です。
特に設定を書かなくても、インストールするだけで使い始めることができます。

以下は設定項目の概要説明です。

| attribute         | description                                | default |
|:-----------------|:------------------------------------------|:-------|
| descriptionLength  | crop the og:description in {Number} of chars. | 140    |
| target            | link elenment's target property.             | \_blank |
| rel               | link element's rel property.                | noopener |
| className         | className for photos and descriptions.        | google-photos-album-area |
| enableDefaultStyle | if set to false, you may use own styles by your way. | true |
| largeSizeThreshold | for responsive                              | 768 |
| largeSize         | image's size to link                         | =s1920-no |
| mediumSize        | image's size to link in case of mobile        | =s720-no |
| smallSize         | thumbnail's size                             | =w225-no |
| maxPics           | (experimental)limit {Number} of embeded phtos. | 999   |
| generateAlways     | (experimental)                              | true |

### 書き方

記事（post or page）の原稿の中で、以下のように使います。

```
{% googlePhotosAlbum url %}
```

- @param {string} url - Google Photos' share url.
  短くしたURLでもOKです。

*例*
```
{% googlePhotosAlbum https://photos.google.com/share/AF1QipM-qmCtmxuhoUj5Y2lP7OUWe9FH1KjHqVuDokH9IxM1mj3ayWcbHxNa43NfaBLe2A?key=SUIyM0k0RkQ4OTY4elZmQVBwNDBFOFhJZVZwRTBn %}

{% googlePhotosAlbum https://photos.app.goo.gl/X4sHxrNrKTXXbTef7 %}

{% googlePhotosAlbum https://goo.gl/photos/gf86Lev5csbXs8sh9 %}

{% googlePhotosAlbum https://bit.ly/2LebRva %}

```

## カスタマイズ

ギャラリー系のプラグインと組み合わせると良いかも。（詳しくはあとで書く）

## Webアプリケーションとしての脆弱性に関する注意事項

本プラグインの内部では、上記の「設定」に記述した文字列をそのまま使って、htmlの断片として出力するような処理を行っています。
従って、設定に「不正な文字列」がセットされた場合には、本プラグインによって脆弱性が発生、または潜在すると考えられます。

つまり、設定に記述された内容が信頼できるという想定に基づいて、設計しています。
「設定項目の概要説明」を参考に、シンプルな値（真偽値、数値、短い文字列）のみを使って、設定を記述するようにしてください。

また、本章の記述に関わらず、潜在的、外部的、あるいは悪意をもった攻撃による、未知の脆弱性が存在または将来的に発生する可能性を排除するものではありません。

## 謝辞

[hexo-tag-link-preview](https://www.npmjs.com/package/hexo-tag-link-preview) を参考にしました

## ライセンス

Copyright (c) 2019 isnot
Licensed under the MIT license.
