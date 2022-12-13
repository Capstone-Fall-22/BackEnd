import gcs from "@google-cloud/storage";
import fs from "fs";

/**
 * Gets the metadata of a previously generated NFT
 * @param tokenID the token ID of the requested metadata
 * @returns {Promise<any>} the promise that the metadata has been read and outputted
 */
export async function getMetadata(tokenID) {
    try{
        var metadata = await fetch(`http://storage.googleapis.com/${process.env.BUCKET_NAME}/${tokenID}.json`, {
            method: "GET",
            headers: { "content-type": "application/json" }
        });
    }catch(e){
        throw new Error("Metadata doesn't exist");
        console.error(e);
    }
    
    return await metadata.json();
}

/**
 * Uploads the metadata of an image to the Google Cloud Storage
 * @param image_link the link of the image on the IPFS
 * @param tokenId the token ID associated with the image
 * @param burner the person who burned the NFT, if applicable
 * @returns {Promise<string>} tje the promise that the NFT has been successfully been uploaded
 */
export async function uploadMetadata(image_link, tokenId, burner = undefined) {
    const metadata = {
        name: `SCAiPES#${tokenId}`,
        description: "SCAiPES Description!",
        image: image_link,
        website: "https://google.com/",
        properties: {
            burned: typeof burner !== "undefined",
            burner: burner
        }
    }
    const metadata_file = `temp/${tokenId}.json`

    // Temporarily writes the metadata file to a local directory
    try{
        await fs.writeFileSync(metadata_file, JSON.stringify(metadata));
    }catch(e){
        console.error(e);
        throw new Error("Error writing metadata file");
    }

    // Uploads the metadata onto the Google Cloud Storage
    try{
        const storage = new gcs.Storage({ keyFilename: process.env.GOOGLE_CLOUD_STORAGE_KEY });
        await storage.bucket(process.env.BUCKET_NAME).upload(metadata_file, {
            destination: `${tokenId}.json`,
            metadata: {
                cacheControl: 'max-age=0, no-cache, no-store, must-revalidate'
            }
        });
    }catch(e){
        console.error(e);
        throw new Error("Error uploading metadata file");
    }

    // Deletes the unneeded metadata off of local storage
    try{
        fs.unlinkSync(metadata_file);
    }catch(e){
        console.error(e);
        throw new Error("Error deleting metadata file");
    }

    // The link to the metadata
    return `https://storage.googleapis.com/${process.env.BUCKET_NAME}/${tokenId}.json`
}
