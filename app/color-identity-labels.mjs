export const colorIdentityName = (colors) => {
  const order = "WUBRG";
  const key = [...colors].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join("");
  const names = {
    "": "Colorless",
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
    WU: "Azorius",
    UB: "Dimir",
    BR: "Rakdos",
    RG: "Gruul",
    WG: "Selesnya",
    WB: "Orzhov",
    UR: "Izzet",
    BG: "Golgari",
    WR: "Boros",
    UG: "Simic",
    WUG: "Bant",
    WUB: "Esper",
    UBR: "Grixis",
    BRG: "Jund",
    WRG: "Naya",
    WBG: "Abzan",
    WUR: "Jeskai",
    UBG: "Sultai",
    WBR: "Mardu",
    URG: "Temur",
  };
  return names[key] || `${key} color identity`;
};
export const NOTE_COLOR_NAMES = {
  white: ["W"], blue: ["U"], black: ["B"], red: ["R"], green: ["G"],
  azorius: ["W", "U"], dimir: ["U", "B"], rakdos: ["B", "R"], gruul: ["R", "G"], selesnya: ["G", "W"],
  orzhov: ["W", "B"], izzet: ["U", "R"], golgari: ["B", "G"], boros: ["R", "W"], simic: ["G", "U"],
  bant: ["W", "U", "G"], esper: ["W", "U", "B"], grixis: ["U", "B", "R"], jund: ["B", "R", "G"], naya: ["R", "G", "W"],
  abzan: ["W", "B", "G"], jeskai: ["U", "R", "W"], sultai: ["B", "G", "U"], mardu: ["R", "W", "B"], temur: ["G", "U", "R"],
};
export const colorsFromNote = (note = "") => {
  for (const word of note.toLowerCase().match(/[a-z]+/g) || []) {
    const colors = NOTE_COLOR_NAMES[word];
    if (colors) return colors;
  }
  return [];
};
