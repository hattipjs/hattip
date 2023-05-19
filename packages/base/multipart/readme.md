# `@hattip/multipart`

> ⚠️ This package is work in progress. It may have (security) issues.

Multipart parser for HatTip. It can be used to parse multipart requests, especially `multipart/form-data` for handling file uploads.

The web standards offer [`Request.prototype.formData`](https://developer.mozilla.org/en-US/docs/Web/API/Request/formData) for parsing `multipart/form-data` requests, but it offers no way of enforcing size limits or controlling where the files are stored. Most implementations simply store the files in memory, which is not ideal for large files.

## `parseMultipartFormData`

`parseMultipartFormData` parses a multipart request body into a `MultipartFormData` object. It takes a `Request` and an options object as arguments. The options object is required to have a `handleFile` property, which is called for each file field in the request. The `handleFile` function is passed an object with information about the file and process it as needed. The return value will be used as the value for the file field in the `MultipartFormData` object.

For example a file handler for Node.js module could look like this:

```ts
const formData = await parseMultipartFormData(request, {
  async handleFile(info) {
    const tempPath = path.join(TEMP_DIR, info.filename);

    try {
      // Note: you have to consume the body stream or it will be consumed when
      // you return from the handler. You can't save the stream for later use.

      await fs.promises.writeFile(
        tempPath,
        // Node accepts ReadableStream here but the typings don't allow it
        info.body as any,
      );

      return {
        name: info.name,
        filename: info.filename,
        contentType: info.contentType,
        tempPath,
      };
    } catch (error) {
      // Try to delete the partially written file
      await fs.promises.rm(tempPath).catch(() => {});

      // Rethrow the error
      throw error;
    }
  },

  // Other options (all optional) are related to size and number limits or are
  // callbacks for creating various types of errors. See the type definitions
  // for details.
});
```

The handler, instead of saving the file to disk, could stream it to S3, save it to a database, or cache it in memory, for example.

The returned `MultipartFormData` object is similar to the standard `FormData` object, except that it's read-only and file fields are represented by whatever was returned from the `handleFile` function instead of a standard `File` object. Note that this means you shouldn't return plain strings from `handleFile` as it would leave no way to distinguish between a file field and a text field.

## `parseMultipart`

`parseMultipart` is a lower-level function that parses a multipart request body (a `ReadableStream<Uint8Array>`) into an async iterable of `MultipartPart` objects. `MultipartPart` objects have a `headers` and a `body`.
