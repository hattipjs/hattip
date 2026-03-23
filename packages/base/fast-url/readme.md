# @hattip/fast-url

## Conditions

For the URL to be parsed in the fast path, it has to meet the following conditions:

- Scheme must be `http` or `https`
- Host:
  - Hostname:
    - Must only contain ASCII letters, digits, hyphens, and dots
    - Either:
      - Must be a valid IPv4 address without leading zeros.
      - Must not end with a numeric segment: `("." / START) (("0x" *HEXDIG) / 1*DIGIT) "."? EOF`
  - Port must be empty or a number between 1 and 65535.
    - Path:
      - Must start with a slash
      - Must not contain dot or double-dot segments
      - Must not contain `#`, `"`, `<`, `>`, `\\`, `^`, \`, `{`, `|`, `}`, `0x00..0x20`, and `>=0x7f`
    - Query
      - Must not contain `#`, `"`, `<`, `>`, \`, `0x00..0x20`, and `>=0x7f`

---

- The path percent-encode set is the query percent-encode set and U+003F (?), U+005E (^), U+0060 (`), U+007B ({), and U+007D (}).
- special query percent-encode set and U+0027 (').
- query percent-encode set is the C0 control percent-encode set and U+0020 SPACE, U+0022 ("), U+0023 (#), U+003C (<), and U+003E (>).
- C0 control percent-encode set are the C0 controls and all code points greater than U+007E (~).
- C0 control is a code point in the range U+0000 NULL to U+001F INFORMATION SEPARATOR ONE, inclusive.
