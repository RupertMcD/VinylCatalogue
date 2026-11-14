# zxing-wasm (barcode reader)

Outside code, copied in unchanged. Do not edit these files.

- Package: `zxing-wasm` version 3.1.6, from the npm registry
  (https://www.npmjs.com/package/zxing-wasm).
- Only the "reader" part is included:
  `es/reader/index.js`, `es/share.js` and `reader/zxing_reader.wasm`
  (the same folder layout as the package's `dist/` folder).
- Checked against the registry's published fingerprint (sha512) when copied.
- Licences: zxing-wasm is MIT (see `LICENSE`). The scanning engine inside
  `zxing_reader.wasm` is ZXing-C++ (https://github.com/zxing-cpp/zxing-cpp),
  Apache License 2.0.
- The app only uses it through `utils/barcode-reader.js`, which also points
  it at the local `.wasm` file so nothing is loaded from other websites.

To update: download the new version, copy the same three files over these,
update the version above, then bump `CACHE_VERSION` in `sw.js`.
