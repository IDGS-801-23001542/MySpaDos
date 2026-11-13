import { UserRound, Users } from 'lucide-react';

export function initialGuests(profile) {
  return [{
    name: [profile?.name, profile?.lastName, profile?.secondLastName].filter(Boolean).join(' '),
    phone: profile?.phone || '', treatmentIds: [],
  }];
}

export function resizeGuests(guests, count) {
  const next = guests.slice(0, count);
  while (next.length < count) next.push({ name: '', phone: '', treatmentIds: [] });
  return next;
}

/** These are preferences at reservation time, not a charged service. */
export default function BookingGuests({ guests, onChange, partySize, treatments = [] }) {
  function change(index, changes) {
    onChange(guests.map((guest, idx) => idx === index ? { ...guest, ...changes } : guest));
  }

  function toggleTreatment(index, treatmentId, checked) {
    const current = guests[index].treatmentIds || [];
    change(index, { treatmentIds: checked ? [...current, treatmentId] : current.filter((id) => id !== treatmentId) });
  }

  return (
    <div className="guest-details">
      <div className="guest-details-intro">
        <Users size={18} />
        <div><strong>Asistentes y tratamientos deseados</strong>
          <p>Personaliza cada visita. Los productos y costos se confirmarán al registrar el servicio.</p>
        </div>
      </div>
      {guests.slice(0, partySize).map((guest, index) => (
        <section className="guest-card" key={index}>
          <h4><UserRound size={17} /> {index === 0 ? 'Titular de la reservación' : 'Acompañante'}</h4>
          <label className="field"><span className="field-label">Nombre completo *</span>
            <input required maxLength={120} minLength={2} value={guest.name || ''}
              onChange={(event) => change(index, { name: event.target.value })}
              placeholder={index === 0 ? 'Nombre del titular' : 'Nombre de tu acompañante'} />
          </label>
          <label className="field"><span className="field-label">Teléfono (opcional)</span>
            <input type="tel" maxLength={25} value={guest.phone || ''}
              onChange={(event) => change(index, { phone: event.target.value })} />
          </label>
          {treatments.length > 0 && (
            <fieldset className="guest-treatments">
              <legend>Tratamientos de interés (opcional)</legend>
              {treatments.map((treatment) => (
                <label className="guest-treatment-choice" key={treatment.id}>
                  <input type="checkbox" checked={(guest.treatmentIds || []).includes(treatment.id)}
                    onChange={(event) => toggleTreatment(index, treatment.id, event.target.checked)} />
                  <span>{treatment.name}</span>
                </label>
              ))}
            </fieldset>
          )}
        </section>
      ))}
    </div>
  );
}
