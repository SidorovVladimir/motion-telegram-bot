# 🤖 Motion Telegram Bot

Telegram bot for detecting camera motion and sending notifications.

## 🧰 Functionality

- ✅ Gets frames from the camera via FFmpeg
- ✅ Uses OpenCV for motion detection
- ✅ Sends notifications to Telegram:
- 📸 Photo when motion is detected
- 🎥 10-second video when triggered
- ✅ Command `/photo` — get the current frame
- ✅ Command `/record` — get 10-second video

## 📦 Requirements

- Node.js v18.x or higher
- FFmpeg installed on the system (`ffmpeg -version`)
- Camera with RTSP support
- Telegram Bot API token (get from [@BotFather](https://t.me/BotFather))

## 🔧 Installation

```bash
git clone https://github.com/SidorovVladimir/motion-telegram-bot.git
cd motion-telegram-bot
npm install
```

## ⚙️ Setup

1. Create a `.env` file (recommended):

```env
BOT_TOKEN=your bot token
USER_ID=your telegram user id
RTSP_URL=rtsp://login:password@ip:port/stream=0
```

- USER_ID can be obtained from [@userinfobot](https://t.me/userinfobot) - Just write him `/start` or any message - he will send you your ID.

## 🚀 Launch

**Local:**

```bash
node src/index.js
```

## 📱 Telegram Commands

| Command   | Description                        |
| --------- | ---------------------------------- |
| `/start`  | Enables tracking                   |
| `/stop`   | Disables tracking                  |
| `/photo`  | Get the last frame from the camera |
| `/record` | Record and send a 10-second video  |
| `/status` | Shows the system status            |

## 🧠 How does it work?

1. The bot periodically takes pictures from the camera via FFmpeg
2. Using the WebAssembly version of OpenCV, it checks for movement
3. When motion is detected, it sends photos and videos to Telegram
