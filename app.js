const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initialDBServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Running on server 3000");
    });
  } catch (error) {
    console.log(error.message);
  }
};

initialDBServer();

const loader = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(400);
    response.send("Invalid JWT Token");
  } else {
    try {
      const payload = await jwt.verify(jwtToken, "MY-SECRET-KEY");
      // Do something with the payload if needed
      next();
    } catch (error) {
      response.status(400);
      response.send("Invalid JWT Token");
    }
  }
};

// API1: User login
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const queryForUser = "SELECT * FROM user WHERE username = ?";

  try {
    const user = await db.get(queryForUser, [username]);
    if (!user) {
      response.status(400).send("Invalid user");
    } else {
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (isPasswordCorrect) {
        const payload = { username: username };
        const jwtToken = jwt.sign(payload, "MY-SECRET-KEY");
        response.send({ jwtToken });
        console.log(jwtToken);
      } else {
        response.status(400).send("Invalid password");
      }
    }
  } catch (error) {
    console.error(error.message);
    response.status(500).send("Internal server error");
  }
});

//API2

app.get("/states/", loader, async (request, response) => {
  const stateQuery = "select * from state;";
  const allStates = await db.all(stateQuery);
  response.send(allStates);
});

//API3
app.get("/states/:stateId", loader, async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = "select * from state where state_id=?;";
  const allStates = await db.all(stateQuery, [stateId]);
  response.send(allStates);
});

//API4
app.post("/districts/", loader, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const insertDistrictQuery = `
        INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

  try {
    const result = await db.run(insertDistrictQuery, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    ]);

    response.send("District Successfully Added");
  } catch (error) {
    console.error("Error inserting district:", error.message);
    response.status(500).send("Internal server error");
  }
});

//API5
app.get("/districts/:districtId", loader, async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = "select * from district where district_id=?;";
  const allStates = await db.all(stateQuery, [districtId]);
  response.send(allStates);
});

//API6
app.delete("/districts/:districtId", loader, async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = "delete from district where district_id=?;";
  const allStates = await db.run(stateQuery, [districtId]);
  response.send("District Removed");
});

//API7
app.put("/districts/:districtId", loader, async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const stateQuery = `
  UPDATE district 
  SET district_name = ?,
      state_id = ?,
      cases = ?,
      cured = ?,
      active = ?,
      deaths = ?
  WHERE district_id = ?;
`;

  const result = await db.run(stateQuery, [
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
    districtId,
  ]);

  response.send("District Details Updated");
});

//API8
app.get("/states/:stateId/stats", loader, async (request, response) => {
  const { stateId } = request.params;
  const stateQuery =
    "select sum(cases) as totalCases,sum(cured) as totalCured,sum(active) as totalActive,sum(deaths) as totalDeaths from district where state_id=?;";
  const allStates = await db.all(stateQuery, [stateId]);
  response.send(allStates);
});

module.exports = app;
