# API contract

## Calculation

`POST /api/v1/calculate`

`Content-Type: application/json` (an optional charset parameter is accepted).

```json
{"operation":"power","operands":[2,10]}
```

`operation` is one of `add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`, or `percentage`. `operands` is an array of JSON numbers: exactly one for `sqrt`, exactly two for every other operation. Strings, booleans, null elements, unknown fields, malformed JSON, and additional JSON values after the request object are rejected. The body limit is 4096 bytes. Numeric values outside the representable float64 range are rejected by decoding; non-finite results are never returned.

`200 OK`:

```json
{"result":1024}
```

Error response shape:

```json
{"error":{"code":"INVALID_OPERANDS","message":"This operation requires 2 operand(s)."}}
```

| HTTP status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Malformed JSON, unexpected field, wrong JSON type or extra JSON document |
| 400 | `INVALID_OPERATION` | Operation missing or unsupported |
| 400 | `INVALID_OPERANDS` | Wrong operand count, null operand or non-finite operand |
| 400 | `DIVISION_BY_ZERO` | Zero divisor or zero raised to a negative exponent |
| 400 | `NEGATIVE_SQUARE_ROOT` | Square root of a negative number |
| 400 | `INVALID_RESULT` | No real-valued result (e.g. negative base with fractional exponent) |
| 400 | `RESULT_OUT_OF_RANGE` | Floating-point overflow |
| 404 | `NOT_FOUND` | Unknown API route |
| 405 | `METHOD_NOT_ALLOWED` | Wrong HTTP method (includes the `Allow` header) |
| 413 | `BODY_TOO_LARGE` | Request exceeds 4096 bytes |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content type is not application/json |
| 500 | `INTERNAL_ERROR` | Unexpected internal calculation error |

The JSON error code is stable for programmatic use. The message is human-readable. HTTP responses use JSON, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff` for these endpoints.

## Health

`GET /api/v1/health` returns `200 OK` and `{"status":"ok"}`. Other methods return `405`. This is a liveness endpoint; there are no external dependencies to check.
