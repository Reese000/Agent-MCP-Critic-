import axios from 'axios';

async function findFreeModels() {
    try {
        const response = await axios.get('https://openrouter.ai/api/v1/models');
        const freeModels = response.data.data.filter((m: any) => m.pricing.prompt === "0" || m.pricing.prompt === 0);
        console.log(JSON.stringify(freeModels.map((m: any) => m.id), null, 2));
    } catch (e) {
        console.error(e);
    }
}

findFreeModels();
