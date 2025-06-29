import { join } from 'path';
import { tmpdir } from 'os';
import fs from 'fs/promises';
import { isJPEG } from './utils/index.js';
import { InputFile } from 'grammy';
import {
  motionNotificationsEnabled,
  toggleNotifications,
  lastMotionTime,
} from './state.js';
import { captureFrame, captureVideoBuffer } from './camera.js';

export default (bot, rtspUrl) => {
  bot.command('start', async (ctx) => {
    toggleNotifications(true);
    await ctx.reply('✅ Слежение за движением включено');
  });

  bot.command('stop', async (ctx) => {
    toggleNotifications(false);
    await ctx.reply('🛑 Слежение за движением остановлено');
  });

  bot.command('photo', async (ctx) => {
    console.log('📸 Получаем кадр по команде /photo');

    let tempFile = null;

    try {
      // Генерируем путь к временному файлу
      tempFile = join(tmpdir(), `cam_${Date.now()}.jpg`);

      // Получаем кадр с камеры
      await captureFrame(rtspUrl, tempFile);

      // Читаем файл
      const buffer = await fs.readFile(tempFile);

      // Проверяем формат
      if (!isJPEG(buffer)) {
        throw new Error('Файл не является валидным JPEG');
      }

      // Отправляем фото через Telegram Bot API
      await ctx.replyWithPhoto(new InputFile(buffer, 'snapshot.jpg'), {
        caption: `📸 Кадр с камеры\n⏰ ${new Date().toLocaleString()}`,
      });
    } catch (error) {
      console.error(
        '❌ Ошибка при выполнении команды /photo:',
        error.message || error
      );
      await ctx.reply(
        '❌ Не удалось получить кадр с камеры. Попробуйте позже.'
      );
    } finally {
      // Удаляем временный файл, если он существует
      if (tempFile) {
        try {
          await fs.unlink(tempFile);
        } catch (err) {
          console.warn(
            `⚠️ Не удалось удалить временный файл: ${tempFile}`,
            err
          );
        }
      }
    }
  });
  bot.command('status', async (ctx) => {
    const statusText = `
    📊 Статус системы:
    🕒 Уведомления при движении: ${motionNotificationsEnabled ? 'ВКЛ' : 'ВЫКЛ'}
    ⏰ Последнее событие: ${lastMotionTime}
    `;
    await ctx.reply(statusText.trim());
  });

  bot.command('record', async (ctx) => {
    await ctx.reply('🎥 Начинаем запись 10 секунд...');

    try {
      const videoBuffer = await captureVideoBuffer(rtspUrl);
      await ctx.replyWithVideo(new InputFile(videoBuffer, 'motion.mp4'), {
        caption: `🎥 Видео по запросу\n⏰ ${new Date().toLocaleString()}`,
      });
    } catch (err) {
      console.error('❌ Ошибка записи видео:', err.message || err);
      await ctx.reply('❌ Не удалось записать видео');
    }
  });
};
