# Changelog

## 0.9.1

- Add Vue hooks with `useUploadFile` composable (#28)

## 0.9.0

- Add upload progress tracking via `onProgress` callback in React and Svelte
  hooks  
  (#10)
- Support `cacheControl` option in `store()` method (#21)
- Add clean option names, deprecate env-var-style names (#25)
- Lazy S3Client initialization, rename `r2` getter to `client` (#24)
- Allow set of ContentDisposition (#16)

## 0.8.1

- fix example issues
- use latest component scripts

## 0.8.0

- Adds /test and /\_generated/component.js entrypoints
- Drops commonjs support
- Improves source mapping for generated files
- Changes to a statically generated component API
