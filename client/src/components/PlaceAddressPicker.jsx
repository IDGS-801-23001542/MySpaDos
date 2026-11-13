import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

let mapsPromise;

function loadMaps(key) {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&libraries=places&language=es&region=MX`;
      script.async = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Google Places no pudo cargarse. Puedes capturar la dirección manualmente.'));
      document.head.appendChild(script);
    }).catch((error) => {
      mapsPromise = null;
      throw error;
    });
  }
  return mapsPromise;
}

const component = (parts, type) => parts.find((part) => part.types.includes(type))?.longText || '';

export function parseGoogleAddress(place) {
  const parts = place.addressComponents || [];
  const position = place.location;
  return {
    address: place.formattedAddress || '',
    stateName: component(parts, 'administrative_area_level_1'),
    municipality: component(parts, 'locality') ||
      component(parts, 'administrative_area_level_2') ||
      component(parts, 'postal_town'),
    postalCode: component(parts, 'postal_code'),
    countryCode: parts.find((part) => part.types.includes('country'))?.shortText || '',
    googlePlaceId: place.id || '',
    latitude: typeof position?.lat === 'function' ? position.lat() : position?.lat,
    longitude: typeof position?.lng === 'function' ? position.lng() : position?.lng,
  };
}

/** Optional address assistance. All fields remain editable when Places is disabled. */
export function PlaceAddressPicker({ onSelect }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onSelect);
  const [error, setError] = useState('');
  const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  useEffect(() => { callbackRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!key || !navigator.onLine) return undefined;
    let disposed = false;
    let autocomplete;
    let handleSelect;

    loadMaps(key)
      .then((google) => google.maps.importLibrary('places'))
      .then(({ PlaceAutocompleteElement }) => {
        if (disposed || !containerRef.current) return;
        autocomplete = new PlaceAutocompleteElement({
          includedRegionCodes: ['mx'],
          requestedLanguage: 'es',
          placeholder: 'Busca una calle, número o lugar en México',
        });
        autocomplete.style.width = '100%';
        handleSelect = async (event) => {
          try {
            const place = event.placePrediction.toPlace();
            await place.fetchFields({
              fields: ['id', 'formattedAddress', 'addressComponents', 'location'],
            });
            if (!disposed) {
              callbackRef.current(parseGoogleAddress(place));
              setError('');
            }
          } catch {
            if (!disposed) setError('No se pudo leer la dirección. Escríbela manualmente.');
          }
        };
        autocomplete.addEventListener('gmp-select', handleSelect);
        containerRef.current.replaceChildren(autocomplete);
      })
      .catch((reason) => { if (!disposed) setError(reason.message); });

    return () => {
      disposed = true;
      if (autocomplete && handleSelect) autocomplete.removeEventListener('gmp-select', handleSelect);
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [key]);

  return (
    <div className="places-helper field-full">
      <div className="places-helper-title"><MapPin size={18} /> Buscar dirección (Google Places, opcional)</div>
      {!key ? (
        <p className="field-hint">Para activar el autocompletado, configura VITE_GOOGLE_MAPS_API_KEY en tu .env. También puedes llenar la dirección y coordenadas manualmente.</p>
      ) : !navigator.onLine ? (
        <p className="field-hint">Sin internet. Captura la dirección manualmente.</p>
      ) : <div ref={containerRef} className="places-autocomplete-host" />}
      {error && <p className="field-hint" role="status">{error}</p>}
    </div>
  );
}
