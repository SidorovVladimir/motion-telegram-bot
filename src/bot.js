import { join } from 'path';
import { tmpdir } from 'os';
import fs from 'fs/promises';
import { isJPEG } from './utils/index.js';
import { InputFile } from 'grammy';
import {
  motionNotificationsEnabled,
  toggleNotifications,
  lastMotionTime,
  motionCheckInterval,
  setMotionCheckInterval,
} from './state.js';
import { captureFrame, captureVideoBuffer } from './camera.js';
import { settingsMenu, backKeyboard, motionMenu } from './keyboards/index.js';

export default (bot, rtspUrl) => {
  bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    toggleNotifications(true, userId);
    await ctx.reply(
      '✅ Слежение за движением и подписка на уведомления включены'
    );
  });

  bot.command('stop', async (ctx) => {
    toggleNotifications(false);
    await ctx.reply(
      '🛑 Слежение за движением и подписка на уведомления отключены'
    );
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
    ⏰ Периодичность проверки движения: ${motionCheckInterval / 1000} сек. 
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

  bot.command('settings', async (ctx) => {
    await ctx.reply('Выберите пункт меню', {
      reply_markup: settingsMenu,
    });
  });

  bot.callbackQuery('check_motion', async (ctx) => {
    await ctx.editMessageText('Выберите значения в секундах', {
      reply_markup: motionMenu,
    });
    await ctx.answerCallbackQuery();
  });

  bot.on('callback_query:data', async (ctx) => {
    setMotionCheckInterval(ctx.callbackQuery.data);
    await ctx.reply(
      `Периодичность проверки движения установлено в ${
        ctx.callbackQuery.data / 1000
      } сек.`
    );
    await ctx.answerCallbackQuery();
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error('Ошибка в запросе:', e.description);
    } else if (e instanceof HttpError) {
      console.error('Не удалось связаться с Telegram:', e);
    } else {
      console.error('Неизвестная ошибка:', e);
    }
  });
};
