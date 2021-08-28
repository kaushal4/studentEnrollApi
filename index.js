const path = require("path");
const express = require("express");
const app = express();
var cookieParser = require("cookie-parser");
//var bodyParser = require("body-parser");
// var jsonParser = bodyParser.json();
// var urlencodedParser = bodyParser.urlencoded({ extended: false });
const axios = require("axios");
const port = 3001;

const { asyncCon } = require("./db");

//app.use statements
app.use(express.static(path.resolve(__dirname, "./client/build")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/api", (req, res) => {
  res.send("dummy api");
});

const ifEnrolled = async (studentName, subjectName) => {
  const sql = `select studentName from enrolled where(studentName='${studentName}' and subjectName='${subjectName}')`;
  try {
    const result = await asyncCon.query(sql);
    return result.length;
  } catch (e) {
    console.log(e);
    return 0;
  }
};

const getWaitList = async (subjectName) => {
  const sql = `select studentName from waitList where(subjectName='${subjectName}')`;
  const result = await asyncCon.query(sql);
  if (result.length) {
    return result;
  } else return null;
};

const checkConflicts = async (studentName, subjectName) => {
  const sql = `select subjectName from enrolled where(studentName='${studentName}')`;
  const sql1 = `select subjectName2 from conflicts where(subjectName1='${subjectName}')`;
  const enrolled = await asyncCon.query(sql);
  const conflicts = await asyncCon.query(sql1);
  let flag = 1;
  enrolled.forEach((element) => {
    const subjectName2 = element.subjectName;
    const conf = conflicts.filter((e) => {
      return e.subjectName2 == subjectName2;
    });
    console.log(conf);
    if (conf.length) flag = 0;
  });
  return flag;
};

app.post("/api/signUp", async (req, res) => {
  const { name } = req.body;
  console.log(name);
  const sql = `insert into student(studentName) values('${name}');`;
  try {
    await asyncCon.query(sql);
    res.send("success");
  } catch (err) {
    console.log(err);
    res.send("failed");
  }
});

app.get("/api/signIn", async (req, res) => {
  const { name } = req.body;
  console.log(name);
  const sql = `select studentName from student where(studentName='${name}')`;
  try {
    const result = await asyncCon.query(sql);
    console.log(result);
    if (result.length) res.send("yes");
    else res.send("no");
  } catch (err) {
    console.log(err);
    res.send("failed");
  }
});

app.post("/api/enroll", async (req, res) => {
  const { studentName, subjectName } = req.body;
  const result = await checkConflicts(studentName, subjectName);
  console.log(result);
  if (!result) {
    res.send(
      "you may have already enrolled in the subjects or have conflicts with other subjects"
    );
  }
  let available = [];
  try {
    const sql = `select availability from subjects where (subjectName='${subjectName}');`;
    available = await asyncCon.query(sql);
    console.log(available);
  } catch (e) {
    console.log(e);
    res.send("internal error");
  }
  available = available[0].availability;
  if (available) {
    try {
      const sql = `insert into enrolled values('${studentName}','${subjectName}')`;
      const sql1 = `update subjects set availability=${
        available - 1
      } where (subjectName='${subjectName}');`;
      console.log(sql1);
      const enroll = asyncCon.query(sql);
      const updateA = asyncCon.query(sql1);
      const [res1, res2] = await Promise.all([enroll, updateA]);
      res.send("successfully enrolled");
    } catch (e) {
      console.log(e);
      res.send("could not enroll");
    }
  } else {
    const sql = `insert into waitList values('${studentName}','${subjectName}')`;
    try {
      await asyncCon.query(sql);
      res.send("not available.. added to waitlist");
    } catch (e) {
      res.send("You are already in waitlist");
    }
  }
});

app.post("/api/unenroll", async (req, res) => {
  const { studentName, subjectName } = req.body;
  const isEnrolled = await ifEnrolled(studentName, subjectName);
  console.log(isEnrolled);
  if (!isEnrolled) {
    res.send("not enrolled");
  }
  let available = [];
  try {
    const sql = `select availability from subjects where (subjectName='${subjectName}');`;
    available = await asyncCon.query(sql);
    console.log(available);
  } catch (e) {
    console.log(e);
    res.send("internal error");
  }
  available = available[0].availability;
  const removeSql = `delete from enrolled where(studentName='${studentName}' and subjectName='${subjectName}')`;
  const addSeat = `update subjects set availability=${
    available + 1
  } where (subjectName='${subjectName}');`;
  try {
    const removed = asyncCon(removeSql);
    const added = asyncCon(addSeat);
    await Promise.all([removed, added]);
    console.log(removed);
    console.log(added);
  } catch (e) {
    res.send("could not unenroll");
  }
  if (available == 1) {
    const students = await getWaitList(subjectName);
    if (!!students) {
      students.forEach(async (element) => {
        student = element.studentName;
        const conflicts = checkConflicts(student, subjectName);
        if (conflicts) {
          const sql = `insert into enrolled values('${studentName}','${subjectName}')`;
          const sql1 = `update subjects set availability=${
            available - 1
          } where (subjectName='${subjectName}');`;
          try {
            const enroll = asyncCon.query(sql);
            const updateA = asyncCon.query(sql1);
            const [res1, res2] = await Promise.all([enroll, updateA]);
            res.send("successfully enrolled ans unenrolled");
          } catch (e) {
            console.log(e);
            res.send("could not enroll but successfully unenrolled");
          }
        }
      });
      res.send("internal error");
    } else {
      res.send("success");
    }
  } else {
    res.send("success");
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./client/build", "index.html"));
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
