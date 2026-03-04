import ImageKit from "imagekit";

let imageKit = null;

function getImageKit() {
  if (!imageKit) {
    imageKit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return imageKit;
}

export default getImageKit;
