const express = require('express');
const expressLayouts = require('express-ejs-Layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const fs = require('fs'); 
const path = require('path'); 
require('dotenv/config'); 
const {ensureAuthenticated} = require('./config/auth');

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
app.use(express.static('routes'))

const PORT = process.env.PORT || 5000;	

server = app.listen(PORT, console.log(`Server started on port ${PORT}`));

const io = require("socket.io")(server)


//listen on every connection
io.on('connection', (socket) => {
	console.log('New user connected')

	//default username
	socket.username = "Anonymous"

    //listen on change_username
    socket.on('change_username', (data) => {
        socket.username = data.username
    })

    //listen on new_message
    socket.on('new_message', (data) => {
        //broadcast the new message
        io.sockets.emit('new_message', {message : data.message, username : socket.username});
    })

    //listen on typing
    socket.on('typing', (data) => {
    	socket.broadcast.emit('typing', {username : socket.username})
    })
})

module.exports = app