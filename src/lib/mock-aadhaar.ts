export interface AadhaarProfile {
  name: string;
  dob: string;
  gender: 'M' | 'F';
  address: string;
  maskedAadhaar: string;
  photo: string; // inline SVG data URI
}

// Generate simple colored SVG avatar data URLs for the profiles
const generateAvatar = (name: string, bg: string, fg: string = '#FFFFFF') => {
  const initial = name.charAt(0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="bold" font-size="45" fill="${fg}">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const mockAadhaarDb: Record<string, AadhaarProfile> = {
  "123456789012": {
    name: "Aarav Sharma",
    dob: "1990-05-15",
    gender: "M",
    address: "123, Sector 4, Dwarka, New Delhi - 110075",
    maskedAadhaar: "XXXX XXXX 9012",
    photo: generateAvatar("Aarav Sharma", "#5341cd")
  },
  "987654321098": {
    name: "Priya Patel",
    dob: "1993-08-22",
    gender: "F",
    address: "A-402, Shanti Heights, SG Highway, Ahmedabad, Gujarat - 380054",
    maskedAadhaar: "XXXX XXXX 1098",
    photo: generateAvatar("Priya Patel", "#6c5ce7")
  },
  "111122223333": {
    name: "Rahul Verma",
    dob: "1985-11-30",
    gender: "M",
    address: "Flat 12B, Block C, Green Glen Layout, Bellandur, Bengaluru, Karnataka - 560103",
    maskedAadhaar: "XXXX XXXX 3333",
    photo: generateAvatar("Rahul Verma", "#726d8e")
  },
  "444455556666": {
    name: "Ananya Das",
    dob: "1995-04-12",
    gender: "F",
    address: "15/3, Gariahat Road, Ballygunge, Kolkata, West Bengal - 700019",
    maskedAadhaar: "XXXX XXXX 6666",
    photo: generateAvatar("Ananya Das", "#ba1a1a")
  },
  "777788889999": {
    name: "Amit Joshi",
    dob: "1988-02-28",
    gender: "M",
    address: "Flat 204, Rosewood Apartments, Baner, Pune, Maharashtra - 411045",
    maskedAadhaar: "XXXX XXXX 9999",
    photo: generateAvatar("Amit Joshi", "#5847d2")
  }
};

export function getAadhaarProfile(aadhaarNumber: string): AadhaarProfile | null {
  // Strip spaces for lookup
  const cleanNum = aadhaarNumber.replace(/\s/g, "");
  return mockAadhaarDb[cleanNum] || null;
}
