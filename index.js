import { ethers } from "ethers";
import fs from "fs";
import { NFTStorage, File } from "nft.storage";
import * as dotenv from "dotenv";
import Jimp from "jimp";

dotenv.config();
import abi from "./abi/abi.json" assert { type: "json" };
import test_input from "./test-model-input.json" assert { type: "json" };
const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

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
    return await nftstorage.store({
	name: `SCAiPES#${tokenID}`,
	description: "Description!",
	image: new File([img_buffer], `${tokenID}`, { type: "image/png" }),
	website: "https://google.com/",
	properties: {
	    burned: typeof who !== "undefined",
	    burner: who
	}
    });
}

async function getMetadata(cid) {
    const options = {
        method: 'GET',
        headers: { 'content-type': 'application/json' }
    }
    const metadata = await fetch(`https://ipfs.io/ipfs/${cid}/metadata.json`, options);
    return await metadata.json();
}

async function burnNFT(cid, who) {
    var metadata = await getMetadata(cid);
    if (metadata.property === true) {
       throw new Error("NFT already burned");
    }
    metadata.properties.burned = true;
    metadata.properties.burner = who;
    await nftstorage.delete(cid);
    const image = await fetch(`https://ipfs.io/ipfs/${metadata.image.slice(7)}`);
    const img_blob = await image.blob();
    const img_arr_buff = await img_blob.arrayBuffer();
    return await uploadImage(Buffer.from(img_arr_buff), metadata.name.slice(8), who);
}

async function convertImg(input, tokenID) {
    const path = `./images/${tokenID}.png`;
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
    console.log(response);
    const file = await convertImg(response, tokenID);
    const image = await fs.readFileSync(file);
    fs.unlinkSync(file);
    const cid = await uploadImage(image, tokenID);
    console.log(cid.ipnft);
}

async function main() {
    const address = "0x47AE92283cd7066a11f91D11d33c92A6A77e5bdF";
    const provider = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY);
    const contract = new ethers.Contract(address, abi, provider);
    
    // Make a prediction and get an image from the output
    uploadNewPrediction("Test");


    
    contract.on("mint", (_tokenId, _who, event) => {
        uploadNewPrediction(_tokenId);
	console.log(`Minted ${_tokenId} for ${_who}`);
    });
}

main();
