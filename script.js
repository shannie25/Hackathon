function updateTime() {
  const timeDisplay = document.getElementById('timeDisplay');
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  timeDisplay.textContent = `${hours}:${minutes} ${ampm}`;
}

setInterval(updateTime, 1000);
updateTime();
