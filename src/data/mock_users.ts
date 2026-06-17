interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  phoneNumber: string;
  status: string;
  performanceScore: number;
  lga?: string;
  ward?: string;
  pollingUnit?: string;
}

export const MOCK_USERS: User[] = [
    {
        id: 'USR-001',
        name: 'Aminu Kano',
        email: 'admin@katsina.gov.ng',
        role: 'admin',
        avatarUrl: 'https://ui-avatars.com/api/?name=Aminu+Kano&background=006b3f&color=fff',
        phoneNumber: '08031234567',
        status: 'active',
        performanceScore: 98
    },
    {
        id: 'USR-LGA-01',
        name: 'Bello Masari',
        email: 'chair.bakori@katsina.gov.ng',
        role: 'lga_chairman',
        lga: 'Bakori',
        avatarUrl: 'https://ui-avatars.com/api/?name=Bello+Masari&background=1e293b&color=fff',
        phoneNumber: '08099887766',
        status: 'active',
        performanceScore: 92
    },
    {
        id: 'USR-LGA-02',
        name: 'Kabiru Gaya',
        email: 'chair.funtua@katsina.gov.ng',
        role: 'lga_chairman',
        lga: 'Funtua',
        avatarUrl: 'https://ui-avatars.com/api/?name=Kabiru+Gaya&background=1e293b&color=fff',
        phoneNumber: '08022334455',
        status: 'active',
        performanceScore: 88
    },
    {
        id: 'USR-WARD-01',
        name: 'Musa Yaradua',
        email: 'ward.tsiga@katsina.gov.ng',
        role: 'ward_chairman',
        lga: 'Bakori',
        ward: 'Tsiga',
        avatarUrl: 'https://ui-avatars.com/api/?name=Musa+Yaradua&background=0284c7&color=fff',
        phoneNumber: '08123456789',
        status: 'active',
        performanceScore: 95
    },
    {
        id: 'USR-PU-01',
        name: 'Sani Abacha',
        email: 'agent.pu001@katsina.gov.ng',
        role: 'polling_unit_agent',
        lga: 'Bakori',
        ward: 'Tsiga',
        pollingUnit: 'PU 001 - Pri Sch',
        avatarUrl: 'https://ui-avatars.com/api/?name=Sani+Abacha&background=475569&color=fff',
        phoneNumber: '07055443322',
        status: 'active',
        performanceScore: 100
    },
    {
        id: 'USR-PU-02',
        name: 'Ahmed Dingle',
        email: 'agent.pu002@katsina.gov.ng',
        role: 'polling_unit_agent',
        lga: 'Bakori',
        ward: 'Tsiga',
        pollingUnit: 'PU 002 - Health Center',
        avatarUrl: 'https://ui-avatars.com/api/?name=Ahmed+Dingle&background=475569&color=fff',
        phoneNumber: '08011223344',
        status: 'suspended',
        performanceScore: 45
    }
];
