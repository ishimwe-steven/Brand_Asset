const app = require("./app");
const db = require("./config/database");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS database_name");
    console.log(` Connected to MySQL database: ${rows[0].database_name}`);

    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(" Database connection failed:");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();