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

export async function getGeneratedImage() {
    let input = getModelInput();
    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
    }

    try{
        let output = await fetch('http://localhost:8501/v1/models/test-model:predict', options);
        output = await output.json();
        return output;
    }catch(e){
        console.error(e);
        throw new Error("Error getting generated image");
    }
}
     