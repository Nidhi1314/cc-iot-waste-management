# Security Notes

## Sensor Ingest Authentication (`POST /sensors/data`)

Sensor ingest supports machine authentication using API key ID + HMAC signature.

### Required headers

- `X-Sensor-Key-Id`: key identifier (maps to a secret from `SENSOR_AUTH_KEYS`)
- `X-Sensor-Timestamp`: unix epoch seconds
- `X-Sensor-Signature`: lowercase hex HMAC-SHA256 signature

### Server configuration

- `SENSOR_AUTH_MODE=off|monitor|enforce`
  - `off`: skip checks
  - `monitor`: log failures, still allow requests
  - `enforce`: reject invalid/unsigned requests
- `SENSOR_AUTH_KEYS`: JSON object mapping key IDs to secrets
  - Example: `{"sensor-a":"supersecretA","sensor-b":"supersecretB"}`
- `SENSOR_AUTH_MAX_CLOCK_SKEW_SEC`: allowed timestamp skew (default `300`)

### Signature canonical format

The signed payload is:

```text
{METHOD}\n{PATH}\n{TIMESTAMP}\n{BODY_SHA256_HEX}
```

Where:

- `METHOD`: uppercase HTTP method (`POST`)
- `PATH`: exact request path (for this endpoint: `/sensors/data`)
- `TIMESTAMP`: same value sent in `X-Sensor-Timestamp`
- `BODY_SHA256_HEX`: SHA256 of the exact request body bytes sent

Then:

```text
signature = HMAC_SHA256_HEX(secret, canonical_payload)
```

## Node.js example (firmware gateway / edge service)

```js
import crypto from 'crypto';

const method = 'POST';
const path = '/sensors/data';
const timestamp = Math.floor(Date.now() / 1000).toString();
const keyId = 'sensor-a';
const secret = process.env.SENSOR_SECRET;

const bodyObj = {
  binId: '11111111-1111-1111-1111-111111111111',
  measureDistanceCm: 22.5,
  fillPercentage: 74.2,
  batteryVoltage: 3.7,
};

const body = JSON.stringify(bodyObj);
const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
const canonical = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(canonical)
  .digest('hex');

const response = await fetch('https://api.example.com/sensors/data', {
  method,
  headers: {
    'Content-Type': 'application/json',
    'X-Sensor-Key-Id': keyId,
    'X-Sensor-Timestamp': timestamp,
    'X-Sensor-Signature': signature,
  },
  body,
});

console.log(response.status, await response.text());
```

## Python example

```python
import hashlib
import hmac
import json
import os
import time
import requests

method = "POST"
path = "/sensors/data"
timestamp = str(int(time.time()))
key_id = "sensor-a"
secret = os.environ["SENSOR_SECRET"].encode("utf-8")

body_obj = {
    "binId": "11111111-1111-1111-1111-111111111111",
    "measureDistanceCm": 22.5,
    "fillPercentage": 74.2,
    "batteryVoltage": 3.7,
}

body = json.dumps(body_obj, separators=(",", ":"))
body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
canonical = f"{method}\n{path}\n{timestamp}\n{body_hash}"
signature = hmac.new(secret, canonical.encode("utf-8"), hashlib.sha256).hexdigest()

res = requests.post(
    "https://api.example.com/sensors/data",
    headers={
        "Content-Type": "application/json",
        "X-Sensor-Key-Id": key_id,
        "X-Sensor-Timestamp": timestamp,
        "X-Sensor-Signature": signature,
    },
    data=body,
    timeout=10,
)

print(res.status_code, res.text)
```

## Common failure causes

- Signing a different path than the actual request path.
- Timestamp outside allowed skew window.
- Body bytes changed after signature calculation (pretty-printing, middleware rewrites).
- Wrong key ID or secret.
- Uppercase/lowercase mismatch in hex signature.

## Rollout recommendation

1. Start with `SENSOR_AUTH_MODE=monitor` in non-prod and then prod.
2. Monitor logs for signature/timestamp failures.
3. Fix client implementations.
4. Move to `SENSOR_AUTH_MODE=enforce`.
