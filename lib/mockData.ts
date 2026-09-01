export type CampusLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag: string;
  category: 'Academic' | 'Library' | 'Dining' | 'Sports' | 'Residential' | 'Health' | 'Admin' | 'Innovation';
  capacity: number;
  availability: 'Open' | 'Busy' | 'Booked';
  description?: string;
  openingHours?: string;
};

export type BookingItem = {
  id: string;
  title: string;
  room: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
  purpose: string;
  attendees: number;
};

/**
 * University of Zambia Main Campus Locations
 * Coordinates centered around UNZA's main campus in Lusaka
 * Campus center approximately: -15.39, 28.33
 */
export const campusLocations: CampusLocation[] = [
  // Academic Buildings
  {
    id: 'AC-001',
    name: 'Engineering Building',
    lat: -15.3932,
    lng: 28.3271,
    tag: 'Academic',
    category: 'Academic',
    capacity: 200,
    availability: 'Open',
    description: 'Engineering & Technology Department',
    openingHours: '7:00 AM - 6:00 PM',
  },
  {
    id: 'AC-002',
    name: 'School of Natural Sciences',
    lat: -15.3915,
    lng: 28.3292,
    tag: 'Academic',
    category: 'Academic',
    capacity: 180,
    availability: 'Open',
    description: 'Physics, Chemistry, Biology labs',
    openingHours: '7:00 AM - 6:00 PM',
  },
  {
    id: 'AC-003',
    name: 'School of Education',
    lat: -15.3908,
    lng: 28.3285,
    tag: 'Academic',
    category: 'Academic',
    capacity: 150,
    availability: 'Busy',
    description: 'Teacher training & education programs',
    openingHours: '7:00 AM - 5:30 PM',
  },
  {
    id: 'AC-004',
    name: 'School of Humanities',
    lat: -15.3945,
    lng: 28.3295,
    tag: 'Academic',
    category: 'Academic',
    capacity: 160,
    availability: 'Open',
    description: 'Languages, History, Philosophy departments',
    openingHours: '7:30 AM - 5:00 PM',
  },
  {
    id: 'AC-005',
    name: 'School of Social Sciences',
    lat: -15.3938,
    lng: 28.3278,
    tag: 'Academic',
    category: 'Academic',
    capacity: 170,
    availability: 'Open',
    description: 'Economics, Political Science, Sociology',
    openingHours: '7:30 AM - 5:30 PM',
  },

  // Libraries & Study Areas
  {
    id: 'LB-001',
    name: 'Main Library (Nkoloso)',
    lat: -15.3925,
    lng: 28.3285,
    tag: 'Study hub',
    category: 'Library',
    capacity: 350,
    availability: 'Open',
    description: 'Central library with 500K+ volumes',
    openingHours: '8:00 AM - 8:00 PM',
  },
  {
    id: 'LB-002',
    name: 'Science Library',
    lat: -15.3920,
    lng: 28.3298,
    tag: 'Study hub',
    category: 'Library',
    capacity: 120,
    availability: 'Open',
    description: 'Science & Engineering resources',
    openingHours: '8:00 AM - 7:00 PM',
  },
  {
    id: 'LB-003',
    name: 'Digital Learning Center',
    lat: -15.3935,
    lng: 28.3290,
    tag: 'Study hub',
    category: 'Library',
    capacity: 100,
    availability: 'Busy',
    description: 'Computer labs & digital resources',
    openingHours: '8:00 AM - 9:00 PM',
  },

  // Dining & Social
  {
    id: 'DN-001',
    name: 'Student Union Complex',
    lat: -15.3941,
    lng: 28.3262,
    tag: 'Social hub',
    category: 'Dining',
    capacity: 250,
    availability: 'Booked',
    description: 'Cafeteria, social events, meetings',
    openingHours: '6:30 AM - 9:00 PM',
  },
  {
    id: 'DN-002',
    name: 'Great Hall Cafeteria',
    lat: -15.3918,
    lng: 28.3275,
    tag: 'Social hub',
    category: 'Dining',
    capacity: 300,
    availability: 'Open',
    description: 'Main dining hall & events venue',
    openingHours: '7:00 AM - 8:00 PM',
  },
  {
    id: 'DN-003',
    name: 'Student Cafe',
    lat: -15.3912,
    lng: 28.3288,
    tag: 'Dining',
    category: 'Dining',
    capacity: 80,
    availability: 'Open',
    description: 'Coffee shop & light meals',
    openingHours: '8:00 AM - 6:00 PM',
  },

  // Lecture Theaters
  {
    id: 'LEC-001',
    name: 'Great Hall Lecture Theater',
    lat: -15.3918,
    lng: 28.3275,
    tag: 'Lecture hall',
    category: 'Academic',
    capacity: 400,
    availability: 'Busy',
    description: 'Large auditorium for convocations',
    openingHours: '7:00 AM - 6:00 PM',
  },
  {
    id: 'LEC-002',
    name: 'Science Theater Block A',
    lat: -15.3910,
    lng: 28.3300,
    tag: 'Lecture hall',
    category: 'Academic',
    capacity: 200,
    availability: 'Open',
    description: 'Science lectures & seminars',
    openingHours: '7:00 AM - 6:00 PM',
  },
  {
    id: 'LEC-003',
    name: 'Humanities Lecture Block',
    lat: -15.3945,
    lng: 28.3295,
    tag: 'Lecture hall',
    category: 'Academic',
    capacity: 150,
    availability: 'Open',
    description: 'Humanities classes & workshops',
    openingHours: '7:30 AM - 5:30 PM',
  },

  // Sports & Recreation
  {
    id: 'SP-001',
    name: 'Sport & Recreation Center',
    lat: -15.3950,
    lng: 28.3310,
    tag: 'Sports',
    category: 'Sports',
    capacity: 200,
    availability: 'Open',
    description: 'Gym, swimming pool, indoor sports',
    openingHours: '6:00 AM - 8:00 PM',
  },
  {
    id: 'SP-002',
    name: 'Football Stadium',
    lat: -15.3970,
    lng: 28.3320,
    tag: 'Sports',
    category: 'Sports',
    capacity: 5000,
    availability: 'Open',
    description: 'Main sports ground & stadium',
    openingHours: '6:00 AM - 6:00 PM',
  },
  {
    id: 'SP-003',
    name: 'Tennis Courts',
    lat: -15.3955,
    lng: 28.3305,
    tag: 'Sports',
    category: 'Sports',
    capacity: 100,
    availability: 'Open',
    description: '6 professional tennis courts',
    openingHours: '6:00 AM - 7:00 PM',
  },

  // Health Services
  {
    id: 'HS-001',
    name: 'Student Health Center',
    lat: -15.3925,
    lng: 28.3310,
    tag: 'Health',
    category: 'Health',
    capacity: 50,
    availability: 'Open',
    description: 'Medical clinic & counseling services',
    openingHours: '8:00 AM - 5:00 PM',
  },
  {
    id: 'HS-002',
    name: 'Dental Clinic',
    lat: -15.3928,
    lng: 28.3312,
    tag: 'Health',
    category: 'Health',
    capacity: 30,
    availability: 'Open',
    description: 'Dental services & consultation',
    openingHours: '8:00 AM - 4:00 PM',
  },

  // Innovation & Research
  {
    id: 'IN-001',
    name: 'Innovation Center',
    lat: -15.3908,
    lng: 28.3306,
    tag: 'Innovation hub',
    category: 'Innovation',
    capacity: 120,
    availability: 'Open',
    description: 'Tech hub, startup incubation, research labs',
    openingHours: '8:00 AM - 8:00 PM',
  },
  {
    id: 'IN-002',
    name: 'Research Center',
    lat: -15.3935,
    lng: 28.3271,
    tag: 'Research',
    category: 'Innovation',
    capacity: 100,
    availability: 'Open',
    description: 'Advanced research facilities',
    openingHours: '8:00 AM - 6:00 PM',
  },

  // Administrative Buildings
  {
    id: 'AD-001',
    name: 'Main Administration Block',
    lat: -15.3905,
    lng: 28.3265,
    tag: 'Admin',
    category: 'Admin',
    capacity: 80,
    availability: 'Open',
    description: 'Registrar, financial aid, student services',
    openingHours: '8:00 AM - 4:30 PM',
  },
  {
    id: 'AD-002',
    name: 'Student Services Building',
    lat: -15.3922,
    lng: 28.3268,
    tag: 'Admin',
    category: 'Admin',
    capacity: 60,
    availability: 'Open',
    description: 'Student affairs & admissions',
    openingHours: '8:00 AM - 5:00 PM',
  },

  // Residential Areas
  {
    id: 'RS-001',
    name: 'Halls of Residence - Block A',
    lat: -15.3975,
    lng: 28.3250,
    tag: 'Residential',
    category: 'Residential',
    capacity: 500,
    availability: 'Open',
    description: 'Student accommodation',
    openingHours: '24/7',
  },
  {
    id: 'RS-002',
    name: 'Halls of Residence - Block B',
    lat: -15.3980,
    lng: 28.3265,
    tag: 'Residential',
    category: 'Residential',
    capacity: 450,
    availability: 'Open',
    description: 'Student accommodation',
    openingHours: '24/7',
  },
];

export const bookingItems: BookingItem[] = [
  {
    id: 'bk-101',
    title: 'Design Studio',
    room: 'Innovation Center - Studio 2',
    date: '2026-08-21',
    time: '09:00 AM - 10:30 AM',
    status: 'Confirmed',
    purpose: 'UX workshop and critique',
    attendees: 14,
  },
  {
    id: 'bk-102',
    title: 'Research Presentation',
    room: 'Science Theater Block A',
    date: '2026-08-21',
    time: '11:30 AM - 12:30 PM',
    status: 'Pending',
    purpose: 'Faculty research review',
    attendees: 35,
  },
  {
    id: 'bk-103',
    title: 'Project Sync',
    room: 'Innovation Center',
    date: '2026-08-21',
    time: '02:15 PM - 03:00 PM',
    status: 'Completed',
    purpose: 'Product planning meeting',
    attendees: 8,
  },
];
