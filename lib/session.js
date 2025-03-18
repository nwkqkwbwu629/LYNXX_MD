const axios = require("axios");
const path = require("path");
const fs = require("fs");

async function MakeSession(id, file) {
  try {
    const key = id.split('-')[1];
    const config = {
      method: 'get',
      url: `https://hastebin.com/raw/${key}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    const response = await axios(config);
    const filePath = path.join(file, "creds.json");
    await fs.promises.writeFile(filePath, response.data.content);
    return true;
  } catch (error) {
    throw new Error(`Error`);
  }
};

module.exports = {
  MakeSession
};
