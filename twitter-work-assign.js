const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

let db = null

const dbPath = path.join(__dirname, 'twitterClone.db')

const intialiazeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

intialiazeDbAndServer()

//validate password

const validatePassword = password => {
  return password.length > 5
}

// POST Register user API

app.post('/register', async (request, response) => {
  const {username, password, name, gender} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const checkUserNameQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(checkUserNameQuery)

  if (dbUser === undefined) {
    const createUserQuery = `
    INSERT INTO
    user(name, username, password, gender)
    VALUES
    ("${name}", "${username}", "${hashedPassword}", "${gender}");`

    if (validatePassword(password)) {
      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

// POST Login user API

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const checkUsernameQuery = `SELECT * FROM user WHERE username = "${username}";`
  const dbUser = await db.get(checkUsernameQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatch = await bcrypt.compare(password, db.password)
    if (isPasswordMatch === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})
