const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const fs = require('fs'); 
const path = require('path'); 
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const {ensureAuthenticated} = require('../config/auth');

// User model
const User = require('../models/User');

//File settings
let gfs;

const test_db = require('../config/keys').MongoURI;

const conn = mongoose.createConnection(test_db,{ useNewUrlParser : true });

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

//Login Page
router.get('/Login', (req,res) => res.render("login"));

//Register Page
router.get('/Register', (req,res) => res.render("register"));


//Register route
router.post('/Register', (req,res) => {
	const {name,email,password,password2} = req.body;
	let errors = [];

// Check all field are filled
	if(!name || !email || !password2 || !password){
		errors.push({ msg: 'Please fill in all the details'});
	}

// check password matches
	if(password!==password2){
		errors.push({ msg: 'Password do not match'});
	}

// check password validity
	if(password.length < 6){
		errors.push({ msg: 'Password should be at least 6 characters' });
	}

	if(errors.length>0){
		console.log(errors)
		res.render('register', {
			errors,
			name,
			email,
			password,
			password2
		});
	}
	else{
		//validation passed
		User.findOne( {email: email} )
		.then( user => {
			if(user){
				//User exists
				errors.push( { msg: 'Email is already registered'} );
				res.render('register', {
				errors,
				name,
				email,
				password,
				password2
				});
			}
			else{
				const newUser = new User({
					name,
					email,
					password
				});

				//Hash Password
				bcrypt.genSalt(10, (err, salt)=>
					bcrypt.hash(newUser.password, salt, (err,hash) =>{
						if(err) throw err;
						// set password to hashed
						newUser.password = hash;
						newUser.save()
						.then(user =>{
							req.flash('success_msg', 'You are now Registered and can Login now');
							res.redirect('/users/login');
						})
						.catch(err=> console.log(err));
					}))
			}
		});
	}
});

//Login Handle
router.post('/login',(req,res,next) =>{
	passport.authenticate('local',{
		successRedirect: '/dashboard',
		failureRedirect: '/users/login',
		failureFlash: true
	})(req, res, next);
})

//Logout Handle
router.get('/logout',(req,res,) =>{
	req.logout();
	req.flash('success_msg', 'You are logged out');
	res.redirect('/users/login');
})

//Profile Page request
router.get('/profile', ensureAuthenticated, (req,res) => {
	gfs.files.findOne({ filename: req.user.img }, (err, file) => {
		res.render('profile',{file: file, user:req.user});
	});
})


module.exports = router;
