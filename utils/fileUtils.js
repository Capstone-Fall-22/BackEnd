import Jimp from "jimp";
import fs from "fs";

export async function writeImage(input, tokenID) {
    const path = `./temp/${tokenID}.png`;
    const height = input.predictions[0].length;
    const width = input.predictions[0][0].length;

    for (let i = 1; i < height; i++) {
        if (input.predictions[0][i].length !== width) {
            throw new Error("Invalid array width");
        }
    }

    let image = new Jimp(width, height);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let pred = input.predictions[0][i][j];
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

export async function readImage(path) {
    let image;
    try{
        image = await fs.readFileSync(path);
    }catch(e){
        console.error(e);
        throw new Error("Error reading image");
    }

    try{
        fs.unlinkSync(path);
    }catch(e){
        console.error(e);
        throw new Error("Error deleting image");
    }

    return image;
}

export async function readABI(path){
    const abi = JSON.parse(fs.readFileSync(path)).abi;
    return abi;
}