import './styles.css';

export const APP_NAME = '놀이 학교';

const root = document.getElementById('app');
if (root) {
  const h1 = document.createElement('h1');
  h1.textContent = APP_NAME;
  root.appendChild(h1);
}
