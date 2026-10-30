import io, json, os, re, time, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

from PIL import Image, ImageOps
import pytesseract

API_URL = os.environ.get("API_URL")
API_TOKEN = os.environ.get("API_TOKEN", "")
DEVICE_KEY = os.environ.get("DEVICE_KEY", "")  # same as in esp32/main.py
# TODO: Calibrate
CROP = (180, 200, 460, 260)
ROTATE = 0
MAX_JUMP = 5.0
LAST_FILE = "last_reading.txt"
os.makedirs("shots", exist_ok=True)


def ocr(jpeg: bytes) -> str:
    img = Image.open(io.BytesIO(jpeg)).rotate(ROTATE, expand=True).crop(CROP)
    img = ImageOps.autocontrast(ImageOps.grayscale(img))
    return pytesseract.image_to_string(img, config="--psm 7 -c tessedit_char_whitelist=0123456789")


def parse(text: str, last: float | None, decimals: int = 3) -> float | None:
    digits = re.sub(r"\D", "", text)
    if len(digits) < 4:
        return None
    value = int(digits) / 10**decimals  # 00123456 -> 123.456 m3
    if last is not None and not (last <= value <= last + MAX_JUMP):
        return None
    return value


def load_last():
    try:
        with open(LAST_FILE) as f:
            return float(f.read())
    except (OSError, ValueError):
        return None


def send(value: float):
    body = json.dumps({"reading_m3": value, "ts": int(time.time())}).encode()
    req = urllib.request.Request(API_URL, body, {"Content-Type": "application/json",
                                                 "Authorization": f"Bearer {API_TOKEN}"})
    urllib.request.urlopen(req, timeout=10).read()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if DEVICE_KEY and self.headers.get("X-Device-Key") != DEVICE_KEY:
            self.send_response(401)
            self.end_headers()
            return

        jpeg = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        name = time.strftime("shots/%Y%m%d-%H%M%S.jpg")
        with open(name, "wb") as f:
            f.write(jpeg)  # keep for future adjustments

        text = ocr(jpeg)
        value = parse(text, load_last())
        print(name, repr(text.strip()), "->", value)
        if value is not None:
            with open(LAST_FILE, "w") as f:
                f.write(str(value))
            if API_URL:
                try:
                    send(value)
                except Exception as e:
                    print("API error:", e)

        self.send_response(200 if value is not None else 422)
        self.end_headers()
        self.wfile.write(str(value).encode())


def selfcheck():
    assert parse("00123456", None) == 123.456
    assert parse("0012 3456\n", 123.0) == 123.456
    assert parse("00123456", 124.0) is None  # backwards
    assert parse("00923456", 123.0) is None  # too far
    assert parse("12", None) is None


if __name__ == "__main__":
    selfcheck()
    print("listening on :8000")
    HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()

#TODO: implement ai for accurate readings