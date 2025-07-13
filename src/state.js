// === Уведомления движения ===
export let motionNotificationsEnabled = false;

// === Последнее событие ===
export let lastMotionTime = 'Нет событий';

// === Id пользователя ===
export let userId = null;

// === Периодичность проверки движения (в мс) ===
export let motionCheckInterval = 5000;

export function toggleNotifications(value, id = null) {
  userId = id;
  motionNotificationsEnabled = value;
}

export function setLastMotionTime(time) {
  lastMotionTime = time;
}

export function setMotionCheckInterval(ms) {
  motionCheckInterval = ms;
}
