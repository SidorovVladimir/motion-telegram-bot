import 'dotenv/config';
import { Bot } from 'grammy';
import cvReadyPromise from '@techstark/opencv-js';
import { createCanvas, loadImage } from 'canvas';
import setupBot from './bot.js';
import { handleMotionDetected } from './motion.js';
import { captureFrameBuffer } from './camera.js';

// === Периодичность проверки движения (в мс) ===
const motionCheckInterval = 5000;

// === Обнаружение движения ===
let prevGray = null;

// === Получение токена бота из переменной окружения ===
const token = process.env.BOT_TOKEN;

// === Получение айди пользователя из переменной окружения ===
export const userId = +process.env.USER_ID;

// === Получение урл rtsp камеры из переменной окружения ===
const rtspUrl = process.env.RTSP_URL;

// === Инициализируем бота ===
const bot = new Bot(token);

console.log('🚀 Запуск бота...');

// === Инициализация OpenCV ===
const cv = await cvReadyPromise;
console.log('✅ OpenCV загружен!');

// === Команды бота ===
bot.api.setMyCommands([
  { command: 'start', description: 'Включает слежение' },
  { command: 'stop', description: 'Отключает слежение' },
  { command: 'photo', description: 'Cнимок камеры' },
  { command: 'record', description: 'Запись (10 сек)' },
  { command: 'status', description: 'Статус системы' },
]);

// === Функция обнаружения движения ===
async function detectMotion(base64Image) {
  const img = await loadImage(base64Image);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  const src = cv.matFromArray(
    img.height,
    img.width,
    cv.CV_8UC4,
    imageData.data
  );
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  if (!prevGray) {
    prevGray = gray.clone();
    return false;
  }

  const diff = new cv.Mat();
  cv.absdiff(prevGray, gray, diff);

  const thresh = new cv.Mat();
  cv.threshold(diff, thresh, 25, 255, cv.THRESH_BINARY);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    thresh,
    contours,
    hierarchy,
    cv.RETR_CCOMP,
    cv.CHAIN_APPROX_SIMPLE
  );

  let motionDetected = false;
  for (let i = 0; i < contours.size(); ++i) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    if (area > 500) {
      motionDetected = true;
      break;
    }
  }

  prevGray = gray.clone();
  return motionDetected;
}

// === Функция фоновой проверки движения ===
function startMotionDetection(rtspUrl, bot) {
  setInterval(async () => {
    console.log('📸 Проверяем на движение...');
    try {
      const buffer = await captureFrameBuffer(rtspUrl);
      const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      const motion = await detectMotion(base64Image);

      if (motion) {
        await handleMotionDetected(bot, rtspUrl);
      }
    } catch (err) {
      console.error('❌ Ошибка при обнаружении движения:', err.message || err);
    }
  }, motionCheckInterval);
}

setupBot(bot, rtspUrl);

// === Запуск бота ===
bot.start();
console.log('🤖 Бот запущен и готов к работе!');

// === Запуск фоновой проверки ===
startMotionDetection(rtspUrl, bot);
