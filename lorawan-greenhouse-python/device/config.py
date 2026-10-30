# Climate
SETPOINT = 24.0          # °C inside (downlink can override)
GAIN = 20                # % window opening per °C above setpoint
MIN_STEP = 10            # % - smaller corrections are ignored (stops relay chatter)
COLD_OUTDOOR = 10.0      # °C outside - colder than this counts as "cold outside"
MAX_OPEN_COLD = 10       # % - when cold outside, never open wider
MAX_OPEN_UNKNOWN = 50    # % when no outdoor temp received
OUTDOOR_MAX_AGE_S = 3600

# Window actuator
TRAVEL_S = 30
RELAY_ON = 1

# Timing
CONTROL_EVERY_S = 60
UPLINK_EVERY_S = 600     # limit ~30s airtime/day

# Pins
DHT_PIN = 4
OPEN_PIN = 26
CLOSE_PIN = 27
LORA_TX = 17
LORA_RX = 16

# LoRaWAN OTAA keys (TTN console), EU868
DEVEUI = "0000000000000000"
APPEUI = "0000000000000000"
APPKEY = "00000000000000000000000000000000"
BAND = 4 # RAK3172: 4 = EU868, 5 = US915
