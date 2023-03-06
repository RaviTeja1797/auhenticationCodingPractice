const express = require("express");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db")
let databaseConnectionObject = null;

const expressAppInstance = express();
expressAppInstance.use(express.json());

const initializeDBAndServer = async()=>{
    try{
        databaseConnectionObject = await open({
            filename : dbPath,
            driver : sqlite3.Database
        })
        expressAppInstance.listen(3000, ()=>{
            console.log('Database connection object received and Server initialized at http://localhost:3000/')
        })
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }
}

initializeDBAndServer();


//API - 1 registerUser

expressAppInstance.post('/register/', async(request, response)=>{
    const{username, name, password, gender, location} = request.body;

    const passwordHash = await bcrypt.hash(request.body.password, 10)

    
    //check1 - isUserAlreadyExists
    //check2 - isPasswordWithAtleast5Chars

    //if check1 and check2 satisfies, create a newUser on the database.

    const userObjectQuery = `SELECT * FROM user WHERE username like "${username}"`;

    const userObject = await databaseConnectionObject.get(userObjectQuery);

    if(userObject === undefined){
        //check1 satisfied. in the user database, we do not have any column with new user
        //perform check2
        const currentPasswordLength = password.length;
        if (currentPasswordLength < 5){
            //check2 is not satisfied Password is too short
            response.status(400)
            response.send('Password is too short')
        }else{
            //check2 is satisfied. Register a user record on the user database with encrypted password
            const registerUserQuery = `INSERT INTO user(username, name, password, gender, location)
            VALUES("${username}", "${name}", "${passwordHash}", "${gender}", "${location}")`

            await databaseConnectionObject.run(registerUserQuery)
            response.send('User created successfully')
        }
    }else{
        //Check1 is not satisfied. username already exists.
        response.status(400);
        response.send('User already exists')
    }
})

//API - 2 loginUser

expressAppInstance.post('/login/', async(request, response)=>{
    const {username, password} = request.body;

    const userObjectQuery = `SELECT * FROM user WHERE username like "${username}"`;

    const userObject = await databaseConnectionObject.get(userObjectQuery);

    if (userObject === undefined){
        //invalid user. 
        response.status(400);
        response.send('Invalid user')
    }else{
        //valid user. Verify password
        const isPasswordsSame = await bcrypt.compare(password, userObject.password)
        if(isPasswordsSame){
            response.send('Login success!')
        }else{
            response.status(400)
            response.send("Invalid password")
        }
    }
})


//API-3 changePassword

expressAppInstance.put('/change-password/', async(request, response)=>{
    const {username, oldPassword, newPassword} = request.body;

    //check1 isUserName in userDatabase
    //check2 isOldPassword matching the records 
    // if check1 and check2 passed, check newPasswordLength
    //if length is less than 5 reject password change request
    //if length is more than 5 approve password change request


    const userObjectQuery = `SELECT * FROM user WHERE username like "${username}"`
    const userObject = await databaseConnectionObject.get(userObjectQuery)
    
    if (userObject === undefined){
        response.status(400);
        response.send('Invalid user')
    }else{
        //check if passwords are matching
        const isPasswordsMatching = await bcrypt.compare(oldPassword, userObject.password)
        if(isPasswordsMatching){
            if(newPassword.length<5){
                response.status(400)
                response.send('Password is too short')
            }else{
                const newPasswordHash = await bcrypt.hash(newPassword, 10);
                const updatePasswordQuery = `UPDATE user SET password = "${newPasswordHash}" WHERE username like "${username}"`
                await databaseConnectionObject.run(updatePasswordQuery)
                response.send('Password updated')
                //Valid password. encrypt the newPassword and update it in user records
            }
        }else{
            response.status(400)
            response.send('Invalid current password')
        }
        
    }
})

module.exports = expressAppInstance;