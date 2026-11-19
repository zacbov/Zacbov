import { startExperiment } from './main.js';
startExperiment().catch(error => {
  console.error(error);
  const status = document.querySelector('#status');
  status.hidden = false;
  status.textContent = `Unable to start: ${error.message}`;
});
