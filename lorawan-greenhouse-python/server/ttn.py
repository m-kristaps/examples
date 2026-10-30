import base64, json, os, struct, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

LAT, LON = os.environ.get("LAT", "56.97"), os.environ.get("LON", "23.96") # change - default Riga
WEBHOOK_KEY = os.environ.get("WEBHOOK_KEY", "")  # extra header X-Webhook-Key
SETPOINT = os.environ.get("SETPOINT")  # unset = device keeps config value


def decode_uplink(raw: bytes) -> dict:
    t, h, pos, sp = struct.unpack(">hHBh", raw)
    return {"temp": t / 10, "hum": h / 10, "window": pos, "setpoint": sp / 10}


def encode_downlink(outdoor: float, setpoint: float | None) -> bytes:
    return struct.pack(">hh", round(outdoor * 10), round(setpoint * 10) if setpoint else 0)


def outdoor_temp() -> float:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&current=temperature_2m"
    return json.load(urllib.request.urlopen(url, timeout=10))["current"]["temperature_2m"]


def post(url, key, body):
    req = urllib.request.Request(url, json.dumps(body).encode(), {
        "Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    urllib.request.urlopen(req, timeout=10).read()


class Handler(BaseHTTPRequestHandler):
    def reply(self, code):
        self.send_response(code)
        self.end_headers()

    def do_POST(self):
        if WEBHOOK_KEY and self.headers.get("X-Webhook-Key") != WEBHOOK_KEY:
            return self.reply(401)
        try:
            msg = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            up = msg["uplink_message"]
            data = decode_uplink(base64.b64decode(up["frm_payload"]))
        except (KeyError, ValueError, struct.error):
            return self.reply(400)
        print(msg["end_device_ids"]["device_id"], data)

        try:
            down = encode_downlink(outdoor_temp(), float(SETPOINT) if SETPOINT else None)
            # replace (not push) - downlinks dont pile up; device gets it after next uplink (class A)
            post(self.headers["X-Downlink-Replace"], self.headers["X-Downlink-Apikey"],
                 {"downlinks": [{"f_port": 1, "frm_payload": base64.b64encode(down).decode(), "priority": "NORMAL"}]})
        except Exception as e:
            print("downlink failed:", e)  # device falls back to MAX_OPEN_UNKNOWN after hour
        self.reply(200)


def selfcheck():
    assert decode_uplink(bytes.fromhex("ffe7028d2800f0")) == {"temp": -2.5, "hum": 65.3, "window": 40, "setpoint": 24.0}
    assert encode_downlink(-10.0, 24.0).hex() == "ff9c00f0"
    assert encode_downlink(15.0, None).hex() == "00960000"


if __name__ == "__main__":
    selfcheck()
    print("listening on :8002")
    HTTPServer(("0.0.0.0", 8002), Handler).serve_forever()
