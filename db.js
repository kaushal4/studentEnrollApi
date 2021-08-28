//setting up connection to mysql

const mysql = require("mysql");

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "kush",
  database: "motorq",
});

//connection logic

con.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("connection to database successfull!!");
});

class Database {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  close() {
    return new Promise((resolve, reject) => {
      this.connection.end((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

const asyncCon = new Database({
  host: "localhost",
  user: "root",
  password: "kush",
  database: "motorq",
});

module.exports = {
  asyncCon: asyncCon,
  con: con,
};
