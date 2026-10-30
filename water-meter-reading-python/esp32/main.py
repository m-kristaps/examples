import network, time, machine
from machine import Pin
from camera import Camera, FrameSize, PixelFormat

try:
    import requests
except ImportError:
    import urequests as requests

WIFI_SSID = "wifi"
WIFI_PASS = "pass"
SERVER = "" # api url
DEVICE_KEY = ""  # same as DEVICE_KEY on server
SLEEP_MIN = 60
FLASH_MS = 300  # todo adjustments

flash = Pin(4, Pin.OUT)  # white led


def wifi():
    w = network.WLAN(network.STA_IF)
    w.active(True)
    if not w.isconnected():
        w.connect(WIFI_SSID, WIFI_PASS)
        for _ in range(20):
            if w.isconnected():
                break
            time.sleep(1)
    return w.isconnected()


def snap():
    cam = Camera(pixel_format=PixelFormat.JPEG, frame_size=FrameSize.VGA, jpeg_quality=85)
    flash.on()
    time.sleep_ms(FLASH_MS)
    cam.capture()  # more testing - first capture is blurry
    img = cam.capture() # retake for better focus
    flash.off()
    cam.deinit()
    return img


try:
    if wifi():
        r = requests.post(SERVER, data=snap(), headers={"Content-Type": "image/jpeg", "X-Device-Key": DEVICE_KEY})
        print("server:", r.status_code, r.text)
        r.close()
    else:
        print("wifi failed")
except Exception as e:
    print("error:", e)

flash.off()
machine.deepsleep(SLEEP_MIN * 60 * 1000)
