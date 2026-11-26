export interface User {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  password?: string;
  role: string;
  avatarUrl?: string;
  phoneNumber?: string;
  phone?: string;
  status: string;
  performanceScore?: number;
  must_change_password?: boolean;
  lga?: string;
  ward?: string;
  pollingUnit?: string;
  polling_unit_id?: string;
  polling_unit_name?: string;
  zone_code?: string;
  zone_name?: string;
  constituency_code?: string;
  constituency_name?: string;
  lga_list?: string[];
  organization_id?: string;
}

export const MOCK_USERS: User[] = [
  // ==========================================
  // 1. SUPER ADMIN (State Central Command)
  // ==========================================
  {
    id: 'USR-001',
    name: 'David Audu',
    full_name: 'David Audu',
    email: 'admin@kogicms.ng',
    password: 'password123',
    role: 'super_admin',
    avatarUrl: 'https://ui-avatars.com/api/?name=David+Audu&background=006b3f&color=fff',
    phoneNumber: '08031234567',
    status: 'active',
    performanceScore: 98,
    must_change_password: false
  },

  // ==========================================
  // 2. SENATORIAL DISTRICTS (3 KOGI SENATORS)
  // ==========================================
  {
    id: 'USR-SEN-CENTRAL',
    name: 'Hon. Senator (Kogi Central)',
    full_name: 'Hon. Senator (Kogi Central)',
    email: 'senate.central@kogicms.ng',
    password: '123456',
    role: 'senatorial_leader',
    zone_code: 'KGI-CENTRAL',
    zone_name: 'Kogi Central Senatorial District',
    lga_list: ['Adavi', 'Ajaokuta', 'Ogori/Magongo', 'Okehi', 'Okene'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Kogi+Central+Senator&background=006600&color=fff',
    phoneNumber: '08031000001',
    status: 'active',
    performanceScore: 95,
    must_change_password: false
  },
  {
    id: 'USR-SEN-EAST',
    name: 'Hon. Senator (Kogi East)',
    full_name: 'Hon. Senator (Kogi East)',
    email: 'senate.east@kogicms.ng',
    password: '123456',
    role: 'senatorial_leader',
    zone_code: 'KGI-EAST',
    zone_name: 'Kogi East Senatorial District',
    lga_list: ['Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela-Odolu', 'Ofu', 'Olamaboro', 'Omala'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Kogi+East+Senator&background=003399&color=fff',
    phoneNumber: '08031000002',
    status: 'active',
    performanceScore: 94,
    must_change_password: false
  },
  {
    id: 'USR-SEN-WEST',
    name: 'Hon. Senator (Kogi West)',
    full_name: 'Hon. Senator (Kogi West)',
    email: 'senate.west@kogicms.ng',
    password: '123456',
    role: 'senatorial_leader',
    zone_code: 'KGI-WEST',
    zone_name: 'Kogi West Senatorial District',
    lga_list: ['Ijumu', 'Kabba/Bunu', 'Kogi (Koton Karfe)', 'Lokoja', 'Mopa-Muro', 'Yagba East', 'Yagba West'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Kogi+West+Senator&background=8B0000&color=fff',
    phoneNumber: '08031000003',
    status: 'active',
    performanceScore: 96,
    must_change_password: false
  },

  // ==========================================
  // 3. HOUSE OF REPRESENTATIVES (9 FEDERAL REPS)
  // ==========================================
  {
    id: 'USR-REP-01',
    name: 'Hon. Rep (Adavi/Okehi)',
    full_name: 'Hon. Rep (Adavi/Okehi)',
    email: 'rep.adavi.okehi@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-ADAVI-OKEHI',
    constituency_name: 'Adavi/Okehi Federal Constituency',
    lga_list: ['Adavi', 'Okehi'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Adavi+Okehi+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000001',
    status: 'active',
    performanceScore: 91,
    must_change_password: false
  },
  {
    id: 'USR-REP-02',
    name: 'Hon. Rep (Ajaokuta)',
    full_name: 'Hon. Rep (Ajaokuta)',
    email: 'rep.ajaokuta@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-AJAOKUTA',
    constituency_name: 'Ajaokuta Federal Constituency',
    lga_list: ['Ajaokuta'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Ajaokuta+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000002',
    status: 'active',
    performanceScore: 90,
    must_change_password: false
  },
  {
    id: 'USR-REP-03',
    name: 'Hon. Rep (Ankpa/Omala/Olamaboro)',
    full_name: 'Hon. Rep (Ankpa/Omala/Olamaboro)',
    email: 'rep.ankpa@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-ANKPA-OMALA-OLAMABORO',
    constituency_name: 'Ankpa/Omala/Olamaboro Federal Constituency',
    lga_list: ['Ankpa', 'Omala', 'Olamaboro'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Ankpa+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000003',
    status: 'active',
    performanceScore: 93,
    must_change_password: false
  },
  {
    id: 'USR-REP-04',
    name: 'Hon. Rep (Bassa/Dekina)',
    full_name: 'Hon. Rep (Bassa/Dekina)',
    email: 'rep.bassa.dekina@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-BASSA-DEKINA',
    constituency_name: 'Bassa/Dekina Federal Constituency',
    lga_list: ['Bassa', 'Dekina'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Bassa+Dekina+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000004',
    status: 'active',
    performanceScore: 89,
    must_change_password: false
  },
  {
    id: 'USR-REP-05',
    name: 'Hon. Rep (Idah/Ibaji/Igalamela/Ofu)',
    full_name: 'Hon. Rep (Idah/Ibaji/Igalamela/Ofu)',
    email: 'rep.idah.federal@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-IDAH-IBAJI-OFU',
    constituency_name: 'Idah/Ibaji/Igalamela-Odolu/Ofu Federal Constituency',
    lga_list: ['Idah', 'Ibaji', 'Igalamela-Odolu', 'Ofu'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Idah+Federal+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000005',
    status: 'active',
    performanceScore: 92,
    must_change_password: false
  },
  {
    id: 'USR-REP-06',
    name: 'Hon. Rep (Kabba-Bunu/Ijumu)',
    full_name: 'Hon. Rep (Kabba-Bunu/Ijumu)',
    email: 'rep.kabba.ijumu@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-KABBA-IJUMU',
    constituency_name: 'Kabba-Bunu/Ijumu Federal Constituency',
    lga_list: ['Kabba/Bunu', 'Ijumu'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Kabba+Ijumu+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000006',
    status: 'active',
    performanceScore: 94,
    must_change_password: false
  },
  {
    id: 'USR-REP-07',
    name: 'Hon. Rep (Lokoja/Kogi KK)',
    full_name: 'Hon. Rep (Lokoja/Kogi KK)',
    email: 'rep.lokoja.kogi@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-LOKOJA-KOGI',
    constituency_name: 'Lokoja/Kogi (Koton Karfe) Federal Constituency',
    lga_list: ['Lokoja', 'Kogi (Koton Karfe)'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Lokoja+Kogi+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000007',
    status: 'active',
    performanceScore: 97,
    must_change_password: false
  },
  {
    id: 'USR-REP-08',
    name: 'Hon. Rep (Okene/Ogori-Magongo)',
    full_name: 'Hon. Rep (Okene/Ogori-Magongo)',
    email: 'rep.okene.ogori@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-OKENE-OGORI',
    constituency_name: 'Okene/Ogori-Magongo Federal Constituency',
    lga_list: ['Okene', 'Ogori/Magongo'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Okene+Ogori+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000008',
    status: 'active',
    performanceScore: 95,
    must_change_password: false
  },
  {
    id: 'USR-REP-09',
    name: 'Hon. Rep (Yagba East/West/Mopamuro)',
    full_name: 'Hon. Rep (Yagba East/West/Mopamuro)',
    email: 'rep.yagba.mopamuro@kogicms.ng',
    password: '123456',
    role: 'federal_rep',
    constituency_code: 'FED-YAGBA-MOPAMURO',
    constituency_name: 'Yagba East/Yagba West/Mopa-Muro Federal Constituency',
    lga_list: ['Yagba East', 'Yagba West', 'Mopa-Muro'],
    avatarUrl: 'https://ui-avatars.com/api/?name=Yagba+Rep&background=dc2626&color=fff',
    phoneNumber: '08032000009',
    status: 'active',
    performanceScore: 93,
    must_change_password: false
  },

  // ==========================================
  // 4. ALL 21 LGA CHAIRMEN (KOGI STATE)
  // ==========================================
  {
    id: 'USR-LGA-01',
    name: 'Lokoja LGA Chairman',
    full_name: 'Hon. Chairman (Lokoja LGA)',
    email: 'chair.lokoja@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Lokoja',
    avatarUrl: 'https://ui-avatars.com/api/?name=Lokoja+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887701',
    status: 'active',
    performanceScore: 94,
    must_change_password: false
  },
  {
    id: 'USR-LGA-02',
    name: 'Adavi LGA Chairman',
    full_name: 'Hon. Chairman (Adavi LGA)',
    email: 'chair.adavi@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Adavi',
    avatarUrl: 'https://ui-avatars.com/api/?name=Adavi+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887702',
    status: 'active',
    performanceScore: 92,
    must_change_password: false
  },
  {
    id: 'USR-LGA-03',
    name: 'Ajaokuta LGA Chairman',
    full_name: 'Hon. Chairman (Ajaokuta LGA)',
    email: 'chair.ajaokuta@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Ajaokuta',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ajaokuta+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887703',
    status: 'active',
    performanceScore: 90,
    must_change_password: false
  },
  {
    id: 'USR-LGA-04',
    name: 'Ankpa LGA Chairman',
    full_name: 'Hon. Chairman (Ankpa LGA)',
    email: 'chair.ankpa@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Ankpa',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ankpa+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887704',
    status: 'active',
    performanceScore: 95,
    must_change_password: false
  },
  {
    id: 'USR-LGA-05',
    name: 'Bassa LGA Chairman',
    full_name: 'Hon. Chairman (Bassa LGA)',
    email: 'chair.bassa@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Bassa',
    avatarUrl: 'https://ui-avatars.com/api/?name=Bassa+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887705',
    status: 'active',
    performanceScore: 89,
    must_change_password: false
  },
  {
    id: 'USR-LGA-06',
    name: 'Dekina LGA Chairman',
    full_name: 'Hon. Chairman (Dekina LGA)',
    email: 'chair.dekina@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Dekina',
    avatarUrl: 'https://ui-avatars.com/api/?name=Dekina+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887706',
    status: 'active',
    performanceScore: 93,
    must_change_password: false
  },
  {
    id: 'USR-LGA-07',
    name: 'Ibaji LGA Chairman',
    full_name: 'Hon. Chairman (Ibaji LGA)',
    email: 'chair.ibaji@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Ibaji',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ibaji+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887707',
    status: 'active',
    performanceScore: 91,
    must_change_password: false
  },
  {
    id: 'USR-LGA-08',
    name: 'Idah LGA Chairman',
    full_name: 'Hon. Chairman (Idah LGA)',
    email: 'chair.idah@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Idah',
    avatarUrl: 'https://ui-avatars.com/api/?name=Idah+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887708',
    status: 'active',
    performanceScore: 94,
    must_change_password: false
  },
  {
    id: 'USR-LGA-09',
    name: 'Igalamela-Odolu LGA Chairman',
    full_name: 'Hon. Chairman (Igalamela-Odolu LGA)',
    email: 'chair.igalamela@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Igalamela-Odolu',
    avatarUrl: 'https://ui-avatars.com/api/?name=Igalamela+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887709',
    status: 'active',
    performanceScore: 90,
    must_change_password: false
  },
  {
    id: 'USR-LGA-10',
    name: 'Ijumu LGA Chairman',
    full_name: 'Hon. Chairman (Ijumu LGA)',
    email: 'chair.ijumu@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Ijumu',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ijumu+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887710',
    status: 'active',
    performanceScore: 92,
    must_change_password: false
  },
  {
    id: 'USR-LGA-11',
    name: 'Kabba/Bunu LGA Chairman',
    full_name: 'Hon. Chairman (Kabba/Bunu LGA)',
    email: 'chair.kabba@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Kabba/Bunu',
    avatarUrl: 'https://ui-avatars.com/api/?name=Kabba+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887711',
    status: 'active',
    performanceScore: 93,
    must_change_password: false
  },
  {
    id: 'USR-LGA-12',
    name: 'Kogi (Koton Karfe) LGA Chairman',
    full_name: 'Hon. Chairman (Kogi Koton Karfe LGA)',
    email: 'chair.kogi@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Kogi (Koton Karfe)',
    avatarUrl: 'https://ui-avatars.com/api/?name=Kogi+KK+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887712',
    status: 'active',
    performanceScore: 91,
    must_change_password: false
  },
  {
    id: 'USR-LGA-13',
    name: 'Mopa-Muro LGA Chairman',
    full_name: 'Hon. Chairman (Mopa-Muro LGA)',
    email: 'chair.mopamuro@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Mopa-Muro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Mopa+Muro+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887713',
    status: 'active',
    performanceScore: 89,
    must_change_password: false
  },
  {
    id: 'USR-LGA-14',
    name: 'Ofu LGA Chairman',
    full_name: 'Hon. Chairman (Ofu LGA)',
    email: 'chair.ofu@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Ofu',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ofu+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887714',
    status: 'active',
    performanceScore: 92,
    must_change_password: false
  },
  {
    id: 'USR-LGA-15',
    name: 'Ogori/Magongo LGA Chairman',
    full_name: 'Hon. Chairman (Ogori/Magongo LGA)',
    email: 'chair.ogorimagongo@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Ogori/Magongo',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ogori+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887715',
    status: 'active',
    performanceScore: 90,
    must_change_password: false
  },
  {
    id: 'USR-LGA-16',
    name: 'Okehi LGA Chairman',
    full_name: 'Hon. Chairman (Okehi LGA)',
    email: 'chair.okehi@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Okehi',
    avatarUrl: 'https://ui-avatars.com/api/?name=Okehi+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887716',
    status: 'active',
    performanceScore: 93,
    must_change_password: false
  },
  {
    id: 'USR-LGA-17',
    name: 'Okene LGA Chairman',
    full_name: 'Hon. Chairman (Okene LGA)',
    email: 'chair.okene@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Okene',
    avatarUrl: 'https://ui-avatars.com/api/?name=Okene+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887717',
    status: 'active',
    performanceScore: 96,
    must_change_password: false
  },
  {
    id: 'USR-LGA-18',
    name: 'Olamaboro LGA Chairman',
    full_name: 'Hon. Chairman (Olamaboro LGA)',
    email: 'chair.olamaboro@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Olamaboro',
    avatarUrl: 'https://ui-avatars.com/api/?name=Olamaboro+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887718',
    status: 'active',
    performanceScore: 91,
    must_change_password: false
  },
  {
    id: 'USR-LGA-19',
    name: 'Omala LGA Chairman',
    full_name: 'Hon. Chairman (Omala LGA)',
    email: 'chair.omala@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Omala',
    avatarUrl: 'https://ui-avatars.com/api/?name=Omala+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887719',
    status: 'active',
    performanceScore: 90,
    must_change_password: false
  },
  {
    id: 'USR-LGA-20',
    name: 'Yagba East LGA Chairman',
    full_name: 'Hon. Chairman (Yagba East LGA)',
    email: 'chair.yagbaeast@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Yagba East',
    avatarUrl: 'https://ui-avatars.com/api/?name=Yagba+East+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887720',
    status: 'active',
    performanceScore: 92,
    must_change_password: false
  },
  {
    id: 'USR-LGA-21',
    name: 'Yagba West LGA Chairman',
    full_name: 'Hon. Chairman (Yagba West LGA)',
    email: 'chair.yagbawest@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Yagba West',
    avatarUrl: 'https://ui-avatars.com/api/?name=Yagba+West+Chairman&background=006b3f&color=fff',
    phoneNumber: '08099887721',
    status: 'active',
    performanceScore: 93,
    must_change_password: false
  },

  // ==========================================
  // 5. HOUSE OF ASSEMBLY (STATE LEGISLATURE)
  // ==========================================
  {
    id: 'USR-HOA-01',
    name: 'Hon. Member (Lokoja I State Constituency)',
    full_name: 'Hon. Member (Kogi State House of Assembly)',
    email: 'assembly.lokoja@kogicms.ng',
    password: '123456',
    role: 'house_assembly_member',
    constituency_name: 'Lokoja I State Constituency',
    lga: 'Lokoja',
    avatarUrl: 'https://ui-avatars.com/api/?name=Assembly+Member&background=1e293b&color=fff',
    phoneNumber: '08033445566',
    status: 'active',
    performanceScore: 93,
    must_change_password: false
  },

  // ==========================================
  // 6. WARD COUNCILLORS / WARD CHAIRMEN
  // ==========================================
  {
    id: 'USR-WARD-01',
    name: 'Hon. Councillor (Eggan Ward)',
    full_name: 'Hon. Councillor (Eggan Ward)',
    email: 'councillor.lokoja@kogicms.ng',
    password: 'password123',
    role: 'councillor',
    lga: 'Lokoja',
    ward: 'Eggan',
    avatarUrl: 'https://ui-avatars.com/api/?name=Councillor+Lokoja&background=0284c7&color=fff',
    phoneNumber: '08123456788',
    status: 'active',
    performanceScore: 95,
    must_change_password: false
  },
  {
    id: 'USR-WARD-02',
    name: 'Yakubu Jimoh',
    full_name: 'Hon. Councillor (Bariki Ward)',
    email: 'ward.okene@kogicms.ng',
    password: 'password123',
    role: 'councillor',
    lga: 'Okene',
    ward: 'Bariki',
    avatarUrl: 'https://ui-avatars.com/api/?name=Yakubu+Jimoh&background=0284c7&color=fff',
    phoneNumber: '08123456789',
    status: 'active',
    performanceScore: 95,
    must_change_password: false
  },

  // ==========================================
  // 7. POLLING UNIT FIELD AGENTS
  // ==========================================
  {
    id: 'USR-PU-01',
    name: 'Grace Onoja',
    full_name: 'Grace Onoja',
    email: 'agent.pu001@kogicms.ng',
    password: 'password123',
    role: 'polling_unit_agent',
    lga: 'Lokoja',
    ward: 'Eggan',
    polling_unit_id: 'LOKOJA-W10-PU001',
    polling_unit_name: 'Eggan Tifain Area LGEA Sch Eggan',
    avatarUrl: 'https://ui-avatars.com/api/?name=Grace+Onoja&background=475569&color=fff',
    phoneNumber: '07055443322',
    status: 'active',
    performanceScore: 100,
    must_change_password: false
  },
  {
    id: 'USR-PU-02',
    name: 'Suleiman Ibrahim',
    full_name: 'Suleiman Ibrahim',
    email: 'agent.pu002@kogicms.ng',
    password: 'password123',
    role: 'polling_unit_agent',
    lga: 'Adavi',
    ward: 'Adavi-Eba',
    polling_unit_id: 'ADAVI-W01-PU002',
    polling_unit_name: 'PU 002 - Health Center',
    avatarUrl: 'https://ui-avatars.com/api/?name=Suleiman+Ibrahim&background=475569&color=fff',
    phoneNumber: '08011223344',
    status: 'active',
    performanceScore: 92,
    must_change_password: false
  },
  {
    id: 'USR-PU-03',
    name: 'Polling Unit Agent',
    full_name: 'Grace Onoja (PU Field Agent)',
    email: 'pollingunit@gmail.com',
    password: '123456',
    role: 'polling_unit_agent',
    lga: 'Lokoja',
    ward: 'Eggan',
    polling_unit_id: 'LOKOJA-W10-PU001',
    polling_unit_name: 'Eggan Tifain Area LGEA Sch Eggan',
    avatarUrl: 'https://ui-avatars.com/api/?name=Polling+Unit&background=009A44&color=fff',
    phoneNumber: '07055443322',
    status: 'active',
    performanceScore: 100,
    must_change_password: false
  },

  // ==========================================
  // 8. STUDENT & YOUTH MOBILIZER
  // ==========================================
  {
    id: 'USR-STUDENT-01',
    name: 'Kogi Student Mobilizer',
    full_name: 'Kogi State Student Mobilizer',
    email: 'student@kogicms.ng',
    password: 'password123',
    role: 'student',
    avatarUrl: 'https://ui-avatars.com/api/?name=Student+Mobilizer&background=2563eb&color=fff',
    phoneNumber: '08055667788',
    status: 'active',
    performanceScore: 96,
    must_change_password: false
  }
];
