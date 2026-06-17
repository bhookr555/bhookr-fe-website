/**
 * Approximate lat/long for ~80 Hyderabad-area pincodes.
 * Coordinates are area centroids; pins indicate the neighbourhood, not the
 * exact house. Unknown pincodes fall back to Hyderabad city centre.
 */

export interface PincodeLocation {
  pincode: string;
  area: string;
  lat: number;
  lng: number;
}

export const HYDERABAD_CENTER: { lat: number; lng: number } = {
  lat: 17.385,
  lng: 78.4867,
};

const RAW: Record<string, [string, number, number]> = {
  "500001": ["Abids", 17.3933, 78.4747],
  "500002": ["Bazarghat", 17.375, 78.4583],
  "500003": ["Secunderabad", 17.4399, 78.4983],
  "500004": ["Khairtabad", 17.414, 78.4564],
  "500006": ["Saifabad", 17.4056, 78.4694],
  "500007": ["Adikmet", 17.4011, 78.5158],
  "500008": ["Tirumalgherry", 17.4647, 78.5044],
  "500009": ["Bowenpally", 17.4778, 78.4928],
  "500010": ["Trimulgherry", 17.4753, 78.5167],
  "500011": ["Begumpet", 17.4452, 78.4602],
  "500012": ["Ramnagar", 17.4231, 78.4983],
  "500013": ["Boudh Nagar", 17.3756, 78.5117],
  "500015": ["HMT Nagar", 17.4844, 78.4708],
  "500016": ["Begumpet", 17.4452, 78.4602],
  "500017": ["Sanath Nagar", 17.4516, 78.4421],
  "500018": ["Borabanda", 17.4528, 78.428],
  "500020": ["Himayatnagar", 17.4108, 78.4831],
  "500022": ["Erragadda", 17.4625, 78.4456],
  "500024": ["Lalaguda", 17.4592, 78.5219],
  "500025": ["Saroornagar", 17.3645, 78.5377],
  "500026": ["Saidabad", 17.3608, 78.5128],
  "500027": ["Malakpet", 17.3754, 78.5042],
  "500028": ["Bahadurpura", 17.3522, 78.4628],
  "500029": ["Himayatnagar", 17.4108, 78.4831],
  "500030": ["Rajendranagar", 17.3186, 78.4081],
  "500032": ["Gachibowli", 17.44, 78.3489],
  "500033": ["Banjara Hills", 17.414, 78.4319],
  "500034": ["Banjara Hills", 17.414, 78.4319],
  "500035": ["RK Puram", 17.3486, 78.5817],
  "500036": ["Falaknuma", 17.3327, 78.4672],
  "500038": ["Patny", 17.4444, 78.5006],
  "500039": ["Champapet", 17.3517, 78.5444],
  "500040": ["Saidabad", 17.3608, 78.5128],
  "500041": ["Saroornagar", 17.3645, 78.5377],
  "500044": ["Sanathnagar", 17.4516, 78.4421],
  "500045": ["Tolichowki", 17.4053, 78.4144],
  "500046": ["Hyderabad University", 17.4584, 78.3422],
  "500047": ["Karwan", 17.3719, 78.4356],
  "500048": ["Mehdipatnam", 17.3937, 78.4322],
  "500049": ["Kukatpally", 17.4849, 78.4138],
  "500050": ["Hitec City", 17.4456, 78.3811],
  "500051": ["Yousufguda", 17.4396, 78.4361],
  "500053": ["Kothapet", 17.3692, 78.5392],
  "500055": ["Kapra", 17.4914, 78.5683],
  "500056": ["Borabanda", 17.4528, 78.428],
  "500057": ["Tarnaka", 17.4256, 78.5217],
  "500058": ["Hayatnagar", 17.3433, 78.6053],
  "500060": ["Champapet", 17.3517, 78.5444],
  "500061": ["Tarnaka", 17.4256, 78.5217],
  "500062": ["Saidabad", 17.3608, 78.5128],
  "500063": ["Saroornagar", 17.3645, 78.5377],
  "500064": ["Kompally", 17.5392, 78.4858],
  "500065": ["Charminar", 17.3617, 78.4747],
  "500066": ["Hitec City", 17.4456, 78.3811],
  "500067": ["Vidyanagar", 17.4081, 78.5161],
  "500068": ["LB Nagar", 17.3526, 78.5589],
  "500070": ["Vanasthalipuram", 17.3486, 78.5817],
  "500072": ["Kukatpally", 17.4849, 78.4138],
  "500073": ["Punjagutta", 17.4256, 78.4525],
  "500074": ["Kondapur", 17.4684, 78.3661],
  "500075": ["Charminar", 17.3617, 78.4747],
  "500076": ["Dilsukhnagar", 17.3667, 78.5256],
  "500077": ["Hayathnagar", 17.3433, 78.6053],
  "500078": ["Banjara Hills", 17.414, 78.4319],
  "500080": ["Sainikpuri", 17.4825, 78.5547],
  "500081": ["Madhapur", 17.4474, 78.3914],
  "500082": ["Begumpet", 17.4452, 78.4602],
  "500083": ["Kondapur", 17.4684, 78.3661],
  "500084": ["Kondapur", 17.4684, 78.3661],
  "500085": ["Saidabad", 17.3608, 78.5128],
  "500087": ["LB Nagar", 17.3526, 78.5589],
  "500088": ["Saroornagar", 17.3645, 78.5377],
  "500089": ["Manikonda", 17.4036, 78.3878],
  "500090": ["Bachupally", 17.5358, 78.3814],
  "500092": ["Boduppal", 17.4192, 78.5928],
  "500095": ["Charminar", 17.3617, 78.4747],
  "500096": ["Charminar", 17.3617, 78.4747],
  "500098": ["Saroornagar", 17.3645, 78.5377],
  // Rangareddy
  "501301": ["Patancheru", 17.53, 78.27],
  "501506": ["Vikarabad", 17.3375, 77.9061],
  // Common nearby
  "502032": ["Sangareddy", 17.6225, 78.0856],
};

const PINCODE_MAP = new Map<string, PincodeLocation>(
  Object.entries(RAW).map(([pin, [area, lat, lng]]) => [
    pin,
    { pincode: pin, area, lat, lng },
  ])
);

export function lookupPincode(value: string | number | undefined | null): PincodeLocation | null {
  if (value === undefined || value === null || value === "") return null;
  const pin = String(value).trim();
  return PINCODE_MAP.get(pin) ?? null;
}

export function pincodeOrCenter(value: string | number | undefined | null): {
  lat: number;
  lng: number;
  area: string;
  pincode: string;
  known: boolean;
} {
  const found = lookupPincode(value);
  if (found) {
    return { ...found, known: true };
  }
  const pin = String(value ?? "").trim();
  return {
    lat: HYDERABAD_CENTER.lat,
    lng: HYDERABAD_CENTER.lng,
    area: pin ? `Pincode ${pin}` : "Unknown",
    pincode: pin,
    known: false,
  };
}
