import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { PrefsProvider } from './lib/prefs';
import { SessionProvider } from './lib/session';
import { StatusProvider } from './lib/status';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/dm-sans';
import './styles.css';
import './game.css';
import './play.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrefsProvider>
      <I18nProvider>
        <StatusProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </StatusProvider>
      </I18nProvider>
    </PrefsProvider>
  </StrictMode>,
);
