import * as dotenv from 'dotenv';
dotenv.config()

import { ethers } from "ethers";
import { uploadImage } from './utils/ipfsUtils.js';
import { getMetadata, uploadMetadata } from './utils/googleCloudUtils.js';
import { getGeneratedImage } from './utils/modelUtils.js';
import { writeImage, readImage, readABI } from './utils/fileUtils.js';

/**
 * Burns a NFT by modifying its metadata
 * @param tokenID the token ID of the NFT to be burned
 * @param burner the address of the person burning the NFT
 * @returns {Promise<*>} the promise that the metadata has been successfully been modified and uploaded
 */
async function burnToken(tokenID, burner) {
    let metadata = await getMetadata(tokenID);

    if (metadata.properties.burned === true) {
        throw new Error("NFT already burned");
    }

    uploadMetadata(metadata.image, tokenID, burner);

    console.log(`Address: ${burner} just burned token #${tokenID}`)
    return metadata.image;
}

/**
 * Mints (copies an image) from a previously burned NFT
 * @param tokenId the token ID of the token the new metadata
 * @param minter the address of the person
 * @param burnedTokenToCopy the token ID of the token that is to be copied
 * @returns {Promise<void>} the promise that the requested NFT is copied and new metadata has been uploaded
 */
async function mintBurnedToken(tokenId, minter, burnedTokenToCopy) {
    try{
        var metadata = await getMetadata(burnedTokenToCopy);
    }catch(e){
        // Metadata of burnedTokenToCopy could not be found
        console.error(e);
        throw new Error(`Metadata could not be found for burned token #${burnedTokenToCopy} when creating new token #${tokenId}`);
    }

    if(metadata && metadata.properties.burned){
        try{
            // Make new metadata with same image link but new tokenId
            const metadataUrl = await uploadMetadata(metadata.image, tokenId);
            console.log(`Burned Token Minted #${tokenId} for ${minter} by copying ${burnedTokenToCopy} at ${metadataUrl}`);
        }catch(e){
            // Failed to upload metadata
            console.error(e);
            throw new Error(`Failed to upload new metadata for tokenid #${tokenId}`);
        }
    }else{
        // burnedTokenToCopy is not burned
        throw new Error(`Token #${burnedTokenToCopy} is not burned or metadata doesn't exist`);
    }
}

/**
 * Mints a completely new NFT
 * @param tokenId the token ID of the newly generated NFT
 * @returns {Promise<void>} the promise that a new NFT has been successfully generated
 */
async function mintNewToken(tokenId){
    // Sends a random prediction to the AI art generator and outputs an image in the format of a JSON object
    try{
        var generatedImage = await getGeneratedImage();
    }catch(e){
        console.error(e);
        throw new Error(`Error getting generated image for tokenid #${tokenId}`);
    }

    // Converts the JSON object to an image and save it
    try{
        var imagePath = await writeImage(generatedImage, tokenId);
    }catch(e){
        console.error(e);
        throw new Error(`Error writing image for tokenid #${tokenId}`);
    }

    // Reads the image into a buffer
    try{
        var imageBuffer = await readImage(imagePath);
    }catch(e){
        console.error(e);
        throw new Error(`Error reading image for tokenid #${tokenId}`);
    }

    // Uploads the image onto the IPFS
    try{
        var imageUrl = await uploadImage(imageBuffer);
    }catch(e){
        console.error(e);
        throw new Error(`Error uploading image for tokenid #${tokenId}`);
    }

    // Uploads new metadata for that image to the Google Cloud Storage
    try{
        var metadataUrl = await uploadMetadata(imageUrl, tokenId);
    }catch(e){
        console.error(e);
        throw new Error(`Error uploading metadata for tokenid #${tokenId}`);
    }

    console.log(`New Token Minted ${tokenId} at ${metadataUrl}`);
}

/**
 * Process for minting a new or previously burned NFT
 * @param tokenId the token ID of the token to be minted
 * @param minter the address of the person minting the token
 * @param burnedTokenToCopy the token ID of the token that is to be copied, if applicable
 * @returns {Promise<void>} the promise that a NFT has been minted
 */
async function mintToken(tokenId, minter, burnedTokenToCopy) {
    const isCopying = burnedTokenToCopy > 0;
    if (isCopying){
        try{
            // If the user is copying a token and the token's metdata indicates that it
            // has been burned, then copy the burned token's images in the new metadata
            await mintBurnedToken(tokenId, minter, burnedTokenToCopy);
            return;
        }catch(e){
            console.error(e);
        }
    }else{
        // get prediction from model
        try{
            await mintNewToken(tokenId, minter);
        }catch(e){
            console.error(e);
        }

    }
}

/**
 * Connects to the Smart Contract to listen for the mint and burn events
 * @returns {Promise<void>} the promise that the process has been successfully ran
 */
async function main() {
    // Reads the ABI of our Smart Contract
    try{
        var abi = await readABI(`${process.env.CONTRACT_ADDRESS}.json`);
    }catch(e){
        console.error("Error reading ABI");
    }

    // Connects to the Alchemy provider, which is our interface to the Ethereum blockchain
    try{
        var provider = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_API_KEY);
    }catch{
        console.error("Alchemy provider failed to connect");
    }

    // Connects to the Smart Contract
    try{
        var contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);
    }catch(e){
        console.error("Error connecting to contract");
    }

    // Listens for all mint events
    contract.on("mint", (tokenId, minter, burnedTokenToCopy) => {
        console.log("Mint event detected");
        try{
            mintToken(tokenId, minter, burnedTokenToCopy);
        }catch(e){
            console.error(`Error while minting: ${e}`);
        }
    });
    console.log("Listening for mint...");

    // Listens for all burn events
    contract.on("burn", (tokenId, burner) => {
        console.log("Burn event detected");
        try{
            burnToken(tokenId, burner);
        }catch(e){
            console.error(`Error while burning: ${e}`);
        }
    });
    console.log("Listening for burn...");
}

main();
