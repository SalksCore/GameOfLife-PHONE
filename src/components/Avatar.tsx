/** Pastille avatar : emoji du joueur sur sa couleur (motif ajouté en mode daltonien). */
export function Avatar({
  avatar,
  color,
  size = 'md',
  offline = false,
}: {
  avatar: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  offline?: boolean;
}) {
  return (
    <span className={`avatar avatar-${size}${offline ? ' offline' : ''}`} data-color={color} aria-hidden="true">
      {avatar}
    </span>
  );
}
