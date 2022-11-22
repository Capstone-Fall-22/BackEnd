import { ethers } from "ethers";
import abi from "./abi/abi.json" assert { type: "json" };
import fs from "fs";
import { NFTStorage, File } from "nft.storage";
import * as dotenv from "dotenv";
dotenv.config();
const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });
import test_input from "./test-model-input.json" assert { type: "json" };
import Jimp from "jimp";

async function postPrediction(prediction) {
    const output = await fetch("http://localhost:8501/v1/models/test-model:predict", {
        method: "POST",
	headers: {
	    "Content-Type": "application/json"
	},
	body: JSON.stringify(prediction)
    })
    return output.json();
}

async function uploadImage(image, tokenID, who = undefined) {
    return nftstorage.store({
        image,
	name: `SCAiPES#${tokenID}`,
	description: "Description!",
	website: "https://google.com/",
	burned: `${typeof who !== "undefined"}`,
	burner: who
    });
}

async function convertImg(input, tokenID) {
    const path = `./images/${tokenID}.png`;
    var image = new Jimp(1280, 720);
    for (let i = 0; i < 720; i++) {
        for (let j = 0; j < 1280; j++) {
            var pred = input.predictions[0][i][j];
            for (let k = 0; k < 3; k++) {
                pred[k]++;
                pred[k] *= 127.5;
                pred[k] = Math.round(pred[k])
            }
            image.setPixelColor(Jimp.rgbaToInt(pred[0], pred[1], pred[2], 255), j, i);
        }
    }
    await image.writeAsync(path);
    return path;
}

async function uploadNewPrediction(tokenID) {
    const image_res = await postPrediction(test_input);
    const file = await convertImg(image_res, tokenID);
    const output = await fs.readFileSync(file);
    fs.unlinkSync(file);
    const image = new File([output], "output.png", { type: "image/png" });
    const cid = await uploadImage(image, tokenID);
    console.log(cid);
}

async function main() {
    const address = "0x47AE92283cd7066a11f91D11d33c92A6A77e5bdF";
    const provider = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY);
    const contract = new ethers.Contract(address, abi, provider);
    
    // Make a prediction and get an image from the output
    await uploadNewPrediction("Test");

    contract.on("mint", (_tokenId, _who, event) => {
        uploadNewPrediction(_tokenId);
	console.log(`Minted ${_tokenId} for ${_who}`);
    });
}

main();
