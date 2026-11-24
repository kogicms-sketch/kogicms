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
  zone_code?: string;
  zone_name?: string;
  constituency_code?: string;
  constituency_name?: string;
  lga_list?: string[];
}

export const MOCK_USERS: User[] = [
  // Super Admin
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
  // 3 SENATORIAL DISTRICTS (KOGI STATE)
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
  },

  // ==========================================
  // 9 FEDERAL CONSTITUENCIES (HOUSE OF REPS)
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
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
    must_change_password: true
  },

  // LGA Chairmen & Other Mock Users
  {
    id: 'USR-LGA-01',
    name: 'Salihu Mohammed',
    full_name: 'Salihu Mohammed',
    email: 'chair.lokoja@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Lokoja',
    avatarUrl: 'https://ui-avatars.com/api/?name=Salihu+Mohammed&background=1e293b&color=fff',
    phoneNumber: '08099887766',
    status: 'active',
    performanceScore: 92,
    must_change_password: false
  },
  {
    id: 'USR-LGA-02',
    name: 'Emmanuel Adeyemi',
    full_name: 'Emmanuel Adeyemi',
    email: 'chair.kabba@kogicms.ng',
    password: 'password123',
    role: 'lga_chairman',
    lga: 'Kabba/Bunu',
    avatarUrl: 'https://ui-avatars.com/api/?name=Emmanuel+Adeyemi&background=1e293b&color=fff',
    phoneNumber: '08022334455',
    status: 'active',
    performanceScore: 88,
    must_change_password: false
  },
  {
    id: 'USR-WARD-01',
    name: 'Yakubu Jimoh',
    full_name: 'Yakubu Jimoh',
    email: 'ward.okene@kogicms.ng',
    password: 'password123',
    role: 'ward_chairman',
    lga: 'Okene',
    ward: 'Bariki',
    avatarUrl: 'https://ui-avatars.com/api/?name=Yakubu+Jimoh&background=0284c7&color=fff',
    phoneNumber: '08123456789',
    status: 'active',
    performanceScore: 95,
    must_change_password: false
  },
  {
    id: 'USR-PU-01',
    name: 'Grace Onoja',
    full_name: 'Grace Onoja',
    email: 'agent.pu001@kogicms.ng',
    password: 'password123',
    role: 'polling_unit_agent',
    lga: 'Ankpa',
    ward: 'Ankpa I',
    pollingUnit: 'PU 001 - Open Space Near Market',
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
    pollingUnit: 'PU 002 - Health Center',
    avatarUrl: 'https://ui-avatars.com/api/?name=Suleiman+Ibrahim&background=475569&color=fff',
    phoneNumber: '08011223344',
    status: 'suspended',
    performanceScore: 45,
    must_change_password: false
  }
];
