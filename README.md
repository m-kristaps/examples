### whitelabel-laravel – label designer backend (Laravel)

Part of a platform where customers can design labels for their own branded products. Customer edits label in browser editor, and backend saves the design, creates preview images and 3D mockups.

What is interesting here:

- **MandatoryDesignGuard** – label must always have required info (ingredients, warnings, barcode etc.). Editor hides these controls in the UI, but the request can still be changed by hand, so server checks every save again. Customer can move the text and change font size in some limits, everything else is restored from the last saved version. Invalid values are fixed, not rejected, because this runs on autosave and customer should not lose their work.
- **GenerateDesignPreview** – queued job which sends design to a separate renderer service and saves preview images with Spatie MediaLibrary. If uploaded images are still processing, job waits and tries again.
- **GenerateMockupImage** – renders 3D mockup of the label on the product.
- **TemplateDesignerController** + **LabelDesignPolicy** – editor page, save and mockup download.

Tech: Laravel, PHP 8, queues, Eloquent, Spatie MediaLibrary, Policies

### custom-hooks-react – React hooks for investment platform

Few custom hooks from a trading / portfolio app. They choose active portfolio, get available cash for the active account and list currencies the user can use.

Tech: React, TypeScript, React Router

---

## Side projects

### material-cut-interactive-react – furniture parts cutting order

Small app for ordering cut furniture parts (boards). You add sheet materials, edge banding colors and the parts with sizes, and see a preview of each part with its edges. In the end it exports everything to an Excel order form which goes to the workshop. Excel file can be imported back to continue editing.

UI is in Latvian, because it was made for local use.

The Excel template (`public/order.xlsx`) is not included, it is a workshop's own form. Without it export will show an error, but the rest of the app works.

Tech: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), ExcelJS

```
npm install
npm run dev
```

### floor-plan-3d-threejs-typescript – interactive 3D building plan

3D model of an apartment building in the browser. Click on a floor and it opens up (everything above is hidden), then click on an apartment to see its info – size, bedrooms, bathrooms, balcony. Esc or button goes back to whole building.

Tech: Three.js, TypeScript, Vite, GLTF model

```
npm install
npm run dev
```

### hockey-schedule-javascript – daily ice hockey schedule bot

I play hockey and was tired of checking 3 different ice rink websites every day. This script checks the schedules (2 websites and one Google Sheet), finds today's sessions for playing with sticks, and sends one message to Telegram and/or WhatsApp group. It can also add a poll "who is coming?". Runs once a day with cron.

Tech: Node.js, Cheerio (scraping), Telegraf, whatsapp-web.js

```
npm install
npm test     # small tests
npm start    # without .env it only prints the message
```

Settings go to `.env`: `T_BOT_TOKEN`, `T_BOT_CHAT_ID`, `T_BOT_POLL`, `WA_CHAT`, `API_URL`, `API_TOKEN`.

### lorawan-greenhouse-python – greenhouse window control

ESP32 with temperature sensor opens and closes greenhouse windows with a motor. It sends data over LoRaWAN (The Things Network) and the server sends back the outside temperature, so when it's cold outside windows are opened only a little.

Some safety things: relays can never be on in both directions, a watchdog restarts the board if it hangs (so the motor doesn't stay on), and on start windows close fully, so position is known.

- `device/` – MicroPython code for ESP32 + RAK3172 LoRa module
- `server/ttn.py` – webhook for TTN, gets outdoor temperature from Open-Meteo

Tech: MicroPython, ESP32, LoRaWAN, Python

```
python3 device/control.py   # tests for the control logic
python3 server/ttn.py       # server, port 8002
```

### water-meter-reading-python – reading water meter with camera

Water meter is in a place where it's hard to read it, so ESP32-CAM takes a photo every hour and sends it to the server. Server crops the digits, reads them with Tesseract OCR and sends the value to an API. If the reading looks wrong (goes backwards or jumps too much) it is skipped.

There are two versions:

- `server.py` + `esp32/` – my own version with OCR
- `alt/` – second option using the "AI on the Edge" firmware on the camera, here server only receives ready readings

OCR is not always accurate yet, so I keep all photos for calibration later.

Tech: Python, Pillow, Tesseract, MicroPython, ESP32-CAM

```
pip install pillow pytesseract
python3 server.py
```

---
