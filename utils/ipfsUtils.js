import { NFTStorage } from "nft.storage";

/**
 * Uploads an image onto the IPFS
 * @param img_buffer the buffer of the image to be uploaded
 * @returns {Promise<string>} the promise that the image has been successfully uploaded
 */
export async function uploadImage(img_buffer) {
    const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

    if(!Buffer.isBuffer(img_buffer)) {
        throw new Error("Image is not a buffer");
    }

    let image_link = await nftstorage.storeBlob(new Blob([img_buffer]));
    
    return `ipfs://${image_link}`;
}
