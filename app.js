const express = require('express');
const expressLayouts = require('express-ejs-Layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const fs = require('fs'); 
const path = require('path'); 
require('dotenv/config'); 

const app = express();

//Passport config
require('./config/passport')(passport);

//DB config
const db = require('./config/keys').MongoURI;

//Connect to DB
mongoose.connect(db, { useNewUrlParser : true })
.then(() => console.log('MongoDB connected..'))
.catch(err => console.log(err));

//EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

//BodyParser
app.use(express.urlencoded({ extended:false }))

//Express Session
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}))

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//Connect flash
app.use(flash());

//Gloabl Vars
app.use((req, res, next) =>{
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');
	next();
});

// Routes
app.use('/',require('./routes/index'));
app.use('/users',require('./routes/users'));
app.use('/users',require('./routes/forget_password'));
app.use('/users',require('./routes/edit_profile'));
app.use('/users',require('./routes/image_upload'));


const PORT = process.env.PORT || 5000;	

app.listen(PORT, console.log(`Server started on port ${PORT}`));