# `@hattip/cookie`

Cookie parsing and serialization middleware for Hattip. This package exports three middleware functions:

## `cookie`

Creates a middleware that parses incoming cookies and serializes outgoing cookies. It combines the functionality of the `cookieParser` and `cookieSerializer`.

## `cookieParser`

Creates a middleware that parses incoming cookies and makes them available in the `cookie` property of the request context.

If you only want to parse cookies and not serialize them, you can import `cookieParser` from `"@hattip/cookie/parse"` to avoid extending the request context type with serialization features.

## `cookieSerializer`

Extends the request context type with `setCookie` and `deleteCookie` methods for sending and deleting cookies.

If you only want to serialize cookies and not parse them, you can import `cookieSerializer` from `"@hattip/cookie/serialize"` to avoid adding the `cookie` property to the request context type.
