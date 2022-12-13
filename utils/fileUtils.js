import Jimp from "jimp";
import fs from "fs";

/**
 * Converts an image of the JSON object format to a PNG
 * @param input a JSON object
 * @param tokenID the token ID of the associated image
 * @returns {Promise<string>} the promise that the image has been successfully written
 */
export async function writeImage(input, tokenID) {
    const path = `./temp/${tokenID}.png`;
    const height = input.predictions[0].length;
    const width = input.predictions[0][0].length;

    for (let i = 1; i < height; i++) {
        if (input.predictions[0][i].length !== width) {
            throw new Error("Invalid array width");
        }
    }

    // Creates an image buffer and sets the pixels
    let image = new Jimp(width, height);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let pred = input.predictions[0][i][j];
            // Algorithm to convert the RGB values into valid ones
            for (let k = 0; k < 3; k++) {
                pred[k]++;
                pred[k] *= 127.5;
                pred[k] = Math.round(pred[k]);
            }
            image.setPixelColor(Jimp.rgbaToInt(pred[0], pred[1], pred[2], 255), j, i);
        }
    }

    // Write image
    await image.writeAsync(path);
    return path;
}

/**
 * Reads a PNG image and outputs it into a buffer
 * @param path the path of the image
 * @returns {Promise<*>} the promise that the image has been successfully been read
 */
export async function readImage(path) {
    // Reads the image and places it into a buffer
    try{
        var image = await fs.readFileSync(path);
    }catch(e){
        console.error(e);
        throw new Error("Error reading image");
    }

    // The temporary image file is no longer needed and deleted
    try{
        fs.unlinkSync(path);
    }catch(e){
        console.error(e);
        throw new Error("Error deleting image");
    }

    return image;
}

/**
 * Reads the ABI of the Smart Contract
 * @param path the path of the ABI
 * @returns {Promise<*>} the promise that the ABI has been successfully read
 */
export async function readABI(path){
    const abi = JSON.parse(fs.readFileSync(path)).abi;
    return abi;
}
