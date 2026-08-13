import sharp from "sharp";

const source = "C:/Projects/MetaForge/.build-tools/forge-3d-source/pack/Exports/glTF";
const destination = "C:/Projects/MetaForge/web/public/assets/forge/models/quaternius";

for (const name of [
  "T_Trim_Metal_BaseColor.png",
  "T_Trim_Metal_Normal.png",
  "T_Trim_Metal_ORM.png",
  "T_Trim_Furniture_BaseColor.png",
  "T_Trim_Furniture_Normal.png",
  "T_Trim_Furniture_ORM.png",
]) {
  await sharp(`${source}/${name}`)
    .resize(512, 512)
    .png({ compressionLevel: 9, quality: 80 })
    .toFile(`${destination}/${name}`);
}
