import json, os, time, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

API_URL = os.environ.get("API_URL")  # unset = just log
API_TOKEN = os.environ.get("API_TOKEN", "")
WEBHOOK_KEY = os.environ.get("WEBHOOK_KEY", "")  # match ApiKey in device config
METER = os.environ.get("METER", "main")  # number sequence name in device config


def readings(payload: list) -> list[tuple[float, int]]:
    out = []
    for n in payload:
        if n.get("name") != METER or n.get("error", "") not in ("", "no error"):
            continue
        try:
            out.append((float(n["value"]), int(n["timestampLong"])))
        except (KeyError, ValueError):
            continue
    return out


def send(value: float, ts: int):
    body = json.dumps({"reading_m3": value, "ts": ts}).encode()
    req = urllib.request.Request(API_URL, body, {"Content-Type": "application/json",
                                                 "Authorization": f"Bearer {API_TOKEN}"})
    urllib.request.urlopen(req, timeout=10).read()


class Handler(BaseHTTPRequestHandler):
    def authed(self):
        if WEBHOOK_KEY and self.headers.get("APIKEY") != WEBHOOK_KEY:
            self.send_response(401)
            self.end_headers()
            return False
        return True

    def body(self):
        return self.rfile.read(int(self.headers.get("Content-Length", 0)))

    def do_POST(self):  # reading
        if not self.authed():
            return
        try:
            payload = json.loads(self.body())
        except ValueError:
            self.send_response(400)
            self.end_headers()
            return
        found = readings(payload)
        if not found:
            print("skipped:", payload)
        for value, ts in found:
            print(time.strftime("%F %T"), "reading", value)
            if API_URL:
                try:
                    send(value, ts)
                except Exception as e:
                    print("API error:", e)  # no retry, device keeps history in its web UI
        self.send_response(200)
        self.end_headers()

    def do_PUT(self):  # image, only if UploadImg = 1 or 2
        if not self.authed():
            return
        os.makedirs("shots", exist_ok=True)
        with open(time.strftime("shots/%Y%m%d-%H%M%S.jpg"), "wb") as f:
            f.write(self.body())
        self.send_response(200)
        self.end_headers()


def selfcheck():
    ok = {"name": "main", "value": "123.456", "timestampLong": "1760000000", "error": "no error"}
    assert readings([ok]) == [(123.456, 1760000000)]
    assert readings([{**ok, "error": "Rate too high"}]) == []
    assert readings([{**ok, "value": ""}]) == []
    assert readings([{**ok, "name": "gas"}]) == []


if __name__ == "__main__":
    selfcheck()
    print("listening on :8001")
    HTTPServer(("0.0.0.0", 8001), Handler).serve_forever()
