import { InlineKeyboard } from 'grammy';

export const backKeyboard = new InlineKeyboard().text(
  '🔙 Назад в главное меню',
  'menu'
);

export const settingsMenu = new InlineKeyboard()
  .text('Установить периодичность проверки движения', 'check_motion')
  .row(); // Переход на новую строку

export const motionMenu = new InlineKeyboard()
  .text('1', 1000)
  .text('2', 2000)
  .text('3', 3000)
  .text('4', 4000)
  .text('5', 5000);
