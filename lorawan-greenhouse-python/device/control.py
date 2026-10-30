import struct, binascii


def target_opening(indoor, setpoint, outdoor, cfg):
    """% windows should be open"""
    over = indoor - setpoint
    if over <= 0:
        return 0
    if outdoor is None:
        cap = cfg.MAX_OPEN_UNKNOWN
    elif outdoor >= indoor:
        return 0  # outside is hotter - opening would only heat more
    elif outdoor < cfg.COLD_OUTDOOR:
        cap = cfg.MAX_OPEN_COLD  # cold air on plants - open little only
    else:
        cap = 100
    return int(min(over * cfg.GAIN, cap))


def should_move(pos, target, cfg):
    if target == pos:
        return False
    if target in (0, 100):
        return True  # always finish fully closed/open
    return abs(target - pos) >= cfg.MIN_STEP


def encode_uplink(temp, hum, pos, setpoint):
    # 7 bytes: temp*10 (int16), hum*10 (uint16), window % (uint8), setpoint*10 (int16)
    return struct.pack(">hHBh", round(temp * 10), round(hum * 10), pos, round(setpoint * 10))


def parse_downlink(lines):
    """AT output lines: outdoor, setpoint, None.
    Downlink 4 bytes: outdoor*10 (int16), setpoint*10 (int16, 0 = keep)."""
    # RAK3172 line looks like "+EVT:RX_1:-45:10:UNICAST:1:00960000", payload is the last field
    for line in lines:
        if not line.startswith("+EVT:"):
            continue
        field = line.rsplit(":", 1)[-1]
        if len(field) != 8:
            continue
        try:
            out10, sp10 = struct.unpack(">hh", binascii.unhexlify(field))
        except ValueError:
            continue
        return out10 / 10, (sp10 / 10 if sp10 else None)
    return None


if __name__ == "__main__":
    class C:
        GAIN, MIN_STEP, COLD_OUTDOOR, MAX_OPEN_COLD, MAX_OPEN_UNKNOWN = 20, 10, 10.0, 25, 50

    assert target_opening(23.0, 24.0, 15.0, C) == 0          # below setpoint
    assert target_opening(26.0, 24.0, 15.0, C) == 40         # 2 °C over * 20
    assert target_opening(35.0, 24.0, 15.0, C) == 100        # capped at 100
    assert target_opening(30.0, 24.0, 5.0, C) == 25          # cold outside
    assert target_opening(30.0, 24.0, None, C) == 50         # outdoor unknown
    assert target_opening(30.0, 24.0, 32.0, C) == 0          # hotter outside
    assert not should_move(40, 45, C) and should_move(40, 50, C)
    assert should_move(5, 0, C) and not should_move(0, 0, C)
    assert encode_uplink(-2.5, 65.3, 40, 24.0) == bytes.fromhex("ffe7028d2800f0")
    assert parse_downlink(["OK", "+EVT:RX_1:-45:10:UNICAST:1:ff9c00f0", "+EVT:TX_DONE"]) == (-10.0, 24.0)
    assert parse_downlink(["+EVT:RX_1:-45:10:UNICAST:1:00960000"]) == (15.0, None)
    assert parse_downlink(["+EVT:JOINED", "+EVT:TX_DONE"]) is None
    print("ok")
