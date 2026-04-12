export type NigeriaState = {
  name: string;
  capital: string;
  cities: string[];
};

export const NIGERIA_STATES: NigeriaState[] = [
  { name: "Abia", capital: "Umuahia", cities: ["Aba", "Umuahia", "Ohafia", "Arochukwu", "Bende", "Isuikwuato", "Osisioma"] },
  { name: "Adamawa", capital: "Yola", cities: ["Yola", "Mubi", "Jimeta", "Numan", "Ganye", "Gombi", "Michika", "Mayo-Belwa"] },
  { name: "Akwa Ibom", capital: "Uyo", cities: ["Uyo", "Eket", "Ikot Ekpene", "Oron", "Abak", "Ikot Abasi", "Essien Udim"] },
  { name: "Anambra", capital: "Awka", cities: ["Awka", "Onitsha", "Nnewi", "Ekwulobia", "Aguata", "Ihiala", "Ogidi", "Obosi"] },
  { name: "Bauchi", capital: "Bauchi", cities: ["Bauchi", "Azare", "Misau", "Jama'are", "Katagum", "Dass", "Tafawa Balewa"] },
  { name: "Bayelsa", capital: "Yenagoa", cities: ["Yenagoa", "Ogbia", "Sagbama", "Brass", "Nembe", "Ekeremor", "Kolokuma"] },
  { name: "Benue", capital: "Makurdi", cities: ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala", "Vandeikya", "Oju", "Okpokwu"] },
  { name: "Borno", capital: "Maiduguri", cities: ["Maiduguri", "Biu", "Bama", "Monguno", "Konduga", "Gwoza", "Dikwa", "Damboa"] },
  { name: "Cross River", capital: "Calabar", cities: ["Calabar", "Ogoja", "Ikom", "Ugep", "Obudu", "Akamkpa", "Odukpani"] },
  { name: "Delta", capital: "Asaba", cities: ["Asaba", "Warri", "Sapele", "Ughelli", "Agbor", "Ozoro", "Oleh", "Effurun", "Uvwie"] },
  { name: "Ebonyi", capital: "Abakaliki", cities: ["Abakaliki", "Afikpo", "Onueke", "Ezzamgbo", "Ishielu", "Ohaukwu"] },
  { name: "Edo", capital: "Benin City", cities: ["Benin City", "Auchi", "Ekpoma", "Uromi", "Irrua", "Sabongida-Ora", "Ubiaja"] },
  { name: "Ekiti", capital: "Ado-Ekiti", cities: ["Ado-Ekiti", "Ikere-Ekiti", "Ikole-Ekiti", "Iyin-Ekiti", "Ijero-Ekiti", "Omuo-Ekiti", "Emure-Ekiti"] },
  { name: "Enugu", capital: "Enugu", cities: ["Enugu", "Nsukka", "Agbani", "Udi", "Oji River", "Awgu", "Nkanu", "Ezeagu"] },
  { name: "FCT", capital: "Abuja", cities: ["Abuja", "Gwagwalada", "Kuje", "Bwari", "Kwali", "Abaji", "Kubwa", "Lugbe", "Maitama", "Wuse", "Garki"] },
  { name: "Gombe", capital: "Gombe", cities: ["Gombe", "Billiri", "Kaltungo", "Bajoga", "Dukku", "Nafada"] },
  { name: "Imo", capital: "Owerri", cities: ["Owerri", "Orlu", "Okigwe", "Oguta", "Mbaise", "Nkwerre", "Obowo"] },
  { name: "Jigawa", capital: "Dutse", cities: ["Dutse", "Hadejia", "Gumel", "Kazaure", "Ringim", "Birnin Kudu"] },
  { name: "Kaduna", capital: "Kaduna", cities: ["Kaduna", "Zaria", "Kafanchan", "Kagoro", "Saminaka", "Birnin Gwari", "Giwa"] },
  { name: "Kano", capital: "Kano", cities: ["Kano", "Wudil", "Gwarzo", "Rano", "Bichi", "Tudun Wada", "Dala", "Fagge", "Nassarawa"] },
  { name: "Katsina", capital: "Katsina", cities: ["Katsina", "Daura", "Funtua", "Malumfashi", "Dutsin-Ma", "Kankia"] },
  { name: "Kebbi", capital: "Birnin Kebbi", cities: ["Birnin Kebbi", "Argungu", "Yauri", "Zuru", "Jega", "Bagudo"] },
  { name: "Kogi", capital: "Lokoja", cities: ["Lokoja", "Okene", "Idah", "Kabba", "Ankpa", "Dekina", "Ajaokuta"] },
  { name: "Kwara", capital: "Ilorin", cities: ["Ilorin", "Offa", "Omu-Aran", "Jebba", "Lafiagi", "Patigi", "Kaiama"] },
  { name: "Lagos", capital: "Ikeja", cities: ["Ikeja", "Lagos Island", "Victoria Island", "Lekki", "Ikoyi", "Surulere", "Yaba", "Agege", "Apapa", "Mushin", "Oshodi", "Isolo", "Ajah", "Badagry", "Epe", "Ikorodu", "Alimosho", "Amuwo-Odofin", "Festac", "Ogba", "Maryland", "Gbagada", "Magodo", "Berger", "Ojota", "Ojodu"] },
  { name: "Nasarawa", capital: "Lafia", cities: ["Lafia", "Keffi", "Akwanga", "Nasarawa", "Doma", "Karu", "Toto"] },
  { name: "Niger", capital: "Minna", cities: ["Minna", "Bida", "Suleja", "Kontagora", "New Bussa", "Lapai", "Agaie"] },
  { name: "Ogun", capital: "Abeokuta", cities: ["Abeokuta", "Sagamu", "Ijebu-Ode", "Ota", "Ilaro", "Ifo", "Sango-Otta", "Agbara"] },
  { name: "Ondo", capital: "Akure", cities: ["Akure", "Ondo", "Owo", "Ikare", "Ore", "Okitipupa", "Idanre"] },
  { name: "Osun", capital: "Osogbo", cities: ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Iwo", "Ejigbo", "Ikire", "Ikirun"] },
  { name: "Oyo", capital: "Ibadan", cities: ["Ibadan", "Ogbomoso", "Oyo", "Iseyin", "Saki", "Eruwa", "Igboho", "Fiditi", "Igbo-Ora"] },
  { name: "Plateau", capital: "Jos", cities: ["Jos", "Bukuru", "Pankshin", "Shendam", "Barkin Ladi", "Bokkos", "Mangu"] },
  { name: "Rivers", capital: "Port Harcourt", cities: ["Port Harcourt", "Obio-Akpor", "Bonny", "Degema", "Ahoada", "Okrika", "Eleme", "Oyigbo"] },
  { name: "Sokoto", capital: "Sokoto", cities: ["Sokoto", "Tambuwal", "Bodinga", "Illela", "Gwadabawa", "Wurno"] },
  { name: "Taraba", capital: "Jalingo", cities: ["Jalingo", "Wukari", "Takum", "Bali", "Serti", "Gembu", "Ibi"] },
  { name: "Yobe", capital: "Damaturu", cities: ["Damaturu", "Potiskum", "Gashua", "Nguru", "Geidam", "Bade"] },
  { name: "Zamfara", capital: "Gusau", cities: ["Gusau", "Kaura Namoda", "Talata Mafara", "Anka", "Bungudu", "Maru"] },
];

export function getStateOptions() {
  return NIGERIA_STATES.map((s) => ({ value: s.name, label: s.name }));
}

export function getCityOptions(stateName: string) {
  const state = NIGERIA_STATES.find((s) => s.name === stateName);
  if (!state) return [];
  return state.cities.map((c) => ({ value: c, label: c }));
}
