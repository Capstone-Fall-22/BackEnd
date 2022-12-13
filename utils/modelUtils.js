/**
 * Outputs a randomly generated array of 100 floats into a JSON object
 * @returns {{instances: *[]}} the prediction in the format of a JSON object
 */
function getModelInput() {
    let val = [];
    val.push(new Array(100));
    for (let i = 0; i < val[0].length; i++) {
        val[0][i] = Math.random();
    }
    let input = {
        instances: val
    }
    return input;
}

/**
 * Sends a request onto the AI art generator using TensorFlow Serving and outputs a JSON object of an image file
 * @returns {Promise<*|Response>} the promise that a JSON object of an image has been recieved from the AI art generator
 */
export async function getGeneratedImage() {
    // Creates the randomized prediction
    let input = getModelInput();
    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
    }

    // Sends the prediction to the model and fetches the output
    try{
        let output = await fetch('http://localhost:8501/v1/models/scaipes_generator:predict', options);
        output = await output.json();
        return output;
    }catch(e){
        console.error(e);
        throw new Error("Error getting generated image");
    }
}
