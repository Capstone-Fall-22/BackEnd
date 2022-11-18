import { ethers } from "ethers";
import abi from "./abi/abi.json" assert { type: "json" };
import fs from "fs";
import { NFTStorage, File } from "nft.storage";
import * as dotenv from "dotenv";
dotenv.config();
const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

async function postPrediction(prediction) {
    const output = await fetch("http://localhost:8501/v1/models/toy-model:predict", {
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

function convertImg(input) {
    for () {
        
    }
}

async function main() {
    const address = "0x47AE92283cd7066a11f91D11d33c92A6A77e5bdF";
    const provider = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY);
    const contract = new ethers.Contract(address, abi, provider);
    
    // Upload image to IPFS
    const buffer = await fs.readFileSync("./images/Wallpaper.png");
    const image = new File([buffer], "image.png", { type: "image/png"});
    var cid = await uploadImage(image, "Test");
    console.log(cid);

    // Make a prediction and get an image from the output
    var image_res = postPrediction({ instances: [[0.12, 0.75, 0.92, 0.37]] })
        .then((response) => {
	    console.log(JSON.stringify(response));
	});

    // Listen for minting events
    contract.on("mint", (_tokenId, _who, event) => {
        console.log(`Minted ${_tokenId} for ${_who}`);
	var pred_img = convertImg(postPrediction(sample_pred));
	var minted_img = uploadImage(pred_img, _tokenId);
    })
}

main();
