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
        name: 'David Audu',
        email: 'admin@kogicms.ng',
        role: 'admin',
        avatarUrl: 'https://ui-avatars.com/api/?name=David+Audu&background=006b3f&color=fff',
        phoneNumber: '08031234567',
        status: 'active',
        performanceScore: 98
    },
    {
        id: 'USR-LGA-01',
        name: 'Salihu Mohammed',
        email: 'chair.lokoja@kogicms.ng',
        role: 'lga_chairman',
        lga: 'Lokoja',
        avatarUrl: 'https://ui-avatars.com/api/?name=Salihu+Mohammed&background=1e293b&color=fff',
        phoneNumber: '08099887766',
        status: 'active',
        performanceScore: 92
    },
    {
        id: 'USR-LGA-02',
        name: 'Emmanuel Adeyemi',
        email: 'chair.kabba@kogicms.ng',
        role: 'lga_chairman',
        lga: 'Kabba/Bunu',
        avatarUrl: 'https://ui-avatars.com/api/?name=Emmanuel+Adeyemi&background=1e293b&color=fff',
        phoneNumber: '08022334455',
        status: 'active',
        performanceScore: 88
    },
    {
        id: 'USR-WARD-01',
        name: 'Yakubu Jimoh',
        email: 'ward.okene@kogicms.ng',
        role: 'ward_chairman',
        lga: 'Okene',
        ward: 'Bariki',
        avatarUrl: 'https://ui-avatars.com/api/?name=Yakubu+Jimoh&background=0284c7&color=fff',
        phoneNumber: '08123456789',
        status: 'active',
        performanceScore: 95
    },
    {
        id: 'USR-PU-01',
        name: 'Grace Onoja',
        email: 'agent.pu001@kogicms.ng',
        role: 'polling_unit_agent',
        lga: 'Ankpa',
        ward: 'Ankpa I',
        pollingUnit: 'PU 001 - Open Space Near Market',
        avatarUrl: 'https://ui-avatars.com/api/?name=Grace+Onoja&background=475569&color=fff',
        phoneNumber: '07055443322',
        status: 'active',
        performanceScore: 100
    },
    {
        id: 'USR-PU-02',
        name: 'Suleiman Ibrahim',
        email: 'agent.pu002@kogicms.ng',
        role: 'polling_unit_agent',
        lga: 'Adavi',
        ward: 'Adavi-Eba',
        pollingUnit: 'PU 002 - Health Center',
        avatarUrl: 'https://ui-avatars.com/api/?name=Suleiman+Ibrahim&background=475569&color=fff',
        phoneNumber: '08011223344',
        status: 'suspended',
        performanceScore: 45
    }
];
