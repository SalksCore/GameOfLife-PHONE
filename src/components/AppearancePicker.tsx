import { AVATARS, COLORS } from '../avatars';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/fr';
import { Icon } from './Icon';

/** Choix de l'avatar (emoji) et de la couleur du joueur. */
export function AppearancePicker({
  avatar,
  color,
  onChange,
}: {
  avatar: string;
  color: string;
  onChange: (patch: { avatar?: string; color?: string }) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <p className="field-label">{t('profile.avatar')}</p>
      <div className="avatar-grid" role="radiogroup" aria-label={t('profile.avatar')}>
        {AVATARS.map((a) => (
          <button
            key={a}
            role="radio"
            aria-checked={avatar === a}
            className="pick-avatar"
            data-color={color}
            onClick={() => avatar !== a && onChange({ avatar: a })}
          >
            {a}
          </button>
        ))}
      </div>

      <p className="field-label">{t('profile.color')}</p>
      <div className="color-row" role="radiogroup" aria-label={t('profile.color')}>
        {COLORS.map((c) => (
          <button
            key={c}
            role="radio"
            aria-checked={color === c}
            aria-label={t(`color.${c}` as TranslationKey)}
            title={t(`color.${c}` as TranslationKey)}
            className="pick-color"
            data-color={c}
            onClick={() => color !== c && onChange({ color: c })}
          >
            <Icon name="check" size={18} />
          </button>
        ))}
      </div>
    </>
  );
}
