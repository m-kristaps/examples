import time, binascii, dht
from machine import Pin, UART, WDT
import config as cfg
from control import target_opening, should_move, encode_uplink, parse_downlink

OFF = 1 - cfg.RELAY_ON
sensor = dht.DHT22(Pin(cfg.DHT_PIN))
open_r = Pin(cfg.OPEN_PIN, Pin.OUT, value=OFF)
close_r = Pin(cfg.CLOSE_PIN, Pin.OUT, value=OFF)
lora = UART(2, 115200, tx=cfg.LORA_TX, rx=cfg.LORA_RX, timeout=200)
wdt = WDT(timeout=int(cfg.TRAVEL_S * 2 + 90) * 1000)  # hang with relay on -> reboot -> relays off

pos = 100  # unknown at boot; closes fully
setpoint = cfg.SETPOINT
outdoor, outdoor_at = None, 0
joined, last_up = False, -cfg.UPLINK_EVERY_S


def run(relay, seconds):
    open_r.value(OFF)
    close_r.value(OFF)  # interlock: never both directions at once
    relay.value(cfg.RELAY_ON)
    time.sleep(seconds)
    relay.value(OFF)


def move(target):
    global pos
    secs = abs(target - pos) / 100 * cfg.TRAVEL_S
    if target in (0, 100):
        secs += cfg.TRAVEL_S * 0.1  # overrun into end stop to re-sync time-based position
    run(open_r if target > pos else close_r, secs)
    pos = target
    print("window", pos, "%")


def at(cmd, until=None, timeout=5):
    lora.write(cmd + "\r\n")
    lines, end = [], time.time() + timeout
    while time.time() < end:
        wdt.feed()
        line = lora.readline()
        if line:
            line = line.decode().strip()
            lines.append(line)
            if until and until in line:
                break
    return lines


def join():
    for cmd in ("AT+NWM=1", "AT+NJM=1", "AT+BAND=%d" % cfg.BAND,
                "AT+DEVEUI=" + cfg.DEVEUI, "AT+APPEUI=" + cfg.APPEUI, "AT+APPKEY=" + cfg.APPKEY):
        at(cmd, "OK", 2)
    return any("JOINED" in l for l in at("AT+JOIN=1:0:10:8", "JOIN", 60))


def uplink(temp, hum):
    global outdoor, outdoor_at, setpoint
    payload = binascii.hexlify(encode_uplink(temp, hum, pos, setpoint)).decode()
    down = parse_downlink(at("AT+SEND=1:" + payload, timeout=8))  # waits RX1/RX2 window
    if down:
        outdoor, outdoor_at = down[0], time.time()
        if down[1] is not None:
            setpoint = down[1]
        print("downlink: outdoor", outdoor, "setpoint", setpoint)


move(0)  # home: close fully so position is known

while True:
    wdt.feed()
    try:
        sensor.measure()
        temp, hum = sensor.temperature(), sensor.humidity()
    except OSError:
        temp = None  # hold position if sensor fails. todo: add alarm uplink
        print("DHT22 read failed")

    if outdoor is not None and time.time() - outdoor_at > cfg.OUTDOOR_MAX_AGE_S:
        outdoor = None

    if temp is not None:
        target = target_opening(temp, setpoint, outdoor, cfg)
        print("in %.1f°C %.0f%% out %s set %.1f -> %d%%" % (temp, hum, outdoor, setpoint, target))
        if should_move(pos, target, cfg):
            move(target)

        if time.time() - last_up >= cfg.UPLINK_EVERY_S:
            last_up = time.time()
            joined = joined or join()
            if joined:
                uplink(temp, hum)

    time.sleep(cfg.CONTROL_EVERY_S)
