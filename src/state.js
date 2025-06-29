export let motionNotificationsEnabled = true;

export let lastMotionTime = 'Нет событий';

export function toggleNotifications(value) {
  motionNotificationsEnabled = value;
}

export function setLastMotionTime(time) {
  lastMotionTime = time;
}
