const branches = [
  { name: 'MySpa Centro', address: 'Zona Centro, León, Guanajuato (ubicación demostrativa)', latitude: 21.1217, longitude: -101.6824 },
  { name: 'MySpa Jardines', address: 'Zona Norte, León, Guanajuato (ubicación demostrativa)', latitude: 21.1533, longitude: -101.6991 },
  { name: 'MySpa Valle', address: 'Zona Sur, León, Guanajuato (ubicación demostrativa)', latitude: 21.0862, longitude: -101.6513 },
];

const demoRoomPhotos = Object.freeze({
  'Sala Lavanda': '/rooms/lavanda.webp',
  'Sala Olivo': '/rooms/olivo.webp',
  'Sala Loto': '/rooms/loto.webp',
  'Sala Bambú': '/rooms/bambu.webp',
  'Sala Salvia': '/rooms/salvia.webp',
  'Sala Arena': '/rooms/arena.webp',
  'Sala Niebla': '/rooms/niebla.webp',
});

const rooms = [
  ['Sala Lavanda', 'Un refugio sereno para masajes relajantes y terapias aromáticas.', 'MySpa Centro'],
  ['Sala Olivo', 'Espacio privado de luz tenue, materiales naturales y bienestar profundo.', 'MySpa Centro'],
  ['Sala Loto', 'Ambiente de calma para faciales y rituales de hidratación.', 'MySpa Centro'],
  ['Sala Bambú', 'Una experiencia cálida y botánica inspirada en la naturaleza.', 'MySpa Jardines'],
  ['Sala Salvia', 'Sala dedicada a tratamientos holísticos y técnicas restaurativas.', 'MySpa Jardines'],
  ['Sala Arena', 'Texturas suaves y silencio para recuperar el equilibrio.', 'MySpa Valle'],
  ['Sala Niebla', 'Rituales de descanso, relajación muscular y atención individual.', 'MySpa Valle'],
];

const schedules = [
  ['09:00', '10:00'], ['10:15', '11:15'], ['11:30', '12:30'],
  ['13:00', '14:00'], ['15:00', '16:00'], ['16:15', '17:15'], ['17:30', '18:30'],
];

const products = [
  ['Aceite de lavanda', 'Botánica', 90], ['Aceite de almendras', 'Naturelle', 75],
  ['Mascarilla de arcilla', 'Tierra Viva', 135], ['Sérum hidratante', 'Derma Calm', 160],
  ['Exfoliante de sal marina', 'Mar Esencia', 110], ['Crema corporal de karité', 'Senda', 120],
  ['Esencia de eucalipto', 'Botánica', 65], ['Tónico facial', 'Derma Calm', 80],
  ['Piedras calientes', 'Ritual', 50], ['Gel calmante', 'Naturelle', 85],
  ['Aroma de jazmín', 'Senda', 95], ['Mascarilla de avena', 'Tierra Viva', 100],
];

const treatments = [
  ['Masaje de serenidad', 'Un masaje envolvente para liberar tensión y recuperar la calma.'],
  ['Ritual de aromaterapia', 'Esencias botánicas para favorecer un descanso profundo.'],
  ['Facial de rocío', 'Limpieza delicada e hidratación intensiva para la piel.'],
  ['Exfoliación de sal', 'Renovación suave con sales minerales y cremas nutritivas.'],
  ['Masaje con piedras cálidas', 'Calor y movimientos lentos para aliviar la rigidez muscular.'],
  ['Ritual de jazmín', 'Experiencia sensorial con notas florales y cuidados hidratantes.'],
  ['Envoltura de karité', 'Tratamiento corporal nutritivo para suavizar la piel.'],
  ['Facial de avena', 'Ritual calmante con ingredientes de sensación ligera.'],
];

// Contraseñas FIJAS solo para la demostración local solicitada.
// ATENCIÓN: este seed contiene contraseñas de prueba en texto claro.
// No publiques scripts/seed.mjs en un repositorio accesible a terceros.
const DEMO_PASSWORDS = Object.freeze({
  admin: 'Admin123456789',
  empleado: 'Empleado12345',
  jeypeeh: 'Jpgh13021999',
  valle: 'Valle1234567',
  centro: 'Centro1234567',
  camila: 'Camila1234567',
  mateo: 'Mateo12345678',
  lucia: 'Lucia12345678',
});
const employees = [
  {
    name: 'Adriana', lastName: 'Santos', secondLastName: 'Ríos',
    gender: 'FEMENINO', rfc: 'SARA900215AB1', address: 'León, Guanajuato',
    phone: '4771001001', position: 'Gerente', username: 'admin',
    email: 'admin@myspa.local', branchName: 'MySpa Centro',
  },
  {
    name: 'Emilio', lastName: 'Luna', secondLastName: 'Torres',
    gender: 'MASCULINO', rfc: 'LUTE950412CD2', address: 'León, Guanajuato',
    phone: '4771001002', position: 'Terapeuta', username: 'empleado',
    email: 'empleado@myspa.local', branchName: 'MySpa Jardines',
  },
  {
    name: 'Paola', lastName: 'Campos', secondLastName: 'Lara',
    gender: 'FEMENINO', rfc: 'CALP940422AB6', address: 'León, Guanajuato',
    phone: '4771001004', position: 'Terapeuta', username: 'centro',
    email: 'centro@myspa.local', branchName: 'MySpa Centro',
  },
  {
    name: 'Rosa', lastName: 'Mendoza', secondLastName: 'López',
    gender: 'FEMENINO', rfc: 'MELR970312AB5', address: 'León, Guanajuato',
    phone: '4771001003', position: 'Recepcionista', username: 'valle',
    email: 'valle@myspa.local', branchName: 'MySpa Valle',
  },
];

const clients = [
  {
    name: 'Jeypeeh', lastName: 'Garcia', secondLastName: 'Hernandez',
    gender: 'MASCULINO', rfc: '', address: 'misionjesuita 104',
    phone: '4773714924', email: 'heezly123@gmail.com',
    username: 'jeypeeh',
  },
  { name: 'Camila', lastName: 'Torres', secondLastName: 'Nava', gender: 'FEMENINO',
    rfc: '', address: 'León, Guanajuato', phone: '4772000001',
    email: 'camila@myspa.local', username: 'camila' },
  { name: 'Mateo', lastName: 'López', secondLastName: 'Vega', gender: 'MASCULINO',
    rfc: '', address: 'León, Guanajuato', phone: '4772000002',
    email: 'mateo@myspa.local', username: 'mateo' },
  { name: 'Lucía', lastName: 'Ruiz', secondLastName: 'Díaz', gender: 'FEMENINO',
    rfc: '', address: 'León, Guanajuato', phone: '4772000003',
    email: 'lucia@myspa.local', username: 'lucia' },
];

const checkOnly = process.argv.includes('--check');
const reset = process.argv.includes('--reset');
const confirmed = process.argv.includes('--confirm-reset=MYSPA2');

if (checkOnly) {
  if (reset) {
    console.error('[SEED] --check no puede combinarse con --reset.');
    process.exit(1);
  }
  console.log(`Seed válido: ${branches.length} sucursales, ${rooms.length} salas, ${schedules.length} horarios, ${products.length} productos, ${treatments.length} tratamientos, ${employees.length} empleados y ${clients.length} clientes.`);
  console.log('Usuarios demo: admin, centro, empleado, valle, jeypeeh, camila, mateo y lucia.');
  console.log('Contraseñas fijas configuradas en el propio seed; no se generan contraseñas aleatorias.');
  process.exit(0);
}

if (reset && !confirmed) {
  console.error('[SEED] Reinicio NO ejecutado. Para borrar exclusivamente myspa2: npm run seed -- --reset --confirm-reset=MYSPA2');
  process.exit(1);
}

const { connectDatabase, col, ensureIndexes, nextId, closeDatabase, inTransaction } = await import('../server/src/lib/db.js');
const { createAccount, passwordField } = await import('../server/src/lib/security.js');
const { spaInstant } = await import('../server/src/lib/time.js');
const { generateClientNumber, generateEmployeeNumber } = await import('../server/src/lib/numbers.js');
const { config } = await import('../server/src/lib/config.js');

function seedPassword(person) {
  const password = DEMO_PASSWORDS[person.username];
  if (!passwordField.safeParse(password).success) {
    throw new Error(`Contraseña de prueba inválida para ${person.username}. No se modificó la base de datos.`);
  }
  return password;
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function upsert(name, filter, data) {
  const collection = col(name);
  const found = await collection.findOne(filter);
  if (found) return found;
  const record = {
    ...data, id: await nextId(name), status: 'ACTIVO',
    createdAt: new Date(), updatedAt: new Date(),
  };
  await collection.insertOne(record);
  return record;
}

async function setupDemoUser(person, role, branchId) {
  const collection = role === 'CLIENTE' ? 'clients' : 'employees';
  const existing = await col('users').findOne({ usernameLower: person.username.toLowerCase() });
  if (existing) {
    if ((existing.role !== role && !(role === 'ADMIN' && existing.role === 'EMPLEADO')) || existing.emailLower !== person.email.toLowerCase()) {
      throw new Error(`La cuenta ${person.username} ya existe con otro rol/correo. No se modificó.`);
    }
    const profile = await col(collection).findOne({ userId: existing.id });
    if (profile) {
      // Promoción controlada del administrador demo existente, sin reset de datos.
      if (role === 'ADMIN' && existing.role === 'EMPLEADO') {
        await col('users').updateOne({ id: existing.id }, { $set: { role: 'ADMIN' } });
      }
      return profile;
    }
    console.log(`[SEED] Restaurando perfil faltante de ${person.username}.`);
  }

  const password = existing ? null : seedPassword(person);
  const record = await inTransaction(async (session) => {
    const userId = existing?.id || await createAccount({
      ...person, role, password, session,
    });
    const result = {
      name: person.name,
      lastName: person.lastName,
      secondLastName: person.secondLastName,
      gender: person.gender,
      rfc: person.rfc,
      address: person.address,
      phone: person.phone,
      email: person.email,
      username: person.username,
      id: await nextId(collection, session),
      userId,
      status: 'ACTIVO',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (role !== 'CLIENTE') {
      result.position = person.position;
      result.branchId = branchId;
      result.photoUrl = '';
      result.employeeNumber = await generateEmployeeNumber(person.rfc, session);
    } else {
      result.photoUrl = '';
      result.clientNumber = await generateClientNumber(person, session);
    }
    await col(collection).insertOne(result, { session });
    return result;
  });
  if (!existing) console.log(`[SEED] Cuenta ${role} creada: ${person.email} (usuario: ${person.username}).`);
  return record;
}

// Borrado controlado de los datos de ESTA aplicación.
// No utiliza dropDatabase ni dropCollection (requieren permisos más altos).
// Una transacción evita un reset parcialmente aplicado si alguna operación falla.
const APP_COLLECTIONS = [
  'sessions', 'passwordResets', 'services', 'reservations',
  'employees', 'clients', 'users', 'rooms', 'schedules',
  'products', 'treatments', 'branches', 'media', 'counters',
];

async function resetAppData() {
  await inTransaction(async (session) => {
    for (const name of APP_COLLECTIONS) {
      await col(name).deleteMany({}, { session });
    }
  });
  console.log('[RESET] Registros de MySpa2 vaciados sin dropDatabase.');
  console.log('[RESET] No se tocó ninguna otra base de datos.');
}

try {
  if (config.databaseName !== 'myspa2') throw new Error('Base distinta a myspa2: operación cancelada.');
  if (reset && config.production) {
    throw new Error('Por seguridad, --reset está deshabilitado con NODE_ENV=production.');
  }
  // Validar las contraseñas de las cuentas de demostración antes de modificar Atlas.
  for (const person of [...employees, ...clients]) seedPassword(person);

  await connectDatabase();
  if (reset) await resetAppData();
  await ensureIndexes();

  const branchLookup = new Map();
  for (const branch of branches) {
    branchLookup.set(branch.name, await upsert('branches', { name: branch.name }, branch));
  }

  const roomLookup = new Map();
  for (const [name, description, branchName] of rooms) {
    const room = await upsert('rooms', { name }, {
      name, description, branchId: branchLookup.get(branchName).id,
      photoUrl: demoRoomPhotos[name],
      capacity: ['Sala Olivo', 'Sala Arena'].includes(name) ? 2 : 1,
    });
    await col('rooms').updateOne({ id: room.id, capacity: { $exists: false } }, {
      $set: { capacity: ['Sala Olivo', 'Sala Arena'].includes(name) ? 2 : 1 },
    });
    await col('rooms').updateOne({ id: room.id, $or: [
      { photoUrl: '' }, { photoUrl: null }, { photoUrl: { $exists: false } },
    ] }, { $set: { photoUrl: demoRoomPhotos[name] } });
    roomLookup.set(name, room);
  }

  const scheduleLookup = new Map();
  for (const [start, end] of schedules) {
    scheduleLookup.set(start, await upsert('schedules', { start, end }, { start, end }));
  }

  const productLookup = new Map();
  for (const [name, brand, usePrice] of products) {
    const product = await upsert('products', { name, brand }, { name, brand, usePrice, stock: 50, minStock: 5, trackStock: name !== 'Piedras calientes' });
    await col('products').updateOne({ id: product.id, stock: { $exists: false } }, { $set: { stock: 50, minStock: 5 } });
    await col('products').updateOne({ id: product.id, trackStock: { $exists: false } }, {
      $set: { trackStock: name !== 'Piedras calientes' },
    });
    productLookup.set(name, product);
  }

  const treatmentLookup = new Map();
  for (const [name, description] of treatments) {
    treatmentLookup.set(name, await upsert('treatments', { name }, { name, description }));
  }

  const defaultRecipes = {
    'Masaje de serenidad': [['Aceite de lavanda', 2], ['Aceite de almendras', 1]],
    'Ritual de aromaterapia': [['Esencia de eucalipto', 1]],
    'Facial de rocío': [['Sérum hidratante', 1], ['Tónico facial', 1]],
    'Exfoliación de sal': [['Exfoliante de sal marina', 1], ['Crema corporal de karité', 1]],
    'Masaje con piedras cálidas': [['Piedras calientes', 6], ['Aceite de almendras', 1]],
    'Ritual de jazmín': [['Aroma de jazmín', 1], ['Crema corporal de karité', 1]],
    'Envoltura de karité': [['Crema corporal de karité', 2]],
    'Facial de avena': [['Mascarilla de avena', 1], ['Gel calmante', 1]],
  };
  for (const [name, recipe] of Object.entries(defaultRecipes)) {
    const treatment = treatmentLookup.get(name);
    await col('treatments').updateOne({ id: treatment.id, defaultProducts: { $exists: false } }, {
      $set: { defaultProducts: recipe.map(([productName, quantity]) => ({
        productId: productLookup.get(productName).id, quantity,
      })) },
    });
  }

  const employeeLookup = new Map();
  for (const person of employees) {
    employeeLookup.set(person.username, await setupDemoUser(
      person, person.username === 'admin' ? 'ADMIN' : 'EMPLEADO', branchLookup.get(person.branchName).id,
    ));
  }

  const clientLookup = new Map();
  for (const person of clients) {
    clientLookup.set(person.username, await setupDemoUser(person, 'CLIENTE'));
  }

  const demoBookings = [
    { room: 'Sala Lavanda', day: 2, start: '10:15', status: 'PENDIENTE' },
    { room: 'Sala Bambú', day: -3, start: '11:30', status: 'ATENDIDA' },
    { room: 'Sala Arena', day: 5, start: '15:00', status: 'CANCELADA' },
  ];

  const client = clientLookup.get('jeypeeh');
  for (const booking of demoBookings) {
    const room = roomLookup.get(booking.room);
    const schedule = scheduleLookup.get(booking.start);
    const date = futureDate(booking.day);
    const slotKey = `${room.id}:${date}:${schedule.id}`;
    const demoKey = `jeypeeh:${booking.room}:${booking.start}:${booking.status}`;
    if (await col('reservations').findOne({ demoKey })) continue;
    // No sobrescribir reservas reales en ejecuciones idempotentes.
    if (await col('reservations').findOne({ slotKey })) continue;
    await col('reservations').insertOne({
      demoKey,
      id: await nextId('reservations'),
      clientId: client.id,
      roomId: room.id,
      branchId: room.branchId,
      scheduleId: schedule.id,
      date,
      start: schedule.start,
      end: schedule.end,
      startAt: spaInstant(date, schedule.start),
      endAt: spaInstant(date, schedule.end),
      slotKey,
      status: booking.status,
      partySize: 1,
      blocksSlot: booking.status !== 'CANCELADA',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Servicio de ejemplo para el reporte Maestro-Detalle (sucursal Jardines).
  const room = roomLookup.get('Sala Bambú');
  const attendedReservation = await col('reservations').findOne({
    roomId: room.id,
    clientId: client.id,
    date: futureDate(-3),
    scheduleId: scheduleLookup.get('11:30').id,
    status: 'ATENDIDA',
  });

  if (attendedReservation && !await col('services').findOne({ reservationId: attendedReservation.id })) {
    const treatmentLines = [
      { name: 'Masaje de serenidad', products: [['Aceite de lavanda', 2], ['Aceite de almendras', 1]] },
      { name: 'Ritual de aromaterapia', products: [['Esencia de eucalipto', 1]] },
    ].map((entry) => {
      const productsUsed = entry.products.map(([name, quantity]) => {
        const product = productLookup.get(name);
        return {
          productId: product.id, name: product.name, brand: product.brand,
          quantity, unitCost: product.usePrice,
          totalCost: quantity * product.usePrice,
        };
      });
      const treatment = treatmentLookup.get(entry.name);
      return {
        treatmentId: treatment.id,
        name: treatment.name,
        description: treatment.description,
        products: productsUsed,
        totalCost: productsUsed.reduce((sum, line) => sum + line.totalCost, 0),
      };
    });

    const employee = employeeLookup.get('empleado');
    await col('services').insertOne({
      id: await nextId('services'),
      reservationId: attendedReservation.id,
      branchId: room.branchId,
      roomId: room.id,
      roomName: room.name,
      clientId: client.id,
      clientName: `${client.name} ${client.lastName}`,
      employeeId: employee.id,
      employeeName: `${employee.name} ${employee.lastName}`,
      dateTime: attendedReservation.startAt,
      treatments: treatmentLines,
      totalCost: treatmentLines.reduce((sum, line) => sum + line.totalCost, 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log('[SEED] Completado: 1 administrador, 3 empleados, 4 clientes y catálogos de ejemplo.');
  console.log('[SEED] Contraseñas de prueba fijas: el seed solo almacena hashes bcrypt en MongoDB.');
  console.log('[SEED] Solo se utilizó la base de datos myspa2.');
} catch (error) {
  console.error('[SEED]', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
