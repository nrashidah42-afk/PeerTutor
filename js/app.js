/** Application entry point. */
import { initRouter } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { session } from './state/session.js';
import { authService } from './services/authService.js';

async function bootstrap() {
  const navbar = document.getElementById('navbar');
  renderFooter(document.getElementById('footer'));

  // Validate a stored session and pick up role changes (e.g. newly approved tutor).
  if (session.getToken()) {
    try {
      await authService.refresh();
    } catch {
      session.clear();
    }
  }

  renderNavbar(navbar);
  session.subscribe(() => renderNavbar(navbar));
  window.addEventListener('routechange', () => renderNavbar(navbar));

  initRouter(document.getElementById('main'));
}

bootstrap();
