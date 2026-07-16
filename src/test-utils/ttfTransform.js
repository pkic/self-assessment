const fs = require("fs");
module.exports = {
  process(_src, filename) {
    const b64 = fs.readFileSync(filename).toString("base64");
    return { code: `module.exports = "data:font/ttf;base64,${b64}";` };
  },
};
