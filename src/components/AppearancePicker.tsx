import { useState } from 'react';
import {
  COLORS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  PORTRAIT_PARTS,
  PORTRAIT_SIZES,
  SKIN_TONES,
  decodePortrait,
  randomPortrait,
  withPart,
  type PortraitPart,
} from '../avatars';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/fr';
import { Icon } from './Icon';
import { Portrait } from './Portrait';

/** Éléments dont les options sont des teintes plutôt que des formes */
const SWATCHES: Partial<Record<PortraitPart, readonly string[]>> = {
  skin: SKIN_TONES,
  hairColor: HAIR_COLORS,
  outfitColor: OUTFIT_COLORS,
};

/**
 * Personnalisation du portrait : un onglet par élément (coiffure, visage, tenue…), chaque option est
 * un aperçu du portrait actuel avec cet élément changé. Le fond reprend la couleur du joueur.
 */
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
  const [part, setPart] = useState<PortraitPart>('hair');
  const current = decodePortrait(avatar);
  const swatches = SWATCHES[part];
  const partLabel = (p: PortraitPart) => t(`avatar.part.${p}` as TranslationKey);

  return (
    <>
      <div className="portrait-head">
        <p className="field-label">{t('profile.avatar')}</p>
        <button type="button" className="btn-text" onClick={() => onChange({ avatar: randomPortrait() })}>
          {t('avatar.random')}
        </button>
      </div>

      <div className="portrait-tabs" role="tablist" aria-label={t('profile.avatar')}>
        {PORTRAIT_PARTS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={part === p}
            className="portrait-tab"
            onClick={() => setPart(p)}
          >
            {partLabel(p)}
          </button>
        ))}
      </div>

      <div
        className={swatches ? 'portrait-options swatches' : 'portrait-options'}
        role="radiogroup"
        aria-label={partLabel(part)}
        data-color={color}
      >
        {Array.from({ length: PORTRAIT_SIZES[part] }, (_, i) => {
          const selected = current[part] === i;
          const pick = () => !selected && onChange({ avatar: withPart(avatar, part, i) });
          return swatches ? (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${partLabel(part)} ${i + 1}`}
              className="pick-swatch"
              style={{ background: swatches[i] }}
              onClick={pick}
            />
          ) : (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${partLabel(part)} ${i + 1}`}
              className="pick-portrait"
              onClick={pick}
            >
              <Portrait code={withPart(avatar, part, i)} />
            </button>
          );
        })}
      </div>

      <p className="field-label">{t('profile.color')}</p>
      <div className="color-row" role="radiogroup" aria-label={t('profile.color')}>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
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
