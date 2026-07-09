'use client'

import { useState, useMemo, useCallback } from 'react'

interface MimeEntry {
  ext: string
  mime: string
  category: 'text' | 'image' | 'video' | 'audio' | 'application' | 'other'
}

const MIME_DATA: MimeEntry[] = [
  { ext: 'html', mime: 'text/html', category: 'text' },
  { ext: 'htm', mime: 'text/html', category: 'text' },
  { ext: 'css', mime: 'text/css', category: 'text' },
  { ext: 'csv', mime: 'text/csv', category: 'text' },
  { ext: 'txt', mime: 'text/plain', category: 'text' },
  { ext: 'md', mime: 'text/markdown', category: 'text' },
  { ext: 'ics', mime: 'text/calendar', category: 'text' },
  { ext: 'rtf', mime: 'text/rtf', category: 'text' },
  { ext: 'ini', mime: 'text/plain', category: 'text' },
  { ext: 'conf', mime: 'text/plain', category: 'text' },
  { ext: 'htaccess', mime: 'text/plain', category: 'text' },
  { ext: 'py', mime: 'text/x-python', category: 'text' },
  { ext: 'rb', mime: 'text/x-ruby', category: 'text' },
  { ext: 'go', mime: 'text/x-go', category: 'text' },
  { ext: 'rs', mime: 'text/x-rust', category: 'text' },
  { ext: 'c', mime: 'text/x-c', category: 'text' },
  { ext: 'cpp', mime: 'text/x-c++', category: 'text' },
  { ext: 'h', mime: 'text/x-c', category: 'text' },
  { ext: 'java', mime: 'text/x-java-source', category: 'text' },
  { ext: 'kt', mime: 'text/x-kotlin', category: 'text' },
  { ext: 'swift', mime: 'text/x-swift', category: 'text' },
  { ext: 'cs', mime: 'text/x-csharp', category: 'text' },
  { ext: 'jsx', mime: 'text/jsx', category: 'text' },
  { ext: 'tsx', mime: 'text/tsx', category: 'text' },
  { ext: 'proto', mime: 'text/plain', category: 'text' },
  { ext: 'png', mime: 'image/png', category: 'image' },
  { ext: 'jpg', mime: 'image/jpeg', category: 'image' },
  { ext: 'jpeg', mime: 'image/jpeg', category: 'image' },
  { ext: 'gif', mime: 'image/gif', category: 'image' },
  { ext: 'webp', mime: 'image/webp', category: 'image' },
  { ext: 'svg', mime: 'image/svg+xml', category: 'image' },
  { ext: 'ico', mime: 'image/x-icon', category: 'image' },
  { ext: 'bmp', mime: 'image/bmp', category: 'image' },
  { ext: 'tiff', mime: 'image/tiff', category: 'image' },
  { ext: 'tif', mime: 'image/tiff', category: 'image' },
  { ext: 'avif', mime: 'image/avif', category: 'image' },
  { ext: 'heic', mime: 'image/heic', category: 'image' },
  { ext: 'heif', mime: 'image/heif', category: 'image' },
  { ext: 'jxl', mime: 'image/jxl', category: 'image' },
  { ext: 'raw', mime: 'image/x-raw', category: 'image' },
  { ext: 'mp4', mime: 'video/mp4', category: 'video' },
  { ext: 'm4v', mime: 'video/mp4', category: 'video' },
  { ext: 'webm', mime: 'video/webm', category: 'video' },
  { ext: 'ogv', mime: 'video/ogg', category: 'video' },
  { ext: 'avi', mime: 'video/x-msvideo', category: 'video' },
  { ext: 'mov', mime: 'video/quicktime', category: 'video' },
  { ext: 'mkv', mime: 'video/x-matroska', category: 'video' },
  { ext: 'flv', mime: 'video/x-flv', category: 'video' },
  { ext: 'wmv', mime: 'video/x-ms-wmv', category: 'video' },
  { ext: 'mpeg', mime: 'video/mpeg', category: 'video' },
  { ext: 'mpg', mime: 'video/mpeg', category: 'video' },
  { ext: '3gp', mime: 'video/3gpp', category: 'video' },
  { ext: 'mp3', mime: 'audio/mpeg', category: 'audio' },
  { ext: 'm4a', mime: 'audio/mp4', category: 'audio' },
  { ext: 'ogg', mime: 'audio/ogg', category: 'audio' },
  { ext: 'oga', mime: 'audio/ogg', category: 'audio' },
  { ext: 'wav', mime: 'audio/wav', category: 'audio' },
  { ext: 'flac', mime: 'audio/flac', category: 'audio' },
  { ext: 'aac', mime: 'audio/aac', category: 'audio' },
  { ext: 'opus', mime: 'audio/opus', category: 'audio' },
  { ext: 'aiff', mime: 'audio/aiff', category: 'audio' },
  { ext: 'mid', mime: 'audio/midi', category: 'audio' },
  { ext: 'midi', mime: 'audio/midi', category: 'audio' },
  { ext: 'json', mime: 'application/json', category: 'application' },
  { ext: 'jsonl', mime: 'application/jsonlines', category: 'application' },
  { ext: 'pdf', mime: 'application/pdf', category: 'application' },
  { ext: 'zip', mime: 'application/zip', category: 'application' },
  { ext: 'gz', mime: 'application/gzip', category: 'application' },
  { ext: 'tar', mime: 'application/x-tar', category: 'application' },
  { ext: 'bz2', mime: 'application/x-bzip2', category: 'application' },
  { ext: 'xz', mime: 'application/x-xz', category: 'application' },
  { ext: '7z', mime: 'application/x-7z-compressed', category: 'application' },
  { ext: 'rar', mime: 'application/vnd.rar', category: 'application' },
  { ext: 'doc', mime: 'application/msword', category: 'application' },
  { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'application' },
  { ext: 'xls', mime: 'application/vnd.ms-excel', category: 'application' },
  { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'application' },
  { ext: 'ppt', mime: 'application/vnd.ms-powerpoint', category: 'application' },
  { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'application' },
  { ext: 'odt', mime: 'application/vnd.oasis.opendocument.text', category: 'application' },
  { ext: 'epub', mime: 'application/epub+zip', category: 'application' },
  { ext: 'wasm', mime: 'application/wasm', category: 'application' },
  { ext: 'exe', mime: 'application/x-msdownload', category: 'application' },
  { ext: 'dmg', mime: 'application/x-apple-diskimage', category: 'application' },
  { ext: 'apk', mime: 'application/vnd.android.package-archive', category: 'application' },
  { ext: 'bin', mime: 'application/octet-stream', category: 'application' },
  { ext: 'deb', mime: 'application/vnd.debian.binary-package', category: 'application' },
  { ext: 'rpm', mime: 'application/x-rpm', category: 'application' },
  { ext: 'msi', mime: 'application/x-msdownload', category: 'application' },
  { ext: 'sqlite', mime: 'application/x-sqlite3', category: 'application' },
  { ext: 'yaml', mime: 'application/yaml', category: 'application' },
  { ext: 'yml', mime: 'application/yaml', category: 'application' },
  { ext: 'toml', mime: 'application/toml', category: 'application' },
  { ext: 'xml', mime: 'application/xml', category: 'application' },
  { ext: 'xhtml', mime: 'application/xhtml+xml', category: 'application' },
  { ext: 'js', mime: 'application/javascript', category: 'application' },
  { ext: 'mjs', mime: 'application/javascript', category: 'application' },
  { ext: 'ts', mime: 'application/typescript', category: 'application' },
  { ext: 'php', mime: 'application/x-httpd-php', category: 'application' },
  { ext: 'sh', mime: 'application/x-sh', category: 'application' },
  { ext: 'bat', mime: 'application/x-msdownload', category: 'application' },
  { ext: 'class', mime: 'application/java-vm', category: 'application' },
  { ext: 'jar', mime: 'application/java-archive', category: 'application' },
  { ext: 'sql', mime: 'application/sql', category: 'application' },
  { ext: 'graphql', mime: 'application/graphql', category: 'application' },
  { ext: 'gql', mime: 'application/graphql', category: 'application' },
  { ext: 'geojson', mime: 'application/geo+json', category: 'application' },
  { ext: 'ndjson', mime: 'application/x-ndjson', category: 'application' },
  { ext: 'map', mime: 'application/json', category: 'application' },
  { ext: 'manifest', mime: 'application/manifest+json', category: 'application' },
  { ext: 'webmanifest', mime: 'application/manifest+json', category: 'application' },
  { ext: 'woff', mime: 'font/woff', category: 'other' },
  { ext: 'woff2', mime: 'font/woff2', category: 'other' },
  { ext: 'ttf', mime: 'font/ttf', category: 'other' },
  { ext: 'otf', mime: 'font/otf', category: 'other' },
  { ext: 'eot', mime: 'application/vnd.ms-fontobject', category: 'other' },
  { ext: 'gltf', mime: 'model/gltf+json', category: 'other' },
  { ext: 'glb', mime: 'model/gltf-binary', category: 'other' },
  { ext: 'stl', mime: 'model/stl', category: 'other' },
  { ext: 'pem', mime: 'application/x-pem-file', category: 'other' },
  { ext: 'crt', mime: 'application/x-x509-ca-cert', category: 'other' },
  { ext: 'key', mime: 'application/pkcs8', category: 'other' },
  { ext: 'p12', mime: 'application/x-pkcs12', category: 'other' },
  // additional text
  { ext: 'log', mime: 'text/plain', category: 'text' },
  { ext: 'env', mime: 'text/plain', category: 'text' },
  { ext: 'lock', mime: 'text/plain', category: 'text' },
  { ext: 'gitignore', mime: 'text/plain', category: 'text' },
  { ext: 'dockerfile', mime: 'text/plain', category: 'text' },
  { ext: 'makefile', mime: 'text/plain', category: 'text' },
  { ext: 'lua', mime: 'text/x-lua', category: 'text' },
  { ext: 'perl', mime: 'text/x-perl', category: 'text' },
  { ext: 'pl', mime: 'text/x-perl', category: 'text' },
  { ext: 'r', mime: 'text/x-r', category: 'text' },
  { ext: 'scala', mime: 'text/x-scala', category: 'text' },
  { ext: 'vim', mime: 'text/x-vim', category: 'text' },
  { ext: 'ex', mime: 'text/x-elixir', category: 'text' },
  { ext: 'exs', mime: 'text/x-elixir', category: 'text' },
  { ext: 'clj', mime: 'text/x-clojure', category: 'text' },
  { ext: 'hs', mime: 'text/x-haskell', category: 'text' },
  { ext: 'ml', mime: 'text/x-ocaml', category: 'text' },
  { ext: 'fs', mime: 'text/x-fsharp', category: 'text' },
  { ext: 'dart', mime: 'text/x-dart', category: 'text' },
  { ext: 'coffee', mime: 'text/coffeescript', category: 'text' },
  { ext: 'less', mime: 'text/x-less', category: 'text' },
  { ext: 'sass', mime: 'text/x-sass', category: 'text' },
  { ext: 'scss', mime: 'text/x-scss', category: 'text' },
  { ext: 'styl', mime: 'text/x-stylus', category: 'text' },
  { ext: 'vue', mime: 'text/x-vue', category: 'text' },
  { ext: 'svelte', mime: 'text/x-svelte', category: 'text' },
  { ext: 'pug', mime: 'text/x-pug', category: 'text' },
  { ext: 'haml', mime: 'text/x-haml', category: 'text' },
  { ext: 'erb', mime: 'text/x-erb', category: 'text' },
  { ext: 'njk', mime: 'text/x-nunjucks', category: 'text' },
  { ext: 'jinja', mime: 'text/x-jinja', category: 'text' },
  { ext: 'j2', mime: 'text/x-jinja', category: 'text' },
  { ext: 'hbs', mime: 'text/x-handlebars', category: 'text' },
  { ext: 'mustache', mime: 'text/x-mustache', category: 'text' },
  { ext: 'awk', mime: 'text/x-awk', category: 'text' },
  { ext: 'tcl', mime: 'text/x-tcl', category: 'text' },
  { ext: 'ps1', mime: 'text/x-powershell', category: 'text' },
  { ext: 'psm1', mime: 'text/x-powershell', category: 'text' },
  // additional image
  { ext: 'psd', mime: 'image/vnd.adobe.photoshop', category: 'image' },
  { ext: 'ai', mime: 'application/postscript', category: 'image' },
  { ext: 'eps', mime: 'application/postscript', category: 'image' },
  { ext: 'ps', mime: 'application/postscript', category: 'image' },
  { ext: 'indd', mime: 'application/x-indesign', category: 'image' },
  { ext: 'xbm', mime: 'image/x-xbitmap', category: 'image' },
  { ext: 'xpm', mime: 'image/x-xpixmap', category: 'image' },
  { ext: 'dds', mime: 'image/vnd.ms-dds', category: 'image' },
  { ext: 'exr', mime: 'image/x-exr', category: 'image' },
  { ext: 'hdr', mime: 'image/vnd.radiance', category: 'image' },
  { ext: 'pbm', mime: 'image/x-portable-bitmap', category: 'image' },
  { ext: 'pgm', mime: 'image/x-portable-graymap', category: 'image' },
  { ext: 'ppm', mime: 'image/x-portable-pixmap', category: 'image' },
  { ext: 'wbmp', mime: 'image/vnd.wap.wbmp', category: 'image' },
  // additional video
  { ext: 'ts', mime: 'video/mp2t', category: 'video' },
  { ext: 'm2ts', mime: 'video/mp2t', category: 'video' },
  { ext: 'mts', mime: 'video/mp2t', category: 'video' },
  { ext: 'ogx', mime: 'application/ogg', category: 'video' },
  { ext: 'rm', mime: 'application/vnd.rn-realmedia', category: 'video' },
  { ext: 'rmvb', mime: 'application/vnd.rn-realmedia-vbr', category: 'video' },
  { ext: 'divx', mime: 'video/divx', category: 'video' },
  { ext: 'xvid', mime: 'video/x-xvid', category: 'video' },
  { ext: 'vob', mime: 'video/dvd', category: 'video' },
  { ext: 'asf', mime: 'video/x-ms-asf', category: 'video' },
  { ext: 'mxf', mime: 'application/mxf', category: 'video' },
  { ext: 'dv', mime: 'video/x-dv', category: 'video' },
  { ext: 'f4v', mime: 'video/x-f4v', category: 'video' },
  { ext: 'm4p', mime: 'video/mp4', category: 'video' },
  // additional audio
  { ext: 'wma', mime: 'audio/x-ms-wma', category: 'audio' },
  { ext: 'ra', mime: 'audio/x-realaudio', category: 'audio' },
  { ext: 'ram', mime: 'audio/x-pn-realaudio', category: 'audio' },
  { ext: 'amr', mime: 'audio/amr', category: 'audio' },
  { ext: 'au', mime: 'audio/basic', category: 'audio' },
  { ext: 'snd', mime: 'audio/basic', category: 'audio' },
  { ext: 'ape', mime: 'audio/x-ape', category: 'audio' },
  { ext: 'alac', mime: 'audio/x-alac', category: 'audio' },
  { ext: 'dsd', mime: 'audio/x-dsd', category: 'audio' },
  { ext: 'caf', mime: 'audio/x-caf', category: 'audio' },
  { ext: 'spx', mime: 'audio/ogg', category: 'audio' },
  { ext: 'mka', mime: 'audio/x-matroska', category: 'audio' },
  { ext: 'xspf', mime: 'application/xspf+xml', category: 'audio' },
  { ext: 'm3u', mime: 'audio/x-mpegurl', category: 'audio' },
  { ext: 'm3u8', mime: 'application/vnd.apple.mpegurl', category: 'audio' },
  { ext: 'pls', mime: 'audio/x-scpls', category: 'audio' },
  // additional application
  { ext: 'swf', mime: 'application/x-shockwave-flash', category: 'application' },
  { ext: 'fla', mime: 'application/x-fla', category: 'application' },
  { ext: 'xap', mime: 'application/x-silverlight-app', category: 'application' },
  { ext: 'crx', mime: 'application/x-chrome-extension', category: 'application' },
  { ext: 'xpi', mime: 'application/x-xpinstall', category: 'application' },
  { ext: 'ipa', mime: 'application/x-itunes-ipa', category: 'application' },
  { ext: 'msix', mime: 'application/msix', category: 'application' },
  { ext: 'appx', mime: 'application/x-ms-application', category: 'application' },
  { ext: 'pkg', mime: 'application/x-apple-diskimage', category: 'application' },
  { ext: 'snap', mime: 'application/vnd.snap', category: 'application' },
  { ext: 'flatpak', mime: 'application/vnd.flatpak', category: 'application' },
  { ext: 'war', mime: 'application/java-archive', category: 'application' },
  { ext: 'ear', mime: 'application/java-archive', category: 'application' },
  { ext: 'aar', mime: 'application/x-android-archive', category: 'application' },
  { ext: 'nupkg', mime: 'application/zip', category: 'application' },
  { ext: 'gem', mime: 'application/x-ruby-gem', category: 'application' },
  { ext: 'whl', mime: 'application/zip', category: 'application' },
  { ext: 'tar.gz', mime: 'application/x-compressed-tar', category: 'application' },
  { ext: 'tar.bz2', mime: 'application/x-bzip2-compressed-tar', category: 'application' },
  { ext: 'tar.xz', mime: 'application/x-xz-compressed-tar', category: 'application' },
  { ext: 'tar.zst', mime: 'application/x-zstd-compressed-tar', category: 'application' },
  { ext: 'cbz', mime: 'application/vnd.comicbook+zip', category: 'application' },
  { ext: 'cbr', mime: 'application/vnd.comicbook-rar', category: 'application' },
  { ext: 'zst', mime: 'application/zstd', category: 'application' },
  { ext: 'lz4', mime: 'application/x-lz4', category: 'application' },
  { ext: 'lzma', mime: 'application/x-lzma', category: 'application' },
  { ext: 'z', mime: 'application/x-compress', category: 'application' },
  { ext: 'cab', mime: 'application/vnd.ms-cab-compressed', category: 'application' },
  { ext: 'iso', mime: 'application/x-iso9660-image', category: 'application' },
  { ext: 'img', mime: 'application/x-raw-disk-image', category: 'application' },
  { ext: 'vmdk', mime: 'application/x-vmdk', category: 'application' },
  { ext: 'ova', mime: 'application/ovf', category: 'application' },
  { ext: 'ovf', mime: 'application/ovf', category: 'application' },
  { ext: 'vdi', mime: 'application/x-virtualbox-vdi', category: 'application' },
  { ext: 'vhd', mime: 'application/x-vhd', category: 'application' },
  { ext: 'qcow2', mime: 'application/x-qemu-disk', category: 'application' },
  { ext: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', category: 'application' },
  { ext: 'odp', mime: 'application/vnd.oasis.opendocument.presentation', category: 'application' },
  { ext: 'odg', mime: 'application/vnd.oasis.opendocument.graphics', category: 'application' },
  { ext: 'odf', mime: 'application/vnd.oasis.opendocument.formula', category: 'application' },
  { ext: 'pages', mime: 'application/vnd.apple.pages', category: 'application' },
  { ext: 'numbers', mime: 'application/vnd.apple.numbers', category: 'application' },
  { ext: 'key', mime: 'application/vnd.apple.keynote', category: 'application' },
  { ext: 'vsd', mime: 'application/vnd.visio', category: 'application' },
  { ext: 'vsdx', mime: 'application/vnd.visio', category: 'application' },
  { ext: 'mpp', mime: 'application/vnd.ms-project', category: 'application' },
  { ext: 'accdb', mime: 'application/msaccess', category: 'application' },
  { ext: 'mdb', mime: 'application/msaccess', category: 'application' },
  { ext: 'lnk', mime: 'application/x-ms-shortcut', category: 'application' },
  { ext: 'torrent', mime: 'application/x-bittorrent', category: 'application' },
  { ext: 'magnet', mime: 'application/x-magnet', category: 'application' },
  { ext: 'srt', mime: 'application/x-subrip', category: 'other' },
  { ext: 'ass', mime: 'text/x-ssa', category: 'other' },
  { ext: 'vtt', mime: 'text/vtt', category: 'other' },
  { ext: 'sub', mime: 'text/x-microdvd', category: 'other' },
  { ext: 'smi', mime: 'application/smil+xml', category: 'other' },
  { ext: 'obj', mime: 'model/obj', category: 'other' },
  { ext: 'ply', mime: 'model/ply', category: 'other' },
  { ext: 'dae', mime: 'model/vnd.collada+xml', category: 'other' },
  { ext: 'fbx', mime: 'model/vnd.fbx', category: 'other' },
  { ext: 'usd', mime: 'model/usd', category: 'other' },
  { ext: 'usdz', mime: 'model/vnd.usdz+zip', category: 'other' },
  { ext: 'p7s', mime: 'application/pkcs7-signature', category: 'other' },
  { ext: 'p7m', mime: 'application/pkcs7-mime', category: 'other' },
  { ext: 'p7c', mime: 'application/pkcs7-mime', category: 'other' },
  { ext: 'der', mime: 'application/x-x509-ca-cert', category: 'other' },
  { ext: 'cer', mime: 'application/x-x509-ca-cert', category: 'other' },
  { ext: 'pfx', mime: 'application/x-pkcs12', category: 'other' },
  { ext: 'jks', mime: 'application/x-java-keystore', category: 'other' },
  { ext: 'rss', mime: 'application/rss+xml', category: 'other' },
  { ext: 'atom', mime: 'application/atom+xml', category: 'other' },
  { ext: 'opml', mime: 'text/x-opml', category: 'other' },
  { ext: 'gpx', mime: 'application/gpx+xml', category: 'other' },
  { ext: 'kml', mime: 'application/vnd.google-earth.kml+xml', category: 'other' },
  { ext: 'kmz', mime: 'application/vnd.google-earth.kmz', category: 'other' },
  { ext: 'shp', mime: 'application/x-esri-shape', category: 'other' },
  { ext: 'msi', mime: 'application/x-msdownload', category: 'application' },
]

type Category = 'all' | 'text' | 'image' | 'video' | 'audio' | 'application' | 'other'
type Mode = 'ext-to-mime' | 'mime-to-ext'

const CATEGORY_STYLES: Record<Category, string> = {
  all:         'border-border text-dim hover:border-border-hi hover:text-primary',
  text:        'border-blue-500/30 text-blue-400 hover:bg-blue-500/10',
  image:       'border-purple-500/30 text-purple-400 hover:bg-purple-500/10',
  video:       'border-red-500/30 text-red-400 hover:bg-red-500/10',
  audio:       'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10',
  application: 'border-teal/30 text-teal hover:bg-teal/10',
  other:       'border-orange-500/30 text-orange-400 hover:bg-orange-500/10',
}
const CATEGORY_ACTIVE: Record<Category, string> = {
  all:         'border-border-hi bg-surface text-primary',
  text:        'border-blue-500/40 bg-blue-500/10 text-blue-400',
  image:       'border-purple-500/40 bg-purple-500/10 text-purple-400',
  video:       'border-red-500/40 bg-red-500/10 text-red-400',
  audio:       'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  application: 'border-teal/40 bg-teal/10 text-teal',
  other:       'border-orange-500/40 bg-orange-500/10 text-orange-400',
}
const CATEGORY_BADGE: Record<string, string> = {
  text:        'bg-blue-500/10 text-blue-400',
  image:       'bg-purple-500/10 text-purple-400',
  video:       'bg-red-500/10 text-red-400',
  audio:       'bg-yellow-500/10 text-yellow-400',
  application: 'bg-teal/10 text-teal',
  other:       'bg-orange-500/10 text-orange-400',
}
const CATEGORY_LABELS: Record<Category, string> = {
  all: 'すべて', text: 'テキスト', image: '画像',
  video: '動画', audio: '音声', application: 'アプリ', other: 'その他',
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handle = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])
  return (
    <button
      onClick={handle}
      className="shrink-0 rounded px-2 py-0.5 font-mono text-[11px] text-muted transition-colors hover:bg-teal/10 hover:text-teal"
      title={`コピー: ${text}`}
    >
      {copied ? '✓' : (label ?? 'copy')}
    </button>
  )
}

export function MimeTypeLookup() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('ext-to-mime')
  const [category, setCategory] = useState<Category>('all')

  const unique = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, '')
    let items = MIME_DATA
    if (category !== 'all') items = items.filter(e => e.category === category)
    if (q) {
      items = items.filter(e =>
        mode === 'ext-to-mime'
          ? e.ext.includes(q) || e.mime.includes(q)
          : e.mime.includes(q) || e.ext.includes(q)
      )
    }
    const seen = new Set<string>()
    return items.filter(e => {
      const key = `${e.ext}::${e.mime}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [query, mode, category])

  return (
    <div className="space-y-4">

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-bg p-1">
        {([
          { value: 'ext-to-mime', label: '拡張子 → MIME タイプ', hint: '.png, .json ...' },
          { value: 'mime-to-ext', label: 'MIME タイプ → 拡張子', hint: 'image/, text/ ...' },
        ] as const).map(m => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex flex-col items-center gap-0.5 rounded-lg py-2.5 transition-colors ${
              mode === m.value
                ? 'bg-surface text-bright'
                : 'text-dim hover:text-primary'
            }`}
          >
            <span className="font-mono text-sm font-semibold">{m.label}</span>
            <span className="font-mono text-[10px] text-muted">{m.hint}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted text-sm">
          {mode === 'ext-to-mime' ? '.' : ''}
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={mode === 'ext-to-mime' ? 'png, json, mp4...' : 'image/png, application/json...'}
          className={`w-full rounded-lg border border-border bg-bg py-2.5 font-mono text-sm text-primary outline-none transition-colors focus:border-teal ${
            mode === 'ext-to-mime' ? 'pl-6 pr-4' : 'px-4'
          }`}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              category === cat ? CATEGORY_ACTIVE[cat] : CATEGORY_STYLES[cat]
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="overflow-hidden rounded-xl border border-border">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-px border-b border-border bg-surface px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted w-16">拡張子</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted pl-4">MIMEタイプ</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">カテゴリ</span>
        </div>

        <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
          {unique.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-mono text-sm text-muted">該当なし</p>
              <p className="mt-1 font-mono text-xs text-border">別のキーワードで試してください</p>
            </div>
          ) : (
            unique.slice(0, 200).map((entry, i) => (
              <div
                key={i}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-px px-4 py-3 transition-colors hover:bg-surface/60"
              >
                <div className="flex w-16 items-center gap-1.5">
                  <span className="font-mono text-sm font-semibold text-bright">.{entry.ext}</span>
                  <CopyBtn text={`.${entry.ext}`} />
                </div>
                <div className="flex min-w-0 items-center gap-2 pl-4">
                  <span className="truncate font-mono text-xs text-primary">{entry.mime}</span>
                  <CopyBtn text={entry.mime} />
                </div>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${CATEGORY_BADGE[entry.category] ?? 'bg-surface text-muted'}`}>
                  {CATEGORY_LABELS[entry.category]}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border bg-surface px-4 py-2">
          <p className="font-mono text-xs text-muted">{unique.length} 件</p>
        </div>
      </div>
    </div>
  )
}
