const express = require("express");
const server_instance = express();
const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");
const cors = require("cors");
const dbPath = path.join(__dirname, "product_transaction.db");
server_instance.use(express.json());
server_instance.use(cors());
let dataBase = null;
const initialize_DataBase_and_Server = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    server_instance.listen(4000, () => {
      console.log("sever is running on http/localhost:3000/");
    });
  } catch (error) {
    console.log(`DataBase Error ${error.message}`);
    process.exit(1);
  }
};

initialize_DataBase_and_Server();

server_instance.get(`/product_transaction/`, async (request, response) => {
  const { month, page_no, search } = request.query;
  const limit = 10;
  const offset =
    page_no && !isNaN(page_no) && parseInt(page_no) > 0
      ? limit * (parseInt(page_no) - 1)
      : 0;

  try {
    let transactionData;
    if (search === undefined) {
      const transactionQuery = `
        SELECT * 
        FROM "transaction"
        WHERE CAST(strftime("%m", dateOfSale) AS INTEGER) = ? 
        LIMIT ? OFFSET ?;
      `;
      transactionData = await dataBase.all(transactionQuery, [
        parseInt(month),
        limit,
        offset,
      ]);
    } else {
      const searchQuery = `
        SELECT *
        FROM "transaction"
        WHERE (title LIKE '%' || ? || '%'
          OR CAST(price AS INT) LIKE '%' || ? || '%'
          OR description LIKE '%' || ? || '%')
          AND CAST(strftime("%m", dateOfSale) AS INTEGER) = ? 
        LIMIT ? OFFSET ?;
      `;
      transactionData = await dataBase.all(searchQuery, [
        `%${search}%`,
        `%${parseInt(search)}%`,
        `%${search}%`,
        parseInt(month),
        limit,
        offset,
      ]);
    }

    if (transactionData.length === 0) {
      response.status(404).send("No transactions found.");
    } else {
      response.send(transactionData);
    }
  } catch (error) {
    console.error("Database query error:", error.message);
    response.status(500).send("Internal server error.");
  }
});

server_instance.get(`/product_statistics/`, async (request, response) => {
  const { month } = request.query;
  const transactionQuery = `
        SELECT COUNT(sold) AS total_sale, 
       SUM(CASE WHEN sold = 1 THEN 1 ELSE 0 END) AS total_sold_item, 
          SUM(CASE WHEN sold = 0 THEN 1 ELSE 0 END) AS total_not_sold_item 
        FROM "transaction"
        WHERE CAST(strftime("%m", dateOfSale) AS INTEGER) = ? 
        GROUP BY strftime("%m", dateOfSale) 
      `;
  try {
    const transactionData = await dataBase.all(transactionQuery, [
      parseInt(month),
    ]);
    if (transactionData.length === 0) {
      response.status(404).send("No transactions found.");
    } else {
      response.send(transactionData);
    }
  } catch (error) {
    console.error("Database query error:", error.message);
    response.status(500).send("Internal server error.");
  }
});
