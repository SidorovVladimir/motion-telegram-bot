import {
  motionNotificationsEnabled,
  lastMotionTime,
  setLastMotionTime,
} from './state.js';
import {
  captureFrameBuffer,
  captureVideoBuffer,
  broadcastMotionAlert,
  broadcastMotionVideo,
} from './camera.js';

let lastAlertTime = 0;

// === 60 секунд между уведомлениями ===
const minAlertInterval = 60000;

// === Функция уведомлений обнаружения движения ===
export async function handleMotionDetected(bot, rtspUrl) {
  if (!motionNotificationsEnabled) {
    return;
  }

  const now = Date.now();
  if (now - lastAlertTime < minAlertInterval) {
    console.log('⏳ Уведомления временно заблокированы из-за интервала');
    return;
  }

  console.log('🎥 Движение обнаружено! Начинаем запись видео...');
  lastAlertTime = now;
  setLastMotionTime(new Date().toLocaleString());

  try {
    const imageBuffer = await captureFrameBuffer(rtspUrl);
    const photoCaption = `📸 Движение обнаружено\n⏰ ${lastMotionTime}`;
    await broadcastMotionAlert(bot, imageBuffer, photoCaption);

    const videoBuffer = await captureVideoBuffer(rtspUrl);
    const videoCaption = `🎥 Видео при движении\n⏰ ${lastMotionTime}`;
    await broadcastMotionVideo(bot, videoBuffer, videoCaption);
  } catch (err) {
    console.error('❌ Ошибка при обработке движения:', err.message || err);
  }
}
