import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { InputFile } from 'grammy';
import { isJPEG } from './utils/index.js';
import { userId } from './state.js';

export const captureFrameBuffer = async (rtspUrl) => {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-use_wallclock_as_timestamps',
      '1',
      '-rtsp_transport',
      'tcp',
      '-i',
      rtspUrl,
      '-vframes',
      '1', // только один кадр
      '-f',
      'image2', // формат вывода: изображение
      '-c:v',
      'mjpeg', // конвертируем в MJPEG
      '-q:v',
      '2', // качество (низкий размер файла)
      '-vf',
      'scale=640:-1', // уменьшаем размер
      '-pix_fmt',
      'yuvj420p', // совместимость с Telegram
      '-',
    ]);

    let bufferChunks = [];
    let stderrData = '';

    ffmpegProcess.stdout.on('data', (chunk) => {
      bufferChunks.push(chunk);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    ffmpegProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`❌ FFmpeg завершился с кодом ${code}`);
        console.error('STDERR:', stderrData);
        return reject(new Error(`FFmpeg failed with code ${code}`));
      }

      const imageBuffer = Buffer.concat(bufferChunks);

      if (!isJPEG(imageBuffer)) {
        return reject(new Error('❌ Содержимое не является изображением JPEG'));
      }

      resolve(imageBuffer);
    });

    ffmpegProcess.on('error', (err) => {
      console.error('💥 Ошибка запуска FFmpeg:', err.message);
      reject(err);
    });
  });
};

export const captureVideoBuffer = async (rtspUrl) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const ffmpegProcess = spawn('ffmpeg', [
      '-rtsp_transport',
      'tcp',
      '-i',
      rtspUrl,
      '-t',
      '10', // записываем 10 секунд
      '-c:v',
      'libx264', // кодек видео
      '-preset',
      'ultrafast', // ускоренная кодировка
      '-tune',
      'zerolatency', // минимизация задержки
      '-pix_fmt',
      'yuv420p', // совместимость с Telegram
      '-c:a',
      'aac', // аудио (может быть отключено)
      '-f',
      'mp4', // формат вывода
      '-movflags',
      '+frag_keyframe+empty_moov', // для потоковой передачи
      '-vf',
      'scale=640:trunc(ow/a/2)*2', // фикс для четных размеров
      'pipe:1',
    ]);

    let stderr = '';

    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });

    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ FFmpeg завершился с кодом ${code}`);
        console.error('STDERR:', stderr);
        return reject(new Error('Ошибка FFmpeg'));
      }

      const videoBuffer = Buffer.concat(chunks);
      resolve(videoBuffer);
    });

    ffmpegProcess.on('error', (err) => {
      reject(err);
    });
  });
};

export const captureFrame = async (rtspUrl, tempFile) => {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport tcp',
        '-timeout 5000000', // Таймаут подключения
        '-analyzeduration 10000000',
        '-probesize 10000000',
      ])
      .outputOptions([
        '-vframes 1',
        '-q:v 2',
        '-f image2',
        '-c:v mjpeg',
        '-pix_fmt yuvj420p',
      ])
      .on('start', (cmd) => console.log('Выполняется команда:', cmd))
      .on('end', resolve)
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg error:', err);
        console.error('FFmpeg stdout:', stdout);
        console.error('FFmpeg stderr:', stderr);
        reject(err);
      })
      .save(tempFile);

    // Устанавливаем таймаут на выполнение FFmpeg
    setTimeout(() => {
      if (!ffmpegProcess.ended && !ffmpegProcess.killed) {
        ffmpegProcess.kill();
        reject(new Error('Таймаут выполнения FFmpeg'));
      }
    }, 10000); // 10 секунд
  });
};

export const broadcastMotionVideo = async (bot, videoBuffer, caption) => {
  try {
    await bot.api.sendVideo(userId, new InputFile(videoBuffer, 'motion.mp4'), {
      caption,
      filename: 'motion.mp4',
      contentType: 'video/mp4',
    });

    console.log(`✅ Видео отправлено пользователю ${userId}`);
  } catch (err) {
    console.error(
      `❌ Не удалось отправить видео пользователю ${userId}:`,
      err.message
    );
  }
};

export const broadcastMotionAlert = async (bot, imageBuffer, caption) => {
  try {
    await bot.api.sendDocument(
      userId,
      new InputFile(imageBuffer, 'motion.jpg'),
      {
        caption,
      }
    );
    console.log(`✅ Фото отправлено как документ пользователю ${userId}`);
  } catch (err) {
    console.error(
      `❌ Ошибка отправки фото пользователю ${userId}:`,
      err.message
    );
  }
};
