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
    console.log(`DB Error: "${error.message}"`)
    process.exit(1)
  }
}

intialiazeDbAndServer()

//validate password

const validatePassword = password => {
  return password.length > 5
}

// Create Authentication

const authenticateToken = (request, response, next) => {
  const {tweet} = request.body
  const {tweetId} = request.params
  let jwtToken
  const authenticatinHeader = request.headers['Authorization']
  if (authenticatinHeader !== undefined) {
    jwtToken = authenticatinHeader.split('')[1]
  }

  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.payload = payload
        request.tweetId = tweetId
        request.tweet = tweet
        next()
      }
    })
  }
}

// POST Register user API

app.post('/register/', async (request, response) => {
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
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password)
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

// GET tweet API

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {payload} = request
  const {user_id} = payload

  const getsFeedtweetQuery = `
  SELECT 
  username,
  tweet,
  date_time AS dateTime
  FROM follower INNER JOIN tweet ON follower.following_user_id = tweet.user_id 
  INNER JOIN user ON user.user_id = follower.following_user_id
  WHERE follower.follower_user_id = ${user_id}
  ORDER BY date_time DESC
  LIMIT 4;`

  const tweetArray = await db.all(getsFeedtweetQuery)
  response.send(tweetArray)
})

// GET following user API

app.get('/user/following/', authenticateToken, async (request, response) => {
  const {payload} = request
  const {user_id, name} = payload
  const userFollowingQuery = `
        SELECT 
            name
        FROM 
            user INNER JOIN follower ON user.user_id = follower.following_user_id
        WHERE 
            follower.follower_user_id = ${user_id};`

  const userFollowingArray = await db.all(userFollowingQuery)
  response.send(userFollowingArray)
})

// GEt user Followers API

app.get('/user/followers/', authenticateToken, async (request, response) => {
  const {payload} = request
  const {user_id, name} = payload
  const userFollowersQuery = `
        SELECT 
            name
        FROM
            user INNER JOIN follower ON user.user_id = follower.follower_user_id
        WHERE 
            follower.following_user_id = ${user_id};`
  const userFollowersArray = await db.all(userFollowersQuery)
  response.send(userFollowersArray)
})
