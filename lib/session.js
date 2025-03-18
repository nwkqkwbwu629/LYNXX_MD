const token = "c861c4509789d59ba33c8855c72dfb44957df4cf95f9efb4c5c91ba9126706c08ebea8fc87e14901c8f147da32967160d790f93c77558cfbdfe97904b01be486";
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
