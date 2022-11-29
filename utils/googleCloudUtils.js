import gcs from "@google-cloud/storage";
import fs from "fs";

export async function getMetadata(tokenID) {
    try{
        const metadata = await fetch(`http://storage.googleapis.com/${bucketName}/${tokenID}.json`, {
            method: "GET",
            headers: { "content-type": "application/json" }
        });
    }catch(e){
        throw new Error("Metadata doesn't exist");
        console.error(e);
    }
    
    return await metadata.json();
}

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
    
    try{
        await fs.writeFileSync(metadata_file, JSON.stringify(metadata));
    }catch(e){
        console.error(e);
        throw new Error("Error writing metadata file");
    }
    
    try{
        const storage = new gcs.Storage({ keyFilename: process.env.GOOGLE_CLOUD_STORAGE_KEY });
        const bucketName = process.env.BUCKET_NAME;
        await storage.bucket(bucketName).upload(metadata_file, {
            destination: `${tokenId}.json`
        });
    }catch(e){
        console.error(e);
        throw new Error("Error uploading metadata file");
    }

    try{
        fs.unlinkSync(metadata_file);
    }catch(e){
        console.error(e);
        throw new Error("Error deleting metadata file");
    }

    return `https://storage.googleapis.com/${bucketName}/${tokenId}.json`
}
