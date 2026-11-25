import { useEffect, useState } from 'react';
import BrandFlower from './BrandFlower.jsx';

/** Shared avatar for staff and customers. Missing or broken photos show MySpa2's flower. */
export function ProfileAvatar({ photoUrl, name = 'usuario', className = '', iconSize = 34 }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  const showPhoto = Boolean(photoUrl) && !imageError;

  return (
    <span
      className={`profile-avatar ${className}`.trim()}
      role="img"
      aria-label={showPhoto ? `Foto de ${name}` : `Avatar de MySpa2 de ${name}`}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <BrandFlower size={iconSize} />
      )}
    </span>
  );
}
