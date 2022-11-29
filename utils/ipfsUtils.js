import { NFTStorage } from "nft.storage";


export async function uploadImage(img_buffer) {
    const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

    if(!Buffer.isBuffer(img_buffer)) {
        throw new Error("Image is not a buffer");
    }

    let image_link = await nftstorage.storeBlob(new Blob([img_buffer]));
    
    return `ipfs://${image_link}`;
}