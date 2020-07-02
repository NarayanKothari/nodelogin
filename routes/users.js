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

//Image Settings
let gfs;

const test_db = require('../config/keys').MongoURI;

const conn = mongoose.createConnection(test_db,{ useNewUrlParser : true });

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: test_db,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// Uploading the image 
router.post('/upload_image', upload.single('image'), ensureAuthenticated,(req, res, next) => { 
//	    User.update({ _id: req.user.id}, req.body, function(err, user){
	    User.findOne({ email: req.user.email})
	    .then(user =>{
	    	if(!user){
	    		req.flash('error_msg', 'Unkown user');
	    	}
	    	user.img = req.file.filename;
	    	user.save()
	    	.then(user =>{
	    		req.flash('success_msg','Successfully uploaded');
	    		res.redirect('/dashboard');
	    	})
	    	.catch(err => console.log(err));
	    })
}); 

//Login Page
router.get('/upload_image', ensureAuthenticated, (req,res) => res.render("image_upload"));

//Login Page
router.get('/Login', (req,res) => res.render("login"));

//Register Page
router.get('/Register', (req,res) => res.render("register"));

//Forgot Password Page
router.get('/forgot', (req,res) => res.render("forgot"));

//Reset pase
router.get('/reset/:token', (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error_msg', 'Password reset token is invalid or has expired.');
      return res.redirect('/users/forgot');
    }
    res.render("reset", {
      user: req.user,
      token: req.params.token
    });
  });
});

//Reset Password route
router.post('/reset/:token', (req, res) => {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error_msg', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        if(req.body.password != req.body.password2){
          req.flash('error_msg', 'Password do not match');
          return res.redirect('back');
        }
		bcrypt.genSalt(10, (err, salt)=>
			bcrypt.hash(req.body.password, salt, (err,hash) =>{
				if(err) throw err;
				// set password to hashed
				user.password = hash;
		        user.resetPasswordToken = undefined;
				user.resetPasswordExpires = undefined;
				user.save(function(err) {
 					req.logIn(user, function(err) {
   					done(err, user);
  					});
				});
			}));
        // user.password = req.body.password;
      	});
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        auth: {
          user: 'griffinkamina@gmail.com',
          pass: 'kothari1997'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'griffinkamina@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/users/login');
  });
});

//Forgot Password route
router.post('/forgot', (req, res, next) => {
	let errors = [];
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },

    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
		  errors.push({ msg: 'No account with that email address exists.'});
          //req.flash('error', 'No account with that email address exists.');
          return res.render('forgot',{
          	errors
          });
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        auth: {
          user: 'griffinkamina@gmail.com',
          pass: 'kothari1997'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'griffinkamina@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/users/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/users/forgot');
  });
});

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

router.get('/profile', ensureAuthenticated, (req,res) => {
	gfs.files.findOne({ filename: req.user.img }, (err, file) => {
		if (!file || file.length === 0) {
			res.render('profile',{user: req.user})
		}
		else
		{
			res.render('profile',{file: file, user:req.user});
		}
	});
})

router.get('/editProfileReq',ensureAuthenticated,(req,res)=>{
	res.render('editProfile')
})

router.post('/editProfile', ensureAuthenticated, function(req, res, next){	
    User.updateOne({ _id: req.user.id}, req.body, function(err, user){
        if(!user){
            req.flash('error', 'No account found');
            return res.redirect('/edit');
        }
        var nameNew = req.body.name;
        var emailNew = req.body.email;
        if(!nameNew || !emailNew ){
           req.flash('error_msg', 'invalid user name or email');
           res.redirect('editProfileReq')
        }
        else{
            user.email = emailNew;
            user.name = nameNew;
            res.redirect('/dashboard');
        }
    });
})

router.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

module.exports = router;