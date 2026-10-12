import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/fr';
import { Icon, type IconName } from './Icon';

export type Tab = 'play' | 'profile' | 'settings';

const TABS: { id: Tab; icon: IconName; label: TranslationKey }[] = [
  { id: 'play', icon: 'play', label: 'tabs.play' },
  { id: 'profile', icon: 'user', label: 'tabs.profile' },
  { id: 'settings', icon: 'settings', label: 'tabs.settings' },
];

/** Navigation principale, en bas de l'écran (à portée de pouce). */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label={t('tabs.label')}>
      {TABS.map((item) => (
        <button
          key={item.id}
          className="tab"
          aria-current={tab === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          <Icon name={item.icon} size={24} weight={tab === item.id ? 'fill' : 'bold'} />
          <span>{t(item.label)}</span>
        </button>
      ))}
    </nav>
  );
}
