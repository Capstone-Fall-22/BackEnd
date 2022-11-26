import { ethers } from "ethers";
import fs from "fs";
import gcs from "@google-cloud/storage";
import { NFTStorage, File } from "nft.storage";
import * as dotenv from "dotenv";
import Jimp from "jimp";

dotenv.config();
import abi from "./abi/abi.json" assert { type: "json" };
import test_input from "./test-model-input.json" assert { type: "json" };
const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });
const storage = new gcs.Storage({ keyFilename: process.env.GOOGLE_CLOUD_STORAGE_KEY });
const bucketName = "scaipes-metadata";

function newPrediction() {
    var val = [];
    val.push(new Array(100));
    for (let i = 0; i < val[0].length; i++) {
        val[0][i] = Math.random();
    }
    var prediction = {
        instances: val
    }
    return prediction;
}

async function postPrediction(prediction) {
    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prediction)
    }
    const output = await fetch('http://localhost:8501/v1/models/test-model:predict', options);
    return await output.json();
}

async function uploadImage(img_buffer, tokenID, who = undefined) {
    const image_link = await nftstorage.storeBlob(new Blob([img_buffer]));
    const metadata = {
        name: `SCAiPES#${tokenID}`,
        description: "SCAiPES Description!",
        image: `ipfs://${image_link}`,
        website: "https://google.com/",
        properties: {
            burned: typeof who !== "undefined",
            burner: who
        }
    }
    const metadata_file = `temp/${tokenID}.json`
    await fs.writeFileSync(metadata_file, JSON.stringify(metadata));
    await storage.bucket(bucketName).upload(metadata_file, {
        destination: `${tokenID}.json`
    });
    fs.unlinkSync(metadata_file);
    return `http://storage.googleapis.com/${bucketName}/${tokenID}.json`
}

async function getMetadata(tokenID) {
    const metadata = await fetch(`http://storage.googleapis.com/${bucketName}/${tokenID}.json`, {
        method: "GET",
        headers: { "content-type": "application/json" }
    });
    return await metadata.json();
}

async function burnNFT(tokenID, who) {
    var metadata = await getMetadata(tokenID);
    if (metadata.name !== `SCAiPES#${tokenID}`) {
	throw new Error("Metadata doesn't exist");
    } else if (metadata.properties.burned === true) {
        throw new Error("NFT already burned");
    }
    metadata.properties.burned = true;
    metadata.properties.burner = who;
    await storage.bucket(bucketName).file(`${tokenID}.json`).delete();
    const image = await fetch(`https://ipfs.io/ipfs/${metadata.image.slice(7)}`);
    const img_blob = await image.blob();
    const img_arr_buff = await img_blob.arrayBuffer();
    return await uploadImage(Buffer.from(img_arr_buff), tokenID, who);
}

async function convertImg(input, tokenID) {
    const path = `./temp/${tokenID}.png`;
    const height = input.predictions[0].length;
    const width = input.predictions[0][0].length;
    for (let i = 1; i < height; i++) {
        if (input.predictions[0][i].length !== width) {
	    throw new Error("Invalid array width");
	}
    }
    var image = new Jimp(width, height);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            var pred = input.predictions[0][i][j];
            for (let k = 0; k < 3; k++) {
                pred[k]++;
                pred[k] *= 127.5;
                pred[k] = Math.round(pred[k]);
            }
            image.setPixelColor(Jimp.rgbaToInt(pred[0], pred[1], pred[2], 255), j, i);
        }
    }
    await image.writeAsync(path);
    return path;
}

async function uploadNewPrediction(tokenID) {
    const response = await postPrediction(newPrediction());
    const file = await convertImg(response, tokenID);
    const image = await fs.readFileSync(file);
    fs.unlinkSync(file);
    const url = await uploadImage(image, tokenID);
    console.log(`Minted ${tokenID} at ${url}`);
    return url;
}

async function mintToken(tokenID, who, burnToken) {
    if (burnToken > 0) {
	// download metadata for burnToken,
        // check if burned != true, generate new image
        // if burned == true, upload new md with existing image from burnToken
        const metadata = await getMetadata(tokenID);
	if (metadata.properties.burned !== true) {
            const url = await uploadNewPrediction(tokenID);
	    console.log(`Minted ${tokenID} for ${who} at ${url}`);
	} else {
            const image = await fetch(`https://ipfs.io/ipfs/${metadata.image.slice(7)}`);
            const img_blob = await image.blob();
            const img_arr_buff = await img_blob.arrayBuffer();
            const url = await uploadImage(Buffer.from(img_arr_buff), metadata.name.slice(8), who);
            console.log(`Minted ${tokenID} for ${who} at ${url}`);
	}
    } else if (_burnToken === 0) {
        const url = await uploadNewPrediction(tokenID);
        console.log(`Minted ${tokenID} for ${who} at ${url}`);
    } else {
        console.error("burnToken is negative!");
    } // error negative
}

async function main() {
    const address = "0xc356d2c9C68Be126e848739Ec2260D8eCF814184";
    const provider = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY);
    const contract = new ethers.Contract(address, abi, provider);
    
    // await uploadNewPrediction(1);
    // await uploadNewPrediction(2);
    // const link = await burnNFT(2, "Me");
    // console.log(link);

    contract.on("mint", (_tokenId, _who, _burnToken) => {
        mintToken(_tokenId, _who, _burnToken);
    });
    contract.on("burn", (_tokenId, _who) => {
        // download metadata of burned token
	// check if metadata exists for _tokenId
	burnNFT(_tokenId, _who);
	// reupload changed metadata
    });
}

main();
